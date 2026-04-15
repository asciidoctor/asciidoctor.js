// ESM conversion of reader_test.rb
// Tests for the Reader and PreprocessorReader classes.

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { load } from '../src/load.js'
import { Reader, PreprocessorReader } from '../src/reader.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss } from './helpers.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, 'fixtures')

const SAMPLE_DATA = ['first line', 'second line', 'third line']

// Creates an empty document (loaded from an empty string).
const emptyDocument = (opts = {}) => load('', { safe: 'safe', ...opts })

// Creates a document from a string.
const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })

// Converts a string to embedded HTML.
const convertStringToEmbedded = async (input, opts = {}) => (await documentFromString(input, opts)).convert()

// Helper: assert that a MemoryLogger has multiple messages.
function assertMessages (logger, expected) {
  assert.equal(logger.messages.length, expected.length, `Expected ${expected.length} messages but got ${logger.messages.length}: ${JSON.stringify(logger.messages)}`)
  for (const [severity, text] of expected) {
    assertMessage(logger, severity, text)
  }
}

// Helper: assert that a MemoryLogger has a message at the given severity containing the text.
// If text starts with '~', it's a substring match; otherwise exact match.
function assertMessage (logger, severity, text) {
  const sev = severity.toUpperCase()
  const substring = text.startsWith('~') ? text.slice(1) : text
  const found = logger.messages.some((m) => {
    if (m.severity.toUpperCase() !== sev) return false
    const msgText = typeof m.message === 'string' ? m.message : (m.message?.text ?? String(m.message))
    return msgText.includes(substring)
  })
  assert.ok(found, `Expected ${sev} message containing "${substring}" but got: ${JSON.stringify(logger.messages)}`)
}

// Helper: use a MemoryLogger for the duration of a callback, then restore.
async function usingMemoryLogger (fn) {
  const defaultLogger = LoggerManager.logger
  const logger = new MemoryLogger()
  LoggerManager.logger = logger
  try {
    await fn(logger)
  } finally {
    LoggerManager.logger = defaultLogger
  }
}

// ── Reader ────────────────────────────────────────────────────────────────────

describe('Reader', () => {
  // ── Prepare lines ──────────────────────────────────────────────────────────

  describe('Prepare lines', () => {
    test('should prepare lines from Array data', () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(reader.lines, SAMPLE_DATA)
    })

    test('should prepare lines from String data', () => {
      const reader = new Reader(SAMPLE_DATA.join('\n'))
      assert.deepEqual(reader.lines, SAMPLE_DATA)
    })

    test('should prepare lines from String data with trailing newline', () => {
      const reader = new Reader(SAMPLE_DATA.join('\n') + '\n')
      assert.deepEqual(reader.lines, SAMPLE_DATA)
    })

    // UTF-8/16 BOM tests are Ruby-specific (encoding concerns); skip in JS.
  })

  // ── With empty data ────────────────────────────────────────────────────────

  describe('With empty data', () => {
    test("hasMoreLines should return false with empty data", () => {
      assert.ok(!new Reader().hasMoreLines())
    })

    test("empty should return true with empty data", () => {
      const reader = new Reader()
      assert.ok(reader.empty())
      assert.ok(reader.eof())
    })

    test("isNextLineEmpty should return true with empty data", () => {
      assert.ok(new Reader().isNextLineEmpty())
    })

    test("peekLine should return undefined with empty data", async () => {
      assert.ok(await new Reader().peekLine() == null)
    })

    test("peekLines should return empty Array with empty data", async () => {
      assert.deepEqual(await new Reader().peekLines(1), [])
    })

    test("readLine should return undefined with empty data", async () => {
      assert.ok(await new Reader().readLine() == null)
    })

    test("readLines should return empty Array with empty data", async () => {
      assert.deepEqual(await new Reader().readLines(), [])
    })
  })

  // ── With data ──────────────────────────────────────────────────────────────

  describe('With data', () => {
    test("hasMoreLines should return true if there are lines remaining", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.ok(await reader.hasMoreLines())
    })

    test("empty should return false if there are lines remaining", () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.ok(!reader.empty())
      assert.ok(!reader.eof())
    })

    test("isNextLineEmpty should return false if next line is not blank", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.ok(!await reader.isNextLineEmpty())
    })

    test("isNextLineEmpty should return true if next line is blank", async () => {
      const reader = new Reader(['', 'second line'])
      assert.ok(await reader.isNextLineEmpty())
    })

    test("peekLine should return undefined if next entry is null/undefined", async () => {
      assert.ok(await (new Reader([null])).peekLine() == null)
    })

    test("peekLine should return next line if there are lines remaining", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.equal(await reader.peekLine(), SAMPLE_DATA[0])
    })

    test("peekLine should not consume line or increment line number", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.equal(await reader.peekLine(), SAMPLE_DATA[0])
      assert.equal(await reader.peekLine(), SAMPLE_DATA[0])
      assert.equal(reader.lineno, 1)
    })

    test("peekLines should return next lines if there are lines remaining", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(await reader.peekLines(2), SAMPLE_DATA.slice(0, 2))
    })

    test("peekLines should not consume lines or increment line number", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(await reader.peekLines(2), SAMPLE_DATA.slice(0, 2))
      assert.deepEqual(await reader.peekLines(2), SAMPLE_DATA.slice(0, 2))
      assert.equal(reader.lineno, 1)
    })

    test("peekLines should not increment line number if reader overruns buffer", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(await reader.peekLines(SAMPLE_DATA.length * 2), SAMPLE_DATA)
      assert.equal(reader.lineno, 1)
    })

    test("peekLines should peek all lines if no arguments are given", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(await reader.peekLines(), SAMPLE_DATA)
      assert.equal(reader.lineno, 1)
    })

    test("peekLines should not invert order of lines", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(reader.lines, SAMPLE_DATA)
      await reader.peekLines(3)
      assert.deepEqual(reader.lines, SAMPLE_DATA)
    })

    test("readLine should return next line if there are lines remaining", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.equal(await reader.readLine(), SAMPLE_DATA[0])
    })

    test("readLine should consume next line and increment line number", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.equal(await reader.readLine(), SAMPLE_DATA[0])
      assert.equal(await reader.readLine(), SAMPLE_DATA[1])
      assert.equal(reader.lineno, 3)
    })

    test("advance should consume next line and return a Boolean indicating if a line was consumed", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.ok(await reader.advance())
      assert.ok(await reader.advance())
      assert.ok(await reader.advance())
      assert.ok(!await reader.advance())
    })

    test("readLines should return all lines", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.deepEqual(await reader.readLines(), SAMPLE_DATA)
    })

    test("read should return all lines joined as String", async () => {
      const reader = new Reader(SAMPLE_DATA)
      assert.equal(await reader.read(), SAMPLE_DATA.join('\n'))
    })

    test("hasMoreLines should return false after readLines is invoked", async () => {
      const reader = new Reader(SAMPLE_DATA)
      await reader.readLines()
      assert.ok(!await reader.hasMoreLines())
    })

    test("unshiftLine puts line onto Reader as next line to read", async () => {
      const reader = new Reader(SAMPLE_DATA, null, { normalize: true })
      reader.unshiftLine('line zero')
      assert.equal(await reader.peekLine(), 'line zero')
      assert.equal(await reader.readLine(), 'line zero')
      assert.equal(reader.lineno, 1)
    })

    test("terminate should consume all lines and update line number", () => {
      const reader = new Reader(SAMPLE_DATA)
      reader.terminate()
      assert.ok(reader.eof())
      assert.equal(reader.lineno, 4)
    })

    test("skipBlankLines should skip blank lines", async () => {
      const reader = new Reader(['', ''].concat(SAMPLE_DATA))
      await reader.skipBlankLines()
      assert.equal(await reader.peekLine(), SAMPLE_DATA[0])
    })

    test("lines should return remaining lines", async () => {
      const reader = new Reader(SAMPLE_DATA)
      await reader.readLine()
      assert.deepEqual(reader.lines, SAMPLE_DATA.slice(1))
    })

    test("sourceLines should return copy of original data Array", async () => {
      const reader = new Reader(SAMPLE_DATA)
      await reader.readLines()
      assert.deepEqual(reader.sourceLines, SAMPLE_DATA)
    })

    test("source should return original data Array joined as String", async () => {
      const reader = new Reader(SAMPLE_DATA)
      await reader.readLines()
      assert.equal(reader.source(), SAMPLE_DATA.join('\n'))
    })
  })

  // ── Line context ───────────────────────────────────────────────────────────

  describe('Line context', () => {
    test("cursor.toString should return file name and line number of current line", async () => {
      const reader = new Reader(SAMPLE_DATA, 'sample.adoc')
      await reader.readLine()
      assert.equal(reader.cursor.toString(), 'sample.adoc: line 2')
    })

    test("lineInfo should return file name and line number of current line", async () => {
      const reader = new Reader(SAMPLE_DATA, 'sample.adoc')
      await reader.readLine()
      assert.equal(reader.lineInfo(), 'sample.adoc: line 2')
    })

    test("cursorAtPrevLine should return file name and line number of previous line read", async () => {
      const reader = new Reader(SAMPLE_DATA, 'sample.adoc')
      await reader.readLine()
      assert.equal(reader.cursorAtPrevLine().toString(), 'sample.adoc: line 1')
    })
  })

  // ── Read lines until ───────────────────────────────────────────────────────

  describe('Read lines until', () => {
    test('Read lines until end', async () => {
      // Ruby: <<~'EOS'.lines => ["line\n", "\n", "line\n"] — 3 lines with trailing newlines
      // After Reader normalize: ["line", "", "line"] — 3 lines (trailing whitespace stripped)
      // JS equivalent: pass already-normalized lines (without trailing newlines)
      const lines = ['This is one paragraph.', '', 'This is another paragraph.']
      const reader = new Reader(lines, null, { normalize: true })
      const result = await reader.readLinesUntil()
      assert.equal(result.length, 3)
      assert.deepEqual(result, ['This is one paragraph.', '', 'This is another paragraph.'])
      assert.ok(!await reader.hasMoreLines())
      assert.ok(reader.eof())
    })

    test('Read lines until blank line', async () => {
      const lines = ['This is one paragraph.', '', 'This is another paragraph.']
      const reader = new Reader(lines, null, { normalize: true })
      const result = await reader.readLinesUntil({ breakOnBlankLines: true })
      assert.equal(result.length, 1)
      assert.equal(result[0], 'This is one paragraph.')
      assert.equal(await reader.peekLine(), 'This is another paragraph.')
    })

    test('Read lines until blank line preserving last line', async () => {
      const lines = 'This is one paragraph.\n\nThis is another paragraph.'.split('\n')
      const reader = new Reader(lines)
      const result = await reader.readLinesUntil({ breakOnBlankLines: true, preserveLastLine: true })
      assert.equal(result.length, 1)
      assert.equal(result[0], 'This is one paragraph.')
      assert.ok(await reader.isNextLineEmpty())
    })

    test('Read lines until condition is true', async () => {
      const lines = '--\nThis is one paragraph inside the block.\n\nThis is another paragraph inside the block.\n--\n\nThis is a paragraph outside the block.'.split('\n')
      const reader = new Reader(lines)
      await reader.readLine()
      const result = await reader.readLinesUntil({}, (line) => line === '--')
      assert.equal(result.length, 3)
      assert.deepEqual(result, lines.slice(1, 4))
      assert.ok(await reader.isNextLineEmpty())
    })

    test('Read lines until condition is true, taking last line', async () => {
      const lines = '--\nThis is one paragraph inside the block.\n\nThis is another paragraph inside the block.\n--\n\nThis is a paragraph outside the block.'.split('\n')
      const reader = new Reader(lines)
      await reader.readLine()
      const result = await reader.readLinesUntil({ readLastLine: true }, (line) => line === '--')
      assert.equal(result.length, 4)
      assert.deepEqual(result, lines.slice(1, 5))
      assert.ok(await reader.isNextLineEmpty())
    })

    test('Read lines until condition is true, taking and preserving last line', async () => {
      const lines = '--\nThis is one paragraph inside the block.\n\nThis is another paragraph inside the block.\n--\n\nThis is a paragraph outside the block.'.split('\n')
      const reader = new Reader(lines)
      await reader.readLine()
      const result = await reader.readLinesUntil({ readLastLine: true, preserveLastLine: true }, (line) => line === '--')
      assert.equal(result.length, 4)
      assert.deepEqual(result, lines.slice(1, 5))
      assert.equal(await reader.peekLine(), '--')
    })

    test('read lines until terminator', async () => {
      // Ruby: <<~'EOS'.lines => lines with trailing \n, normalize strips them
      const lines = ['****', 'captured', '', 'also captured', '****', '', 'not captured']
      const expected = ['captured', '', 'also captured']

      const doc = await emptyDocument()
      const reader = new PreprocessorReader(doc, lines, null, { normalize: true })
      const terminator = await reader.readLine()
      const result = await reader.readLinesUntil({ terminator, skipProcessing: true })
      assert.deepEqual(result, expected)
      assert.ok(!reader.unterminated)
    })

    test('should flag reader as unterminated if reader reaches end of source without finding terminator', async () => {
      // Ruby: <<~'EOS'.lines => lines with trailing \n
      const lines = ['****', 'captured', '', 'also captured', '', 'captured yet again']
      const expected = lines.slice(1)

      const defaultLogger = LoggerManager.logger
      const logger = new MemoryLogger()
      LoggerManager.logger = logger
      try {
        const doc = await emptyDocument()
        const reader = new PreprocessorReader(doc, lines, null, { normalize: true })
        const terminator = await reader.peekLine()
        const result = await reader.readLinesUntil({ terminator, skipFirstLine: true, skipProcessing: true })
        assert.deepEqual(result, expected)
        assert.ok(reader.unterminated)
        const found = logger.messages.some((m) => {
          const msg = typeof m.message === 'string' ? m.message : String(m.message)
          return msg.includes('unterminated') && msg.includes('****')
        })
        assert.ok(found, `Expected WARN about unterminated block but got: ${JSON.stringify(logger.messages)}`)
      } finally {
        LoggerManager.logger = defaultLogger
      }
    })
  })
})

