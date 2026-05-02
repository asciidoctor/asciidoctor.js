export class HtmlPipelineAdapter extends SyntaxHighlighterBase {
    constructor(...args: any[]);
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
    format(node: object, lang: string | null, opts: object): Promise<string>;
}
export default HtmlPipelineAdapter;
import { SyntaxHighlighterBase } from '../syntax_highlighter.js';
