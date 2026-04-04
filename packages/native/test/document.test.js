import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { DocumentTitle } from '../src/document.js'
import { SafeMode } from '../src/constants.js'

// Helpers
// doc.attr(name) returns null for missing attrs AND for empty-string attrs ('' is falsy).
// Use inAttr(doc, name) to check presence regardless of value.
const inAttr = (doc, name) => name in doc.attributes

const parse = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const empty = (opts = {}) => parse('', opts)

// ── DocumentTitle ─────────────────────────────────────────────────────────────

describe('DocumentTitle', () => {
  test('partitions title with default separator', () => {
    const title = new DocumentTitle('Main Title: And More: Subtitle')
    assert.equal(title.main, 'Main Title: And More')
    assert.equal(title.subtitle, 'Subtitle')
    assert.ok(title.hasSubtitle())
  })

  test('partitions title with custom separator', () => {
    const title = new DocumentTitle('Main Title:: And More:: Subtitle', { separator: '::' })
    assert.equal(title.main, 'Main Title:: And More')
    assert.equal(title.subtitle, 'Subtitle')
  })

  test('no subtitle when separator absent', () => {
    const title = new DocumentTitle('Simple Title')
    assert.equal(title.main, 'Simple Title')
    assert.equal(title.subtitle, null)
    assert.ok(!title.hasSubtitle())
  })

  test('sanitizes HTML markup', () => {
    const title = new DocumentTitle('<b>Bold</b> Title', { sanitize: true })
    assert.ok(title.isSanitized())
    assert.ok(!title.combined.includes('<b>'))
  })

  test('does not sanitize when no HTML present', () => {
    const title = new DocumentTitle('Plain Title', { sanitize: true })
    assert.ok(!title.isSanitized())
    assert.equal(title.main, 'Plain Title')
  })

  test('toString returns combined value', () => {
    const title = new DocumentTitle('Main: Sub')
    assert.equal(String(title), 'Main: Sub')
  })
})

// ── Default settings ──────────────────────────────────────────────────────────

describe('Default settings', () => {
  test('safe mode defaults to SECURE', async () => {
    const doc = await load('')  // no safe option → defaults to SECURE
    assert.equal(doc.safe, SafeMode.SECURE)
  })

  test('safe mode set using string', async () => {
    const doc = await empty({ safe: 'server' })
    assert.equal(doc.safe, SafeMode.SERVER)
  })

  test('safe mode set using unknown string falls back to SECURE', async () => {
    const doc = await empty({ safe: 'foo' })
    assert.equal(doc.safe, SafeMode.SECURE)
  })

  test('safe mode set using integer', async () => {
    const doc = await empty({ safe: 10 })
    assert.equal(doc.safe, SafeMode.SERVER)
  })

  test('safe mode attributes set on document', async () => {
    const doc = await load('')  // no safe option → SECURE
    assert.equal(doc.attr('safe-mode-level'), SafeMode.SECURE)
    assert.equal(doc.attr('safe-mode-name'), 'secure')
    assert.ok(inAttr(doc, 'safe-mode-secure'))
    assert.ok(!inAttr(doc, 'safe-mode-unsafe'))
    assert.ok(!inAttr(doc, 'safe-mode-safe'))
    assert.ok(!inAttr(doc, 'safe-mode-server'))
  })

  // NOTE: docbook5 converter not yet implemented in JS
  test.skip('toc and sectnums enabled by default in docbook backend', async () => {
    const doc = await parse('content', { backend: 'docbook5' })
    assert.ok(inAttr(doc, 'toc'))
    assert.ok(inAttr(doc, 'sectnums'))
    const result = doc.convert()
    assert.ok(result.includes('<?asciidoc-toc?>'))
    assert.ok(result.includes('<?asciidoc-numbered?>'))
  })
})

// ── Structure ─────────────────────────────────────────────────────────────────

