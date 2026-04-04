// ESM conversion of syntax_highlighter/highlightjs.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby class SyntaxHighlighter::HighlightJsAdapter → HighlightJsAdapter extends SyntaxHighlighterBase.
//   - register_for 'highlightjs', 'highlight.js' → handled by the parent SyntaxHighlighter factory.
//   - HIGHLIGHT_JS_VERSION constant imported from constants.js.
//   - Ruby doc.attr(name, default) → doc.attr(name) with fallback using ?? operator.
//   - Ruby doc.attr? 'name' → doc.hasAttr('name').
//   - Ruby string interpolation / multiline heredocs → template literals.
//   - Ruby :head / :footer symbols → plain strings 'head' / 'footer'.

import { SyntaxHighlighterBase, SyntaxHighlighter } from '../syntax_highlighter.js'
import { HIGHLIGHT_JS_VERSION } from '../constants.js'

export class HighlightJsAdapter extends SyntaxHighlighterBase {
  constructor (...args) {
    super(...args)
    this.name = 'highlightjs'
    this._preClass = 'highlightjs'
  }

  // Public: Wrap the source block in <pre><code> with highlight.js CSS classes.
  //
  // Adds `language-<lang>` and `hljs` to the <code> class attribute, and strips
  // the `highlight` class from <pre> when the `nohighlight-option` attribute is set.
  format (node, lang, opts) {
    const transform = (pre, code) => {
      if (node.hasAttr('nohighlight-option')) {
        pre.class = pre.class.replace(' highlight', '')
      }
      code.class = `language-${lang || 'none'} hljs`
    }
    return super.format(node, lang, { ...opts, transform })
  }

  // Public: Always returns true — highlight.js injects markup into the document.
  docinfoFor (location) { // eslint-disable-line no-unused-vars
    return true
  }

  // Public: Returns the CSS <link> tag (head) or the <script> tags (footer).
  //
  // location - String 'head' or 'footer'.
  // doc      - The Document being converted.
  // opts     - Plain Object with cdn_base_url and self_closing_tag_slash.
  docinfo (location, doc, opts) {
    const baseUrl = doc.attr('highlightjsdir')
      ?? `${opts.cdn_base_url}/highlight.js/${HIGHLIGHT_JS_VERSION}`

    if (location === 'head') {
      const theme = doc.attr('highlightjs-theme') ?? 'github'
      return `<link rel="stylesheet" href="${baseUrl}/styles/${theme}.min.css"${opts.self_closing_tag_slash ?? ''}>`
    }

    // footer
    const langScripts = doc.attr('highlightjs-languages')
      ? doc.attr('highlightjs-languages')
          .split(',')
          .map(lang => `<script src="${baseUrl}/languages/${lang.trimStart()}.min.js"></script>\n`)
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