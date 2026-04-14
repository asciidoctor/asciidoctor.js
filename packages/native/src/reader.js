// ESM conversion of reader.rb
//
// Ruby-to-JavaScript notes:
//   - @lines is an Array used as a reversed stack: @lines[-1] is the next line.
//     In JS: this._lines[this._lines.length - 1] / this._lines.pop() / push().
//   - Ruby private methods called by subclasses (shift, unshift, unshift_all,
//     process_line, prepare_lines) use the _ prefix convention rather than JS
//     # private, because PreprocessorReader must be able to override/call them.
//   - JS # private fields are used only for data that is truly inaccessible to
//     subclasses and external callers (none here, to keep inheritance clean).
//   - PreprocessorReader overrides _shift() to strip the backslash from escaped
//     directives, mirroring the Ruby `def shift` override.
//   - PreprocessorReader overrides _prepareLines() to add front-matter handling
//     and indentation adjustment (mirrors `def prepare_lines`).
//   - The Logging mixin is implemented with inline helper methods; the logger
//     defaults to this._document?.logger ?? console.
//   - File I/O uses synchronous Node.js fs APIs (unavailable in browsers).
//   - URI-based includes require async fetch and are not yet implemented.
//   - Compliance.attribute_missing defaults to 'skip' until compliance.js exists.
//   - Parser.adjustIndentation is referenced but forwarded as a TODO.
//   - RUBY_ENGINE_OPAL branches are omitted.
//   - JRuby-specific unshift_all variant is omitted; the standard branch is used.

import {
  LF,
  MAX_INT,
  ATTR_REF_HEAD,
  LIST_CONTINUATION,
  ASCIIDOC_EXTENSIONS,
  SafeMode,
} from './constants.js'
import {
  ConditionalDirectiveRx,
  IncludeDirectiveRx,
  TagDirectiveRx,
  EvalExpressionRx,
} from './rx.js'
import { prepareSourceArray, prepareSourceString, rootname, isUriish } from './helpers.js'
import { LoggerManager, Logger } from './logging.js'

// ── Node.js fs (lazy, optional) ───────────────────────────────────────────────
let _fs
try { _fs = await import('node:fs') } catch {}

// ── Compliance fallback ───────────────────────────────────────────────────────
// TODO: replace with real import once compliance.js is available.
let Compliance
try {
  Compliance = (await import('./compliance.js')).Compliance
} catch {
  Compliance = { attribute_missing: 'skip' }
}

// ── path helpers (no node:path dependency) ───────────────────────────────────
function fsdirname (p) {
  if (!p) return '.'
  const idx = p.lastIndexOf('/')
  return idx < 0 ? '.' : idx === 0 ? '/' : p.slice(0, idx)
}
function fsbasename (p) {
  return p ? p.slice(p.lastIndexOf('/') + 1) : ''
}
function fileExists (path) {
  if (!_fs) return false
  try { _fs.accessSync(path, _fs.constants.F_OK); return true } catch { return false }
}

// ── adjustIndentation ─────────────────────────────────────────────────────────
// Port of Parser.adjust_indentation! from Ruby.
// Mutates `lines` in place to remove block indent, then optionally re-indent.
function _adjustIndentation (lines, indentSize, tabSize = 0) {
  if (lines.length === 0) return
  // Determine block indent (minimum leading spaces of non-blank lines)
  let blockIndent = null
  for (const line of lines) {
    if (line === '') continue
    const lineIndent = line.length - line.trimStart().length
    if (lineIndent === 0) { blockIndent = null; break }
    if (blockIndent === null || lineIndent < blockIndent) blockIndent = lineIndent
  }
  if (indentSize === 0) {
    if (blockIndent) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] !== '') lines[i] = lines[i].slice(blockIndent)
      }
    }
  } else {
    const newIndent = ' '.repeat(indentSize)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== '') {
        lines[i] = blockIndent ? newIndent + lines[i].slice(blockIndent) : newIndent + lines[i]
      }
    }
  }
}

// ── Cursor ────────────────────────────────────────────────────────────────────

export class Cursor {
  constructor (file, dir = null, path = null, lineno = 1) {
    this.file = file
    this.dir = dir
    this.path = path
    this.lineno = lineno
  }

  advance (num) { this.lineno += num }
  get lineInfo () { return `${this.path}: line ${this.lineno}` }
  toString () { return this.lineInfo }

  // Public API (mirrors Ruby Asciidoctor::Reader::Cursor)
  getLineNumber ()  { return this.lineno }
  getFile ()        { return this.file ?? undefined }
  getDirectory ()   { return this.dir }
  getPath ()        { return this.path }
}

// ── Reader ────────────────────────────────────────────────────────────────────

