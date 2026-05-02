// ESM conversion of list.rb

import { AbstractBlock } from './abstract_block.js'
import { LF, NORMAL_SUBS } from './constants.js'

/**
 * @extends {AbstractBlock<any[]>}
 */
export class List extends AbstractBlock {
  constructor(parent, context, opts = {}) {
    super(parent, context, opts)
  }

  /** Alias for blocks — the list content. */
  async content() {
    return this.blocks
  }

  /**
   * Alias for {@link getItems}.
   * @returns {ListItem[]}
   * @see {getItems}
   */
  get items() {
    return this.blocks
  }

  /**
   * Check whether this list has items (blocks).
   * @returns {boolean}
   */
  hasItems() {
    return this.blocks.length > 0
  }

  /**
   * Check whether this list is an outline list (unordered or ordered).
   * @returns {boolean}
   */
  outline() {
    return this.context === 'ulist' || this.context === 'olist'
  }

  /**
   * Convert this list, advancing the callout list pointer if a colist.
   * @returns {Promise<string>}
   */
  async convert() {
    const result = await super.convert()
    if (this.context === 'colist') this.document.callouts.nextList()
    return result
  }

  /**
   * @deprecated Use {@link convert} instead.
   */
  render() {
    return this.convert()
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Return the list items.
   * @returns {ListItem[]}
   */
  getItems() {
    return this.blocks
  }

  toString() {
    return `#<List {context: '${this.context}', style: ${JSON.stringify(this.style ?? null)}, items: ${this.blocks.length}}>`
  }
}

/**
 * Methods for managing items for AsciiDoc olists, ulists, and dlists.
 *
 * In a description list (dlist), each item is a tuple: `[[term, term, ...], desc]`.
 * If a description is not set, the second entry is null.
 */
export class ListItem extends AbstractBlock {
  /**
   * The string marker used for this list item.
   * @type {string|null}
   */
  marker

  /** @internal @type {string|null} */
  _text

  /** @internal */
  _convertedText

  /** @internal @type {string[]} */
  _subsSnapshot

  /**
   * @param {List} parent - The parent List block.
   * @param {string|null} [text=null] - The text of this item.
   */
  constructor(parent, text = null) {
    super(parent, 'list_item')
    this._text = text
    this.level = parent.level
    this.subs = [...NORMAL_SUBS]
    this.marker = null
  }

  /**
   * Contextual alias for parent.
   * @see {getParent}
   */
  get list() {
    return this.getParent()
  }

  /**
   * Alias for {@link getText}.
   * @see {getText}
   */
  get text() {
    if (this._convertedText != null && this._subsSnapshot != null) {
      const cur = this.subs
      if (
        cur.length !== this._subsSnapshot.length ||
        cur.some((s, i) => s !== this._subsSnapshot[i])
      ) {
        return this._text ?? null
      }
    }
    return this._convertedText ?? this._text ?? null
  }

  /**
   * Alias for {@link setText}.
   * @see {setText}
   */
  set text(val) {
    this._text = val
    this._convertedText = null
    this._subsSnapshot = null
  }

  /**
   * Check whether the text of this list item is non-blank.
   * @returns {boolean}
   */
  hasText() {
    return !!(this._text && this._text.length > 0)
  }

  /**
   * Pre-compute the converted text asynchronously.
   * Called during `Document.parse()` so the synchronous getter works during conversion.
   * @returns {Promise<void>}
   */
  async precomputeText() {
    if (this._text != null && this._convertedText == null) {
      this._convertedText = await this.applySubs(this._text, this.subs)
      this._subsSnapshot = [...this.subs]
    }
  }

  /**
   * Check whether this list item has simple content.
   * @returns {boolean} `true` if the item has no blocks or only a single nested outline list.
   */
  simple() {
    return (
      this.blocks.length === 0 ||
      (this.blocks.length === 1 &&
        this.blocks[0] instanceof List &&
        this.blocks[0].outline())
    )
  }

  /**
   * Check whether this list item has compound content.
   * @returns {boolean} `true` if the item contains blocks other than a single nested outline list.
   */
  compound() {
    return !this.simple()
  }

  /** @internal Fold the adjacent paragraph block into the list item text. */
  foldFirst() {
    const src = this.blocks.shift().source
    this._text =
      !this._text || this._text.length === 0 ? src : `${this._text}${LF}${src}`
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Return the parent List block (alias of {@link getParent}).
   * @returns {List}
   * @see {getParent}
   */
  getList() {
    return this.list
  }

  /**
   * Return the list marker string for this item (e.g. '.', '..', '*').
   * @returns {string|null}
   */
  getMarker() {
    return this.marker
  }

  /**
   * Return the text of this list item with substitutions applied.
   * The result is pre-computed during `Document.parse()` via {@link precomputeText}.
   * Falls back to the raw text if {@link precomputeText} has not been called yet.
   *
   * In Ruby, text is lazy (`apply_subs` on first access), so API callers can modify
   * subs before accessing text and get the result they expect. Here we replicate
   * that by invalidating the pre-computed value when subs have changed since it
   * was computed: returning raw text mirrors what Ruby would produce when subs are
   * cleared or reduced to a no-op set (since `applySubs` is async and cannot be
   * re-run synchronously).
   * @returns {string|null}
   */
  getText() {
    return this.text
  }

  /**
   * Set the raw text of this list item.
   * @param {string|null} val
   */
  setText(val) {
    this.text = val
  }

  toString() {
    return `#<ListItem {list_context: '${this.getParent().context}', text: ${JSON.stringify(this._text)}, blocks: ${(this.blocks ?? []).length}}>`
  }
}
