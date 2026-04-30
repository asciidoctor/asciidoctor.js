// ESM conversion of section.rb

import { AbstractBlock } from './abstract_block.js'
import { Compliance } from './compliance.js'
import { InvalidSectionIdCharsRx } from './rx.js'

/**
 * Methods for managing sections of AsciiDoc content in a document.
 */
export class Section extends AbstractBlock {
  /**
   * Create a new Section — mirrors the core Section.create() API.
   * @param {AbstractBlock|null} [parent=null]
   * @param {number|null} [level=null]
   * @param {boolean} [numbered=false]
   * @param {Object} [opts={}]
   * @returns {Section}
   */
  static create(parent = null, level = null, numbered = false, opts = {}) {
    return new Section(parent, level, numbered, opts)
  }

  /**
   * Initialize an Asciidoctor Section object.
   * @param {AbstractBlock|null} [parent=null] - The parent AbstractBlock (Document or Section), or null.
   * @param {number|null} [level=null] - The Integer level of this section (default: parent.level + 1 or 1).
   * @param {boolean} [numbered=false] - Boolean indicating whether numbering is enabled.
   * @param {Object} [opts={}] - An optional plain object of options.
   */
  constructor(parent = null, level = null, numbered = false, opts = {}) {
    super(parent, 'section', opts)
    if (parent instanceof Section) {
      this.level = level ?? parent.level + 1
      this.special = parent.special
    } else {
      this.level = level ?? 1
      this.special = false
    }
    this.numbered = numbered
    this.index = 0
    this.sectname = null
  }

  /**
   * The name of this section — alias for title.
   * @returns {string|null}
   */
  get name() {
    return this.title
  }

  /**
   * Check whether this section has any child Section objects.
   * @returns {boolean}
   */
  hasSections() {
    return this._nextSectionIndex > 0
  }

  /**
   * Generate a String ID from the title of this section.
   * This sync convenience method is only called outside of parsing (e.g. extensions).
   * At that point #convertedTitle is already set, so this.title returns the fully-substituted
   * HTML title — matching Ruby's behaviour where section.title calls apply_title_subs.
   * @returns {string}
   */
  generateId() {
    return Section.generateId(this.title, this.document)
  }

  /**
   * Get the section number for the current Section as a dot-separated String.
   * @param {string} [delimiter='.'] - The separator between numerals.
   * @param {string|false|null} [append=null] - String appended at the end, or false to omit trailing delimiter
   *   (default: null → same as delimiter).
   * @returns {string} the section number String.
   */
  sectnum(delimiter = '.', append = null) {
    const suffix =
      append !== null ? (append === false ? '' : append) : delimiter
    if (this.level > 1 && this.getParent() instanceof Section) {
      return `${this.getParent().sectnum(delimiter, delimiter)}${this.numeral ?? ''}${suffix}`
    }
    return `${this.numeral ?? ''}${suffix}`
  }

  /**
   * Generate cross-reference text for this section.
   * Respects an explicit reftext if set; otherwise formats the section title
   * according to xrefstyle ('full', 'short', or 'basic').
   * @param {string|null} [xrefstyle=null]
   * @returns {Promise<string|null>}
   */
  async xreftext(xrefstyle = null) {
    const val = this.reftext
    if (val && val.length > 0) return val

    // If the title is currently being computed (circular reference), return null so that
    // the caller (convert_inline_anchor) falls back to the "[refid]" placeholder.
    if (this._computingTitle) return null

    // Compute the title now using the current catalog state if not already done.
    // This ensures that forward xrefs in a section title are not resolved when the
    // xreftext is first requested during parsing (before the target is registered).
    await this.precomputeTitle()

    if (xrefstyle) {
      if (this.numbered) {
        const type = this.sectname
        switch (xrefstyle) {
          case 'full': {
            let quotedTitle
            if (type === 'chapter' || type === 'appendix') {
              quotedTitle = this.subPlaceholder(
                await this.subQuotes('_%s_'),
                this.title
              )
            } else {
              const q = this.document.compatMode ? "``%s''" : '"`%s`"'
              quotedTitle = this.subPlaceholder(
                await this.subQuotes(q),
                this.title
              )
            }
            const signifier = this.document.attributes[`${type}-refsig`]
            return signifier
              ? `${signifier} ${this.sectnum('.', ',')} ${quotedTitle}`
              : `${this.sectnum('.', ',')} ${quotedTitle}`
          }
          case 'short': {
            const signifier =
              this.document.attributes[`${this.sectname}-refsig`]
            return signifier
              ? `${signifier} ${this.sectnum('.', '')}`
              : this.sectnum('.', '')
          }
          default: {
            // 'basic'
            const t = this.sectname
            return t === 'chapter' || t === 'appendix'
              ? this.subPlaceholder(await this.subQuotes('_%s_'), this.title)
              : this.title
          }
        }
      } else {
        // apply basic styling
        const t = this.sectname
        return t === 'chapter' || t === 'appendix'
          ? this.subPlaceholder(await this.subQuotes('_%s_'), this.title)
          : this.title
      }
    }
    return this.title
  }

