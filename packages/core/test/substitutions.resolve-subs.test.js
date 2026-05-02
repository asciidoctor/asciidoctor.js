// ESM conversion of substitutions_test.rb — Resolve subs context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { Block } from '../src/block.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const load_ = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const emptyDocument = (opts = {}) => load_('', opts)

// ── Substitutions — Resolve subs ─────────────────────────────────────────────

describe('Substitutions', () => {
  describe('Resolve subs', () => {
    test('should resolve subs for block', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph')
      block.attributes.subs = 'quotes,normal'
      block.commitSubs()
      assert.deepEqual(block.subs, [
        'quotes',
        'specialcharacters',
        'attributes',
        'replacements',
        'macros',
        'post_replacements',
      ])
    })

    // NOTE coderay syntax highlighter is not available in a JavaScript environment
    test('should not replace specialcharacters sub with highlight for source block when source highlighter is not set', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'listing', { content_model: 'verbatim' })
      block.style = 'source'
      block.attributes.subs = 'specialcharacters'
      block.attributes.language = 'ruby'
      block.commitSubs()
      assert.deepEqual(block.subs, ['specialcharacters'])
    })

    test('should not use subs if subs option passed to block constructor is null', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph', {
        source: '*bold* _italic_',
        subs: null,
        attributes: { subs: 'quotes' },
      })
      assert.deepEqual(block.subs, [])
      block.commitSubs()
      assert.deepEqual(block.subs, [])
    })

    test('should not use subs if subs option passed to block constructor is empty array', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph', {
        source: '*bold* _italic_',
        subs: [],
        attributes: { subs: 'quotes' },
      })
      assert.deepEqual(block.subs, [])
      block.commitSubs()
      assert.deepEqual(block.subs, [])
    })

    test('should use subs from subs option passed to block constructor', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph', {
        source: '*bold* _italic_',
        subs: ['specialcharacters'],
        attributes: { subs: 'quotes' },
      })
      assert.deepEqual(block.subs, ['specialcharacters'])
      block.commitSubs()
      assert.deepEqual(block.subs, ['specialcharacters'])
    })

    test('should use subs from subs attribute if subs option is not passed to block constructor', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph', {
        source: '*bold* _italic_',
        attributes: { subs: 'quotes' },
      })
      assert.deepEqual(block.subs, [])
      // in this case, we have to call commitSubs to resolve the subs
      block.commitSubs()
      assert.deepEqual(block.subs, ['quotes'])
    })

    test('should use subs from subs attribute if subs option passed to block constructor is :default', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph', {
        source: '*bold* _italic_',
        subs: 'default',
        attributes: { subs: 'quotes' },
      })
      assert.deepEqual(block.subs, ['quotes'])
      block.commitSubs()
      assert.deepEqual(block.subs, ['quotes'])
    })

    test('should use built-in subs if subs option passed to block constructor is :default and subs attribute is absent', async () => {
      const doc = await emptyDocument()
      const block = new Block(doc, 'paragraph', {
        source: '*bold* _italic_',
        subs: 'default',
      })
      assert.deepEqual(block.subs, [
        'specialcharacters',
        'quotes',
        'attributes',
        'replacements',
        'macros',
        'post_replacements',
      ])
      block.commitSubs()
      assert.deepEqual(block.subs, [
        'specialcharacters',
        'quotes',
        'attributes',
        'replacements',
        'macros',
        'post_replacements',
      ])
    })
  })
})
