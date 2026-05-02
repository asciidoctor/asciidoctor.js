/** @import { Reader } from './reader.js' */
export class ImageReference {
    constructor(target: any, imagesdir: any);
    target: any;
    imagesdir: any;
    /**
     * @returns {string} the target image path or URI.
     */
    getTarget(): string;
    /**
     * @returns {string} the images directory.
     */
    getImagesDirectory(): string;
    toString(): any;
}
export class Footnote {
    constructor(index: any, id: any, text: any);
    index: any;
    id: any;
    text: any;
    /**
     * @returns {number} the index of this footnote.
     */
    getIndex(): number;
    /**
     * @returns {string|null} the id of this footnote, or null if not set.
     */
    getId(): string | null;
    /**
     * @returns {string} the text of this footnote.
     */
    getText(): string;
}
export class AttributeEntry {
    constructor(name: any, value: any, negate?: any);
    name: any;
    value: any;
    negate: any;
    saveTo(blockAttributes: any): this;
}
/**
 * Parsed and stores a partitioned title (title & subtitle).
 */
export class DocumentTitle {
    constructor(val: any, opts?: {});
    _sanitized: boolean;
    main: any;
    subtitle: any;
    combined: any;
    get title(): any;
    isSanitized(): boolean;
    hasSubtitle(): boolean;
    getMain(): any;
    getCombined(): any;
    getSubtitle(): any;
    toString(): any;
}
/**
 * Represents an Author parsed from document attributes.
 */
