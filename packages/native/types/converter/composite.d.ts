export class CompositeConverter {
    constructor(backend: any, ...args: any[]);
    backend: any;
    converters: any[];
    _converterCache: Map<any, any>;
    convert(node: any, transform?: any, opts?: any): any;
    converterFor(transform: any): any;
    _findConverter(transform: any): any;
}
