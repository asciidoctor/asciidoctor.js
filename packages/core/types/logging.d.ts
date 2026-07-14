
/**
 * Run fn() within an async-local logger context so that all log calls via
 * `this.logger` (from applyLogging) automatically route to the provided logger
 * for the duration of the async execution chain.
 *
 * Falls back to global mutation in environments without node:async_hooks (e.g. browsers).
 *
 * @param {Logger|MemoryLogger|NullLogger} logger - The logger to activate.
 * @param {() => any} fn - The function to execute within the logger context.
 * @returns {Promise<any>}
 */
export function withLogger(logger: Logger | MemoryLogger | NullLogger, fn: () => any): Promise<any>;
/**
 * Apply the Logging mixin to a class prototype.
 *
 * Installs the following on proto:
 * - `logger` getter — returns `LoggerManager.logger`
 * - `getLogger()` — method alias for the logger getter
 * - `messageWithContext(text, context)` — builds an auto-formatting message object
 * - `createLogMessage(text, context)` — alias for messageWithContext (used in extensions)
 *
 * @param {Object} proto - The prototype object (e.g. MyClass.prototype) to augment.
 */
export function applyLogging(proto: any): void;
export namespace Severity {
    let DEBUG: number;
    let INFO: number;
    let WARN: number;
    let ERROR: number;
    let FATAL: number;
    let UNKNOWN: number;
}
/** Standard logger that writes formatted messages to stderr or a custom pipe. */
export class Logger {
    constructor(opts?: {});
    progname: any;
    level: any;
    set formatter(f: any);
    /** getter/setter so custom logger impls can access this.formatter */
    get formatter(): any;
    /**
     * @returns {number|null} The highest severity level logged so far.
     */
    get maxSeverity(): number | null;
    getLevel(): any;
    setLevel(n: any): void;
    getFormatter(): any;
    setFormatter(f: any): void;
    getProgramName(): any;
    setProgramName(n: any): void;
    getMaxSeverity(): number;
    /**
     * @returns {boolean} Whether DEBUG-level messages will be logged.
     */
    isDebugEnabled(): boolean;
    /**
     * @returns {boolean} Whether INFO-level messages will be logged.
     */
    isInfoEnabled(): boolean;
    /**
     * @returns {boolean} Whether WARN-level messages will be logged.
     */
    isWarnEnabled(): boolean;
    /**
     * @returns {boolean} Whether ERROR-level messages will be logged.
     */
    isErrorEnabled(): boolean;
    /**
     * @returns {boolean} Whether FATAL-level messages will be logged.
     */
    isFatalEnabled(): boolean;
    isDebug(): boolean;
    isInfo(): boolean;
    /**
     * Log a message at the given severity level.
     * @param {number|string} severity - Severity level (numeric constant or string name).
     * @param {string|{inspect?(): string}|null} [message=null] - The message to log.
     * @param {string|Function|null} [progname=null] - Program name or message supplier function.
     * @returns {boolean}
     */
    add(severity: number | string, message?: string | {
        inspect?(): string;
    } | null, progname?: string | Function | null): boolean;
    /** Alias for {@link add} (Ruby Logger API). */
    log(severity: any, message: any, progname: any): boolean;
    debug(msg: any, progname: any): boolean;
    info(msg: any, progname: any): boolean;
    warn(msg: any, progname: any): boolean;
    error(msg: any, progname: any): boolean;
    fatal(msg: any, progname: any): boolean;
    unknown(msg: any, progname: any): boolean;
}
export namespace Logger {
    export { BasicFormatter };
    export namespace AutoFormattingMessage {
        /**
         * Attach auto-formatting to any plain object carrying
         * { text, source_location, include_location }.
         *
         * The location(s) are rendered only by inspect()/toString() (used when a
         * stderr Logger formats the line); the structured `source_location` /
         * `include_location` remain on the object so a MemoryLogger can record them
         * on the resulting LogMessage without duplicating them inside `text`.
         * @param {{text: string, source_location?: any, include_location?: any}} obj
         * @returns {typeof obj} The same object with inspect() and toString() added.
         */
        function attach(obj: {
            text: string;
            source_location?: any;
            include_location?: any;
        }): typeof obj;
    }
}
/** Wrapper stored by MemoryLogger; provides getSeverity/getText/getSourceLocation. */
export class LogMessage {
    /**
     * @param {string} severity - Severity label, e.g. 'ERROR'.
     * @param {string|{text: string, source_location?: import('./reader.js').Cursor}|null} message
     */
    constructor(severity: string, message: string | {
        text: string;
        source_location?: import("./reader.js").Cursor;
    } | null);
    message: string | {
        text: string;
        source_location?: import("./reader.js").Cursor;
    };
    /** @type {string} */
    severity: string;
    /** @type {string} */
    text: string;
    /** @type {import('./reader.js').Cursor|null} */
    sourceLocation: import("./reader.js").Cursor | null;
    /**
     * @returns {string} The severity label, e.g. 'ERROR'.
     */
    getSeverity(): string;
    /**
     * @returns {string} The message text.
     */
    getText(): string;
    /**
     * @returns {import('./reader.js').Cursor|undefined} The source location, if any.
     */
    getSourceLocation(): import("./reader.js").Cursor | undefined;
}
/** In-memory logger that stores all log messages for later inspection. */
export class MemoryLogger {
    static create(): MemoryLogger;
    level: number;
    /** @type {LogMessage[]} */
    messages: LogMessage[];
    /**
     * @returns {LogMessage[]} The log messages recorded so far, in order.
     */
    getMessages(): LogMessage[];
    getMaxSeverity(): number;
    add(severity: any, message?: any, progname?: any): boolean;
    debug(msg: any, pn: any): boolean;
    info(msg: any, pn: any): boolean;
    warn(msg: any, pn: any): boolean;
    error(msg: any, pn: any): boolean;
    fatal(msg: any, pn: any): boolean;
    unknown(msg: any, pn: any): boolean;
    log(severity: any, message: any, progname: any): boolean;
    isDebug(): boolean;
    isInfo(): boolean;
    /**
     * Write a string at INFO level (trailing newline stripped).
     * Allows MemoryLogger to be used with Timings.printReport().
     * @param {string} s
     * @returns {boolean}
     */
    write(s: string): boolean;
    clear(): void;
    empty(): boolean;
}
/** Logger that discards all messages but still tracks the maximum severity. */
export class NullLogger extends Logger {
    static create(): NullLogger;
    constructor();
    level: number;
    add(severity: any): boolean;
    log(severity: any): boolean;
    debug(): boolean;
    info(): boolean;
    warn(): boolean;
    error(): boolean;
    fatal(): boolean;
    unknown(): boolean;
}
export namespace LoggerManager {
    let loggerClass: typeof Logger;
    let logger: any;
    function getLogger(): any;
    function setLogger(newLogger: any): void;
    /**
     * Create a new formatter whose call() delegates to the provided impl.
     * @param {string} _name
     * @param {{call: Function}} impl
     * @returns {{call: Function}}
     */
    function newFormatter(_name: string, impl: {
        call: Function;
    }): {
        call: Function;
    };
    /**
     * Create a new Logger instance with custom behaviour supplied via impl.
     * @param {string} _name
     * @param {{add?: (severity: number, message: any, progname: any) => boolean, postConstruct?: (this: Logger) => void}} impl
     *   - `add(severity, message, progname)` — overrides the default add method; severity is always numeric.
     *   - `postConstruct()` — called once after the instance is created (`this` is the logger instance).
     * @returns {Logger}
     */
    function newLogger(_name: string, impl: {
        add?: (severity: number, message: any, progname: any) => boolean;
        postConstruct?: (this: Logger) => void;
    }): Logger;
}
/**
 * Plain object implementing the Logging mixin interface, for use in non-class contexts
 * (e.g. top-level module functions).
 */
export namespace Logging {
    const logger_1: any;
    export { logger_1 as logger };
    export function getLogger(): any;
    export function messageWithContext(text: any, context?: {}): any;
    export function createLogMessage(text: any, context?: {}): any;
}
declare class BasicFormatter {
    /**
     * Format a log entry as "progname: SEVERITY: message\n".
     * @param {number|string} severity
     * @param {null} _time
     * @param {string} progname
     * @param {string|{inspect?(): string}} msg
     * @returns {string}
     */
    call(severity: number | string, _time: null, progname: string, msg: string | {
        inspect?(): string;
    }): string;
}
export {};
