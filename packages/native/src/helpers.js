// ESM conversion of helpers.rb
// Internal helper functions used by the Asciidoctor parser.
//
// Ruby-to-JavaScript notes:
//   - require_library / require_open_uri have no JS equivalent and are omitted.
//   - resolve_class / class_for_name are Ruby-specific and are omitted.
//   - BOM detection uses the Unicode BOM codepoint U+FEFF instead of raw bytes,
//     since JS strings are always UTF-16 and never carry an encoding tag.
//   - File.basename / File.extname are reimplemented without the Node `path` module
//     so this module works in browser (Opal) and Node environments alike.
//   - mkdir_p delegates to Node's fs.mkdirSync with { recursive: true }.
//   - String#succ (nextval) is implemented for the ASCII alphanumeric subset
//     used by Asciidoctor list-numbering sequences.

import { UriSniffRx } from './rx.js'

// ── BOM ──────────────────────────────────────────────────────────────────────
// Unicode byte-order mark (U+FEFF). In a JS string (already decoded to UTF-16)
// this is the single character that corresponds to all three BOM byte patterns:
//   UTF-8  BOM  0xEF 0xBB 0xBF → U+FEFF
//   UTF-16 LE   0xFF 0xFE      → U+FEFF
//   UTF-16 BE   0xFE 0xFF      → U+FEFF
const BOM = '\uFEFF'

// Internal: Prepare the source data Array for parsing.
//
// Strips a leading BOM from the first element if present, then trims trailing
// whitespace (trimEnd = true) or only the trailing newline (trimEnd = false)
// from every line.
//
// data    - the source data Array to prepare (no null/undefined entries allowed)
// trimEnd - whether to strip all trailing whitespace (true) or only \n (false) (default: true)
//
// Returns a String Array of prepared lines.
// Internal: Trim trailing ASCII whitespace only (not Unicode line separators U+2028/U+2029).
// Ruby's rstrip strips trailing ASCII whitespace (including newlines).
const rstrip = (line) => line.replace(/[ \t\r\n\f\v]+$/, '')

export function prepareSourceArray (data, trimEnd = true) {
  if (!data.length) return []
  if (data[0].startsWith(BOM)) data[0] = data[0].slice(1)
  // Strip trailing \r to normalize Windows CRLF line endings (lines were split on \n, leaving \r).
  return trimEnd ? data.map(rstrip) : data.map((line) => line.replace(/\r?\n$/, '').replace(/\r$/, ''))
}

// Internal: Prepare the source data String for parsing.
//
// Strips a leading BOM if present, splits into an array, and trims trailing
// whitespace (trimEnd = true) or only the trailing newline (trimEnd = false)
// from every line.
//
// data    - the source data String to prepare
// trimEnd - whether to strip all trailing whitespace (true) or only \n (false) (default: true)
//
// Returns a String Array of prepared lines.
export function prepareSourceString (data, trimEnd = true) {
  if (!data) return []
  if (data.startsWith(BOM)) data = data.slice(1)
  // Normalize Windows CRLF to LF so that split('\n') does not leave trailing \r on each line.
  if (data.includes('\r')) data = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Ruby's each_line does not produce an empty trailing element when the string
  // ends with \n, but JS split('\n') does. Remove the trailing empty element
  // to match Ruby behaviour.
  if (data.endsWith('\n')) data = data.slice(0, -1)
  const lines = data.split('\n')
  return trimEnd ? lines.map(rstrip) : lines
}

// Internal: Efficiently check whether the specified String resembles a URI.
//
// Uses UriSniffRx to check whether the String begins with a URI prefix (e.g.
// http://). No validation of the URI is performed.
//
// str - the String to check
//
// Returns true if the String is a URI, false if it is not.
export function isUriish (str) {
  return str.includes(':') && UriSniffRx.test(str)
}

