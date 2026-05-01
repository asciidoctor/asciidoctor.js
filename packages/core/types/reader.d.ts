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
    _dir: any;
    path: any;
    lineno: any;
    _document: any;
    sourceLines: string[];
    _lines: string[];
    _mark: any;
    _lookAhead: number;
    processLines: boolean;
    _unescapeNextLine: boolean;
    unterminated: any;
    _saved: any;
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
    save(): void;
    restoreSave(): void;
    discardSave(): void;
    toString(): string;
    getCursor(): Cursor;
    getLines(): string[];
    getString(): string;
    getLogger(): any;
    createLogMessage(text: any, context?: {}): any;
    get logger(): any;
    /** @param {string} msg @param {{ sourceLocation?: any, includeLocation?: any }} [opts] */
    _logWarn(msg: string, { sourceLocation, includeLocation }?: {
        sourceLocation?: any;
        includeLocation?: any;
    }): void;
    _logError(msg: any, opts?: {}): void;
    /** @param {string} msg @param {{ sourceLocation?: any }} [opts] */
    _logInfo(msg: string, { sourceLocation }?: {
        sourceLocation?: any;
    }): void;
}
export class PreprocessorReader extends Reader {
    constructor(document: any, data?: any, cursor?: any, opts?: {});
    _sourcemap: any;
    _maxdepth: {
        abs: number;
        curr: number;
        rel: number;
    };
    includeStack: any[];
    _includes: any;
    _skipping: boolean;
    _conditionalStack: any[];
    _includeProcessorExtensions: any;
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
}