export class Reader {
  constructor (data = null, cursor = null, opts = {}) {
    if (!cursor) {
      this.file = null
      this._dir = '.'
      this.path = '<stdin>'
      this.lineno = 1
    } else if (typeof cursor === 'string') {
      this.file = cursor
      this._dir = fsdirname(cursor)
      this.path = fsbasename(cursor)
      this.lineno = 1
    } else {
      if ((this.file = cursor.file)) {
        this._dir = cursor.dir || fsdirname(this.file)
        this.path = cursor.path || fsbasename(this.file)
      } else {
        this._dir = cursor.dir || '.'
        this.path = cursor.path || '<stdin>'
      }
      this.lineno = cursor.lineno || 1
    }
    if (opts.document) this._document = opts.document
    this.sourceLines = this._prepareLines(data, opts)
    this._lines = this.sourceLines.slice().reverse()
    this._mark = null
    this._lookAhead = 0
    this.processLines = true
    this._unescapeNextLine = false
    this.unterminated = null
    this._saved = null
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  hasMoreLines () {
    if (this._lines.length === 0) { this._lookAhead = 0; return false }
    return true
  }

  empty () {
    if (this._lines.length === 0) { this._lookAhead = 0; return true }
    return false
  }
  eof () { return this.empty() }

  nextLineEmpty () { const l = this.peekLine(); return !l }
  isNextLineEmpty () { return this.nextLineEmpty() }

  // Public: Peek at the next line without consuming it.
  //
  // direct - When true, bypass processLine and return the raw stack top.
  //
  // Returns the String next line, or undefined if there are no more lines.
  peekLine (direct = false) {
    while (true) {
      const nextLine = this._lines[this._lines.length - 1]
      if (direct || this._lookAhead > 0) {
        return this._unescapeNextLine ? nextLine.slice(1) : nextLine
      }
      if (nextLine !== undefined) {
        const line = this.processLine(nextLine)
        if (line !== null && line !== undefined) return line
      } else {
        this._lookAhead = 0
        return undefined
      }
    }
  }

  // Public: Peek at the next num lines without consuming them.
  peekLines (num = null, direct = false) {
    const oldLookAhead = this._lookAhead
    const result = []
    const limit = num != null ? num : MAX_INT
    for (let i = 0; i < limit; i++) {
      const line = direct ? this._shift() : this.readLine()
      if (line !== undefined) {
        result.push(line)
      } else {
        if (direct) this.lineno--
        break
      }
    }
    if (result.length > 0) {
      this._unshiftAll(result)
      if (direct) this._lookAhead = oldLookAhead
    }
    return result
  }

  readLine () {
    return (this._lookAhead > 0 || this.hasMoreLines()) ? this._shift() : undefined
  }

  readLines () {
    const lines = []
    while (this.hasMoreLines()) lines.push(this._shift())
    return lines
  }
  readlines () { return this.readLines() }

  read () { return this.readLines().join(LF) }

  advance () { return this._shift() !== undefined }

  unshiftLine (lineToRestore) { this._unshift(lineToRestore) }
  restoreLine (lineToRestore) { this._unshift(lineToRestore) }

  unshiftLines (linesToRestore) { this._unshiftAll(linesToRestore) }
  restoreLines (linesToRestore) { this._unshiftAll(linesToRestore) }

  replaceNextLine (replacement) {
    this._shift()
    this._unshift(replacement)
    return true
  }
  replaceLine (replacement) { return this.replaceNextLine(replacement) }

  skipBlankLines () {
    if (this.empty()) return undefined
    let numSkipped = 0
    let nextLine
    while ((nextLine = this.peekLine()) !== undefined) {
      if (String(nextLine) !== '') return numSkipped
      this._shift()
      numSkipped++
    }
    return undefined
  }

  skipCommentLines () {
    if (this.empty()) return
    let nextLine
    while ((nextLine = this.peekLine()) !== undefined && nextLine !== '') {
      if (!nextLine.startsWith('//')) break
      if (nextLine.startsWith('///')) {
        const ll = nextLine.length
        if (!(ll > 3 && nextLine === '/'.repeat(ll))) break
        this.readLinesUntil({ terminator: nextLine, skipFirstLine: true, readLastLine: true, skipProcessing: true, context: 'comment' })
      } else {
        this._shift()
      }
    }
  }

  skipLineComments () {
    if (this.empty()) return []
    const commentLines = []
    let nextLine
    while ((nextLine = this.peekLine()) !== undefined && nextLine !== '') {
      if (!nextLine.startsWith('//')) break
      commentLines.push(this._shift())
    }
    return commentLines
  }

  terminate () {
    this.lineno += this._lines.length
    this._lines.length = 0
    this._lookAhead = 0
  }

  // Public: Read lines until a termination condition is met.
  //
  // options - Plain object:
  //   terminator            - String line at which to stop.
  //   breakOnBlankLines     - Stop on blank lines.
  //   breakOnListContinuation - Stop on a list continuation (+).
  //   skipFirstLine         - Skip the first line before scanning.
  //   preserveLastLine      - Push the terminating line back.
  //   readLastLine          - Include the terminating line in result.
  //   skipLineComments      - Skip line comments.
  //   skipProcessing        - Disable line preprocessing for this call.
  //   context               - Name used in unterminated-block warnings.
  //   cursor                - Starting cursor for unterminated-block warnings.
  // filter - Optional Function(line) → true to break.
  //
  // Returns a String Array.
  readLinesUntil (options = {}, filter = null) {
    const result = []
    let restoreProcessLines = false
    if (this.processLines && (options.skipProcessing || options.skip_processing)) {
      this.processLines = false
      restoreProcessLines = true
    }

    const terminator = options.terminator ?? null
    let startCursor, breakOnBlankLines, breakOnListContinuation
    if (terminator) {
      startCursor = options.cursor || this.cursor
      breakOnBlankLines = false
      breakOnListContinuation = false
    } else {
      breakOnBlankLines = options.breakOnBlankLines || options.break_on_blank_lines || false
      breakOnListContinuation = options.breakOnListContinuation || options.break_on_list_continuation || false
    }

    const skipComments = options.skipLineComments || options.skip_line_comments || false
    let lineRead = false
    let lineRestored = false
    let line

    if (options.skipFirstLine || options.skip_first_line) this._shift()

    while ((line = this.readLine()) !== undefined) {
      let shouldBreak = false
      if (terminator) {
        shouldBreak = line === terminator
      } else {
        if (breakOnBlankLines && line === '') {
          shouldBreak = true
        } else if (breakOnListContinuation && lineRead && line === LIST_CONTINUATION) {
          options.preserveLastLine = options.preserve_last_line = true
          shouldBreak = true
        } else if (filter && filter(line)) {
          shouldBreak = true
        }
      }

      if (shouldBreak) {
        if (options.readLastLine || options.read_last_line) result.push(line)
        if (options.preserveLastLine || options.preserve_last_line) {
          this._unshift(line)
          lineRestored = true
        }
        break
      }

      if (!(skipComments && line.startsWith('//') && !line.startsWith('///'))) {
        result.push(line)
        lineRead = true
      }
    }

    if (restoreProcessLines) {
      this.processLines = true
      if (lineRestored && !terminator) this._lookAhead--
    }

    if (terminator && terminator !== line) {
      const context = 'context' in options ? options.context : terminator
      if (context) {
        const sc = startCursor === 'at_mark' ? this.cursorAtMark() : startCursor
        this._logWarn(`unterminated ${context} block`, { sourceLocation: sc })
        this.unterminated = true
      }
    }

    return result
  }

  // ── Cursor helpers ──────────────────────────────────────────────────────────

  get cursor () { return new Cursor(this.file, this._dir, this.path, this.lineno) }
  cursorAtLine (lineno) { return new Cursor(this.file, this._dir, this.path, lineno) }
  cursorAtMark () { return this._mark ? new Cursor(...this._mark) : this.cursor }
  cursorBeforeMark () {
    if (this._mark) {
      const [mFile, mDir, mPath, mLineno] = this._mark
      return new Cursor(mFile, mDir, mPath, mLineno - 1)
    }
    return new Cursor(this.file, this._dir, this.path, this.lineno - 1)
  }
  cursorAtPrevLine () { return new Cursor(this.file, this._dir, this.path, this.lineno - 1) }

  mark () { this._mark = [this.file, this._dir, this.path, this.lineno] }

  lineInfo () { return `${this.path}: line ${this.lineno}` }

  lines () { return this._lines.slice().reverse() }
  string () { return this._lines.slice().reverse().join(LF) }
  source () { return this.sourceLines.join(LF) }

  // ── Save / restore ──────────────────────────────────────────────────────────

  save () {
    this._saved = {
      file: this.file,
      dir: this._dir,
      path: this.path,
      lineno: this.lineno,
      lines: [...this._lines],
      mark: this._mark,
      lookAhead: this._lookAhead,
      processLines: this.processLines,
      unescapeNextLine: this._unescapeNextLine,
      unterminated: this.unterminated,
    }
  }

  restoreSave () {
    if (!this._saved) return
    const s = this._saved
    this.file = s.file
    this._dir = s.dir
    this.path = s.path
    this.lineno = s.lineno
    this._lines = s.lines
    this._mark = s.mark
    this._lookAhead = s.lookAhead
    this.processLines = s.processLines
    this._unescapeNextLine = s.unescapeNextLine
    this.unterminated = s.unterminated
    this._saved = null
  }

  discardSave () { this._saved = null }

  toString () {
    return `#<Reader {path: ${JSON.stringify(this.path)}, line: ${this.lineno}}>`
  }

  // ── Internal (inheritable) ──────────────────────────────────────────────────

  // Internal: Shift the top line off the stack and increment lineno.
  // Subclasses may override to post-process consumed lines (see PreprocessorReader).
  _shift () {
    this.lineno++
    if (this._lookAhead > 0) this._lookAhead--
    return this._lines.pop()
  }

  // Internal: Push a line onto the stack and decrement lineno.
  _unshift (line) {
    this.lineno--
    this._lookAhead++
    this._lines.push(line)
  }

  // Internal: Restore multiple lines onto the stack.
  _unshiftAll (linesToRestore) {
    this.lineno -= linesToRestore.length
    this._lookAhead += linesToRestore.length
    this._lines.push(...linesToRestore.slice().reverse())
  }

  // Internal: Process a line on first visit. Returns the line unmodified by
  // default; subclasses override to evaluate preprocessor directives.
  processLine (line) {
    if (this.processLines) this._lookAhead++
    return line
  }

  // Internal: Prepare the source data into a String Array.
  // Subclasses override to add front-matter / indentation handling.
  _prepareLines (data, opts = {}) {
    const normalize = opts.normalize
    if (normalize) {
      const trimEnd = normalize !== 'chomp'
      return Array.isArray(data)
        ? prepareSourceArray(data, trimEnd)
        : prepareSourceString(data != null ? String(data) : '', trimEnd)
    }
    if (Array.isArray(data)) return [...data]
    if (data != null) return String(data).replace(/\n$/, '').split('\n')
    return []
  }

  // ── Public API (mirrors Ruby Asciidoctor::Reader) ───────────────────────────

  getCursor ()  { return this.cursor }
  getLines ()   { return this.sourceLines }
  getString ()  { return this.source() }
  getLogger ()  { return LoggerManager.logger }
  createLogMessage (text, context = {}) {
    return Logger.AutoFormattingMessage.attach({ text, ...context })
  }

  // ── Logging helpers ─────────────────────────────────────────────────────────

  get logger () { return this._document?.logger ?? console }

  _logWarn (msg, { sourceLocation, includeLocation } = {}) {
    let text = sourceLocation ? `${sourceLocation.lineInfo}: ${msg}` : msg
    if (includeLocation) text += ` (${includeLocation.lineInfo})`
    this.logger.warn(text)
  }
  _logError (msg, opts = {}) {
    let text = opts.sourceLocation ? `${opts.sourceLocation.lineInfo}: ${msg}` : msg
    if (opts.includeLocation) text += ` (${opts.includeLocation.lineInfo})`
    this.logger.error(text)
  }
  _logInfo (msg, { sourceLocation } = {}) {
    const text = sourceLocation ? `${sourceLocation.lineInfo}: ${msg}` : msg
    this.logger.info(text)
  }
}

// ── PreprocessorReader ────────────────────────────────────────────────────────

export class PreprocessorReader extends Reader {
  constructor (document, data = null, cursor = null, opts = {}) {
    if ('skip-front-matter' in document.attributes && !('skipFrontMatter' in opts)) {
      opts = { ...opts, skipFrontMatter: true }
    }
    // Pass document in opts so that _prepareLines (called from super) can access it.
    if (!opts.document) opts = { ...opts, document }
    super(data, cursor, opts)
    this._document = document
    this._sourcemap = document.sourcemap
    const defaultDepth = parseInt(document.attributes['max-include-depth'] ?? 64, 10)
    this._maxdepth = defaultDepth > 0
      ? { abs: defaultDepth, curr: defaultDepth, rel: defaultDepth }
      : null
    this.includeStack = []
    this._includes = document.catalog.includes
    this._skipping = false
    this._conditionalStack = []
    this._includeProcessorExtensions = null
  }

