// ESM conversion of substitutions_test.rb — Dispatcher context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { blockFromString } from './harness.js'

// ── Substitutions — Dispatcher ────────────────────────────────────────────────

describe('Substitutions', () => {
  describe('Dispatcher', () => {
    test('apply normal substitutions', async () => {
      const para = await blockFromString(
        '[blue]_http://asciidoc.org[AsciiDoc]_ & [red]*Ruby*\n&#167; Making +++<u>documentation</u>+++ together +\nsince (C) {inception_year}.'
      )
      para.document.attributes.inception_year = '2012'
      const result = await para.applySubs(para.source)
      assert.equal(
        result,
        '<em class="blue"><a href="http://asciidoc.org">AsciiDoc</a></em> &amp; <strong class="red">Ruby</strong>\n&#167; Making <u>documentation</u> together<br>\nsince &#169; 2012.'
      )
    })

    test('apply_subs should not modify string directly', async () => {
      const input = '<html> -- the root of all web'
      const para = await blockFromString(input)
      const paraSource = para.source
      const result = await para.applySubs(paraSource)
      assert.equal(
        result,
        '&lt;html&gt;&#8201;&#8212;&#8201;the root of all web'
      )
      assert.equal(paraSource, input)
    })

    test('should not drop trailing blank lines when performing substitutions', async () => {
      const para = await blockFromString(
        '[%hardbreaks]\nthis\nis\n-> {program}'
      )
      para.lines.push('')
      para.lines.push('')
      para.document.attributes.program = 'Asciidoctor'
      let result = await para.applySubs(para.lines)
      assert.deepEqual(result, [
        'this<br>',
        'is<br>',
        '&#8594; Asciidoctor<br>',
        '<br>',
        '',
      ])
      result = await para.applySubs(para.lines.join('\n'))
      assert.equal(result, 'this<br>\nis<br>\n&#8594; Asciidoctor<br>\n<br>\n')
    })

    test('should expand subs passed to expandSubs', async () => {
      const para = await blockFromString('{program}\n*bold*\n2 > 1')
      para.document.attributes.program = 'Asciidoctor'
      assert.deepEqual(para.expandSubs(['specialchars']), ['specialcharacters'])
      assert.ok(!para.expandSubs(['none']))
      assert.deepEqual(para.expandSubs(['normal']), [
        'specialcharacters',
        'quotes',
        'attributes',
        'replacements',
        'macros',
        'post_replacements',
      ])
    })

    test('apply_subs should allow the subs argument to be null', async () => {
      const block = await blockFromString('[pass]\n*raw*')
      const result = await block.applySubs(block.source, null)
      assert.equal(result, '*raw*')
    })
  })
})
