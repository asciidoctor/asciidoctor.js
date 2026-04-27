// ESM conversion of tables_test.rb — context 'Tables' > context 'CSV'
// Covers: trailing comma, unclosed quote, newlines in quoted values, TSV include,
//         mixed records, quotes on own lines, csv/tsv shorthand, separator, AsciiDoc cell

import { test, describe } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

import { assertCss, assertXpath, assertMessage, usingMemoryLogger, decodeChar } from './helpers.js'
import { convertStringToEmbedded } from './harness.js'

const __dirname = import.meta.url.startsWith('http')
  ? new URL('.', import.meta.url).href.replace(/\/$/, '')
  : dirname(fileURLToPath(import.meta.url))

// ── Tables › CSV ──────────────────────────────────────────────────────────────

describe('Tables', () => {
  describe('CSV', () => {
    test('should treat trailing comma as an empty cell', async () => {
      const input = `,===
A1,
B1,B2
C1,C2
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 3)
      assertXpath(output, '/table/tbody/tr[1]/td', 2)
      assertXpath(output, '/table/tbody/tr[1]/td[1]/p[text()="A1"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p', 0)
      assertXpath(output, '/table/tbody/tr[2]/td[1]/p[text()="B1"]', 1)
    })

    test('should log error but not crash if cell data has unclosed quote', async () => {
      const input = `,===
a,b
c,"
,===`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'table', 1)
        assertCss(output, 'table td', 4)
        assertXpath(output, '(/table/td)[4]/p', 0)
        assertMessage(logger, 'ERROR', '<stdin>: line 3: unclosed quote in CSV data; setting cell to empty')
      })
    })

    test('should preserve newlines in quoted CSV values', async () => {
      const input = `[cols="1,1,1l"]
,===
"A
B
C","one

two

three","do

re

me"
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 1)
      assertXpath(output, '/table/tbody/tr[1]/td', 3)
      assertXpath(output, `/table/tbody/tr[1]/td[1]/p[text()="A\nB\nC"]`, 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p', 3)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p[1][text()="one"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p[2][text()="two"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p[3][text()="three"]', 1)
      assertXpath(output, `/table/tbody/tr[1]/td[3]//pre[text()="do\n\nre\n\nme"]`, 1)
    })

    test('should not drop trailing empty cell in TSV data when loaded from an include file', async () => {
      const input = `[%header,format=tsv]
|===
include::fixtures/data.tsv[]
|===`
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: __dirname })
      assertCss(output, 'table > tbody > tr', 3)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(3) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td:nth-child(3):empty', 1)
    })

    test('mixed unquoted records and quoted records with escaped quotes, commas, and wrapped lines', async () => {
      const input = `[format="csv",options="header"]
|===
Year,Make,Model,Description,Price
1997,Ford,E350,"ac, abs, moon",3000.00
1999,Chevy,"Venture ""Extended Edition""","",4900.00
1999,Chevy,"Venture ""Extended Edition, Very Large""",,5000.00
1996,Jeep,Grand Cherokee,"MUST SELL!
air, moon roof, loaded",4799.00
2000,Toyota,Tundra,"""This one's gonna to blow you're socks off,"" per the sticker",10000.00
2000,Toyota,Tundra,"Check it, ""this one's gonna to blow you're socks off"", per the sticker",10000.00
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col[width="20%"]', 5)
      assertCss(output, 'table > thead > tr', 1)
      assertCss(output, 'table > tbody > tr', 6)
      assertXpath(output, '((//tbody/tr)[1]/td)[4]/p[text()="ac, abs, moon"]', 1)
      assertXpath(output, `((//tbody/tr)[2]/td)[3]/p[text()='Venture "Extended Edition"']`, 1)
      assertXpath(output, `((//tbody/tr)[4]/td)[4]/p[text()="MUST SELL!\nair, moon roof, loaded"]`, 1)
      assertXpath(output, `((//tbody/tr)[5]/td)[4]/p[text()='"This one${decodeChar(8217)}s gonna to blow you${decodeChar(8217)}re socks off," per the sticker']`, 1)
      assertXpath(output, `((//tbody/tr)[6]/td)[4]/p[text()='Check it, "this one${decodeChar(8217)}s gonna to blow you${decodeChar(8217)}re socks off", per the sticker']`, 1)
    })

    test('should allow quotes around a CSV value to be on their own lines', async () => {
      const input = `[cols=2*]
,===
"
A
","
B
"
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 1)
      assertXpath(output, '/table/tbody/tr[1]/td', 2)
      assertXpath(output, '/table/tbody/tr[1]/td[1]/p[text()="A"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p[text()="B"]', 1)
    })

    test('csv format shorthand', async () => {
      const input = `,===
a,b,c
1,2,3
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
    })

    test('tsv as format', async () => {
      const input = `[format=tsv]
,===
a\tb\tc
1\t2\t3
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
    })

    test('custom csv separator', async () => {
      const input = `[format=csv,separator=;]
|===
a;b;c
1;2;3
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
    })

    test('tab as separator', async () => {
      const input = `[separator=\\t]
,===
a\tb\tc
1\t2\t3
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
    })

    test('single cell in CSV table should only produce single row', async () => {
      const input = `,===
single cell
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table td', 1)
    })

    test('cell formatted with AsciiDoc style', async () => {
      const input = `[cols="1,1,1a",separator=;]
,===
element;description;example

thematic break,a visible break; also known as a horizontal rule;---
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table tbody hr', 1)
    })

    test('should strip whitespace around contents of AsciiDoc cell', async () => {
      const input = `[cols="1,1,1a",separator=;]
,===
element;description;example

paragraph;contiguous lines of words and phrases;"
  one sentence, one line
  "
,===`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/table/tbody//*[@class="paragraph"]/p[text()="one sentence, one line"]', 1)
    })
  })
})
