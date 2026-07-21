/**
 * Snapshot captured by {@link Reader#save}/{@link PreprocessorReader#save} and
 * consumed by the matching restoreSave().
 * @typedef {Object} ReaderSaveState
 * @property {string|null} file
 * @property {string} dir
 * @property {string} path
 * @property {number} lineno
 * @property {string[]} lines
 * @property {[string|null, string, string, number]|null} mark
 * @property {number} lookAhead
 * @property {boolean} processLines
 * @property {boolean} unescapeNextLine
 * @property {boolean|null} unterminated
 * @property {MaxDepth|null} [maxdepth]
 * @property {boolean} [skipping]
 * @property {ConditionalStackEntry[]} [conditionalStack]
 * @property {Array} [includeStack]
 */
/**
 * @typedef {Object} MaxDepth
 * @property {number} abs
 * @property {number} curr
 * @property {number} rel
 */
/**
 * An entry on the preprocessor conditional directive stack (ifdef/ifndef/ifeval).
 * @typedef {Object} ConditionalStackEntry
 * @property {string} name
 * @property {string} [target]
 * @property {string} [expr]
 * @property {boolean} [skip]
 * @property {boolean} skipping
 * @property {Cursor|null} sourceLocation
 */
export class Cursor {
    constructor(file: any, dir?: any, path?: any, lineno?: number);
    file: any;
    dir: any;
    path: any;
    lineno: number;
    advance(num: any): void;
    get lineInfo(): string;
    toString(): string;
    getLineNumber(): number;
    getFile(): any;
    getDirectory(): any;
    getPath(): any;
    /**
     * Get the line info string for this cursor (e.g. "path/to/file.adoc: line 42").
     * @returns {string}
     */
    getLineInfo(): string;
}
export class Reader {
    constructor(data?: any, cursor?: any, opts?: {});
    file: any;
    path: any;
    lineno: any;
    sourceLines: string[];
    processLines: boolean;
    unterminated: boolean;
    /** @returns {boolean | Promise<boolean>} */
    hasMoreLines(): boolean | Promise<boolean>;
    /** @returns {boolean | Promise<boolean>} */
    empty(): boolean | Promise<boolean>;
    /** @returns {boolean | Promise<boolean>} */
    eof(): boolean | Promise<boolean>;
    nextLineEmpty(): Promise<boolean>;
    isNextLineEmpty(): Promise<boolean>;
    /**
     * Peek at the next line without consuming it.
     * @param {boolean} [direct=false] - When true, bypass processLine and return the raw stack top.
     * @returns {Promise<string|undefined>} The next line, or undefined if there are no more lines.
     */
    peekLine(direct?: boolean): Promise<string | undefined>;
    /**
     * Peek at the next num lines without consuming them.
     * @param {number|null} [num=null]
     * @param {boolean} [direct=false]
     * @returns {Promise<string[]>}
     */
    peekLines(num?: number | null, direct?: boolean): Promise<string[]>;
    readLine(): Promise<string>;
    readLines(): Promise<string[]>;
    readlines(): Promise<string[]>;
    read(): Promise<string>;
    advance(): Promise<boolean>;
    unshiftLine(lineToRestore: any): void;
    restoreLine(lineToRestore: any): void;
    unshiftLines(linesToRestore: any): void;
    restoreLines(linesToRestore: any): void;
    replaceNextLine(replacement: any): boolean;
    replaceLine(replacement: any): boolean;
    skipBlankLines(): Promise<number>;
    skipCommentLines(): Promise<void>;
    skipLineComments(): Promise<string[]>;
    terminate(): void;
    /**
     * Read lines until a termination condition is met.
     * @param {Object} [options={}]
     * @param {string} [options.terminator] - Line at which to stop.
     * @param {boolean} [options.breakOnBlankLines] - Stop on blank lines.
     * @param {boolean} [options.breakOnListContinuation] - Stop on a list continuation (+).
     * @param {boolean} [options.skipFirstLine] - Skip the first line before scanning.
     * @param {boolean} [options.preserveLastLine] - Push the terminating line back.
     * @param {boolean} [options.readLastLine] - Include the terminating line in result.
     * @param {boolean} [options.skipLineComments] - Skip line comments.
     * @param {boolean} [options.skipProcessing] - Disable line preprocessing for this call.
     * @param {string} [options.context] - Name used in unterminated-block warnings.
     * @param {Cursor} [options.cursor] - Starting cursor for unterminated-block warnings.
     * @param {Function|null} [filter=null] - Optional function(line) returning true to break.
     * @returns {Promise<string[]>}
     */
    readLinesUntil(options?: {
        terminator?: string;
        breakOnBlankLines?: boolean;
        breakOnListContinuation?: boolean;
        skipFirstLine?: boolean;
        preserveLastLine?: boolean;
        readLastLine?: boolean;
        skipLineComments?: boolean;
        skipProcessing?: boolean;
        context?: string;
        cursor?: Cursor;
    }, filter?: Function | null): Promise<string[]>;
    get cursor(): Cursor;
    cursorAtLine(lineno: any): Cursor;
    cursorAtMark(): Cursor;
    cursorBeforeMark(): Cursor;
    cursorAtPrevLine(): Cursor;
    mark(): void;
    lineInfo(): string;
    /**
     * Returns the remaining lines in forward order (first remaining line at index 0).
     * The returned object is a mutable proxy so that element assignments like
     * `reader.lines[i] = newValue` are reflected back into the internal reversed stack.
     * @returns {string[]}
     */
    get lines(): string[];
    string(): string;
    source(): string;
    /** @returns {void} */
    save(): void;
    /** @returns {void} */
    restoreSave(): void;
    discardSave(): void;
    toString(): string;
    getCursor(): Cursor;
    getLines(): string[];
    getString(): string;
    /** @returns {import('./logging.js').LoggerLike} */
    getLogger(): import("./logging.js").LoggerLike;
    /**
     * @param {string} text
     * @param {{sourceLocation?: Cursor, includeLocation?: Cursor}} [context={}]
     * @returns {{text: string, source_location?: Cursor, include_location?: Cursor, inspect(): string, toString(): string}}
     */
    createLogMessage(text: string, context?: {
        sourceLocation?: Cursor;
        includeLocation?: Cursor;
    }): {
        text: string;
        source_location?: Cursor;
        include_location?: Cursor;
        inspect(): string;
        toString(): string;
    };
    /** @returns {import('./logging.js').LoggerLike} */
    get logger(): import("./logging.js").LoggerLike;
    /** @param {string} msg @param {{ sourceLocation?: any, includeLocation?: any }} [opts] */
    _logWarn(msg: string, opts?: {
        sourceLocation?: any;
        includeLocation?: any;
    }): void;
    _logError(msg: any, opts?: {}): void;
    /** @param {string} msg @param {{ sourceLocation?: any }} [opts] */
    _logInfo(msg: string, opts?: {
        sourceLocation?: any;
    }): void;
    #private;
}
export class PreprocessorReader extends Reader {
    constructor(document: any, data?: any, cursor?: any, opts?: {});
    _document: any;
    includeStack: any[];
    /**
     * Drain conditional stack at EOS; treat blank lines as lines (not as EOF).
     * `peekLine()` returns undefined only at true EOF; '' for blank lines.
     * @returns {Promise<boolean>}
     */
    hasMoreLines(): Promise<boolean>;
    empty(): Promise<boolean>;
    eof(): Promise<boolean>;
    peekLine(direct?: boolean): any;
    /**
     * Push new source onto the reader, switching the include context.
     * @param {string|string[]} data
     * @param {string|null} [file=null]
     * @param {string|null} [path=null]
     * @param {number} [lineno=1]
     * @param {Object} [attributes={}]
     * @returns {this}
     */
    pushInclude(data: string | string[], file?: string | null, path?: string | null, lineno?: number, attributes?: any): this;
    get includeDepth(): number;
    exceedsMaxDepth(): number;
    exceededMaxDepth(): number;
    hasIncludeProcessors(): boolean;
    createIncludeCursor(file: any, path: any, lineno: any): Cursor;
    /**
     * Evaluate preprocessor directives as lines are visited.
     * @param {string} line
     * @returns {Promise<string|undefined>}
     */
    processLine(line: string): Promise<string | undefined>;
    /**
     * Get the current include depth (number of nested includes).
     * @returns {number}
     */
    getIncludeDepth(): number;
    #private;
}
/**
 * Snapshot captured by {@link Reader#save}/{@link PreprocessorReader#save} and
 * consumed by the matching restoreSave().
 */
export type ReaderSaveState = {
    file: string | null;
    dir: string;
    path: string;
    lineno: number;
    lines: string[];
    mark: [string | null, string, string, number] | null;
    lookAhead: number;
    processLines: boolean;
    unescapeNextLine: boolean;
    unterminated: boolean | null;
    maxdepth?: MaxDepth | null;
    skipping?: boolean;
    conditionalStack?: ConditionalStackEntry[];
    includeStack?: any[];
};
export type MaxDepth = {
    abs: number;
    curr: number;
    rel: number;
};
/**
 * An entry on the preprocessor conditional directive stack (ifdef/ifndef/ifeval).
 */
export type ConditionalStackEntry = {
    name: string;
    target?: string;
    expr?: string;
    skip?: boolean;
    skipping: boolean;
    sourceLocation: Cursor | null;
};