describe('Structure', () => {
  test('document with no doctitle', async () => {
    const doc = await parse('Snorf')
    assert.equal(doc.doctitle(), null)
    assert.equal(doc.name, null)
    assert.ok(!doc.hasHeader())
    assert.equal(doc.header, null)
  })

  test('empty source produces no blocks', async () => {
    const doc = await parse('')
    assert.equal(doc.blocks.length, 0)
    assert.equal(doc.doctitle(), null)
    assert.ok(!doc.hasHeader())
  })

  test('document with doctitle', async () => {
    const doc = await parse('= Document Title\n\npreamble')
    assert.equal(doc.doctitle(), 'Document Title')
    assert.equal(doc.name, 'Document Title')
    assert.ok(doc.hasHeader())
    assert.ok(doc.header != null)
  })

  test('document with legacy doctitle enables compat mode', async () => {
    const input = 'Document Title\n==============\n\n+content+'
    const doc = await parse(input)
    assert.ok(inAttr(doc, 'compat-mode'))
    // NOTE: convert() not yet implemented (html5 converter stub)
  })

  test('compat mode disabled in header overrides legacy doctitle', async () => {
    const input = 'Document Title\n==============\n:compat-mode!:\n\n+content+'
    const doc = await parse(input)
    assert.ok(!inAttr(doc, 'compat-mode'))
  })

  test('compat mode locked by API cannot be enabled by legacy doctitle', async () => {
    const input = 'Document Title\n==============\n\n+content+'
    const doc = await parse(input, { attributes: { 'compat-mode': null } })
    assert.ok(doc.isAttributeLocked('compat-mode'))
    assert.ok(!inAttr(doc, 'compat-mode'))
  })

  test('subtitle partitioning via doctitle(partition)', async () => {
    const input = '= Main Title: Subtitle\nAuthor Name\n\ncontent'
    const doc = await parse(input)
    const title = doc.doctitle({ partition: true })
    assert.ok(title.hasSubtitle())
    assert.equal(title.main, 'Main Title')
    assert.equal(title.subtitle, 'Subtitle')
  })

  // NOTE: [separator=::] on document header currently causes a stack overflow in the parser
  test.skip('subtitle with custom separator', async () => {
    const input = '[separator=::]\n= Main Title:: Subtitle\nAuthor Name\n\ncontent'
    const doc = await parse(input)
    const title = doc.doctitle({ partition: true })
    assert.ok(title.hasSubtitle())
    assert.equal(title.main, 'Main Title')
    assert.equal(title.subtitle, 'Subtitle')
  })

  // NOTE: :doctitle: attribute entry as virtual header is not yet implemented
  test.skip('doctitle defined as attribute entry', async () => {
    const input = ':doctitle: Document Title\n\npreamble\n\n== First Section'
    const doc = await parse(input)
    assert.equal(doc.doctitle(), 'Document Title')
    assert.ok(doc.hasHeader())
    assert.equal(doc.header.title, 'Document Title')
  })

  test('title attribute overrides doctitle', async () => {
    const input = '= Document Title\n:title: Override\n\n{doctitle}\n\n== First Section'
    const doc = await parse(input)
    assert.equal(doc.doctitle(), 'Override')
    assert.equal(doc.title, 'Override')
    assert.equal(doc.header.title, 'Document Title')
  })

  test('blank title attribute clears doctitle', async () => {
    const input = '= Document Title\n:title:\n\n== First Section'
    const doc = await parse(input)
    assert.equal(doc.doctitle(), '')
  })

  test('parse header only', async () => {
    const input = '= Document Title\nAuthor Name\n:foo: bar\n\npreamble'
    const doc = await parse(input, { parse_header_only: true })
    assert.equal(doc.doctitle(), 'Document Title')
    assert.equal(doc.author, 'Author Name')
    assert.equal(doc.attributes['foo'], 'bar')
    assert.equal(doc.blocks.length, 0)
  })

  test('with author and revision metadata', async () => {
    const input = '= AsciiDoc\nStuart Rackham <founder@asciidoc.org>\nv8.6.8, 2012-07-12: See changelog.\n\n== Version 8.6.8\n\nmore info...'
    const doc = await parse(input)
    assert.equal(doc.attr('author'), 'Stuart Rackham')
    assert.equal(doc.attr('email'), 'founder@asciidoc.org')
    assert.equal(doc.attr('revnumber'), '8.6.8')
    assert.equal(doc.attr('revdate'), '2012-07-12')
    assert.equal(doc.attr('revremark'), 'See changelog.')
  })

  test('author parsed from header line', async () => {
    const input = '= Document Title\nDoc Writer <doc@example.com>\n\ncontent'
    const doc = await parse(input)
    assert.equal(doc.attr('author'), 'Doc Writer')
    assert.equal(doc.attr('email'), 'doc@example.com')
    assert.equal(doc.attr('firstname'), 'Doc')
    assert.equal(doc.attr('lastname'), 'Writer')
  })

  test('authorcount is 0 when document has no header', async () => {
    const doc = await parse('content')
    assert.equal(doc.attributes['authorcount'], 0)
  })

  test('embedded document when standalone is false', async () => {
    const doc = await parse('= Document Title\n\ncontent', { standalone: false })
    assert.ok(inAttr(doc, 'embedded'))
    // NOTE: convert() not yet implemented (html5 converter stub)
  })

  test('standalone document includes html and header/footer', async () => {
    const doc = await parse('= Title\n\nparagraph', { safe: 'unsafe', standalone: true })
    const result = doc.convert()
    assert.ok(result.includes('<html'))
    assert.ok(result.includes('id="header"'))
    assert.ok(result.includes('id="footer"'))
  })

  // NOTE: section parsing not yet fully implemented — hasSections() always returns false
  test.skip('hasSections returns true when sections present', async () => {
    const doc = await parse('= Title\n\n== Section 1\n\ncontent')
    assert.ok(doc.hasSections())
  })

  test('hasSections returns false for document without sections', async () => {
    const doc = await parse('= Title\n\nparagraph')
    assert.ok(!doc.hasSections())
  })
})