export class Author {
    constructor(name: any, firstname: any, middlename: any, lastname: any, initials: any, email: any);
    name: any;
    firstname: any;
    middlename: any;
    lastname: any;
    initials: any;
    email: any;
    getName(): any;
    getFirstName(): any;
    getMiddleName(): any;
    getLastName(): any;
    getInitials(): any;
    getEmail(): any;
}
export class RevisionInfo {
    constructor(number: any, date: any, remark: any);
    _number: any;
    _date: any;
    _remark: any;
    isEmpty(): boolean;
    getNumber(): any;
    getDate(): any;
    getRemark(): any;
}
export class Document extends AbstractBlock<string> {
    /**
     * Factory — create and fully parse a Document asynchronously.
     * @param {string|string[]|null} data - The AsciiDoc source.
     * @param {Object} [options={}] - Processing options.
     * @returns {Promise<Document>} The parsed Document.
     */
    static create(data: string | string[] | null, options?: any): Promise<Document>;
    constructor(data?: any, options?: {});
    /** @type {Reader} */
    reader: Reader;
    /** @type {string} */
    doctype: string;
    /** @type {string} */
    baseDir: string;
    /** @type {string} */
    backend: string;
    /** @type {number} */
    safe: number;
    /** @type {boolean} */
    compatMode: boolean;
    set converter(v: any);
    /** Override AbstractNode's getter so Document can own its converter directly. */
    get converter(): any;
    parentDocument: any;
    catalog: any;
    outfilesuffix: any;
    sourcemap: any;
    pathResolver: any;
    extensions: any;
    syntaxHighlighter: any;
    header: Section;
    options: Readonly<{}>;
    /** Alias catalog as references (backwards compat). */
    get references(): any;
    /** @returns {boolean} True if this is a nested (child) document. */
    nested(): boolean;
    /**
     * Parse the AsciiDoc source and populate the document AST.
     *
     * This method is idempotent — repeated calls are no-ops once parsing is done.
     * You rarely need to call it directly: prefer {@link Document.create} (factory) or
     * the top-level {@link load} / {@link loadFile} functions, which call `parse()` for you.
     *
     * Call `parse()` explicitly only when you constructed `new Document(...)` by hand and
     * need to defer the work, or when you want to supply a replacement `data` source.
     *
     * @param {string|string[]|null} [data=null] - Optional replacement source lines.
     *   When provided, replaces the data that was given to the constructor.
     * @returns {Promise<Document>} This Document instance (allows chaining).
     *
     * @example
     * const doc = new Document('= Hello', {})
     * await doc.parse()
     * console.log(doc.getTitle()) // → 'Hello'
     */
    parse(data?: string | string[] | null): Promise<Document>;
    /**
     * Return whether the document has been fully parsed.
     * @returns {boolean}
     */
    isParsed(): boolean;
    /**
     * Get the named counter and advance it by one step.
     *
     * Counters are document-scoped sequences used for automatic numbering (figures,
     * tables, custom labels, …). Each call increments the sequence and returns the
     * new value. Numeric counters increment by 1; alphabetic counters advance through
     * the alphabet (`'a'` → `'b'` → … → `'z'`).
     *
     * When the counter does not yet exist:
     * - If `seed` is a number (or a string that parses as an integer), the counter starts at `seed`.
     * - If `seed` is a letter (`'a'`–`'z'`), the counter starts at that letter.
     * - If `seed` is `null` (default), the counter starts at `1`.
     *
     * @param {string} name - Counter name (document-scoped key).
     * @param {string|number|null} [seed=null] - Starting value for new counters.
     * @returns {string|number} The new counter value after incrementing.
     *
     * @example <caption>Numeric counter (auto-starts at 1)</caption>
     * doc.counter('figure-number')   // → 1
     * doc.counter('figure-number')   // → 2
     *
     * @example <caption>Alphabetic counter</caption>
     * doc.counter('appendix-number', 'A')  // → 'A'
     * doc.counter('appendix-number', 'A')  // → 'B'
     *
     * @example <caption>Numeric counter with custom start</caption>
     * doc.counter('example-number', 5)   // → 5
     * doc.counter('example-number', 5)   // → 6
     */
    counter(name: string, seed?: string | number | null): string | number;
    /**
     * Increment the specified counter and store it in the block's attributes.
     * @param {string} counterName
     * @param {Object} block
     * @returns {string|number} The new counter value.
     */
    incrementAndStoreCounter(counterName: string, block: any): string | number;
    /** @deprecated Use incrementAndStoreCounter instead. */
    counterIncrement(counterName: any, block: any): string | number;
    /**
     * Register a reference in the document catalog.
     * @param {string} type - Catalog type ('ids', 'refs', 'footnotes', 'links', 'images', 'callouts').
     * @param {*} value - The value to register.
     */
    register(type: string, value: any): boolean | Inline;
    /**
     * Find the first registered reference matching the given reftext.
     * @param {string} text - The reftext to look up.
     * @returns {string|null} The matching ID, or null.
     */
    resolveId(text: string): string | null;
    isMultipart(): boolean;
    hasFootnotes(): boolean;
    get footnotes(): any;
    get callouts(): any;
    isNested(): boolean;
    isEmbedded(): boolean;
    hasExtensions(): boolean;
    source(): string;
    sourceLines(): string[];
    basebackend(base: any): boolean;
    /**
     * Resolve the primary title for the document.
     * @param {Object} [opts={}]
     * @param {boolean} [opts.use_fallback] - Use 'untitled-label' if no title found.
     * @param {boolean|string} [opts.partition] - Return a DocumentTitle instead of a string.
     * @param {boolean} [opts.sanitize] - Strip XML tags from the title.
     * @returns {string|DocumentTitle|null}
     */
    doctitle(opts?: {
        use_fallback?: boolean;
        partition?: boolean | string;
        sanitize?: boolean;
    }): string | DocumentTitle | null;
    get name(): string | DocumentTitle;
    get author(): any;
    get revdate(): any;
    authors(): Author[];
    isNotitle(): boolean;
    isNoheader(): boolean;
    isNofooter(): boolean;
    firstSection(): AbstractBlock<string>;
    hasHeader(): boolean;
    /**
     * Append a child Block, assigning index if it's a section.
     * @param {Object} block
     * @returns {Object} The appended block.
     */
    append(block: any): any;
    /**
     * @private
     * Called by parser after parsing header, before parsing body.
     */
    private finalizeHeader;
    /**
     * Replay attribute assignments from block attributes.
     * @param {Object} blockAttributes
     */
    playbackAttributes(blockAttributes: any): void;
    /**
     * Set the specified attribute if not locked.
     * @param {string} name
     * @param {string} [value='']
     * @param {boolean} [skipSubs=false]
     * @returns {string|null} The substituted value, or null if locked.
     */
    setAttribute(name: string, value?: string, skipSubs?: boolean): string | null;
    /**
     * Delete the specified attribute if not locked.
     * @param {string} name
     * @returns {boolean} True if deleted, false if locked.
     */
    deleteAttribute(name: string): boolean;
    /**
     * Check if the attribute is locked (set via attribute overrides).
     * @param {string} name
     * @returns {boolean}
     */
    isAttributeLocked(name: string): boolean;
    /** @deprecated Use isAttributeLocked instead. */
    attributeLocked(name: any): boolean;
    /**
     * Assign a value to the specified attribute in the document header.
     * @param {string} name
     * @param {string} [value='']
     * @param {boolean} [overwrite=true]
     * @returns {boolean} False if the attribute exists and overwrite is false.
     */
    setHeaderAttribute(name: string, value?: string, overwrite?: boolean): boolean;
    /**
     * Convert the parsed document to its output format (HTML5 by default).
     *
     * If `parse()` has not been called yet, it is called automatically.
     *
     * @param {Object} [opts={}] - Conversion options.
     * @param {boolean} [opts.standalone] - When `true`, wraps output in a full
     *   document shell (html/head/body). Defaults to the `standalone` option
     *   passed at load time (which itself defaults to `true`).
     * @param {string} [opts.outfile] - Path of the output file; stored as the
     *   `outfile` document attribute during conversion.
     * @param {string} [opts.outdir] - Directory of the output file; stored as the
     *   `outdir` document attribute during conversion.
     * @returns {Promise<string>} The converted output string.
     *
     * @example <caption>Embedded HTML (no html/head/body wrapper)</caption>
     * const doc = await Document.create('= Hello\nWorld', {})
     * const html = await doc.convert({ standalone: false })
     *
     * @example <caption>Full standalone HTML page</caption>
     * const html = await doc.convert({ standalone: true })
     */
    convert(opts?: {
        standalone?: boolean;
        outfile?: string;
        outdir?: string;
    }): Promise<string>;
    /** @deprecated Use convert instead. */
    render(opts?: {}): Promise<string>;
    /**
     * Write converted output to a file path or a writable stream.
     *
     * When `target` is a **string**, the output is written to that file path using
     * `node:fs/promises.writeFile`.
     * When `target` is a **writable stream** (has a `.write()` method), the output
     * is written to the stream in two chunks (content + newline).
     * When the converter itself implements `write()`, that method is called instead.
     *
     * @param {string} output - The converted output string returned by {@link convert}.
     * @param {string|import('stream').Writable} target - File path or writable stream.
     * @returns {Promise<void>}
     *
     * @example <caption>Write to a file</caption>
     * const output = await doc.convert()
     * await doc.write(output, 'out/index.html')
     *
     * @example <caption>Write to a stream</caption>
     * await doc.write(output, process.stdout)
     */
    write(output: string, target: string | any): Promise<void>;
    /**
     * Read the docinfo file(s) for inclusion in the document template.
     * @param {string} [location='head'] - 'head' or 'footer'.
     * @param {string|null} [suffix=null] - File suffix override.
     * @returns {Promise<string>} Combined docinfo content.
     */
    docinfo(location?: string, suffix?: string | null): Promise<string>;
    /**
     * @param {string} [location='head'] A location for checking docinfo extensions at a given location (head or footer).
     * @returns {boolean} True if docinfo processors are registered for the given location.
     */
    hasDocinfoProcessors(location?: string): boolean;
    /**
     * @deprecated Use {@link getDocumentTitle} instead.
     * @see getDocumentTitle
     */
    getDoctitle(opts?: {}): string | DocumentTitle;
    /**
     * Resolve the primary title for the document.
     *
     * Searches the following locations in order, returning the first non-empty value:
     * - document-level attribute named `title`
     * - header title (the document title)
     * - title of the first section
     * - document-level attribute named `untitled-label` (if `opts.use_fallback` is set)
     *
     * If no value can be resolved, `null` is returned.
     *
     * If `opts.partition` is specified, the value is parsed into a {@link DocumentTitle} object.
     * If `opts.sanitize` is specified, XML elements are removed from the value.
     * @param {Object} [opts={}]
     * @param {boolean} [opts.partition] - Parse the title into a {@link DocumentTitle} with main and subtitle parts.
     * @param {boolean} [opts.sanitize] - Strip XML/HTML elements from the resolved title.
     * @param {boolean} [opts.use_fallback] - Fall back to the `untitled-label` attribute if no title is found.
     * @returns {string|DocumentTitle|null} The resolved title, or null if none found.
     */
    getDocumentTitle(opts?: {
        partition?: boolean;
        sanitize?: boolean;
        use_fallback?: boolean;
    }): string | DocumentTitle | null;
    /** @returns {string} The document type (e.g. 'article', 'book'). */
    getDoctype(): string;
    /** @returns {string} The backend name (e.g. 'html5', 'docbook5'). */
    getBackend(): string;
    /**
     * @returns {number} The safe mode level as a numeric value.
     * Corresponds to {@link SafeMode}: unsafe (0), safe (1), server (10), secure (20).
     */
    getSafe(): number;
    /**
     * Get the AsciiDoc compatibility mode flag.
     *
     * Enabling this attribute activates the following syntax changes:
     * - single quotes as constrained emphasis formatting marks
     * - single backticks parsed as inline literal, formatted as monospace
     * - single plus parsed as constrained, monospaced inline formatting
     * - double plus parsed as constrained, monospaced inline formatting
     * @returns {boolean} True if compat mode is enabled.
     */
    getCompatMode(): boolean;
    /** @returns {boolean} True if sourcemap is enabled. */
    getSourcemap(): boolean;
    /** @param {boolean} val */
    setSourcemap(val: boolean): void;
    /** @returns {string} The output file suffix (e.g. '.html'). */
    getOutfilesuffix(): string;
    /** @returns {Object} The frozen options object. */
    getOptions(): any;
    /**
     * Set the converter instance for this document.
     * @param {Object} converter - The converter instance.
     */
    setConverter(converter: any): void;
    /** @returns {string|null} The raw AsciiDoc source. */
    getSource(): string | null;
    /** @returns {string[]|null} The source lines. */
    getSourceLines(): string[] | null;
    /** @returns {Object} The preprocessor reader. */
    getReader(): any;
    /** @returns {Footnote[]} The registered footnotes. */
    getFootnotes(): Footnote[];
    /** @returns {Object} The callouts registry. */
    getCallouts(): any;
    /** @returns {Object} The asset catalog. */
    getCatalog(): any;
    /** @returns {Object} The counters map. */
    getCounters(): any;
    /** @returns {string|null} The first author name. */
    getAuthor(): string | null;
    /** @returns {Author[]} All document authors. */
    getAuthors(): Author[];
    /** @returns {string} The base directory path. */
    getBaseDir(): string;
    /** @returns {RevisionInfo} The revision information. */
    getRevisionInfo(): RevisionInfo;
    /** @returns {Object|null} The extensions registry. */
    getExtensions(): any | null;
    /** @returns {Document|undefined} The parent document, or undefined for root documents. */
    getParentDocument(): Document | undefined;
    /**
     * Get the parent node of this node.
     * Always returns undefined for a root Document (Document is its own internal parent).
     * @returns {undefined}
     */
    getParent(): undefined;
    /** @returns {Object|null} The syntax highlighter instance. */
    getSyntaxHighlighter(): any | null;
    /** @returns {Object} The id→node reference map. */
    getRefs(): any;
    /** @returns {ImageReference[]} The registered image references. */
    getImages(): ImageReference[];
    /** @returns {string[]} The registered links. */
    getLinks(): string[];
    /** @returns {Object|null} The level-0 Section (document header). */
    getHeader(): any | null;
    /** @returns {boolean} True if the basebackend attribute is set. */
    isBasebackend(): boolean;
    /** @returns {Object} The asset catalog (alias for getCatalog). */
    getReferences(): any;
    /** @returns {string|undefined} The revision date. */
    getRevisionDate(): string | undefined;
    /** @returns {string|undefined} The revision date (alias for getRevisionDate). */
    getRevdate(): string | undefined;
    /** @returns {string|undefined} The revision number. */
    getRevisionNumber(): string | undefined;
    /** @returns {string|undefined} The revision remark. */
    getRevisionRemark(): string | undefined;
    /** @returns {boolean} True if any revision info is set. */
    hasRevisionInfo(): boolean;
    /** @returns {boolean} True if the notitle attribute is set. */
    getNotitle(): boolean;
    /** @returns {boolean} True if the noheader attribute is set. */
    getNoheader(): boolean;
    /** @returns {boolean} True if the nofooter attribute is set. */
    getNofooter(): boolean;
    /** Restore attributes to their saved header state. */
    restoreAttributes(): void;
    /**
     * @param {string} [location='head']
     * @param {string} [suffix]
     * @returns {Promise<string>}
     */
    getDocinfo(location?: string, suffix?: string): Promise<string>;
    /**
     * Delete the specified attribute if not locked.
     * @param {string} name - The attribute name to remove.
     * @returns {string|undefined} The previous value, or undefined if not present or locked.
     */
    removeAttribute(name: string): string | undefined;
    /**
     * @private
     * Sync version: applies only synchronous subs (specialcharacters, attributes, replacements).
     * Used by setAttribute() which must remain sync for the {set:...} inline directive path.
     * Async subs (quotes, macros, …) in pass macros are handled by _applyAttributeEntryValueSubs.
     */
    private _applyAttributeValueSubs;
    /**
     * @private
     * Async version: applies all subs including async ones (quotes, macros, …).
     * Used by processAttributeEntry() which can await the result.
     */
    private _applyAttributeEntryValueSubs;
    /**
     * @private
     * Resolve the list of substitutions to apply to docinfo files.
     *
     * Resolves subs from the `docinfosubs` document attribute if present,
     * otherwise returns `['attributes']` as the default.
     * @returns {string[]} The list of substitutions to apply.
     */
    private _resolveDocinfoSubs;
    /**
     * @private
     * Walk the block tree and pre-compute all async text values.
     * Handles titles (AbstractBlock), list item text, table cell text, and reftexts.
     */
    private _resolveAllTexts;
    /**
     * @private
     * Create and initialize an instance of the converter for this document.
     * @param {string} backend - The backend name (e.g. 'html5', 'docbook5').
     * @param {string} [delegateBackend] - An optional delegate backend to use when resolving the converter.
     */
    private _createConverter;
}
export namespace Document {
    export { Footnote };
}
export const _deps: {};
import { AbstractBlock } from './abstract_block.js';
import type { Reader } from './reader.js';
import { Section } from './section.js';
import { Inline } from './inline.js';
