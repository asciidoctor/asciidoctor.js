// ESM conversion of substitutions_test.rb — Post replacements context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { blockFromString } from './harness.js'

// ── Substitutions — Post replacements ────────────────────────────────────────

describe('Substitutions', () => {
  describe('Post replacements', () => {
    test('line break inserted after line with line break character', async () => {
      const para = await blockFromString('First line +\nSecond line')
      const result = await para.applySubs(para.lines, para.expandSubs('post_replacements'))
      assert.equal(result[0], 'First line<br>')
    })

    test('line break inserted after line wrap with hardbreaks enabled', async () => {
      const para = await blockFromString('First line\nSecond line', { attributes: { hardbreaks: '' } })
      const result = await para.applySubs(para.lines, para.expandSubs('post_replacements'))
      assert.equal(result[0], 'First line<br>')
    })

    test('line break character stripped from end of line with hardbreaks enabled', async () => {
      const para = await blockFromString('First line +\nSecond line', { attributes: { hardbreaks: '' } })
      const result = await para.applySubs(para.lines, para.expandSubs('post_replacements'))
      assert.equal(result[0], 'First line<br>')
    })

    test('line break not inserted for single line with hardbreaks enabled', async () => {
      const para = await blockFromString('First line', { attributes: { hardbreaks: '' } })
      const result = await para.applySubs(para.lines, para.expandSubs('post_replacements'))
      assert.equal(result[0], 'First line')
    })
  })
})
