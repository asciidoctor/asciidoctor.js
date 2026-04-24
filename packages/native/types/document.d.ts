export class ImageReference {
    constructor(target: any, imagesdir: any);
    target: any;
    imagesdir: any;
    toString(): any;
}
export class Footnote {
    constructor(index: any, id: any, text: any);
    index: any;
    id: any;
    text: any;
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
    set converter(v: any);
    /** Override AbstractNode's getter so Document can own its converter directly. */
    get converter(): any;
    _converter: any;
    _parent: this;
    document: this;
    parentDocument: any;
    catalog: any;
    _attributeOverrides: any;
    safe: any;
    compatMode: any;
    outfilesuffix: any;
    sourcemap: any;
    _timings: any;
    pathResolver: any;
    extensions: any;
    syntaxHighlighter: any;
    _initializeExtensions: boolean;
    _parentDoctype: any;
    _inputMtime: any;
    _parsed: boolean;
    _reftexts: {};
    header: Section;
    _headerAttributes: any;
    _counters: {};
    _attributesModified: Set<any>;
    _docinfoProcessorExtensions: {};
    options: Readonly<{}>;
    baseDir: any;
    _maxAttributeValueSize: number;
    backend: any;
    doctype: any;
    reader: any;
    /** Alias catalog as references (backwards compat). */
    get references(): any;
    /** @returns {boolean} True if this is a nested (child) document. */
    nested(): boolean;
    /**
     * Parse the AsciiDoc source.
     * @param {string|string[]|null} [data=null] - Optional replacement source data.
     * @returns {Promise<Document>} This Document.
     */
    parse(data?: string | string[] | null): Promise<Document>;
    isParsed(): boolean;
    /**
     * Get the named counter and take the next number in the sequence.
     * @param {string} name - Counter name.
     * @param {string|number|null} [seed=null] - Initial value if the counter doesn't exist.
     * @returns {string|number} The next counter value.
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
    /**
     * @private
     * Build the reftext→id lookup map. Called at end of parse().
     */
    private _buildReftextsMap;
    isMultipart(): boolean;
    hasFootnotes(): boolean;
    get footnotes(): any;
    get callouts(): any;
    isNested(): boolean;
    isEmbedded(): boolean;
    hasExtensions(): boolean;
    source(): any;
    sourceLines(): any;
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
    firstSection(): any;
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
     * @private
     * Restore attributes to the state saved at end of header parse.
     */
    private _restoreAttributes;
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
     * @private
     * Walk the block tree in document order and pre-compute the content of
     * every AsciiDoc-style table cell. Must be called AFTER parse() has finished so
     * that (a) callouts.rewind() has been called and (b) all cross-references from
     * the main document are already registered in the catalog.
     */
    private _convertAsciiDocCells;
    /**
     * Convert the AsciiDoc document.
     * @param {Object} [opts={}]
     * @returns {Promise<string>} The converted output.
     */
    convert(opts?: any): Promise<string>;
    /** @deprecated Use convert instead. */
    render(opts?: {}): Promise<string>;
    /**
     * Write output to the specified file or stream.
     * @param {string} output - The converted output string.
     * @param {string|Object} target - File path or writable stream.
     */
    write(output: string, target: string | any): Promise<void>;
    /**
     * Read the docinfo file(s) for inclusion in the document template.
     * @param {string} [location='head'] - 'head' or 'footer'.
     * @param {string|null} [suffix=null] - File suffix override.
     * @returns {Promise<string>} Combined docinfo content.
     */
    docinfo(location?: string, suffix?: string | null): Promise<string>;
    _docinfoProcessors(location: any): boolean;
    /**
     * Resolve the primary title for the document, optionally partitioned.
     * @param {Object} [opts={}]
     * @returns {string|DocumentTitle|null}
     */
    getDoctitle(opts?: any): string | DocumentTitle | null;
    getDocumentTitle(opts?: {}): string | DocumentTitle;
    /** @returns {string} The document type (e.g. 'article', 'book'). */
    getDoctype(): string;
    /** @returns {string} The backend name (e.g. 'html5', 'docbook5'). */
    getBackend(): string;
    /** @returns {number} The safe mode level. */
    getSafe(): number;
    /** @returns {boolean} True if compat mode is enabled. */
    getCompatMode(): boolean;
    /** @returns {boolean} True if sourcemap is enabled. */
    getSourcemap(): boolean;
    /** @param {boolean} val */
    setSourcemap(val: boolean): void;
    /** @returns {string} The output file suffix (e.g. '.html'). */
    getOutfilesuffix(): string;
    /** @returns {Object} The frozen options object. */
    getOptions(): any;
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
     * @param {string} [location='head']
     * @returns {boolean} True if docinfo processors are registered for the given location.
     */
    hasDocinfoProcessors(location?: string): boolean;
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
    _resolveDocinfoSubs(): any;
    /**
     * @private
     * Walk the block tree and pre-compute all async text values.
     * Handles titles (AbstractBlock), list item text, table cell text, and reftexts.
     */
    private _resolveAllTexts;
    _createConverter(backend: any, delegateBackend: any): any;
    _clearPlaybackAttributes(attributes: any): void;
    _saveAttributes(): void;
    _fillDatetimeAttributes(attrs: any, inputMtime: any): void;
    _updateBackendAttributes(newBackend: any, init?: boolean): any;
    _updateDoctypeAttributes(newDoctype: any): any;
}
export namespace Document {
    export { Footnote };
}
export const _deps: {};
import { AbstractBlock } from './abstract_block.js';
import { Section } from './section.js';
import { Inline } from './inline.js';
