import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { documentFromString } from './harness.js'

// Tests for Table, Column and Cell JS-style accessor API (table.js)

describe('Table', () => {
  describe('Rows', () => {
    test('toObject() returns head, body and foot arrays', async () => {
      const doc = await documentFromString(`[%header]
|===
|H1 |H2
|a  |b
|c  |d
|===`)
      const { rows } = doc.blocks[0]
      const obj = rows.toObject()
      assert.equal(obj.head.length, 1)
      assert.equal(obj.body.length, 2)
      assert.equal(obj.foot.length, 0)
    })
  })

  describe('Column', () => {
    test('isBlock() returns false', async () => {
      const doc = await documentFromString('|===\n|A |B\n|===')
      const col = doc.blocks[0].columns[0]
      assert.equal(col.isBlock(), false)
    })

    test('isInline() returns false', async () => {
      const doc = await documentFromString('|===\n|A |B\n|===')
      const col = doc.blocks[0].columns[0]
      assert.equal(col.isInline(), false)
    })

    test('getTable() returns the parent Table', async () => {
      const doc = await documentFromString('|===\n|A |B\n|===')
      const table = doc.blocks[0]
      const col = table.columns[0]
      assert.strictEqual(col.getTable(), table)
    })
  })

  describe('Cell', () => {
    test('getText() returns the cell text with substitutions applied', async () => {
      const doc = await documentFromString('|===\n|Cell One\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      assert.equal(cell.getText(), 'Cell One')
    })

    test('setText() updates the raw cell text and clears converted cache', async () => {
      const doc = await documentFromString('|===\n|Original\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      cell.setText('Updated')
      assert.equal(cell.getText(), 'Updated')
    })

    test('getInnerDocument() returns null for a regular cell', async () => {
      const doc = await documentFromString('|===\n|plain cell\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      assert.equal(cell.getInnerDocument(), null)
    })

    test('getInnerDocument() returns a Document for an AsciiDoc cell', async () => {
      const doc = await documentFromString('|===\na|== Inner\n\nParagraph.\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      const inner = cell.getInnerDocument()
      assert.ok(inner !== null)
      assert.equal(inner.constructor.name, 'Document')
    })

    test('getFile() returns null when no sourcemap is active', async () => {
      const doc = await documentFromString('|===\n|cell\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      assert.equal(cell.getFile(), null)
    })

    test('getLineNumber() returns null when no sourcemap is active', async () => {
      const doc = await documentFromString('|===\n|cell\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      assert.equal(cell.getLineNumber(), null)
    })

    test('lines() returns the raw source text as an array of lines', async () => {
      const doc = await documentFromString('|===\n|line one\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      assert.deepEqual(cell.lines(), ['line one'])
    })

    test('source() returns the raw source text as a string', async () => {
      const doc = await documentFromString('|===\n|raw text\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      assert.equal(cell.source(), 'raw text')
    })

    test('toString() returns a string with text, colspan and rowspan', async () => {
      const doc = await documentFromString('|===\n|hello\n|===')
      const cell = doc.blocks[0].rows.body[0][0]
      const str = cell.toString()
      assert.ok(typeof str === 'string')
      assert.ok(str.includes('hello'), 'text should appear')
      assert.ok(str.includes('colspan'), 'colspan should appear')
      assert.ok(str.includes('rowspan'), 'rowspan should appear')
    })
  })
})