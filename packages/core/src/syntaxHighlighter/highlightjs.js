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

import {
  SyntaxHighlighterBase,
  SyntaxHighlighter,
} from '../syntax_highlighter.js'
import { HIGHLIGHT_JS_VERSION } from '../constants.js'

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
   * @returns {string}
   */
  format(node, lang, opts) {
    const transform = (pre, code) => {
      if (node.hasAttribute('nohighlight-option')) {
        pre.class = pre.class.replace(' highlight', '')
      }
      code.class = `language-${lang || 'none'} hljs`
    }
    return super.format(node, lang, { ...opts, transform })
  }

  /**
   * Always returns true — highlight.js injects markup into the document.
   * @param {string} location - 'head' or 'footer'
   * @returns {true}
   */
  hasDocinfo(location) {
    // eslint-disable-line no-unused-vars
    return true
  }

  /**
   * Returns the CSS `<link>` tag (head) or the `<script>` tags (footer).
   * @param {string} location - 'head' or 'footer'
   * @param {object} doc - the Document being converted
   * @param {{ cdn_base_url: string, self_closing_tag_slash: string }} opts
   * @returns {string}
   */
  docinfo(location, doc, opts) {
    const baseUrl =
      doc.getAttribute('highlightjsdir') ??
      `${opts.cdn_base_url}/highlight.js/${HIGHLIGHT_JS_VERSION}`

    if (location === 'head') {
      const theme = doc.getAttribute('highlightjs-theme') ?? 'github'
      return `<link rel="stylesheet" href="${baseUrl}/styles/${theme}.min.css"${opts.self_closing_tag_slash ?? ''}>`
    }

    // footer
    const langScripts = doc.getAttribute('highlightjs-languages')
      ? doc
          .getAttribute('highlightjs-languages')
          .split(',')
          .map(
            (lang) =>
              `<script src="${baseUrl}/languages/${lang.trimStart()}.min.js"></script>\n`
          )
          .join('')
      : ''

    return `<script src="${baseUrl}/highlight.min.js"></script>
${langScripts}<script>
if (!hljs.initHighlighting.called) {
  hljs.initHighlighting.called = true
  ;[].slice.call(document.querySelectorAll('pre.highlight > code[data-lang]')).forEach(function (el) { hljs.highlightBlock(el) })
}
</script>`
  }
}

// Self-register in the global factory (mirrors Ruby's `register_for`).
SyntaxHighlighter.register(HighlightJsAdapter, 'highlightjs', 'highlight.js')

export default HighlightJsAdapter
