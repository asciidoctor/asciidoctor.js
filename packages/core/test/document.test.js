import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { DocumentTitle } from '../src/document.js'
import { SafeMode } from '../src/constants.js'

const BUILT_IN_ELEMENTS = [
  'admonition', 'audio', 'colist', 'dlist', 'document', 'embedded', 'example',
  'floating_title', 'image', 'inline_anchor', 'inline_break', 'inline_button',
  'inline_callout', 'inline_footnote', 'inline_image', 'inline_indexterm',
  'inline_kbd', 'inline_menu', 'inline_quoted', 'listing', 'literal', 'stem',
  'olist', 'open', 'page_break', 'paragraph', 'pass', 'preamble', 'quote',
  'section', 'sidebar', 'table', 'thematic_break', 'toc', 'ulist', 'verse', 'video',
]

// Helpers
// doc.getAttribute(name) returns null for missing attrs AND for empty-string attrs ('' is falsy).
// Use inAttr(doc, name) to check presence regardless of value.
const inAttr = (doc, name) => name in doc.attributes

const parse = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const empty = (opts = {}) => parse('', opts)

// convert to full standalone HTML (with <html>, header, footer)
const convert = async (input, opts = {}) => (await parse(input, { standalone: true, ...opts })).convert()
// convert to embedded HTML (no <html> wrapper)
const embed = async (input, opts = {}) => (await parse(input, opts)).convert()

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
    assert.equal(doc.getAttribute('safe-mode-level'), SafeMode.SECURE)
    assert.equal(doc.getAttribute('safe-mode-name'), 'secure')
    assert.ok(inAttr(doc, 'safe-mode-secure'))
    assert.ok(!inAttr(doc, 'safe-mode-unsafe'))
    assert.ok(!inAttr(doc, 'safe-mode-safe'))
    assert.ok(!inAttr(doc, 'safe-mode-server'))
  })

  test('toc and sectnums enabled by default in docbook backend', async () => {
    const doc = await parse('content', { backend: 'docbook5', standalone: true })
    assert.ok(inAttr(doc, 'toc'))
    assert.ok(inAttr(await doc, 'sectnums'))
    const result = await doc.convert()
    assert.ok(result.includes('<?asciidoc-toc?>'))
    assert.ok(result.includes('<?asciidoc-numbered?>'))
  })

  test('allow document-level attributes to be modified', async () => {
    const doc = await parse('= Document Title\n:lang: fr\n\ncontent is in {lang}')
    assert.equal(doc.getAttribute('lang'), 'fr')
    doc.setAttribute('lang', 'us')
    assert.equal(doc.getAttribute('lang'), 'us')
    const html = await doc.convert()
    assert.ok(html.includes('content is in us'))
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

  test('subtitle with custom separator', async () => {
    const input = '[separator=::]\n= Main Title:: Subtitle\nAuthor Name\n\ncontent'
    const doc = await parse(input)
    const title = doc.doctitle({ partition: true })
    assert.ok(title.hasSubtitle())
    assert.equal(title.main, 'Main Title')
    assert.equal(title.subtitle, 'Subtitle')
  })

  test('doctitle defined as attribute entry', async () => {
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
    assert.equal(doc.getAttribute('author'), 'Stuart Rackham')
    assert.equal(doc.getAttribute('email'), 'founder@asciidoc.org')
    assert.equal(doc.getAttribute('revnumber'), '8.6.8')
    assert.equal(doc.getAttribute('revdate'), '2012-07-12')
    assert.equal(doc.getAttribute('revremark'), 'See changelog.')
  })

  test('author parsed from header line', async () => {
    const input = '= Document Title\nDoc Writer <doc@example.com>\n\ncontent'
    const doc = await parse(input)
    assert.equal(doc.getAttribute('author'), 'Doc Writer')
    assert.equal(doc.getAttribute('email'), 'doc@example.com')
    assert.equal(doc.getAttribute('firstname'), 'Doc')
    assert.equal(doc.getAttribute('lastname'), 'Writer')
  })

  test('authorcount is 0 when document has no header', async () => {
    const doc = await parse('content')
    assert.equal(doc.attributes['authorcount'], 0)
  })

  test('embedded document when standalone is false', async () => {
    const doc = await parse('= Document Title\n\ncontent', { standalone: false })
    assert.ok(inAttr(doc, 'embedded'))
  })

  test('standalone document includes html and header/footer', async () => {
    const doc = await parse('= Title\n\nparagraph', { safe: 'unsafe', standalone: true })
    const result = await doc.convert()
    assert.ok(result.includes('<html'))
    assert.ok(result.includes('id="header"'))
    assert.ok(result.includes('id="footer"'))
  })

  test('hasSections returns true when sections present', async () => {
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

  test('resolveId finds section by title', async () => {
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

  test('hasFootnotes returns true when footnotes present', async () => {
    const doc = await parse('= Title\n\ncontent.footnote:[note]')
    await doc.convert() // footnotes are registered during inline substitution at convert time
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

  test('docbook5 backend sets expected attributes', async () => {
    const doc = await parse('', { attributes: { backend: 'docbook5' } })
    assert.equal(doc.attributes['backend'], 'docbook5')
    assert.ok('backend-docbook5' in doc.attributes)
    assert.equal(doc.attributes['basebackend'], 'docbook')
  })

  test('xhtml5 backend maps to html5 with xml htmlsyntax', async () => {
    const doc = await parse('content', { backend: 'xhtml5' })
    assert.equal(doc.backend, 'html5')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
  })

  test('xhtml backend maps to html5 with xml htmlsyntax', async () => {
    const doc = await parse('content', { backend: 'xhtml' })
    assert.equal(doc.backend, 'html5')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
  })

  test('book doctype produces book body class', async () => {
    const result = await (await parse('= Title\n\nparagraph', { attributes: { backend: 'html5', doctype: 'book' }, standalone: true })).convert()
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
    assert.equal(doc.getAttribute('custom'), 'value')
  })
})

// ── MathJax ───────────────────────────────────────────────────────────────────

describe('MathJax', () => {
  test('adds MathJax script to HTML head if stem attribute is set', async () => {
    const output = await convert('', { attributes: { stem: '' } })
    assert.ok(output.includes('<script type="text/x-mathjax-config">'))
    assert.ok(output.includes('inlineMath: [["\\\\(","\\\\)"]]'))
    assert.ok(output.includes('displayMath: [["\\\\[","\\\\]"]]'))
    assert.ok(output.includes('delimiters: [["\\\\$","\\\\$"]]'))
  })
})

// ── Converter ─────────────────────────────────────────────────────────────────

describe('Converter (extended)', () => {
  test('html5 converter has convert methods for all built-in elements', async () => {
    const doc = await parse('')
    assert.equal(doc.attributes['backend'], 'html5')
    assert.ok('backend-html5' in doc.attributes)
    assert.equal(doc.attributes['basebackend'], 'html')
    assert.ok('basebackend-html' in doc.attributes)
    const converter = doc.converter
    for (const element of BUILT_IN_ELEMENTS) {
      assert.equal(typeof converter[`convert_${element}`], 'function', `missing convert_${element}`)
    }
  })

  test('adds favicon link tag when favicon attribute is empty string', async () => {
    const result = await convert('= Untitled', { attributes: { favicon: '' } })
    assert.ok(result.includes('rel="icon"'))
    assert.ok(result.includes('href="favicon.ico"'))
    assert.ok(result.includes('type="image/x-icon"'))
  })

  test('adds favicon link tag when favicon attribute is a .ico path', async () => {
    const result = await convert('= Untitled', { attributes: { favicon: '/favicon.ico' } })
    assert.ok(result.includes('href="/favicon.ico"'))
    assert.ok(result.includes('type="image/x-icon"'))
  })

  test('adds favicon link tag when favicon attribute is a .png path', async () => {
    const result = await convert('= Untitled', { attributes: { favicon: '/img/favicon.png' } })
    assert.ok(result.includes('href="/img/favicon.png"'))
    assert.ok(result.includes('type="image/png"'))
  })
})

// ── HTML output (Structure extended) ─────────────────────────────────────────

describe('HTML output', () => {
  test('standalone document has html, header and footer', async () => {
    const result = await convert('= Title\n\nparagraph', { safe: 'unsafe' })
    assert.ok(result.includes('<html'))
    assert.ok(result.includes('id="header"'))
    assert.ok(result.includes('<h1>Title</h1>'))
    assert.ok(result.includes('id="footer"'))
    assert.ok(result.includes('id="content"'))
  })

  test('nofooter suppresses footer div', async () => {
    const result = await convert(':nofooter:\n\ncontent')
    assert.ok(!result.includes('id="footer"'))
  })

  test('last-update-label! disables last updated text in footer', async () => {
    const result = await convert('= Document Title\n\npreamble', { attributes: { 'last-update-label!': '' } })
    assert.ok(result.includes('id="footer-text"'))
    // footer-text should be empty (no "Last updated" text)
    assert.match(result, /id="footer-text"[^>]*>\s*<\/div>/)
  })

  test('embedded document has no html wrapper or header/footer divs', async () => {
    const result = await embed('= Document Title\n\ncontent', { standalone: false })
    assert.ok(!result.includes('<html'))
    assert.ok(!result.includes('id="header"'))
    assert.ok(!result.includes('id="footer"'))
  })

  test('metadata: author, description, keywords, copyright, revision in head', async () => {
    const input = [
      '= AsciiDoc',
      'Stuart Rackham <founder@asciidoc.org>',
      'v8.6.8, 2012-07-12: See changelog.',
      ':description: AsciiDoc user guide',
      ':keywords: asciidoc,documentation',
      ':copyright: Stuart Rackham',
      '',
      '== Version 8.6.8',
      '',
      'more info...',
    ].join('\n')
    const output = await convert(input)
    assert.ok(output.includes('name="author" content="Stuart Rackham"'))
    assert.ok(output.includes('name="description" content="AsciiDoc user guide"'))
    assert.ok(output.includes('name="keywords" content="asciidoc,documentation"'))
    assert.ok(output.includes('name="copyright" content="Stuart Rackham"'))
    assert.ok(output.includes('id="author"') && output.includes('Stuart Rackham'))
    assert.ok(output.includes('id="revnumber"') && output.includes('8.6.8'))
    assert.ok(output.includes('id="revdate"') && output.includes('2012-07-12'))
    assert.ok(output.includes('id="revremark"') && output.includes('See changelog.'))
  })

  test('author apostrophe is substituted as right single quotation mark entity', async () => {
    const input = "= Document Title\nStephen O'Grady <founder@redmonk.com>\n\ncontent"
    const output = await convert(input)
    assert.ok(output.includes('&#8217;'))
    assert.ok(output.includes('name="author"') && output.includes('Stephen O&#8217;Grady'))
  })

  test('ampersand in author name is not double-escaped', async () => {
    const input = '= Document Title\nR&D Lab\n\n{author}'
    const output = await convert(input)
    const count = (output.match(/R&amp;D Lab/g) || []).length
    assert.ok(count >= 2, `expected at least 2 occurrences of R&amp;D Lab, got ${count}`)
  })

  test('multiple authors appear in HTML output', async () => {
    const input = '= Document Title\nDoc Writer <thedoctor@asciidoc.org>; Junior Writer <junior@asciidoctor.org>\n\ncontent'
    const output = await convert(input)
    assert.ok(output.includes('id="author"') && output.includes('Doc Writer'))
    assert.ok(output.includes('id="author2"') && output.includes('Junior Writer'))
    assert.ok(output.includes('href="mailto:thedoctor@asciidoc.org"'))
    assert.ok(output.includes('href="mailto:junior@asciidoctor.org"'))
  })

  test('max-width attribute sets inline style on top-level containers', async () => {
    const input = '= Document Title\n\ncontent'
    const output = await convert(input, { attributes: { 'max-width': '70em' } })
    assert.ok(output.includes('id="header" style="max-width: 70em;"'))
    assert.ok(output.includes('id="content" style="max-width: 70em;"'))
    assert.ok(output.includes('id="footer" style="max-width: 70em;"'))
  })

  test('embedded document with notitle! shows h1 but no header/footer divs', async () => {
    const input = '= Document Title\n\ncontent'
    const result = await embed(input, { attributes: { 'notitle!': '' } })
    assert.ok(!result.includes('<html'))
    assert.ok(result.includes('<h1>'))
    assert.ok(!result.includes('id="header"'))
    assert.ok(!result.includes('id="footer"'))
  })
})

// ── Backends and Doctypes (extended) ─────────────────────────────────────────

describe('Backends and Doctypes (extended)', () => {
  test('html5 doctype article produces article body class', async () => {
    const result = await convert('= Title\n\nparagraph', { attributes: { backend: 'html5' } })
    assert.ok(result.includes('<html'))
    assert.ok(result.includes('class="article"'))
    assert.ok(result.includes('<h1>Title</h1>'))
  })

  test('html5 doctype book produces book body class', async () => {
    const result = await convert('= Title\n\nparagraph', { attributes: { backend: 'html5', doctype: 'book' } })
    assert.ok(result.includes('class="book"'))
    assert.ok(result.includes('<h1>Title</h1>'))
  })

  test('htmlsyntax xml via API produces self-closing hr tag', async () => {
    const doc = await parse('---', { safe: 'safe', attributes: { htmlsyntax: 'xml' } })
    assert.equal(doc.backend, 'html5')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<hr/>'))
  })

  test('htmlsyntax xml in document header if followed by backend produces self-closing hr', async () => {
    const input = ':htmlsyntax: xml\n:backend: html5\n\n---'
    const doc = await parse(input, { safe: 'safe' })
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<hr/>'))
  })

  test('htmlsyntax xml not honored if backend entry comes before htmlsyntax in header', async () => {
    const input = ':backend: html5\n:htmlsyntax: xml\n\n---'
    const doc = await parse(input, { safe: 'safe' })
    const result = await doc.convert()
    assert.ok(result.includes('<hr>'))
    assert.ok(!result.includes('<hr/>'))
  })
})

// ── Compat get* API ───────────────────────────────────────────────────────────

describe('Compat get* API', () => {
  const STRUCTURAL_INPUT = [
    '= Sample Document',
    'Doc Writer <doc.writer@asciidoc.org>',
    'v1.0, 2013-05-20: First draft',
    ':tags: [document, example]',
    '',
    '== First Section',
    '',
    'Some content.',
    '',
    '== Second Section',
    '',
    'More content.',
  ].join('\n')

  test('getHeader returns the level-0 section with title', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    const header = doc.getHeader()
    assert.equal(header.level, 0)
    assert.equal(header.title, 'Sample Document')
  })

  test('getDocumentTitle returns the document title string', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.equal(doc.getDocumentTitle(), 'Sample Document')
  })

  test('getRevisionDate returns revdate attribute value', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.equal(doc.getRevisionDate(), '2013-05-20')
  })

  test('getRevdate is an alias for getRevisionDate', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.equal(doc.getRevdate(), doc.getRevisionDate())
  })

  test('getRevisionNumber returns revnumber attribute value', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.equal(doc.getRevisionNumber(), '1.0')
  })

  test('getRevisionRemark returns revremark attribute value', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.equal(doc.getRevisionRemark(), 'First draft')
  })

  test('getRevisionDate/Number/Remark return undefined when not set', async () => {
    const doc = await parse('= Title\n\ncontent')
    assert.equal(doc.getRevisionDate(), undefined)
    assert.equal(doc.getRevisionNumber(), undefined)
    assert.equal(doc.getRevisionRemark(), undefined)
  })

  test('hasRevisionInfo returns true when revision info is present', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.ok(doc.hasRevisionInfo())
  })

  test('hasRevisionInfo returns false when no revision info', async () => {
    const doc = await parse('= Title\n\ncontent')
    assert.ok(!doc.hasRevisionInfo())
  })

  test('getRevisionInfo exposes date, number and remark via getters', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    const info = doc.getRevisionInfo()
    assert.ok(!info.isEmpty())
    assert.equal(info.getDate(), '2013-05-20')
    assert.equal(info.getNumber(), '1.0')
    assert.equal(info.getRemark(), 'First draft')
  })

  test('getReferences returns the same object as getCatalog', async () => {
    const doc = await parse(STRUCTURAL_INPUT)
    assert.equal(doc.getReferences(), doc.getCatalog())
  })

  test('getRefs returns the refs map from the catalog', async () => {
    const input = '= Title\n\n[#my-section]\n== My Section\n\ncontent'
    const doc = await parse(input)
    const refs = doc.getRefs()
    assert.ok(refs != null)
    assert.ok('_my_section' in refs || 'my-section' in refs || Object.values(refs).some((r) => r.id === 'my-section' || r.id === '_my_section'))
  })

  test('getImages returns images registered via catalog_assets', async () => {
    const input = '= Title\n\nimage::sunset.jpg[Sunset,300,200]\n\nimage::ocean.jpg[Ocean]'
    const doc = await parse(input, { catalog_assets: true })
    const images = doc.getImages()
    assert.equal(images.length, 2)
    assert.equal(images[0].target, 'sunset.jpg')
    assert.equal(images[1].target, 'ocean.jpg')
  })

  test('getImages returns empty array when catalog_assets is not enabled', async () => {
    const input = '= Title\n\nimage::sunset.jpg[Sunset]'
    const doc = await parse(input)
    assert.equal(doc.getImages().length, 0)
  })

  test('getLinks returns links registered after convert when catalog_assets is enabled', async () => {
    const input = 'https://asciidoctor.org[Asciidoctor]\n\nlink:index.html[Docs]'
    const doc = await parse(input, { catalog_assets: true })
    await doc.convert()
    const links = doc.getLinks()
    assert.ok(links.includes('https://asciidoctor.org'))
    assert.ok(links.includes('index.html'))
  })

  test('getSyntaxHighlighter returns null when no highlighter is configured', async () => {
    const doc = await parse('= Title\n\ncontent')
    assert.equal(doc.getSyntaxHighlighter(), null)
  })

  test('isBasebackend returns true when basebackend attribute is set', async () => {
    const doc = await parse('= Title\n\ncontent', { backend: 'html5' })
    assert.ok(doc.isBasebackend())
  })

  test('getNotitle returns true when notitle attribute is set', async () => {
    const doc = await parse(':notitle:\n\ncontent')
    assert.ok(doc.getNotitle())
  })

  test('getNotitle returns false in standalone mode (notitle not set)', async () => {
    const doc = await parse('= Title\n\ncontent', { standalone: true })
    assert.ok(!doc.getNotitle())
  })

  test('getNoheader returns true when noheader attribute is set', async () => {
    const doc = await parse(':noheader:\n\ncontent')
    assert.ok(doc.getNoheader())
  })

  test('getNofooter returns true when nofooter attribute is set', async () => {
    const doc = await parse(':nofooter:\n\ncontent')
    assert.ok(doc.getNofooter())
  })

  test('restoreAttributes restores attributes to header state', async () => {
    const doc = await parse('= Title\n:foo: original\n\ncontent')
    doc.setAttribute('foo', 'modified')
    assert.equal(doc.getAttribute('foo'), 'modified')
    doc.restoreAttributes()
    assert.equal(doc.getAttribute('foo'), 'original')
  })

  test('hasDocinfoProcessors returns false when no extensions registered', async () => {
    const doc = await parse('= Title\n\ncontent')
    assert.ok(!doc.hasDocinfoProcessors())
    assert.ok(!doc.hasDocinfoProcessors('footer'))
  })

  test('getConverter returns the converter instance', async () => {
    const doc = await parse('= Title\n\ncontent')
    const converter = doc.getConverter()
    assert.ok(converter != null)
    assert.equal(typeof converter.convert, 'function')
  })
})