  get logger () { return this._document?.logger ?? console }

  // Override: drain conditional stack at EOS; treat blank lines as lines (not as EOF).
  // peekLine() returns undefined only at true EOF; '' for blank lines.
  hasMoreLines () { return this.peekLine() !== undefined }
  empty () { return this.peekLine() === undefined }
  eof () { return this.empty() }


  peekLine (direct = false) {
    const line = super.peekLine(direct)
    if (line !== undefined) return line
    if (this.includeStack.length === 0) {
      let endCursor = null
      this._conditionalStack = this._conditionalStack.filter((cond) => {
        const loc = cond.sourceLocation || (endCursor ??= this.cursorAtPrevLine())
        this._logError(
          `detected unterminated preprocessor conditional directive: ${cond.name}::${cond.target || ''}[${cond.expr || ''}]`,
          { sourceLocation: loc }
        )
        return false
      })
      return undefined
    }
    this._popInclude()
    return this.peekLine(direct)
  }

  // Override: strip leading backslash from escaped directives.
  _shift () {
    if (this._unescapeNextLine) {
      this._unescapeNextLine = false
      const line = super._shift()
      return line.slice(1)
    }
    return super._shift()
  }

  // Public: Push new source onto the reader, switching the include context.
  //
  // Returns this reader.
  pushInclude (data, file = null, path = null, lineno = 1, attributes = {}) {
    this.includeStack.push([this._lines, this.file, this._dir, this.path, this.lineno, this._maxdepth, this.processLines])

    if ((this.file = file)) {
      this._dir = fsdirname(String(file))
      this.path = path || fsbasename(String(file))
      const fileStr = String(file)
      if ((this.processLines = Object.keys(ASCIIDOC_EXTENSIONS).some(ext => fileStr.endsWith(ext)))) {
        const key = this.path.slice(0, this.path.lastIndexOf('.'))
        this._includes[key] ??= ('partial-option' in attributes) ? null : true
      }
    } else {
      this._dir = '.'
      this.processLines = true
      if ((this.path = path)) {
        this._includes[rootname(this.path)] ??= ('partial-option' in attributes) ? null : true
      } else {
        this.path = '<stdin>'
      }
    }

    this.lineno = lineno

    if (this._maxdepth && ('depth' in attributes)) {
      const relMaxdepth = parseInt(attributes.depth, 10)
      if (relMaxdepth > 0) {
        const absMaxdepth = this._maxdepth.abs
        let currMaxdepth = this.includeStack.length + relMaxdepth
        let effRel = relMaxdepth
        if (currMaxdepth > absMaxdepth) currMaxdepth = effRel = absMaxdepth
        this._maxdepth = { abs: absMaxdepth, curr: currMaxdepth, rel: effRel }
      } else {
        this._maxdepth = { abs: this._maxdepth.abs, curr: this.includeStack.length, rel: 0 }
      }
    }

    this._lines = this._prepareLines(data, {
      include: true,
      normalize: this.processLines || 'chomp',
      indent: attributes.indent,
      skipFrontMatter: 'skip-front-matter-option' in attributes,
    })

    if (this._lines.length === 0) {
      this._popInclude()
    } else if ('leveloffset' in attributes) {
      const leveloffset = this._document.attr('leveloffset')
      const resetLine = leveloffset ? `:leveloffset: ${leveloffset}` : ':leveloffset!:'
      const setLine = `:leveloffset: ${attributes.leveloffset}`
      // Build stack-order array: setLine at end (read first), resetLine at start (read last)
      this._lines = [resetLine, '', ...this._lines.slice().reverse(), '', setLine]
      this.lineno -= 2
    } else {
      this._lines.reverse()
    }
    this._lookAhead = 0
    return this
  }

