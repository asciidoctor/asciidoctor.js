/** @import { Block } from './block.js' */
/**
 * Base class for syntax highlighter adapters.
 *
 * Subclasses should override the methods they need. Two usage patterns:
 * 1. Server-side highlighting: override `handlesHighlighting()` → true and `highlight()`.
 * 2. Client-side highlighting: override `hasDocinfo()` → true and `docinfo()`.
 *
 * Both patterns may also override `format()`.
 */
export class SyntaxHighlighterBase {
    /**
     * @param {string} name - the name identifying this adapter
     * @param {string} [backend='html5'] - the backend name
     * @param {Object} [opts={}] - options
     */
    constructor(name: string, backend?: string, opts?: any);
    name: string;
    _preClass: string;
    /**
     * Indicates whether this highlighter has docinfo markup to insert at the specified location.
     *
     * @param {string} location - the location slot ('head' or 'footer')
     * @returns {boolean} false by default; subclasses return true to enable {@link docinfo}
     */
    hasDocinfo(location: string): boolean;
    /**
     * Generates docinfo markup to insert at the specified location in the output document.
     *
     * @param {string} location - the location slot ('head' or 'footer')
     * @param {Document} doc - the Document in which this highlighter is used
     * @param {Object} opts - options
     * @param {boolean} [opts.linkcss] - link stylesheet instead of embedding
     * @param {string} [opts.cdn_base_url] - base URL for CDN assets
     * @param {string} [opts.self_closing_tag_slash] - '/' for self-closing tags
     * @returns {string} the markup to insert
     */
    docinfo(location: string, doc: Document, opts: {
        linkcss?: boolean;
        cdn_base_url?: string;
        self_closing_tag_slash?: string;
    }): string;
    /**
     * Indicates whether highlighting is handled server-side by this highlighter.
     *
     * @returns {boolean} false by default; subclasses return true to enable {@link highlight}
     */
    handlesHighlighting(): boolean;
    /**
     * Highlights the specified source when this source block is being converted.
     *
     * If the source contains callout marks, the caller assumes the source remains on the same
     * lines and no closing tags are added to the end of each line. If the source gets shifted
     * by one or more lines, return a tuple of the highlighted source and the line offset.
     *
     * @param {Block} node - the source Block to highlight
     * @param {string} source - the raw source text
     * @param {string} lang - the source language (e.g. 'ruby')
     * @param {Object} opts - options
     * @param {Object} [opts.callouts] - callouts indexed by line number
     * @param {string} [opts.css_mode] - CSS mode ('class' or 'inline')
     * @param {number[]} [opts.highlight_lines] - 1-based line numbers to emphasize
     * @param {string} [opts.number_lines] - 'table' or 'inline' if lines should be numbered
     * @param {number} [opts.start_line_number] - starting line number (default: 1)
     * @param {string} [opts.style] - theme name
     * @returns {string|[string, number]} the highlighted source, or a tuple with a line offset
     */
    highlight(node: Block, source: string, lang: string, opts: {
        callouts?: any;
        css_mode?: string;
        highlight_lines?: number[];
        number_lines?: string;
        start_line_number?: number;
        style?: string;
    }): string | [string, number];
    /**
     * Formats the highlighted source for inclusion in an HTML document.
     *
     * @param {Block} node - the source Block being processed
     * @param {string} lang - the source language (e.g. 'ruby')
     * @param {Object} opts - options
     * @param {boolean} [opts.nowrap] - disable line wrapping
     * @param {Function} [opts.transform] - called with (pre, code) attribute objects before building tags
     * @returns {Promise<string>|string} the highlighted source wrapped in &lt;pre&gt;&lt;code&gt; tags.
     *   Subclasses may return a plain `string` — the caller always `await`s the result.
     */
    format(node: Block, lang: string, opts: {
        nowrap?: boolean;
        transform?: Function;
    }): Promise<string> | string;
    /**
     * Indicates whether this highlighter wants to write a stylesheet to disk.
     *
     * @param {Document} doc - the Document in which this highlighter is being used
     * @returns {boolean} false by default; subclasses return true to enable {@link writeStylesheetToDisk}
     */
    writeStylesheet(doc: Document): boolean;
    /**
     * Writes the stylesheet to disk.
     *
     * @param {Document} doc - the Document in which this highlighter is used
     * @param {string} toDir - the absolute path of the output directory
     */
    writeStylesheetToDisk(doc: Document, toDir: string): void;
}
/**
 * A syntax highlighter factory backed by a caller-supplied registry.
 */
export class CustomFactory {
    /**
     * @param {Object|null} [seedRegistry=null] - initial registry entries
     */
    constructor(seedRegistry?: any | null);
    _registry: any;
    /**
     * Associates a syntax highlighter class or instance with one or more names.
     *
     * @param {Function|SyntaxHighlighterBase} syntaxHighlighter - the class or instance to register
     * @param {...string} names - one or more names to associate
     */
    register(syntaxHighlighter: Function | SyntaxHighlighterBase, ...names: string[]): void;
    /**
     * Retrieves the syntax highlighter class or instance registered for the given name.
     *
     * @param {string} name - the name to look up
     * @returns {Function|SyntaxHighlighterBase|null} the registered class or instance, or null
     */
    for(name: string): Function | SyntaxHighlighterBase | null;
    /**
     * Resolves a name to a syntax highlighter instance.
     *
     * @param {string} name - the name of the syntax highlighter
     * @param {string} [backend='html5'] - the backend name
     * @param {Object} [opts={}] - options passed to the constructor
     * @returns {SyntaxHighlighterBase|null} a highlighter instance, or null if not registered
     */
    create(name: string, backend?: string, opts?: any): SyntaxHighlighterBase | null;
}
export class DefaultFactoryProxy extends CustomFactory {
    /**
     * @param {Object} overrides - map of name → class/instance/null
     * @param {CustomFactory} fallback - factory to delegate to when name is not overridden
     */
    constructor(overrides: any, fallback: CustomFactory);
    _fallback: CustomFactory;
    for(name: any): any;
}
export class DefaultFactory extends CustomFactory {
    constructor();
    _defaultRegistry: {};
    register(syntaxHighlighter: any, ...names: any[]): void;
    for(name: any): any;
    /**
     * Retrieves the syntax highlighter class or instance registered for the given name.
     *
     * @param {string} name - the name of the syntax highlighter to retrieve
     * @returns {Function|SyntaxHighlighterBase|undefined} the registered class or instance, or undefined
     */
    get(name: string): Function | SyntaxHighlighterBase | undefined;
    create(name: any, backend?: string, opts?: {}): any;
    /**
     * Clears all custom (user) registrations; built-in adapters are preserved.
     */
    unregisterAll(): void;
}
export const SyntaxHighlighter: DefaultFactory;
import type { Block } from './block.js';
