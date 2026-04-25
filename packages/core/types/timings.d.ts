export class Timings {
    static create(): Timings;
    _log: {};
    _timers: {};
    start(key: any): void;
    record(key: any): void;
    time(...keys: any[]): any;
    read(): any;
    parse(): any;
    readParse(): any;
    convert(): any;
    readParseConvert(): any;
    write(): any;
    total(): any;
    /**
     * Print a summary report.
     * @param {{ write?: (s: string) => void, log?: (s: string) => void }} [out=console] - Output sink.
     * @param {string|null} [subject=null] - Optional label for the input file.
     */
    printReport(out?: {
        write?: (s: string) => void;
        log?: (s: string) => void;
    }, subject?: string | null): void;
    _now(): any;
}
