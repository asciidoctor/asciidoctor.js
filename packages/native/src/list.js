// ESM conversion of list.rb

import { AbstractBlock } from './abstract_block.js'
import { LF } from './constants.js'

const NORMAL_SUBS = Object.freeze(['specialcharacters', 'quotes', 'attributes', 'replacements', 'macros', 'post_replacements'])

// Public: Methods for managing AsciiDoc lists (ordered, unordered and description lists).
export class List extends AbstractBlock {
  constructor (parent, context, opts = {}) {
    super(parent, context, opts)
  }

  // Public: Alias for blocks — the list items.
  get items () { return this.blocks }

  // Public: Alias for blocks — the list content.
  get content () { return this.blocks }

  // Public: Check whether this list has items (blocks).
  hasItems () { return this.blocks.length > 0 }

  // Public: Check whether this list is an outline list (unordered or ordered).
  //
  // Returns Boolean.
  outline () {
    return this.context === 'ulist' || this.context === 'olist'
  }

  // Public: Convert this list, advancing the callout list pointer if a colist.
  //
  // Returns the String result.
  convert () {
    const result = super.convert()
    if (this.context === 'colist') this.document.callouts.nextList()
    return result
  }

  // Deprecated: Use convert() instead.
  render () { return this.convert() }

  toString () {
    return `#<List {context: '${this.context}', style: ${JSON.stringify(this.style ?? null)}, items: ${this.blocks.length}}>`
  }
}

// Public: Methods for managing items for AsciiDoc olists, ulists, and dlists.
//
// In a description list (dlist), each item is a tuple: [[term, term, ...], desc].
// If a description is not set, the second entry is null.
export class ListItem extends AbstractBlock {
  // Public: Get/Set the String marker used for this list item.
  // marker

  // Public: Initialize an Asciidoctor::ListItem object.
  //
  // parent - The parent List block.
  // text   - The String text of this item (default: null).
  constructor (parent, text = null) {
    super(parent, 'list_item')
    this._text   = text
    this.level   = parent.level
    this._subs   = [...NORMAL_SUBS]
    this.marker  = null
  }

  // Contextual alias for parent.
  get list () { return this.parent }

  // Public: Check whether the text of this list item is non-blank.
  //
  // Returns Boolean.
  hasText () {
    return !!(this._text && this._text.length > 0)
  }

  // Public: Get the String text with substitutions applied.
  //
  // Returns the converted String text, or null.
  get text () {
    return this._text != null ? this.applySubs(this._text, this._subs) : null
  }

  // Public: Set the raw text of this list item.
  set text (val) { this._text = val }

  // Public: Check whether this list item has simple content.
  //
  // Returns true if the item has no blocks or only a single nested outline list.
  simple () {
    return this.blocks.length === 0 ||
      (this.blocks.length === 1 && this.blocks[0] instanceof List && this.blocks[0].outline())
  }

  // Public: Check whether this list item has compound content.
  //
  // Returns true if the item contains blocks other than a single nested outline list.
  compound () {
    return !this.simple()
  }

  // Internal: Fold the adjacent paragraph block into the list item text.
  foldFirst () {
    const src = this.blocks.shift().source
    this._text = (!this._text || this._text.length === 0) ? src : `${this._text}${LF}${src}`
  }

  toString () {
    return `#<ListItem {list_context: '${this.parent.context}', text: ${JSON.stringify(this._text)}, blocks: ${(this.blocks ?? []).length}}>`
  }
}