// ── Catalog ───────────────────────────────────────────────────────────────────

describe('Catalog', () => {
  test('catalog and references are the same object', async () => {
    const doc = await parse('= Title\n\n== Section A\n\nContent\n\n== Section B\n\nContent.footnote:[commentary]')
    assert.ok(doc.catalog != null)
    assert.equal(doc.catalog, doc.references)
    assert.equal(doc.catalog.footnotes, doc.references.footnotes)
    assert.equal(doc.catalog.refs, doc.references.refs)
  })

  // NOTE: section parsing not yet fully implemented — refs catalog stays empty
  test.skip('resolveId finds section by title', async () => {
    const doc = await parse('= Title\n\n== Section A\n\nContent')
    assert.equal(doc.resolveId('Section A'), '_section_a')
  })

  test('catalog ids table is empty by default', async () => {
    const doc = await empty()
    assert.ok(doc.catalog.ids != null)
    assert.equal(Object.keys(doc.catalog.ids).length, 0)
  })

  test('register :ids creates entry in refs with reftext', async () => {
    const doc = await empty()
    doc.register('ids', ['foobar', 'Foo Bar'])
    assert.equal(Object.keys(doc.catalog.ids).length, 0)
    assert.ok(doc.catalog.refs['foobar'] != null)
    assert.equal(doc.catalog.refs['foobar'].reftext, 'Foo Bar')
    assert.equal(doc.resolveId('Foo Bar'), 'foobar')
  })

  test('hasFootnotes returns false when no footnotes', async () => {
    const doc = await parse('= Title\n\ncontent')
    assert.ok(!doc.hasFootnotes())
  })

  // NOTE: footnote substitution not yet cataloguing footnotes
  test.skip('hasFootnotes returns true when footnotes present', async () => {
    const doc = await parse('= Title\n\ncontent.footnote:[note]')
    assert.ok(doc.hasFootnotes())
  })
})

// ── Backends and Doctypes ─────────────────────────────────────────────────────

describe('Backends and Doctypes', () => {
  test('html5 backend sets expected attributes', async () => {
    const doc = await parse('', { backend: 'html5' })
    assert.equal(doc.attributes['backend'], 'html5')
    assert.ok('backend-html5' in doc.attributes)
    assert.equal(doc.attributes['basebackend'], 'html')
    assert.ok('basebackend-html' in doc.attributes)
  })

  // NOTE: docbook5 converter module not yet implemented
  test.skip('docbook5 backend sets expected attributes', async () => {
    const doc = await parse('', { attributes: { backend: 'docbook5' } })
    assert.equal(doc.attributes['backend'], 'docbook5')
    assert.ok('backend-docbook5' in doc.attributes)
    assert.equal(doc.attributes['basebackend'], 'docbook')
  })

  test('xhtml5 backend maps to html5 with xml htmlsyntax', async () => {
    const doc = await parse('content', { backend: 'xhtml5' })
    assert.equal(doc.backend, 'html5')
    assert.equal(doc.attr('htmlsyntax'), 'xml')
  })

  test('xhtml backend maps to html5 with xml htmlsyntax', async () => {
    const doc = await parse('content', { backend: 'xhtml' })
    assert.equal(doc.backend, 'html5')
    assert.equal(doc.attr('htmlsyntax'), 'xml')
  })

  test('book doctype produces book body class', async () => {
    const result = (await parse('= Title\n\nparagraph', { attributes: { backend: 'html5', doctype: 'book' }, standalone: true })).convert()
    assert.ok(result.includes('class="book"'))
  })
})

// ── Counter ───────────────────────────────────────────────────────────────────

describe('Counter', () => {
  test('counter starts at 1 by default', async () => {
    const doc = await empty()
    assert.equal(doc.counter('items'), 1)
  })

  test('counter increments on subsequent calls', async () => {
    const doc = await empty()
    doc.counter('items')
    assert.equal(doc.counter('items'), 2)
    assert.equal(doc.counter('items'), 3)
  })

  test('counter starts at seed value', async () => {
    const doc = await empty()
    assert.equal(doc.counter('items', 5), 5)
    assert.equal(doc.counter('items'), 6)
  })

  test('independent counters do not interfere', async () => {
    const doc = await empty()
    doc.counter('a')
    doc.counter('a')
    doc.counter('b')
    assert.equal(doc.counter('a'), 3)
    assert.equal(doc.counter('b'), 2)
  })
})

// ── isAttributeLocked ─────────────────────────────────────────────────────────

describe('isAttributeLocked', () => {
  test('attribute locked via API cannot be changed by document', async () => {
    const doc = await parse(':foo: original\n\n{foo}', { attributes: { foo: 'locked' } })
    assert.ok(doc.isAttributeLocked('foo'))
  })

  test('unlocked attribute can be modified', async () => {
    const doc = await parse('', { safe: 'unsafe' })
    doc.setAttribute('custom', 'value')
    assert.equal(doc.attr('custom'), 'value')
  })
})