  get includeDepth () { return this.includeStack.length }

  exceedsMaxDepth () {
    return this._maxdepth && this.includeStack.length >= this._maxdepth.curr && this._maxdepth.rel
  }
  exceededMaxDepth () { return this.exceedsMaxDepth() }

  hasIncludeProcessors () {
    if (this._includeProcessorExtensions === null) {
      const exts = this._document.extensions?.()
      if (exts && (this._includeProcessorExtensions = exts.includeProcessors?.())) return true
      this._includeProcessorExtensions = false
    }
    return this._includeProcessorExtensions !== false
  }

  createIncludeCursor (file, path, lineno) {
    return new Cursor(String(file), fsdirname(String(file)), path, lineno)
  }

  toString () {
    return `#<PreprocessorReader {path: ${JSON.stringify(this.path)}, line: ${this.lineno}, include depth: ${this.includeStack.length}}>`
  }

  // Override: save PreprocessorReader-specific fields in addition to Reader fields.
  save () {
    super.save()
    Object.assign(this._saved, {
      maxdepth: this._maxdepth,
      skipping: this._skipping,
      conditionalStack: this._conditionalStack.map(e => ({ ...e })),
      includeStack: [...this.includeStack],
    })
  }

  // Override: also restore PreprocessorReader-specific fields.
  restoreSave () {
    if (!this._saved) return
    this._maxdepth = this._saved.maxdepth
    this._skipping = this._saved.skipping
    this._conditionalStack = this._saved.conditionalStack
    this.includeStack = this._saved.includeStack
    super.restoreSave()
  }

