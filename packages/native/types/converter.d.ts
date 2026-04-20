export function applyBackendTraits(instance: any): void;
export function deriveBackendTraits(backend: any, basebackend?: any): {};
export function normalizeConverter(converter: any, backend: any): any;
export class CustomFactory {
    constructor(seedRegistry?: any);
    _registry: {};
    _catchAll: any;
    register(converter: any, ...backends: any[]): void;
    for(backend: any): any;
    createSync(backend: any, opts?: {}): any;
    create(backend: any, opts?: {}): Promise<any>;
    converters(): {};
    unregisterAll(): void;
}
export const Converter: DefaultFactory;
export class ConverterBase {
    static registerFor(...backends: any[]): void;
    constructor(backend: any, opts?: {});
    backend: any;
    convert(node: any, transform?: any, opts?: any): Promise<any>;
    handles(transform: any): boolean;
    contentOnly(node: any): Promise<any>;
    skip(_node: any): void;
}
declare class DefaultFactory extends CustomFactory {
    constructor();
    _defaultRegistry: {};
    getRegistry(): {};
    getDefault(): this;
}
export {};
