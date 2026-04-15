// ESM conversion of parser_test.rb
// Tests for the Parser class static methods.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { Parser } from '../src/parser.js'
import { Reader } from '../src/reader.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Creates an empty document (loaded from an empty string).
const emptyDocument = async (opts = {}) => load('', { safe: 'safe', ...opts })

// Mirrors the Ruby test helper: create a Reader from input lines and call
// Parser.parseHeaderMetadata, optionally passing a document.
async function parseHeaderMetadata (input, doc = null) {
  const lines = input === '' ? [] : input.split('\n')
  const reader = new Reader(lines)
  return await Parser.parseHeaderMetadata(reader, doc)
}

// ── Parser ────────────────────────────────────────────────────────────────────

describe('Parser', () => {
  // ── isSectionTitle ──────────────────────────────────────────────────────────

  test('is_section_title?', () => {
    assert.ok(Parser.isSectionTitle('AsciiDoc Home Page', '==================') != null)
    assert.ok(Parser.isSectionTitle('=== AsciiDoc Home Page') != null)
  })

  // ── sanitizeAttributeName ───────────────────────────────────────────────────

  test('sanitize attribute name', () => {
    assert.equal(Parser.sanitizeAttributeName('Foo Bar'), 'foobar')
    assert.equal(Parser.sanitizeAttributeName('foo'), 'foo')
    assert.equal(Parser.sanitizeAttributeName('Foo 3^ # - Bar['), 'foo3-bar')
  })

  // ── storeAttribute ──────────────────────────────────────────────────────────

  test('store attribute with value', () => {
    const [attrName, attrValue] = Parser.storeAttribute('foo', 'bar')
    assert.equal(attrName, 'foo')
    assert.equal(attrValue, 'bar')
  })

  test('store attribute with negated value', () => {
    for (const [name, value] of [['foo!', null], ['!foo', null], ['foo', null]]) {
      const [attrName, attrValue] = Parser.storeAttribute(name, value)
      assert.equal(attrName, name.replace('!', ''))
      assert.equal(attrValue, null)
    }
  })

  test('store accessible attribute on document with value', async () => {
    const doc = await emptyDocument()
    doc.setAttribute('foo', 'baz')
    const attrs = {}
    const [attrName, attrValue] = Parser.storeAttribute('foo', 'bar', doc, attrs)
    assert.equal(attrName, 'foo')
    assert.equal(attrValue, 'bar')
    assert.equal(doc.attr('foo'), 'bar')
    assert.ok('attribute_entries' in attrs)
    assert.equal(attrs.attribute_entries.length, 1)
    assert.equal(attrs.attribute_entries[0].name, 'foo')
    assert.equal(attrs.attribute_entries[0].value, 'bar')
  })

  test('store accessible attribute on document with value that contains attribute reference', async () => {
    const doc = await emptyDocument()
    doc.setAttribute('foo', 'baz')
    doc.setAttribute('release', 'ultramega')
    const attrs = {}
    const [attrName, attrValue] = Parser.storeAttribute('foo', '{release}', doc, attrs)
    assert.equal(attrName, 'foo')
    assert.equal(attrValue, 'ultramega')
    assert.equal(doc.attr('foo'), 'ultramega')
    assert.ok('attribute_entries' in attrs)
    assert.equal(attrs.attribute_entries.length, 1)
    assert.equal(attrs.attribute_entries[0].name, 'foo')
    assert.equal(attrs.attribute_entries[0].value, 'ultramega')
  })

  test('store inaccessible attribute on document with value', async () => {
    const doc = await emptyDocument({ attributes: { foo: 'baz' } })
    const attrs = {}
    const [attrName, attrValue] = Parser.storeAttribute('foo', 'bar', doc, attrs)
    assert.equal(attrName, 'foo')
    assert.equal(attrValue, 'bar')
    assert.equal(doc.attr('foo'), 'baz')
    assert.ok(!('attribute_entries' in attrs))
  })

  test('store accessible attribute on document with negated value', async () => {
    for (const [name, value] of [['foo!', null], ['!foo', null], ['foo', null]]) {
      const doc = await emptyDocument()
      doc.setAttribute('foo', 'baz')
      const attrs = {}
      const [attrName, attrValue] = Parser.storeAttribute(name, value, doc, attrs)
      assert.equal(attrName, name.replace('!', ''))
      assert.equal(attrValue, null)
      assert.ok('attribute_entries' in attrs)
      assert.equal(attrs.attribute_entries.length, 1)
      assert.equal(attrs.attribute_entries[0].name, 'foo')
      assert.equal(attrs.attribute_entries[0].value, null)
    }
  })

  test('store inaccessible attribute on document with negated value', async () => {
    for (const [name, value] of [['foo!', null], ['!foo', null], ['foo', null]]) {
      const doc = await emptyDocument({ attributes: { foo: 'baz' } })
      const attrs = {}
      const [attrName, attrValue] = Parser.storeAttribute(name, value, doc, attrs)
      assert.equal(attrName, name.replace('!', ''))
      assert.equal(attrValue, null)
      assert.ok(!('attribute_entries' in attrs))
    }
  })

  // ── parseStyleAttribute ─────────────────────────────────────────────────────

  test('parse style attribute with id and role', () => {
    const attributes = { 1: 'style#id.role' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, 'style')
    assert.equal(attributes['style'], 'style')
    assert.equal(attributes['id'], 'id')
    assert.equal(attributes['role'], 'role')
    assert.equal(attributes[1], 'style#id.role')
  })

  test('parse style attribute with style, role, id and option', () => {
    const attributes = { 1: 'style.role#id%fragment' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, 'style')
    assert.equal(attributes['style'], 'style')
    assert.equal(attributes['id'], 'id')
    assert.equal(attributes['role'], 'role')
    assert.equal(attributes['fragment-option'], '')
    assert.equal(attributes[1], 'style.role#id%fragment')
    assert.ok(!('options' in attributes))
  })

  test('parse style attribute with style, id and multiple roles', () => {
    const attributes = { 1: 'style#id.role1.role2' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, 'style')
    assert.equal(attributes['style'], 'style')
    assert.equal(attributes['id'], 'id')
    assert.equal(attributes['role'], 'role1 role2')
    assert.equal(attributes[1], 'style#id.role1.role2')
  })

  test('parse style attribute with style, multiple roles and id', () => {
    const attributes = { 1: 'style.role1.role2#id' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, 'style')
    assert.equal(attributes['style'], 'style')
    assert.equal(attributes['id'], 'id')
    assert.equal(attributes['role'], 'role1 role2')
    assert.equal(attributes[1], 'style.role1.role2#id')
  })

  test('parse style attribute with positional and original style', () => {
    const attributes = { 1: 'new_style', style: 'original_style' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, 'new_style')
    assert.equal(attributes['style'], 'new_style')
    assert.equal(attributes[1], 'new_style')
  })

  test('parse style attribute with id and role only', () => {
    const attributes = { 1: '#id.role' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, null)
    assert.equal(attributes['id'], 'id')
    assert.equal(attributes['role'], 'role')
    assert.equal(attributes[1], '#id.role')
  })

  test('parse empty style attribute', () => {
    const attributes = { 1: null }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, null)
    assert.equal(attributes['id'], undefined)
    assert.equal(attributes['role'], undefined)
    assert.equal(attributes[1], null)
  })

  test('parse style attribute with option should preserve existing options', () => {
    const attributes = { 1: '%header', 'footer-option': '' }
    const style = Parser.parseStyleAttribute(attributes)
    assert.equal(style, null)
    assert.equal(attributes['header-option'], '')
    assert.equal(attributes['footer-option'], '')
  })

  // ── parseHeaderMetadata – authors ───────────────────────────────────────────

  test('parse author first', async () => {
    const metadata = await parseHeaderMetadata('Stuart')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stuart')
    assert.equal(metadata['authorinitials'], 'S')
  })

  test('parse author first last', async () => {
    const metadata = await parseHeaderMetadata('Yukihiro Matsumoto')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Yukihiro Matsumoto')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Yukihiro')
    assert.equal(metadata['lastname'], 'Matsumoto')
    assert.equal(metadata['authorinitials'], 'YM')
  })

  test('parse author first middle last', async () => {
    const metadata = await parseHeaderMetadata('David Heinemeier Hansson')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'David Heinemeier Hansson')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'David')
    assert.equal(metadata['middlename'], 'Heinemeier')
    assert.equal(metadata['lastname'], 'Hansson')
    assert.equal(metadata['authorinitials'], 'DHH')
  })

  test('parse author first middle last email', async () => {
    const metadata = await parseHeaderMetadata('David Heinemeier Hansson <rails@ruby-lang.org>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'David Heinemeier Hansson')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'David')
    assert.equal(metadata['middlename'], 'Heinemeier')
    assert.equal(metadata['lastname'], 'Hansson')
    assert.equal(metadata['email'], 'rails@ruby-lang.org')
    assert.equal(metadata['authorinitials'], 'DHH')
  })

  test('parse author first email', async () => {
    const metadata = await parseHeaderMetadata('Stuart <founder@asciidoc.org>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Stuart')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stuart')
    assert.equal(metadata['email'], 'founder@asciidoc.org')
    assert.equal(metadata['authorinitials'], 'S')
  })

  test('parse author first last email', async () => {
    const metadata = await parseHeaderMetadata('Stuart Rackham <founder@asciidoc.org>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Stuart Rackham')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stuart')
    assert.equal(metadata['lastname'], 'Rackham')
    assert.equal(metadata['email'], 'founder@asciidoc.org')
    assert.equal(metadata['authorinitials'], 'SR')
  })

  test('parse author with hyphen', async () => {
    const metadata = await parseHeaderMetadata('Tim Berners-Lee <founder@www.org>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Tim Berners-Lee')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Tim')
    assert.equal(metadata['lastname'], 'Berners-Lee')
    assert.equal(metadata['email'], 'founder@www.org')
    assert.equal(metadata['authorinitials'], 'TB')
  })

  test("parse author with single quote", async () => {
    const metadata = await parseHeaderMetadata("Stephen O'Grady <founder@redmonk.com>")
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], "Stephen O'Grady")
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stephen')
    assert.equal(metadata['lastname'], "O'Grady")
    assert.equal(metadata['email'], 'founder@redmonk.com')
    assert.equal(metadata['authorinitials'], 'SO')
  })

  test('parse author with dotted initial', async () => {
    const metadata = await parseHeaderMetadata('Heiko W. Rupp <hwr@example.de>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Heiko W. Rupp')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Heiko')
    assert.equal(metadata['middlename'], 'W.')
    assert.equal(metadata['lastname'], 'Rupp')
    assert.equal(metadata['email'], 'hwr@example.de')
    assert.equal(metadata['authorinitials'], 'HWR')
  })

  test('parse author with underscore', async () => {
    const metadata = await parseHeaderMetadata('Tim_E Fella')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Tim E Fella')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Tim E')
    assert.equal(metadata['lastname'], 'Fella')
    assert.equal(metadata['authorinitials'], 'TF')
  })

  test('parse author name with letters outside basic latin', async () => {
    const metadata = await parseHeaderMetadata('Stéphane Brontë')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Stéphane Brontë')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stéphane')
    assert.equal(metadata['lastname'], 'Brontë')
    assert.equal(metadata['authorinitials'], 'SB')
  })

  test('parse ideographic author names', async () => {
    const metadata = await parseHeaderMetadata('李 四 <si.li@example.com>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], '李 四')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], '李')
    assert.equal(metadata['lastname'], '四')
    assert.equal(metadata['email'], 'si.li@example.com')
    assert.equal(metadata['authorinitials'], '李四')
  })

  test('parse author condenses whitespace', async () => {
    const metadata = await parseHeaderMetadata('Stuart       Rackham     <founder@asciidoc.org>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Stuart Rackham')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stuart')
    assert.equal(metadata['lastname'], 'Rackham')
    assert.equal(metadata['email'], 'founder@asciidoc.org')
    assert.equal(metadata['authorinitials'], 'SR')
  })

  test('parse invalid author line becomes author', async () => {
    const metadata = await parseHeaderMetadata('   Stuart       Rackham, founder of AsciiDoc   <founder@asciidoc.org>')
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Stuart Rackham, founder of AsciiDoc <founder@asciidoc.org>')
    assert.equal(metadata['author'], metadata['authors'])
    assert.equal(metadata['firstname'], 'Stuart Rackham, founder of AsciiDoc <founder@asciidoc.org>')
    assert.equal(metadata['authorinitials'], 'S')
  })

  test('parse multiple authors', async () => {
    const metadata = await parseHeaderMetadata('Doc Writer <doc.writer@asciidoc.org>; John Smith <john.smith@asciidoc.org>')
    assert.equal(metadata['authorcount'], 2)
    assert.equal(metadata['authors'], 'Doc Writer, John Smith')
    assert.equal(metadata['author'], 'Doc Writer')
    assert.equal(metadata['author_1'], 'Doc Writer')
    assert.equal(metadata['author_2'], 'John Smith')
  })

  test('should not parse multiple authors if semi-colon is not followed by space', async () => {
    const metadata = await parseHeaderMetadata('Joe Doe;Smith Johnson')
    assert.equal(metadata['authorcount'], 1)
  })

  test('skips blank author entries in implicit author line', async () => {
    const metadata = await parseHeaderMetadata('Doc Writer; ; John Smith <john.smith@asciidoc.org>;')
    assert.equal(metadata['authorcount'], 2)
    assert.equal(metadata['author_1'], 'Doc Writer')
    assert.equal(metadata['author_2'], 'John Smith')
  })

  test('parse name with more than 3 parts in author attribute', async () => {
    const doc = await emptyDocument()
    await parseHeaderMetadata(':author: Leroy  Harold  Scherer,  Jr.', doc)
    assert.equal(doc.attributes['author'], 'Leroy Harold Scherer, Jr.')
    assert.equal(doc.attributes['firstname'], 'Leroy')
    assert.equal(doc.attributes['middlename'], 'Harold')
    assert.equal(doc.attributes['lastname'], 'Scherer, Jr.')
  })

  test('use explicit authorinitials if set after implicit author line', async () => {
    const input = 'Jean-Claude Van Damme\n:authorinitials: JCVD'
    const doc = await emptyDocument()
    await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authorinitials'], 'JCVD')
  })

  test('use explicit authorinitials if set after author attribute', async () => {
    const input = ':author: Jean-Claude Van Damme\n:authorinitials: JCVD'
    const doc = await emptyDocument()
    await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authorinitials'], 'JCVD')
  })

  test('use implicit authors if value of authors attribute matches computed value', async () => {
    const input = 'Doc Writer; Junior Writer\n:authors: Doc Writer, Junior Writer'
    const doc = await emptyDocument()
    await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authors'], 'Doc Writer, Junior Writer')
    assert.equal(doc.attributes['author_1'], 'Doc Writer')
    assert.equal(doc.attributes['author_2'], 'Junior Writer')
  })

  test('replace implicit authors if value of authors attribute does not match computed value', async () => {
    const input = 'Doc Writer; Junior Writer\n:authors: Stuart Rackham; Dan Allen; Sarah White'
    const doc = await emptyDocument()
    const metadata = await parseHeaderMetadata(input, doc)
    assert.equal(metadata['authorcount'], 3)
    assert.equal(doc.attributes['authorcount'], 3)
    assert.equal(doc.attributes['authors'], 'Stuart Rackham, Dan Allen, Sarah White')
    assert.equal(doc.attributes['author_1'], 'Stuart Rackham')
    assert.equal(doc.attributes['author_2'], 'Dan Allen')
    assert.equal(doc.attributes['author_3'], 'Sarah White')
  })

  test('sets authorcount to 0 if document has no authors', async () => {
    const input = ''
    const doc = await emptyDocument()
    const metadata = await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authorcount'], 0)
    assert.equal(metadata['authorcount'], 0)
  })

  test('returns empty hash if document has no authors and invoked without document', async () => {
    const metadata = await parseHeaderMetadata('')
    assert.deepEqual(metadata, {})
  })

  test('does not drop name joiner when using multiple authors', async () => {
    const input = 'Kismet Chameleon; Lazarus het_Draeke'
    const doc = await emptyDocument()
    await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authorcount'], 2)
    assert.equal(doc.attributes['authors'], 'Kismet Chameleon, Lazarus het Draeke')
    assert.equal(doc.attributes['author_1'], 'Kismet Chameleon')
    assert.equal(doc.attributes['author_2'], 'Lazarus het Draeke')
    assert.equal(doc.attributes['lastname_2'], 'het Draeke')
  })

  test('allows authors to be overridden using explicit author attributes', async () => {
    const input = 'Kismet Chameleon; Johnny Bravo; Lazarus het_Draeke\n:author_2: Danger Mouse'
    const doc = await emptyDocument()
    await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authorcount'], 3)
    assert.equal(doc.attributes['authors'], 'Kismet Chameleon, Danger Mouse, Lazarus het Draeke')
    assert.equal(doc.attributes['author_1'], 'Kismet Chameleon')
    assert.equal(doc.attributes['author_2'], 'Danger Mouse')
    assert.equal(doc.attributes['author_3'], 'Lazarus het Draeke')
    assert.equal(doc.attributes['lastname_3'], 'het Draeke')
  })

  test('removes formatting before partitioning author defined using author attribute', async () => {
    const input = ':author: pass:n[http://example.org/community/team.html[Ze_**Project** team]]'
    const doc = await emptyDocument()
    await parseHeaderMetadata(input, doc)
    assert.equal(doc.attributes['authorcount'], 1)
    assert.equal(doc.attributes['authors'], '<a href="http://example.org/community/team.html">Ze <strong>Project</strong> team</a>')
    assert.equal(doc.attributes['firstname'], 'Ze Project')
    assert.equal(doc.attributes['lastname'], 'team')
  })

  // ── parseHeaderMetadata – revision line ─────────────────────────────────────

  test('parse rev number date remark', async () => {
    const input = 'Ryan Waldron\nv0.0.7, 2013-12-18: The first release you can stand on'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revnumber'], '0.0.7')
    assert.equal(metadata['revdate'], '2013-12-18')
    assert.equal(metadata['revremark'], 'The first release you can stand on')
  })

  test('parse rev number, date, and remark as attribute references', async () => {
    const input = 'Author Name\nv{project-version}, {release-date}: {release-summary}'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revnumber'], '{project-version}')
    assert.equal(metadata['revdate'], '{release-date}')
    assert.equal(metadata['revremark'], '{release-summary}')
  })

  test('should resolve attribute references in rev number, date, and remark', async () => {
    const input = `= Document Title
Author Name
{project-version}, {release-date}: {release-summary}`
    const doc = await load(input, {
      safe: 'safe',
      attributes: {
        'project-version': '1.0.1',
        'release-date': '2018-05-15',
        'release-summary': 'The one you can count on!',
      },
    })
    assert.equal(doc.attr('revnumber'), '1.0.1')
    assert.equal(doc.attr('revdate'), '2018-05-15')
    assert.equal(doc.attr('revremark'), 'The one you can count on!')
  })

  test('parse rev date', async () => {
    const input = 'Ryan Waldron\n2013-12-18'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revdate'], '2013-12-18')
  })

  test('parse rev number with trailing comma', async () => {
    const input = 'Stuart Rackham\nv8.6.8,'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revnumber'], '8.6.8')
    assert.ok(!('revdate' in metadata))
  })

  test('parse rev number', async () => {
    const input = 'Stuart Rackham\nv8.6.8'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revnumber'], '8.6.8')
    assert.ok(!('revdate' in metadata))
  })

  test('treats arbitrary text on rev line as revdate', async () => {
    const input = 'Ryan Waldron\nfoobar'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revdate'], 'foobar')
  })

  test('parse rev date remark', async () => {
    const input = 'Ryan Waldron\n2013-12-18:  The first release you can stand on'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revdate'], '2013-12-18')
    assert.equal(metadata['revremark'], 'The first release you can stand on')
  })

  test('should not mistake attribute entry as rev remark', async () => {
    const input = 'Joe Cool\n:page-layout: post'
    const metadata = await parseHeaderMetadata(input)
    assert.notEqual(metadata['revremark'], 'page-layout: post')
    assert.ok(!('revdate' in metadata))
  })

  test('parse rev remark only', async () => {
    const input = 'Joe Cool\n :Must start revremark-only line with space'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['revremark'], 'Must start revremark-only line with space')
    assert.ok(!('revdate' in metadata))
  })

  test('skip line comments before author', async () => {
    const input = '// Asciidoctor\n// release artist\nRyan Waldron'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Ryan Waldron')
    assert.equal(metadata['firstname'], 'Ryan')
    assert.equal(metadata['lastname'], 'Waldron')
    assert.equal(metadata['authorinitials'], 'RW')
  })

  test('skip block comment before author', async () => {
    const input = '////\nAsciidoctor\nrelease artist\n////\nRyan Waldron'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Ryan Waldron')
    assert.equal(metadata['firstname'], 'Ryan')
    assert.equal(metadata['lastname'], 'Waldron')
    assert.equal(metadata['authorinitials'], 'RW')
  })

  test('skip block comment before rev', async () => {
    const input = 'Ryan Waldron\n////\nAsciidoctor\nrelease info\n////\nv0.0.7, 2013-12-18'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Ryan Waldron')
    assert.equal(metadata['revnumber'], '0.0.7')
    assert.equal(metadata['revdate'], '2013-12-18')
  })

  test('break header at line with three forward slashes', async () => {
    const input = 'Joe Cool\nv1.0\n///\nstuff'
    const metadata = await parseHeaderMetadata(input)
    assert.equal(metadata['authorcount'], 1)
    assert.equal(metadata['author'], 'Joe Cool')
    assert.equal(metadata['revnumber'], '1.0')
  })

  test('attribute entry overrides generated author initials', async () => {
    const doc = await emptyDocument()
    const metadata = await parseHeaderMetadata('Stuart Rackham <founder@asciidoc.org>\n:Author Initials: SJR', doc)
    assert.equal(metadata['authorinitials'], 'SR')
    assert.equal(doc.attributes['authorinitials'], 'SJR')
  })

  // ── adjustIndentation ───────────────────────────────────────────────────────

  test('adjust indentation to 0', () => {
    const input = '   def names\n\n     @name.split\n\n   end'
    const expected = 'def names\n\n  @name.split\n\nend'
    const lines = input.split('\n')
    Parser.adjustIndentation(lines)
    assert.equal(lines.join('\n'), expected)
  })

  test('adjust indentation mixed with tabs and spaces to 0', () => {
    const input = '    def names\n\n\t  @name.split\n\n    end'
    const expected = 'def names\n\n  @name.split\n\nend'
    const lines = input.split('\n')
    Parser.adjustIndentation(lines, 0, 4)
    assert.equal(lines.join('\n'), expected)
  })

  test('expands tabs to spaces', () => {
    const input =
      'Filesystem\t\t\t\tSize\tUsed\tAvail\tUse%\tMounted on\n' +
      'Filesystem              Size    Used    Avail   Use%    Mounted on\n' +
      'devtmpfs\t\t\t\t3.9G\t   0\t 3.9G\t  0%\t/dev\n' +
      '/dev/mapper/fedora-root\t 48G\t 18G\t  29G\t 39%\t/'
    const expected =
      'Filesystem              Size    Used    Avail   Use%    Mounted on\n' +
      'Filesystem              Size    Used    Avail   Use%    Mounted on\n' +
      'devtmpfs                3.9G       0     3.9G     0%    /dev\n' +
      '/dev/mapper/fedora-root  48G     18G      29G    39%    /'
    const lines = input.split('\n')
    Parser.adjustIndentation(lines, 0, 4)
    assert.equal(lines.join('\n'), expected)
  })

  test('adjust indentation to non-zero', () => {
    const input = '   def names\n\n     @name.split\n\n   end'
    const expected = '  def names\n\n    @name.split\n\n  end'
    const lines = input.split('\n')
    Parser.adjustIndentation(lines, 2)
    assert.equal(lines.join('\n'), expected)
  })

  test('preserve block indent if indent is -1', () => {
    const input = '   def names\n\n     @name.split\n\n   end\n'
    const lines = input.split('\n')
    const originalLines = [...lines]
    Parser.adjustIndentation(lines, -1)
    assert.deepEqual(lines, originalLines)
  })

  test('adjust indentation handles empty lines gracefully', () => {
    const lines = []
    Parser.adjustIndentation(lines)
    assert.deepEqual(lines, [])
  })

  // ── inline anchor warnings ──────────────────────────────────────────────────

  test('should warn if inline anchor is already in use', async () => {
    const input = `[#in-use]
A paragraph with an id.

Another paragraph
[[in-use]]that uses an id
which is already in use.`

    const defaultLogger = LoggerManager.logger
    const logger = new MemoryLogger()
    LoggerManager.logger = logger
    try {
      await load(input, { safe: 'safe' })
      const found = logger.messages.some((m) => {
        if (m.severity !== 'WARN') return false
        const msg = typeof m.message === 'string' ? m.message : String(m.message)
        return msg.includes('id assigned to anchor already in use: in-use')
      })
      assert.ok(found, `Expected WARN about duplicate anchor but got: ${JSON.stringify(logger.messages)}`)
    } finally {
      LoggerManager.logger = defaultLogger
    }
  })
})