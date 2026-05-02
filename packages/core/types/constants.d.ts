export * from "./rx.js";
export namespace SafeMode {
    /**
     * A safe mode level that disables any of the security features enforced
     * by Asciidoctor (Node is still subject to its own restrictions).
     */
    let UNSAFE: number;
    /**
     * A safe mode level that closely parallels safe mode in AsciiDoc. This value
     * prevents access to files which reside outside the parent directory of
     * the source file and disables any macro other than the `include::[]` directive.
     */
    let SAFE: number;
    /**
     * A safe mode level that disallows the document from setting attributes
     * that would affect the conversion of the document, in addition to all the
     * security features of {@link SafeMode.SAFE}. For instance, this level forbids
     * changing the backend or source-highlighter using an attribute defined
     * in the source document header. This is the most fundamental level of
     * security for server deployments (hence the name).
     */
    let SERVER: number;
    /**
     * A safe mode level that disallows the document from attempting to read
     * files from the file system and including the contents of them into the
     * document, in additional to all the security features of {@link SafeMode.SERVER}.
     * For instance, this level disallows use of the `include::[]` directive and the
     * embedding of binary content (data uri), stylesheets and JavaScripts
     * referenced by the document. (Asciidoctor and trusted extensions may still
     * be allowed to embed trusted content into the document).
     *
     * Since Asciidoctor is aiming for wide adoption, this level is the default
     * and is recommended for server deployments.
     */
    let SECURE: number;
    /**
     * Returns the numeric value for a safe-mode name string, or undefined.
     * @param {string} name
     * @returns {number|undefined}
     */
    function valueForName(name: string): number | undefined;
    /**
     * @param {string} name
     * @returns {number|undefined}
     */
    function getValueForName(name: string): number | undefined;
    /**
     * Returns the lowercase name for a numeric safe-mode value, or undefined.
     * @param {number} value
     * @returns {string|undefined}
     */
    function nameForValue(value: number): string | undefined;
    /**
     * @param {number} value
     * @returns {string|undefined}
     */
    function getNameForValue(value: number): string | undefined;
    /**
     * Returns all safe-mode names in ascending value order.
     * @returns {string[]}
     */
    function names(): string[];
    /**
     * @returns {string[]}
     */
    function getNames(): string[];
}
export namespace ContentModel {
    /** The block contains other blocks (sections, sidebars, admonitions, …). */
    let COMPOUND: string;
    /** The block holds a paragraph of prose that receives normal substitutions. */
    let SIMPLE: string;
    /** The block holds verbatim text displayed as-is with verbatim substitutions (listing, literal). */
    let VERBATIM: string;
    /** The block holds unprocessed content passed directly to output with no substitutions (pass). */
    let RAW: string;
    /** The block has no content (e.g. image, thematic break). */
    let EMPTY: string;
}
export const LF: "\n";
export const NULL: "\0";
export const TAB: "\t";
export const MAX_INT: 9007199254740991;
export const DEFAULT_DOCTYPE: "article";
export const DEFAULT_BACKEND: "html5";
export const DEFAULT_STYLESHEET_KEYS: Set<string>;
export const DEFAULT_STYLESHEET_NAME: "asciidoctor.css";
export namespace BACKEND_ALIASES {
    let html: string;
    let docbook: string;
}
export namespace DEFAULT_PAGE_WIDTHS {
    let docbook_1: number;
    export { docbook_1 as docbook };
}
export namespace DEFAULT_EXTENSIONS {
    let html_1: string;
    export { html_1 as html };
    let docbook_2: string;
    export { docbook_2 as docbook };
    export let pdf: string;
    export let epub: string;
    export let manpage: string;
    export let asciidoc: string;
}
export const ASCIIDOC_EXTENSIONS: {
    '.adoc': boolean;
    '.asciidoc': boolean;
    '.asc': boolean;
    '.ad': boolean;
    '.txt': boolean;
};
export const SETEXT_SECTION_LEVELS: {
    '=': number;
    '-': number;
    '~': number;
    '^': number;
    '+': number;
};
export const ADMONITION_STYLES: Set<string>;
export const ADMONITION_STYLE_HEADS: Set<string>;
export const PARAGRAPH_STYLES: Set<string>;
export const VERBATIM_STYLES: Set<string>;
export const DELIMITED_BLOCKS: {
    '--': (string | Set<string>)[];
    '----': (string | Set<string>)[];
    '....': (string | Set<string>)[];
    '====': (string | Set<string>)[];
    '****': (string | Set<any>)[];
    ____: (string | Set<string>)[];
    '++++': (string | Set<string>)[];
    '|===': (string | Set<any>)[];
    ',===': (string | Set<any>)[];
    ':===': (string | Set<any>)[];
    '!===': (string | Set<any>)[];
    '~~~~': (string | Set<string>)[];
    '////': (string | Set<any>)[];
    '```': (string | Set<any>)[];
};
export const DELIMITED_BLOCK_HEADS: {
    [k: string]: boolean;
};
export const DELIMITED_BLOCK_TAILS: {
    [k: string]: string;
};
export namespace CAPTION_ATTRIBUTE_NAMES {
    let example: string;
    let figure: string;
    let listing: string;
    let table: string;
}
export const LAYOUT_BREAK_CHARS: {
    "'": string;
    '<': string;
};
export const MARKDOWN_THEMATIC_BREAK_CHARS: {
    '-': string;
    '*': string;
    _: string;
};
export const HYBRID_LAYOUT_BREAK_CHARS: {
    '-': string;
    '*': string;
    _: string;
    "'": string;
    '<': string;
};
export const NESTABLE_LIST_CONTEXTS: string[];
export const ORDERED_LIST_STYLES: string[];
export namespace ORDERED_LIST_KEYWORDS {
    let loweralpha: string;
    let lowerroman: string;
    let upperalpha: string;
    let upperroman: string;
}
export const ATTR_REF_HEAD: "{";
export const LIST_CONTINUATION: "+";
export const HARD_LINE_BREAK: " +";
export const LINE_CONTINUATION: " \\";
export const LINE_CONTINUATION_LEGACY: " +";
export namespace BLOCK_MATH_DELIMITERS {
    let asciimath: string[];
    let latexmath: string[];
}
export namespace INLINE_MATH_DELIMITERS {
    let asciimath_1: string[];
    export { asciimath_1 as asciimath };
    let latexmath_1: string[];
    export { latexmath_1 as latexmath };
}
export namespace STEM_TYPE_ALIASES {
    let latexmath_2: string;
    export { latexmath_2 as latexmath };
    export let latex: string;
    export let tex: string;
}
export const FONT_AWESOME_VERSION: "4.7.0";
export const HIGHLIGHT_JS_VERSION: "9.18.3";
export const MATHJAX_VERSION: "2.7.9";
export const DEFAULT_ATTRIBUTES: {
    'appendix-caption': string;
    'appendix-refsig': string;
    'caution-caption': string;
    'chapter-refsig': string;
    'example-caption': string;
    'figure-caption': string;
    'important-caption': string;
    'last-update-label': string;
    'note-caption': string;
    'part-refsig': string;
    prewrap: string;
    sectids: string;
    'section-refsig': string;
    'table-caption': string;
    'tip-caption': string;
    'toc-placement': string;
    'toc-title': string;
    'untitled-label': string;
    'version-label': string;
    'warning-caption': string;
};
export const FLEXIBLE_ATTRIBUTES: string[];
export const INTRINSIC_ATTRIBUTES: {
    startsb: string;
    endsb: string;
    vbar: string;
    caret: string;
    asterisk: string;
    tilde: string;
    plus: string;
    backslash: string;
    backtick: string;
    blank: string;
    empty: string;
    sp: string;
    'two-colons': string;
    'two-semicolons': string;
    nbsp: string;
    deg: string;
    zwsp: string;
    quot: string;
    apos: string;
    lsquo: string;
    rsquo: string;
    ldquo: string;
    rdquo: string;
    wj: string;
    brvbar: string;
    pp: string;
    cpp: string;
    cxx: string;
    amp: string;
    lt: string;
    gt: string;
};
export namespace QUOTE_SUBS {
    export { _normalQuoteSubs as false };
    export { _compatQuoteSubs as true };
}
export const REPLACEMENTS: (string | RegExp)[][];
export const BASIC_SUBS: readonly string[];
export const NORMAL_SUBS: readonly string[];
export let ROOT_DIR: string;
export let LIB_DIR: string;
export let DATA_DIR: string;
export let USER_HOME: string;
declare const _normalQuoteSubs: (string | RegExp)[][];
declare const _compatQuoteSubs: (string | RegExp)[][];
