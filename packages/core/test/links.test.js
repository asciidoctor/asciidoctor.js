// ESM conversion of links_test.rb
// Tests for link and cross-reference handling in Asciidoctor.

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { Inline } from '../src/inline.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertXpath, assertMessage, decodeChar } from './helpers.js'
import {
  documentFromString,
  convertString,
  convertStringToEmbedded,
  blockFromString,
} from './harness.js'
import { Severity } from '../src/logging.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const convertInlineString = (input, opts = {}) =>
  documentFromString(input, { doctype: 'inline', ...opts }).then((doc) =>
    doc.convert()
  )

// ── URL link tests ────────────────────────────────────────────────────────────

describe('Links', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  test('qualified url inline with text', async () => {
    const output = await convertString(
      'The AsciiDoc project is located at http://asciidoc.org.'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare"][text() = "http://asciidoc.org"]',
      1
    )
  })

  test('qualified url with role inline with text', async () => {
    const output = await convertString(
      'The AsciiDoc project is located at http://asciidoc.org[role=project].'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare project"][text() = "http://asciidoc.org"]',
      1
    )
  })

  test('qualified http url inline with hide-uri-scheme set', async () => {
    const output = await convertString(
      'The AsciiDoc project is located at http://asciidoc.org.',
      { attributes: { 'hide-uri-scheme': '' } }
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare"][text() = "asciidoc.org"]',
      1
    )
  })

  test('qualified file url inline with label', async () => {
    const output = await convertStringToEmbedded(
      'file:///home/user/bookmarks.html[My Bookmarks]'
    )
    assertXpath(
      output,
      '//a[@href="file:///home/user/bookmarks.html"][text() = "My Bookmarks"]',
      1
    )
  })

  test('qualified file url inline with hide-uri-scheme set', async () => {
    const output = await convertString(
      'Edit the configuration file link:file:///etc/app.conf[]',
      { attributes: { 'hide-uri-scheme': '' } }
    )
    assertXpath(
      output,
      '//a[@href="file:///etc/app.conf"][text() = "/etc/app.conf"]',
      1
    )
  })

  test('should not hide bare URI scheme in implicit text of link macro when hide-uri-scheme is set', async () => {
    const cases = [
      ['link:https://[]', 'https://'],
      ['link:ssh://[]', 'ssh://'],
    ]
    for (const [input, expected] of cases) {
      const output = await convertInlineString(input, {
        attributes: { 'hide-uri-scheme': '' },
      })
      assertXpath(output, `/a[text() = "${expected}"]`, 1)
    }
  })

  test('qualified url with label', async () => {
    const output = await convertString(
      "We're parsing http://asciidoc.org[AsciiDoc] markup"
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text() = "AsciiDoc"]',
      1
    )
  })

  test('qualified url with label containing escaped right square bracket', async () => {
    const output = await convertString(
      "We're parsing http://asciidoc.org[[Ascii\\]Doc] markup"
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text() = "[Ascii]Doc"]',
      1
    )
  })

  test('qualified url with backslash label', async () => {
    const output = await convertString(
      'I advise you to https://google.com[Google for +\\+]'
    )
    assertXpath(
      output,
      '//a[@href="https://google.com"][text() = "Google for \\"]',
      1
    )
  })

  test('qualified url with label using link macro', async () => {
    const output = await convertString(
      "We're parsing link:http://asciidoc.org[AsciiDoc] markup"
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text() = "AsciiDoc"]',
      1
    )
  })

  test('qualified url with role using link macro', async () => {
    const output = await convertString(
      "We're parsing link:http://asciidoc.org[role=project] markup"
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare project"][text() = "http://asciidoc.org"]',
      1
    )
  })

  test('qualified url using macro syntax with multi-line label inline with text', async () => {
    const output = await convertString(
      "We're parsing link:http://asciidoc.org[AsciiDoc\nmarkup]"
    )
    assertXpath(
      output,
      `//a[@href='http://asciidoc.org'][text() = 'AsciiDoc\nmarkup']`,
      1
    )
  })

  test('qualified url with label containing square brackets using link macro', async () => {
    const str = 'http://example.com[[bracket1\\]]'
    const doc = await documentFromString(str, {
      standalone: false,
      doctype: 'inline',
    })
    assert.ok(
      (await doc.convert()).includes(
        '<a href="http://example.com">[bracket1]</a>'
      )
    )
    const docDocbook = await documentFromString(str, {
      standalone: false,
      backend: 'docbook',
      doctype: 'inline',
    })
    assert.ok(
      (await docDocbook.convert()).includes(
        '<link xl:href="http://example.com">[bracket1]</link>'
      )
    )
  })

  test('link macro with empty target', async () => {
    const output = await convertStringToEmbedded('Link to link:[this page].')
    assertXpath(output, '//a', 1)
    assertXpath(output, '//a[@href=""]', 1)
  })

  test('should not recognize link macro with double colons', async () => {
    const output = await convertStringToEmbedded(
      'The link::http://example.org[example domain] is reserved for tests and documentation.'
    )
    assert.ok(output.includes('link::http://example.org[example domain]'))
  })

  test('qualified url surrounded by angled brackets', async () => {
    const output = await convertString(
      '<http://asciidoc.org> is the project page for AsciiDoc.'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare"][text()="http://asciidoc.org"]',
      1
    )
  })

  test('qualified url surrounded by double angled brackets should preserve outer angled brackets', async () => {
    const output = await convertStringToEmbedded('<<https://asciidoc.org>>')
    assert.ok(
      output.includes(
        '&lt;<a href="https://asciidoc.org" class="bare">https://asciidoc.org</a>&gt;'
      )
    )
  })

  test('qualified url macro inside angled brackets', async () => {
    const output = await convertStringToEmbedded('<https://asciidoc.org[]>')
    assert.ok(
      output.includes(
        '&lt;<a href="https://asciidoc.org" class="bare">https://asciidoc.org</a>&gt;'
      )
    )
  })

  test('qualified url surrounded by angled brackets in unconstrained context', async () => {
    const output = await convertString('URLは<http://asciidoc.org>。fin')
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare"][text()="http://asciidoc.org"]',
      1
    )
  })

  test('multiple qualified urls surrounded by angled brackets in unconstrained context', async () => {
    const output = await convertString(
      'URLは<http://asciidoc.org>。URLは<http://asciidoc.org>。'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][@class="bare"][text()="http://asciidoc.org"]',
      2
    )
  })

  test('qualified url surrounded by escaped angled brackets should escape form', async () => {
    const output = await convertString('\\<http://asciidoc.org>')
    assertXpath(output, '//p[text()="<http://asciidoc.org>"]', 1)
  })

  test('escaped qualified url surrounded by angled brackets should escape autolink', async () => {
    const output = await convertString('<\\http://asciidoc.org>')
    assertXpath(output, '//p[text()="<http://asciidoc.org>"]', 1)
  })

  test('xref shorthand with target that starts with URL protocol and has space after comma should not crash parser', async () => {
    const output = await convertStringToEmbedded(
      '<<https://example.com, Example>>'
    )
    assert.ok(output.includes('<a href="#https://example.com">Example</a>'))
  })

  test('xref shorthand with link macro as target should be ignored', async () => {
    const output = await convertStringToEmbedded(
      '<<link:https://example.com[], Example>>'
    )
    assert.ok(
      output.includes(
        '&lt;&lt;<a href="https://example.com" class="bare">https://example.com</a>, Example&gt;&gt;'
      )
    )
  })

  test('autolink containing text enclosed in angle brackets', async () => {
    const output = await convertStringToEmbedded('https://github.com/<org>/')
    assert.ok(
      output.includes(
        '<a href="https://github.com/&lt;org&gt;/" class="bare">https://github.com/&lt;org&gt;/</a>'
      )
    )
  })

  test('qualified url surrounded by round brackets', async () => {
    const output = await convertString(
      '(http://asciidoc.org) is the project page for AsciiDoc.'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text()="http://asciidoc.org"]',
      1
    )
  })

  test('qualified url with trailing period', async () => {
    const result = await convertStringToEmbedded(
      'The homepage for Asciidoctor is https://asciidoctor.org.'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,".")]',
      1
    )
  })

  test('qualified url with trailing exclamation point', async () => {
    const result = await convertStringToEmbedded(
      'Check out https://asciidoctor.org!'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,"!")]',
      1
    )
  })

  test('qualified url with trailing question mark', async () => {
    const result = await convertStringToEmbedded(
      'Is the homepage for Asciidoctor https://asciidoctor.org?'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,"?")]',
      1
    )
  })

  test('qualified url with trailing round bracket', async () => {
    const result = await convertStringToEmbedded(
      'Asciidoctor is a Ruby-based AsciiDoc processor (see https://asciidoctor.org)'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,")")]',
      1
    )
  })

  test('qualified url with trailing period followed by round bracket', async () => {
    const result = await convertStringToEmbedded(
      '(The homepage for Asciidoctor is https://asciidoctor.org.)'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,".)")]',
      1
    )
  })

  test('qualified url with trailing exclamation point followed by round bracket', async () => {
    const result = await convertStringToEmbedded(
      '(Check out https://asciidoctor.org!)'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,"!)")]',
      1
    )
  })

  test('qualified url with trailing question mark followed by round bracket', async () => {
    const result = await convertStringToEmbedded(
      '(Is the homepage for Asciidoctor https://asciidoctor.org?)'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,"?)")]',
      1
    )
  })

  test('qualified url with trailing semi-colon', async () => {
    const result = await convertStringToEmbedded(
      'https://asciidoctor.org; where text gets parsed'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,";")]',
      1
    )
  })

  test('qualified url with trailing colon', async () => {
    const result = await convertStringToEmbedded(
      'https://asciidoctor.org: where text gets parsed'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,":")]',
      1
    )
  })

  test('qualified url in round brackets with trailing colon', async () => {
    const result = await convertStringToEmbedded(
      '(https://asciidoctor.org): where text gets parsed'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(.,"):")]',
      1
    )
  })

  test('qualified url with trailing round bracket followed by colon', async () => {
    const result = await convertStringToEmbedded(
      '(from https://asciidoctor.org): where text gets parsed'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(., "):")]',
      1
    )
  })

  test('qualified url in round brackets with trailing semi-colon', async () => {
    const result = await convertStringToEmbedded(
      '(https://asciidoctor.org); where text gets parsed'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(., ");")]',
      1
    )
  })

  test('qualified url with trailing round bracket followed by semi-colon', async () => {
    const result = await convertStringToEmbedded(
      '(from https://asciidoctor.org); where text gets parsed'
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]',
      1
    )
    assertXpath(
      result,
      '//a[@href="https://asciidoctor.org"][text()="https://asciidoctor.org"]/following-sibling::text()[starts-with(., ");")]',
      1
    )
  })

  test('URI scheme with trailing characters should not be converted to a link', async () => {
    const inputSources = ['http://;', 'file://:', 'irc://,']
    const expectedOutputs = ['http://;', 'file://:', 'irc://,']
    for (let i = 0; i < inputSources.length; i++) {
      const block = await blockFromString(inputSources[i])
      assert.equal(await block.content(), expectedOutputs[i])
    }
  })

  test('bare URI scheme enclosed in brackets should not be converted to link', async () => {
    const inputSources = ['(https://)', '<ftp://>']
    const expectedOutputs = ['(https://)', '&lt;ftp://&gt;']
    for (let i = 0; i < inputSources.length; i++) {
      const block = await blockFromString(inputSources[i])
      assert.equal(await block.content(), expectedOutputs[i])
    }
  })

  test('qualified url containing round brackets', async () => {
    const output = await convertString(
      'http://jruby.org/apidocs/org/jruby/Ruby.html#addModule(org.jruby.RubyModule)[addModule() adds a Ruby module]'
    )
    assertXpath(
      output,
      '//a[@href="http://jruby.org/apidocs/org/jruby/Ruby.html#addModule(org.jruby.RubyModule)"][text()="addModule() adds a Ruby module"]',
      1
    )
  })

  test('qualified url adjacent to text in square brackets', async () => {
    const output = await convertString(
      ']http://asciidoc.org[AsciiDoc] project page.'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text()="AsciiDoc"]',
      1
    )
  })

  test('qualified url adjacent to text in round brackets', async () => {
    const output = await convertString(
      ')http://asciidoc.org[AsciiDoc] project page.'
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text()="AsciiDoc"]',
      1
    )
  })

  test('qualified url following no-break space', async () => {
    const output = await convertString(
      `${String.fromCodePoint(0xa0)}http://asciidoc.org[AsciiDoc] project page.`
    )
    assertXpath(
      output,
      '//a[@href="http://asciidoc.org"][text()="AsciiDoc"]',
      1
    )
  })

  test('qualified url following smart apostrophe', async () => {
    const output = await convertStringToEmbedded(
      'l&#8217;http://www.irit.fr[IRIT]'
    )
    assert.match(output, /l&#8217;<a href=/)
  })

  test('should convert qualified url as macro enclosed in double quotes', async () => {
    const output = await convertStringToEmbedded('"https://asciidoctor.org[]"')
    assert.ok(
      output.includes(
        '"<a href="https://asciidoctor.org" class="bare">https://asciidoctor.org</a>"'
      )
    )
  })

  test('should convert qualified url as macro enclosed in single quotes', async () => {
    const output = await convertStringToEmbedded("'https://asciidoctor.org[]'")
    assert.ok(
      output.includes(
        '\'<a href="https://asciidoctor.org" class="bare">https://asciidoctor.org</a>\''
      )
    )
  })

  test('should convert qualified url as macro with trailing period', async () => {
    const result = await convertStringToEmbedded(
      'Information about the https://symbols.example.org/.[.] character.'
    )
    assertXpath(
      result,
      '//a[@href="https://symbols.example.org/."][text()="."]',
      1
    )
  })

  test('qualified url using invalid link macro should not create link', async () => {
    const output = await convertString(
      'link:http://asciidoc.org is the project page for AsciiDoc.'
    )
    assertXpath(output, '//a', 0)
  })

  test('escaped inline qualified url should not create link', async () => {
    const output = await convertString(
      '\\http://asciidoc.org is the project page for AsciiDoc.'
    )
    assertXpath(output, '//a', 0)
  })

  test('escaped inline qualified url as macro should not create link', async () => {
    const output = await convertString(
      '\\http://asciidoc.org[asciidoc.org] is the project page for AsciiDoc.'
    )
    assertXpath(output, '//a', 0)
    assertXpath(
      output,
      '//p[starts-with(text(), "http://asciidoc.org[asciidoc.org]")]',
      1
    )
  })

  test('url in link macro with at (@) sign should not create mailto link', async () => {
    const output = await convertString(
      'http://xircles.codehaus.org/lists/dev@geb.codehaus.org[subscribe]'
    )
    assertXpath(
      output,
      '//a[@href="http://xircles.codehaus.org/lists/dev@geb.codehaus.org"][text()="subscribe"]',
      1
    )
  })

  test('implicit url with at (@) sign should not create mailto link', async () => {
    const output = await convertString(
      'http://xircles.codehaus.org/lists/dev@geb.codehaus.org'
    )
    assertXpath(
      output,
      '//a[@href="http://xircles.codehaus.org/lists/dev@geb.codehaus.org"][text()="http://xircles.codehaus.org/lists/dev@geb.codehaus.org"]',
      1
    )
  })

  test('escaped inline qualified url using macro syntax should not create link', async () => {
    const output = await convertString(
      '\\http://asciidoc.org[AsciiDoc] is the key to good docs.'
    )
    assertXpath(output, '//a', 0)
  })

  test('inline qualified url followed by a newline should not include newline in link', async () => {
    const output = await convertString(
      'The source code for Asciidoctor can be found at https://github.com/asciidoctor\nwhich is a GitHub organization.'
    )
    assertXpath(output, '//a[@href="https://github.com/asciidoctor"]', 1)
  })

  test('qualified url divided by newline using macro syntax should not create link', async () => {
    const output = await convertString(
      'The source code for Asciidoctor can be found at link:https://github.com/asciidoctor\n[]which is a GitHub organization.'
    )
    assertXpath(output, '//a', 0)
  })

  test('qualified url containing whitespace using macro syntax should not create link', async () => {
    const output = await convertString(
      'I often need to refer to the chapter on link:http://asciidoc.org?q=attribute references[Attribute References].'
    )
    assertXpath(output, '//a', 0)
  })

  test('qualified url containing an encoded space using macro syntax should create a link', async () => {
    const output = await convertString(
      'I often need to refer to the chapter on link:http://asciidoc.org?q=attribute%20references[Attribute References].'
    )
    assertXpath(output, '//a', 1)
  })

  test('inline quoted qualified url should not consume surrounding angled brackets', async () => {
    const output = await convertString(
      'Asciidoctor GitHub organization: <**https://github.com/asciidoctor**>'
    )
    assertXpath(output, '//a[@href="https://github.com/asciidoctor"]', 1)
  })

  test('link with quoted text should not be separated into attributes when text contains an equal sign', async () => {
    const output = await convertStringToEmbedded(
      'http://search.example.com["Google, Yahoo, Bing = Search Engines"]'
    )
    assertXpath(
      output,
      '//a[@href="http://search.example.com"][text()="Google, Yahoo, Bing = Search Engines"]',
      1
    )
  })

  test('should leave link text as is if it contains an equals sign but no attributes are found', async () => {
    const output = await convertStringToEmbedded(
      'https://example.com[What You Need\n= What You Get]'
    )
    assertXpath(
      output,
      '//a[@href="https://example.com"][text()="What You Need\n= What You Get"]',
      1
    )
  })

  test('link with quoted text but no equal sign should carry quotes over to output', async () => {
    const output = await convertStringToEmbedded(
      'http://search.example.com["Google, Yahoo, Bing"]'
    )
    assertXpath(
      output,
      '//a[@href="http://search.example.com"][text()=\'"Google, Yahoo, Bing"\']',
      1
    )
  })

  test('link with comma in text but no equal sign should not be separated into attributes', async () => {
    const output = await convertStringToEmbedded(
      'http://search.example.com[Google, Yahoo, Bing]'
    )
    assertXpath(
      output,
      '//a[@href="http://search.example.com"][text()="Google, Yahoo, Bing"]',
      1
    )
  })

  test('link with formatted wrapped text should not be separated into attributes', async () => {
    const result = await convertStringToEmbedded(
      'https://example.com[[.role]#Foo\nBar#]'
    )
    assert.ok(
      result.includes(
        '<a href="https://example.com"><span class="role">Foo\nBar</span></a>'
      )
    )
  })

  test('should process role and window attributes on link', async () => {
    const output = await convertStringToEmbedded(
      'http://google.com[Google, role=external, window="_blank"]'
    )
    assertXpath(
      output,
      '//a[@href="http://google.com"][@class="external"][@target="_blank"]',
      1
    )
  })

  test('should parse link with wrapped text that includes attributes', async () => {
    const result = await convertStringToEmbedded(
      'https://example.com[Foo\nBar,role=foobar]'
    )
    assert.ok(
      result.includes(
        '<a href="https://example.com" class="foobar">Foo Bar</a>'
      )
    )
  })

  test('link macro with attributes but no text should use URL as text', async () => {
    const url = 'https://fonts.googleapis.com/css?family=Roboto:400,400italic,'
    const output = await convertStringToEmbedded(
      `link:${url}[family=Roboto,weight=400]`
    )
    assertXpath(output, `//a[@href="${url}"][text()="${url}"]`, 1)
  })

  test('link macro with attributes but blank text should use URL as text', async () => {
    const url = 'https://fonts.googleapis.com/css?family=Roboto:400,400italic,'
    const output = await convertStringToEmbedded(
      `link:${url}[,family=Roboto,weight=400]`
    )
    assertXpath(output, `//a[@href="${url}"][text()="${url}"]`, 1)
  })

  test('link macro with comma but no explicit attributes in text should not parse text', async () => {
    const url = 'https://fonts.googleapis.com/css?family=Roboto:400,400italic,'
    const output = await convertStringToEmbedded(`link:${url}[Roboto,400]`)
    assertXpath(output, `//a[@href="${url}"][text()="Roboto,400"]`, 1)
  })

  test('link macro should support id and role attributes', async () => {
    const url = 'https://fonts.googleapis.com/css?family=Roboto:400'
    const output = await convertStringToEmbedded(
      `link:${url}[,id=roboto-regular,role=font]`
    )
    assertXpath(
      output,
      `//a[@href="${url}"][@id="roboto-regular"][@class="bare font"][text()="${url}"]`,
      1
    )
  })

  test('link text that ends in ^ should set link window to _blank', async () => {
    const output = await convertStringToEmbedded('http://google.com[Google^]')
    assertXpath(output, '//a[@href="http://google.com"][@target="_blank"]', 1)
  })

  test('rel=noopener should be added to a link that targets the _blank window', async () => {
    const output = await convertStringToEmbedded('http://google.com[Google^]')
    assertXpath(
      output,
      '//a[@href="http://google.com"][@target="_blank"][@rel="noopener"]',
      1
    )
  })

  test('rel=noopener should be added to a link that targets a named window when the noopener option is set', async () => {
    const output = await convertStringToEmbedded(
      'http://google.com[Google,window=name,opts=noopener]'
    )
    assertXpath(
      output,
      '//a[@href="http://google.com"][@target="name"][@rel="noopener"]',
      1
    )
  })

  test('rel=noopener should not be added to a link if it does not target a window', async () => {
    const result = await convertStringToEmbedded(
      'http://google.com[Google,opts=noopener]'
    )
    assertXpath(result, '//a[@href="http://google.com"]', 1)
    assertXpath(result, '//a[@href="http://google.com"][@rel="noopener"]', 0)
  })

  test('rel=nofollow should be added to a link when the nofollow option is set', async () => {
    const output = await convertStringToEmbedded(
      'http://google.com[Google,window=name,opts="nofollow,noopener"]'
    )
    assertXpath(
      output,
      '//a[@href="http://google.com"][@target="name"][@rel="nofollow noopener"]',
      1
    )
  })

  test('id attribute on link is processed', async () => {
    const output = await convertStringToEmbedded(
      'http://google.com[Google, id="link-1"]'
    )
    assertXpath(output, '//a[@href="http://google.com"][@id="link-1"]', 1)
  })

  test('title attribute on link is processed', async () => {
    const output = await convertStringToEmbedded(
      'http://google.com[Google, title="title-1"]'
    )
    assertXpath(output, '//a[@href="http://google.com"][@title="title-1"]', 1)
  })

  test('inline irc link', async () => {
    const output = await convertStringToEmbedded('irc://irc.freenode.net')
    assertXpath(
      output,
      '//a[@href="irc://irc.freenode.net"][text()="irc://irc.freenode.net"]',
      1
    )
  })

  test('inline irc link with text', async () => {
    const output = await convertStringToEmbedded(
      'irc://irc.freenode.net[Freenode IRC]'
    )
    assertXpath(
      output,
      '//a[@href="irc://irc.freenode.net"][text()="Freenode IRC"]',
      1
    )
  })

  // ── Inline anchor / ref ────────────────────────────────────────────────────

  test('inline ref', async () => {
    const anchors = ['[[tigers]]', 'anchor:tigers[]']
    for (const anchor of anchors) {
      const doc = await documentFromString(
        `Here you can read about tigers.${anchor}`
      )
      const output = await doc.convert()
      assert.ok(doc.catalog.refs.tigers instanceof Inline)
      assert.equal(doc.catalog.refs.tigers.text, null)
      assertXpath(output, '//a[@id="tigers"]', 1)
      assertXpath(output, '//a[@id="tigers"]/child::text()', 0)
    }
  })

  test('escaped inline ref', async () => {
    const anchors = ['[[tigers]]', 'anchor:tigers[]']
    for (const anchor of anchors) {
      const doc = await documentFromString(
        `Here you can read about tigers.\\${anchor}`
      )
      const output = await doc.convert()
      assert.ok(!doc.catalog.refs.tigers)
      assertXpath(output, '//a[@id="tigers"]', 0)
    }
  })

  test('inline ref can start with colon', async () => {
    const output = await convertStringToEmbedded('[[:idname]] text')
    assertXpath(output, '//a[@id=":idname"]', 1)
  })

  test('inline ref cannot start with digit', async () => {
    const output = await convertStringToEmbedded('[[1-install]] text')
    assert.ok(output.includes('[[1-install]]'))
    assertXpath(output, '//a[@id = "1-install"]', 0)
  })

  test('reftext of shorthand inline ref cannot resolve to empty', async () => {
    const input = '[[no-such-id,{empty}]]text'
    const doc = await documentFromString(input)
    assert.equal(Object.keys(await doc.catalog.refs).length, 0)
    const output = await doc.convert({ standalone: false })
    assert.ok(output.includes('[[no-such-id,]]'))
  })

  test('reftext of macro inline ref can resolve to empty', async () => {
    const input = 'anchor:id-only[{empty}]text\n\nsee <<id-only>>'
    const doc = await documentFromString(input)
    assert.ok(await doc.catalog.refs['id-only'])
    const output = await doc.convert({ standalone: false })
    assertXpath(output, '//a[@id="id-only"]', 1)
    assertXpath(output, '//a[@href="#id-only"]', 1)
    assertXpath(output, '//a[@href="#id-only"][text()="[id-only]"]', 1)
  })

  test('inline ref with reftext', async () => {
    const anchors = ['[[tigers,Tigers]]', 'anchor:tigers[Tigers]']
    for (const anchor of anchors) {
      const doc = await documentFromString(
        `Here you can read about tigers.${anchor}`
      )
      const output = await doc.convert()
      assert.ok(doc.catalog.refs.tigers instanceof Inline)
      assert.equal(doc.catalog.refs.tigers.text, 'Tigers')
      assertXpath(output, '//a[@id="tigers"]', 1)
      assertXpath(output, '//a[@id="tigers"]/child::text()', 0)
    }
  })

  test('should encode double quotes in reftext of anchor macro in DocBook output', async () => {
    const input = 'anchor:uncola[the "un"-cola]'
    const result = await convertInlineString(input, { backend: 'docbook' })
    assert.equal(
      result,
      '<anchor xml:id="uncola" xreflabel="the &quot;un&quot;-cola"/>'
    )
  })

  test('should substitute attribute references in reftext when registering inline ref', async () => {
    const anchors = [
      '[[tigers,{label-tigers}]]',
      'anchor:tigers[{label-tigers}]',
    ]
    for (const anchor of anchors) {
      const doc = await documentFromString(
        `Here you can read about tigers.${anchor}`,
        { attributes: { 'label-tigers': 'Tigers' } }
      )
      await doc.convert()
      assert.ok(doc.catalog.refs.tigers instanceof Inline)
      assert.equal(doc.catalog.refs.tigers.text, 'Tigers')
    }
  })

  test('inline ref with reftext converted to DocBook', async () => {
    const anchors = ['[[tigers,<Tigers>]]', 'anchor:tigers[<Tigers>]']
    for (const anchor of anchors) {
      const doc = await documentFromString(
        `Here you can read about tigers.${anchor}`,
        { backend: 'docbook' }
      )
      const output = await doc.convert({ standalone: false })
      assert.ok(doc.catalog.refs.tigers instanceof Inline)
      assert.equal(doc.catalog.refs.tigers.text, '<Tigers>')
      assert.ok(
        output.includes('<anchor xml:id="tigers" xreflabel="&lt;Tigers&gt;"/>')
      )
    }
  })

  test('does not match bibliography anchor in prose when scanning for inline anchor', async () => {
    const doc = await documentFromString(
      'Use [[[label]]] to assign a label to a bibliography entry, but not in a paragraph.'
    )
    assert.ok(!doc.catalog.refs.label)
  })

  test('repeating inline anchor macro with empty reftext', async () => {
    const input = 'anchor:one[] anchor:two[] anchor:three[]'
    const result = await convertInlineString(input)
    assert.equal(result, '<a id="one"></a> <a id="two"></a> <a id="three"></a>')
  })

  test('mixed inline anchor macro and anchor shorthand with empty reftext', async () => {
    const input = 'anchor:one[][[two]]anchor:three[][[four]]anchor:five[]'
    const result = await convertInlineString(input)
    assert.equal(
      result,
      '<a id="one"></a><a id="two"></a><a id="three"></a><a id="four"></a><a id="five"></a>'
    )
  })

  test('assigns xreflabel value for anchor macro without reftext in DocBook output', async () => {
    for (const input of ['anchor:foo[]bar', '[[foo]]bar']) {
      const result = await convertInlineString(input, { backend: 'docbook' })
      assert.equal(result, '<anchor xml:id="foo" xreflabel="[foo]"/>bar')
    }
  })

  test('should remove trailing space on reftext of inline anchor shorthand', async () => {
    const input = 'see <<foo>>\n\n[[foo,[FOO] ]]foo'
    const result = await convertStringToEmbedded(input)
    assert.ok(result.includes('see <a href="#foo">[FOO]</a>'))
  })

  test('should remove trailing space on reftext of inline anchor shorthand when converting to DocBook', async () => {
    const input = 'see <<foo>>\n\n[[foo,[FOO] ]]foo'
    const result = await convertStringToEmbedded(input, { backend: 'docbook' })
    assert.ok(result.includes(' xreflabel="[FOO]"'))
  })

  test('unescapes square bracket in reftext of anchor macro', async () => {
    const input = 'see <<foo>>\n\nanchor:foo[b[a\\]r]tex'
    const result = await convertStringToEmbedded(input)
    assert.ok(result.includes('see <a href="#foo">b[a]r</a>'))
  })

  test('unescapes square bracket in reftext of anchor macro in DocBook output', async () => {
    const input = 'anchor:foo[b[a\\]r]'
    const result = await convertInlineString(input, { backend: 'docbook' })
    assert.equal(result, '<anchor xml:id="foo" xreflabel="b[a]r"/>')
  })

  // ── xref ──────────────────────────────────────────────────────────────────

  test('xref using angled bracket syntax', async () => {
    const doc = await documentFromString('<<tigers>>')
    doc.register('refs', [
      'tigers',
      new Inline(doc, 'anchor', '[tigers]', { type: 'ref', target: 'tigers' }),
    ])
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers"][text() = "[tigers]"]',
      1
    )
  })

  test('xref using angled bracket syntax with explicit hash', async () => {
    const doc = await documentFromString('<<#tigers>>')
    doc.register('refs', [
      'tigers',
      new Inline(doc, 'anchor', 'Tigers', { type: 'ref', target: 'tigers' }),
    ])
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers"][text() = "Tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with label', async () => {
    const input = '<<tigers,About Tigers>>\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      '//a[@href="#tigers"][text() = "About Tigers"]',
      1
    )
  })

  test('xref should use title of target as link text when no explicit reftext is specified', async () => {
    const input = '<<tigers>>\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      '//a[@href="#tigers"][text() = "Tigers"]',
      1
    )
  })

  test('xref should use title of target as link text when explicit link text is empty', async () => {
    const input = '<<tigers,>>\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      '//a[@href="#tigers"][text() = "Tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with quoted label', async () => {
    const input = '<<tigers,"About Tigers">>\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      `//a[@href="#tigers"][text() = '"About Tigers"']`,
      1
    )
  })

  test('should not interpret path sans extension in xref with angled bracket syntax in compat mode', async () => {
    const doc = await documentFromString('<<tigers#>>', {
      standalone: false,
      attributes: { 'compat-mode': '' },
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers#"][text() = "[tigers#]"]',
      1
    )
    assert.equal(logger.messages.length, 0)
  })

  test('xref using angled bracket syntax with path sans extension', async () => {
    const doc = await documentFromString('<<tigers#>>', { standalone: false })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers.html"][text() = "tigers.html"]',
      1
    )
  })

  test('inter-document xref shorthand syntax should assume AsciiDoc extension if AsciiDoc extension not present', async () => {
    const cases = [
      ['using-.net-web-services#', 'Using .NET web services'],
      ['asciidoctor.1#', 'Asciidoctor Manual'],
      ['path/to/document#', 'Document Title'],
    ]
    for (const [target, text] of cases) {
      const result = await convertStringToEmbedded(`<<${target},${text}>>`)
      assertXpath(
        result,
        `//a[@href="${target.slice(0, -1)}.html"][text()="${text}"]`,
        1
      )
    }
  })

  test('xref macro with explicit inter-document target should assume implicit AsciiDoc file extension if no file extension is present', async () => {
    const cases1 = [
      ['using-.net-web-services#', 'Using .NET web services'],
      ['asciidoctor.1#', 'Asciidoctor Manual'],
    ]
    for (const [target, text] of cases1) {
      const result = await convertStringToEmbedded(`xref:${target}[${text}]`)
      assertXpath(
        result,
        `//a[@href="${target.slice(0, -1)}"][text()="${text}"]`,
        1
      )
    }
    const cases2 = [
      ['document#', 'Document Title'],
      ['path/to/document#', 'Document Title'],
      ['include.d/document#', 'Document Title'],
    ]
    for (const [target, text] of cases2) {
      const result = await convertStringToEmbedded(`xref:${target}[${text}]`)
      assertXpath(
        result,
        `//a[@href="${target.slice(0, -1)}.html"][text()="${text}"]`,
        1
      )
    }
  })

  test('xref macro with implicit inter-document target should preserve path with file extension', async () => {
    const cases1 = [
      ['refcard.pdf', 'Refcard'],
      ['asciidoctor.1', 'Asciidoctor Manual'],
    ]
    for (const [path, text] of cases1) {
      const result = await convertStringToEmbedded(`xref:${path}[${text}]`)
      assertXpath(result, `//a[@href="${path}"][text()="${text}"]`, 1)
    }
    const cases2 = [['sections.d/first', 'First Section']]
    for (const [path, text] of cases2) {
      const result = await convertStringToEmbedded(`xref:${path}[${text}]`)
      assertXpath(result, `//a[@href="#${path}"][text()="${text}"]`, 1)
    }
  })

  test('inter-document xref should only remove the file extension part if the path contains a period elsewhere', async () => {
    const result = await convertStringToEmbedded(
      '<<using-.net-web-services.adoc#,Using .NET web services>>'
    )
    assertXpath(
      result,
      '//a[@href="using-.net-web-services.html"][text() = "Using .NET web services"]',
      1
    )
  })

  test('xref macro target containing dot should be interpreted as a path unless prefixed by #', async () => {
    let result = await convertStringToEmbedded(
      'xref:using-.net-web-services[Using .NET web services]'
    )
    assertXpath(
      result,
      '//a[@href="using-.net-web-services"][text() = "Using .NET web services"]',
      1
    )
    result = await convertStringToEmbedded(
      'xref:#using-.net-web-services[Using .NET web services]'
    )
    assertXpath(
      result,
      '//a[@href="#using-.net-web-services"][text() = "Using .NET web services"]',
      1
    )
  })

  test('should not interpret double underscore in target of xref macro if sequence is preceded by a backslash', async () => {
    const result = await convertStringToEmbedded(
      'xref:doc\\__with_double__underscore.adoc[text]'
    )
    assertXpath(
      result,
      '//a[@href="doc__with_double__underscore.html"][text() = "text"]',
      1
    )
  })

  test('should not interpret double underscore in target of xref shorthand if sequence is preceded by a backslash', async () => {
    const result = await convertStringToEmbedded(
      '<<doc\\__with_double__underscore.adoc#,text>>'
    )
    assertXpath(
      result,
      '//a[@href="doc__with_double__underscore.html"][text() = "text"]',
      1
    )
  })

  test('xref using angled bracket syntax with path sans extension using docbook backend', async () => {
    const doc = await documentFromString('<<tigers#>>', {
      standalone: false,
      backend: 'docbook',
    })
    assert.ok(
      (await doc.convert()).includes(
        '<link xl:href="tigers.xml">tigers.xml</link>'
      )
    )
  })

  test('xref using angled bracket syntax with ancestor path sans extension', async () => {
    const doc = await documentFromString('<<../tigers#,tigers>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="../tigers.html"][text() = "tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with absolute path sans extension', async () => {
    const doc = await documentFromString('<</path/to/tigers#,tigers>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="/path/to/tigers.html"][text() = "tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with path and extension', async () => {
    const doc = await documentFromString('<<tigers.adoc>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers.adoc"][text() = "[tigers.adoc]"]',
      1
    )
    assert.equal(logger.messages.length, 0)
  })

  test('xref using angled bracket syntax with path and extension with hash', async () => {
    const doc = await documentFromString('<<tigers.adoc#>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers.html"][text() = "tigers.html"]',
      1
    )
  })

  test('xref using angled bracket syntax with path and extension with fragment', async () => {
    const doc = await documentFromString('<<tigers.adoc#id>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers.html#id"][text() = "tigers.html"]',
      1
    )
  })

  test('xref using macro syntax with path and extension in compat mode', async () => {
    const doc = await documentFromString('xref:tigers.adoc[]', {
      standalone: false,
      attributes: { 'compat-mode': '' },
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers.adoc"][text() = "[tigers.adoc]"]',
      1
    )
    assert.equal(logger.messages.length, 0)
  })

  test('xref using macro syntax with path and extension', async () => {
    const doc = await documentFromString('xref:tigers.adoc[]', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers.html"][text() = "tigers.html"]',
      1
    )
  })

  test('xref using angled bracket syntax with path and fragment', async () => {
    const doc = await documentFromString('<<tigers#about>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers.html#about"][text() = "tigers.html"]',
      1
    )
  })

  test('xref using angled bracket syntax with path, fragment and text', async () => {
    const doc = await documentFromString('<<tigers#about,About Tigers>>', {
      standalone: false,
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers.html#about"][text() = "About Tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with path and custom relfilesuffix and outfilesuffix', async () => {
    const doc = await documentFromString('<<tigers#about,About Tigers>>', {
      standalone: false,
      attributes: { relfileprefix: '../', outfilesuffix: '/' },
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="../tigers/#about"][text() = "About Tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with path and custom relfilesuffix', async () => {
    const doc = await documentFromString('<<tigers#about,About Tigers>>', {
      standalone: false,
      attributes: { relfilesuffix: '/' },
    })
    assertXpath(
      await doc.convert(),
      '//a[@href="tigers/#about"][text() = "About Tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with path which has been included in this document', async () => {
    logger.level = Severity.INFO
    const doc = await documentFromString('<<tigers#about,About Tigers>>', {
      standalone: false,
    })
    doc.catalog.includes.tigers = true
    const output = await doc.convert()
    assertXpath(output, '//a[@href="#about"][text() = "About Tigers"]', 1)
    assertMessage(logger, 'info', 'possible invalid reference: about')
  })

  test('xref using angled bracket syntax with nested path which has been included in this document', async () => {
    logger.level = Severity.INFO
    const doc = await documentFromString(
      '<<part1/tigers#about,About Tigers>>',
      { standalone: false }
    )
    doc.catalog.includes['part1/tigers'] = true
    const output = await doc.convert()
    assertXpath(output, '//a[@href="#about"][text() = "About Tigers"]', 1)
    assertMessage(logger, 'info', 'possible invalid reference: about')
  })

  test('xref using angled bracket syntax inline with text', async () => {
    const input =
      'Want to learn <<tigers,about tigers>>?\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      '//a[@href="#tigers"][text() = "about tigers"]',
      1
    )
  })

  test('xref using angled bracket syntax with multi-line label inline with text', async () => {
    const input =
      'Want to learn <<tigers,about\ntigers>>?\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      `//a[@href="#tigers"][normalize-space(text()) = "about tigers"]`,
      1
    )
  })

  test('xref with escaped text', async () => {
    const input =
      'See the <<tigers, `+[tigers]+`>> section for details about tigers.\n\n[#tigers]\n== Tigers'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#tigers"]/code[text()="[tigers]"]', 1)
  })

  test('xref with target that begins with attribute reference in title', async () => {
    for (const xref of [
      '<<{lessonsdir}/lesson-1#,Lesson 1>>',
      'xref:{lessonsdir}/lesson-1.adoc[Lesson 1]',
    ]) {
      const input = `:lessonsdir: lessons\n\n[#lesson-1-listing]\n== ${xref}\n\nA summary of the first lesson.`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2/a[@href="lessons/lesson-1.html"]', 1)
    }
  })

  test('xref using macro syntax', async () => {
    const doc = await documentFromString('xref:tigers[]')
    doc.register('refs', [
      'tigers',
      new Inline(doc, 'anchor', '[tigers]', { type: 'ref', target: 'tigers' }),
    ])
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers"][text() = "[tigers]"]',
      1
    )
  })

  test('multiple xref macros with implicit text in single line', async () => {
    const input =
      'This document has two sections, xref:sect-a[] and xref:sect-b[].\n\n[#sect-a]\n== Section A\n\n[#sect-b]\n== Section B'
    const result = await convertStringToEmbedded(input)
    assertXpath(result, '//a[@href="#sect-a"][text() = "Section A"]', 1)
    assertXpath(result, '//a[@href="#sect-b"][text() = "Section B"]', 1)
  })

  test('xref using macro syntax with explicit hash', async () => {
    const doc = await documentFromString('xref:#tigers[]')
    doc.register('refs', [
      'tigers',
      new Inline(doc, 'anchor', 'Tigers', { type: 'ref', target: 'tigers' }),
    ])
    assertXpath(
      await doc.convert(),
      '//a[@href="#tigers"][text() = "Tigers"]',
      1
    )
  })

  test('xref using macro syntax with label', async () => {
    const input = 'xref:tigers[About Tigers]\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      '//a[@href="#tigers"][text() = "About Tigers"]',
      1
    )
  })

  test('xref using macro syntax inline with text', async () => {
    const input =
      'Want to learn xref:tigers[about tigers]?\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      '//a[@href="#tigers"][text() = "about tigers"]',
      1
    )
  })

  test('xref using macro syntax with multi-line label inline with text', async () => {
    const input =
      'Want to learn xref:tigers[about\ntigers]?\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertString(input),
      `//a[@href="#tigers"][normalize-space(text()) = "about tigers"]`,
      1
    )
  })

  test('xref using macro syntax with text that ends with an escaped closing bracket', async () => {
    const input = 'xref:tigers[[tigers\\]]\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertStringToEmbedded(input),
      '//a[@href="#tigers"][text() = "[tigers]"]',
      1
    )
  })

  test('xref using macro syntax with text that contains an escaped closing bracket', async () => {
    const input = 'xref:tigers[[tigers\\] are cats]\n\n[#tigers]\n== Tigers'
    assertXpath(
      await convertStringToEmbedded(input),
      '//a[@href="#tigers"][text() = "[tigers] are cats"]',
      1
    )
  })

  test('unescapes square bracket in reftext used by xref', async () => {
    const input = 'anchor:foo[b[a\\]r]about\n\nsee <<foo>>'
    const result = await convertStringToEmbedded(input)
    assertXpath(result, '//a[@href="#foo"]', 1)
    assertXpath(result, '//a[@href="#foo"][text()="b[a]r"]', 1)
  })

  test('xref using invalid macro syntax does not create link', async () => {
    const doc = await documentFromString('xref:tigers')
    doc.register('refs', [
      'tigers',
      new Inline(doc, 'anchor', 'Tigers', { type: 'ref', target: 'tigers' }),
    ])
    assertXpath(await doc.convert(), '//a', 0)
  })

  test('should warn and create link if verbose flag is set and reference is not found', async () => {
    logger.level = Severity.INFO
    const input = '[#foobar]\n== Foobar\n\n== Section B\n\nSee <<foobaz>>.'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#foobaz"][text() = "[foobaz]"]', 1)
    assertMessage(logger, 'info', 'possible invalid reference: foobaz')
  })

  test('should not warn if reference is found in compat mode', async () => {
    const input = '[[foobar]]\n== Foobar\n\n== Section B\n\nSee <<foobar>>.'
    const output = await convertStringToEmbedded(input, {
      attributes: { 'compat-mode': '' },
    })
    assertXpath(output, '//a[@href="#foobar"][text() = "Foobar"]', 1)
    assert.equal(logger.messages.length, 0)
  })

  test('should warn and create link if reference using # notation is not found', async () => {
    logger.level = Severity.INFO
    const input = '[#foobar]\n== Foobar\n\n== Section B\n\nSee <<#foobaz>>.'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#foobaz"][text() = "[foobaz]"]', 1)
    assertMessage(logger, 'info', 'possible invalid reference: foobaz')
  })

  test('should warn and create link if inter-document xref points to current doc and reference not found', async () => {
    logger.level = Severity.INFO
    const input =
      '[#foobar]\n== Foobar\n\n== Section B\n\nSee <<test.adoc#foobaz>>.'
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assertXpath(output, '//a[@href="#foobaz"][text() = "[foobaz]"]', 1)
    assertMessage(logger, 'info', 'possible invalid reference: foobaz')
  })

  test('should use doctitle as fallback link text if inter-document xref points to current doc and no link text is provided', async () => {
    const input =
      '= Links & Stuff at https://example.org\n\nSee xref:test.adoc[]'
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assert.ok(
      output.includes(
        '<a href="#">Links &amp; Stuff at https://example.org</a>'
      )
    )
  })

  test('should use doctitle of root document as fallback link text for inter-document xref in AsciiDoc table cell that resolves to current doc', async () => {
    const input = '= Document Title\n\n|===\na|See xref:test.adoc[]\n|==='
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assert.ok(output.includes('<a href="#">Document Title</a>'))
  })

  test('should use reftext on document as fallback link text if inter-document xref points to current doc and no link text is provided', async () => {
    const input =
      '[reftext="Links and Stuff"]\n= Links & Stuff\n\nSee xref:test.adoc[]'
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assert.ok(output.includes('<a href="#">Links and Stuff</a>'))
  })

  test('should use reftext on document as fallback link text if xref points to empty fragment and no link text is provided', async () => {
    const input = '[reftext="Links and Stuff"]\n= Links & Stuff\n\nSee xref:#[]'
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assert.ok(output.includes('<a href="#">Links and Stuff</a>'))
  })

  test('should use fallback link text if inter-document xref points to current doc without header and no link text is provided', async () => {
    const input = 'See xref:test.adoc[]'
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assert.ok(output.includes('<a href="#">[^top]</a>'))
  })

  test('should use fallback link text if fragment of internal xref is empty and no link text is provided', async () => {
    const input = 'See xref:#[]'
    const output = await convertStringToEmbedded(input, {
      attributes: { docname: 'test' },
    })
    assert.ok(output.includes('<a href="#">[^top]</a>'))
  })

  test('should use document id as linkend for self xref in DocBook backend', async () => {
    const input = '[#docid]\n= Document Title\n\nSee xref:test.adoc[]'
    const output = await convertStringToEmbedded(input, {
      backend: 'docbook',
      attributes: { docname: 'test' },
    })
    assert.ok(output.includes('<xref linkend="docid"/>'))
  })

  test('should auto-generate document id to use as linkend for self xref in DocBook backend', async () => {
    const input = '= Document Title\n\nSee xref:test.adoc[]'
    const doc = await documentFromString(input, {
      backend: 'docbook',
      standalone: true,
      attributes: { docname: 'test' },
    })
    assert.equal(await doc.id, null)
    const output = await doc.convert()
    assert.equal(doc.id, null)
    assert.ok(output.includes(' xml:id="__article-root__"'))
    assert.ok(output.includes('<xref linkend="__article-root__"/>'))
  })

  test('xref uses title of target as label for forward and backward references in html output', async () => {
    const input =
      '== Section A\n\n<<_section_b>>\n\n== Section B\n\n<<_section_a>>'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//h2[@id="_section_a"][text()="Section A"]', 1)
    assertXpath(output, '//a[@href="#_section_a"][text()="Section A"]', 1)
    assertXpath(output, '//h2[@id="_section_b"][text()="Section B"]', 1)
    assertXpath(output, '//a[@href="#_section_b"][text()="Section B"]', 1)
  })

  test('should not fail to resolve broken xref in title of block with ID', async () => {
    const input = '[#p1]\n.<<DNE>>\nparagraph text'
    const output = await convertStringToEmbedded(input)
    assertXpath(
      output,
      '//*[@class="title"]/a[@href="#DNE"][text()="[DNE]"]',
      1
    )
  })

  test('should resolve forward xref in title of block with ID', async () => {
    const input =
      '[#p1]\n.<<conclusion>>\nparagraph text\n\n[#conclusion]\n== Conclusion'
    const output = await convertStringToEmbedded(input)
    assertXpath(
      output,
      '//*[@class="title"]/a[@href="#conclusion"][text()="Conclusion"]',
      1
    )
  })

  test('should not fail to resolve broken xref in section title', async () => {
    const input = '[#s1]\n== <<DNE>>\n\n== <<s1>>'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//h2[@id="s1"]/a[@href="#DNE"][text()="[DNE]"]', 1)
    assertXpath(output, '//h2/a[@href="#s1"][text()="[DNE]"]', 1)
  })

  test('should break circular xref reference in section title', async () => {
    const input = '[#a]\n== A <<b>>\n\n[#b]\n== B <<a>>'
    const output = await convertStringToEmbedded(input)
    assert.ok(output.includes('<h2 id="a">A <a href="#b">B [a]</a></h2>'))
    assert.ok(output.includes('<h2 id="b">B <a href="#a">[a]</a></h2>'))
  })

  test('should drop nested anchor in xreftext', async () => {
    const input =
      '[#a]\n== See <<b>>\n\n[#b]\n== Consult https://google.com[Google]'
    const output = await convertStringToEmbedded(input)
    assert.ok(
      output.includes('<h2 id="a">See <a href="#b">Consult Google</a></h2>')
    )
  })

  test('should not resolve forward xref evaluated during parsing', async () => {
    const input = '[#s1]\n== <<forward>>\n\n== <<s1>>\n\n[#forward]\n== Forward'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#forward"][text()="Forward"]', 0)
  })

  test('should not resolve forward natural xref evaluated during parsing', async () => {
    const input =
      ':idprefix:\n\n[#s1]\n== <<Forward>>\n\n== <<s1>>\n\n== Forward'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#forward"][text()="Forward"]', 0)
  })

  test('should resolve first matching natural xref', async () => {
    const input =
      'see <<Section Title>>\n\n[#s1]\n== Section Title\n\n[#s2]\n== Section Title'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#s1"]', 1)
    assertXpath(output, '//a[@href="#s1"][text()="Section Title"]', 1)
  })

  test('should not match numeric character references while searching for fragment in xref target', async () => {
    const input = 'see <<Cub => Tiger>>\n\n== Cub => Tiger'
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//a[@href="#_cub_tiger"]', 1)
    assertXpath(
      output,
      `//a[@href="#_cub_tiger"][text()="Cub ${decodeChar(8658)} Tiger"]`,
      1
    )
  })

  test('should not match numeric character references in path of interdocument xref', async () => {
    const input = 'see xref:{cpp}[{cpp}].'
    const output = await convertStringToEmbedded(input)
    assert.ok(output.includes('<a href="#C&#43;&#43;">C&#43;&#43;</a>'))
  })

  // ── Anchor catalog ─────────────────────────────────────────────────────────

  test('anchor creates reference', async () => {
    const doc = await documentFromString('[[tigers]]Tigers roam here.')
    const ref = doc.catalog.refs.tigers
    assert.ok(ref != null)
    assert.equal(ref.text, null)
  })

  test('anchor with label creates reference', async () => {
    const doc = await documentFromString('[[tigers,Tigers]]Tigers roam here.')
    const ref = doc.catalog.refs.tigers
    assert.ok(ref != null)
    assert.equal(ref.text, 'Tigers')
  })

  test('anchor with quoted label creates reference with quoted label text', async () => {
    const doc = await documentFromString(
      '[[tigers,"Tigers roam here"]]Tigers roam here.'
    )
    const ref = doc.catalog.refs.tigers
    assert.ok(ref != null)
    assert.equal(ref.text, '"Tigers roam here"')
  })

  test('anchor with label containing a comma creates reference', async () => {
    const doc = await documentFromString(
      '[[tigers,Tigers, scary tigers, roam here]]Tigers roam here.'
    )
    const ref = doc.catalog.refs.tigers
    assert.ok(ref != null)
    assert.equal(ref.text, 'Tigers, scary tigers, roam here')
  })
})