// ── PreprocessorReader ────────────────────────────────────────────────────────

describe('PreprocessorReader', () => {
  // ── Type hierarchy ─────────────────────────────────────────────────────────

  describe('Type hierarchy', () => {
    test('PreprocessorReader should extend from Reader', async () => {
      const doc = await emptyDocument()
      assert.ok(doc.reader instanceof PreprocessorReader)
      assert.ok(doc.reader instanceof Reader)
    })

    test('PreprocessorReader should invoke or emulate Reader initializer', async () => {
      // parse: false to prevent parser from consuming the reader lines
      const doc = await load(SAMPLE_DATA.join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      assert.deepEqual(reader.lines, SAMPLE_DATA)
      assert.equal(reader.lineno, 1)
    })
  })

  // ── Prepare lines ──────────────────────────────────────────────────────────

  describe('Prepare lines', () => {
    test('should prepare and normalize lines from Array data', async () => {
      const data = [...SAMPLE_DATA]
      data.unshift('')
      data.push('')
      // parse: false to prevent parser from consuming the reader lines
      const doc = await load(data.join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      assert.deepEqual(reader.lines, [''].concat(SAMPLE_DATA))
    })

    test('should prepare and normalize lines from String data', async () => {
      const data = [...SAMPLE_DATA]
      data.unshift(' ')
      data.push(' ')
      const dataAsString = data.join('\n')
      // parse: false to prevent parser from consuming the reader lines
      const doc = await load(dataAsString, { safe: 'safe', parse: false })
      const reader = doc.reader
      assert.deepEqual(reader.lines, [''].concat(SAMPLE_DATA))
    })

    test('should drop all lines if all lines are empty', async () => {
      const data = ['', ' ', '', ' ']
      // parse: false to check reader state
      const doc = await load(data.join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      assert.equal(reader.lines.length, 0)
    })

    test('should clean CRLF from end of lines', async () => {
      const input = 'source\r\nwith\r\nCRLF\r\nline endings\r\n'
      const inputs = [
        input,
        input.split('\n'),
        input.split('\n').join('\n'),
      ]
      for (const lines of inputs) {
        // parse: false to check reader state
        const doc = await load(Array.isArray(lines) ? lines.join('\n') : lines, { safe: 'safe', parse: false })
        const reader = doc.reader
        for (const line of reader.lines) {
          assert.ok(!line.endsWith('\r'), `CRLF not properly cleaned: ${JSON.stringify(line)}`)
          assert.ok(!line.endsWith('\r\n'), `CRLF not properly cleaned: ${JSON.stringify(line)}`)
          assert.ok(!line.endsWith('\n'), `CRLF not properly cleaned: ${JSON.stringify(line)}`)
        }
      }
    })

    test('should not skip front matter by default', async () => {
      const input = `---\nlayout: post\ntitle: Document Title\nauthor: username\ntags: [ first, second ]\n---\n= Document Title\nAuthor Name\n\npreamble`
      // parse: false to check reader state before parsing
      const doc = await load(input, { safe: 'safe', parse: false })
      const reader = doc.reader
      assert.ok(!('front-matter' in doc.attributes))
      assert.equal(await reader.peekLine(), '---')
      assert.equal(reader.lineno, 1)
    })

    test('should not skip front matter if ending delimiter is not found', async () => {
      const input = `---\ntitle: Document Title\ntags: [ first, second ]\n= Document Title\nAuthor Name\n\npreamble`
      const doc = await load(input, { safe: 'safe', parse: false, attributes: { 'skip-front-matter': '' } })
      const reader = doc.reader
      assert.equal(await reader.peekLine(), '---')
      assert.ok(!('front-matter' in doc.attributes))
      assert.equal(reader.lineno, 1)
    })

    test('should skip front matter if specified by skip-front-matter attribute', async () => {
      const frontMatter = 'layout: post\ntitle: Document Title\nauthor: username\ntags: [ first, second ]'
      const input = `---\n${frontMatter}\n---\n= Document Title\nAuthor Name\n\npreamble`
      const doc = await load(input, { safe: 'safe', parse: false, attributes: { 'skip-front-matter': '' } })
      const reader = doc.reader
      assert.equal(await reader.peekLine(), '= Document Title')
      assert.equal(doc.attributes['front-matter'], frontMatter)
      assert.equal(reader.lineno, 7)
    })

    test('should skip TOML front matter if specified by skip-front-matter attribute', async () => {
      const frontMatter = "layout = 'post'\ntitle = 'Document Title'\nauthor = 'username'\ntags = ['first', 'second']"
      const input = `+++\n${frontMatter}\n+++\n= Document Title\nAuthor Name\n\npreamble`
      const doc = await load(input, { safe: 'safe', parse: false, attributes: { 'skip-front-matter': '' } })
      const reader = doc.reader
      assert.equal(await reader.peekLine(), '= Document Title')
      assert.equal(doc.attributes['front-matter'], frontMatter)
      assert.equal(reader.lineno, 7)
    })

    test('should not skip front matter in include file if skip-front-matter attribute is set', async () => {
      const input = '....\ninclude::fixtures/with-front-matter.adoc[]\n....'
      const doc = await load(input, { safe: 'safe', parse: false, base_dir: path.join(FIXTURES_DIR, '..') })
      const reader = doc.reader
      const expected = ['....', '---', 'name: value', '---', 'content', '....']
      assert.deepEqual(await reader.readlines(), expected)
      assert.ok(!doc.attr('front-matter'))
    })

    test('should skip front matter in include file if skip-front-matter option is set on include directive', async () => {
      const input = '....\ninclude::fixtures/with-front-matter.adoc[opts=skip-front-matter]\n....'
      const doc = await load(input, { safe: 'safe', parse: false, base_dir: path.join(FIXTURES_DIR, '..') })
      const reader = doc.reader
      const expected = ['....', 'content', '....']
      assert.deepEqual(await reader.readlines(), expected)
      assert.ok(!doc.attr('front-matter'))
    })
  })

  // ── Include Stack ──────────────────────────────────────────────────────────

  describe('Include Stack', () => {
    test('PreprocessorReader#pushInclude method should return reader', async () => {
      const doc = await emptyDocument()
      const reader = doc.reader
      const appendLines = ['one', 'two', 'three']
      const result = reader.pushInclude(appendLines, '<stdin>', '<stdin>')
      assert.equal(result, reader)
    })

    test('PreprocessorReader#pushInclude method should put lines on top of stack', async () => {
      const doc = await load(['a', 'b', 'c'].join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      const appendLines = ['one', 'two', 'three']
      reader.pushInclude(appendLines, '', '<stdin>')
      assert.equal(reader.includeStack.length, 1)
      assert.equal((await reader.readLine()).trimEnd(), 'one')
    })

    test('PreprocessorReader#pushInclude method should gracefully handle file and path', async () => {
      const doc = await load(['a', 'b', 'c'].join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      const appendLines = ['one', 'two', 'three']
      reader.pushInclude(appendLines)
      assert.equal(reader.includeStack.length, 1)
      assert.equal((await reader.readLine()).trimEnd(), 'one')
      assert.ok(reader.file == null)
      assert.equal(reader.path, '<stdin>')
    })

    test('PreprocessorReader#pushInclude method should set path from file automatically if not specified', async () => {
      const doc = await load(['a', 'b', 'c'].join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      const appendLines = ['one', 'two', 'three']
      reader.pushInclude(appendLines, '/tmp/lines.adoc')
      assert.equal(reader.file, '/tmp/lines.adoc')
      assert.equal(reader.path, 'lines.adoc')
      assert.ok(doc.catalog.includes['lines'])
    })

    test('PreprocessorReader#pushInclude method should not fail if data is nil', async () => {
      const doc = await load(['a', 'b', 'c'].join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      reader.pushInclude(null, '', '<stdin>')
      assert.equal(reader.includeStack.length, 0)
      assert.equal((await reader.readLine()).trimEnd(), 'a')
    })

    test('PreprocessorReader#pushInclude method should ignore dot in directory name when computing include path', async () => {
      const doc = await load(['a', 'b', 'c'].join('\n'), { safe: 'safe', parse: false })
      const reader = doc.reader
      const appendLines = ['one', 'two', 'three']
      reader.pushInclude(appendLines, null, 'include.d/data')
      assert.ok(reader.file == null)
      assert.equal(reader.path, 'include.d/data')
      assert.ok(doc.catalog.includes['include.d/data'])
    })
  })

  // ── Include Directive ─────────────────────────────────────────────────────

  describe('Include Directive', () => {
    test('should replace include directive with link macro in default safe mode (secure)', async () => {
      const input = 'include::include-file.adoc[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(await reader.readLine(), 'link:include-file.adoc[role=include]')
    })

    test('should escape spaces in target when generating link from include directive', async () => {
      const input = 'include::foo bar baz.adoc[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(await reader.readLine(), 'link:pass:c[foo bar baz.adoc][role=include]')
    })

    test('should not add role to link macro used to replace include directive in compat mode', async () => {
      const input = 'include::include-file.adoc[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { 'compat-mode': '' } })
      const reader = doc.reader
      assert.equal(await reader.readLine(), 'link:include-file.adoc[]')
    })

    test('should preserve attrlist when replacing include directive with link macro', async () => {
      const input = 'include::include-file.adoc[leveloffset=+1]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(await reader.readLine(), 'link:include-file.adoc[role=include,leveloffset=+1]')
    })

    test('include directive is enabled when safe mode is less than SECURE', async () => {
      const input = 'include::fixtures/include-file.adoc[]'
      const doc = await documentFromString(input, { safe: 'safe', standalone: false, base_dir: path.join(FIXTURES_DIR, '..') })
      const output = await doc.convert()
      assert.match(output, /included content/)
      assert.ok(doc.catalog.includes['fixtures/include-file'])
    })

    test('should strip BOM from include file', async () => {
      const input = ':showtitle:\ninclude::fixtures/file-with-utf8-bom.adoc[]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assertCss(output, '.paragraph', 0)
      assertCss(output, 'h1', 1)
      assert.match(output, /<h1>人<\/h1>/)
    })

    test('should not track include in catalog for non-AsciiDoc include files', async () => {
      const input = '----\ninclude::fixtures/include-file.xml[]\n----'
      const doc = await documentFromString(input, { safe: 'safe', standalone: false, base_dir: path.join(FIXTURES_DIR, '..') })
      // non-AsciiDoc files should not appear in catalog
      assert.ok(!doc.catalog.includes['fixtures/include-file'])
    })

    test('include directive should not match if target is empty or starts or ends with space', async () => {
      for (const input of ['include::[]', 'include:: []', 'include:: not-include[]', 'include::not-include []']) {
        const doc = await load(input, { safe: 'secure', parse: false })
        const reader = doc.reader
        assert.equal(await reader.readLine(), input)
      }
    })

    test('include directive should resolve file with spaces in name', async () => {
      const srcFile = path.join(FIXTURES_DIR, 'include-file.adoc')
      const spFile = path.join(FIXTURES_DIR, 'include file.adoc')
      const { copyFileSync } = await import('node:fs')
      try {
        copyFileSync(srcFile, spFile)
        const doc = await documentFromString('include::fixtures/include file.adoc[]', { safe: 'safe', standalone: false, base_dir: path.join(FIXTURES_DIR, '..') })
        assert.match(await doc.convert(), /included content/)
      } finally {
        try { unlinkSync(spFile) } catch { /* ignore */ }
      }
    })

    test('include directive should resolve file with {sp} in name', async () => {
      const srcFile = path.join(FIXTURES_DIR, 'include-file.adoc')
      const spFile = path.join(FIXTURES_DIR, 'include file.adoc')
      const { copyFileSync } = await import('node:fs')
      try {
        copyFileSync(srcFile, spFile)
        const doc = await documentFromString('include::fixtures/include{sp}file.adoc[]', { safe: 'safe', standalone: false, base_dir: path.join(FIXTURES_DIR, '..') })
        assert.match(await doc.convert(), /included content/)
      } finally {
        try { unlinkSync(spFile) } catch { /* ignore */ }
      }
    })

    test('include directive should resolve file relative to current include', async () => {
      const input = 'include::fixtures/parent-include.adoc[]'
      const pseudoDocfile = path.join(FIXTURES_DIR, '..', 'main.adoc')
      const fixturesDir = FIXTURES_DIR
      const parentIncludeDocfile = path.join(fixturesDir, 'parent-include.adoc')
      const childIncludeDocfile = path.join(fixturesDir, 'child-include.adoc')
      const grandchildIncludeDocfile = path.join(fixturesDir, 'grandchild-include.adoc')

      const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
      const reader = new PreprocessorReader(doc, input, pseudoDocfile, { normalize: true })

      assert.equal(reader.file, pseudoDocfile)
      assert.equal(reader.path, 'main.adoc')

      assert.equal(await reader.readLine(), 'first line of parent')

      assert.equal(reader.cursorAtPrevLine().toString(), 'fixtures/parent-include.adoc: line 1')
      assert.equal(reader.file, parentIncludeDocfile)
      assert.equal(reader.path, 'fixtures/parent-include.adoc')

      await reader.skipBlankLines()

      assert.equal(await reader.readLine(), 'first line of child')

      assert.equal(reader.cursorAtPrevLine().toString(), 'fixtures/child-include.adoc: line 1')
      assert.equal(reader.file, childIncludeDocfile)
      assert.equal(reader.path, 'fixtures/child-include.adoc')

      await reader.skipBlankLines()

      assert.equal(await reader.readLine(), 'first line of grandchild')

      assert.equal(reader.cursorAtPrevLine().toString(), 'fixtures/grandchild-include.adoc: line 1')
      assert.equal(reader.file, grandchildIncludeDocfile)
      assert.equal(reader.path, 'fixtures/grandchild-include.adoc')

      await reader.skipBlankLines()

      assert.equal(await reader.readLine(), 'last line of grandchild')

      await reader.skipBlankLines()

      assert.equal(await reader.readLine(), 'last line of child')

      await reader.skipBlankLines()

      assert.equal(await reader.readLine(), 'last line of parent')

      assert.equal(reader.cursorAtPrevLine().toString(), 'fixtures/parent-include.adoc: line 5')
      assert.equal(reader.file, parentIncludeDocfile)
      assert.equal(reader.path, 'fixtures/parent-include.adoc')
    })

    test('include directive should process lines when file extension of target is .asciidoc', async () => {
      const input = 'include::fixtures/include-alt-extension.asciidoc[]'
      const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.equal(doc.blocks.length, 3)
      assert.deepEqual(doc.blocks[0].lines, ['first line'])
      assert.deepEqual(doc.blocks[1].lines, ['Asciidoctor!'])
      assert.deepEqual(doc.blocks[2].lines, ['last line'])
    })

    test('should only strip trailing newlines, not trailing whitespace, if include file is not AsciiDoc', async () => {
      const input = '....\ninclude::fixtures/data.tsv[]\n....'
      const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.equal(doc.blocks.length, 1)
      // line at index 2 should end with a tab (trailing whitespace preserved)
      assert.ok(doc.blocks[0].lines[2].endsWith('\t'))
    })

    // SKIP: encoding tests are Ruby-specific (ISO-8859-1); JavaScript is always UTF-8.

    test('unresolved target referenced by include directive is skipped when optional option is set (attribute missing)', async () => {
      const input = 'include::fixtures/{no-such-file}[opts=optional]\n\ntrailing content'
      await usingMemoryLogger(async (logger) => {
        const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.equal(doc.blocks.length, 1)
        assert.deepEqual(doc.blocks[0].lines, ['trailing content'])
        assertMessage(logger, 'INFO', 'optional include dropped')
      })
    })

    test('should skip include directive that references missing file if optional option is set', async () => {
      const input = 'include::fixtures/no-such-file.adoc[opts=optional]\n\ntrailing content'
      await usingMemoryLogger(async (logger) => {
        const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.equal(doc.blocks.length, 1)
        assert.deepEqual(doc.blocks[0].lines, ['trailing content'])
        assertMessage(logger, 'INFO', 'optional include dropped')
      })
    })

    test('should replace include directive that references missing file with message', async () => {
      const input = 'include::fixtures/no-such-file.adoc[]\n\ntrailing content'
      await usingMemoryLogger(async (logger) => {
        const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.equal(doc.blocks.length, 2)
        assert.deepEqual(doc.blocks[0].lines, ['Unresolved directive in <stdin> - include::fixtures/no-such-file.adoc[]'])
        assert.deepEqual(doc.blocks[1].lines, ['trailing content'])
        assertMessage(logger, 'ERROR', 'include file not found')
      })
    })

    // SKIP: file permissions test (FileUtils.chmod) - not applicable in Node.js test environment

    test('can resolve include directive with absolute path', async () => {
      const includePath = path.join(FIXTURES_DIR, 'chapter-a.adoc')
      const input = `include::${includePath}[]`
      const result = await documentFromString(input, { safe: 'safe' })
      assert.equal(result.attributes.doctitle, 'Chapter A')
    })

    // SKIP: network/URI tests (require test web server)

    test('nested include directives are resolved relative to current file', async () => {
      const input = '....\ninclude::fixtures/outer-include.adoc[]\n....'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'first line of outer',
        '',
        'first line of middle',
        '',
        'first line of inner',
        '',
        'last line of inner',
        '',
        'last line of middle',
        '',
        'last line of outer',
      ].join('\n')
      assert.ok(output.includes(expected))
    })

    test('include directive supports selecting lines by line number', async () => {
      const input = 'include::fixtures/include-file.adoc[lines=1;3..4;6..-1]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /first line/)
      assert.ok(!output.match(/second line/))
      assert.match(output, /third line/)
      assert.match(output, /fourth line/)
      assert.ok(!output.match(/fifth line/))
      assert.match(output, /sixth line/)
      assert.match(output, /seventh line/)
      assert.match(output, /eighth line/)
      assert.match(output, /last line of included content/)
    })

    test('include directive supports line ranges separated by commas in quoted attribute value', async () => {
      const input = 'include::fixtures/include-file.adoc[lines="1,3..4,6..-1"]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /first line/)
      assert.ok(!output.match(/second line/))
      assert.match(output, /third line/)
      assert.match(output, /fourth line/)
      assert.ok(!output.match(/fifth line/))
      assert.match(output, /sixth line/)
      assert.match(output, /seventh line/)
      assert.match(output, /eighth line/)
      assert.match(output, /last line of included content/)
    })

    test('include directive ignores spaces between line ranges in quoted attribute value', async () => {
      const input = 'include::fixtures/include-file.adoc[lines="1, 3..4 , 6 .. -1"]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /first line/)
      assert.ok(!output.match(/second line/))
      assert.match(output, /third line/)
      assert.match(output, /fourth line/)
      assert.ok(!output.match(/fifth line/))
      assert.match(output, /sixth line/)
    })

    test('include directive supports implicit endless range', async () => {
      const input = 'include::fixtures/include-file.adoc[lines=6..]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.ok(!output.match(/first line/))
      assert.ok(!output.match(/second line/))
      assert.ok(!output.match(/fifth line/))
      assert.match(output, /sixth line/)
      assert.match(output, /seventh line/)
      assert.match(output, /last line of included content/)
    })

    test('include directive ignores lines attribute if empty', async () => {
      const input = '++++\ninclude::fixtures/include-file.adoc[lines=]\n++++'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.ok(output.includes('first line of included content'))
      assert.ok(output.includes('last line of included content'))
    })

    test('include directive ignores lines attribute with invalid range', async () => {
      const input = '++++\ninclude::fixtures/include-file.adoc[lines=10..5]\n++++'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.ok(output.includes('first line of included content'))
      assert.ok(output.includes('last line of included content'))
    })

    test('include directive supports selecting lines by tag', async () => {
      const input = 'include::fixtures/include-file.adoc[tag=snippetA]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /snippetA content/)
      assert.ok(!output.match(/snippetB content/))
      assert.ok(!output.match(/non-tagged content/))
      assert.ok(!output.match(/included content/))
    })

    test('include directive supports selecting lines by tags', async () => {
      const input = 'include::fixtures/include-file.adoc[tags=snippetA;snippetB]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /snippetA content/)
      assert.match(output, /snippetB content/)
      assert.ok(!output.match(/non-tagged content/))
      assert.ok(!output.match(/included content/))
    })

    test('include directive supports selecting lines by tag in language that uses circumfix comments (XML)', async () => {
      const input = '[source,xml]\n----\ninclude::fixtures/include-file.xml[tag=snippet,indent=0]\n----'
      const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.equal(doc.blocks[0].source, '<snippet>content</snippet>')
    })

    test('include directive supports selecting lines by tag in file that has CRLF line endings', async () => {
      const tmpDir = mkdtempSync(path.join(tmpdir(), 'asciidoctor-'))
      const tmpFile = path.join(tmpDir, 'include-.adoc')
      try {
        writeFileSync(tmpFile, 'do not include\r\ntag::include-me[]\r\nincluded line\r\nend::include-me[]\r\ndo not include\r\n')
        const input = `include::${path.basename(tmpFile)}[tag=include-me]`
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: tmpDir })
        assert.ok(output.includes('included line'))
        assert.ok(!output.includes('do not include'))
      } finally {
        rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    test('include directive finds closing tag on last line of file without a trailing newline', async () => {
      const tmpDir = mkdtempSync(path.join(tmpdir(), 'asciidoctor-'))
      const tmpFile = path.join(tmpDir, 'include-.adoc')
      try {
        writeFileSync(tmpFile, 'line not included\ntag::include-me[]\nline included\nend::include-me[]')
        const input = `include::${path.basename(tmpFile)}[tag=include-me]`
        await usingMemoryLogger(async (logger) => {
          const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: tmpDir })
          assert.equal(logger.messages.length, 0)
          assert.ok(output.includes('line included'))
          assert.ok(!output.includes('line not included'))
        })
      } finally {
        rmSync(tmpDir, { recursive: true, force: true })
      }
    })

    test('include directive does not select lines containing tag directives within selected tag region', async () => {
      const input = '++++\ninclude::fixtures/include-file.adoc[tags=snippet]\n++++'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'snippetA content\n\nnon-tagged content\n\nsnippetB content'
      assert.equal(output, expected)
    })

    test('include directive skips lines inside tag which is negated', async () => {
      const input = '----\ninclude::fixtures/tagged-class-enclosed.rb[tags=all;!bark]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\n  def initialize breed\n    @breed = breed\n  end\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines without a tag directive when value is double asterisk', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=**]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '  def initialize breed',
        '    @breed = breed',
        '  end',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines except lines inside tag which is negated when value starts with double asterisk', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=**;!bark]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\n  def initialize breed\n    @breed = breed\n  end\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines, including lines inside nested tags, except lines inside tag which is negated when value starts with double asterisk', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=**;!init]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines outside of tags when value is double asterisk followed by negated wildcard', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=**;!*]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive skips all tagged regions when value of tags attribute is negated wildcard', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=!*]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines except tag which is negated when value only contains negated tag', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tag=!bark]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\n  def initialize breed\n    @breed = breed\n  end\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines except tags which are negated when value only contains negated tags', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=!bark;!init]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects lines between tags when value of tags attribute is wildcard', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=*]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        '  def initialize breed',
        '    @breed = breed',
        '  end',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects lines inside tags when value of tags attribute is wildcard and tag surrounds content', async () => {
      const input = '----\ninclude::fixtures/tagged-class-enclosed.rb[tags=*]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '  def initialize breed',
        '    @breed = breed',
        '  end',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects lines inside all tags except tag which is negated when value of tags attribute is wildcard followed by negated tag', async () => {
      const input = '----\ninclude::fixtures/tagged-class-enclosed.rb[tags=*;!init]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive skips all tagged regions except ones re-enabled when value of tags attribute is negated wildcard followed by tag name', async () => {
      for (const pattern of ['!*;init', '**;!*;init']) {
        const input = `----\ninclude::fixtures/tagged-class.rb[tags=${pattern}]\n----`
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        const expected = 'class Dog\n  def initialize breed\n    @breed = breed\n  end\nend'
        assert.ok(output.includes(`<pre>${expected}</pre>`), `Pattern ${pattern} failed`)
      }
    })

    test('include directive includes regions outside tags and inside specified tags when value begins with negated wildcard', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=!*;bark]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\n\n  def bark\n  end\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive includes lines inside tag except for lines inside nested tags when tag is followed by negated wildcard', async () => {
      for (const pattern of ['bark;!*', '!**;bark;!*', '!**;!*;bark']) {
        const input = `----\ninclude::fixtures/tagged-class.rb[tags=${pattern}]\n----`
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        const expected = '  def bark\n  end'
        assert.ok(output.includes(`<pre>${expected}</pre>`), `Pattern ${pattern} failed`)
      }
    })

    test('include directive does not select lines inside tag that has been included then excluded', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=!*;init;!init]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = 'class Dog\nend'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive only selects lines inside specified tag, even if preceded by negated double asterisk', async () => {
      for (const pattern of ['bark', '!**;bark']) {
        const input = `----\ninclude::fixtures/tagged-class.rb[tags=${pattern}]\n----`
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        const expected = [
          '  def bark',
          "    if @breed == 'beagle'",
          "      'woof woof woof woof woof'",
          '    else',
          "      'woof woof'",
          '    end',
          '  end',
        ].join('\n')
        assert.ok(output.includes(`<pre>${expected}</pre>`), `Pattern ${pattern} failed`)
      }
    })

    test('include directive selects lines inside specified tag and ignores lines inside a negated tag', async () => {
      const input = '[indent=0]\n----\ninclude::fixtures/tagged-class.rb[tags=bark;!bark-other]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = "def bark\n  if @breed == 'beagle'\n    'woof woof woof woof woof'\n  end\nend"
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('should recognize tag wildcard if not at start of tags list', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=init;**;*;!bark-other]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '  def initialize breed',
        '    @breed = breed',
        '  end',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines except for lines containing tag directive if value is double asterisk followed by nested tag names', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=**;bark-beagle;bark-all]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '  def initialize breed',
        '    @breed = breed',
        '  end',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines except for lines containing tag directive when value is double asterisk followed by outer tag name', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=**;bark]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        'class Dog',
        '  def initialize breed',
        '    @breed = breed',
        '  end',
        '',
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
        'end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects all lines inside unspecified tags when value is negated double asterisk followed by negated tags', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=!**;!init]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = [
        '  def bark',
        "    if @breed == 'beagle'",
        "      'woof woof woof woof woof'",
        '    else',
        "      'woof woof'",
        '    end',
        '  end',
      ].join('\n')
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('include directive selects lines inside tag except for lines inside nested tags when tag is preceded by negated double asterisk and negated wildcard', async () => {
      const input = '----\ninclude::fixtures/tagged-class.rb[tags=!**;!*;bark]\n----'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const expected = '  def bark\n  end'
      assert.ok(output.includes(`<pre>${expected}</pre>`))
    })

    test('should warn if specified tag is not found in include file', async () => {
      const input = 'include::fixtures/include-file.adoc[tag=no-such-tag]'
      await usingMemoryLogger(async (logger) => {
        await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assertMessage(logger, 'WARN', "tag 'no-such-tag' not found in include file")
      })
    })

    test('should not warn if specified negated tag is not found in include file', async () => {
      const input = '----\ninclude::fixtures/tagged-class-enclosed.rb[tag=!no-such-tag]\n----'
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.ok(output.includes('class Dog'))
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should warn if specified tags are not found in include file', async () => {
      const input = '++++\ninclude::fixtures/include-file.adoc[tags=no-such-tag-b;no-such-tag-a]\n++++'
      await usingMemoryLogger(async (logger) => {
        await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assertMessage(logger, 'WARN', 'not found in include file')
      })
    })

    test('should not warn if specified negated tags are not found in include file', async () => {
      const input = '----\ninclude::fixtures/tagged-class-enclosed.rb[tags=all;!no-such-tag;!unknown-tag]\n----'
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.ok(output.includes('class Dog'))
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should warn if specified tag in include file is not closed', async () => {
      const input = '++++\ninclude::fixtures/unclosed-tag.adoc[tag=a]\n++++'
      await usingMemoryLogger(async (logger) => {
        const result = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.equal(result, 'a')
        assertMessage(logger, 'WARN', "detected unclosed tag 'a'")
      })
    })

    test('should warn if end tag in included file is mismatched', async () => {
      const input = '++++\ninclude::fixtures/mismatched-end-tag.adoc[tags=a;b]\n++++'
      await usingMemoryLogger(async (logger) => {
        const result = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.equal(result, 'a\nb')
        assertMessage(logger, 'WARN', "mismatched end tag")
      })
    })

    test('should warn if unexpected end tag is found in included file', async () => {
      const input = '++++\ninclude::fixtures/unexpected-end-tag.adoc[tags=a]\n++++'
      await usingMemoryLogger(async (logger) => {
        const result = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        assert.equal(result, 'a')
        assertMessage(logger, 'WARN', "unexpected end tag 'a'")
      })
    })

    test('include directive ignores tags attribute when empty', async () => {
      for (const attrName of ['tag', 'tags']) {
        const input = `++++\ninclude::fixtures/include-file.xml[${attrName}=]\n++++`
        const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
        const matches = (output.match(/(?:tag|end)::/g) || []).length
        assert.ok(matches >= 2, `Expected tag:: or end:: directives in output for ${attrName}=`)
      }
    })

    test('lines attribute takes precedence over tags attribute in include directive', async () => {
      const input = 'include::fixtures/include-file.adoc[lines=1, tags=snippetA;snippetB]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /first line of included content/)
      assert.ok(!output.match(/snippetA content/))
      assert.ok(!output.match(/snippetB content/))
    })

    test('indent of included file can be reset to size of indent attribute', async () => {
      const input = '[source, xml]\n----\ninclude::fixtures/basic-docinfo.xml[lines=2..3, indent=0]\n----'
      const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.equal(doc.blocks[0].source, '<year>2013</year>\n<holder>Acme™, Inc.</holder>')
    })

    test('should substitute attribute references in attrlist', async () => {
      const input = ':name-of-tag: snippetA\ninclude::fixtures/include-file.adoc[tag={name-of-tag}]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      assert.match(output, /snippetA content/)
      assert.ok(!output.match(/snippetB content/))
      assert.ok(!output.match(/non-tagged content/))
    })

    test('leveloffset attribute entries should be added to content if leveloffset attribute is specified', async () => {
      const input = 'include::fixtures/main.adoc[]'
      const expected = [
        '= Main Document',
        '',
        'preamble',
        '',
        ':leveloffset: +1',
        '',
        '= Chapter A',
        '',
        'content',
        '',
        ':leveloffset!:',
      ]
      const document = await load(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..'), parse: false })
      assert.deepEqual(await document.reader.readLines(), expected)
    })

    test('attributes are substituted in target of include directive', async () => {
      const input = ':fixturesdir: fixtures\n:ext: adoc\n\ninclude::{fixturesdir}/include-file.{ext}[]'
      const doc = await documentFromString(input, { safe: 'safe', base_dir: path.join(FIXTURES_DIR, '..') })
      const output = await doc.convert()
      assert.match(output, /included content/)
    })

    test('line is skipped by default if target of include directive resolves to empty', async () => {
      const input = 'include::{blank}[]'
      await usingMemoryLogger(async (logger) => {
        const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
        const reader = new PreprocessorReader(doc, input, null, { normalize: true })
        const line = await reader.readLine()
        assert.equal(line, 'Unresolved directive in <stdin> - include::{blank}[]')
        assertMessage(logger, 'WARN', 'include dropped because resolved target is blank')
      })
    })

    test('include is dropped if target contains missing attribute and attribute-missing is drop-line', async () => {
      const input = 'include::{foodir}/include-file.adoc[]'
      await usingMemoryLogger(async (logger) => {
        const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..'), attributes: { 'attribute-missing': 'drop-line' } })
        const reader = new PreprocessorReader(doc, input, null, { normalize: true })
        const line = await reader.readLine()
        assert.equal(line, undefined)
        assertMessage(logger, 'INFO', 'include dropped due to missing attribute')
      })
    })

    test('line following dropped include is not dropped', async () => {
      const input = 'include::{foodir}/include-file.adoc[]\nyo'
      await usingMemoryLogger(async (_logger) => {
        const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..'), attributes: { 'attribute-missing': 'warn' } })
        const reader = new PreprocessorReader(doc, input, null, { normalize: true })
        const line1 = await reader.readLine()
        assert.equal(line1, 'Unresolved directive in <stdin> - include::{foodir}/include-file.adoc[]')
        const line2 = await reader.readLine()
        assert.equal(line2, 'yo')
      })
    })

    test('escaped include directive is left unprocessed', async () => {
      const input = '\\include::fixtures/include-file.adoc[]\n\\escape preserved here'
      const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
      const reader = new PreprocessorReader(doc, input, null, { normalize: true })
      // peek multiple times — backslash should be preserved each time
      assert.equal(await reader.peekLine(), 'include::fixtures/include-file.adoc[]')
      assert.equal(await reader.peekLine(), 'include::fixtures/include-file.adoc[]')
      assert.equal(await reader.readLine(), 'include::fixtures/include-file.adoc[]')
      assert.equal(await reader.readLine(), '\\escape preserved here')
    })

    test('include directive not at start of line is ignored', async () => {
      const input = ' include::include-file.adoc[]'
      const doc = await documentFromString(input)
      assert.equal(doc.blocks.length, 1)
      assert.equal(doc.blocks[0].context, 'literal')
      assert.equal(doc.blocks[0].source, 'include::include-file.adoc[]')
    })

    test('include directive is disabled when max-include-depth attribute is 0', async () => {
      const input = 'include::include-file.adoc[]'
      const doc = await documentFromString(input, { safe: 'safe', attributes: { 'max-include-depth': 0 } })
      assert.equal(doc.blocks.length, 1)
      assert.equal(doc.blocks[0].source, 'include::include-file.adoc[]')
    })

    test('max-include-depth cannot be set by document', async () => {
      const input = ':max-include-depth: 1\n\ninclude::include-file.adoc[]'
      const doc = await documentFromString(input, { safe: 'safe', attributes: { 'max-include-depth': 0 } })
      assert.equal(doc.blocks.length, 1)
      assert.equal(doc.blocks[0].source, 'include::include-file.adoc[]')
    })

    test('include directive should be disabled if max include depth has been exceeded', async () => {
      const input = 'include::fixtures/parent-include.adoc[depth=1]'
      await usingMemoryLogger(async (logger) => {
        const pseudoDocfile = path.join(FIXTURES_DIR, '..', 'main.adoc')
        const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
        const reader = new PreprocessorReader(doc, input, pseudoDocfile, { normalize: true })
        const lines = await reader.readLines()
        assert.ok(lines.some((l) => l.includes('grandchild-include.adoc')), 'Expected grandchild include to be unprocessed')
        assertMessage(logger, 'ERROR', 'maximum include depth')
      })
    })

    test('include directive should be disabled if max include depth set in nested context has been exceeded', async () => {
      const input = 'include::fixtures/parent-include-restricted.adoc[depth=3]'
      await usingMemoryLogger(async (logger) => {
        const pseudoDocfile = path.join(FIXTURES_DIR, '..', 'main.adoc')
        const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
        const reader = new PreprocessorReader(doc, input, pseudoDocfile, { normalize: true })
        const lines = await reader.readLines()
        assert.ok(lines.includes('first line of child'))
        assert.ok(lines.some((l) => l.includes('grandchild-include.adoc')))
        assertMessage(logger, 'ERROR', 'maximum include depth')
      })
    })

    test('readLinesUntil should not process lines if skipProcessing option is set', async () => {
      const lines = '////\ninclude::fixtures/no-such-file.adoc[]\n////'.split('\n')
      const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
      const reader = new PreprocessorReader(doc, lines, null, { normalize: true })
      await reader.readLine()
      const result = await reader.readLinesUntil({ terminator: '////', skipProcessing: true })
      assert.deepEqual(result, ['include::fixtures/no-such-file.adoc[]'])
    })

    test('skipCommentLines should not process lines read', async () => {
      const lines = '////\ninclude::fixtures/no-such-file.adoc[]\n////'.split('\n')
      await usingMemoryLogger(async (logger) => {
        const doc = await emptyDocument({ base_dir: path.join(FIXTURES_DIR, '..') })
        const reader = new PreprocessorReader(doc, lines, null, { normalize: true })
        await reader.skipCommentLines()
        assert.ok(reader.empty())
        assert.equal(logger.messages.length, 0)
      })
    })
  })

  // ── Conditional Inclusions ────────────────────────────────────────────────

  describe('Conditional Inclusions', () => {
    test('peek_line advances cursor to next conditional line of content', async () => {
      const input = 'ifdef::asciidoctor[]\nAsciidoctor!\nendif::asciidoctor[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(reader.lineno, 1)
      assert.equal(await reader.peekLine(), 'Asciidoctor!')
      assert.equal(reader.lineno, 2)
    })

    test('peek_lines should preprocess lines if direct is false', async () => {
      const input = 'The Asciidoctor\nifdef::asciidoctor[is in.]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const result = await reader.peekLines(2, false)
      assert.deepEqual(result, ['The Asciidoctor', 'is in.'])
    })

    test('peek_lines should not preprocess lines if direct is true', async () => {
      const input = 'The Asciidoctor\nifdef::asciidoctor[is in.]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const result = await reader.peekLines(2, true)
      assert.deepEqual(result, ['The Asciidoctor', 'ifdef::asciidoctor[is in.]'])
    })

    test('peek_lines should not prevent subsequent preprocessing of peeked lines', async () => {
      const input = 'The Asciidoctor\nifdef::asciidoctor[is in.]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      await reader.peekLines(2, true)
      const result = await reader.peekLines(2, false)
      assert.deepEqual(result, ['The Asciidoctor', 'is in.'])
    })

    test('peek_line does not advance cursor when on a regular content line', async () => {
      const input = 'content\nifdef::asciidoctor[]\nAsciidoctor!\nendif::asciidoctor[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(reader.lineno, 1)
      assert.equal(await reader.peekLine(), 'content')
      assert.equal(reader.lineno, 1)
    })

    test('peek_line returns nil if cursor advances past end of source', async () => {
      const input = 'ifdef::foobar[]\nswallowed content\nendif::foobar[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(reader.lineno, 1)
      assert.ok(await reader.peekLine() == null)
      assert.equal(reader.lineno, 4)
    })

    test('peek_line returns nil if contents of skipped conditional is empty line', async () => {
      const input = 'ifdef::foobar[]\n\nendif::foobar[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(reader.lineno, 1)
      assert.ok(await reader.peekLine() == null)
    })

    test('ifdef with defined attribute includes content', async () => {
      const input = 'ifdef::holygrail[]\nThere is a holy grail!\nendif::holygrail[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { holygrail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'There is a holy grail!')
    })

    test('ifdef with defined attribute includes text in brackets', async () => {
      const input = 'On our quest we go...\nifdef::holygrail[There is a holy grail!]\nThere was much rejoicing.'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { holygrail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'On our quest we go...\nThere is a holy grail!\nThere was much rejoicing.')
    })

    test('ifdef attribute name is not case sensitive', async () => {
      const input = 'ifdef::showScript[]\nThe script is shown!\nendif::showScript[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { showscript: '' } })
      const result = await doc.reader.read()
      assert.equal(result, 'The script is shown!')
    })

    test('ifndef with defined attribute does not include text in brackets', async () => {
      const input = 'On our quest we go...\nifndef::hardships[There is a holy grail!]\nThere was no rejoicing.'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { hardships: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'On our quest we go...\nThere was no rejoicing.')
    })

    test('include with non-matching nested exclude', async () => {
      const input = 'ifdef::grail[]\nholy\nifdef::swallow[]\nswallow\nendif::swallow[]\ngrail\nendif::grail[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { grail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'holy\ngrail')
    })

    test('nested excludes with same condition', async () => {
      const input = 'ifndef::grail[]\nifndef::grail[]\nnot here\nendif::grail[]\nendif::grail[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { grail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('include with nested exclude of inverted condition', async () => {
      const input = 'ifdef::grail[]\nholy\nifndef::grail[]\nnot here\nendif::grail[]\ngrail\nendif::grail[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { grail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'holy\ngrail')
    })

    test('exclude with matching nested exclude', async () => {
      const input = 'poof\nifdef::swallow[]\nno\nifdef::swallow[]\nswallow\nendif::swallow[]\nhere\nendif::swallow[]\ngone'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { grail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'poof\ngone')
    })

    test('exclude with nested include using shorthand end', async () => {
      const input = 'poof\nifndef::grail[]\nno grail\nifndef::swallow[]\nor swallow\nendif::[]\nin here\nendif::[]\ngone'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { grail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'poof\ngone')
    })

    test('ifdef with one alternative attribute set includes content', async () => {
      const input = 'ifdef::holygrail,swallow[]\nOur quest is complete!\nendif::holygrail,swallow[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { swallow: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'Our quest is complete!')
    })

    test('ifdef with no alternative attributes set does not include content', async () => {
      const input = 'ifdef::holygrail,swallow[]\nOur quest is complete!\nendif::holygrail,swallow[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('ifdef with all required attributes set includes content', async () => {
      const input = 'ifdef::holygrail+swallow[]\nOur quest is complete!\nendif::holygrail+swallow[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { holygrail: '', swallow: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'Our quest is complete!')
    })

    test('ifdef with missing required attributes does not include content', async () => {
      const input = 'ifdef::holygrail+swallow[]\nOur quest is complete!\nendif::holygrail+swallow[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { holygrail: '' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('ifndef with undefined attribute includes block', async () => {
      const input = 'ifndef::holygrail[]\nOur quest continues to find the holy grail!\nendif::holygrail[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'Our quest continues to find the holy grail!')
    })

    test('ifndef with one alternative attribute set does not include content', async () => {
      const input = 'ifndef::holygrail,swallow[]\nOur quest is complete!\nendif::holygrail,swallow[]'
      const result = await (await load(input, { safe: 'secure', parse: false, attributes: { swallow: '' } })).reader.read()
      assert.equal(result, '')
    })

    test('ifndef with both alternative attributes set does not include content', async () => {
      const input = 'ifndef::holygrail,swallow[]\nOur quest is complete!\nendif::holygrail,swallow[]'
      const result = await (await load(input, { safe: 'secure', parse: false, attributes: { swallow: '', holygrail: '' } })).reader.read()
      assert.equal(result, '')
    })

    test('ifndef with no alternative attributes set includes content', async () => {
      const input = 'ifndef::holygrail,swallow[]\nOur quest is complete!\nendif::holygrail,swallow[]'
      const result = await (await load(input, { safe: 'secure', parse: false })).reader.read()
      assert.equal(result, 'Our quest is complete!')
    })

    test('ifndef with no required attributes set includes content', async () => {
      const input = 'ifndef::holygrail+swallow[]\nOur quest is complete!\nendif::holygrail+swallow[]'
      const result = await (await load(input, { safe: 'secure', parse: false })).reader.read()
      assert.equal(result, 'Our quest is complete!')
    })

    test('ifndef with all required attributes set does not include content', async () => {
      const input = 'ifndef::holygrail+swallow[]\nOur quest is complete!\nendif::holygrail+swallow[]'
      const result = await (await load(input, { safe: 'secure', parse: false, attributes: { swallow: '', holygrail: '' } })).reader.read()
      assert.equal(result, '')
    })

    test('ifndef with at least one required attribute set does not include content', async () => {
      const input = 'ifndef::holygrail+swallow[]\nOur quest is complete!\nendif::holygrail+swallow[]'
      const result = await (await load(input, { safe: 'secure', parse: false, attributes: { swallow: '' } })).reader.read()
      assert.equal(result, 'Our quest is complete!')
    })

    test('ifdef around empty line does not introduce extra line', async () => {
      const input = 'before\nifdef::no-such-attribute[]\n\nendif::[]\nafter'
      const result = await (await load(input, { safe: 'secure', parse: false })).reader.read()
      assert.equal(result, 'before\nafter')
    })

    test('should log warning if endif is unmatched', async () => {
      const input = 'Our quest is complete!\nendif::on-quest[]'
      await usingMemoryLogger(async (logger) => {
        const result = await (await load(input, { safe: 'secure', parse: false, attributes: { 'on-quest': '' } })).reader.read()
        assert.equal(result, 'Our quest is complete!')
        assertMessage(logger, 'ERROR', 'unmatched preprocessor directive')
      })
    })

    test('should log warning if endif is mismatched', async () => {
      const input = 'ifdef::on-quest[]\nOur quest is complete!\nendif::on-journey[]'
      await usingMemoryLogger(async (logger) => {
        const result = await (await load(input, { safe: 'secure', parse: false, attributes: { 'on-quest': '' }, sourcemap: true })).reader.read()
        assert.equal(result, 'Our quest is complete!')
        assertMessage(logger, 'ERROR', 'mismatched preprocessor directive')
      })
    })

    test('escaped ifdef is unescaped and ignored', async () => {
      const input = '\\ifdef::holygrail[]\ncontent\n\\endif::holygrail[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'ifdef::holygrail[]\ncontent\nendif::holygrail[]')
    })

    test('ifeval comparing missing attribute to nil includes content', async () => {
      const input = "ifeval::['{foo}' == '']\nNo foo for you!\nendif::[]"
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'No foo for you!')
    })

    test('ifeval comparing missing attribute to 0 drops content', async () => {
      const input = 'ifeval::[{leveloffset} == 0]\nI didn\'t make the cut!\nendif::[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('ifeval running unsupported operation on missing attribute drops content', async () => {
      const input = 'ifeval::[{leveloffset} >= 3]\nI didn\'t make the cut!\nendif::[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('ifeval comparing double-quoted attribute to matching string includes content', async () => {
      const input = 'ifeval::["{ gem}" == "asciidoctor"]\nAsciidoctor it is!\nendif::[]'.replace('{ gem}', '{gem}')
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { gem: 'asciidoctor' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'Asciidoctor it is!')
    })

    test('ifeval comparing single-quoted attribute to matching string includes content', async () => {
      const input = "ifeval::['{gem}' == 'asciidoctor']\nAsciidoctor it is!\nendif::[]"
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { gem: 'asciidoctor' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'Asciidoctor it is!')
    })

    test('ifeval comparing quoted attribute to non-matching string drops content', async () => {
      const input = "ifeval::['{gem}' == 'asciidoctor']\nAsciidoctor it is!\nendif::[]"
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { gem: 'tilt' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('ifeval comparing attribute to lower version number includes content', async () => {
      const input = "ifeval::['{asciidoctor-version}' >= '0.1.0']\nThat version will do!\nendif::[]"
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'That version will do!')
    })

    test('ifeval comparing attribute to self includes content', async () => {
      const input = "ifeval::['{asciidoctor-version}' == '{asciidoctor-version}']\nOf course it's the same!\nendif::[]"
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), "Of course it's the same!")
    })

    test('ifeval arguments can be transposed', async () => {
      const input = "ifeval::['0.1.0' <= '{asciidoctor-version}']\nThat version will do!\nendif::[]"
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'That version will do!')
    })

    test('ifeval matching numeric equality includes content', async () => {
      const input = 'ifeval::[{rings} == 1]\nOne ring to rule them all!\nendif::[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { rings: '1' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'One ring to rule them all!')
    })

    test('ifeval matching numeric inequality includes content', async () => {
      const input = 'ifeval::[{rings} != 0]\nOne ring to rule them all!\nendif::[]'
      const doc = await load(input, { safe: 'secure', parse: false, attributes: { rings: '1' } })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), 'One ring to rule them all!')
    })

    test('should log error if ifeval has target', async () => {
      const input = 'ifeval::target[1 == 1]\ncontent'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'content')
        assertMessage(logger, 'ERROR', 'target not permitted')
      })
    })

    test('should log error if ifeval has invalid expression', async () => {
      const input = 'ifeval::[1 | 2]\ncontent'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'content')
        assertMessage(logger, 'ERROR', 'invalid expression')
      })
    })

    test('should log error if ifeval is missing expression', async () => {
      const input = 'ifeval::[]\ncontent'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'content')
        assertMessage(logger, 'ERROR', 'missing expression')
      })
    })

    test('ifdef with no target is ignored', async () => {
      const input = 'ifdef::[]\ncontent'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'content')
        assertMessage(logger, 'ERROR', 'missing target')
      })
    })

    test('should not warn about invalid ifdef preprocessor directive if already skipping', async () => {
      const input = 'ifdef::attribute-not-set[]\nfoo\nifdef::[]\nbar\nendif::[]\nbaz'
      await usingMemoryLogger(async (logger) => {
        const result = await (await load(input, { safe: 'secure', parse: false })).reader.read()
        assert.equal(result, 'baz')
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should not warn about invalid ifeval preprocessor directive if already skipping', async () => {
      const input = 'ifdef::attribute-not-set[]\nfoo\nifeval::[]\nbar\nendif::[]\nbaz'
      await usingMemoryLogger(async (logger) => {
        const result = await (await load(input, { safe: 'secure', parse: false })).reader.read()
        assert.equal(result, 'baz')
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should log error with end position if preprocessor conditional directive is unterminated', async () => {
      const input = 'before\nifdef::not-set[]\nskip\nthese\nlines\nfin'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'before')
        assertMessage(logger, 'ERROR', 'detected unterminated preprocessor conditional directive')
      })
    })

    test('should not fail to process preprocessor directive that evaluates to false and has a large number of lines', async () => {
      const data = ('data\n').repeat(5000)
      const input = `before\n\nifdef::attribute-not-set[]\n${data}endif::attribute-not-set[]\n\nafter`
      const doc = await load(input, { safe: 'secure' })
      assert.equal(doc.blocks.length, 2)
      assert.equal(doc.blocks[0].source, 'before')
      assert.equal(doc.blocks[1].source, 'after')
    })

    test('process_line returns null if cursor advanced', async () => {
      const input = 'ifdef::asciidoctor[]\nAsciidoctor!\nendif::asciidoctor[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.equal(await reader.processLine(reader.lines[0]), undefined)
    })

    test('process_line returns line if cursor not advanced', async () => {
      const input = 'content\nifdef::asciidoctor[]\nAsciidoctor!\nendif::asciidoctor[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      assert.notEqual(await reader.processLine(reader.lines[0]), undefined)
    })

    test('ifdef with defined attribute processes include directive in brackets', async () => {
      const input = 'ifdef::asciidoctor-version[include::fixtures/include-file.adoc[tag=snippetA]]'
      const doc = await load(input, { safe: 'safe', parse: false, base_dir: path.join(FIXTURES_DIR, '..') })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines[0], 'snippetA content')
    })

    test('ifdef should permit leading, trailing, and repeat operators', async () => {
      for (const [condition, expected] of [
        ['asciidoctor,', 'content'],
        [',asciidoctor', 'content'],
        ['asciidoctor+', ''],
        ['+asciidoctor', ''],
        ['asciidoctor,,asciidoctor-version', 'content'],
        ['asciidoctor++asciidoctor-version', ''],
      ]) {
        const input = `ifdef::${condition}[]\ncontent\nendif::[]`
        const doc = await load(input, { safe: 'secure', parse: false })
        assert.equal(await doc.reader.read(), expected, `condition: ${condition}`)
      }
    })

    test('should log warning if endif contains text', async () => {
      const input = 'ifdef::on-quest[]\nOur quest is complete!\nendif::on-quest[complete!]\nfin'
      await usingMemoryLogger(async (logger) => {
        const result = await (await load(input, { safe: 'secure', parse: false, attributes: { 'on-quest': '' }, sourcemap: true })).reader.read()
        assert.equal(result, 'Our quest is complete!\nfin')
        assertMessages(logger, [
          ['ERROR', 'malformed preprocessor directive - text not permitted'],
          ['ERROR', 'detected unterminated preprocessor conditional directive'],
        ])
      })
    })

    test('ifeval running invalid operation drops content', async () => {
      const input = 'ifeval::[{asciidoctor-version} > true]\nI didn\'t make the cut!\nendif::[]'
      const doc = await load(input, { safe: 'secure', parse: false })
      const reader = doc.reader
      const lines = []
      while (await reader.hasMoreLines()) lines.push(await reader.readLine())
      assert.equal(lines.join('\n'), '')
    })

    test('should log error with start location if preprocessor conditional directive is unterminated and sourcemap is set', async () => {
      const input = 'before\nifdef::not-set[]\nskip\nthese\nlines\nfin'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false, sourcemap: true })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'before')
        assertMessage(logger, 'ERROR', 'detected unterminated preprocessor conditional directive: ifdef::not-set[]')
      })
    })

    test('should log error if multiple preprocessor conditional directives are unterminated', async () => {
      const input = 'before\nifdef::not-set[]\nskip\nthese\nlines\nifeval::[1 == 2]\n{asciidoctor-version}\nfin'
      await usingMemoryLogger(async (logger) => {
        const doc = await load(input, { safe: 'secure', parse: false, sourcemap: true })
        const reader = doc.reader
        const lines = []
        while (await reader.hasMoreLines()) lines.push(await reader.readLine())
        assert.equal(lines.join('\n'), 'before')
        assertMessages(logger, [
          ['ERROR', 'detected unterminated preprocessor conditional directive: ifdef::not-set[]'],
          ['ERROR', 'detected unterminated preprocessor conditional directive: ifeval::[1 == 2]'],
        ])
      })
    })

    test('should not fail to process lines if reader contains a null entry', async () => {
      const input = ['before', '', '', '', 'after']
      const doc = await load(input.join('\n'), { safe: 'secure' })
      doc.reader.sourceLines[2] = null
      assert.equal(doc.blocks.length, 2)
      assert.equal(doc.blocks[0].source, 'before')
      assert.equal(doc.blocks[1].source, 'after')
    })
  })
})
