// ESM conversion of callouts.rb

/** Maintains a catalog of callouts and their associations. */
export class Callouts {
  constructor() {
    /** @internal */
    this._lists = []
    /** @internal */
    this._listIndex = 0
    this.nextList()
  }

  /**
   * Register a new callout for the given list item ordinal.
   * @param {number} liOrdinal - The 1-based ordinal of the list item.
   * @returns {string} The unique id of this callout (e.g. 'CO1-1').
   */
  register(liOrdinal) {
    const id = this._generateNextCalloutId()
    this.getCurrentList().push({ ordinal: parseInt(liOrdinal, 10), id })
    this._coIndex++
    return id
  }

  /**
   * Get the next callout id in document order (used during conversion).
   * @returns {string|null} The unique id of the next callout, or null.
   */
  readNextId() {
    const list = this.getCurrentList()
    const id = this._coIndex <= list.length ? list[this._coIndex - 1].id : null
    this._coIndex++
    return id
  }

  /**
   * Get a space-separated list of callout ids for the given list item.
   * @param {number} liOrdinal - The 1-based ordinal of the list item.
   * @returns {string} Space-separated callout ids.
   */
  getCalloutIds(liOrdinal) {
    const list = this.getCurrentList()
    return list
      .filter((item) => item.ordinal === liOrdinal)
      .map((item) => item.id)
      .join(' ')
  }

  /** @returns {Array<{ordinal: number, id: string}>} The callout objects at the current list index. */
  getCurrentList() {
    return this._lists[this._listIndex - 1]
  }

  /** @returns {Array<Array<{ordinal: number, id: string}>>} All callout lists in the document. */
  getLists() {
    return this._lists
  }

  /** @returns {number} The 1-based index of the current callout list. */
  getListIndex() {
    return this._listIndex
  }

  /** Advance to the next callout list in the document. */
  nextList() {
    this._listIndex++
    if (this._lists.length < this._listIndex) this._lists.push([])
    /** @internal */
    this._coIndex = 1
  }

  /** Rewind the list pointer to the beginning (switching parse → convert). */
  rewind() {
    this._listIndex = 1
    this._coIndex = 1
  }

  /**
   * @internal
   * @private
   */
  _generateNextCalloutId() {
    return `CO${this._listIndex}-${this._coIndex}`
  }
}
