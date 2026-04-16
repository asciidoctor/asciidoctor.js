// ESM conversion of section.rb

import { AbstractBlock } from './abstract_block.js'
import { Compliance } from './compliance.js'
import { InvalidSectionIdCharsRx } from './rx.js'

// Public: Methods for managing sections of AsciiDoc content in a document.
export class Section extends AbstractBlock {
  // Public: Get/Set the 0-based index order of this section within the parent block
  // index

  // Public: Get/Set the section name of this section
  // sectname

  // Public: Get/Set whether this is a special section or a child of one
  // special

  // Public: Get/Set whether this section should be numbered.
  // numbered

  // Public: Initialize an Asciidoctor::Section object.
  //
  // parent   - The parent AbstractBlock (Document or Section), or null.
  // level    - The Integer level of this section (default: parent.level + 1 or 1).
  // numbered - Boolean indicating whether numbering is enabled (default: false).
  // opts     - An optional plain object of options (default: {}).
  constructor (parent = null, level = null, numbered = false, opts = {}) {
    super(parent, 'section', opts)
    if (parent instanceof Section) {
      this.level   = level ?? (parent.level + 1)
      this.special = parent.special
    } else {
      this.level   = level ?? 1
      this.special = false
    }
    this.numbered  = numbered
    this.index     = 0
    this.sectname  = null
  }

  // Public: The name of this section — alias for title.
  get name () { return this.title }

  // Public: Check whether this section has any child Section objects.
  //
  // Returns a Boolean.
  hasSections () { return this._nextSectionIndex > 0 }

  // Public: Generate a String ID from the title of this section.
  generateId () {
    // Use the attr-substituted (but not specialchars-substituted) title for ID generation.
    // This allows {attr} references to be resolved while keeping HTML entities as raw AsciiDoc
    // so that InvalidSectionIdCharsRx can correctly strip them.
    return Section.generateId(this.attrSubstitutedTitle ?? this.title, this.document)
  }

  // Public: Get the section number for the current Section as a dot-separated String.
  //
  // delimiter - The separator between numerals (default: '.').
  // append    - String appended at the end, or false to omit trailing delimiter.
  //             (default: null → same as delimiter)
  //
  // Returns the section number String.
  sectnum (delimiter = '.', append = null) {
    const suffix = append !== null ? (append === false ? '' : append) : delimiter
    if (this.level > 1 && this.parent instanceof Section) {
      return `${this.parent.sectnum(delimiter, delimiter)}${this.numeral ?? ''}${suffix}`
    }
    return `${this.numeral ?? ''}${suffix}`
  }

  // (see AbstractBlock#xreftext)
  async xreftext (xrefstyle = null) {
    const val = this.reftext
    if (val && val.length > 0) return val

    if (xrefstyle) {
      if (this.numbered) {
        const type = this.sectname
        switch (xrefstyle) {
          case 'full': {
            let quotedTitle
            if (type === 'chapter' || type === 'appendix') {
              quotedTitle = this.subPlaceholder(await this.subQuotes('_%s_'), this.title)
            } else {
              const q = this.document.compatMode ? "``%s''" : '"`%s`"'
              quotedTitle = this.subPlaceholder(await this.subQuotes(q), this.title)
            }
            const signifier = this.document.attributes[`${type}-refsig`]
            return signifier
              ? `${signifier} ${this.sectnum('.', ',')} ${quotedTitle}`
              : `${this.sectnum('.', ',')} ${quotedTitle}`
          }
          case 'short': {
            const signifier = this.document.attributes[`${this.sectname}-refsig`]
            return signifier
              ? `${signifier} ${this.sectnum('.', '')}`
              : this.sectnum('.', '')
          }
          default: { // 'basic'
            const t = this.sectname
            return (t === 'chapter' || t === 'appendix')
              ? this.subPlaceholder(await this.subQuotes('_%s_'), this.title)
              : this.title
          }
        }
      } else {
        // apply basic styling
        const t = this.sectname
        return (t === 'chapter' || t === 'appendix')
          ? this.subPlaceholder(await this.subQuotes('_%s_'), this.title)
          : this.title
      }
    }
    return this.title
  }

  // Public: Append a content block to this block's list of blocks.
  //
  // If the child block is a Section, assign an index/numeral to it.
  //
  // block - The child Block to append.
  //
  // Returns this Section.
  append (block) {
    if (block.context === 'section') this.assignNumeral(block)
    return super.append(block)
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  // Public: Get the section ID.
  getId () { return this.id ?? undefined }

  // Public: Get the section title (alias of title).
  getName () { return this.name }

  // Public: Get the section name (e.g. 'section', 'appendix').
  getSectionName () { return this.sectname }

  // Public: Get the 0-based index of this section within the parent block.
  getIndex () { return this.index }

  // Public: Get whether this section is numbered.
  isNumbered () { return this.numbered }

  // Public: Get whether this section is a special section.
  isSpecial () { return this.special }

  // Public: Get the section numeral string.
  getNumeral () { return this.numeral }

  // Public: Set the section numeral string.
  setNumeral (val) { this.numeral = val }

  // Public: Get the section number string (dot-separated).
  getSectionNumeral () { return this.sectnum() }

  toString () {
    if (this._title) {
      const formalTitle = this.numbered ? `${this.sectnum()} ${this._title}` : this._title
      return `#<Section {level: ${this.level}, title: ${JSON.stringify(formalTitle)}, blocks: ${this.blocks.length}}>`
    }
    return super.toString()
  }

  // Public: Generate a String ID from the given section title.
  //
  // title    - The String title.
  // document - The Document.
  //
  // Returns the generated String ID.
  static generateId (title, document) {
    const attrs = document.attributes
    const pre   = attrs['idprefix'] ?? '_'
    let sep, sepSub, noSep

    const rawSep = attrs['idseparator']
    if (rawSep !== undefined && rawSep !== null) {
      if (rawSep.length === 0) {
        noSep = true
        sep = ''
        sepSub = null
      } else {
        // Use only first character if multi-character
        sep = rawSep.length === 1 ? rawSep : (attrs['idseparator'] = rawSep[0])
        if (sep === '-' || sep === '.') {
          sepSub = ' .-'
        } else {
          sepSub = ` ${sep}.-`
        }
      }
    } else {
      sep    = '_'
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

// Internal: Translate every character in `fromChars` to `toChar` and squeeze
// consecutive runs of the translated character (mirrors Ruby's String#tr_s).
function _trS (str, fromChars, toChar) {
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
