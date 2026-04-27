import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { Compliance } from '../src/compliance.js'
import { assertCss, assertXpath, assertMessage, decodeChar } from './helpers.js'
import { documentFromString, convertString, convertStringToEmbedded, blockFromString } from './harness.js'

describe('Blocks', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Layout Breaks', () => {
    test('horizontal rule', async () => {
      for (const line of ["'''", "''''", "'''''"]) {
        const output = await convertStringToEmbedded(line)
        assert.ok(output.includes('<hr>'))
      }
    })

    test('horizontal rule with markdown syntax disabled', async () => {
      const oldMarkdownSyntax = Compliance.markdownSyntax
      try {
        Compliance.markdownSyntax = false
        for (const line of ["'''", "''''", "'''''"]) {
          const output = await convertStringToEmbedded(line)
          assert.ok(output.includes('<hr>'))
        }
        for (const line of ['---', '***', '___']) {
          const output = await convertStringToEmbedded(line)
          assert.ok(!output.includes('<hr>'))
        }
      } finally {
        Compliance.markdownSyntax = oldMarkdownSyntax
      }
    })

    test('< 3 chars does not make horizontal rule', async () => {
      for (const line of ["'", "''"]) {
        const output = await convertStringToEmbedded(line)
        assert.ok(!output.includes('<hr>'))
        assert.ok(output.includes(`<p>${line}</p>`))
      }
    })

    test('mixed chars does not make horizontal rule', async () => {
      for (const line of ["''<", "'''<", "' ' '"]) {
        const output = await convertStringToEmbedded(line)
        assert.ok(!output.includes('<hr>'))
        assert.ok(output.includes(`<p>${line.replace('<', '&lt;')}</p>`))
      }
    })

    test('horizontal rule between blocks', async () => {
      const output = await convertStringToEmbedded(`Block above\n\n'''\n\nBlock below`)
      assertXpath(output, '/hr', 1)
      assertXpath(output, '/hr/preceding-sibling::*', 1)
      assertXpath(output, '/hr/following-sibling::*', 1)
    })

    test('horizontal rule with role', async () => {
      const input = `\
[.fancy]
'''
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'hr', 1)
      assertCss(output, 'hr.fancy', 1)
    })

    test('page break', async () => {
      const output = await convertStringToEmbedded(`page 1\n\n<<<\n\npage 2`)
      assertXpath(output, '/*[@class="page-break"]', 1)
      assertXpath(output, '/*[@class="page-break"]/preceding-sibling::div/p[text()="page 1"]', 1)
      assertXpath(output, '/*[@class="page-break"]/following-sibling::div/p[text()="page 2"]', 1)
    })
  })

  describe('Comments', () => {
    test('line comment between paragraphs offset by blank lines', async () => {
      const input = `\
first paragraph

// line comment

second paragraph
`
      const output = await convertStringToEmbedded(input)
      assert.doesNotMatch(output, /line comment/)
      assertXpath(output, '//p', 2)
    })

    test('adjacent line comment between paragraphs', async () => {
      const input = `\
first line
// line comment
second line
`
      const output = await convertStringToEmbedded(input)
      assert.doesNotMatch(output, /line comment/)
      assertXpath(output, '//p', 1)
      assertXpath(output, `//p[1][text()='first line\nsecond line']`, 1)
    })

    test('comment block between paragraphs offset by blank lines', async () => {
      const input = `\
first paragraph

////
block comment
////

second paragraph
`
      const output = await convertStringToEmbedded(input)
      assert.doesNotMatch(output, /block comment/)
      assertXpath(output, '//p', 2)
    })

    test('comment block between paragraphs offset by blank lines inside delimited block', async () => {
      const input = `\
====
first paragraph

////
block comment
////

second paragraph
====
`
      const output = await convertStringToEmbedded(input)
      assert.doesNotMatch(output, /block comment/)
      assertXpath(output, '//p', 2)
    })

    test('adjacent comment block between paragraphs', async () => {
      const input = `\
first paragraph
////
block comment
////
second paragraph
`
      const output = await convertStringToEmbedded(input)
      assert.doesNotMatch(output, /block comment/)
      assertXpath(output, '//p', 2)
    })

    test('can convert with block comment at end of document with trailing newlines', async () => {
      const input = `\
paragraph

////
block comment
////

`
      const output = await convertStringToEmbedded(input)
      assert.doesNotMatch(output, /block comment/)
    })

    test('trailing newlines after block comment at end of document does not create paragraph', async () => {
      const input = `\
paragraph

////
block comment
////

`
      const doc = await documentFromString(input)
      assert.equal(doc.blocks.length, 1)
      assertXpath(await doc.convert(), '//p', 1)
    })

    test('line starting with three slashes should not be line comment', async () => {
      const input = '/// not a line comment'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.trim().length > 0, `Line should be emitted => ${input.trimEnd()}`)
    })

    test('preprocessor directives should not be processed within comment block within block metadata', async () => {
      const input = `\
.sample title
////
ifdef::asciidoctor[////]
////
line should be shown
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//p[text()="line should be shown"]', 1)
    })

    test('preprocessor directives should not be processed within comment block', async () => {
      const input = `\
dummy line

////
ifdef::asciidoctor[////]
////

line should be shown
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//p[text()="line should be shown"]', 1)
    })

    test('should warn if unterminated comment block is detected in body', async () => {
      const input = `\
before comment block

////
content that has been disabled

supposed to be after comment block, except it got swallowed by block comment
`
      await convertStringToEmbedded(input)
      assertMessage(logger, 'warn', '<stdin>: line 3: unterminated comment block')
    })

    test('should warn if unterminated comment block is detected inside another block', async () => {
      const input = `\
before sidebar block

****
////
content that has been disabled
****

supposed to be after sidebar block, except it got swallowed by block comment
`
      await convertStringToEmbedded(input)
      assertMessage(logger, 'warn', '<stdin>: line 4: unterminated comment block')
    })

    // WARNING if first line of content is a directive, it will get interpreted before we know it's a comment block
    // it happens because we always look a line ahead...not sure what we can do about it
    test('preprocessor directives should not be processed within comment open block', async () => {
      const input = `\
[comment]
--
first line of comment
ifdef::asciidoctor[--]
line should not be shown
--

`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//p', 0)
    })

    // WARNING this assertion fails if the directive is the first line of the paragraph instead of the second
    // it happens because we always look a line ahead; not sure what we can do about it
    test('preprocessor directives should not be processed on subsequent lines of a comment paragraph', async () => {
      const input = `\
[comment]
first line of content
ifdef::asciidoctor[////]

this line should be shown
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//p[text()="this line should be shown"]', 1)
    })

    test('comment style on open block should only skip block', async () => {
      const input = `\
[comment]
--
skip

this block
--

not this text
`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '//p', 1)
      assertXpath(result, '//p[text()="not this text"]', 1)
    })

    test('comment style on paragraph should only skip paragraph', async () => {
      const input = `\
[comment]
skip
this paragraph

not this text
`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '//p', 1)
      assertXpath(result, '//p[text()="not this text"]', 1)
    })

    test('comment style on paragraph should not cause adjacent block to be skipped', async () => {
      const input = `\
[comment]
skip
this paragraph
[example]
not this text
`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '/*[@class="exampleblock"]', 1)
      assertXpath(result, '/*[@class="exampleblock"]//*[normalize-space(text())="not this text"]', 1)
    })

    // NOTE this test verifies the nil return value of Parser#next_block
    test('should not drop content that follows skipped content inside a delimited block', async () => {
      const input = `\
====
paragraph

[comment#idname]
skip

paragraph
====
`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '/*[@class="exampleblock"]', 1)
      assertXpath(result, '/*[@class="exampleblock"]//*[@class="paragraph"]', 2)
      assertXpath(result, '//*[@class="paragraph"][@id="idname"]', 0)
    })
  })

  describe('Sidebar Blocks', () => {
    test('should parse sidebar block', async () => {
      const input = `\
== Section

.Sidebar
****
Content goes here
****
`
      const result = await convertString(input)
      assertXpath(result, '//*[@class="sidebarblock"]//p', 1)
    })
  })
})