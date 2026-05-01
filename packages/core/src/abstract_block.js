/** @import { Cursor } from './reader.js' */

// ESM conversion of abstract_block.rb
//
// Ruby-to-JavaScript notes:
//   - AbstractBlock extends AbstractNode (class inheritance, not mixin).
//   - Ruby symbols (:compound, :section, …) are represented as plain strings.
//   - attr_reader / attr_writer / attr_accessor are plain instance properties.
//   - title has a getter/setter pair because the getter memoises the result of
//     applying substitutions; the setter clears that cache.
//   - caption has a getter/setter pair because the getter has special logic for
//     admonition blocks (returns 'textlabel' attribute instead).
//   - The context= setter in Ruby (def context= context) is exposed as setContext()
//     rather than a JS set accessor, to avoid getter/setter shadowing issues with
//     AbstractNode's plain this.context property.
//   - Ruby's number / number= (deprecated section numeral accessors) become
//     get number() / set number() JS accessors.
//   - The find_by Ruby block argument becomes a filter function (null if omitted).
//   - Ruby's StopIteration mechanism is replicated with a private StopIteration
//     class thrown and caught only within findBy / #findByInternal.
//   - find_by_internal is protected in Ruby; in JS it is a private method (#).
//     Because JS private methods are accessible across instances of the same class
//     from within the class body, recursive calls on child blocks still work.
//   - Ruby's Array#flatten (used for dlist blocks) → Array#flat().
//   - nil_or_empty? → falsy check (!val) since both null and '' are falsy in JS.
//   - String#chomp(sep) → str.endsWith(sep) ? str.slice(0, -sep.length) : str.
//   - Substitutors methods referenced: applyTitleSubs, subSpecialchars,
//     subReplacements, subQuotes, subPlaceholder (mixed in externally).
//   - document.incrementAndStoreCounter / document.counter translate
//     Ruby's increment_and_store_counter / counter.

import { AbstractNode } from './abstract_node.js'
import {
  LF,
  CAPTION_ATTRIBUTE_NAMES,
  ORDERED_LIST_KEYWORDS,
  ReplaceableTextRx,
} from './constants.js'
import { intToRoman } from './helpers.js'

/** Used as a sentinel to abort findBy traversal early (mirrors Ruby StopIteration). */
class StopIteration extends Error {}

/**
 * @template {string | any[]} [TContent=string]
 * @abstract
 */
export class AbstractBlock extends AbstractNode {
  /** @type {string|null} */
  #title = null
  /** @type {string|null} */
  #convertedTitle = null
  /** @type {string|null} */
  #caption = null
  /** @type {string[]} */
  subs
  /** @type {string[]|null} */
  defaultSubs
  /** @type {string|number|null} */
  numeral
  /** @type {Cursor|null} */
  sourceLocation
  /** @internal */
  _nextSectionIndex
  /** @internal */
  _nextSectionOrdinal

  /**
   * @param {AbstractBlock} parent
   * @param {string} context
   * @param {object} [opts={}]
   */
  constructor(parent, context, opts = {}) {
    super(parent, context, opts)
    /**
     * Describes the type of content this block accepts and how it should be converted. Acceptable values are:
     *  - `compound` - this block contains other blocks
     *  - `simple` - this block holds a paragraph of prose that receives normal substitutions
     *  - `verbatim` - this block holds verbatim text (displayed "as is") that receives verbatim substitutions
     *  - `raw` - this block holds unprocessed content passed directly to the output with no substitutions applied
     *  - `empty` - this block has no content
     * @type {string}
     */
    this.contentModel = 'compound'
    /**
     * Array of {@link AbstractBlock} child blocks for this block. Only applies if content model is `compound`.
     * @type {AbstractBlock[]}
     */
    this.blocks = []
    this.subs = []
    this.#title = null
    this.#caption = null
    this.numeral = null
    this.style = null
    this.defaultSubs = null
    this.sourceLocation = null
    if (context === 'document' || context === 'section') {
      this.level = 0
      this._nextSectionIndex = 0
      this._nextSectionOrdinal = 1
    } else if (parent instanceof AbstractBlock) {
      this.level = parent.level
    } else {
      this.level = null
    }
  }

