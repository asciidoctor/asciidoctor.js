import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { Inline } from '../src/inline.js'
import { documentFromString } from './harness.js'

// ── Inline API ────────────────────────────────────────────────────────────────

describe('Inline', () => {
  describe('type predicates', () => {
    test('isBlock() returns false', async () => {
      const doc = await documentFromString('[[anchor-id,My Text]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.ok(inline instanceof Inline)
      assert.equal(inline.isBlock(), false)
    })

    test('isInline() returns true', async () => {
      const doc = await documentFromString('[[anchor-id,My Text]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.isInline(), true)
    })
  })

  describe('text accessors', () => {
    test('getText() returns the inline text', async () => {
      const doc = await documentFromString('[[anchor-id,Tigers]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.getText(), 'Tigers')
    })

    test('getText() returns null when no reftext', async () => {
      const doc = await documentFromString('[[anchor-id]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.getText(), null)
    })

    test('content() returns the inline text', async () => {
      const doc = await documentFromString('[[anchor-id,Tigers]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.content(), 'Tigers')
    })

    test('getType() returns the inline type qualifier', async () => {
      const doc = await documentFromString('[[anchor-id,Tigers]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.getType(), 'ref')
    })

    test('getType() returns bibref for bibliography entries', async () => {
      const doc = await documentFromString(
        '[bibliography]\n== Refs\n\n- [[[Knuth74,Knuth 1974]]] The Art of Computer Programming.'
      )
      const inline = doc.catalog.refs['Knuth74']
      assert.equal(inline.getType(), 'bibref')
    })
  })

  describe('reftext', () => {
    test('hasReftext() returns true for ref node with text', async () => {
      const doc = await documentFromString('[[anchor-id,Tigers]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.hasReftext(), true)
    })

    test('hasReftext() returns false for ref node without text', async () => {
      const doc = await documentFromString('[[anchor-id]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.hasReftext(), false)
    })

    test('hasReftext() returns true for bibref node with text', async () => {
      const doc = await documentFromString(
        '[bibliography]\n== Refs\n\n- [[[Knuth74,Knuth 1974]]] The Art of Computer Programming.'
      )
      const inline = doc.catalog.refs['Knuth74']
      assert.equal(inline.hasReftext(), true)
    })

    test('getReftext() returns the precomputed reftext', async () => {
      const doc = await documentFromString('[[anchor-id,Tigers]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      // precomputeReftext() is called during parse()
      assert.equal(inline.getReftext(), 'Tigers')
    })

    test('getReftext() returns null for ref node without text', async () => {
      const doc = await documentFromString('[[anchor-id]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      assert.equal(inline.getReftext(), null)
    })
  })

  describe('conversion', () => {
    test('render() is a deprecated alias for convert()', async () => {
      const doc = await documentFromString('[[anchor-id,Tigers]]paragraph text')
      const inline = doc.catalog.refs['anchor-id']
      const [converted, rendered] = await Promise.all([inline.convert(), inline.render()])
      assert.equal(rendered, converted)
    })
  })
})