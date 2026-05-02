import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage } from './helpers.js'
import {
  convertString,
  convertStringToEmbedded,
  blockFromString,
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

  describe('Quote and Verse Blocks', () => {
    test('quote block with no attribution', async () => {
      const input = `\
____
A famous quote.
____
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 1)
      assertCss(output, '.quoteblock > .attribution', 0)
      assertXpath(
        output,
        '//*[@class="quoteblock"]//p[text()="A famous quote."]',
        1
      )
    })

    test('quote block with attribution', async () => {
      const input = `\
[quote, Famous Person, Famous Book (1999)]
____
A famous quote.
____
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 1)
      assertCss(output, '.quoteblock > .attribution', 1)
      assertCss(output, '.quoteblock > .attribution > cite', 1)
      assertCss(output, '.quoteblock > .attribution > br + cite', 1)
      assertXpath(
        output,
        '//*[@class="quoteblock"]/*[@class="attribution"]/cite[text()="Famous Book (1999)"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//*[@class="quoteblock"]/*[@class="attribution"]', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, `${decodeChar(8212)} Famous Person`)
    })

    test('quote block with attribute and id and role shorthand', async () => {
      const input = `\
[quote#justice-to-all.solidarity, Martin Luther King, Jr.]
____
Injustice anywhere is a threat to justice everywhere.
____
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '#justice-to-all.quoteblock.solidarity', 1)
      assertCss(output, '.quoteblock > .attribution', 1)
    })

    test('setting ID using style shorthand should not reset block style', async () => {
      const input = `\
[quote]
[#justice-to-all.solidarity, Martin Luther King, Jr.]
____
Injustice anywhere is a threat to justice everywhere.
____
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '#justice-to-all.quoteblock.solidarity', 1)
      assertCss(output, '.quoteblock > .attribution', 1)
    })

    test('quote block with complex content', async () => {
      const input = `\
____
A famous quote.

NOTE: _That_ was inspiring.
____
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph', 1)
      assertCss(
        output,
        '.quoteblock > blockquote > .paragraph + .admonitionblock',
        1
      )
    })

    test('quote block with attribution converted to DocBook', async () => {
      const input = `\
[quote, Famous Person, Famous Book (1999)]
____
A famous quote.
____
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'blockquote', 1)
      assertCss(output, 'blockquote > simpara', 1)
      assertCss(output, 'blockquote > attribution', 1)
      assertCss(output, 'blockquote > attribution > citetitle', 1)
      assertXpath(
        output,
        '//blockquote/attribution/citetitle[text()="Famous Book (1999)"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//blockquote/attribution', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, 'Famous Person')
    })

    test('epigraph quote block with attribution converted to DocBook', async () => {
      const input = `\
[.epigraph, Famous Person, Famous Book (1999)]
____
A famous quote.
____
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'epigraph', 1)
      assertCss(output, 'epigraph > simpara', 1)
      assertCss(output, 'epigraph > attribution', 1)
      assertCss(output, 'epigraph > attribution > citetitle', 1)
      assertXpath(
        output,
        '//epigraph/attribution/citetitle[text()="Famous Book (1999)"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//epigraph/attribution', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, 'Famous Person')
    })

    test('markdown-style quote block with single paragraph and no attribution', async () => {
      const input = `\
> A famous quote.
> Some more inspiring words.
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 1)
      assertCss(output, '.quoteblock > .attribution', 0)
      assertXpath(
        output,
        `//*[@class="quoteblock"]//p[text()="A famous quote.\nSome more inspiring words."]`,
        1
      )
    })

    test('lazy markdown-style quote block with single paragraph and no attribution', async () => {
      const input = `\
> A famous quote.
Some more inspiring words.
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 1)
      assertCss(output, '.quoteblock > .attribution', 0)
      assertXpath(
        output,
        `//*[@class="quoteblock"]//p[text()="A famous quote.\nSome more inspiring words."]`,
        1
      )
    })

    test('markdown-style quote block with multiple paragraphs and no attribution', async () => {
      const input = `\
> A famous quote.
>
> Some more inspiring words.
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 2)
      assertCss(output, '.quoteblock > .attribution', 0)
      assertXpath(
        output,
        `(//*[@class="quoteblock"]//p)[1][text()="A famous quote."]`,
        1
      )
      assertXpath(
        output,
        `(//*[@class="quoteblock"]//p)[2][text()="Some more inspiring words."]`,
        1
      )
    })

    test('markdown-style quote block with multiple blocks and no attribution', async () => {
      const input = `\
> A famous quote.
>
> NOTE: Some more inspiring words.
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 1)
      assertCss(output, '.quoteblock > blockquote > .admonitionblock', 1)
      assertCss(output, '.quoteblock > .attribution', 0)
      assertXpath(
        output,
        `(//*[@class="quoteblock"]//p)[1][text()="A famous quote."]`,
        1
      )
      assertXpath(
        output,
        `(//*[@class="quoteblock"]//*[@class="admonitionblock note"]//*[@class="content"])[1][normalize-space(text())="Some more inspiring words."]`,
        1
      )
    })

    test('markdown-style quote block with single paragraph and attribution', async () => {
      const input = `\
> A famous quote.
> Some more inspiring words.
> -- Famous Person, Famous Source, Volume 1 (1999)
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph > p', 1)
      assertXpath(
        output,
        `//*[@class="quoteblock"]//p[text()="A famous quote.\nSome more inspiring words."]`,
        1
      )
      assertCss(output, '.quoteblock > .attribution', 1)
      assertCss(output, '.quoteblock > .attribution > cite', 1)
      assertCss(output, '.quoteblock > .attribution > br + cite', 1)
      assertXpath(
        output,
        '//*[@class="quoteblock"]/*[@class="attribution"]/cite[text()="Famous Source, Volume 1 (1999)"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//*[@class="quoteblock"]/*[@class="attribution"]', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, `${decodeChar(8212)} Famous Person`)
    })

    test('markdown-style quote block with only attribution', async () => {
      const input = '> -- Anonymous'
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > *', 0)
      assertCss(output, '.quoteblock > .attribution', 1)
      assertXpath(
        output,
        `//*[@class="quoteblock"]//*[@class="attribution"][contains(text(),"Anonymous")]`,
        1
      )
    })

    test('should parse credit line in markdown-style quote block like positional block attributes', async () => {
      const input = `\
> I hold it that a little rebellion now and then is a good thing,
> and as necessary in the political world as storms in the physical.
-- Thomas Jefferson, https://jeffersonpapers.princeton.edu/selected-documents/james-madison-1[The Papers of Thomas Jefferson, Volume 11]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(
        output,
        '.quoteblock cite a[href="https://jeffersonpapers.princeton.edu/selected-documents/james-madison-1"]',
        1
      )
    })

    test('quoted paragraph-style quote block with attribution', async () => {
      const input = `\
"A famous quote.
Some more inspiring words."
-- Famous Person, Famous Source, Volume 1 (1999)
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertXpath(
        output,
        `//*[@class="quoteblock"]/blockquote[normalize-space(text())="A famous quote. Some more inspiring words."]`,
        1
      )
      assertCss(output, '.quoteblock > .attribution', 1)
      assertCss(output, '.quoteblock > .attribution > cite', 1)
      assertCss(output, '.quoteblock > .attribution > br + cite', 1)
      assertXpath(
        output,
        '//*[@class="quoteblock"]/*[@class="attribution"]/cite[text()="Famous Source, Volume 1 (1999)"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//*[@class="quoteblock"]/*[@class="attribution"]', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, `${decodeChar(8212)} Famous Person`)
    })

    test('should parse credit line in quoted paragraph-style quote block like positional block attributes', async () => {
      const input = `\
"I hold it that a little rebellion now and then is a good thing,
and as necessary in the political world as storms in the physical."
-- Thomas Jefferson, https://jeffersonpapers.princeton.edu/selected-documents/james-madison-1[The Papers of Thomas Jefferson, Volume 11]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(
        output,
        '.quoteblock cite a[href="https://jeffersonpapers.princeton.edu/selected-documents/james-madison-1"]',
        1
      )
    })

    test('single-line verse block without attribution', async () => {
      const input = `\
[verse]
____
A famous verse.
____
`
      const output = await convertString(input)
      assertCss(output, '.verseblock', 1)
      assertCss(output, '.verseblock > pre', 1)
      assertCss(output, '.verseblock > .attribution', 0)
      assertCss(output, '.verseblock p', 0)
      assertXpath(
        output,
        '//*[@class="verseblock"]/pre[normalize-space(text())="A famous verse."]',
        1
      )
    })

    test('single-line verse block with attribution', async () => {
      const input = `\
[verse, Famous Poet, Famous Poem]
____
A famous verse.
____
`
      const output = await convertString(input)
      assertCss(output, '.verseblock', 1)
      assertCss(output, '.verseblock p', 0)
      assertCss(output, '.verseblock > pre', 1)
      assertCss(output, '.verseblock > .attribution', 1)
      assertCss(output, '.verseblock > .attribution > cite', 1)
      assertCss(output, '.verseblock > .attribution > br + cite', 1)
      assertXpath(
        output,
        '//*[@class="verseblock"]/*[@class="attribution"]/cite[text()="Famous Poem"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//*[@class="verseblock"]/*[@class="attribution"]', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, `${decodeChar(8212)} Famous Poet`)
    })

    test('single-line verse block with attribution converted to DocBook', async () => {
      const input = `\
[verse, Famous Poet, Famous Poem]
____
A famous verse.
____
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'blockquote', 1)
      assertCss(output, 'blockquote simpara', 0)
      assertCss(output, 'blockquote > literallayout', 1)
      assertCss(output, 'blockquote > attribution', 1)
      assertCss(output, 'blockquote > attribution > citetitle', 1)
      assertXpath(
        output,
        '//blockquote/attribution/citetitle[text()="Famous Poem"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//blockquote/attribution', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, 'Famous Poet')
    })

    test('single-line epigraph verse block with attribution converted to DocBook', async () => {
      const input = `\
[verse.epigraph, Famous Poet, Famous Poem]
____
A famous verse.
____
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'epigraph', 1)
      assertCss(output, 'epigraph simpara', 0)
      assertCss(output, 'epigraph > literallayout', 1)
      assertCss(output, 'epigraph > attribution', 1)
      assertCss(output, 'epigraph > attribution > citetitle', 1)
      assertXpath(
        output,
        '//epigraph/attribution/citetitle[text()="Famous Poem"]',
        1
      )
      // TODO: needs DOM parser
      // const attribution = xmlnodes_at_xpath('//epigraph/attribution', output, 1)
      // const author = attribution.children.first
      // assert.equal(author.text.strip, 'Famous Poet')
    })

    test('multi-stanza verse block', async () => {
      const input = `\
[verse]
____
A famous verse.

Stanza two.
____
`
      const output = await convertString(input)
      assertXpath(output, '//*[@class="verseblock"]', 1)
      assertXpath(output, '//*[@class="verseblock"]/pre', 1)
      assertXpath(output, '//*[@class="verseblock"]//p', 0)
      assertXpath(
        output,
        '//*[@class="verseblock"]/pre[contains(text(), "A famous verse.")]',
        1
      )
      assertXpath(
        output,
        '//*[@class="verseblock"]/pre[contains(text(), "Stanza two.")]',
        1
      )
    })

    test('verse block does not contain block elements', async () => {
      const input = `\
[verse]
____
A famous verse.

....
not a literal
....
____
`
      const output = await convertString(input)
      assertCss(output, '.verseblock', 1)
      assertCss(output, '.verseblock > pre', 1)
      assertCss(output, '.verseblock p', 0)
      assertCss(output, '.verseblock .literalblock', 0)
    })

    test('verse should have normal subs', async () => {
      const input = `\
[verse]
____
A famous verse
____
`
      const verse = await blockFromString(input)
      // TODO: assert.deepEqual(verse.subs, NORMAL_SUBS)
    })

    test('should not recognize callouts in a verse', async () => {
      const input = `\
[verse]
____
La la la <1>
____
<1> Not pointing to a callout
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//pre[text()="La la la <1>"]', 1)
      assertMessage(logger, 'warn', '<stdin>: line 5: no callout found for <1>')
    })

    test('should perform normal subs on a verse block', async () => {
      const input = `\
[verse]
____
_GET /groups/link:#group-id[\\{group-id\\}]_
____
`
      const output = await convertStringToEmbedded(input)
      assert.ok(
        output.includes(
          '<pre class="content"><em>GET /groups/<a href="#group-id">{group-id}</a></em></pre>'
        )
      )
    })
  })
})
