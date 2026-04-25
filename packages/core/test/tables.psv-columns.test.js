// ESM conversion of tables_test.rb — context 'Tables' > context 'PSV' (columns)
// Covers: autowidth, column widths, colspec syntax, cols attribute variations

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertCss, assertXpath } from './helpers.js'
import { documentFromString, convertStringToEmbedded } from './harness.js'

// ── Tables › PSV › Columns ───────────────────────────────────────────────────

describe('Tables', () => {
  describe('PSV', () => {
    test('table and column width not assigned when autowidth option is specified', async () => {
      const input = `[options="autowidth"]
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table.fit-content', 1)
      assertCss(output, 'table[style*="width"]', 0)
      assertCss(output, 'table colgroup col', 3)
      assertCss(output, 'table colgroup col[style*="width"]', 0)
    })

    test('does not assign column width for autowidth columns in HTML output', async () => {
      const input = `[cols="15%,3*~"]
|=======
|A |B |C |D
|a |b |c |d
|1 |2 |3 |4
|=======`
      const doc = await documentFromString(input)
      const tableRow0 = doc.blocks[0].rows.body[0]
      assert.equal(tableRow0[0].attributes['width'], 15)
      assert.equal(tableRow0[0].attributes['colpcwidth'], 15)
      assert.notEqual(tableRow0[0].attributes['autowidth-option'], '')
      const expectedPcwidths = { 1: 28.3333, 2: 28.3333, 3: 28.3334 }
      for (let i = 1; i <= 3; i++) {
        assert.equal(tableRow0[i].attributes['width'], 28.3333)
        assert.equal(tableRow0[i].attributes['colpcwidth'], expectedPcwidths[i])
        assert.equal(tableRow0[i].attributes['autowidth-option'], '')
      }
      const output = await doc.convert({ standalone: false })
      assertCss(output, 'table', 1)
      assertCss(output, 'table colgroup col', 4)
      assertCss(output, 'table colgroup col[width]', 1)
      assertCss(output, 'table colgroup col[width="15%"]', 1)
    })

    test('can assign autowidth to all columns even when table has a width', async () => {
      const input = `[cols="4*~",width=50%]
|=======
|A |B |C |D
|a |b |c |d
|1 |2 |3 |4
|=======`
      const doc = await documentFromString(input)
      const tableRow0 = doc.blocks[0].rows.body[0]
      for (let i = 0; i <= 3; i++) {
        assert.equal(tableRow0[i].attributes['width'], 25)
        assert.equal(tableRow0[i].attributes['colpcwidth'], 25)
        assert.equal(tableRow0[i].attributes['autowidth-option'], '')
      }
      const output = await doc.convert({ standalone: false })
      assertCss(output, 'table', 1)
      assertCss(output, 'table[width="50%"]', 1)
      assertCss(output, 'table colgroup col', 4)
      assertCss(output, 'table colgroup col[style]', 0)
    })

    test('equally distributes remaining column width to autowidth columns in DocBook output', async () => {
      const input = `[cols="15%,3*~"]
|=======
|A |B |C |D
|a |b |c |d
|1 |2 |3 |4
|=======`
      const output = await convertStringToEmbedded(input, { backend: 'docbook5' })
      assertCss(output, 'tgroup[cols="4"]', 1)
      assertCss(output, 'tgroup colspec', 4)
      assertCss(output, 'tgroup colspec[colwidth]', 4)
      assertCss(output, 'tgroup colspec[colwidth="15*"]', 1)
      assertCss(output, 'tgroup colspec[colwidth="28.3333*"]', 2)
      assertCss(output, 'tgroup colspec[colwidth="28.3334*"]', 1)
    })

    test('should compute column widths based on pagewidth when width is set on table in DocBook output', async () => {
      const input = `:pagewidth: 500

[width=50%]
|=======
|A |B |C |D

|a |b |c |d
|1 |2 |3 |4
|=======`
      const output = await convertStringToEmbedded(input, { backend: 'docbook5' })
      assertCss(output, 'tgroup[cols="4"]', 1)
      assertCss(output, 'tgroup colspec', 4)
      assertCss(output, 'tgroup colspec[colwidth]', 4)
      assertCss(output, 'tgroup colspec[colwidth="62.5*"]', 4)
    })

    test('explicit table width is used even when autowidth option is specified', async () => {
      const input = `[%autowidth,width=75%]
|=======
|A |B |C
|a |b |c
|1 |2 |3
|=======`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table[width]', 1)
      assertCss(output, 'table colgroup col', 3)
      assertCss(output, 'table colgroup col[style*="width"]', 0)
    })

    test('first row sets number of columns when not specified', async () => {
      const input = `|===
|first |second |third |fourth
|1 |2 |3
|4
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 4)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 4)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 4)
    })

    test('colspec attribute using asterisk syntax sets number of columns', async () => {
      const input = `[cols="3*"]
|===
|A |B |C |a |b |c |1 |2 |3
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('table with explicit column count can have multiple rows on a single line', async () => {
      const input = `[cols="3*"]
|===
|one |two
|1 |2 |a |b
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
    })

    test('table with explicit deprecated colspec syntax can have multiple rows on a single line', async () => {
      const input = `[cols="3"]
|===
|one |two
|1 |2 |a |b
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
    })

    test('columns are added for empty records in colspec attribute', async () => {
      const input = `[cols="<,"]
|===
|one |two
|1 |2 |a |b
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('cols may be separated by semi-colon instead of comma', async () => {
      const input = `[cols="1s;3m"]
|===
| strong
| mono
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'col[width="25%"]', 1)
      assertCss(output, 'col[width="75%"]', 1)
      assertXpath(output, '(//td)[1]//strong', 1)
      assertXpath(output, '(//td)[2]//code', 1)
    })

    test('cols attribute may include spaces', async () => {
      const input = `[cols=" 1, 1 "]
|===
|one |two |1 |2 |a |b
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'col[width="50%"]', 2)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('blank cols attribute should be ignored', async () => {
      const input = `[cols=" "]
|===
|one |two
|1 |2 |a |b
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'col[width="50%"]', 2)
      assertCss(output, 'table > tbody > tr', 3)
    })

    test('empty cols attribute should be ignored', async () => {
      const input = `[cols=""]
|===
|one |two
|1 |2 |a |b
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'col[width="50%"]', 2)
      assertCss(output, 'table > tbody > tr', 3)
    })
  })
})