// Internal: Encode a URI component String for safe inclusion in a URI.
//
// Encodes all characters that are not unreserved per RFC-3986. Specifically,
// encodeURIComponent leaves !, ', (, ), and * unencoded; this function encodes
// those as well so the result matches CGI.escapeURIComponent (Ruby ≥ 3.2) /
// CGI.escape + gsub('+', '%20').
//
// str - the URI component String to encode
//
// Returns the encoded String.
export function encodeUriComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (m) => '%' + m.charCodeAt(0).toString(16))
}

// Internal: Replace spaces with %20 in a URI path.
//
// str - the String to encode
//
// Returns the String with all spaces replaced with %20.
export function encodeSpacesInUri (str) {
  return str.includes(' ') ? str.replaceAll(' ', '%20') : str
}

// Public: Remove the file extension from a filename and return the result.
//
// The filename is expected to be a POSIX path. The extension is only stripped
// when no path separator follows the last dot, so paths like
// "dir.with.dots/file" are returned unchanged.
//
// filename - the String file name to process
//
// Examples
//
//   rootname('part1/chapter1.adoc')
//   // => "part1/chapter1"
//
// Returns the String filename with the file extension removed.
export function rootname (filename) {
  const lastDotIdx = filename.lastIndexOf('.')
  if (lastDotIdx < 0) return filename
  return filename.indexOf('/', lastDotIdx) >= 0 ? filename : filename.slice(0, lastDotIdx)
}

// Public: Retrieve the basename of a filename, optionally removing the extension.
//
// filename - the String file name to process
// dropExt  - a Boolean flag or an explicit String extension to drop (default: null)
//
// Examples
//
//   basename('images/tiger.png', true)
//   // => "tiger"
//
//   basename('images/tiger.png', '.png')
//   // => "tiger"
//
// Returns the String filename with leading directories removed and, optionally,
// the extension removed.
export function basename (filename, dropExt = null) {
  const base = filename.slice(filename.lastIndexOf('/') + 1)
  if (!dropExt) return base
  const ext = dropExt === true ? extname(base) : dropExt
  return (ext && base.endsWith(ext)) ? base.slice(0, -ext.length) : base
}

// Public: Return whether this path has a file extension.
//
// path - the path String to check (expects a POSIX path)
//
// Returns true if the path has a file extension, false otherwise.
export function isExtname (path) {
  const lastDotIdx = path.lastIndexOf('.')
  return lastDotIdx >= 0 && path.indexOf('/', lastDotIdx) < 0
}

// Public: Retrieve the file extension of the specified path.
//
// The file extension is the portion of the last path segment starting from
// the last period. Differs from Node's path.extname in that the fallback value
// is configurable.
//
// path     - the path String in which to look for a file extension
// fallback - the fallback String to return if no file extension is present (default: '')
//
// Returns the String file extension (with the leading dot) or fallback.
export function extname (path, fallback = '') {
  const lastDotIdx = path.lastIndexOf('.')
  if (lastDotIdx < 0) return fallback
  // treat both '/' and '\\' as path separators (Windows support)
  if (path.indexOf('/', lastDotIdx) >= 0 || path.indexOf('\\', lastDotIdx) >= 0) return fallback
  return path.slice(lastDotIdx)
}

// Internal: Make a directory, creating all missing parent directories.
//
// dir - the String path of the directory to create
//
// Returns undefined. Throws if the path cannot be created.
// Public: Async-aware string replacement using matchAll.
// The replacer may return a string or a Promise<string>.
// The regex is treated as global regardless of its flags.
//
// str      - The String to perform replacements on.
// regex    - The RegExp pattern to match.
// replacer - An async function receiving the same arguments as String#replace callbacks.
//
// Returns a Promise<String> with all matches replaced.
export async function asyncReplace (str, regex, replacer) {
  const gRegex = regex.flags.includes('g')
    ? regex
    : new RegExp(regex.source, regex.flags + 'g')
  const matches = [...str.matchAll(gRegex)]
  if (matches.length === 0) return str
  const parts = []
  let lastIndex = 0
  for (const match of matches) {
    parts.push(str.slice(lastIndex, match.index))
    // Process replacements sequentially so state mutations (e.g. footnote registration)
    // are visible to subsequent replacements in the same string.
    parts.push(await replacer(...match, match.index, str))
    lastIndex = match.index + match[0].length
  }
  parts.push(str.slice(lastIndex))
  return parts.join('')
}