  // Override: add front-matter stripping and indentation adjustment.
  _prepareLines (data, opts = {}) {
    const result = super._prepareLines(data, opts)

    if (opts.skipFrontMatter) {
      const frontMatter = this._skipFrontMatter(result)
      if (frontMatter !== null && !opts.include) {
        this._document.attributes['front-matter'] = frontMatter.join(LF)
      }
    }

    if (opts.include) {
      if (opts.indent != null) {
        const indentVal = parseInt(opts.indent, 10) || 0
        const tabsize = parseInt(this._document.attr('tabsize') ?? 0, 10)
        _adjustIndentation(result, indentVal, tabsize)
      }
    } else {
      while (result.length > 0 && result[result.length - 1] === '') result.pop()
    }

    return result
  }

  // Override: evaluate preprocessor directives as lines are visited.
  processLine (line) {
    if (!this.processLines) return line

    if (line === '') {
      if (this._skipping) { super._shift(); return undefined }
      this._lookAhead++
      return line
    }

    if (line.endsWith(']') && !line.startsWith('[') && line.includes('::')) {
      if (line.includes('if')) {
        const m = ConditionalDirectiveRx.exec(line)
        if (m) {
          const [, escape, name, target, delimiter, text] = m
          if (escape === '\\') {
            this._unescapeNextLine = true
            this._lookAhead++
            return line.slice(1)
          }
          if (this._preprocessConditionalDirective(name, target || '', delimiter || null, text || null)) {
            super._shift()
            return undefined
          }
          this._lookAhead++
          return line
        }
      }
      if (this._skipping) { super._shift(); return undefined }
      if (line.startsWith('inc') || line.startsWith('\\inc')) {
        const m = IncludeDirectiveRx.exec(line)
        if (m) {
          const [, escape, target, attrlist] = m
          if (escape === '\\') {
            this._unescapeNextLine = true
            this._lookAhead++
            return line.slice(1)
          }
          if (this._preprocessIncludeDirective(target, attrlist ?? null)) return undefined
          this._lookAhead++
          return line
        }
      }
      this._lookAhead++
      return line
    }

    if (this._skipping) { super._shift(); return undefined }
    this._lookAhead++
    return line
  }

  // ── Private preprocessor logic ──────────────────────────────────────────────