  /**
   * Append a content block to this block's list of blocks.
   * If the child block is a Section, assign an index/numeral to it.
   * @param {AbstractBlock} block - The child Block to append.
   * @returns {this}
   */
  append(block) {
    if (block.context === 'section') this.assignNumeral(block)
    return super.append(block)
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Get the section title (alias of title).
   * @returns {string|null}
   */
  getName() {
    return this.name
  }

  /**
   * Get the section name (e.g. 'section', 'appendix').
   * @returns {string|null}
   */
  getSectionName() {
    return this.sectname ?? undefined
  }

  /**
   * Set the section name (e.g. 'section', 'appendix').
   * @param {string|null} val
   */
  setSectionName(val) {
    this.sectname = val
  }

  /**
   * Get the 0-based index of this section within the parent block.
   * @returns {number}
   */
  getIndex() {
    return this.index
  }

  /**
   * Set the 0-based index of this section within the parent block.
   * @param {number} val
   */
  setIndex(val) {
    this.index = val
  }

  /**
   * Get whether this section is numbered.
   * @returns {boolean}
   */
  isNumbered() {
    return this.numbered
  }

  /**
   * Get whether this section is a special section.
   * @returns {boolean}
   */
  isSpecial() {
    return this.special
  }

  /**
   * Set whether this section is a special section.
   * @param {boolean} val
   */
  setSpecial(val) {
    this.special = val
  }

  /**
   * Get the section numeral string.
   * @returns {string|null}
   */
  getNumeral() {
    return this.numeral
  }

  /**
   * Set the section numeral string.
   * @param {string|null} val
   */
  setNumeral(val) {
    this.numeral = val
  }

  /**
   * Get the section number string (dot-separated).
   * @returns {string}
   */
  getSectionNumeral() {
    return this.sectnum()
  }

  /**
   * Get the section number string (alias of getSectionNumeral).
   * @returns {string}
   */
  getSectionNumber() {
    return this.sectnum()
  }

  toString() {
    if (this._title) {
      const formalTitle = this.numbered
        ? `${this.sectnum()} ${this._title}`
        : this._title
      return `#<Section {level: ${this.level}, title: ${JSON.stringify(formalTitle)}, blocks: ${this.blocks.length}}>`
    }
    return super.toString()
  }

  /**
   * Generate a String ID from the given section title.
   * @param {string} title - The String title.
   * @param {object} document - The Document.
   * @returns {string} the generated String ID.
   */
  static generateId(title, document) {
    const attrs = document.attributes
    const pre = attrs.idprefix ?? '_'
    let sep, sepSub, noSep

    const rawSep = attrs.idseparator
    if (rawSep !== undefined && rawSep !== null) {
      if (rawSep.length === 0) {
        noSep = true
        sep = ''
        sepSub = null
      } else {
        // Use only first character if multi-character
        sep = rawSep.length === 1 ? rawSep : (attrs.idseparator = rawSep[0])
        if (sep === '-' || sep === '.') {
          sepSub = ' .-'
        } else {
          sepSub = ` ${sep}.-`
        }
      }
    } else {
      sep = '_'
      sepSub = ' _.-'
    }

    let genId = `${pre}${title.toLowerCase().replace(new RegExp(InvalidSectionIdCharsRx.source, 'gu'), '')}`

    if (noSep) {
      genId = genId.replace(/ /g, '')
    } else {
      // Replace chars in sepSub with sep and squeeze consecutive sep chars
      genId = _trS(genId, sepSub, sep)
      if (genId.endsWith(sep)) genId = genId.slice(0, -sep.length)
      // Ensure id doesn't begin with idseparator if idprefix is empty
      if (pre === '' && genId.startsWith(sep)) genId = genId.slice(sep.length)
    }

    const refs = document.catalog?.refs
    if (refs && genId in refs) {
      let cnt = Compliance.uniqueIdStartIndex
      let candidate
      do {
        candidate = `${genId}${sep}${cnt}`
        cnt++
      } while (candidate in refs)
      return candidate
    }
    return genId
  }
}

/**
 * @internal Translate every character in `fromChars` to `toChar` and squeeze
 * consecutive runs of the translated character (mirrors Ruby's String#tr_s).
 * @param {string} str
 * @param {string} fromChars
 * @param {string} toChar
 * @returns {string}
 */
function _trS(str, fromChars, toChar) {
  const set = new Set([...fromChars])
  let result = ''
  let prevWasSep = false
  for (const ch of str) {
    if (set.has(ch)) {
      if (!prevWasSep) result += toChar
      prevWasSep = true
    } else {
      result += ch
      prevWasSep = false
    }
  }
  return result
}
