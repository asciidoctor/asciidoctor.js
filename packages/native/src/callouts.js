// ESM conversion of callouts.rb

// Public: Maintains a catalog of callouts and their associations.
export class Callouts {
  constructor () {
    this._lists = []
    this._listIndex = 0
    this.nextList()
  }

  // Public: Register a new callout for the given list item ordinal.
  //
  // liOrdinal - The 1-based Integer ordinal of the list item.
  //
  // Returns the unique String id of this callout (e.g. 'CO1-1').
  register (liOrdinal) {
    const id = this._generateNextCalloutId()
    this.currentList().push({ ordinal: parseInt(liOrdinal, 10), id })
    this._coIndex++
    return id
  }

  // Public: Get the next callout id in document order (used during conversion).
  //
  // Returns the unique String id of the next callout, or null.
  readNextId () {
    const list = this.currentList()
    const id = this._coIndex <= list.length ? list[this._coIndex - 1].id : null
    this._coIndex++
    return id
  }

  // Public: Get a space-separated list of callout ids for the given list item.
  //
  // liOrdinal - The 1-based Integer ordinal of the list item.
  //
  // Returns a String of space-separated callout ids.
  calloutIds (liOrdinal) {
    const list = this.currentList()
    return list
      .filter(item => item.ordinal === liOrdinal)
      .map(item => item.id)
      .join(' ')
  }

  // Public: The current list being collected.
  //
  // Returns the Array of callout objects at the current list index.
  currentList () {
    return this._lists[this._listIndex - 1]
  }

  // Public: Advance to the next callout list in the document.
  nextList () {
    this._listIndex++
    if (this._lists.length < this._listIndex) this._lists.push([])
    this._coIndex = 1
  }

  // Public: Rewind the list pointer to the beginning (switching parse → convert).
  rewind () {
    this._listIndex = 1
    this._coIndex = 1
  }

  _generateNextCalloutId () {
    return `CO${this._listIndex}-${this._coIndex}`
  }
}