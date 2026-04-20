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
    printReport(out?: Console, subject?: any): void;
    _now(): number;
}