  // Internal: Evaluate a conditional directive (ifdef/ifndef/ifeval/endif).
  // Returns true if the cursor should advance past this line.
  _preprocessConditionalDirective (name, target, delimiter, text) {
    const noTarget = target === ''
    if (!noTarget) target = target.toLowerCase()

    if (name === 'endif') {
      if (text) {
        this._logError(`malformed preprocessor directive - text not permitted: endif::${target}[${text}]`, { sourceLocation: this.cursor })
      } else if (this._conditionalStack.length === 0) {
        this._logError(`unmatched preprocessor directive: endif::${target}[]`, { sourceLocation: this.cursor })
      } else {
        const top = this._conditionalStack[this._conditionalStack.length - 1]
        if (noTarget || target === top.target) {
          this._conditionalStack.pop()
          this._skipping = this._conditionalStack.length === 0
            ? false
            : this._conditionalStack[this._conditionalStack.length - 1].skipping
        } else {
          this._logError(`mismatched preprocessor directive: endif::${target}[], expected endif::${top.target || ''}[]`, { sourceLocation: this.cursor })
        }
      }
      return true
    }

    let skip
    if (this._skipping) {
      if (name === 'ifeval') {
        if (!(noTarget && text && EvalExpressionRx.test(text.trim()))) return true
      } else if (noTarget) {
        return true
      }
      skip = false
    } else {
      const attrs = this._document.attributes
      if (name === 'ifdef') {
        if (noTarget) {
          this._logError(`malformed preprocessor directive - missing target: ifdef::[${text}]`, { sourceLocation: this.cursor })
          return true
        }
        skip = delimiter === ',' ? !target.split(',').some(a => a in attrs)
          : delimiter === '+' ? target.split('+').some(a => !(a in attrs))
          : !(target in attrs)
      } else if (name === 'ifndef') {
        if (noTarget) {
          this._logError(`malformed preprocessor directive - missing target: ifndef::[${text}]`, { sourceLocation: this.cursor })
          return true
        }
        skip = delimiter === ',' ? target.split(',').some(a => a in attrs)
          : delimiter === '+' ? target.split('+').every(a => a in attrs)
          : (target in attrs)
      } else if (name === 'ifeval') {
        if (!noTarget) {
          this._logError(`malformed preprocessor directive - target not permitted: ifeval::${target}[${text}]`, { sourceLocation: this.cursor })
          return true
        }
        const m = text && EvalExpressionRx.exec(text.trim())
        if (m) {
          try {
            skip = !this._evalOp(this._resolveExprVal(m[1]), m[2], this._resolveExprVal(m[3]))
          } catch { skip = true }
        } else {
          this._logError(`malformed preprocessor directive - ${text ? 'invalid expression' : 'missing expression'}: ifeval::[${text}]`, { sourceLocation: this.cursor })
          return true
        }
      }
    }

    if (name === 'ifeval') {
      if (skip) this._skipping = true
      this._conditionalStack.push({ name, expr: text, skip, skipping: this._skipping, sourceLocation: this._sourcemap ? this.cursor : null })
    } else if (text) {
      if (!this._skipping && !skip) {
        this.replaceNextLine(text.trimEnd())
        // Push a dummy line to stand in for the opening conditional directive
        this._lines.push('')
        if (text.startsWith('include::')) this._lookAhead--
      }
    } else {
      if (skip) this._skipping = true
      this._conditionalStack.push({ name, target, skip, skipping: this._skipping, sourceLocation: this._sourcemap ? this.cursor : null })
    }

    return true
  }

  // Internal: Evaluate a conditional include directive.
  // Returns true if the line under the cursor was consumed or changed.
  _preprocessIncludeDirective (target, attrlist) {
    const doc = this._document
    let expandedTarget = target

    if (expandedTarget.includes(ATTR_REF_HEAD)) {
      const attrMissing = doc.attributes['attribute-missing'] || Compliance.attribute_missing
      expandedTarget = doc.subAttributes(target, { attributeMissing: attrMissing === 'warn' ? 'drop-line' : attrMissing })
      if (expandedTarget === '') {
        const parsedAttrs = attrlist ? doc.parseAttributes(attrlist, [], { subInput: true }) : {}
        if ('optional-option' in parsedAttrs) {
          this._logInfo(`optional include dropped because resolved target is blank: include::${target}[${attrlist ?? ''}]`, { sourceLocation: this.cursor })
          super._shift()
          return true
        }
        if (attrMissing === 'drop-line') {
          this._logInfo(`include dropped due to missing attribute: include::${target}[${attrlist ?? ''}]`, { sourceLocation: this.cursor })
          super._shift()
          return true
        }
        this._logWarn(`include dropped because resolved target is blank: include::${target}[${attrlist ?? ''}]`, { sourceLocation: this.cursor })
        return this.replaceNextLine(`Unresolved directive in ${this.path} - include::${target}[${attrlist ?? ''}]`)
      }
    }

    if (this.hasIncludeProcessors()) {
      const ext = this._includeProcessorExtensions.find(c => c.instance.handles(doc, expandedTarget))
      if (ext) {
        super._shift()
        const pa = attrlist ? doc.parseAttributes(attrlist, [], { subInput: true }) : {}
        ext.processMethod(doc, this, expandedTarget, pa)
        return true
      }
    }

    if (doc.safe >= SafeMode.SECURE) {
      const lt = expandedTarget.includes(' ') ? `pass:c[${expandedTarget}]` : expandedTarget
      const la = doc.hasAttr('compat-mode') ? (attrlist ?? '') : `role=include${attrlist ? ',' + attrlist : ''}`
      return this.replaceNextLine(`link:${lt}[${la}]`)
    }

    if (!this._maxdepth) return undefined

    if (this.includeStack.length >= this._maxdepth.curr) {
      this._logError(`maximum include depth of ${this._maxdepth.rel} exceeded`, { sourceLocation: this.cursor })
      return undefined
    }

    const parsedAttrs = attrlist ? doc.parseAttributes(attrlist, [], { subInput: true }) : {}
    const resolution = this._resolveIncludePath(expandedTarget, attrlist, parsedAttrs)
    if (!Array.isArray(resolution)) return resolution
    const [incPath, targetType, relpath] = resolution

    if (targetType === 'uri') {
      // TODO: URI includes require async fetch — not yet supported synchronously
      this._logWarn(`URI includes require async fetch (not yet supported): ${incPath}`, { sourceLocation: this.cursor })
      return this.replaceNextLine(`Unresolved directive in ${this.path} - include::${expandedTarget}[${attrlist ?? ''}]`)
    }

    let incLinenos = null
    let incTags = null
    if (attrlist) {
      if ('lines' in parsedAttrs && parsedAttrs.lines !== '') {
        incLinenos = []
        for (const ld of this._splitDelimitedValue(parsedAttrs.lines)) {
          if (ld.includes('..')) {
            const sep = ld.indexOf('..')
            const from = parseInt(ld.slice(0, sep), 10)
            const toStr = ld.slice(sep + 2)
            if (toStr === '' || parseInt(toStr, 10) < 0) {
              incLinenos.push(from, Infinity)
            } else {
              const to = parseInt(toStr, 10)
              for (let i = from; i <= to; i++) incLinenos.push(i)
            }
          } else {
            incLinenos.push(parseInt(ld, 10))
          }
        }
        incLinenos = incLinenos.length > 0 ? [...new Set(incLinenos)].sort((a, b) => a - b) : null
      } else if ('tag' in parsedAttrs) {
        const tag = parsedAttrs.tag
        if (tag && tag !== '!') incTags = tag.startsWith('!') ? { [tag.slice(1)]: false } : { [tag]: true }
      } else if ('tags' in parsedAttrs) {
        incTags = {}
        for (const td of this._splitDelimitedValue(parsedAttrs.tags)) {
          if (td && td !== '!') {
            incTags[td.startsWith('!') ? td.slice(1) : td] = !td.startsWith('!')
          }
        }
        if (Object.keys(incTags).length === 0) incTags = null
      }
    }

    try {
      if (incLinenos) {
        const { incLines, incOffset } = this._readFileByLinenos(incPath, incLinenos)
        super._shift()
        if (incOffset !== null) {
          parsedAttrs['partial-option'] = ''
          this.pushInclude(incLines, incPath, relpath, incOffset, parsedAttrs)
        }
      } else if (incTags) {
        const { incLines, incOffset } = this._readFileByTags(incPath, expandedTarget, targetType, incTags, parsedAttrs)
        super._shift()
        if (incOffset !== null) this.pushInclude(incLines, incPath, relpath, incOffset, parsedAttrs)
      } else {
        let incContent
        try {
          incContent = _fs.readFileSync(incPath, 'utf8')
          super._shift()
        } catch {
          this._logError(`include ${targetType} not readable: ${incPath}`, { sourceLocation: this.cursor })
          return this.replaceNextLine(`Unresolved directive in ${this.path} - include::${expandedTarget}[${attrlist ?? ''}]`)
        }
        this.pushInclude(incContent, incPath, relpath, 1, parsedAttrs)
      }
    } catch {
      this._logError(`include ${targetType} not readable: ${incPath}`, { sourceLocation: this.cursor })
      return this.replaceNextLine(`Unresolved directive in ${this.path} - include::${expandedTarget}[${attrlist ?? ''}]`)
    }
    return true
  }

