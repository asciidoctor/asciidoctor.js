/**
 * Return the attribute entries stored for the given block attributes object,
 * or undefined if none have been saved.
 * @param {Object} blockAttributes
 * @returns {AttributeEntry[]|undefined}
 */
export function getAttributeEntries(blockAttributes: any): AttributeEntry[] | undefined;
export const ATTR_ENTRIES_KEY: unique symbol;
export class AttributeEntry {
    constructor(name: any, value: any, negate?: any);
    name: any;
    value: any;
    negate: any;
    saveTo(blockAttributes: any): this;
}
