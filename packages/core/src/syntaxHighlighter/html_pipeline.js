// ESM conversion of syntax_highlighter/html_pipeline.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby class SyntaxHighlighter::HtmlPipelineAdapter → HtmlPipelineAdapter extends SyntaxHighlighterBase.
//   - register_for 'html-pipeline' → registration delegated to load.js for consistency.
//   - format() overrides the base class to emit <pre lang="..."><code>…</code></pre> without
//     highlight CSS classes — the html-pipeline gem processes the markup downstream.
//   - Ruby string interpolation → template literals.

import { SyntaxHighlighterBase } from '../syntax_highlighter.js'

export class HtmlPipelineAdapter extends SyntaxHighlighterBase {
  constructor(...args) {
    super(...args)
    this.name = 'html-pipeline'
  }

  /**
   * Wrap the source block in `<pre><code>` without highlight classes.
   *
   * The html-pipeline gem processes the markup downstream, so only a bare
   * `<pre lang="<lang>"><code>` wrapper is emitted (no CSS classes, no data-lang).
   * @param {object} node - the source Block being processed
   * @param {string|null} lang - the source language string, or falsy if none
   * @param {object} opts - options (unused by this adapter)
   * @returns {Promise<string>} the wrapped source string
   */
  async format(node, lang, opts) {
    return `<pre${lang ? ` lang="${lang}"` : ''}><code>${await node.content()}</code></pre>`
  }
}

export default HtmlPipelineAdapter
