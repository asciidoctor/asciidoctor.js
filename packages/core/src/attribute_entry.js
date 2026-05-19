// Symbol key used to store attribute entries on a block-attributes object without
// polluting the public attributes (invisible to Object.keys / for-in / JSON.stringify).
// Spread ({ ...attrs }) copies Symbol-keyed properties, so the entry survives the
// shallow clone made in AbstractNode's constructor.
export const ATTR_ENTRIES_KEY = Symbol('attribute_entries')

/**
 * Return the attribute entries stored for the given block attributes object,
 * or undefined if none have been saved.
 * @param {Object} blockAttributes
 * @returns {AttributeEntry[]|undefined}
 */
export function getAttributeEntries(blockAttributes) {
  return blockAttributes[ATTR_ENTRIES_KEY]
}

export class AttributeEntry {
  constructor(name, value, negate = null) {
    this.name = name
    this.value = value
    this.negate = negate == null ? value == null : negate
  }

  saveTo(blockAttributes) {
    ;(blockAttributes[ATTR_ENTRIES_KEY] ??= []).push(this)
    return this
  }
}
