// ESM conversion of load.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby module methods on Asciidoctor → named exports load() and loadFile().
//   - Ruby File === input branch → Node.js fs.createReadStream / fs.readFileSync
//     adapted to check for an object with a .read() method (duck-typing).
//   - Ruby File.absolute_path / File.dirname / Helpers.basename / Helpers.extname
//     → implemented using Node's node:path and the helpers.js module.
//   - The timings option is passed through but its start/record calls are no-ops
//     unless a real Timings object is supplied (interface: { start(label), record(label) }).
//   - LoggerManager from logging.js is used to honour the :logger option.
//   - SpaceDelimiterRx / EscapedSpaceRx / NULL are imported from rx.js / constants.js
//     for string-form attributes parsing (mirrors the Ruby gsub/split dance).
//   - Document is lazily imported to avoid circular-dependency issues at module load.

import { SpaceDelimiterRx, EscapedSpaceRx } from './rx.js'
import { NULL } from './constants.js'
import { LoggerManager, NullLogger } from './logging.js'
import { basename, extname } from './helpers.js'

// ── load ──────────────────────────────────────────────────────────────────────

// Public: Parse the AsciiDoc source input into a Document.
//
// Accepts input as a Node.js Readable stream (or any object with a read()
// method), a String, or a String Array. If the input is a file descriptor
// object produced by openFile() / Node's fs.openSync(), pass a plain object
// with { path, read() } instead; the function sets docfile/docdir/docname
// attributes automatically.
//
// input   - the AsciiDoc source as a Readable, String, String Array, or
//           a file-like object with { path: String, read(): String, mtime? }.
// options - a plain object of options to control processing (default: {}).
//           See Document for the full list of recognised keys.
//           Notable keys:
//             :attributes - String, Array, or Object of document attributes
//             :parse      - set to false to skip parsing after Document creation
//             :logger     - Logger instance to use for this call
//             :timings    - Timings object with start()/record() interface
//
// Returns a Promise that resolves to the Document.
export async function load (input, options = {}) {
  // Shallow-copy options so we don't mutate the caller's object.
  options = Object.assign({}, options)

  const timings = options.timings ?? null
  if (timings) timings.start('read')

  // ── Logger override ───────────────────────────────────────────────────────
  if ('logger' in options) {
    const logger = options.logger
    if (logger !== LoggerManager.logger) {
      LoggerManager.logger = logger ?? new NullLogger()
    }
  }

  // ── Attributes normalisation ──────────────────────────────────────────────
  let attrs = options.attributes
  if (!attrs) {
    attrs = {}
  } else if (typeof attrs === 'string') {
    // Condense non-escaped whitespace runs to NULL, unescape escaped spaces, split on NULL.
    attrs = _parseAttributeString(attrs)
  } else if (Array.isArray(attrs)) {
    attrs = _parseAttributeArray(attrs)
  } else if (typeof attrs === 'object') {
    attrs = Object.assign({}, attrs)
  } else {
    throw new TypeError(`illegal type for attributes option: ${typeof attrs}`)
  }

  // ── Input reading ─────────────────────────────────────────────────────────
  let source
  if (input && typeof input === 'object' && typeof input.read === 'function') {
    // Duck-typed file-like object: { path?, mtime?, read() }
    if (input.path) {
      // Treat it like a File object: resolve path, set docfile/docdir/docname.
      const nodePath = await _requirePath()
      const inputPath = nodePath.resolve(input.path)
      if (input.mtime) options.input_mtime = input.mtime
      attrs.docfile = inputPath
      attrs.docdir  = nodePath.dirname(inputPath)
      const docfilesuffix = extname(inputPath)
      attrs.docfilesuffix = docfilesuffix
      attrs.docname = basename(inputPath, docfilesuffix)
    }
    source = await _readStream(input)
  } else if (typeof input === 'string') {
    source = input
  } else if (Array.isArray(input)) {
    source = input.slice()
  } else if (input) {
    throw new TypeError(`unsupported input type: ${typeof input}`)
  }

  if (timings) {
    timings.record('read')
    timings.start('parse')
  }

  options.attributes = attrs

  // ── Document construction + optional parse ────────────────────────────────
  let doc
  try {
    // Pre-load circular deps into the _deps cache before constructing Document.
    // Also pre-warm the converter cache so _createConverter can run synchronously.
    const [{ Document, _deps }, readerMod, parserMod, { Converter }, { BACKEND_ALIASES }] = await Promise.all([
      import('./document.js'),
      import('./reader.js'),
      import('./parser.js'),
      import('./converter.js'),
      import('./constants.js'),
      import('./syntaxHighlighter/highlightjs.js'),
    ])
    _deps['reader.js'] = readerMod
    _deps['parser.js'] = parserMod
    let backend = String(attrs.backend || options.backend || 'html5')
    // Strip soft-set modifier (@) and value-based soft-set (ending with @)
    if (backend.endsWith('@')) backend = backend.slice(0, -1)
    if (backend.startsWith('xhtml')) backend = `html${backend.slice(5)}`  // xhtml5 → html5
    backend = BACKEND_ALIASES[backend] ?? backend
    await Converter.create(backend, {})
    doc = new Document(source, options)
    if (options.parse !== false) {
      await doc.parse()
    }
  } catch (e) {
    const docfile = attrs.docfile || '<stdin>'
    const context = `asciidoctor: FAILED: ${docfile}: Failed to load AsciiDoc document`
    let wrapped
    try {
      wrapped = new Error(`${context} - ${e.message}`)
      wrapped.stack = e.stack
      wrapped.cause = e
    } catch {
      wrapped = e
    }
    throw wrapped
  }

  if (timings) timings.record('parse')
  return doc
}