export async function mkdirP (dir) {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(dir, { recursive: true })
}

// ── Roman numeral helpers ─────────────────────────────────────────────────────

const ROMAN_NUMERALS_WITH_REDUCERS = [
  ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
]

const ROMAN_NUMERALS = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

// Internal: Convert an integer to a Roman numeral.
//
// val - the integer value to convert
//
// Returns the String Roman numeral.
export function intToRoman (val) {
  let result = ''
  for (const [l, i] of ROMAN_NUMERALS_WITH_REDUCERS) {
    const repeat = Math.floor(val / i)
    val %= i
    result += l.repeat(repeat)
  }
  return result
}

// Internal: Convert an uppercase Roman numeral to an integer.
//
// val - the String Roman numeral in uppercase to convert
//
// Returns the integer value.
export function romanToInt (val) {
  const valmap = [...val].map((c) => ROMAN_NUMERALS[c])
  let result = 0
  for (let idx = 0; idx < valmap.length; idx++) {
    const v = valmap[idx]
    const succ = valmap[idx + 1]
    result += (succ && succ > v) ? -v : v
  }
  return result
}

// Internal: Get the next value in a sequence.
//
// Handles integer sequences (numeric increment) and alphabetic sequences
// (ASCII letter increment with carry, matching Ruby's String#succ for the
// alphanumeric subset used by Asciidoctor list labels).
//
// current - the value to increment as a String or Number
//
// Returns the next value in the sequence.
export function nextval (current) {
  if (typeof current === 'number') return current + 1
  const intval = parseInt(current, 10)
  if (String(intval) === String(current)) return intval + 1
  // Mirrors Ruby's String#succ for single- and multi-character strings.
  // Strategy: find the rightmost ASCII-alphanumeric character and increment it
  // with carry.  If NO alphanumeric character exists, increment the rightmost
  // character's Unicode code point instead.
  const chars = [...current]  // split by Unicode code point (handles surrogate pairs)
  let hasAlnum = false
  for (let i = chars.length - 1; i >= 0; i--) {
    const code = chars[i].codePointAt(0)
    const isLower = code >= 97 && code <= 122
    const isUpper = code >= 65 && code <= 90
    const isDigit = code >= 48 && code <= 57
    if (!isLower && !isUpper && !isDigit) continue
    hasAlnum = true
    const atEnd = (isLower && code === 122) || (isUpper && code === 90) || (isDigit && code === 57)
    if (!atEnd) {
      chars[i] = String.fromCodePoint(code + 1)
      return chars.join('')
    }
    // Carry: wrap this char and continue to the next alphanumeric to the left.
    chars[i] = isLower ? 'a' : isUpper ? 'A' : '0'
    // Find next alphanumeric to carry into.
    let carried = false
    for (let j = i - 1; j >= 0; j--) {
      const c2 = chars[j].codePointAt(0)
      const l2 = c2 >= 97 && c2 <= 122
      const u2 = c2 >= 65 && c2 <= 90
      const d2 = c2 >= 48 && c2 <= 57
      if (!l2 && !u2 && !d2) continue
      const end2 = (l2 && c2 === 122) || (u2 && c2 === 90) || (d2 && c2 === 57)
      if (!end2) {
        chars[j] = String.fromCodePoint(c2 + 1)
        carried = true
        break
      }
      chars[j] = l2 ? 'a' : u2 ? 'A' : '0'
    }
    if (!carried) {
      // All alphanumeric characters wrapped — prepend carry character.
      const carry = isLower ? 'a' : isUpper ? 'A' : '1'
      return carry + chars.join('')
    }
    return chars.join('')
  }
  if (!hasAlnum) {
    // No alphanumeric chars: increment the rightmost character's code point.
    const last = chars.length - 1
    const code = chars[last].codePointAt(0)
    chars[last] = String.fromCodePoint(code + 1)
    return chars.join('')
  }
  return current
}