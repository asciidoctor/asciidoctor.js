export class HighlightJsAdapter extends SyntaxHighlighterBase {
    constructor(...args: any[]);
    /**
     * Colourise the (already callout-free) source with highlight.js (build mode).
     *
     * @param {Object} node - the source Block being highlighted
     * @param {string} source - source WITHOUT callout marks (the core strips them first)
     * @param {string} lang - the source language, or null
     * @param {Object} opts - { callouts, highlightLines, numberLines, startLineNumber }
     * @returns {Promise<string>} the highlighted HTML
     */
    highlight(node: any, source: string, lang: string, opts: any): Promise<string>;
    /**
     * Wrap the source block in `<pre><code>` with highlight.js CSS classes.
     *
     * Adds `language-<lang>` and `hljs` to the `<code>` class attribute, and strips
     * the `highlight` class from `<pre>` when the `nohighlight-option` attribute is set.
     * In build mode with line numbers, marks the `<code>` as the numbering grid
     * (`linenums` class) and seeds the CSS line counter from the `start=` attribute.
     * @param {object} node - the source Block being processed
     * @param {string|null} lang - the source language string, or falsy if none
     * @param {object} opts - options passed to the base format()
     * @returns {Promise<string>}
     */
    format(node: object, lang: string | null, opts: object): Promise<string>;
    /**
     * Returns the docinfo markup for the given location.
     *
     * In build mode (head only): the theme stylesheet, embedded in a `<style>` tag
     * by default (read from the installed highlight.js package) or linked from the
     * CDN when `:highlightjs-stylesheet: link` is set. In client mode: the CSS
     * `<link>` (head) or the hljs runtime `<script>` tags (footer).
     *
     * @param {string} location - 'head' or 'footer'
     * @param {object} doc - the Document being converted
     * @param {{ cdn_base_url: string, self_closing_tag_slash: string }} opts
     * @returns {Promise<string>}
     */
    docinfo(location: string, doc: object, opts: {
        cdn_base_url: string;
        self_closing_tag_slash: string;
    }): Promise<string>;
}
export default HighlightJsAdapter;
import { SyntaxHighlighterBase } from '../syntax_highlighter.js';
