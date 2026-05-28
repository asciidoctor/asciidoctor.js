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

  describe('findBy()', () => {
    test('findBy(callback) shorthand applies the callback as filter with empty selector', async () => {
      const doc = await documentFromString('----\ncode\n----\n\nA paragraph.')
      const matches = doc.findBy((b) => b.context === 'listing')
      assert.equal(matches.length, 1)
      assert.equal(matches[0].context, 'listing')
    })

    test('findBy(callback) shorthand traverses the full document tree', async () => {
      const doc = await documentFromString(
        'Intro paragraph.\n\n== Section\n\nBody paragraph.'
      )
      const all = doc.findBy(() => true)
      // document (compound) → intro paragraph → section (compound) → body paragraph
      assert.equal(all.length, 4)
      assert.equal(all[0].context, 'document')
      assert.equal(all[0].contentModel, 'compound')
      assert.equal(all[1].context, 'paragraph')
      assert.equal(all[2].context, 'section')
      assert.equal(all[2].contentModel, 'compound')
      assert.equal(all[3].context, 'paragraph')
    })

    test('findBy(selector, callback) still works alongside the shorthand', async () => {
      const doc = await documentFromString('----\ncode\n----\n\nA paragraph.')
      const matches = doc.findBy(
        { context: 'listing' },
        (b) => b.context === 'listing'
      )
      assert.equal(matches.length, 1)
    })

    test('findBy traverses dlist items without throwing', async () => {
      const doc = await documentFromString(
        '[horizontal.contact]\ng+:: plus.google.com/1234567890\ntwitter:: @yourhandle'
      )
      // must not throw "Receiver must be an instance of class AbstractBlock"
      const results = doc.findBy({ context: 'image', role: 'canvas' })
      assert.equal(results.length, 0)
    })

    test('findBy traverses dlist and finds matching blocks inside descriptions', async () => {
      const doc = await documentFromString(
        'term1:: description one\nterm2:: description two'
      )
      const items = doc.findBy({ context: 'list_item' })
      // 2 terms + 2 descriptions
      assert.equal(items.length, 4)
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