  // Internal: Resolve the include target to [incPath, targetType, relpath] or a Boolean.
  _resolveIncludePath (target, attrlist, attributes) {
    const doc = this._document
    if (isUriish(target) || typeof this._dir !== 'string') {
      if (!doc.attr('allow-uri-read')) {
        this._logWarn(`cannot include contents of URI: ${target} (allow-uri-read attribute not enabled)`, { sourceLocation: this.cursor })
        const lt = target.includes(' ') ? `pass:c[${target}]` : target
        const la = doc.hasAttr('compat-mode') ? (attrlist ?? '') : `role=include${attrlist ? ',' + attrlist : ''}`
        return this.replaceNextLine(`link:${lt}[${la}]`)
      }
      return [target, 'uri', target]
    }

    const incPath = doc.normalizeSystemPath(target, this._dir, null, { targetName: 'include file' })
    if (!fileExists(incPath)) {
      if ('optional-option' in attributes) {
        this._logInfo(`optional include dropped because include file not found: ${incPath}`, { sourceLocation: this.cursor })
        super._shift()
        return true
      }
      this._logError(`include file not found: ${incPath}`, { sourceLocation: this.cursor })
      return this.replaceNextLine(`Unresolved directive in ${this.path} - include::${target}[${attrlist ?? ''}]`)
    }
    const relpath = doc.pathResolver.relativePath(incPath, doc.baseDir)
    return [incPath, 'file', relpath]
  }

  // Internal: Pop the top include context and restore state.
  _popInclude () {
    if (this.includeStack.length === 0) return
    ;[this._lines, this.file, this._dir, this.path, this.lineno, this._maxdepth, this.processLines] = this.includeStack.pop()
    this._lookAhead = 0
  }

  // Internal: Read lines filtered by line-number ranges.
  _readFileByLinenos (incPath, incLinenos) {
    const remaining = [...incLinenos]
    const fileLines = _fs.readFileSync(incPath, 'utf8').split('\n')
    const incLines = []
    let incOffset = null
    let selectRemaining = false
    for (let idx = 0; idx < fileLines.length; idx++) {
      const incLineno = idx + 1
      const l = fileLines[idx] + (idx < fileLines.length - 1 ? '\n' : '')
      if (selectRemaining || (remaining[0] === Infinity && (selectRemaining = true))) {
        incOffset ??= incLineno
        incLines.push(l)
      } else if (remaining[0] === incLineno) {
        incOffset ??= incLineno
        incLines.push(l)
        remaining.shift()
        if (remaining.length === 0) break
      }
    }
    return { incLines, incOffset }
  }

