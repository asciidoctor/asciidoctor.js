export class Table extends AbstractBlock {
    constructor(parent: any, attributes: any);
    rows: {
        head: any[];
        foot: any[];
        body: any[];
        bySection(): (string | any[])[][];
        toObject(): {
            head: any[];
            body: any[];
            foot: any[];
        };
    };
    columns: any[];
    hasHeaderOption: boolean;
    headerRow(): boolean;
    createColumns(colspecs: any): void;
    assignColumnWidths(widthBase?: any, autowidthCols?: any): void;
    partitionHeaderFooter(attrs: any): Promise<void>;
}
export namespace Table {
    export { Rows };
    export { Column };
    export { Cell };
    export { ParserContext };
}
import { AbstractBlock } from './abstract_block.js';
declare class Rows {
    constructor(head?: any[], foot?: any[], body?: any[]);
    head: any[];
    foot: any[];
    body: any[];
    bySection(): (string | any[])[][];
    toObject(): {
        head: any[];
        body: any[];
        foot: any[];
    };
}
declare class Column extends AbstractNode {
    style: any;
    get table(): any;
    assignWidth(colPcwidth: any, widthBase: any, precision: any): any;
    isBlock(): boolean;
    isInline(): boolean;
}
declare class Cell extends AbstractBlock {
    static get DOUBLE_LF(): string;
    static create(column: any, cellText: any, attributes?: {}, opts?: {}): Promise<Cell>;
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
    get column(): any;
    reinitialize(hasHeader: any): Promise<Cell>;
    _catalogInlineAnchor(cellText?: any, cursor?: any): void;
    set text(val: any);
    get text(): any;
    precomputeText(): Promise<void>;
    _convertedText: any;
    _cellbgcolor: any;
    content(): Promise<any>;
    lines(): any;
    source(): any;
    get innerDocument(): any;
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
    _closeRow(drop?: boolean): void;
    _activateRowspan(rowspan: any, colspan: any): void;
    _endOfRow(): 0 | 1 | -1;
    _advance(): void;
}
import { AbstractNode } from './abstract_node.js';
export {};
