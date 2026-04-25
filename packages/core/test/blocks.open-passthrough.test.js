import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath } from './helpers.js'
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

  describe('Open Blocks', () => {
    test('can convert open block', async () => {
      const input = `--
This is an open block.

It can span multiple lines.
--`

      const output = await convertString(input)
      assertXpath(output, '//*[@class="openblock"]//p', 2)
    })

    test('open block can contain another block', async () => {
      const input = `--
This is an open block.

It can span multiple lines.

____
It can hold great quotes like this one.
____
--`

      const output = await convertString(input)
      assertXpath(output, '//*[@class="openblock"]//p', 3)
      assertXpath(output, '//*[@class="openblock"]//*[@class="quoteblock"]', 1)
    })

    test('can nest open blocks using ~ variant', async () => {
      const input = `[.tabs]
~~~~
[.tab]
~~~~~~
tab one
~~~~~~

[.tab]
~~~~~~
tab two
~~~~~~
~~~~`

      const output = await convertString(input)
      assertCss(output, '.openblock', 3)
      assertCss(output, '.openblock .openblock', 2)
    })

    test('open block ~ variant cannot masquerade as another block context', async () => {
      const input = `[sidebar]
~~~~
This is just an open block.
~~~~`

      const output = await convertString(input)
      assertCss(output, '.openblock', 1)
      assertCss(output, '.sidebarblock', 0)
    })

    test('transfer id and reftext on open block to DocBook output', async () => {
      const input = `Check out that <<open>>!

[[open,Open Block]]
--
This is an open block.

TIP: An open block can have other blocks inside of it.
--

Back to our regularly scheduled programming.`

      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'article > para[id="open"]', 1)
      assertCss(output, 'article > para[xreflabel="Open Block"]', 1)
      assertCss(output, 'article > simpara', 2)
      assertCss(output, 'article > para', 1)
      assertCss(output, 'article > para > simpara', 1)
      assertCss(output, 'article > para > tip', 1)
    })

    test('transfer id and reftext on open paragraph to DocBook output', async () => {
      const input = `[open#openpara,reftext="Open Paragraph"]
This is an open paragraph.`

      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'article > simpara', 1)
      assertCss(output, 'article > simpara[id="openpara"]', 1)
      assertCss(output, 'article > simpara[xreflabel="Open Paragraph"]', 1)
    })

    test('transfer title on open block to DocBook output', async () => {
      const input = `.Behold the open
--
This is an open block with a title.
--`

      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'article > formalpara', 1)
      assertCss(output, 'article > formalpara > *', 2)
      assertCss(output, 'article > formalpara > title', 1)
      assertXpath(output, '/article/formalpara/title[text()="Behold the open"]', 1)
      assertCss(output, 'article > formalpara > para', 1)
      assertCss(output, 'article > formalpara > para > simpara', 1)
    })

    test('transfer title on open paragraph to DocBook output', async () => {
      const input = `.Behold the open
This is an open paragraph with a title.`

      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'article > formalpara', 1)
      assertCss(output, 'article > formalpara > *', 2)
      assertCss(output, 'article > formalpara > title', 1)
      assertXpath(output, '/article/formalpara/title[text()="Behold the open"]', 1)
      assertCss(output, 'article > formalpara > para', 1)
      assertXpath(output, '/article/formalpara/para[text()="This is an open paragraph with a title."]', 1)
    })

    test('transfer role on open block to DocBook output', async () => {
      const input = `[.container]
--
This is an open block.
It holds stuff.
--`

      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'article > para[role=container]', 1)
      assertCss(output, 'article > para[role=container] > simpara', 1)
    })

    test('transfer role on open paragraph to DocBook output', async () => {
      const input = `[.container]
This is an open block.
It holds stuff.`

      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'article > simpara[role=container]', 1)
    })
  })

  describe('Passthrough Blocks', () => {
    test('can parse a passthrough block', async () => {
      const input = `++++
This is a passthrough block.
++++`

      const block = await blockFromString(input)
      assert.notEqual(block, null)
      assert.equal(block.lines.length, 1)
      assert.equal(block.source, 'This is a passthrough block.')
    })

    test('does not perform subs on a passthrough block by default', async () => {
      const input = `:type: passthrough

++++
This is a '{type}' block.
http://asciidoc.org
image:tiger.png[]
++++`

      const expected = `This is a '{type}' block.\nhttp://asciidoc.org\nimage:tiger.png[]`
      const output = await convertStringToEmbedded(input)
      assert.equal(output.trim(), expected)
    })

    test('does not perform subs on a passthrough block with pass style by default', async () => {
      const input = `:type: passthrough

[pass]
++++
This is a '{type}' block.
http://asciidoc.org
image:tiger.png[]
++++`

      const expected = `This is a '{type}' block.\nhttp://asciidoc.org\nimage:tiger.png[]`
      const output = await convertStringToEmbedded(input)
      assert.equal(output.trim(), expected)
    })

    test('passthrough block honors explicit subs list', async () => {
      const input = `:type: passthrough

[subs="attributes,quotes,macros"]
++++
This is a _{type}_ block.
http://asciidoc.org
++++`

      const expected = `This is a <em>passthrough</em> block.\n<a href="http://asciidoc.org" class="bare">http://asciidoc.org</a>`
      const output = await convertStringToEmbedded(input)
      assert.equal(output.trim(), expected)
    })

    test('strip leading and trailing blank lines when converting raw block', async () => {
      const input = `++++
line above
++++

++++


  first line

last line


++++

++++
line below
++++`

      const doc = await documentFromString(input, { standalone: false })
      const block = doc.blocks[1]
      assert.deepEqual(block.lines, ['', '', '  first line', '', 'last line', '', ''])
      const result = await doc.convert()
      assert.equal(result, 'line above\n  first line\n\nlast line\nline below')
    })
  })
})
