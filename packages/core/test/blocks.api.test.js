import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { documentFromString } from './harness.js'

// Tests for Block JS-style accessor API (block.js)

describe('Block', () => {
  describe('blockname', () => {
    test('blockname getter returns context for sidebar block', async () => {
      const doc = await documentFromString('****\nSidebar content.\n****')
      const block = doc.blocks[0]
      assert.equal(block.blockname, 'sidebar')
    })

    test('blockname getter returns context for quote block', async () => {
      const doc = await documentFromString(
        '[quote,Author]\n____\nA quote.\n____'
      )
      const block = doc.blocks[0]
      assert.equal(block.blockname, 'quote')
    })

    test('blockname getter returns context for admonition', async () => {
      const doc = await documentFromString('NOTE: An admonition.')
      const block = doc.blocks[0]
      assert.equal(block.blockname, 'admonition')
    })

    test('getBlockName() returns the same value as the blockname getter', async () => {
      const doc = await documentFromString('****\nSidebar content.\n****')
      const block = doc.blocks[0]
      assert.equal(block.getBlockName(), block.blockname)
      assert.equal(block.getBlockName(), 'sidebar')
    })
  })

  describe('toString()', () => {
    test('toString() includes context, content_model and style', async () => {
      const doc = await documentFromString('----\nsome code\n----')
      const block = doc.blocks[0]
      const str = block.toString()
      assert.ok(str.includes('listing'), 'context should appear')
      assert.ok(str.includes('verbatim'), 'content_model should appear')
    })

    test('toString() includes block count for compound blocks', async () => {
      const doc = await documentFromString('****\nParagraph inside.\n****')
      const block = doc.blocks[0]
      const str = block.toString()
      assert.ok(
        str.includes('compound'),
        'compound content_model should appear'
      )
      assert.ok(
        str.includes('blocks:'),
        'block count should appear for compound'
      )
    })

    test('toString() includes line count for non-compound blocks', async () => {
      const doc = await documentFromString('----\nline one\nline two\n----')
      const block = doc.blocks[0]
      const str = block.toString()
      assert.ok(
        str.includes('lines:'),
        'line count should appear for verbatim block'
      )
    })
  })
})
