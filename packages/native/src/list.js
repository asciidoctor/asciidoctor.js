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
  async content () { return this.blocks }

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
  async convert () {
    const result = await super.convert()
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
    this.subs    = [...NORMAL_SUBS]
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
  // The result is pre-computed during Document.parse() via precomputeText().
  // Falls back to the raw text if precomputeText() has not been called yet.
  //
  // In Ruby, text is lazy (apply_subs on first access), so API callers can modify
  // subs before accessing text and get the result they expect.  Here we replicate
  // that by invalidating the pre-computed value when subs have changed since it
  // was computed: returning raw text mirrors what Ruby would produce when subs are
  // cleared or reduced to a no-op set (since applySubs is async and cannot be
  // re-run synchronously).
  //
  // Returns the converted String text, or null.
  get text () {
    if (this._convertedText != null && this._subsSnapshot != null) {
      const cur = this.subs
      if (cur.length !== this._subsSnapshot.length || cur.some((s, i) => s !== this._subsSnapshot[i])) {
        return this._text ?? null
      }
    }
    return this._convertedText ?? this._text ?? null
  }

  // Public: Pre-compute the converted text asynchronously.
  // Called during Document.parse() so the synchronous getter works during conversion.
  async precomputeText () {
    if (this._text != null && this._convertedText == null) {
      this._convertedText = await this.applySubs(this._text, this.subs)
      this._subsSnapshot = [...this.subs]
    }
  }

  // Public: Set the raw text of this list item.
  set text (val) { this._text = val; this._convertedText = null; this._subsSnapshot = null }

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
