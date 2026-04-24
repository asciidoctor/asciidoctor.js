// ESM conversion of syntax_highlighter/html_pipeline.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby class SyntaxHighlighter::HtmlPipelineAdapter → HtmlPipelineAdapter extends SyntaxHighlighterBase.
//   - register_for 'html-pipeline' → handled by SyntaxHighlighter.register() at module load time.
//   - format() overrides the base class to emit <pre lang="..."><code>…</code></pre> without
//     highlight CSS classes — the html-pipeline gem processes the markup downstream.
//   - Ruby string interpolation → template literals.

import {
  SyntaxHighlighterBase,
  SyntaxHighlighter,
} from '../syntax_highlighter.js'

export class HtmlPipelineAdapter extends SyntaxHighlighterBase {
  constructor(...args) {
    super(...args)
    this.name = 'html-pipeline'
  }

  // Public: Wrap the source block in <pre><code> without highlight classes.
  //
  // The html-pipeline gem processes the markup downstream, so only a bare
  // <pre lang="<lang>"><code> wrapper is emitted (no CSS classes, no data-lang).
  //
  // node - The source Block being processed.
  // lang - The source language String, or falsy if none.
  // opts - A plain Object of options (unused by this adapter).
  //
  // Returns the wrapped source String.
  async format(node, lang, opts) {
    // eslint-disable-line no-unused-vars
    return `<pre${lang ? ` lang="${lang}"` : ''}><code>${await node.content()}</code></pre>`
  }
}

// Self-register in the global factory (mirrors Ruby's `register_for`).
SyntaxHighlighter.register(HtmlPipelineAdapter, 'html-pipeline')

export default HtmlPipelineAdapter
