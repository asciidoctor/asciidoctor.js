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
import { LF, CAPTION_ATTRIBUTE_NAMES, ORDERED_LIST_KEYWORDS, ReplaceableTextRx } from './constants.js'
import { intToRoman } from './helpers.js'

// Used as a sentinel to abort findBy traversal early (mirrors Ruby StopIteration).
class StopIteration extends Error {}

export class AbstractBlock extends AbstractNode {
  // Backing fields for getter/setter pairs
  #title = null
  #convertedTitle = null
  #caption = null

  constructor (parent, context, opts = {}) {
    super(parent, context, opts)
    this.contentModel = 'compound'
    this.blocks = []
    this.subs = []
    this.id = null
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

  isBlock () { return true }
  isInline () { return false }

  // Public: Get the String title of this block with title substitutions applied.
  // The result is pre-computed during Document.parse() via precomputeTitle().
  // Falls back to applyHeaderSubs (sync) if precomputeTitle() has not been called yet
  // (e.g. when a title is set via the API after parsing).
  //
  // Returns the converted String title, or null if the source title is falsy.
  get title () {
    if (this.#convertedTitle != null) return this.#convertedTitle
    if (this.#title == null) return null
    // Pre-computation hasn't run (title set after parse, or parse not yet done).
    // Apply the synchronous header subs (specialcharacters + attributes) as a best-effort.
    return this.applyHeaderSubs(this.#title)
  }

  // Public: Pre-compute the converted title asynchronously.
  // Called during Document.parse() so the synchronous getter works during conversion.
  // Re-entrant calls (circular title references) are detected via _computingTitle and
  // silently skipped so that Section#xreftext() can return null (→ "[refid]" fallback).
  async precomputeTitle () {
    if (this.#title && this.#convertedTitle == null && !this._computingTitle) {
      this._computingTitle = true
      try {
        this.#convertedTitle = await this.applyTitleSubs(this.#title)
      } finally {
        this._computingTitle = false
      }
    }
  }

  // Internal: Get the raw (unsubstituted) title as set by the parser.
  get rawTitle () { return this.#title }

  // Internal: Get the title with only attribute substitutions applied (no specialchars).
  // NOTE: no longer used for section ID generation (parser now calls applyTitleSubs to match
  // Ruby's behaviour). Kept for other callers that need a lightweight sync substitution.
  get attrSubstitutedTitle () {
    const raw = this.#title
    if (raw == null) return null
    return raw.includes('{') ? this.subAttributes(raw) : raw
  }

  // Public: Set the String block title (clears the memoised converted title).
  set title (val) {
    this.#convertedTitle = null
    this.#title = val
  }

  // Public: Check whether the title of this block is defined.
  //
  // Returns a Boolean.
  hasTitle () { return !!this.#title }

  // Public: Get the caption for this block.
  // For admonition blocks, returns the 'textlabel' attribute instead.
  //
  // Returns the String caption, or null.
  get caption () {
    return this.context === 'admonition' ? this.attributes.textlabel : this.#caption
  }

  // Public: Set the caption for this block.
  set caption (val) { this.#caption = val }

  // Public: Get the source file where this block started.
  get file () { return this.sourceLocation && this.sourceLocation.file }

  // Public: Get the source line number where this block started.
  get lineno () { return this.sourceLocation && this.sourceLocation.lineno }

  // Public: Update the context of this block, also updating the node name.
  //
  // context - The String context to assign to this block.
  setContext (context) {
    this.context = context
    this.nodeName = String(context)
  }

  // Deprecated: Get/set the numeral of this section as an integer when possible.
  get number () {
    const n = parseInt(this.numeral, 10)
    return String(n) === String(this.numeral) ? n : this.numeral
  }

  set number (val) { this.numeral = String(val) }

  // Public: Convert this block and return the converted String content.
  //
  // Returns the String result of the converter.
  async convert () {
    this.document.playbackAttributes(this.attributes)
    return this.converter.convert(this)
  }

  // Deprecated: Use convert() instead.
  render () { return this.convert() }

  // Public: Get the converted result of all child blocks joined with a newline.
  //
  // Returns a Promise<String>.
  async content () {
    const results = []
    for (const b of this.blocks) results.push(await b.convert())
    return results.join(LF)
  }

  // Public: Alias for the content method — mirrors the core API.
  getContent () { return this.content() }

  // Public: Append a content block to this block's list of blocks.
  //
  // block - The new child block.
  //
  // Returns this block (enables chaining).
  append (block) {
    if (block.parent !== this) block.parent = this
    this.blocks.push(block)
    return this
  }

  // Public: Determine whether this block contains block content.
  //
  // Returns a Boolean.
  hasBlocks () { return this.blocks.length > 0 }

  // Public: Check whether this block has any child Section objects.
  // Overridden by Document and Section.
  //
  // Returns false.
  hasSections () { return false }

  // Public: Get the child Section objects of this block.
  //
  // Only applies to Document and Section instances.
  //
  // Returns an Array of Section objects (may be empty).
  sections () {
    return this.blocks.filter(b => b.context === 'section')
  }

  // Public: Get the converted alt text for this block image.
  //
  // Returns a String with XML special character and replacement substitutions applied.
  alt () {
    const text = this.attributes.alt
    if (text) {
      if (text === this.attributes['default-alt']) return this.subSpecialchars(text)
      const escaped = this.subSpecialchars(text)
      return ReplaceableTextRx.test(escaped) ? this.subReplacements(escaped) : escaped
    }
    return ''
  }

  // Public: Get the converted title prefixed with the caption.
  //
  // Returns the String captioned title.
  captionedTitle () {
    return `${this.caption || ''}${this.title || ''}`
  }

  // Public: Get the list marker keyword for the specified list type.
  //
  // listType - The String list type (default: this.style).
  //
  // Returns the single-character String keyword for the list marker, or undefined.
  listMarkerKeyword (listType = null) {
    return ORDERED_LIST_KEYWORDS[listType || this.style]
  }

  // Public: Check whether the specified substitution is enabled for this block.
  //
  // name - The String substitution name.
  //
  // Returns a Boolean.
  hasSub (name) { return this.subs.includes(name) }

  // Public: Remove a substitution from this block.
  //
  // name - The String substitution name to remove.
  //
  // Returns undefined.
  removeSub (name) {
    const idx = this.subs.indexOf(name)
    if (idx >= 0) this.subs.splice(idx, 1)
  }

  // Public: Generate cross-reference text (xreftext) used to refer to this block.
  //
  // Uses the explicit reftext if set. For sections or captioned blocks (blocks
  // with both a title and a caption), formats the text according to xrefstyle.
  // Falls back to the title, or null if no title is available.
  //
  // xrefstyle - Optional String style: 'full', 'short', or 'basic' (default: null).
  //
  // Returns a String xreftext, or null.
  async xreftext (xrefstyle = null) {
    const val = this.reftext
    if (val && val.length > 0) return val
    if (xrefstyle && this.#title && this.#caption) {
      if (xrefstyle === 'full') {
        const quoteTemplate = this.document.compatMode ? "``%s''" : '"`%s`"'
        const quotedTitle = this.subPlaceholder(await this.subQuotes(quoteTemplate), this.title)
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

  // Public: Generate and assign a caption to this block if not already assigned.
  //
  // If the block has a title and a caption prefix is available, builds a caption
  // from the prefix and a counter, then stores it.
  //
  // value          - The String caption to assign, or null to derive from document attributes.
  // captionContext - The String context used to look up caption attributes
  //                 (default: this.context).
  //
  // Returns undefined.
  assignCaption (value = null, captionContext = this.context) {
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
          this.numeral = this.document.incrementAndStoreCounter(`${captionContext}-number`, this)
          this.#caption = `${prefix} ${this.numeral}. `
        }
      }
    }
  }

  // Internal: Assign the next index (0-based) and numeral (1-based) to the section.
  //
  // section - The Section to which to assign the next index and numeral.
  //
  // Returns undefined.
  assignNumeral (section) {
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
        section.numeral = sectname === 'part'
          ? intToRoman(this._nextSectionOrdinal)
          : String(this._nextSectionOrdinal)
        this._nextSectionOrdinal++
      }
    }
  }

  // Internal: Reassign 0-based section indexes for all descendant sections.
  //
  // Must be called after removing child sections to keep internal counters correct.
  //
  // Returns undefined.
  reindexSections () {
    this._nextSectionIndex = 0
    this._nextSectionOrdinal = 1
    for (const block of this.blocks) {
      if (block.context === 'section') {
        this.assignNumeral(block)
        block.reindexSections()
      }
    }
  }

  // Public: Walk the document tree and find all block-level nodes that match
  // the selector and optional filter function.
  //
  // selector - A plain object with optional keys: context, style, role, id,
  //            traverseDocuments (default: {}).
  // filter   - An optional Function called with each candidate node.
  //            Return values:
  //              true / any truthy  → accept node, continue into children
  //              'prune'            → accept node, skip children
  //              'reject'           → skip node and its children
  //              'stop'             → stop the entire traversal
  //            When null, all matching nodes are accepted.
  //
  // Returns an Array of matching block-level nodes.
  findBy (selector = {}, filter = null) {
    const result = []
    try {
      this.#findByInternal(selector, result, filter)
    } catch (e) {
      if (!(e instanceof StopIteration)) throw e
    }
    return result
  }

  // Alias for findBy (matches Ruby's `alias query find_by`).
  query (selector = {}, filter = null) { return this.findBy(selector, filter) }

  // Public: Move to the next adjacent block in document order.
  // If the current block is the last item in a list, returns the following
  // sibling of the list block.
  //
  // Returns the next AbstractBlock, or null.
  nextAdjacentBlock () {
    if (this.context === 'document') return null
    const p = this.parent
    if (p.context === 'dlist' && this.context === 'list_item') {
      const idx = p.items.findIndex(([terms, desc]) => terms.includes(this) || desc === this)
      const sib = p.items[idx + 1]
      return sib ? sib : p.nextAdjacentBlock()
    }
    const idx = p.blocks.indexOf(this)
    const sib = p.blocks[idx + 1]
    return sib ? sib : p.nextAdjacentBlock()
  }

  // Private: Core traversal logic for findBy. Throws StopIteration for early exit.
  #findByInternal (selector, result, filter) {
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
        if (this.hasHeader?.() && (anyContext || contextSelector === 'section')) {
          this.header.#findByInternal(selector, result, filter)
        }
        for (const b of this.blocks) {
          if (contextSelector === 'section' && b.context !== 'section') continue // optimisation
          b.#findByInternal(selector, result, filter)
        }
      }
    } else if (this.context === 'dlist') {
      if (anyContext || contextSelector !== 'section') { // optimisation
        // NOTE dlist items can be null
        for (const b of this.blocks.flat()) {
          if (b) b.#findByInternal(selector, result, filter)
        }
      }
    } else if (this.context === 'table') {
      if (selector.traverseDocuments) {
        for (const r of this.rows.head) for (const c of r) c.#findByInternal(selector, result, filter)
        const innerSelector = contextSelector === 'inner_document' ? { ...selector, context: 'document' } : selector
        for (const r of [...this.rows.body, ...this.rows.foot]) {
          for (const c of r) {
            c.#findByInternal(innerSelector, result, filter)
            if (c.style === 'asciidoc') c.innerDocument.#findByInternal(innerSelector, result, filter)
          }
        }
      } else {
        for (const r of [...this.rows.head, ...this.rows.body, ...this.rows.foot]) {
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

  // Public: Get the context (node type) of this block.
  getContext () { return this.context }

  // Public: Get the node name of this block.
  getNodeName () { return this.nodeName }

  // Public: Get the child blocks of this block.
  getBlocks () { return this.blocks }

  // Public: Get the child Section blocks of this block.
  getSections () { return this.sections() }

  // Public: Get the title of this block with substitutions applied.
  getTitle () { return this.title }

  // Public: Set the raw title of this block.
  setTitle (val) { this.title = val ?? null }

  // Public: Get the caption of this block.
  getCaption () { return this.caption ?? undefined }

  // Public: Set the caption of this block.
  setCaption (val) { this.caption = val }

  // Public: Get the captioned title of this block.
  getCaptionedTitle () { return this.captionedTitle() }

  // Public: Get the style of this block.
  getStyle () { return this.style }

  // Public: Set the style of this block.
  setStyle (val) { this.style = val }

  // Public: Get the level of this block.
  getLevel () { return this.level }

  // Public: Set the level of this block.
  setLevel (val) { this.level = val }

  // Public: Get the source line number where this block started.
  //
  // Returns an Integer line number, or undefined when sourcemap is disabled.
  getLineNumber () { return this.sourceLocation?.lineno }

  // Public: Get the source location of this block.
  //
  // Returns the Cursor source location object, or undefined when sourcemap is disabled.
  getSourceLocation () { return this.sourceLocation ?? undefined }

  // Public: Get the list of substitutions enabled for this block.
  getSubstitutions () { return this.subs }

  // Public: Check whether the specified substitution is enabled for this block.
  hasSubstitution (name) { return this.hasSub(name) }

  // Public: Add the specified substitution to this block's substitutions list.
  addSubstitution (name) {
    if (!this.subs.includes(name)) this.subs.push(name)
  }

  // Public: Remove the specified substitution from this block's substitutions list.
  removeSubstitution (name) { this.removeSub(name) }
}