  isBlock() {
    return true
  }
  isInline() {
    return false
  }

  /**
   * Get the String title of this block with title substitutions applied.
   * The result is pre-computed during Document.parse() via precomputeTitle().
   * Falls back to applyHeaderSubs (sync) if precomputeTitle() has not been called yet
   * (e.g. when a title is set via the API after parsing).
   * @returns {string|null} the converted String title, or null if the source title is falsy.
   */
  get title() {
    if (this.#convertedTitle != null) return this.#convertedTitle
    if (this.#title == null) return null
    // Pre-computation hasn't run (title set after parse, or parse not yet done).
    // Apply the synchronous header subs (specialcharacters + attributes) as a best-effort.
    return this.applyHeaderSubs(this.#title)
  }

  /**
   * Pre-compute the converted title asynchronously.
   * Called during Document.parse() so the synchronous getter works during conversion.
   * Re-entrant calls (circular title references) are detected via _computingTitle and
   * silently skipped so that {@link Section.xreftext()} can return null (→ "[refid]" fallback).
   * @returns {Promise<void>}
   */
  async precomputeTitle() {
    if (this.#title && this.#convertedTitle == null && !this._computingTitle) {
      this._computingTitle = true
      try {
        this.#convertedTitle = await this.applyTitleSubs(this.#title)
      } finally {
        this._computingTitle = false
      }
    }
  }

  /**
   * @internal Get the raw (unsubstituted) title as set by the parser.
   * @returns {string|null}
   */
  get rawTitle() {
    return this.#title
  }

  /**
   * @internal Get the title with only attribute substitutions applied (no specialchars).
   * @note no longer used for section ID generation (parser now calls applyTitleSubs to match
   * Ruby's behaviour). Kept for other callers that need a lightweight sync substitution.
   * @returns {string|null}
   */
  get attrSubstitutedTitle() {
    const raw = this.#title
    if (raw == null) return null
    return raw.includes('{') ? this.subAttributes(raw) : raw
  }

  /**
   * Set the String block title (clears the memoised converted title).
   * @param {string|null} val
   */
  set title(val) {
    this.#convertedTitle = null
    this.#title = val
  }

  /**
   * Check whether the title of this block is defined.
   * @returns {boolean}
   */
  hasTitle() {
    return !!this.#title
  }

  /**
   * Get the caption for this block.
   * For admonition blocks, returns the 'textlabel' attribute instead.
   * @returns {string|null}
   */
  get caption() {
    return this.context === 'admonition'
      ? this.attributes.textlabel
      : this.#caption
  }

  /**
   * Set the caption for this block.
   * @param {string|null} val
   */
  set caption(val) {
    this.#caption = val
  }

  /**
   * Get the source file where this block started.
   * @returns {string|null}
   */
  get file() {
    return this.sourceLocation?.file
  }

  /**
   * Get the source line number where this block started.
   * @returns {number|null}
   */
  get lineno() {
    return this.sourceLocation?.lineno
  }

  /**
   * Update the context of this block, also updating the node name.
   * @param {string} context - The String context to assign to this block.
   */
  setContext(context) {
    this.context = context
    this.nodeName = String(context)
  }

  /**
   * @deprecated Get/set the numeral of this section as an integer when possible.
   * @returns {number|string}
   */
  get number() {
    const n = parseInt(this.numeral, 10)
    return String(n) === String(this.numeral) ? n : this.numeral
  }

  /**
   * @deprecated
   * @param {number|string} val
   */
  set number(val) {
    this.numeral = String(val)
  }

  /**
   * Convert this block and return the converted String content.
   * @returns {Promise<string>} the result of the converter.
   */
  async convert() {
    this.document.playbackAttributes(this.attributes)
    return this.converter.convert(this)
  }

  /** @deprecated Use convert() instead. */
  render() {
    return this.convert()
  }

  /**
   * Get the converted result of all child blocks joined with a newline.
   * @returns {Promise<TContent>}
   */
  async content() {
    const results = []
    for (const b of this.blocks) results.push(await b.convert())
    return results.join(LF)
  }

  /**
   * Alias for the content method — mirrors the core API.
   * @returns {Promise<TContent>}
   */
  getContent() {
    return this.content()
  }

  /**
   * Append a content block to this block's list of blocks.
   * @param {AbstractBlock} block - The new child block.
   * @returns {AbstractBlock} this block (enables chaining).
   */
  append(block) {
    if (block.getParent() !== this) block.parent = this
    this.blocks.push(block)
    return this
  }

  /**
   * Determine whether this block contains block content.
   * @returns {boolean}
   */
  hasBlocks() {
    return this.blocks.length > 0
  }

  /**
   * Check whether this block has any child Section objects.
   * Overridden by Document and Section.
   * @returns {boolean}
   */
  hasSections() {
    return false
  }

  /**
   * Get the child Section objects of this block.
   * Only applies to Document and Section instances.
   * @returns {AbstractBlock[]} array of Section objects (may be empty).
   */
  sections() {
    return this.blocks.filter((b) => b.context === 'section')
  }

  /**
   * Get the converted alt text for this block image.
   * @returns {string} string with XML special character and replacement substitutions applied.
   */
  alt() {
    const text = this.attributes.alt
    if (text) {
      if (text === this.attributes['default-alt'])
        return this.subSpecialchars(text)
      const escaped = this.subSpecialchars(text)
      return ReplaceableTextRx.test(escaped)
        ? this.subReplacements(escaped)
        : escaped
    }
    return ''
  }

  /**
   * Get the converted alt text for this block image (alias of alt).
   * @returns {string}
   */
  getAlt() {
    return this.alt()
  }

  /**
   * Get the converted title prefixed with the caption.
   * @returns {string} the captioned title.
   */
  captionedTitle() {
    return `${this.caption || ''}${this.title || ''}`
  }

  /**
   * Get the list marker keyword for the specified list type.
   * @param {string|null} [listType=null] - The String list type (default: this.style).
   * @returns {string|undefined} the single-character String keyword for the list marker.
   */
  listMarkerKeyword(listType = null) {
    return ORDERED_LIST_KEYWORDS[listType || this.style]
  }

  /**
   * Check whether the specified substitution is enabled for this block.
   * @param {string} name - The String substitution name.
   * @returns {boolean}
   */
  hasSub(name) {
    return this.subs.includes(name)
  }

  /**
   * Remove a substitution from this block.
   * @param {string} name - The String substitution name to remove.
   */
  removeSub(name) {
    const idx = this.subs.indexOf(name)
    if (idx >= 0) this.subs.splice(idx, 1)
  }

  /**
   * Alias for {@link getXrefText}.
   * @param {string|null} [xrefstyle=null] - Optional String style: 'full', 'short', or 'basic'.
   * @returns {Promise<string|null>} the xreftext, or null.
   * @see {getXrefText}
   */
  async xreftext(xrefstyle = null) {
    const val = this.reftext
    if (val && val.length > 0) return val
    if (xrefstyle && this.#title && this.#caption) {
      if (xrefstyle === 'full') {
        const quoteTemplate = this.document.compatMode ? "``%s''" : '"`%s`"'
        const quotedTitle = this.subPlaceholder(
          await this.subQuotes(quoteTemplate),
          this.title
        )
        if (this.numeral) {
          const captionAttrName = CAPTION_ATTRIBUTE_NAMES[this.context]
          if (captionAttrName) {
            const prefix = this.document.attributes[captionAttrName]
            if (prefix) return `${prefix} ${this.numeral}, ${quotedTitle}`
          }
        }
        const cap = this.#caption
        return `${cap.endsWith('. ') ? cap.slice(0, -2) : cap}, ${quotedTitle}`
      } else if (xrefstyle === 'short') {
        if (this.numeral) {
          const captionAttrName = CAPTION_ATTRIBUTE_NAMES[this.context]
          if (captionAttrName) {
            const prefix = this.document.attributes[captionAttrName]
            if (prefix) return `${prefix} ${this.numeral}`
          }
        }
        const cap = this.#caption
        return cap.endsWith('. ') ? cap.slice(0, -2) : cap
      }
    }
    return this.title
  }

  /**
   * Generate and assign a caption to this block if not already assigned.
   * If the block has a title and a caption prefix is available, builds a caption
   * from the prefix and a counter, then stores it.
   * @param {string|null} [value=null] - The String caption to assign, or null to derive from document attributes.
   * @param {string} [captionContext=this.context] - The String context used to look up caption attributes.
   */
  assignCaption(value = null, captionContext = this.context) {
    // In Ruby, empty string is truthy; use != null to replicate that semantics.
    if (this.#caption != null || !this.#title) return
    const globalCaption = this.document.attributes.caption
    // Explicit value (even '') or a global :caption: attribute (even empty) takes precedence and
    // suppresses auto-numbering, matching Ruby's behaviour where any truthy assignment wins.
    if (value != null || globalCaption != null) {
      this.#caption = value != null ? value : globalCaption
    } else {
      const attrName = CAPTION_ATTRIBUTE_NAMES[captionContext]
      if (attrName) {
        const prefix = this.document.attributes[attrName]
        if (prefix) {
          this.numeral = this.document.incrementAndStoreCounter(
            `${captionContext}-number`,
            this
          )
          this.#caption = `${prefix} ${this.numeral}. `
        }
      }
    }
  }

  /**
   * @internal Assign the next index (0-based) and numeral (1-based) to the section.
   * @param {AbstractBlock} section - The Section to which to assign the next index and numeral.
   */
  assignNumeral(section) {
    section.index = this._nextSectionIndex
    this._nextSectionIndex = section.index + 1
    const like = section.numbered
    if (like) {
      const sectname = section.sectname
      if (sectname === 'appendix') {
        section.numeral = this.document.counter('appendix-number', 'A')
        const captionAttr = this.document.attributes['appendix-caption']
        section.caption = captionAttr
          ? `${captionAttr} ${section.numeral}: `
          : `${section.numeral}. `
      } else if (sectname === 'chapter' || like === 'chapter') {
        section.numeral = String(this.document.counter('chapter-number', 1))
      } else {
        section.numeral =
          sectname === 'part'
            ? intToRoman(this._nextSectionOrdinal)
            : String(this._nextSectionOrdinal)
        this._nextSectionOrdinal++
      }
    }
  }

  /**
   * @internal Reassign 0-based section indexes for all descendant sections.
   * Must be called after removing child sections to keep internal counters correct.
   */
  reindexSections() {
    this._nextSectionIndex = 0
    this._nextSectionOrdinal = 1
    for (const block of this.blocks) {
      if (block.context === 'section') {
        this.assignNumeral(block)
        block.reindexSections()
      }
    }
  }

  /**
   * Walk the document tree and find all block-level nodes that match
   * the selector and optional filter function.
   * @param {Object} [selector={}] - A plain object with optional keys: context, style, role, id, traverseDocuments.
   * @param {Function|null} [filter=null] - An optional Function called with each candidate node.
   *   Return values: true/truthy → accept node; 'prune' → accept, skip children;
   *   'reject' → skip node and children; 'stop' → stop traversal.
   * @returns {AbstractBlock[]} array of matching block-level nodes.
   */
  findBy(selector = {}, filter = null) {
    const result = []
    // Normalise: if selector is not a plain object, treat it as an empty selector.
    const normSelector =
      selector && typeof selector === 'object' && !Array.isArray(selector)
        ? selector
        : {}
    // Normalise: filter must be a function; ignore string/non-function values (mirrors core API).
    const normFilter = typeof filter === 'function' ? filter : null
    try {
      this.#findByInternal(normSelector, result, normFilter)
    } catch (e) {
      if (!(e instanceof StopIteration)) throw e
    }
    return result
  }

  /** Alias for findBy (matches Ruby's `alias query find_by`). */
  query(selector = {}, filter = null) {
    return this.findBy(selector, filter)
  }

  /**
   * Move to the next adjacent block in document order.
   * If the current block is the last item in a list, returns the following
   * sibling of the list block.
   * @returns {AbstractBlock|null} the next AbstractBlock, or null.
   */
  nextAdjacentBlock() {
    if (this.context === 'document') return null
    const p = this.getParent()
    if (p.context === 'dlist' && this.context === 'list_item') {
      const idx = p
        .getItems()
        .findIndex(([terms, desc]) => terms.includes(this) || desc === this)
      const sib = p.getItems()[idx + 1]
      return sib ? sib : p.nextAdjacentBlock()
    }
    const idx = p.blocks.indexOf(this)
    const sib = p.blocks[idx + 1]
    return sib ? sib : p.nextAdjacentBlock()
  }

  /** @private Core traversal logic for findBy. Throws StopIteration for early exit. */
  #findByInternal(selector, result, filter) {
    const contextSelector = selector.context ?? null
    const anyContext = !contextSelector
    const styleSelector = selector.style ?? null
    const roleSelector = selector.role ?? null
    const idSelector = selector.id ?? null

    if (
      (anyContext || contextSelector === this.context) &&
      (!styleSelector || styleSelector === this.style) &&
      (!roleSelector || this.hasRole(roleSelector)) &&
      (!idSelector || idSelector === this.id)
    ) {
      if (filter) {
        const verdict = filter(this)
        if (verdict) {
          if (verdict === 'prune') {
            result.push(this)
            if (idSelector) throw new StopIteration()
            return result
          } else if (verdict === 'reject') {
            if (idSelector) throw new StopIteration()
            return result
          } else if (verdict === 'stop') {
            throw new StopIteration()
          } else {
            result.push(this)
            if (idSelector) throw new StopIteration()
          }
        } else if (idSelector) {
          throw new StopIteration()
        }
      } else {
        result.push(this)
        if (idSelector) throw new StopIteration()
      }
    }

    if (this.context === 'document') {
      if (contextSelector !== 'document') {
        // Process document header as a section if present
        if (
          this.hasHeader?.() &&
          (anyContext || contextSelector === 'section')
        ) {
          this.header.#findByInternal(selector, result, filter)
        }
        for (const b of this.blocks) {
          if (contextSelector === 'section' && b.context !== 'section') continue // optimisation
          b.#findByInternal(selector, result, filter)
        }
      }
    } else if (this.context === 'dlist') {
      if (anyContext || contextSelector !== 'section') {
        // optimisation
        // NOTE dlist items can be null
        for (const b of this.blocks.flat()) {
          if (b) b.#findByInternal(selector, result, filter)
        }
      }
    } else if (this.context === 'table') {
      if (selector.traverseDocuments) {
        for (const r of this.rows.head)
          for (const c of r) c.#findByInternal(selector, result, filter)
        const innerSelector =
          contextSelector === 'inner_document'
            ? { ...selector, context: 'document' }
            : selector
        for (const r of [...this.rows.body, ...this.rows.foot]) {
          for (const c of r) {
            c.#findByInternal(innerSelector, result, filter)
            if (c.style === 'asciidoc')
              c.innerDocument.#findByInternal(innerSelector, result, filter)
          }
        }
      } else {
        for (const r of [
          ...this.rows.head,
          ...this.rows.body,
          ...this.rows.foot,
        ]) {
          for (const c of r) c.#findByInternal(selector, result, filter)
        }
      }
    } else {
      for (const b of this.blocks) {
        if (contextSelector === 'section' && b.context !== 'section') continue // optimisation
        b.#findByInternal(selector, result, filter)
      }
    }

    return result
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Get the context (node type) of this block.
   * @returns {string}
   */
  getContext() {
    return this.context
  }

  /**
   * Get the content model of this block.
   * @returns {string}
   */
  getContentModel() {
    return this.contentModel
  }

  /**
   * Set the content model of this block.
   * @param {string} val
   */
  setContentModel(val) {
    this.contentModel = val
  }

  /**
   * Get the node name of this block.
   * @returns {string}
   */
  getNodeName() {
    return this.nodeName
  }

  /**
   * Get the child blocks of this block.
   * @returns {AbstractBlock[]}
   */
  getBlocks() {
    return this.blocks
  }

  /**
   * Get the child Section blocks of this block.
   * @returns {AbstractBlock[]}
   */
  getSections() {
    return this.sections()
  }

  /**
   * Get the title of this block with substitutions applied.
   * @returns {string|null}
   */
  getTitle() {
    return this.title
  }

  /**
   * Set the raw title of this block.
   * @param {string|null} val
   */
  setTitle(val) {
    this.title = val ?? null
  }

  /**
   * Get the caption of this block.
   * @returns {string|undefined}
   */
  getCaption() {
    return this.caption ?? undefined
  }

  /**
   * Set the caption of this block.
   * @param {string|null} val
   */
  setCaption(val) {
    this.caption = val
  }

  /**
   * Get the captioned title of this block.
   * @returns {string}
   */
  getCaptionedTitle() {
    return this.captionedTitle()
  }

  /**
   * Get the style of this block.
   * @returns {string|null}
   */
  getStyle() {
    return this.style
  }

  /**
   * Set the style of this block.
   * @param {string|null} val
   */
  setStyle(val) {
    this.style = val
  }

  /**
   * Get the level of this block.
   * @returns {number|null}
   */
  getLevel() {
    return this.level
  }

  /**
   * Set the level of this block.
   * @param {number|null} val
   */
  setLevel(val) {
    this.level = val
  }

  /**
   * Get the source line number where this block started.
   * @returns {number|undefined} line number, or undefined when sourcemap is disabled.
   */
  getLineNumber() {
    return this.sourceLocation?.lineno
  }

  /**
   * Generate cross-reference text (xreftext) used to refer to this block.
   * Uses the explicit reftext if set. For sections or captioned blocks (blocks
   * with both a title and a caption), formats the text according to xrefstyle.
   * Falls back to the title, or null if no title is available.
   * @param {string|null} [xrefstyle=null] - Optional String style: 'full', 'short', or 'basic'.
   * @returns {Promise<string|null>} the xreftext, or null.
   */
  async getXrefText(xrefstyle = null) {
    return this.xreftext(xrefstyle)
  }

  /**
   * Get the source location of this block.
   * @returns {Cursor|undefined} the Cursor source location object, or undefined when sourcemap is disabled.
   */
  getSourceLocation() {
    return this.sourceLocation ?? undefined
  }

  /**
   * Get the list of substitutions enabled for this block.
   * @returns {string[]}
   */
  getSubstitutions() {
    return this.subs
  }

  /**
   * Check whether the specified substitution is enabled for this block.
   * @param {string} name
   * @returns {boolean}
   */
  hasSubstitution(name) {
    return this.hasSub(name)
  }

  /**
   * Add the specified substitution to this block's substitutions list.
   * @param {string} name
   */
  addSubstitution(name) {
    if (!this.subs.includes(name)) this.subs.push(name)
  }

  /**
   * Remove the specified substitution from this block's substitutions list.
   * @param {string} name
   */
  removeSubstitution(name) {
    this.removeSub(name)
  }
}
