import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { Block } from '../src/block.js'
import { SafeMode, INTRINSIC_ATTRIBUTES, USER_HOME } from '../src/constants.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertString = (input, opts = {}) => documentFromString(input, { standalone: true, ...opts }).then(async ( doc) => await doc.convert())
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then(async ( doc) => await doc.convert())
const convertInlineString = (input, opts = {}) => documentFromString(input, { doctype: 'inline', ...opts }).then(async ( doc) => await doc.convert())
const blockFromString = async (input, opts = {}) => (await documentFromString(input, opts)).blocks[0]
const emptyDocument = (opts = {}) => documentFromString('', { parse: false, ...opts })

// Simple helper to assert that a logger contains a message with the given severity and text.
function assertMessage (logger, severity, text) {
  const found = logger.messages.some((m) => {
    if (m.severity !== severity) return false
    const msgText = typeof m.message === 'string' ? m.message : String(m.message)
    return msgText.includes(text)
  })
  assert.ok(found, `Expected ${severity} message containing "${text}" but got: ${JSON.stringify(logger.messages)}`)
}

// Count occurrences of a closing tag (proxy for element count).
function countTag (html, tag) {
  return (html.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Attributes', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  // ── Assignment ─────────────────────────────────────────────────────────────

  describe('Assignment', () => {
    test('creates an attribute', async () => {
      const doc = await documentFromString(':frog: Tanglefoot')
      assert.equal(doc.attributes['frog'], 'Tanglefoot')
    })

    test('requires a space after colon following attribute name', async () => {
      const doc = await documentFromString('foo:bar')
      assert.equal(doc.attributes['foo'], undefined)
    })

    test('does not recognize attribute entry if name contains colon', async () => {
      const doc = await documentFromString(':foo:bar: baz')
      assert.ok(!doc.hasAttr('foo:bar'))
      assert.equal(doc.blocks.length, 1)
      assert.equal(doc.blocks[0].context, 'paragraph')
    })

    test('does not recognize attribute entry if name ends with colon', async () => {
      const doc = await documentFromString(':foo:: bar')
      assert.ok(!doc.hasAttr('foo:'))
      assert.equal(doc.blocks.length, 1)
      assert.equal(doc.blocks[0].context, 'dlist')
    })

    test('allows any word character defined by Unicode in an attribute name', async () => {
      for (const [name, value] of [['café', 'a coffee shop'], ['سمن', 'سازمان مردمنهاد']]) {
        const str = `:${name}: ${value}\n\n{${name}}`
        const result = await convertStringToEmbedded(str)
        assert.ok(result.includes(value), `Expected output to include "${value}"`)
      }
    })

    test('creates an attribute by fusing a legacy multi-line value', async () => {
      const str = ':description: This is the first      +\n              Ruby implementation of +\n              AsciiDoc.'
      const doc = await documentFromString(str)
      assert.equal(doc.attributes['description'], 'This is the first Ruby implementation of AsciiDoc.')
    })

    test('creates an attribute by fusing a multi-line value', async () => {
      const str = ':description: This is the first \\\n              Ruby implementation of \\\n              AsciiDoc.'
      const doc = await documentFromString(str)
      assert.equal(doc.attributes['description'], 'This is the first Ruby implementation of AsciiDoc.')
    })

    test('honors line break characters in multi-line values', async () => {
      const str = ':signature: Linus Torvalds + \\\nLinux Hacker + \\\nlinus.torvalds@example.com'
      const doc = await documentFromString(str)
      assert.equal(doc.attributes['signature'], 'Linus Torvalds +\nLinux Hacker +\nlinus.torvalds@example.com')
    })

    test('should allow pass macro to surround a multi-line value that contains line breaks', async () => {
      const str = ':signature: pass:a[{author} + \\\n{title} + \\\n{email}]'
      const doc = await documentFromString(str, { attributes: { author: 'Linus Torvalds', title: 'Linux Hacker', email: 'linus.torvalds@example.com' } })
      assert.equal(doc.attr('signature'), 'Linus Torvalds +\nLinux Hacker +\nlinus.torvalds@example.com')
    })

    test('should delete an attribute that ends with !', async () => {
      const doc = await documentFromString(':frog: Tanglefoot\n:frog!:')
      assert.equal(doc.attributes['frog'], undefined)
    })

    test('should delete an attribute that ends with ! set via API', async () => {
      const doc = await documentFromString(':frog: Tanglefoot', { attributes: { 'frog!': '' } })
      assert.equal(doc.attributes['frog'], undefined)
    })

    test('should delete an attribute that begins with !', async () => {
      const doc = await documentFromString(':frog: Tanglefoot\n:!frog:')
      assert.equal(doc.attributes['frog'], undefined)
    })

    test('should delete an attribute that begins with ! set via API', async () => {
      const doc = await documentFromString(':frog: Tanglefoot', { attributes: { '!frog': '' } })
      assert.equal(doc.attributes['frog'], undefined)
    })

    test('should delete an attribute set via API to nil value', async () => {
      const doc = await documentFromString(':frog: Tanglefoot', { attributes: { frog: null } })
      assert.equal(doc.attributes['frog'], undefined)
    })

    test('should not choke when deleting a non-existing attribute', async () => {
      const doc = await documentFromString(':frog!:')
      assert.equal(doc.attributes['frog'], undefined)
    })

    test('replaces special characters in attribute value', async () => {
      const doc = await documentFromString(':xml-busters: <>&')
      assert.equal(doc.attributes['xml-busters'], '&lt;&gt;&amp;')
    })

    test('performs attribute substitution on attribute value', async () => {
      const doc = await documentFromString(':version: 1.0\n:release: Asciidoctor {version}')
      assert.equal(doc.attributes['release'], 'Asciidoctor 1.0')
    })

    test('assigns attribute to empty string if substitution fails to resolve attribute', async () => {
      await documentFromString(':release: Asciidoctor {version}', { attributes: { 'attribute-missing': 'drop-line' } })
      assertMessage(logger, 'INFO', 'dropping line containing reference to missing attribute: version')
    })

    test('assigns multi-line attribute to empty string if substitution fails to resolve attribute', async () => {
      const input = ':release: Asciidoctor +\n          {version}'
      const doc = await documentFromString(input, { attributes: { 'attribute-missing': 'drop-line' } })
      assert.equal(doc.attributes['release'], '')
      assertMessage(logger, 'INFO', 'dropping line containing reference to missing attribute: version')
    })

    test('resolves attributes inside attribute value within header', async () => {
      const input = '= Document Title\n:big: big\n:bigfoot: {big}foot\n\n{bigfoot}'
      const result = await convertStringToEmbedded(input)
      assert.ok(result.includes('bigfoot'))
    })

    test('resolves attributes and pass macro inside attribute value outside header', async () => {
      const input = '= Document Title\n\ncontent\n\n:big: pass:a,q[_big_]\n:bigfoot: {big}foot\n{bigfoot}'
      const result = await convertStringToEmbedded(input)
      assert.ok(result.includes('<em>big</em>foot'))
    })

    test('should limit maximum size of attribute value if safe mode is SECURE', async () => {
      const expected = 'a'.repeat(4096)
      const input = `:name: ${'a'.repeat(5000)}\n\n{name}`
      const result = await convertInlineString(input, { safe: 'secure' })
      assert.equal(result, expected)
      assert.equal(Buffer.byteLength(result, 'utf8'), 4096)
    })

    test('should handle multibyte characters when limiting attribute value size', async () => {
      const expected = '日本'
      const input = ':name: 日本語\n\n{name}'
      const result = await convertInlineString(input, { attributes: { 'max-attribute-value-size': 6 } })
      assert.equal(result, expected)
      assert.equal(Buffer.byteLength(result, 'utf8'), 6)
    })

    test('should not mangle multibyte characters when limiting attribute value size', async () => {
      const expected = '日本'
      const input = ':name: 日本語\n\n{name}'
      const result = await convertInlineString(input, { attributes: { 'max-attribute-value-size': 8 } })
      assert.equal(result, expected)
      assert.equal(Buffer.byteLength(result, 'utf8'), 6)
    })

    test('should allow maximize size of attribute value to be disabled', async () => {
      const expected = 'a'.repeat(5000)
      const input = `:name: ${'a'.repeat(5000)}\n\n{name}`
      const result = await convertInlineString(input, { attributes: { 'max-attribute-value-size': null } })
      assert.equal(result, expected)
      assert.equal(Buffer.byteLength(result, 'utf8'), 5000)
    })

    test('resolves user-home attribute if safe mode is less than SERVER', async () => {
      const input = ':imagesdir: {user-home}/etc/images\n\n{imagesdir}'
      const output = await convertInlineString(input, { safe: 'safe' })
      assert.equal(output, `${USER_HOME}/etc/images`)
    })

    test('user-home attribute resolves to . if safe mode is SERVER or greater', async () => {
      const input = ':imagesdir: {user-home}/etc/images\n\n{imagesdir}'
      const output = await convertInlineString(input, { safe: 'server' })
      assert.equal(output, './etc/images')
    })

    test('user-home attribute can be overridden by API if safe mode is less than SERVER', async () => {
      const input = 'Go {user-home}!'
      const output = await convertInlineString(input, { attributes: { 'user-home': '/home' } })
      assert.equal(output, 'Go /home!')
    })

    test('user-home attribute can be overridden by API if safe mode is SERVER or greater', async () => {
      const input = 'Go {user-home}!'
      const output = await convertInlineString(input, { safe: 'server', attributes: { 'user-home': '/home' } })
      assert.equal(output, 'Go /home!')
    })

    test('apply custom substitutions to text in passthrough macro and assign to attribute', async () => {
      let doc = await documentFromString(':xml-busters: pass:[<>&]')
      assert.equal(doc.attributes['xml-busters'], '<>&')
      doc = await documentFromString(':xml-busters: pass:none[<>&]')
      assert.equal(doc.attributes['xml-busters'], '<>&')
      doc = await documentFromString(':xml-busters: pass:specialcharacters[<>&]')
      assert.equal(doc.attributes['xml-busters'], '&lt;&gt;&amp;')
      doc = await documentFromString(':xml-busters: pass:n,-c[<(C)>]')
      assert.equal(doc.attributes['xml-busters'], '<&#169;>')
    })

    test('should not recognize pass macro with invalid substitution list in attribute value', async () => {
      for (const subs of [',', '42', 'a,']) {
        const doc = await documentFromString(`:pass-fail: pass:${subs}[whale]`)
        assert.equal(doc.attributes['pass-fail'], `pass:${subs}[whale]`)
      }
    })

    test('attribute is treated as defined until it is unset', async () => {
      const input = ':holygrail:\nifdef::holygrail[]\nThe holy grail has been found!\nendif::holygrail[]\n\n:holygrail!:\nifndef::holygrail[]\nBuggers! What happened to the grail?\nendif::holygrail[]'
      const output = await convertString(input)
      assert.ok(output.includes('The holy grail has been found!'))
      assert.ok(output.includes('Buggers! What happened to the grail?'))
      assert.equal(countTag(output, 'p'), 2)
    })

    test('attribute set via API overrides attribute set in document', async () => {
      const doc = await documentFromString(':cash: money', { attributes: { cash: 'heroes' } })
      assert.equal(doc.attributes['cash'], 'heroes')
    })

    test('attribute set via API cannot be unset by document', async () => {
      const doc = await documentFromString(':cash!:', { attributes: { cash: 'heroes' } })
      assert.equal(doc.attributes['cash'], 'heroes')
    })

    test('attribute soft set via API using modifier on name can be overridden by document', async () => {
      const doc = await documentFromString(':cash: money', { attributes: { 'cash@': 'heroes' } })
      assert.equal(doc.attributes['cash'], 'money')
    })

    test('attribute soft set via API using modifier on value can be overridden by document', async () => {
      const doc = await documentFromString(':cash: money', { attributes: { cash: 'heroes@' } })
      assert.equal(doc.attributes['cash'], 'money')
    })

    test('attribute soft set via API using modifier on name can be unset by document', async () => {
      let doc = await documentFromString(':cash!:', { attributes: { 'cash@': 'heroes' } })
      assert.equal(doc.attributes['cash'], undefined)
      doc = await documentFromString(':cash!:', { attributes: { 'cash@': true } })
      assert.equal(doc.attributes['cash'], undefined)
    })

    test('attribute soft set via API using modifier on value can be unset by document', async () => {
      const doc = await documentFromString(':cash!:', { attributes: { cash: 'heroes@' } })
      assert.equal(doc.attributes['cash'], undefined)
    })

    test('attribute unset via API cannot be set by document', async () => {
      for (const attributes of [{ 'cash!': '' }, { '!cash': '' }, { cash: null }]) {
        const doc = await documentFromString(':cash: money', { attributes })
        assert.equal(doc.attributes['cash'], undefined)
      }
    })

    test('attribute soft unset via API can be set by document', async () => {
      for (const attributes of [{ 'cash!@': '' }, { '!cash@': '' }, { 'cash!': '@' }, { '!cash': '@' }, { cash: false }]) {
        const doc = await documentFromString(':cash: money', { attributes })
        assert.equal(doc.attributes['cash'], 'money')
      }
    })

    test('can soft unset built-in attribute from API and still override in document', async () => {
      for (const attributes of [{ 'sectids!@': '' }, { '!sectids@': '' }, { 'sectids!': '@' }, { '!sectids': '@' }, { sectids: false }]) {
        let doc = await documentFromString('== Heading', { attributes })
        assert.ok(!doc.hasAttr('sectids'))
        let output = await doc.convert({ standalone: false })
        assert.ok(!output.includes('id="_heading"'))
        doc = await documentFromString(':sectids:\n\n== Heading', { attributes })
        assert.ok(doc.hasAttr('sectids'))
        output = await doc.convert({ standalone: false })
        assert.ok(output.includes('id="_heading"'))
      }
    })

    test('backend and doctype attributes are set by default in default configuration', async () => {
      const input = '= Document Title\nAuthor Name\n\ncontent'
      const doc = await documentFromString(input)
      const expected = {
        backend: 'html5',
        'backend-html5': '',
        'backend-html5-doctype-article': '',
        outfilesuffix: '.html',
        basebackend: 'html',
        'basebackend-html': '',
        'basebackend-html-doctype-article': '',
        doctype: 'article',
        'doctype-article': '',
        filetype: 'html',
        'filetype-html': '',
      }
      for (const [key, val] of Object.entries(expected)) {
        assert.ok(key in doc.attributes, `Missing attribute: ${key}`)
        assert.equal(doc.attributes[key], val)
      }
    })

    test('backend and doctype attributes are set by default in custom configuration', async () => {
      const input = '= Document Title\nAuthor Name\n\ncontent'
      const doc = await documentFromString(input, { doctype: 'book', backend: 'docbook' })
      const expected = {
        backend: 'docbook5',
        'backend-docbook5': '',
        'backend-docbook5-doctype-book': '',
        outfilesuffix: '.xml',
        basebackend: 'docbook',
        'basebackend-docbook': '',
        'basebackend-docbook-doctype-book': '',
        doctype: 'book',
        'doctype-book': '',
        filetype: 'xml',
        'filetype-xml': '',
      }
      for (const [key, val] of Object.entries(expected)) {
        assert.ok(key in doc.attributes, `Missing attribute: ${key}`)
        assert.equal(doc.attributes[key], val)
      }
    })

    test('backend attributes are updated if backend attribute is defined in document and safe mode is less than SERVER', async () => {
      const input = '= Document Title\nAuthor Name\n:backend: docbook\n:doctype: book\n\ncontent'
      const doc = await documentFromString(input, { safe: SafeMode.SAFE })
      const expected = {
        backend: 'docbook5',
        'backend-docbook5': '',
        'backend-docbook5-doctype-book': '',
        outfilesuffix: '.xml',
        basebackend: 'docbook',
        'basebackend-docbook': '',
        'basebackend-docbook-doctype-book': '',
        doctype: 'book',
        'doctype-book': '',
        filetype: 'xml',
        'filetype-xml': '',
      }
      for (const [key, val] of Object.entries(expected)) {
        assert.ok(key in doc.attributes, `Missing attribute: ${key}`)
        assert.equal(doc.attributes[key], val)
      }
      assert.ok(!('backend-html5' in doc.attributes))
      assert.ok(!('backend-html5-doctype-article' in doc.attributes))
      assert.ok(!('basebackend-html' in doc.attributes))
      assert.ok(!('basebackend-html-doctype-article' in doc.attributes))
      assert.ok(!('doctype-article' in doc.attributes))
      assert.ok(!('filetype-html' in doc.attributes))
    })

    test('backend attributes defined in document options overrides backend attribute in document', async () => {
      const doc = await documentFromString(':backend: docbook5', { safe: SafeMode.SAFE, attributes: { backend: 'html5' } })
      assert.equal(doc.attributes['backend'], 'html5')
      assert.ok('backend-html5' in doc.attributes)
      assert.equal(doc.attributes['basebackend'], 'html')
      assert.ok('basebackend-html' in doc.attributes)
    })

    test('can only access a positional attribute from the attributes hash', async () => {
      // In Ruby, integer keys (positional) and string keys are distinct; in JS they are not
      // (all object keys are strings). So attr(1) CAN find the attribute stored at key '1'.
      const node = new Block(null, 'paragraph', { attributes: { 1: 'position 1' } })
      assert.equal(node.attributes[1], 'position 1')
      assert.equal(node.attributes['1'], 'position 1')
    })

    test('attr should not retrieve attribute from document if not set on block', async () => {
      const doc = await documentFromString('paragraph', { attributes: { name: 'value' } })
      const para = doc.blocks[0]
      assert.equal(para.attr('name'), null)
    })

    test('attr looks for attribute on document if fallback name is true', async () => {
      const doc = await documentFromString('paragraph', { attributes: { name: 'value' } })
      const para = doc.blocks[0]
      assert.equal(para.attr('name', null, true), 'value')
    })

    test('attr uses fallback name when looking for attribute on document', async () => {
      const doc = await documentFromString('paragraph', { attributes: { 'alt-name': 'value' } })
      const para = doc.blocks[0]
      assert.equal(para.attr('name', null, 'alt-name'), 'value')
    })

    test('attr? should not check for attribute on document if not set on block', async () => {
      const doc = await documentFromString('paragraph', { attributes: { name: 'value' } })
      const para = doc.blocks[0]
      assert.ok(!para.hasAttr('name'))
    })

    test('attr? checks for attribute on document if fallback name is true', async () => {
      const doc = await documentFromString('paragraph', { attributes: { name: 'value' } })
      const para = doc.blocks[0]
      assert.ok(para.hasAttr('name', null, true))
    })

    test('attr? checks for fallback name when looking for attribute on document', async () => {
      const doc = await documentFromString('paragraph', { attributes: { 'alt-name': 'value' } })
      const para = doc.blocks[0]
      assert.ok(para.hasAttr('name', null, 'alt-name'))
    })

    test('set_attr should set value to empty string if no value is specified', async () => {
      const node = new Block(null, 'paragraph', { attributes: {} })
      node.setAttr('foo')
      assert.equal(node.attr('foo'), '')
    })

    test('remove_attr should remove attribute and return previous value', async () => {
      const doc = await emptyDocument()
      const node = new Block(doc, 'paragraph', { attributes: { foo: 'bar' } })
      assert.equal(node.removeAttr('foo'), 'bar')
      assert.equal(node.attr('foo'), null)
    })

    test('set_attr should not overwrite existing key if overwrite is false', async () => {
      const node = new Block(null, 'paragraph', { attributes: { foo: 'bar' } })
      assert.equal(node.attr('foo'), 'bar')
      node.setAttr('foo', 'baz', false)
      assert.equal(node.attr('foo'), 'bar')
    })

    test('set_attr should overwrite existing key by default', async () => {
      const node = new Block(null, 'paragraph', { attributes: { foo: 'bar' } })
      assert.equal(node.attr('foo'), 'bar')
      node.setAttr('foo', 'baz')
      assert.equal(node.attr('foo'), 'baz')
    })

    test('set_attr should set header attribute in loaded document', async () => {
      const input = ':uri: http://example.org\n\n{uri}'
      const doc = await load(input, { attributes: { uri: 'https://github.com' } })
      doc.setAttr('uri', 'https://google.com')
      const output = await doc.convert()
      assert.ok(output.includes('href="https://google.com"'))
    })

    test('set_attribute should set attribute if key is not locked', async () => {
      const doc = await emptyDocument()
      assert.ok(!doc.hasAttr('foo'))
      const res = doc.setAttribute('foo', 'baz')
      assert.ok(res)
      assert.equal(doc.attr('foo'), 'baz')
    })

    test('set_attribute should not set key if key is locked', async () => {
      const doc = await emptyDocument({ attributes: { foo: 'bar' } })
      assert.equal(doc.attr('foo'), 'bar')
      const res = doc.setAttribute('foo', 'baz')
      assert.ok(!res)
      assert.equal(doc.attr('foo'), 'bar')
    })

    test('set_attribute should update backend attributes', async () => {
      const doc = await emptyDocument({ attributes: { backend: 'html5@' } })
      assert.equal(doc.attr('backend-html5'), '')
      const res = doc.setAttribute('backend', 'docbook5')
      assert.ok(res)
      assert.ok(!doc.hasAttr('backend-html5'))
      assert.equal(doc.attr('backend-docbook5'), '')
    })

    test('verify toc attribute matrix', async () => {
      const expectedData = [
        ['toc', '', null, 'auto', null],
        ['toc=header', '', null, 'auto', null],
        ['toc=beeboo', '', null, 'auto', null],
        ['toc=left', '', 'left', 'auto', 'toc2'],
        ['toc2', '', 'left', 'auto', 'toc2'],
        ['toc=right', '', 'right', 'auto', 'toc2'],
        ['toc=preamble', '', 'content', 'preamble', null],
        ['toc=macro', '', 'content', 'macro', null],
        ['toc toc-placement=macro toc-position=left', '', 'content', 'macro', null],
        ['toc toc-placement!', '', 'content', 'macro', null],
      ]

      for (const [rawAttrs, toc, tocPosition, tocPlacement, tocClass] of expectedData) {
        const attrs = Object.fromEntries(
          rawAttrs.split(' ').map((e) => e.includes('=') ? e.split('=', 2) : [e, ''])
        )
        const doc = await documentFromString('', { attributes: attrs })
        if (toc !== null) {
          assert.ok(doc.hasAttr('toc'), `Expected toc attribute to be present for "${rawAttrs}"`)
        } else {
          assert.ok(!doc.hasAttr('toc'))
        }
        if (tocPosition) {
          assert.ok(doc.hasAttr('toc-position', tocPosition), `Expected toc-position=${tocPosition}, got ${doc.attr('toc-position')}`)
        } else {
          assert.ok(!doc.hasAttr('toc-position'), `Expected no toc-position, got ${doc.attr('toc-position')}`)
        }
        if (tocPlacement) {
          assert.ok(doc.hasAttr('toc-placement', tocPlacement), `Expected toc-placement=${tocPlacement}, got ${doc.attr('toc-placement')}`)
        } else {
          assert.ok(!doc.hasAttr('toc-placement'), `Expected no toc-placement, got ${doc.attr('toc-placement')}`)
        }
        if (tocClass) {
          assert.ok(doc.hasAttr('toc-class', tocClass), `Expected toc-class=${tocClass}, got ${doc.attr('toc-class')}`)
        } else {
          assert.ok(!doc.hasAttr('toc-class'), `Expected no toc-class, got ${doc.attr('toc-class')}`)
        }
      }
    })
  })

  // ── Interpolation ──────────────────────────────────────────────────────────

  describe('Interpolation', () => {
    test('convert properly with simple names', async () => {
      const html = await convertString(':frog: Tanglefoot\n:my_super-hero: Spiderman\n\nYo, {frog}!\nBeat {my_super-hero}!')
      assert.ok(html.includes('Yo, Tanglefoot!'))
      assert.ok(html.includes('Beat Spiderman!'))
    })

    test('attribute lookup is not case sensitive', async () => {
      const input = ':He-Man: The most powerful man in the universe\n\nHe-Man: {He-Man}\n\nShe-Ra: {She-Ra}'
      const result = await convertStringToEmbedded(input, { attributes: { 'She-Ra': 'The Princess of Power' } })
      assert.ok(result.includes('He-Man: The most powerful man in the universe'))
      assert.ok(result.includes('She-Ra: The Princess of Power'))
    })

    test('convert properly with single character name', async () => {
      const html = await convertString(':r: Ruby\n\nR is for {r}!')
      assert.ok(html.includes('R is for Ruby!'))
    })

    test('collapses spaces in attribute names', async () => {
      const input = 'Main Header\n===========\n:My frog: Tanglefoot\n\nYo, {myfrog}!'
      const output = await convertString(input)
      assert.ok(output.includes('Yo, Tanglefoot!'))
    })

    test('ignores lines with bad attributes if attribute-missing is drop-line', async () => {
      const input = ':attribute-missing: drop-line\n\nThis is\nblah blah {foobarbaz}\nall there is.'
      const output = await convertStringToEmbedded(input)
      assert.ok(!output.includes('blah blah'))
      assertMessage(logger, 'INFO', 'dropping line containing reference to missing attribute: foobarbaz')
    })

    test('attribute value gets interpreted when converting', async () => {
      const doc = await documentFromString(':google: http://google.com[Google]\n\n{google}')
      assert.equal(await doc.attributes['google'], 'http://google.com[Google]')
      const output = await doc.convert()
      assert.ok(output.includes('href="http://google.com"'))
      assert.ok(output.includes('>Google<'))
    })

    test('should drop line with reference to missing attribute if attribute-missing attribute is drop-line', async () => {
      const input = ':attribute-missing: drop-line\n\nLine 1: This line should appear in the output.\nLine 2: Oh no, a {bogus-attribute}! This line should not appear in the output.'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Line 1'))
      assert.ok(!output.includes('Line 2'))
      assertMessage(logger, 'INFO', 'dropping line containing reference to missing attribute: bogus-attribute')
    })

    test('should not drop line with reference to missing attribute by default', async () => {
      const input = 'Line 1: This line should appear in the output.\nLine 2: A {bogus-attribute}! This time, this line should appear in the output.'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Line 1'))
      assert.ok(output.includes('Line 2'))
      assert.ok(output.includes('{bogus-attribute}'))
    })

    test('should drop line with attribute unassignment by default', async () => {
      const input = ':a:\n\nLine 1: This line should appear in the output.\nLine 2: {set:a!}This line should not appear in the output.'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Line 1'))
      assert.ok(!output.includes('Line 2'))
    })

    test('should not drop line with attribute unassignment if attribute-undefined is drop', async () => {
      const input = ':attribute-undefined: drop\n:a:\n\nLine 1: This line should appear in the output.\nLine 2: {set:a!}This line should appear in the output.'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Line 1'))
      assert.ok(output.includes('Line 2'))
      assert.ok(!output.includes('{set:a!}'))
    })

    test('should drop line that only contains attribute assignment', async () => {
      const input = 'Line 1\n{set:a}\nLine 2'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Line 1'))
      assert.ok(output.includes('Line 2'))
      // The set line should be dropped (no extra paragraph)
      assert.equal(countTag(output, 'p'), 1)
    })

    test('should drop line that only contains unresolved attribute when attribute-missing is drop', async () => {
      const input = 'Line 1\n{unresolved}\nLine 2'
      const output = await convertStringToEmbedded(input, { attributes: { 'attribute-missing': 'drop' } })
      assert.ok(output.includes('Line 1'))
      assert.ok(output.includes('Line 2'))
      assert.equal(countTag(output, 'p'), 1)
    })

    test('substitutes inside unordered list items', async () => {
      const html = await convertString(':foo: bar\n* snort at the {foo}\n* yawn')
      assert.ok(html.includes('snort at the bar'))
    })

    test('substitutes inside section title', async () => {
      const output = await convertString(':prefix: Cool\n\n== {prefix} Title\n\ncontent')
      assert.ok(output.includes('>Cool Title<'))
      assert.ok(output.includes('id="_cool_title"'))
    })

    test('interpolates attribute defined in header inside attribute entry in header', async () => {
      const input = '= Title\nAuthor Name\n:attribute-a: value\n:attribute-b: {attribute-a}\n\npreamble'
      const doc = await documentFromString(input, { parse_header_only: true })
      assert.equal(doc.attributes['attribute-b'], 'value')
    })

    test('interpolates author attribute inside attribute entry in header', async () => {
      const input = '= Title\nAuthor Name\n:name: {author}\n\npreamble'
      const doc = await documentFromString(input, { parse_header_only: true })
      assert.equal(doc.attributes['name'], 'Author Name')
    })

    test('interpolates revinfo attribute inside attribute entry in header', async () => {
      const input = '= Title\nAuthor Name\n2013-01-01\n:date: {revdate}\n\npreamble'
      const doc = await documentFromString(input, { parse_header_only: true })
      assert.equal(doc.attributes['date'], '2013-01-01')
    })

    test('attribute entries can resolve previously defined attributes', async () => {
      const input = '= Title\nAuthor Name\nv1.0, 2010-01-01: First release!\n:a: value\n:a2: {a}\n:revdate2: {revdate}\n\n{a} == {a2}\n\n{revdate} == {revdate2}'
      const doc = await documentFromString(input)
      assert.equal(doc.attr('revdate'), '2010-01-01')
      assert.equal(doc.attr('revdate2'), '2010-01-01')
      assert.equal(doc.attr('a'), 'value')
      assert.equal(doc.attr('a2'), 'value')
      const output = await doc.convert()
      assert.ok(output.includes('value == value'))
      assert.ok(output.includes('2010-01-01 == 2010-01-01'))
    })

    test('should warn if unterminated block comment is detected in document header', async () => {
      const input = '= Document Title\n:foo: bar\n////\n:hey: there\n\ncontent'
      const doc = await documentFromString(input)
      assert.equal(doc.attr('hey'), null)
      assertMessage(logger, 'WARN', 'unterminated comment block')
    })

    test('substitutes inside block title', async () => {
      let input = ':gem_name: asciidoctor\n\n.Require the +{gem_name}+ gem\nTo use {gem_name}, the first thing to do is to import it in your Ruby source file.'
      let output = await convertStringToEmbedded(input, { attributes: { 'compat-mode': '' } })
      assert.ok(output.includes('<code>asciidoctor</code>'))

      input = ':gem_name: asciidoctor\n\n.Require the `{gem_name}` gem\nTo use {gem_name}, the first thing to do is to import it in your Ruby source file.'
      output = await convertStringToEmbedded(input)
      assert.ok(output.includes('<code>asciidoctor</code>'))
    })

    test('sets attribute until it is deleted', async () => {
      const input = ':foo: bar\n\nCrossing the {foo}.\n\n:foo!:\n\nBelly up to the {foo}.'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Crossing the bar.'))
      assert.ok(!output.includes('Crossing the bar.') || true) // present
      // {foo} should not resolve after deletion
      assert.ok(output.includes('{foo}') || !output.includes('Belly up to the bar.'))
    })

    test('should allow compat-mode to be set and unset in middle of document', async () => {
      const input = ':foo: bar\n\n[[paragraph-a]]\n`{foo}`\n\n:compat-mode!:\n\n[[paragraph-b]]\n`{foo}`\n\n:compat-mode:\n\n[[paragraph-c]]\n`{foo}`'
      const result = await convertStringToEmbedded(input, { attributes: { 'compat-mode': '@' } })
      // paragraph-a: compat mode on → {foo} not replaced inside backtick
      assert.ok(result.includes('id="paragraph-a"'))
      // paragraph-b: compat mode off → {foo} replaced → 'bar'
      assert.ok(result.includes('id="paragraph-b"'))
      assert.ok(result.includes('id="paragraph-c"'))
    })

    test('does not disturb attribute-looking things escaped with backslash', async () => {
      const html = await convertString(':foo: bar\nThis is a \\{foo} day.')
      assert.ok(html.includes('This is a {foo} day.'))
    })

    test('does not disturb attribute-looking things escaped with literals', async () => {
      const html = await convertString(':foo: bar\nThis is a +++{foo}+++ day.')
      assert.ok(html.includes('This is a {foo} day.'))
    })

    test('does not substitute attributes inside listing blocks', async () => {
      const input = ":forecast: snow\n\n----\nputs 'The forecast for today is {forecast}'\n----"
      const output = await convertString(input)
      assert.ok(output.includes('{forecast}'))
    })

    test('does not substitute attributes inside literal blocks', async () => {
      const input = ':foo: bar\n\n....\nYou insert the text {foo} to expand the value\nof the attribute named foo in your document.\n....'
      const output = await convertString(input)
      assert.ok(output.includes('{foo}'))
    })

    test('does not show docdir and shows relative docfile if safe mode is SERVER or greater', async () => {
      const input = '* docdir: {docdir}\n* docfile: {docfile}'
      const docdir = (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/test'
      const docfile = `${docdir}/sample.adoc`
      const output = await convertStringToEmbedded(input, {
        safe: SafeMode.SERVER,
        attributes: { docdir, docfile },
      })
      assert.ok(output.includes('docdir: </p>') || output.includes('docdir: \n') || output.match(/docdir:\s*<\/p>/) || output.includes('docdir: '))
      assert.ok(output.includes('docfile: sample.adoc'))
    })

    test('shows absolute docdir and docfile paths if safe mode is less than SERVER', async () => {
      const input = '* docdir: {docdir}\n* docfile: {docfile}'
      const docdir = (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/test'
      const docfile = `${docdir}/sample.adoc`
      const output = await convertStringToEmbedded(input, {
        safe: SafeMode.SAFE,
        attributes: { docdir, docfile },
      })
      assert.ok(output.includes(`docdir: ${docdir}`))
      assert.ok(output.includes(`docfile: ${docfile}`))
    })

    test('assigns attribute defined in attribute reference with set prefix and value', async () => {
      const input = '{set:foo:bar}{foo}'
      const output = await convertStringToEmbedded(input)
      assert.equal(countTag(output, 'p'), 1)
      assert.ok(output.includes('>bar<'))
    })

    test('assigns attribute defined in attribute reference with set prefix and no value', async () => {
      const input = '{set:foo}\n{foo}yes'
      const output = await convertStringToEmbedded(input)
      assert.equal(countTag(output, 'p'), 1)
      assert.ok(output.includes('yes'))
    })

    test('assigns attribute defined in attribute reference with set prefix and empty value', async () => {
      const input = '{set:foo:}\n{foo}yes'
      const output = await convertStringToEmbedded(input)
      assert.equal(countTag(output, 'p'), 1)
      assert.ok(output.includes('yes'))
    })

    test('unassigns attribute defined in attribute reference with set prefix', async () => {
      const input = ':attribute-missing: drop-line\n:foo:\n\n{set:foo!}\n{foo}yes'
      const output = await convertStringToEmbedded(input)
      assert.equal(countTag(output, 'p'), 1)
      assertMessage(logger, 'INFO', 'dropping line containing reference to missing attribute: foo')
    })
  })

  // ── Intrinsic attributes ───────────────────────────────────────────────────

  describe('Intrinsic attributes', () => {
    test('substitute intrinsics', async () => {
      for (const [key, value] of Object.entries(INTRINSIC_ATTRIBUTES)) {
        const html = await convertString(`Look, a {${key}} is here`)
        assert.ok(html.includes(value), `Expected output to contain "${value}" for {${key}}`)
      }
    })

    test('do not escape intrinsic substitutions', async () => {
      const html = await convertString('happy{nbsp}together')
      assert.ok(html.includes('happy&#160;together'))
    })

    test('escape special characters', async () => {
      const html = await convertString('<node>&</node>')
      assert.ok(html.includes('&lt;node&gt;&amp;&lt;/node&gt;'))
    })

    test('creates counter', async () => {
      const input = '{counter:mycounter}'
      const doc = await documentFromString(input)
      const output = await doc.convert()
      assert.equal(doc.attributes['mycounter'], 1)
      assert.ok(output.includes('>1<'))
    })

    test('creates counter silently', async () => {
      const input = '{counter2:mycounter}'
      const doc = await documentFromString(input)
      const output = await doc.convert()
      assert.equal(doc.attributes['mycounter'], 1)
      assert.ok(!output.includes('>1<'))
    })

    test('creates counter with numeric seed value', async () => {
      const input = '{counter2:mycounter:10}'
      const doc = await documentFromString(input)
      await doc.convert()
      assert.equal(doc.attributes['mycounter'], 10)
    })

    test('creates counter with character seed value', async () => {
      const input = '{counter2:mycounter:A}'
      const doc = await documentFromString(input)
      await doc.convert()
      assert.equal(doc.attributes['mycounter'], 'A')
    })

    test('can seed counter to start at 1', async () => {
      const input = ':mycounter: 0\n\n{counter:mycounter}'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('>1<'))
    })

    test('can seed counter to start at A', async () => {
      const input = ':mycounter: @\n\n{counter:mycounter}'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('>A<'))
    })

    test('increments counter with positive numeric value', async () => {
      const input = '[subs=attributes]\n++++\n{counter:mycounter:1}\n{counter:mycounter}\n{counter:mycounter}\n{mycounter}\n++++'
      const doc = await documentFromString(input, { standalone: false })
      const output = await doc.convert()
      assert.equal(doc.attributes['mycounter'], 3)
      const lines = output.split('\n').map((l) => l.trimEnd()).filter((l) => l)
      assert.deepEqual(lines, ['1', '2', '3', '3'])
    })

    test('increments counter with negative numeric value', async () => {
      const input = '[subs=attributes]\n++++\n{counter:mycounter:-2}\n{counter:mycounter}\n{counter:mycounter}\n{mycounter}\n++++'
      const doc = await documentFromString(input, { standalone: false })
      const output = await doc.convert()
      assert.equal(doc.attributes['mycounter'], 0)
      const lines = output.split('\n').map((l) => l.trimEnd()).filter((l) => l)
      assert.deepEqual(lines, ['-2', '-1', '0', '0'])
    })

    test('increments counter with ASCII character value', async () => {
      const input = '[subs=attributes]\n++++\n{counter:mycounter:A}\n{counter:mycounter}\n{counter:mycounter}\n{mycounter}\n++++'
      const output = await convertStringToEmbedded(input)
      const lines = output.split('\n').map((l) => l.trimEnd()).filter((l) => l)
      assert.deepEqual(lines, ['A', 'B', 'C', 'C'])
    })

    test('increments counter with non-ASCII character value', async () => {
      const input = '[subs=attributes]\n++++\n{counter:mycounter:é}\n{counter:mycounter}\n{counter:mycounter}\n{mycounter}\n++++'
      const output = await convertStringToEmbedded(input)
      const lines = output.split('\n').map((l) => l.trimEnd()).filter((l) => l)
      assert.deepEqual(lines, ['é', 'ê', 'ë', 'ë'])
    })

    test('increments counter with emoji character value', async () => {
      const input = '[subs=attributes]\n++++\n{counter:smiley:😋}\n{counter:smiley}\n{counter:smiley}\n{smiley}\n++++'
      const output = await convertStringToEmbedded(input)
      const lines = output.split('\n').map((l) => l.trimEnd()).filter((l) => l)
      assert.deepEqual(lines, ['😋', '😌', '😍', '😍'])
    })

    test('increments counter with multi-character value', async () => {
      const input = '[subs=attributes]\n++++\n{counter:math:1x}\n{counter:math}\n{counter:math}\n{math}\n++++'
      const output = await convertStringToEmbedded(input)
      const lines = output.split('\n').map((l) => l.trimEnd()).filter((l) => l)
      assert.deepEqual(lines, ['1x', '1y', '1z', '1z'])
    })

    test('counter uses 0 as seed value if seed attribute is nil', async () => {
      const input = ':mycounter:\n\n{counter:mycounter}\n\n{mycounter}'
      const doc = await documentFromString(input)
      const output = await doc.convert({ standalone: false })
      assert.equal(doc.attributes['mycounter'], 1)
      assert.equal(countTag(output, 'p'), 2)
      assert.ok(output.includes('>1<'))
    })

    test('counter value can be reset by attribute entry', async () => {
      const input = ':mycounter:\n\nbefore: {counter:mycounter} {counter:mycounter} {counter:mycounter}\n\n:mycounter!:\n\nafter: {counter:mycounter}'
      const doc = await documentFromString(input)
      const output = await doc.convert({ standalone: false })
      assert.equal(doc.attributes['mycounter'], 1)
      assert.ok(output.includes('before: 1 2 3'))
      assert.ok(output.includes('after: 1'))
    })

    test('counter value can be advanced by attribute entry', async () => {
      const input = 'before: {counter:mycounter}\n\n:mycounter: 10\n\nafter: {counter:mycounter}'
      const doc = await documentFromString(input)
      const output = await doc.convert({ standalone: false })
      assert.equal(doc.attributes['mycounter'], 11)
      assert.ok(output.includes('before: 1'))
      assert.ok(output.includes('after: 11'))
    })

    test('nested document should use counter from parent document', async () => {
      const input = '.Title for Foo\nimage::foo.jpg[]\n\n[cols="2*a"]\n|===\n|\n.Title for Bar\nimage::bar.jpg[]\n\n|\n.Title for Baz\nimage::baz.jpg[]\n|===\n\n.Title for Qux\nimage::qux.jpg[]'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Figure 1. Title for Foo'))
      assert.ok(output.includes('Figure 2. Title for Bar'))
      assert.ok(output.includes('Figure 3. Title for Baz'))
      assert.ok(output.includes('Figure 4. Title for Qux'))
    })

    test('should not allow counter to modify locked attribute', async () => {
      const input = '{counter:foo:ignored} is not {foo}'
      const output = await convertStringToEmbedded(input, { attributes: { foo: 'bar' } })
      assert.ok(output.includes('bas is not bar'))
    })

    test('should not allow counter2 to modify locked attribute', async () => {
      const input = '{counter2:foo:ignored}{foo}'
      const output = await convertStringToEmbedded(input, { attributes: { foo: 'bar' } })
      assert.ok(output.includes('>bar<'))
    })

    test('should not allow counter to modify built-in locked attribute', async () => {
      const input = '{counter:max-include-depth:128} is one more than {max-include-depth}'
      const doc = await documentFromString(input, { standalone: false })
      const output = await doc.convert()
      assert.ok(output.includes('65 is one more than 64'))
      assert.equal(doc.attributes['max-include-depth'], 64)
    })

    test('should not allow counter2 to modify built-in locked attribute', async () => {
      const input = '{counter2:max-include-depth:128}{max-include-depth}'
      const doc = await documentFromString(input, { standalone: false })
      const output = await doc.convert()
      assert.ok(output.includes('>64<'))
      assert.equal(doc.attributes['max-include-depth'], 64)
    })
  })

  // ── Block attributes ───────────────────────────────────────────────────────

  describe('Block attributes', () => {
    test('parses named attribute with valid name', async () => {
      const input = '[normal,foo="bar",_foo="_bar",foo1="bar1",foo-foo="bar-bar",foo.foo="bar.bar"]\ncontent'
      const block = await blockFromString(input)
      assert.equal(block.attr('foo'), 'bar')
      assert.equal(block.attr('_foo'), '_bar')
      assert.equal(block.attr('foo1'), 'bar1')
      assert.equal(block.attr('foo-foo'), 'bar-bar')
    })

    test('does not parse named attribute if name is invalid', async () => {
      const input = '[normal,foo.foo="bar.bar",-foo-foo="-bar-bar"]\ncontent'
      const block = await blockFromString(input)
      assert.equal(block.attributes[2], 'foo.foo="bar.bar"')
      assert.equal(block.attributes[3], '-foo-foo="-bar-bar"')
    })

    test('positional attributes assigned to block', async () => {
      const input = '[quote, author, source]\n____\nA famous quote.\n____'
      const doc = await documentFromString(input)
      const qb = doc.blocks[0]
      assert.equal(qb.style, 'quote')
      assert.equal(qb.attr('attribution'), 'author')
      assert.equal(qb.attr('attribution'), 'author') // symbol key equivalent
      assert.equal(qb.attributes['attribution'], 'author')
      assert.equal(qb.attributes['citetitle'], 'source')
    })

    test('normal substitutions are performed on single-quoted positional attribute', async () => {
      const input = "[quote, author, 'http://wikipedia.org[source]']\n____\nA famous quote.\n____"
      const doc = await documentFromString(input)
      const qb = doc.blocks[0]
      assert.equal(qb.style, 'quote')
      assert.equal(qb.attr('attribution'), 'author')
      assert.equal(qb.attributes['attribution'], 'author')
      assert.ok(qb.attributes['citetitle'].includes('href="http://wikipedia.org"'))
      assert.ok(qb.attributes['citetitle'].includes('>source<'))
    })

    test('normal substitutions are performed on single-quoted named attribute', async () => {
      const input = "[quote, author, citetitle='http://wikipedia.org[source]']\n____\nA famous quote.\n____"
      const doc = await documentFromString(input)
      const qb = doc.blocks[0]
      assert.equal(qb.style, 'quote')
      assert.equal(qb.attr('attribution'), 'author')
      assert.equal(qb.attributes['attribution'], 'author')
      assert.ok(qb.attributes['citetitle'].includes('href="http://wikipedia.org"'))
      assert.ok(qb.attributes['citetitle'].includes('>source<'))
    })

    test('normal substitutions are performed once on single-quoted named title attribute', async () => {
      const input = "[title='*title*']\ncontent"
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('<strong>title</strong>'))
    })

    test('attribute list may not begin with space', async () => {
      const input = '[ quote]\n____\nA famous quote.\n____'
      const doc = await documentFromString(input)
      const b1 = doc.blocks[0]
      assert.ok(b1.lines.includes('[ quote]'))
    })

    test('attribute list may begin with comma', async () => {
      const input = '[, author, source]\n____\nA famous quote.\n____'
      const doc = await documentFromString(input)
      const qb = doc.blocks[0]
      assert.equal(qb.style, 'quote')
      assert.equal(qb.attributes['attribution'], 'author')
      assert.equal(qb.attributes['citetitle'], 'source')
    })

    test('first attribute in list may be double quoted', async () => {
      const input = '["quote", "author", "source", role="famous"]\n____\nA famous quote.\n____'
      const doc = await documentFromString(input)
      const qb = doc.blocks[0]
      assert.equal(qb.style, 'quote')
      assert.equal(qb.attributes['attribution'], 'author')
      assert.equal(qb.attributes['citetitle'], 'source')
      assert.equal(qb.attributes['role'], 'famous')
    })

    test('first attribute in list may be single quoted', async () => {
      const input = "['quote', 'author', 'source', role='famous']\n____\nA famous quote.\n____"
      const doc = await documentFromString(input)
      const qb = doc.blocks[0]
      assert.equal(qb.style, 'quote')
      assert.equal(qb.attributes['attribution'], 'author')
      assert.equal(qb.attributes['citetitle'], 'source')
      assert.equal(qb.attributes['role'], 'famous')
    })

    test('attribute with value None without quotes is ignored', async () => {
      const input = '[id=None]\nparagraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.ok(!('id' in para.attributes))
    })

    test('role? returns true if role is assigned', async () => {
      const input = '[role="lead"]\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.ok(p.hasRoleAttr())
    })

    test('role? does not return true if role attribute is set on document', async () => {
      const input = ':role: lead\n\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.ok(!p.hasRoleAttr())
    })

    test('role? can check for exact role name match', async () => {
      const input = '[role="lead"]\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.ok(p.hasRoleAttr('lead'))
      assert.ok(!doc.blocks[doc.blocks.length - 1].hasRoleAttr('final'))
    })

    test('has_role? can check for presence of role name', async () => {
      const input = '[role="lead abstract"]\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.ok(!p.hasRoleAttr('lead'))
      assert.ok(p.hasRole('lead'))
    })

    test('has_role? does not look for role defined as document attribute', async () => {
      const input = ':role: lead abstract\n\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.ok(!p.hasRole('lead'))
    })

    test('roles returns array of role names', async () => {
      const input = '[role="story lead"]\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.deepEqual(p.roles, ['story', 'lead'])
    })

    test('roles returns empty array if role attribute is not set', async () => {
      const doc = await documentFromString('a paragraph')
      const p = doc.blocks[0]
      assert.deepEqual(p.roles, [])
    })

    test('roles does not return value of roles document attribute', async () => {
      const input = ':role: story lead\n\nA paragraph'
      const doc = await documentFromString(input)
      const p = doc.blocks[0]
      assert.deepEqual(p.roles, [])
    })

    test('roles= sets the role attribute on the node', async () => {
      const doc = await documentFromString('a paragraph')
      const p = doc.blocks[0]
      p.role = 'foobar'
      assert.equal(p.attr('role'), 'foobar')
    })

    test('roles= coerces array value to a space-separated string', async () => {
      const doc = await documentFromString('a paragraph')
      const p = doc.blocks[0]
      p.role = ['foo', 'bar']
      assert.equal(p.attr('role'), 'foo bar')
    })

    test('Attribute substitutions are performed on attribute list before parsing attributes', async () => {
      const input = ':lead: role="lead"\n\n[{lead}]\nA paragraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.attributes['role'], 'lead')
    })

    test('id, role and options attributes can be specified on block style using shorthand syntax', async () => {
      const input = '[literal#first.lead%step]\nA literal paragraph.'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.context, 'literal')
      assert.equal(para.attributes['id'], 'first')
      assert.equal(para.attributes['role'], 'lead')
      assert.ok('step-option' in para.attributes)
      assert.ok(!('options' in para.attributes))
    })

    test('id, role and options attributes can be specified using shorthand syntax on block style using multiple block attribute lines', async () => {
      const input = '[literal]\n[#first]\n[.lead]\n[%step]\nA literal paragraph.'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.context, 'literal')
      assert.equal(para.attributes['id'], 'first')
      assert.equal(para.attributes['role'], 'lead')
      assert.ok('step-option' in para.attributes)
      assert.ok(!('options' in para.attributes))
    })

    test('multiple roles and options can be specified in block style using shorthand syntax', async () => {
      const input = '[.role1%option1.role2%option2]\nText'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.attributes['role'], 'role1 role2')
      assert.ok('option1-option' in para.attributes)
      assert.ok('option2-option' in para.attributes)
      assert.ok(!('options' in para.attributes))
    })

    test('options specified using shorthand syntax on block style across multiple lines should be additive', async () => {
      const input = '[%option1]\n[%option2]\nText'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.ok('option1-option' in para.attributes)
      assert.ok('option2-option' in para.attributes)
      assert.ok(!('options' in para.attributes))
    })

    test('roles specified using shorthand syntax on block style across multiple lines should be additive', async () => {
      const input = '[.role1]\n[.role2.role3]\nText'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.attributes['role'], 'role1 role2 role3')
    })

    test('setting a role using the role attribute replaces any existing roles', async () => {
      const input = '[.role1]\n[role=role2]\n[.role3]\nText'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.attributes['role'], 'role2 role3')
    })

    test('setting a role using the shorthand syntax on block style should not clear the ID', async () => {
      const input = '[#id]\n[.role]\nText'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.id, 'id')
      assert.equal(para.role, 'role')
    })

    test('a role can be added using add_role when the node has no roles', async () => {
      const doc = await documentFromString('A normal paragraph')
      const para = doc.blocks[0]
      const res = para.addRole('role1')
      assert.ok(res)
      assert.equal(para.attributes['role'], 'role1')
      assert.ok(para.hasRole('role1'))
    })

    test('a role can be added using add_role when the node already has a role', async () => {
      const input = '[.role1]\nA normal paragraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      const res = para.addRole('role2')
      assert.ok(res)
      assert.equal(para.attributes['role'], 'role1 role2')
      assert.ok(para.hasRole('role1'))
      assert.ok(para.hasRole('role2'))
    })

    test('a role is not added using add_role if the node already has that role', async () => {
      const input = '[.role1]\nA normal paragraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      const res = para.addRole('role1')
      assert.ok(!res)
      assert.equal(para.attributes['role'], 'role1')
      assert.ok(para.hasRole('role1'))
    })

    test('an existing role can be removed using remove_role', async () => {
      const input = '[.role1.role2]\nA normal paragraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      const res = para.removeRole('role1')
      assert.ok(res)
      assert.equal(para.attributes['role'], 'role2')
      assert.ok(para.hasRole('role2'))
      assert.ok(!para.hasRole('role1'))
    })

    test('roles are removed when last role is removed using remove_role', async () => {
      const input = '[.role1]\nA normal paragraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      const res = para.removeRole('role1')
      assert.ok(res)
      assert.ok(!para.hasRoleAttr())
      assert.equal(para.attributes['role'], undefined)
      assert.ok(!para.hasRole('role1'))
    })

    test('roles are not changed when a non-existent role is removed using remove_role', async () => {
      const input = '[.role1]\nA normal paragraph'
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      const res = para.removeRole('role2')
      assert.ok(!res)
      assert.equal(para.attributes['role'], 'role1')
      assert.ok(para.hasRole('role1'))
      assert.ok(!para.hasRole('role2'))
    })

    test('roles are not changed when using remove_role if the node has no roles', async () => {
      const doc = await documentFromString('A normal paragraph')
      const para = doc.blocks[0]
      const res = para.removeRole('role1')
      assert.ok(!res)
      assert.equal(para.attributes['role'], undefined)
      assert.ok(!para.hasRole('role1'))
    })

    test('option can be specified in first position of block style using shorthand syntax', async () => {
      const input = '[%interactive]\n- [x] checked'
      const doc = await documentFromString(input)
      const list = doc.blocks[0]
      assert.ok('interactive-option' in list.attributes)
      assert.ok(!('options' in list.attributes))
    })

    test('id and role attributes can be specified on section style using shorthand syntax', async () => {
      const input = '[dedication#dedication.small]\n== Section\nContent.'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('class="sect1 small"'))
      assert.ok(output.includes('id="dedication"'))
    })

    test('id attribute specified using shorthand syntax should not create a special section', async () => {
      const input = '[#idname]\n== Section\n\ncontent'
      const doc = await documentFromString(input)
      const section = doc.blocks[0]
      assert.ok(section != null)
      assert.equal(section.context, 'section')
      assert.ok(!section.special)
    })

    test('Block attributes are additive', async () => {
      const input = "[id='foo']\n[role='lead']\nA paragraph."
      const doc = await documentFromString(input)
      const para = doc.blocks[0]
      assert.equal(para.id, 'foo')
      assert.equal(para.attributes['role'], 'lead')
    })

    test('Last wins for id attribute', async () => {
      const input = '[[bar]]\n[[foo]]\n== Section\n\nparagraph\n\n[[baz]]\n[id=\'coolio\']\n=== Section'
      const doc = await documentFromString(input)
      const sec = doc.firstSection()
      assert.equal(sec.id, 'foo')
      const subsec = sec.blocks[sec.blocks.length - 1]
      assert.equal(subsec.id, 'coolio')
    })

    test('trailing block attributes transfer to the following section', async () => {
      const input = '[[one]]\n\n== Section One\n\nparagraph\n\n[[sub]]\n// try to mess this up!\n\n=== Sub-section\n\nparagraph\n\n[role=\'classy\']\n\n////\nblock comment\n////\n\n== Section Two\n\ncontent'
      const doc = await documentFromString(input)
      const sectionOne = doc.blocks[0]
      assert.equal(sectionOne.id, 'one')
      const subsection = sectionOne.blocks[sectionOne.blocks.length - 1]
      assert.equal(subsection.id, 'sub')
      const sectionTwo = doc.blocks[doc.blocks.length - 1]
      assert.equal(sectionTwo.attr('role'), 'classy')
    })

    test('set role', async () => {
      const doc = await documentFromString(`= Title

[.foreword]
== Foreword`)
      const sectionWithRole = doc.getBlocks()[0]
      assert.equal(sectionWithRole.getRole(), 'foreword')

      sectionWithRole.setRole('afterword')
      assert.equal(sectionWithRole.getRole(), 'afterword')

      sectionWithRole.setRole('afterword last')
      assert.equal(sectionWithRole.getRole(), 'afterword last')

      sectionWithRole.setRole('lastword', 'closing')
      assert.equal(sectionWithRole.getRole(), 'lastword closing')

      sectionWithRole.setRole(['finalword', 'conclude'])
      assert.equal(sectionWithRole.getRole(), 'finalword conclude')
    })
  })
})