// ── loadFile ──────────────────────────────────────────────────────────────────

// Public: Parse the contents of the AsciiDoc source file into a Document.
//
// filename - the String path to the AsciiDoc source file
// options  - a plain object of options (default: {})
//
// Returns a Promise that resolves to the Document.
export async function loadFile (filename, options = {}) {
  const { readFile } = await import('node:fs/promises')
  const nodePath = await _requirePath()
  const absPath  = nodePath.resolve(filename)
  const content  = await readFile(absPath, 'utf8')
  // Build a file-like object so load() can set docfile/docdir/docname.
  const { stat } = await import('node:fs/promises')
  let mtime
  try {
    const s = await stat(absPath)
    mtime = s.mtime
  } catch { /* ignore */ }
  const fileObj = {
    path: absPath,
    mtime,
    read () { return content },
  }
  return load(fileObj, options)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Internal: Parse a whitespace-delimited attribute string into a plain object.
//
// Mirrors the Ruby idiom:
//   attrs.gsub(SpaceDelimiterRx, '\1' + NULL).gsub(EscapedSpaceRx, '\1').split(NULL)
//
// Returns a plain object { key => value }.
function _parseAttributeString (str) {
  const condensed = str
    .replace(SpaceDelimiterRx, '$1' + NULL)
    .replace(EscapedSpaceRx, '$1')
  const result = {}
  for (const entry of condensed.split(NULL)) {
    if (!entry) continue
    const eqIdx = entry.indexOf('=')
    if (eqIdx < 0) {
      result[entry] = ''
    } else {
      result[entry.slice(0, eqIdx)] = entry.slice(eqIdx + 1)
    }
  }
  return result
}

// Internal: Parse an array of "key=value" entries into a plain object.
//
// Returns a plain object { key => value }.
function _parseAttributeArray (arr) {
  const result = {}
  for (const entry of arr) {
    const eqIdx = entry.indexOf('=')
    if (eqIdx < 0) {
      result[entry] = ''
    } else {
      result[entry.slice(0, eqIdx)] = entry.slice(eqIdx + 1)
    }
  }
  return result
}

// Internal: Read all data from an object that has a .read() method.
// Supports both synchronous (returns string) and async (returns Promise) variants.
//
// Returns a Promise that resolves to a String.
async function _readStream (readable) {
  const data = readable.read()
  return (data instanceof Promise) ? data : Promise.resolve(data ?? '')
}

// Internal: Lazily import node:path to avoid issues in browser / Opal environments.
//
// Returns a Promise that resolves to the node:path module.
async function _requirePath () {
  return import('node:path')
}
