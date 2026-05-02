export class AttributeEntry {
  constructor(name, value, negate = null) {
    this.name = name
    this.value = value
    this.negate = negate == null ? value == null : negate
  }

  saveTo(blockAttributes) {
    ;(blockAttributes.attribute_entries ??= []).push(this)
    return this
  }
}
