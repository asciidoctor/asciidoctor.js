export function applyLogging(proto: any): void;
export namespace Severity {
    let DEBUG: number;
    let INFO: number;
    let WARN: number;
    let ERROR: number;
    let FATAL: number;
    let UNKNOWN: number;
}
export class Logger {
    constructor(opts?: {});
    progname: any;
    level: any;
    _maxSeverity: any;
    _formatter: any;
    _pipe: any;
    set formatter(f: any);
    get formatter(): any;
    get maxSeverity(): any;
    getLevel(): any;
    setLevel(n: any): void;
    getFormatter(): any;
    setFormatter(f: any): void;
    getProgramName(): any;
    setProgramName(n: any): void;
    getMaxSeverity(): any;
    isDebugEnabled(): boolean;
    isInfoEnabled(): boolean;
    isWarnEnabled(): boolean;
    isErrorEnabled(): boolean;
    isFatalEnabled(): boolean;
    isDebug(): boolean;
    isInfo(): boolean;
    add(severity: any, message?: any, progname?: any): boolean;
    log(severity: any, message: any, progname: any): boolean;
    debug(msg: any, progname: any): boolean;
    info(msg: any, progname: any): boolean;
    warn(msg: any, progname: any): boolean;
    error(msg: any, progname: any): boolean;
    fatal(msg: any, progname: any): boolean;
    unknown(msg: any, progname: any): boolean;
    _writeln(line: any): void;
}
export namespace Logger {
    export { BasicFormatter };
    export namespace AutoFormattingMessage {
        function attach(obj: any): any;
    }
}
export class MemoryLogger {
    static create(): MemoryLogger;
    level: number;
    messages: any[];
    getMessages(): any[];
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
    write(s: any): boolean;
    clear(): void;
    empty(): boolean;
}
export class NullLogger {
    static create(): NullLogger;
    level: number;
    _maxSeverity: any;
    get maxSeverity(): any;
    getMaxSeverity(): any;
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
    function newFormatter(_name: any, impl: any): {
        call: any;
    };
    function newLogger(_name: any, impl: any): Logger;
}
export namespace Logging {
    const logger_1: any;
    export { logger_1 as logger };
    export function getLogger(): any;
    export function messageWithContext(text: any, context?: {}): any;
    export function createLogMessage(text: any, context?: {}): any;
}
declare class BasicFormatter {
    call(severity: any, _time: any, progname: any, msg: any): string;
}
export {};
