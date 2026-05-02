import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage } from './helpers.js'
import {
  documentFromString,
  convertString,
  convertStringToEmbedded,
} from './harness.js'

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

  describe('Example Blocks', () => {
    test('can convert example block', async () => {
      const input = `\
====
This is an example of an example block.

How crazy is that?
====
`

      const output = await convertString(input)
      assertXpath(output, '//*[@class="exampleblock"]//p', 2)
    })

    test('assigns sequential numbered caption to example block with title', async () => {
      const input = `\
.Writing Docs with AsciiDoc
====
Here's how you write AsciiDoc.

You just write.
====

.Writing Docs with DocBook
====
Here's how you write DocBook.

You futz with XML.
====
`

      const doc = await documentFromString(input)
      assert.equal(doc.blocks[0].numeral, 1)
      assert.equal(doc.blocks[0].number, 1)
      assert.equal(doc.blocks[1].numeral, 2)
      assert.equal(await doc.blocks[1].number, 2)
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[1]/*[@class="title"][text()="Example 1. Writing Docs with AsciiDoc"]',
        1
      )
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[2]/*[@class="title"][text()="Example 2. Writing Docs with DocBook"]',
        1
      )
      assert.equal(doc.attributes['example-number'], 2)
    })

    test('assigns sequential character caption to example block with title', async () => {
      const input = `\
:example-number: @

.Writing Docs with AsciiDoc
====
Here's how you write AsciiDoc.

You just write.
====

.Writing Docs with DocBook
====
Here's how you write DocBook.

You futz with XML.
====
`

      const doc = await documentFromString(input)
      assert.equal(doc.blocks[0].numeral, 'A')
      assert.equal(doc.blocks[0].number, 'A')
      assert.equal(doc.blocks[1].numeral, 'B')
      assert.equal(await doc.blocks[1].number, 'B')
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[1]/*[@class="title"][text()="Example A. Writing Docs with AsciiDoc"]',
        1
      )
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[2]/*[@class="title"][text()="Example B. Writing Docs with DocBook"]',
        1
      )
      assert.equal(doc.attributes['example-number'], 'B')
    })

    test('should increment counter for example even when example-number is locked by the API', async () => {
      const input = `\
.Writing Docs with AsciiDoc
====
Here's how you write AsciiDoc.

You just write.
====

.Writing Docs with DocBook
====
Here's how you write DocBook.

You futz with XML.
====
`

      const doc = await documentFromString(input, {
        attributes: { 'example-number': '`' },
      })
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[1]/*[@class="title"][text()="Example a. Writing Docs with AsciiDoc"]',
        1
      )
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[2]/*[@class="title"][text()="Example b. Writing Docs with DocBook"]',
        1
      )
      assert.equal(doc.attributes['example-number'], 'b')
    })

    test('should use explicit caption if specified', async () => {
      const input = `\
[caption="Look! "]
.Writing Docs with AsciiDoc
====
Here's how you write AsciiDoc.

You just write.
====
`

      const doc = await documentFromString(input)
      assert.equal(await doc.blocks[0].numeral, null)
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[1]/*[@class="title"][text()="Look! Writing Docs with AsciiDoc"]',
        1
      )
      assert.ok(!('example-number' in doc.attributes))
    })

    test('automatic caption can be turned off and on and modified', async () => {
      const input = `\
.first example
====
an example
====

:caption:

.second example
====
another example
====

:caption!:
:example-caption: Exhibit

.third example
====
yet another example
====
`

      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="exampleblock"]', 3)
      assertXpath(
        output,
        '(/*[@class="exampleblock"])[1]/*[@class="title"][starts-with(text(), "Example ")]',
        1
      )
      assertXpath(
        output,
        '(/*[@class="exampleblock"])[2]/*[@class="title"][text()="second example"]',
        1
      )
      assertXpath(
        output,
        '(/*[@class="exampleblock"])[3]/*[@class="title"][starts-with(text(), "Exhibit ")]',
        1
      )
    })

    test('should use explicit caption if specified even if block-specific global caption is disabled', async () => {
      const input = `\
:!example-caption:

[caption="Look! "]
.Writing Docs with AsciiDoc
====
Here's how you write AsciiDoc.

You just write.
====
`

      const doc = await documentFromString(input)
      assert.equal(await doc.blocks[0].numeral, null)
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[1]/*[@class="title"][text()="Look! Writing Docs with AsciiDoc"]',
        1
      )
      assert.ok(!('example-number' in doc.attributes))
    })

    test('should use global caption if specified even if block-specific global caption is disabled', async () => {
      const input = `\
:!example-caption:
:caption: Look!{sp}

.Writing Docs with AsciiDoc
====
Here's how you write AsciiDoc.

You just write.
====
`

      const doc = await documentFromString(input)
      assert.equal(await doc.blocks[0].numeral, null)
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="exampleblock"])[1]/*[@class="title"][text()="Look! Writing Docs with AsciiDoc"]',
        1
      )
      assert.ok(!('example-number' in doc.attributes))
    })

    test('should not process caption attribute on block that does not support a caption', async () => {
      const input = `\
[caption="Look! "]
.No caption here
--
content
--
`

      const doc = await documentFromString(input)
      assert.equal(doc.blocks[0].caption, null)
      assert.equal(doc.blocks[0].getAttribute('caption'), 'Look! ')
      const output = await doc.convert()
      assertXpath(
        output,
        '(//*[@class="openblock"])[1]/*[@class="title"][text()="No caption here"]',
        1
      )
    })

    test('should create details/summary set if collapsible option is set', async () => {
      const input = `\
.Toggle Me
[%collapsible]
====
This content is revealed when the user clicks the words "Toggle Me".
====
`

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'details', 1)
      assertCss(output, 'details[open]', 0)
      assertCss(output, 'details > summary.title', 1)
      assertXpath(output, '//details/summary[text()="Toggle Me"]', 1)
      assertCss(output, 'details > summary.title + .content', 1)
      assertCss(output, 'details > summary.title + .content p', 1)
    })

    test('should open details/summary set if collapsible and open options are set', async () => {
      const input = `\
.Toggle Me
[%collapsible%open]
====
This content is revealed when the user clicks the words "Toggle Me".
====
`

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'details', 1)
      assertCss(output, 'details[open]', 1)
      assertCss(output, 'details > summary.title', 1)
      assertXpath(output, '//details/summary[text()="Toggle Me"]', 1)
    })

    test('should add default summary element if collapsible option is set and title is not specifed', async () => {
      const input = `\
[%collapsible]
====
This content is revealed when the user clicks the words "Details".
====
`

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'details', 1)
      assertCss(output, 'details > summary.title', 1)
      assertXpath(output, '//details/summary[text()="Details"]', 1)
    })

    test('should not allow collapsible block to increment example number', async () => {
      const input = `\
.Before
====
before
====

.Show Me The Goods
[%collapsible]
====
This content is revealed when the user clicks the words "Show Me The Goods".
====

.After
====
after
====
`

      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="title"][text()="Example 1. Before"]', 1)
      assertXpath(output, '//*[@class="title"][text()="Example 2. After"]', 1)
      assertCss(output, 'details', 1)
      assertCss(output, 'details > summary.title', 1)
      assertXpath(output, '//details/summary[text()="Show Me The Goods"]', 1)
    })

    test('should warn if example block is not terminated', async () => {
      const input = `\
outside

====
inside

still inside

eof
`

      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="exampleblock"]', 1)
      assertMessage(
        logger,
        'warn',
        '<stdin>: line 3: unterminated example block'
      )
    })
  })

  describe('Admonition Blocks', () => {
    test('caption block-level attribute should be used as caption', async () => {
      const input = `\
:tip-caption: Pro Tip

[caption="Pro Tip"]
TIP: Override the caption of an admonition block using an attribute entry
`

      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/*[@class="admonitionblock tip"]//*[@class="icon"]/*[@class="title"][text()="Pro Tip"]',
        1
      )
    })

    test('can override caption of admonition block using document attribute', async () => {
      const input = `\
:tip-caption: Pro Tip

TIP: Override the caption of an admonition block using an attribute entry
`

      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/*[@class="admonitionblock tip"]//*[@class="icon"]/*[@class="title"][text()="Pro Tip"]',
        1
      )
    })

    test('blank caption document attribute should not blank admonition block caption', async () => {
      const input = `\
:caption:

TIP: Override the caption of an admonition block using an attribute entry
`

      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/*[@class="admonitionblock tip"]//*[@class="icon"]/*[@class="title"][text()="Tip"]',
        1
      )
    })

    test('should generate appropriate tag based on admonition type in DocBook output', async () => {
      const input = `\
NOTE: Remember the oat milk.

IMPORTANT: Don't forget the children!

[caption=Pro Tip]
TIP: Look for the warp under the bridge.

CAUTION: Slippery when wet.

WARNING: The software you're about to use has *not* been tested.
`

      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      for (const type of ['note', 'important', 'tip', 'caution', 'warning']) {
        assertCss(output, type, 1)
        assertCss(output, `${type} > simpara`, 1)
      }
      assertXpath(
        output,
        '/tip/simpara[text()="Look for the warp under the bridge."]',
        1
      )
      assert.ok(!output.includes('Pro Tip'))
    })
  })
})
