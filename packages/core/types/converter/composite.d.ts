export class CompositeConverter {
    constructor(backend: any, ...args: any[]);
    backend: any;
    converters: any[];
    _converterCache: Map<any, any>;
    /**
     * Delegates to the first converter that handles the given transform.
     * @param {object} node - the AbstractNode to convert
     * @param {string|null} [transform=null] - the optional transform (default: node.nodeName)
     * @param {object|null} [opts=null] - optional hints passed to the delegate's convert method
     * @returns {Promise<string>} the result from the delegate's convert method
     */
    convert(node: object, transform?: string | null, opts?: object | null): Promise<string>;
    /**
     * Retrieve the converter for the specified transform (cached).
     * @param {string} transform
     * @returns {object} the matching converter
     */
    converterFor(transform: string): object;
}
