export class HighlightJsAdapter extends SyntaxHighlighterBase {
    constructor(...args: any[]);
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
    format(node: object, lang: string | null, opts: object): Promise<string>;
    /**
     * Always returns true — highlight.js injects markup into the document.
     * @param {string} location - 'head' or 'footer'
     * @returns {true}
     */
    hasDocinfo(location: string): true;
    /**
     * Returns the CSS `<link>` tag (head) or the `<script>` tags (footer).
     * @param {string} location - 'head' or 'footer'
     * @param {object} doc - the Document being converted
     * @param {{ cdn_base_url: string, self_closing_tag_slash: string }} opts
     * @returns {string}
     */
    docinfo(location: string, doc: object, opts: {
        cdn_base_url: string;
        self_closing_tag_slash: string;
    }): string;
}
export default HighlightJsAdapter;
import { SyntaxHighlighterBase } from '../syntax_highlighter.js';
