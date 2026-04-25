/**
 * Handles parsing AsciiDoc attribute lists into a plain object of key/value pairs.
 * By default, attributes must each be separated by a comma and quotes may be used
 * around the value. If a key is not detected, the value is assigned to a 1-based
 * positional key. Positional attributes can be "rekeyed" when given a positionalAttrs
 * array either during parsing or after.
 *
 * @example
 * const attrlist = new AttributeList('astyle')
 * await attrlist.parse()
 * // => { 1: 'astyle' }
 *
 * attrlist.rekey(['style'])
 * // => { 1: 'astyle', style: 'astyle' }
 *
 * @example
 * const attrlist2 = new AttributeList('quote, Famous Person, Famous Book (2001)')
 * await attrlist2.parse(['style', 'attribution', 'citetitle'])
 * // => { 1: 'quote', style: 'quote', 2: 'Famous Person', attribution: 'Famous Person',
 * //      3: 'Famous Book (2001)', citetitle: 'Famous Book (2001)' }
 */
export class AttributeList {
    /**
     * Assign string keys to the positional (numeric-keyed) values of the given attributes object.
     * @param {Object} attributes - A plain object produced by parse().
     * @param {Array<string|null>} positionalAttrs - Keys to assign (null entries are skipped).
     * @returns {Object} The updated attributes object.
     */
    static rekey(attributes: any, positionalAttrs: Array<string | null>): any;
    constructor(source: any, block?: any, delimiter?: string);
    /**
     * Parse the attribute list and merge the result into the given object.
     * @param {Object} attributes - The target plain object to update.
     * @param {string[]} [positionalAttrs=[]] - An array of keys to assign to positional values.
     * @returns {Promise<Object>} The updated attributes object.
     */
    parseInto(attributes: any, positionalAttrs?: string[]): Promise<any>;
    /**
     * Parse the attribute list and return a plain object of key/value pairs.
     * Subsequent calls return the already-parsed result without re-parsing.
     * @param {string[]} [positionalAttrs=[]] - An array of keys to assign to positional values.
     * @returns {Promise<Object>} A plain object of parsed attributes.
     */
    parse(positionalAttrs?: string[]): Promise<any>;
    /**
     * Rekey the parsed positional attributes using the given key names.
     * @param {string[]} positionalAttrs - An array of keys to assign to positional values.
     * @returns {Object} The updated attributes object.
     */
    rekey(positionalAttrs: string[]): any;
    #private;
}
