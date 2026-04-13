// ESM conversion of tables_test.rb — context 'Tables' > context 'PSV' (spans/styles)
// Covers: percentages, spans, alignments, repeating cells, colnames DocBook, colspan errors,
//         incomplete rows, repeated cell style, blank handling, paragraph splitting

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { assertCss, assertXpath, assertMessage, countCss, usingMemoryLogger } from './helpers.js'

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())

// ── Tables › PSV › Spans & Styles ────────────────────────────────────────────

describe('Tables', () => {
  describe('PSV', () => {
    test('percentages as column widths', async () => {
      const input = `[cols="<.^10%,<90%"]
|===
|column A |column B
|===`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/table/colgroup/col', 2)
      assertXpath(output, '(/table/colgroup/col)[1][@width="10%"]', 1)
      assertXpath(output, '(/table/colgroup/col)[2][@width="90%"]', 1)
    })

    test('spans, alignments and styles', async () => {
      const input = `[cols="e,m,^,>s",width="25%"]
|===
|1 >s|2 |3 |4
^|5 2.2+^.^|6 .3+<.>m|7
^|8
d|9 2+>|10
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col[width="25%"]', 4)
      assertCss(output, 'table > tbody > tr', 4)
      assertCss(output, 'table > tbody > tr > td', 10)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 4)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(3) > td', 1)
      assertCss(output, 'table > tbody > tr:nth-child(4) > td', 2)

      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(1).halign-left.valign-top p em', 1)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(2).halign-right.valign-top p strong', 1)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(3).halign-center.valign-top p', 1)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(3).halign-center.valign-top p *', 0)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(4).halign-right.valign-top p strong', 1)

      assertCss(output, 'table > tbody > tr:nth-child(2) > td:nth-child(1).halign-center.valign-top p em', 1)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td:nth-child(2).halign-center.valign-middle[colspan="2"][rowspan="2"] p code', 1)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td:nth-child(3).halign-left.valign-bottom[rowspan="3"] p code', 1)

      assertCss(output, 'table > tbody > tr:nth-child(3) > td:nth-child(1).halign-center.valign-top p em', 1)

      assertCss(output, 'table > tbody > tr:nth-child(4) > td:nth-child(1).halign-left.valign-top p', 1)
      assertCss(output, 'table > tbody > tr:nth-child(4) > td:nth-child(1).halign-left.valign-top p em', 0)
      assertCss(output, 'table > tbody > tr:nth-child(4) > td:nth-child(2).halign-right.valign-top[colspan="2"] p code', 1)
    })

    test('sets up columns correctly if first row has cell that spans columns', async () => {
      const input = `|===
2+^|AAA |CCC
|AAA |BBB |CCC
|AAA |BBB |CCC
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(1)[colspan="2"]', 1)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(2):not([colspan])', 1)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td:not([colspan])', 3)
      assertCss(output, 'table > tbody > tr:nth-child(3) > td:not([colspan])', 3)
    })

    test('supports repeating cells', async () => {
      const input = `|===
3*|A
|1 3*|2
|b |c
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 3)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(3) > td', 3)

      assertXpath(output, '/table/tbody/tr[1]/td[1]/p[text()="A"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p[text()="A"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[3]/p[text()="A"]', 1)

      assertXpath(output, '/table/tbody/tr[2]/td[1]/p[text()="1"]', 1)
      assertXpath(output, '/table/tbody/tr[2]/td[2]/p[text()="2"]', 1)
      assertXpath(output, '/table/tbody/tr[2]/td[3]/p[text()="2"]', 1)

      assertXpath(output, '/table/tbody/tr[3]/td[1]/p[text()="2"]', 1)
      assertXpath(output, '/table/tbody/tr[3]/td[2]/p[text()="b"]', 1)
      assertXpath(output, '/table/tbody/tr[3]/td[3]/p[text()="c"]', 1)
    })

    test('calculates colnames correctly when using implicit column count and single cell with colspan', async () => {
      const input = `|===
2+|Two Columns
|One Column |One Column
|===`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//colspec', 2)
      assertXpath(output, '(//colspec)[1][@colname="col_1"]', 1)
      assertXpath(output, '(//colspec)[2][@colname="col_2"]', 1)
      assertXpath(output, '//row', 2)
      assertXpath(output, '(//row)[1]/entry', 1)
      assertXpath(output, '(//row)[1]/entry[@namest="col_1"][@nameend="col_2"]', 1)
    })

    test('calculates colnames correctly when using implicit column count and cells with mixed colspans', async () => {
      const input = `|===
2+|Two Columns | One Column
|One Column |One Column |One Column
|===`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//colspec', 3)
      assertXpath(output, '(//colspec)[1][@colname="col_1"]', 1)
      assertXpath(output, '(//colspec)[2][@colname="col_2"]', 1)
      assertXpath(output, '(//colspec)[3][@colname="col_3"]', 1)
      assertXpath(output, '//row', 2)
      assertXpath(output, '(//row)[1]/entry', 2)
      assertXpath(output, '(//row)[1]/entry[@namest="col_1"][@nameend="col_2"]', 1)
      assertXpath(output, '(//row)[2]/entry[@namest]', 0)
      assertXpath(output, '(//row)[2]/entry[@nameend]', 0)
    })

    test('assigns unique column names for table with implicit column count and colspans in first row', async () => {
      const input = `|===
|                 2+| Node 0          2+| Node 1

| Host processes    | Core 0 | Core 1   | Core 4 | Core 5
| Guest processes   | Core 2 | Core 3   | Core 6 | Core 7
|===`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//colspec', 5)
      for (let n = 1; n <= 5; n++) {
        assertXpath(output, `(//colspec)[${n}][@colname="col_${n}"]`, 1)
      }
      assertXpath(output, '(//row)[1]/entry', 3)
      assertXpath(output, '((//row)[1]/entry)[1][@namest]', 0)
      assertXpath(output, '((//row)[1]/entry)[1][@namend]', 0)
      assertXpath(output, '((//row)[1]/entry)[2][@namest="col_2"][@nameend="col_3"]', 1)
      assertXpath(output, '((//row)[1]/entry)[3][@namest="col_4"][@nameend="col_5"]', 1)
    })

    test('should drop row but preserve remaining rows after cell with colspan exceeds number of columns', async () => {
      const input = `[cols=2*]
|===
3+|A
|B
a|C

more C
|===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table tr', 1)
        assertXpath(output, '/table/tbody/tr/td[1]/p[text()="B"]', 1)
        assertMessage(logger, 'ERROR', '<stdin>: line 3: dropping cell because it exceeds specified number of columns')
      })
    })

    test('should drop last row if last cell in table has colspan that exceeds specified number of columns', async () => {
      const input = `[cols=2*]
|===
|a 2+|b
|===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table *', 0)
        assertMessage(logger, 'ERROR', '<stdin>: line 3: dropping cell because it exceeds specified number of columns')
      })
    })

    test('should drop last row if last cell in table has colspan that exceeds implicit number of columns', async () => {
      const input = `|===
|a |b
|c 2+|d
|===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table tr', 1)
        assertXpath(output, '/table/tbody/tr/td[1]/p[text()="a"]', 1)
        assertMessage(logger, 'ERROR', '<stdin>: line 3: dropping cell because it exceeds specified number of columns')
      })
    })

    test('should take colspan into account when taking cells for row', async () => {
      const input = `[cols=7]
|===
2+|a 2+|b 2+|c 2+|d
|e |f |g |h |i |j |k
|===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table tr', 1)
        assertCss(output, 'table tr td', 7)
        assertMessage(logger, 'ERROR', '<stdin>: line 3: dropping cell because it exceeds specified number of columns')
      })
    })

    test('should drop incomplete row at end of table and log an error', async () => {
      const input = `[cols=2*]
|===
|a |b
|c |d
|e
|===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table tr', 2)
        assertMessage(logger, 'ERROR', '<stdin>: line 5: dropping cells from incomplete row detected end of table')
      })
    })

    test('should apply cell style for column to repeated content', async () => {
      const input = `[cols=",^l"]
|===
|Paragraphs |Literal

2*|The discussion about what is good,
what is beautiful, what is noble,
what is pure, and what is true
could always go on.

Why is that important?
Why would I like to do that?

Because that's the only conversation worth having.

And whether it goes on or not after I die, I don't know.
But, I do know that it is the conversation I want to have while I am still alive.

Which means that to me the offer of certainty,
the offer of complete security,
the offer of an impermeable faith that can't give way
is an offer of something not worth having.

I want to live my life taking the risk all the time
that I don't know anything like enough yet...
that I haven't understood enough...
that I can't know enough...
that I am always hungrily operating on the margins
of a potentially great harvest of future knowledge and wisdom.

I wouldn't have it any other way.
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 1)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr > th', 2)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 1)
      assertCss(output, 'table > tbody > tr > td', 2)
      assertCss(output, 'table > tbody > tr > td:nth-child(1).halign-left.valign-top > p.tableblock', 7)
      assertCss(output, 'table > tbody > tr > td:nth-child(2).halign-center.valign-top > div.literal > pre', 1)
      // Count lines in the literal block
      const { parse } = await import('node-html-parser')
      const root = parse(`<body>${output}</body>`)
      const pre = root.querySelector('table > tbody > tr > td:nth-child(2) > div.literal > pre')
      assert.ok(pre, 'Expected to find a <pre> element')
      assert.equal(pre.textContent.split('\n').length, 26)
    })

    test('should not split paragraph at line containing only {blank} that is directly adjacent to non-blank lines', async () => {
      const input = `|===
|paragraph
{blank}
still one paragraph
{blank}
still one paragraph
|===`
      const result = await convertStringToEmbedded(input)
      assertCss(result, 'p.tableblock', 1)
    })

    test('should strip trailing newlines when splitting paragraphs', async () => {
      const input = `|===
|first wrapped
paragraph

second paragraph

third paragraph
|===`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, `(//p[@class="tableblock"])[1][text()="first wrapped\nparagraph"]`, 1)
      assertXpath(result, `(//p[@class="tableblock"])[2][text()="second paragraph"]`, 1)
      assertXpath(result, `(//p[@class="tableblock"])[3][text()="third paragraph"]`, 1)
    })
  })
})