export class Footnote {
  constructor(index, id, text) {
    this.index = index
    this.id = id ?? null
    this.text = text
  }

  /**
   * @returns {number} the index of this footnote.
   */
  getIndex() {
    return this.index
  }

  /**
   * @returns {string|null} the id of this footnote, or null if not set.
   */
  getId() {
    return this.id
  }

  /**
   * @returns {string} the text of this footnote.
   */
  getText() {
    return this.text
  }
}
