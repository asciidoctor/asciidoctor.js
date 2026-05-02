// ESM conversion of tables_test.rb — context 'Tables' > context 'PSV' (basic)
// Covers: simple table, float/stripes, captions, separators, cell parsing, literal cells

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  assertCss,
  assertXpath,
  assertMessage,
  countXpath,
  usingMemoryLogger,
  decodeChar,
} from './helpers.js'
import { documentFromString, convertStringToEmbedded } from './harness.js'

// ── Tables › PSV › Basic ──────────────────────────────────────────────────────

describe('Tables', () => {
  describe('PSV', () => {
    test('converts simple psv table', async () => {
      const input = `|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const cells = [
        ['A', 'B', 'C'],
        ['a', 'b', 'c'],
        ['1', '2', '3'],
      ]
      const doc = await documentFromString(input, { standalone: false })
      const table = doc.blocks[0]
      const sum = table.columns
        .map((col) => col.attributes['colpcwidth'])
        .reduce((a, b) => a + b, 0)
      assert.equal(sum, 100)
      const output = await doc.convert()
      assertCss(output, 'table', 1)
      assertCss(output, 'table.tableblock.frame-all.grid-all.stretch', 1)
      assertCss(output, 'table > colgroup > col[width="33.3333%"]', 2)
      assertCss(
        output,
        'table > colgroup > col:last-of-type[width="33.3334%"]',
        1
      )
      assertCss(output, 'table tr', 3)
      assertCss(output, 'table > tbody > tr', 3)
      assertCss(output, 'table td', 9)
      assertCss(
        output,
        'table > tbody > tr > td.tableblock.halign-left.valign-top > p.tableblock',
        9
      )
      cells.forEach((row, rowi) => {
        assertCss(
          output,
          `table > tbody > tr:nth-child(${rowi + 1}) > td`,
          row.length
        )
        assertCss(
          output,
          `table > tbody > tr:nth-child(${rowi + 1}) > td > p`,
          row.length
        )
        row.forEach((cell, celli) => {
          assertXpath(
            output,
            `(//tr)[${rowi + 1}]/td[${celli + 1}]/p[text()='${cell}']`,
            1
          )
        })
      })
    })

    test('should add direction CSS class if float attribute is set on table', async () => {
      const input = `[float=left]
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table.left', 1)
    })

    test('should set stripes class if stripes option is set', async () => {
      const input = `[stripes=odd]
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table.stripes-odd', 1)
    })

    test('outputs a caption on simple psv table', async () => {
      const input = `.Simple psv table
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/table/caption[@class="title"][text()="Table 1. Simple psv table"]',
        1
      )
      assertXpath(output, '/table/caption/following-sibling::colgroup', 1)
    })

    test('only increments table counter for tables that have a title', async () => {
      const input = `.First numbered table
|=======
|1 |2 |3
|=======

|=======
|4 |5 |6
|=======

.Second numbered table
|=======
|7 |8 |9
|=======`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table:root', 3)
      assertXpath(output, '(/table)[1]/caption', 1)
      assertXpath(
        output,
        '(/table)[1]/caption[text()="Table 1. First numbered table"]',
        1
      )
      assertXpath(output, '(/table)[2]/caption', 0)
      assertXpath(output, '(/table)[3]/caption', 1)
      assertXpath(
        output,
        '(/table)[3]/caption[text()="Table 2. Second numbered table"]',
        1
      )
    })

    test('uses explicit caption in front of title in place of default caption and number', async () => {
      const input = `[caption="All the Data. "]
.Simple psv table
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/table/caption[@class="title"][text()="All the Data. Simple psv table"]',
        1
      )
      assertXpath(output, '/table/caption/following-sibling::colgroup', 1)
    })

    test('disables caption when caption attribute on table is empty', async () => {
      const input = `[caption=]
.Simple psv table
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/table/caption[@class="title"][text()="Simple psv table"]',
        1
      )
      assertXpath(output, '/table/caption/following-sibling::colgroup', 1)
    })

    test('disables caption when caption attribute on table is empty string', async () => {
      const input = `[caption=""]
.Simple psv table
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/table/caption[@class="title"][text()="Simple psv table"]',
        1
      )
      assertXpath(output, '/table/caption/following-sibling::colgroup', 1)
    })

    test('disables caption on table when table-caption document attribute is unset', async () => {
      const input = `:!table-caption:

.Simple psv table
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/table/caption[@class="title"][text()="Simple psv table"]',
        1
      )
      assertXpath(output, '/table/caption/following-sibling::colgroup', 1)
    })

    test('ignores escaped separators', async () => {
      const input = `|===
|A \\| here| a \\| there
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 1)
      assertCss(output, 'table > tbody > tr > td', 2)
      assertXpath(output, '/table/tbody/tr/td[1]/p[text()="A | here"]', 1)
      assertXpath(output, '/table/tbody/tr/td[2]/p[text()="a | there"]', 1)
    })

    test('preserves escaped delimiters at the end of the line', async () => {
      const input = `[%header,cols="1,1"]
|===
|A |B\\|
|A1 |B1\\|
|A2 |B2\\|
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr:nth-child(1) > th', 2)
      assertXpath(output, '/table/thead/tr[1]/th[2][text()="B|"]', 1)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 2)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p[text()="B1|"]', 1)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 2)
      assertXpath(output, '/table/tbody/tr[2]/td[2]/p[text()="B2|"]', 1)
    })

    test('should treat trailing pipe as an empty cell', async () => {
      const input = `|===
|A1 |
|B1 |B2
|C1 |C2
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 3)
      assertXpath(output, '/table/tbody/tr[1]/td', 2)
      assertXpath(output, '/table/tbody/tr[1]/td[1]/p[text()="A1"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p', 0)
      assertXpath(output, '/table/tbody/tr[2]/td[1]/p[text()="B1"]', 1)
    })

    test('should auto recover with warning if missing leading separator on first cell', async () => {
      const input = `|===
A | here| a | there
| x
| y
| z
| end
|===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table > tbody > tr', 2)
        assertCss(output, 'table > tbody > tr > td', 8)
        assertXpath(output, '/table/tbody/tr[1]/td[1]/p[text()="A"]', 1)
        assertXpath(output, '/table/tbody/tr[1]/td[2]/p[text()="here"]', 1)
        assertXpath(output, '/table/tbody/tr[1]/td[3]/p[text()="a"]', 1)
        assertXpath(output, '/table/tbody/tr[1]/td[4]/p[text()="there"]', 1)
        assertMessage(
          logger,
          'ERROR',
          '<stdin>: line 2: table missing leading separator; recovering automatically'
        )
      })
    })

    test('performs normal substitutions on cell content', async () => {
      const input = `:show_title: Cool new show
|===
|{show_title} |Coming soon...
|===`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//tbody/tr/td[1]/p[text()="Cool new show"]', 1)
      assertXpath(
        output,
        `//tbody/tr/td[2]/p[text()='Coming soon${decodeChar(8230)}${decodeChar(8203)}']`,
        1
      )
    })

    test('should only substitute specialchars for literal table cells', async () => {
      const input = `|===
l|one
*two*
three
<four>
|===`
      const output = await convertStringToEmbedded(input)
      const count = countXpath(output, '/table//pre')
      assert.equal(count, 1)
      assert.ok(
        output.includes('<pre>one\n*two*\nthree\n&lt;four&gt;</pre>'),
        `Expected literal pre content, got:\n${output}`
      )
    })

    test('should preserve leading spaces but not leading newlines or trailing spaces in literal table cells', async () => {
      const input = `[cols=2*]
|===
l|
  one
  two
three

  | normal
|===`
      const output = await convertStringToEmbedded(input)
      const count = countXpath(output, '/table//pre')
      assert.equal(count, 1)
      assert.ok(
        output.includes('<pre>  one\n  two\nthree</pre>'),
        `Expected leading spaces preserved, got:\n${output}`
      )
    })

    test('should ignore v table cell style', async () => {
      const input = `[cols=2*]
|===
v|
  one
  two
three

  | normal
|===`
      const output = await convertStringToEmbedded(input)
      assert.ok(
        output.includes('<p class="tableblock">one\n  two\nthree</p>'),
        `Expected v-style cell content, got:\n${output}`
      )
    })
  })
})
