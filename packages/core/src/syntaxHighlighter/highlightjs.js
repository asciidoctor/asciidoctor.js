// ESM conversion of syntax_highlighter/highlightjs.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby class SyntaxHighlighter::HighlightJsAdapter → HighlightJsAdapter extends SyntaxHighlighterBase.
//   - register_for 'highlightjs', 'highlight.js' → handled by the parent SyntaxHighlighter factory.
//   - HIGHLIGHT_JS_VERSION constant imported from constants.js.
//   - Ruby doc.getAttribute(name, default) → doc.getAttribute(name) with fallback using ?? operator.
//   - Ruby doc.attr? 'name' → doc.hasAttribute('name').
//   - Ruby string interpolation / multiline heredocs → template literals.
//   - Ruby :head / :footer symbols → plain strings 'head' / 'footer'.

import { SyntaxHighlighterBase } from '../syntax_highlighter.js'
import { injectCallouts } from './callout_injector.js'
import { HIGHLIGHT_JS_VERSION } from '../constants.js'
import hljs from 'highlight.js'

export class HighlightJsAdapter extends SyntaxHighlighterBase {
  constructor(...args) {
    super(...args)
    this.name = 'highlightjs'
    this._preClass = 'highlightjs'
  }

  /**
   * Wrap the source block in `<pre><code>` with highlight.js CSS classes.
   *
   * Adds `language-<lang>` and `hljs` to the `<code>` class attribute, and strips
   * the `highlight` class from `<pre>` when the `nohighlight-option` attribute is set.
   * @param {object} node - the source Block being processed
   * @param {string|null} lang - the source language string, or falsy if none
   * @param {object} opts - options passed to the base format()
   * @returns {Promise<string>}
   */
  async format(node, lang, opts) {
    const transform = (pre, code) => {
      if (node.hasAttribute('nohighlight-option')) {
        pre.class = pre.class.replace(' highlight', '')
      }
      code.class = `language-${lang ?? 'plaintext'} hljs`
    }
    return super.format(node, lang, { ...opts, transform })
  }

  /**
   * Indicates whether this highlighter wants to write a stylesheet to disk.
   *
   * @param {string} location - It must be 'head'.
   * @returns {boolean} after the current version, this only writes a `<link>` tag to the document head.
   */
  hasDocinfo(location) {
    return location === 'head'
  }

  /**
   * Indicates whether highlighting is handled server-side by this highlighter.
   *
   * @returns {boolean} false by default; subclasses return true to enable {@link highlight}
   */
  handlesHighlighting() {
    return true
  }

  /** @inheritdoc */
  highlight(node, source, lang, opts = {}) {
    let highlighted
    if (node.hasAttribute('nohighlight-option')) {
      highlighted = node.subSpecialchars(source)
    } else if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(source, {
        language: lang,
        ignoreIllegals: true,
      }).value
    } else {
      highlighted = hljs.highlightAuto(source).value
    }

    if (opts.callouts && Object.keys(opts.callouts).length > 0) {
      highlighted = injectCallouts(node, opts.callouts, highlighted)
    }
    return highlighted
  }

  /**
   * Returns the CSS `<link>` tag.
   * @param {string} location - 'head' or 'footer'
   * @param {object} doc - the Document being converted
   * @param {{ cdn_base_url: string, self_closing_tag_slash: string }} opts
   * @returns {string}
   */
  docinfo(location, doc, opts) {
    const baseUrl =
      doc.getAttribute('highlightjsdir') ??
      `${opts.cdn_base_url}/highlight.js/${HIGHLIGHT_JS_VERSION}`

    const theme = doc.getAttribute('highlightjs-theme') ?? 'github'
    return `<link rel="stylesheet" href="${baseUrl}/styles/${theme}.min.css"${opts.self_closing_tag_slash ?? ''}>`
  }
}

export default HighlightJsAdapter
