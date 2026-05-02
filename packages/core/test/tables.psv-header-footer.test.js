// ESM conversion of tables_test.rb — context 'Tables' > context 'PSV' (header/footer)
// Covers: header, footer, frame values, DocBook alignment, implicit header rows, cell styles

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertCss, assertXpath } from './helpers.js'
import { convertString, convertStringToEmbedded } from './harness.js'

// ── Tables › PSV › Header/Footer ─────────────────────────────────────────────

describe('Tables', () => {
  describe('PSV', () => {
    test('table with header and footer', async () => {
      const input = `[options="header,footer"]
|===
|Item       |Quantity
|Item 1     |1
|Item 2     |2
|Item 3     |3
|Total      |6
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 1)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr > th', 2)
      assertCss(output, 'table > tfoot', 1)
      assertCss(output, 'table > tfoot > tr', 1)
      assertCss(output, 'table > tfoot > tr > td', 2)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 3)
      // Verify section order: thead, tbody, tfoot
      const { parse } = await import('node-html-parser')
      const root = parse(`<body>${output}</body>`)
      const tableSectionNames = root
        .querySelectorAll('table > *')
        .map((n) => n.tagName.toLowerCase())
        .filter((n) => n.startsWith('t'))
      assert.deepEqual(tableSectionNames, ['thead', 'tbody', 'tfoot'])
    })

    test('table with header and footer docbook', async () => {
      const input = `.Table with header, body and footer
[options="header,footer"]
|===
|Item       |Quantity
|Item 1     |1
|Item 2     |2
|Item 3     |3
|Total      |6
|===`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertCss(output, 'table', 1)
      assertCss(output, 'table > title', 1)
      assertCss(output, 'table > tgroup', 1)
      assertCss(output, 'table > tgroup[cols="2"]', 1)
      assertCss(output, 'table > tgroup[cols="2"] > colspec', 2)
      assertCss(output, 'table > tgroup[cols="2"] > colspec[colwidth="50*"]', 2)
      assertCss(output, 'table > tgroup > thead', 1)
      assertCss(output, 'table > tgroup > thead > row', 1)
      assertCss(output, 'table > tgroup > thead > row > entry', 2)
      assertCss(output, 'table > tgroup > thead > row > entry > simpara', 0)
      assertCss(output, 'table > tgroup > tfoot', 1)
      assertCss(output, 'table > tgroup > tfoot > row', 1)
      assertCss(output, 'table > tgroup > tfoot > row > entry', 2)
      assertCss(output, 'table > tgroup > tfoot > row > entry > simpara', 2)
      assertCss(output, 'table > tgroup > tbody', 1)
      assertCss(output, 'table > tgroup > tbody > row', 3)
      // Verify section order: thead, tbody, tfoot
      const { parse } = await import('node-html-parser')
      const root = parse(`<body>${output}</body>`)
      const tableSectionNames = root
        .querySelectorAll('table > tgroup > *')
        .map((n) => n.tagName.toLowerCase())
        .filter((n) => n.startsWith('t'))
      assert.deepEqual(tableSectionNames, ['thead', 'tbody', 'tfoot'])
    })

    test('should set horizontal and vertical alignment when converting to DocBook', async () => {
      const input = `|===
|A ^.^|B >|C

|A1
^.^|B1
>|C1
|===`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'informaltable', 1)
      assertCss(
        output,
        'informaltable thead > row > entry[align="left"][valign="top"]',
        1
      )
      assertCss(
        output,
        'informaltable thead > row > entry[align="center"][valign="middle"]',
        1
      )
      assertCss(
        output,
        'informaltable thead > row > entry[align="right"][valign="top"]',
        1
      )
      assertCss(
        output,
        'informaltable tbody > row > entry[align="left"][valign="top"]',
        1
      )
      assertCss(
        output,
        'informaltable tbody > row > entry[align="center"][valign="middle"]',
        1
      )
      assertCss(
        output,
        'informaltable tbody > row > entry[align="right"][valign="top"]',
        1
      )
    })

    test('should preserve frame value ends when converting to HTML', async () => {
      const input = `[frame=ends]
|===
|A |B |C
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table.frame-ends', 1)
    })

    test('should normalize frame value topbot as ends when converting to HTML', async () => {
      const input = `[frame=topbot]
|===
|A |B |C
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table.frame-ends', 1)
    })

    test('should preserve frame value topbot when converting to DocBook', async () => {
      const input = `[frame=topbot]
|===
|A |B |C
|===`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertCss(output, 'informaltable[frame="topbot"]', 1)
    })

    test('should convert frame value ends to topbot when converting to DocBook', async () => {
      const input = `[frame=ends]
|===
|A |B |C
|===`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertCss(output, 'informaltable[frame="topbot"]', 1)
    })

    test('table with landscape orientation in DocBook', async () => {
      for (const attrs of ['orientation=landscape', '%rotate']) {
        const input = `[${attrs}]
|===
|Column A | Column B | Column C
|===`
        const output = await convertStringToEmbedded(input, {
          backend: 'docbook',
        })
        assertCss(output, 'informaltable', 1)
        assertCss(output, 'informaltable[orient="land"]', 1)
      }
    })

    test('table with implicit header row', async () => {
      const input = `|===
|Column 1 |Column 2

|Data A1
|Data B1

|Data A2
|Data B2
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 1)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr > th', 2)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 2)
    })

    test('table with implicit header row only', async () => {
      const input = `|===
|Column 1 |Column 2

|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 1)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr > th', 2)
      assertCss(output, 'table > tbody', 0)
    })

    test('table with implicit header row when other options set', async () => {
      const input = `[%autowidth]
|===
|Column 1 |Column 2

|Data A1
|Data B1
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table[style*="width"]', 0)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 1)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr > th', 2)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 1)
    })

    test('no implicit header row if second line not blank', async () => {
      const input = `|===
|Column 1 |Column 2
|Data A1
|Data B1

|Data A2
|Data B2
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 0)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('no implicit header row if cell in first line spans multiple lines', async () => {
      const input = `[cols=2*]
|===
|A1

A1 continued|B1

|A2
|B2
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 0)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 2)
      assertXpath(output, '(//td)[1]/p', 2)
    })

    test('should format first cell as literal if there is no implicit header row and column has l style', async () => {
      const input = `[cols="1l,1"]
|===
|literal
|normal
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'tbody pre', 1)
      assertCss(output, 'tbody p.tableblock', 1)
    })

    test('should format first cell as AsciiDoc if there is no implicit header row and column has a style', async () => {
      const input = `[cols="1a,1"]
|===
| * list
| normal
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'tbody .ulist', 1)
      assertCss(output, 'tbody p.tableblock', 1)
    })

    test('should interpret leading indent if first cell is AsciiDoc and there is no implicit header row', async () => {
      const input = `[cols="1a,1"]
|===
|
  literal
| normal
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'tbody pre', 1)
      assertCss(output, 'tbody p.tableblock', 1)
    })

    test('should format first cell as AsciiDoc if there is no implicit header row and cell has a style', async () => {
      const input = `|===
a| * list
| normal
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'tbody .ulist', 1)
      assertCss(output, 'tbody p.tableblock', 1)
    })

    test('no implicit header row if AsciiDoc cell in first line spans multiple lines', async () => {
      const input = `[cols=2*]
|===
a|contains AsciiDoc content

* a
* b
* c
a|contains no AsciiDoc content

just text
|A2
|B2
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 0)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 2)
      assertXpath(output, '(//td)[1]//ul', 1)
    })

    test('no implicit header row if first line blank', async () => {
      const input = `|===

|Column 1 |Column 2

|Data A1
|Data B1

|Data A2
|Data B2

|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 0)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('no implicit header row if noheader option is specified', async () => {
      const input = `[%noheader]
|===
|Column 1 |Column 2

|Data A1
|Data B1

|Data A2
|Data B2
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 0)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('styles not applied to header cells', async () => {
      const input = `[cols="1h,1s,1e",options="header,footer"]
|===
|Name |Occupation| Website
|Octocat |Social coding| https://github.com
|Name |Occupation| Website
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > thead > tr > th', 3)
      assertCss(output, 'table > thead > tr > th > *', 0)

      assertCss(output, 'table > tfoot > tr > th', 1)
      assertCss(output, 'table > tfoot > tr > td', 2)
      assertCss(output, 'table > tfoot > tr > td > p > strong', 1)
      assertCss(output, 'table > tfoot > tr > td > p > em', 1)

      assertCss(output, 'table > tbody > tr > th', 1)
      assertCss(output, 'table > tbody > tr > td', 2)
      assertCss(output, 'table > tbody > tr > td > p.header', 0)
      assertCss(output, 'table > tbody > tr > td > p > strong', 1)
      assertCss(output, 'table > tbody > tr > td > p > em > a', 1)
    })

    test('should apply text formatting to cells in implicit header row when column has a style', async () => {
      const input = `[cols="2*a"]
|===
| _foo_ | *bar*

| * list item
| paragraph
|===`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//thead/tr/th)[1]/em[text()="foo"]', 1)
      assertXpath(output, '(//thead/tr/th)[2]/strong[text()="bar"]', 1)
      assertCss(output, 'tbody .ulist', 1)
      assertCss(output, 'tbody .paragraph', 1)
    })

    test('should apply style and text formatting to cells in first row if no implicit header', async () => {
      const input = `[cols="s,e"]
|===
| _strong_ | *emphasis*
| strong
| emphasis
|===`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '((//tbody/tr)[1]/td)[1]//strong/em[text()="strong"]',
        1
      )
      assertXpath(
        output,
        '((//tbody/tr)[1]/td)[2]//em/strong[text()="emphasis"]',
        1
      )
      assertXpath(output, '((//tbody/tr)[2]/td)[1]//strong[text()="strong"]', 1)
      assertXpath(output, '((//tbody/tr)[2]/td)[2]//em[text()="emphasis"]', 1)
    })

    test('vertical table headers use th element instead of header class', async () => {
      const input = `[cols="1h,1s,1e"]
|===

|Name |Occupation| Website

|Octocat |Social coding| https://github.com

|Name |Occupation| Website

|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > tbody > tr > th', 3)
      assertCss(output, 'table > tbody > tr > td', 6)
      assertCss(output, 'table > tbody > tr .header', 0)
      assertCss(output, 'table > tbody > tr > td > p > strong', 3)
      assertCss(output, 'table > tbody > tr > td > p > em', 3)
      assertCss(output, 'table > tbody > tr > td > p > em > a', 1)
    })

    test('supports horizontal and vertical source data with blank lines and table header', async () => {
      const input = `.Horizontal and vertical source data
[width="80%",cols="3,^2,^2,10",options="header"]
|===
|Date |Duration |Avg HR |Notes

|22-Aug-08 |10:24 | 157 |
Worked out MSHR (max sustainable heart rate) by going hard
for this interval.

|22-Aug-08 |23:03 | 152 |
Back-to-back with previous interval.

|24-Aug-08 |40:00 | 145 |
Moderately hard interspersed with 3x 3min intervals (2 min
hard + 1 min really hard taking the HR up to 160).

I am getting in shape!

|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table[width="80%"]', 1)
      assertXpath(
        output,
        '/table/caption[@class="title"][text()="Table 1. Horizontal and vertical source data"]',
        1
      )
      assertCss(output, 'table > colgroup > col', 4)
      assertCss(
        output,
        'table > colgroup > col:nth-child(1)[width="17.647%"]',
        1
      )
      assertCss(
        output,
        'table > colgroup > col:nth-child(2)[width="11.7647%"]',
        1
      )
      assertCss(
        output,
        'table > colgroup > col:nth-child(3)[width="11.7647%"]',
        1
      )
      assertCss(
        output,
        'table > colgroup > col:nth-child(4)[width="58.8236%"]',
        1
      )
      assertCss(output, 'table > thead', 1)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > thead > tr > th', 4)
      assertCss(output, 'table > tbody > tr', 3)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 4)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 4)
      assertCss(output, 'table > tbody > tr:nth-child(3) > td', 4)
      assertXpath(
        output,
        `/table/tbody/tr[1]/td[4]/p[text()='Worked out MSHR (max sustainable heart rate) by going hard\nfor this interval.']`,
        1
      )
      assertCss(
        output,
        'table > tbody > tr:nth-child(3) > td:nth-child(4) > p',
        2
      )
      assertXpath(
        output,
        '/table/tbody/tr[3]/td[4]/p[2][text()="I am getting in shape!"]',
        1
      )
    })
  })
})
