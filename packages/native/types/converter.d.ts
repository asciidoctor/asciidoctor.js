/**
 * Apply the BackendTraits mixin to a converter instance to give it
 * basebackend/filetype/htmlsyntax/outfilesuffix helpers.
 *
 * @param {object} instance - the converter instance to augment
 */
export function applyBackendTraits(instance: object): void;
/**
 * Derive the backend traits object from a backend name.
 *
 * @param {string} backend - the backend name (e.g. 'html5', 'docbook5')
 * @param {string|null} [basebackend=null] - optional explicit base backend
 * @returns {{ basebackend: string, filetype: string, outfilesuffix: string, htmlsyntax?: string }}
 */
export function deriveBackendTraits(backend: string, basebackend?: string | null): {
    basebackend: string;
    filetype: string;
    outfilesuffix: string;
    htmlsyntax?: string;
};
/**
 * Bridge a user-registered converter instance into the interface expected by
 * Document._updateBackendAttributes, which requires _getBackendTraits().
 *
 * Supports three conventions used by user converters:
 *   1. `converter.backendTraits = { basebackend, outfilesuffix, filetype, htmlsyntax }`
 *   2. Plain properties: `converter.basebackend`, `converter.outfilesuffix`, …
 *   3. Already has `_getBackendTraits()` (e.g. extends ConverterBase) — returned as-is.
 *
 * @param {object} converter - the converter to normalise
 * @param {string} backend - the backend name
 * @returns {object} the normalised converter
 */
export function normalizeConverter(converter: object, backend: string): object;
/**
 * A factory that maps backend names to converter classes or instances.
 * Use the global {@link Converter} instance (DefaultFactory) for typical use.
 */
export class CustomFactory {
    constructor(seedRegistry?: any);
    _registry: {};
    _catchAll: any;
    /**
     * Register a converter class for one or more backend names.
     * Backends may be passed as individual strings or as a single Array.
     *
     * @param {Function|object} converter - the converter class or instance
     * @param {...string} backends - backend names; use `'*'` as a catch-all
     */
    register(converter: Function | object, ...backends: string[]): void;
    /**
     * Retrieve the converter class registered for the given backend.
     * Returns `undefined` (not null) when no match is found, mirroring the core API.
     *
     * @param {string} backend - the backend name
     * @returns {Function|object|undefined}
     */
    for(backend: string): Function | object | undefined;
    /**
     * Create a new converter instance for the given backend (synchronous).
     * Requires the converter class to already be registered; does not support template dirs.
     *
     * @param {string} backend - the backend name
     * @param {object} [opts={}] - options passed to the converter constructor
     * @returns {object|null} the converter instance, or null if not registered
     */
    createSync(backend: string, opts?: object): object | null;
    /**
     * Create a new converter instance for the given backend.
     *
     * @param {string} backend - the backend name
     * @param {object} [opts={}] - options passed to the converter constructor
     * @returns {Promise<object|null>} the converter instance, or null if not registered
     */
    create(backend: string, opts?: object): Promise<object | null>;
    /**
     * Get the registered converters map.
     *
     * @returns {object} a shallow copy of the registry
     */
    converters(): object;
    /**
     * Unregister all converters.
     */
    unregisterAll(): void;
}
export const Converter: DefaultFactory;
/**
 * Base class for all Asciidoctor converters.
 *
 * Subclass ConverterBase and implement `convert_<nodeName>` methods to handle
 * specific node types. Register the subclass with the global registry via
 * {@link ConverterBase.registerFor}.
 */
export class ConverterBase {
    /**
     * Register this converter class with the global registry.
     *
     * @param {...string} backends - backend names to register for
     */
    static registerFor(...backends: string[]): void;
    constructor(backend: any, opts?: {});
    backend: any;
    /**
     * Convert a node by dispatching to a `convert_<transform>` method.
     *
     * @param {object} node - the AbstractNode to convert
     * @param {string|null} [transform=null] - hint for which method to call (default: node.nodeName)
     * @param {object|null} [opts=null] - optional hints
     * @returns {Promise<string|null>} the converted string or null
     */
    convert(node: object, transform?: string | null, opts?: object | null): Promise<string | null>;
    /**
     * Report whether this converter can handle the given transform.
     *
     * @param {string} transform - the transform name
     * @returns {boolean}
     */
    handles(transform: string): boolean;
    /**
     * Convert using only content (no wrapping).
     *
     * @param {object} node - the node whose content to return
     * @returns {Promise<string>}
     */
    contentOnly(node: object): Promise<string>;
    /** Skip conversion (no-op). */
    skip(_node: any): void;
}
declare class DefaultFactory extends CustomFactory {
    constructor();
    _defaultRegistry: {};
    register(converter: any, ...backends: any[]): void;
    for(backend: any): any;
    /**
     * Return the combined registry (built-in + user-registered entries).
     *
     * @returns {object}
     */
    getRegistry(): object;
    /**
     * Return this factory (mirrors the core ConverterFactory.getDefault() API).
     *
     * @returns {DefaultFactory}
     */
    getDefault(): DefaultFactory;
    createSync(backend: any, opts?: {}): any;
    create(backend: any, opts?: {}): Promise<any>;
}
export {};
