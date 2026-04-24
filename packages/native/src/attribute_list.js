// ESM conversion of attribute_list.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby's StringScanner is reimplemented as the module-private StringScanner
//     class using JS sticky regexes (flag 'y'). The scanner caches a sticky
//     version of each RegExp on first use to avoid repeated RegExp construction.
//   - scan() returns null (not nil) on no-match; getByte() returns undefined at EOS.
//   - Ruby's boolean `false` return from parse_attribute (bare `return`) is
//     represented as `return false`.
//   - The `continue` local variable is renamed `shouldContinue` because `continue`
//     is a reserved word in JS.
//   - snake_case method names are converted to camelCase.
//   - Private methods/fields use the JS # prefix.
//   - block.apply_subs → block.applySubs (matches Substitutors mixin naming).

import { CG_WORD, CC_WORD } from './rx.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const APOS = "'"
const BACKSLASH = '\\'
const QUOT = '"'

// Regular expressions for detecting the boundary of a value.
// These are passed to StringScanner which converts them to sticky variants.
const BoundaryRx = {
  [QUOT]: /.*?[^\\](?=")/,
  [APOS]: /.*?[^\\](?=')/,
  ',': /.*?(?=[ \t]*(,|$))/,
}

// Regular expressions for unescaping quoted characters.
const EscapedQuotes = {
  [QUOT]: '\\"',
  [APOS]: "\\'",
}

// Regular expressions for skipping delimiters.
const SkipRx = {
  ',': /[ \t]*(,|$)/,
}

// Attribute name: starts with a word character, followed by word chars or hyphens.
// Constructed with the 'u' flag so \p{…} Unicode properties work.
const NameRx = new RegExp(`${CG_WORD}[${CC_WORD}\\-]*`, 'u')

// Matches one or more horizontal whitespace characters.
const BlankRx = /[ \t]+/

// ── StringScanner ─────────────────────────────────────────────────────────────
// A minimal port of Ruby's StringScanner, sufficient for AttributeList parsing.
//
// Differences from Ruby's StringScanner:
//   - getByte()  returns undefined (not nil) at end of string.
//   - scan/skip  return null/0  (not nil) on no match.
//   - Regexes are anchored at the current position via the sticky ('y') flag.
//     A sticky copy is created once per regex and cached for reuse.
//   - unscan()   reverts only the most recent getByte / scan / skip advance.
class StringScanner {
  #source
  #pos = 0
  #lastMatchLen = 0
  #stickyCache = new Map()

  constructor(source) {
    this.#source = source
  }

  // The original source string (equivalent to Ruby scanner.string).
  get source() {
    return this.#source
  }

  // Returns true when the scan pointer is at or past the end of the string.
  eos() {
    return this.#pos >= this.#source.length
  }

  // Returns the next n characters without advancing the scan pointer.
  peek(n) {
    return this.#source.slice(this.#pos, this.#pos + n)
  }

  // Consumes and returns the next character, or undefined at EOS.
  getByte() {
    if (this.#pos >= this.#source.length) {
      this.#lastMatchLen = 0
      return undefined
    }
    this.#lastMatchLen = 1
    return this.#source[this.#pos++]
  }

  // Reverts the most recent getByte / scan / skip advance.
  unscan() {
    this.#pos -= this.#lastMatchLen
    this.#lastMatchLen = 0
  }

  // Advances past rx at the current position.
  // Returns the number of characters skipped, or 0 on no match.
  skip(rx) {
    const m = this.#exec(rx)
    return m ? m[0].length : 0
  }

  // Matches rx at the current position and returns the matched string,
  // or null on no match.
  scan(rx) {
    const m = this.#exec(rx)
    return m ? m[0] : null
  }

  // Internal: execute rx (as a sticky regex) at the current position.
  #exec(rx) {
    let sticky = this.#stickyCache.get(rx)
    if (!sticky) {
      const flags = rx.flags.includes('y') ? rx.flags : `${rx.flags}y`
      sticky = new RegExp(rx.source, flags)
      this.#stickyCache.set(rx, sticky)
    }
    sticky.lastIndex = this.#pos
    const m = sticky.exec(this.#source)
    if (!m) {
      this.#lastMatchLen = 0
      return null
    }
    this.#lastMatchLen = m[0].length
    this.#pos += m[0].length
    return m
  }
}

// ── AttributeList ─────────────────────────────────────────────────────────────

// Public: Handles parsing AsciiDoc attribute lists into a plain object of
// key/value pairs. By default, attributes must each be separated by a comma
// and quotes may be used around the value. If a key is not detected, the value
// is assigned to a 1-based positional key. Positional attributes can be
// "rekeyed" when given a positionalAttrs array either during parsing or after.
//
// Examples
//
//   const attrlist = new AttributeList('astyle')
//   attrlist.parse()
//   // => { 1: 'astyle' }
//
//   attrlist.rekey(['style'])
//   // => { 1: 'astyle', style: 'astyle' }
//
//   const attrlist2 = new AttributeList('quote, Famous Person, Famous Book (2001)')
//   attrlist2.parse(['style', 'attribution', 'citetitle'])
//   // => { 1: 'quote', style: 'quote', 2: 'Famous Person', attribution: 'Famous Person',
//   //      3: 'Famous Book (2001)', citetitle: 'Famous Book (2001)' }
//
export class AttributeList {
  #scanner
  #block
  #delimiter
  #delimiterSkipPattern
  #delimiterBoundaryPattern
  #attributes = null

  constructor(source, block = null, delimiter = ',') {
    this.#scanner = new StringScanner(source)
    this.#block = block
    this.#delimiter = delimiter
    this.#delimiterSkipPattern = SkipRx[delimiter]
    this.#delimiterBoundaryPattern = BoundaryRx[delimiter]
  }

  // Public: Parse the attribute list and merge the result into the given object.
  //
  // attributes     - The target plain object to update.
  // positionalAttrs - An Array of String keys to assign to positional values.
  //
  // Returns the updated attributes object.
  async parseInto(attributes, positionalAttrs = []) {
    return Object.assign(attributes, await this.parse(positionalAttrs))
  }

  // Public: Parse the attribute list and return a plain object of key/value pairs.
  //
  // Subsequent calls return the already-parsed result without re-parsing.
  //
  // positionalAttrs - An Array of String keys to assign to positional values.
  //
  // Returns a plain object of parsed attributes.
  async parse(positionalAttrs = []) {
    if (this.#attributes) return this.#attributes
    this.#attributes = {}
    let index = 0
    while (await this.#parseAttribute(index, positionalAttrs)) {
      if (this.#scanner.eos()) break
      this.#skipDelimiter()
      index++
    }
    return this.#attributes
  }

  // Public: Rekey the parsed positional attributes using the given key names.
  //
  // positionalAttrs - An Array of String keys to assign to positional values.
  //
  // Returns the updated attributes object.
  rekey(positionalAttrs) {
    return AttributeList.rekey(this.#attributes, positionalAttrs)
  }

  // Public: Assign String keys to the positional (numeric-keyed) values of the
  // given attributes object.
  //
  // attributes      - A plain object produced by parse().
  // positionalAttrs - An Array of String keys to assign (null entries are skipped).
  //
  // Returns the updated attributes object.
  static rekey(attributes, positionalAttrs) {
    for (let i = 0; i < positionalAttrs.length; i++) {
      const key = positionalAttrs[i]
      if (key) {
        const val = attributes[i + 1]
        if (val != null) attributes[key] = val
      }
    }
    return attributes
  }

  // Private: Parse the next attribute starting at the given positional index.
  //
  // Returns true to continue parsing, false to stop.
  async #parseAttribute(index, positionalAttrs) {
    let shouldContinue = true
    this.#skipBlank()
    const peeked = this.#scanner.peek(1)
    let name, value, singleQuoted

    if (peeked === QUOT) {
      // example: "quote" || "foo
      name = this.#parseAttributeValue(this.#scanner.getByte())
    } else if (peeked === APOS) {
      // example: 'quote' || 'foo
      name = this.#parseAttributeValue(this.#scanner.getByte())
      if (!name.startsWith(APOS)) singleQuoted = true
    } else {
      name = this.#scanName()
      const skipped = (name !== null && this.#skipBlank()) || 0

      if (this.#scanner.eos()) {
        // Stop unless we have a name or the source ends with the delimiter
        if (!name && !this.#scanner.source.trimEnd().endsWith(this.#delimiter))
          return false
        // example: quote (at eos)
        shouldContinue = false
      } else {
        const c = this.#scanner.getByte()
        if (c === this.#delimiter) {
          // example: quote,
          this.#scanner.unscan()
        } else if (name) {
          if (c === '=') {
            // example: foo=...
            this.#skipBlank()
            const c2 = this.#scanner.getByte()
            if (c2 === QUOT) {
              // example: foo="bar" || foo="ba\"zaar" || foo="bar
              value = this.#parseAttributeValue(c2)
            } else if (c2 === APOS) {
              // example: foo='bar' || foo='ba\'zaar' || foo='ba"zaar' || foo='bar
              value = this.#parseAttributeValue(c2)
              if (!value.startsWith(APOS)) singleQuoted = true
            } else if (c2 === this.#delimiter) {
              // example: foo=,
              value = ''
              this.#scanner.unscan()
            } else if (c2 === undefined) {
              // example: foo= (at eos)
              value = ''
            } else {
              // example: foo=bar || foo=None
              value = `${c2}${this.#scanToDelimiter() ?? ''}`
              if (value === 'None') return true
            }
          } else {
            // example: foo bar
            name = `${name}${' '.repeat(skipped)}${c}${this.#scanToDelimiter() ?? ''}`
          }
        } else {
          // example: =foo= || !foo
          name = `${c}${this.#scanToDelimiter() ?? ''}`
        }
      }
    }

    if (value !== undefined) {
      // Named attribute
      if (name === 'options' || name === 'opts') {
        // example: options="opt1,opt2,opt3" || opts="opt1,opt2,opt3"
        if (value.includes(',')) {
          if (value.includes(' ')) value = value.replace(/ /g, '')
          for (const opt of value.split(',')) {
            if (opt) this.#attributes[`${opt}-option`] = ''
          }
        } else if (value) {
          this.#attributes[`${value}-option`] = ''
        }
      } else if (singleQuoted && this.#block) {
        if (name === 'title' || name === 'reftext') {
          this.#attributes[name] = value
        } else {
          this.#attributes[name] = await this.#block.applySubs(value)
        }
      } else {
        this.#attributes[name] = value
      }
    } else {
      // Positional attribute
      if (singleQuoted && this.#block) {
        name = await this.#block.applySubs(name)
      }
      const positionalAttrName = positionalAttrs[index]
      if (positionalAttrName && name != null) {
        this.#attributes[positionalAttrName] = name
      }
      // QUESTION should we assign the positional key even when claimed by a positional attribute?
      this.#attributes[index + 1] = name
    }

    return shouldContinue
  }

  // Private: Parse a quoted attribute value starting after the opening quote.
  //
  // quote - The String quote character that opened this value (QUOT or APOS).
  //
  // Returns the parsed String value (unescaped, without surrounding quotes).
  #parseAttributeValue(quote) {
    // empty quoted value: "" or ''
    if (this.#scanner.peek(1) === quote) {
      this.#scanner.getByte()
      return ''
    }
    const value = this.#scanToQuote(quote)
    if (value !== null) {
      this.#scanner.getByte() // consume closing quote
      return value.includes(BACKSLASH)
        ? value.replaceAll(EscapedQuotes[quote], quote)
        : value
    }
    // no closing quote found – treat opening quote as part of the value
    return `${quote}${this.#scanToDelimiter() ?? ''}`
  }

  #skipBlank() {
    return this.#scanner.skip(BlankRx)
  }
  #skipDelimiter() {
    return this.#scanner.skip(this.#delimiterSkipPattern)
  }
  #scanName() {
    return this.#scanner.scan(NameRx)
  }
  #scanToDelimiter() {
    return this.#scanner.scan(this.#delimiterBoundaryPattern)
  }
  #scanToQuote(quote) {
    return this.#scanner.scan(BoundaryRx[quote])
  }
}