  // Internal: Read lines filtered by tag directives.
  _readFileByTags (incPath, expandedTarget, targetType, incTagsIn, parsedAttrs) {
    const tags = { ...incTagsIn }
    let select, baseSelect, wildcard
    if ('**' in tags) {
      select = baseSelect = tags['**']; delete tags['**']
      if ('*' in tags) { wildcard = tags['*']; delete tags['*'] }
      else if (!select && Object.values(tags)[0] === false) wildcard = true
    } else if ('*' in tags) {
      if (Object.keys(tags)[0] === '*') { select = baseSelect = !(wildcard = tags['*']) }
      else { select = baseSelect = false; wildcard = tags['*'] }
      delete tags['*']
    } else {
      select = baseSelect = !Object.values(tags).includes(true)
    }

    const fileLines = _fs.readFileSync(incPath, 'utf8').split('\n')
    const incLines = []
    let incOffset = null
    const tagStack = []
    const tagsSelected = new Set()
    let activeTag = null

    for (let idx = 0; idx < fileLines.length; idx++) {
      const incLineno = idx + 1
      const l = fileLines[idx] + (idx < fileLines.length - 1 ? '\n' : '')
      if (l.includes('::') && l.includes('[]')) {
        const m = TagDirectiveRx.exec(l)
        if (m) {
          const [, isEnd, thisTag] = m
          if (isEnd) {
            if (thisTag === activeTag) {
              tagStack.pop()
              ;[activeTag, select] = tagStack.length === 0 ? [null, baseSelect] : tagStack[tagStack.length - 1]
            } else if (thisTag in tags) {
              const ic = this.createIncludeCursor(incPath, expandedTarget, incLineno)
              const si = tagStack.findLastIndex(([k]) => k === thisTag)
              if (si >= 0) {
                tagStack.splice(si, 1)
                this._logWarn(`mismatched end tag (expected '${activeTag}' but found '${thisTag}') at line ${incLineno} of include ${targetType}: ${incPath}`, { sourceLocation: this.cursor, includeLocation: ic })
              } else {
                this._logWarn(`unexpected end tag '${thisTag}' at line ${incLineno} of include ${targetType}: ${incPath}`, { sourceLocation: this.cursor, includeLocation: ic })
              }
            }
          } else if (thisTag in tags) {
            if ((select = tags[thisTag])) tagsSelected.add(thisTag)
            tagStack.push([(activeTag = thisTag), select, incLineno])
          } else if (wildcard !== undefined) {
            select = activeTag && !select ? false : wildcard
            tagStack.push([(activeTag = thisTag), select, incLineno])
          }
          continue
        }
      }
      if (select) { incOffset ??= incLineno; incLines.push(l) }
    }

    for (const [tagName, , tagLineno] of tagStack) {
      const ic = this.createIncludeCursor(incPath, expandedTarget, tagLineno)
      this._logWarn(`detected unclosed tag '${tagName}' starting at line ${tagLineno} of include ${targetType}: ${incPath}`, { sourceLocation: this.cursor, includeLocation: ic })
    }

    const missingTags = Object.entries(tags).filter(([, v]) => v).map(([k]) => k).filter(k => !tagsSelected.has(k))
    if (missingTags.length > 0) {
      this._logWarn(`tag${missingTags.length > 1 ? 's' : ''} '${missingTags.join(', ')}' not found in include ${targetType}: ${incPath}`, { sourceLocation: this.cursor })
    }

    if (!baseSelect || wildcard === false || Object.keys(tags).length > 0) {
      parsedAttrs['partial-option'] = ''
    }

    return { incLines, incOffset }
  }

  // Internal: Strip YAML/TOML front matter from the data Array (in-place).
  // Returns the front-matter lines, or null if no front matter was found.
  _skipFrontMatter (data, incrementLinenos = true) {
    const delim = data[0]
    if (delim !== '---' && delim !== '+++') return null
    const original = [...data]
    data.shift()
    const frontMatter = []
    if (incrementLinenos) this.lineno++
    let eof = false
    while (!(eof = data.length === 0) && data[0] !== delim) {
      frontMatter.push(data.shift())
      if (incrementLinenos) this.lineno++
    }
    if (eof) {
      data.length = 0; data.push(...original)
      if (incrementLinenos) this.lineno -= original.length
      return null
    }
    data.shift()
    if (incrementLinenos) this.lineno++
    return frontMatter
  }

  // Internal: Resolve the value of one side of an ifeval expression.
  _resolveExprVal (val) {
    let quoted = false
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      quoted = true
      val = val.slice(1, val.length - 1)
    }
    if (val.includes(ATTR_REF_HEAD)) {
      val = this._document.subAttributes(val, { attributeMissing: 'drop' })
    }
    if (quoted) return val
    if (val === '') return null
    if (val === 'true') return true
    if (val === 'false') return false
    if (val.trimEnd() === '') return ' '
    if (val.includes('.')) return parseFloat(val)
    return parseInt(val, 10)
  }

  // Internal: Evaluate a binary comparison.
  _evalOp (lhs, op, rhs) {
    // Reject comparisons that mix boolean with non-boolean (invalid in Ruby — throws TypeError).
    if ((typeof lhs === 'boolean') !== (typeof rhs === 'boolean')) throw new TypeError('incompatible operand types')
    if (op === '==') return lhs === rhs
    if (op === '!=') return lhs !== rhs
    if (op === '<') return lhs < rhs
    if (op === '>') return lhs > rhs
    if (op === '<=') return lhs <= rhs
    if (op === '>=') return lhs >= rhs
    return false
  }

  // Internal: Split a delimited value on comma (if present), otherwise semicolon.
  _splitDelimitedValue (val) {
    return val.includes(',') ? val.split(',') : val.split(';')
  }
}