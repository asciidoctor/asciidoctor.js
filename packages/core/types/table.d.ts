export class Table extends AbstractBlock<string> {
    constructor(parent: any, attributes: any);
    rows: {
        head: any[];
        foot: any[];
        body: any[];
        /**
         * Retrieve the rows grouped by section as a nested Array.
         * @returns {Array<[string, Array]>}
         */
        bySection(): Array<[string, any[]]>;
        toObject(): {
            head: any[];
            body: any[];
            foot: any[];
        };
    };
    columns: any[];
    hasHeaderOption: boolean;
}
export namespace Table {
    export { Rows };
    export { Column };
    export { Cell };
    export { ParserContext };
}
import { AbstractBlock } from './abstract_block.js';
import { AbstractNode } from './abstract_node.js';
declare class Rows {
    constructor(head?: any[], foot?: any[], body?: any[]);
    head: any[];
    foot: any[];
    body: any[];
    /**
     * Retrieve the rows grouped by section as a nested Array.
     * @returns {Array<[string, Array]>}
     */
    bySection(): Array<[string, any[]]>;
    toObject(): {
        head: any[];
        body: any[];
        foot: any[];
    };
}
declare class Column extends AbstractNode {
    style: any;
    /** Alias for parent (always a Table). */
    get table(): any;
    isBlock(): boolean;
    isInline(): boolean;
}
declare class Cell extends AbstractBlock<string> {
    static get DOUBLE_LF(): string;
    /**
     * Factory — create and fully initialize a Cell asynchronously.
     * For AsciiDoc cells, parses the nested document.
     *
     * NOTE: _innerContent is NOT pre-computed here. Document.convert() will call
     * _convertAsciiDocCells() after parse completes (so callouts are rewound and
     * all cross-references from the parent document are already registered).
     * @param {Table.Column} column
     * @param {string} cellText
     * @param {Object} [attributes={}]
     * @param {Object} [opts={}]
     * @returns {Promise<Table.Cell>}
     */
    static create(column: {
        style: any;
        /** Alias for parent (always a Table). */
        get table(): any;
        /**
         * Calculate and assign the widths for this column.
         * @param {number|null} colPcwidth
         * @param {number|null} widthBase
         * @param {number} precision
         * @returns {number} The resolved colpcwidth value.
         * @internal
         */
        assignWidth(colPcwidth: number | null, widthBase: number | null, precision: number): number;
        isBlock(): boolean;
        isInline(): boolean;
        document: any;
        _parent: any;
        context: any;
        nodeName: string;
        id: string;
        attributes: any;
        passthroughs: any[];
        get parent(): any;
        set parent(parent: any);
        get role(): any;
        set role(names: any);
        get roles(): any;
        getRole(): string | undefined;
        setRole(...names: (string | string[])[]): string;
        getRoles(): string[];
        get converter(): any;
        getNodeName(): string;
        getId(): string | undefined;
        setId(id: string): void;
        getContext(): string;
        getConverter(): object;
        attr(name: string, defaultValue?: any, fallbackName?: string | boolean | null): any;
        hasAttr(name: string, expectedValue?: any, fallbackName?: string | boolean | null): boolean;
        getAttribute(name: string, defaultValue?: any, inherit?: string | boolean): any;
        hasAttribute(name: string, expectedValue?: any, fallbackName?: string | boolean | null): boolean;
        setAttribute(name: string, value?: any, overwrite?: boolean): string | boolean | null;
        isAttribute(name: string, expectedValue?: any): boolean;
        removeAttribute(name: string): any;
        getAttributes(): any;
        getDocument(): Document;
        getParent(): AbstractNode | undefined;
        getIconUri(name: string): Promise<string>;
        getMediaUri(target: string, assetDirKey?: string): string;
        getImageUri(targetImage: string, assetDirKey?: string | null): Promise<string>;
        setAttr(name: string, value?: any, overwrite?: boolean): boolean;
        removeAttr(name: string): any;
        getAttr(name: string, defaultValue?: any, inherit?: string | boolean): any;
        hasOption(name: string): boolean;
        setOption(name: string): void;
        enabledOptions(): Set<string>;
        updateAttributes(newAttributes: any): any;
        hasRoleAttr(expectedValue?: string | null): boolean;
        hasRole(name: string): boolean;
        addRole(name: string): boolean;
        removeRole(name: string): boolean;
        get reftext(): string | null;
        precomputeReftext(): Promise<void>;
        _convertedReftext: any;
        hasReftext(): boolean;
        getReftext(): string | undefined;
        isReftext(): boolean;
        iconUri(name: string): Promise<string>;
        imageUri(targetImage: string, assetDirKey?: string): Promise<string>;
        mediaUri(target: string, assetDirKey?: string): string;
        generateDataUri(targetImage: string, assetDirKey?: string | null): Promise<string>;
        generateDataUriFromUri(imageUri: string, cacheUri?: boolean): Promise<string>;
        normalizeAssetPath(assetRef: string, assetName?: string, autocorrect?: boolean): string;
        normalizeSystemPath(target: string, start?: string | null, jail?: string | null, opts?: any): string;
        normalizeWebPath(target: string, start?: string | null, preserveUriTarget?: boolean): string;
        readAsset(path: string, opts?: any): Promise<string | null>;
        readContents(target: string, opts?: any): Promise<string | null>;
        isUri(str: string): boolean;
        readonly logger: any;
    }, cellText: string, attributes?: any, opts?: any): Promise<typeof Cell>;
    constructor(column: any, cellText: any, attributes?: {}, opts?: {});
    _cursor: any;
    _reinitializeArgs: any[];
    colspan: number;
    rowspan: number;
    _innerDocSetup: {
        lines: any;
        parentDoc: any;
        parentDoctitle: any;
        options: {
            safe: any;
            backend: any;
            header_footer: boolean;
            parent: any;
            cursor: any;
        };
    };
    _subs: string[];
    _text: any;
    style: any;
    /** Alias for parent (always a Column). */
    get column(): any;
    reinitialize(hasHeader: any): Promise<typeof Cell | this>;
    _catalogInlineAnchor(cellText?: any, cursor?: any): void;
    set text(val: string | null);
    /**
     * Get the text with substitutions applied.
     * The result is pre-computed during Document.parse() via precomputeText().
     * Falls back to the raw text if precomputeText() has not been called yet.
     * @returns {string|null}
     */
    get text(): string | null;
    /**
     * Pre-compute the converted text asynchronously.
     * Called during Document.parse() so the synchronous getter works during conversion.
     * @returns {Promise<void>}
     */
    precomputeText(): Promise<void>;
    _convertedText: any;
    _cellbgcolor: any;
    /**
     * Get the content — converted body data.
     * For AsciiDoc cells, returns the pre-computed content (set by Document.convert()).
     * @returns {Promise<string|string[]>}
     */
    content(): Promise<string | string[]>;
    lines(): any;
    source(): any;
    get innerDocument(): any;
    get file(): any;
    get lineno(): any;
}
declare class ParserContext {
    static get FORMATS(): Set<string>;
    static get DELIMITERS(): {
        psv: (string | RegExp)[];
        csv: (string | RegExp)[];
        dsv: (string | RegExp)[];
        tsv: (string | RegExp)[];
        '!sv': (string | RegExp)[];
    };
    constructor(reader: any, table: any, attributes?: {});
    _reader: any;
    _startCursor: any;
    table: any;
    buffer: string;
    format: unknown;
    delimiter: any;
    delimiterRe: any;
    colcount: any;
    _cellspecs: any[];
    _cellOpen: boolean;
    _activeRowspans: number[];
    _columnVisits: number;
    _currentRow: any[];
    _linenum: number;
    startsWith(line: any): any;
    matchDelimiter(line: any): any;
    skipPastDelimiter(pre: any): void;
    skipPastEscapedDelimiter(pre: any): void;
    bufferHasUnclosedQuotesInText(text: any, q?: string): boolean;
    bufferHasUnclosedQuotes(append?: any, q?: string): boolean;
    takeCellspec(): any;
    pushCellspec(cellspec?: {}): void;
    keepCellOpen(): void;
    markCellClosed(): void;
    isCellOpen(): boolean;
    isCellClosed(): boolean;
    closeOpenCell(nextCellspec?: {}): Promise<void>;
    closeCell(eol?: boolean): Promise<void>;
    closeTable(): void;
    _activateRowspan(rowspan: any, colspan: any): void;
    _endOfRow(): 0 | 1 | -1;
    _advance(): void;
}
export {};
