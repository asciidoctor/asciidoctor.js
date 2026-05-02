// ESM conversion of substitutions_test.rb — Replacements context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { blockFromString } from './harness.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const load_ = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertInlineString = async (input, opts = {}) =>
  (await load_(input, { doctype: 'inline', ...opts })).convert()

// ── Substitutions — Replacements ──────────────────────────────────────────────

describe('Substitutions', () => {
  describe('Replacements', () => {
    test('unescapes XML entities', async () => {
      const para = await blockFromString('< &quot; &there4; &#34; &#x22; >')
      assert.equal(
        await para.applySubs(para.source),
        '&lt; &quot; &there4; &#34; &#x22; &gt;'
      )
    })

    test('replaces arrows', async () => {
      const para = await blockFromString('<- -> <= => \\<- \\-> \\<= \\=>')
      assert.equal(
        await para.applySubs(para.source),
        '&#8592; &#8594; &#8656; &#8658; &lt;- -&gt; &lt;= =&gt;'
      )
    })

    test('replaces dashes', async () => {
      const input = [
        '-- foo foo--bar foo\\--bar foo -- bar foo \\-- bar',
        'stuff in between',
        '-- foo',
        'stuff in between',
        'foo --',
        'stuff in between',
        'foo --',
      ].join('\n')
      const expected = [
        '&#8201;&#8212;&#8201;foo foo&#8212;&#8203;bar foo--bar foo&#8201;&#8212;&#8201;bar foo -- bar',
        'stuff in between&#8201;&#8212;&#8201;foo',
        'stuff in between',
        'foo&#8201;&#8212;&#8201;stuff in between',
        'foo&#8201;&#8212;&#8201;',
      ].join('\n')
      const para = await blockFromString(input)
      assert.equal(para.subReplacements(para.source), expected)
    })

    test('replaces dashes between multibyte word characters', async () => {
      const para = await blockFromString('富--巴')
      assert.equal(para.subReplacements(para.source), '富&#8212;&#8203;巴')
    })

    test('replaces marks', async () => {
      const para = await blockFromString('(C) (R) (TM) \\(C) \\(R) \\(TM)')
      assert.equal(
        para.subReplacements(para.source),
        '&#169; &#174; &#8482; (C) (R) (TM)'
      )
    })

    test('preserves entity references', async () => {
      const input = '&amp; &#169; &#10004; &#128512; &#x2022; &#x1f600;'
      const result = await convertInlineString(input)
      assert.equal(result, input)
    })

    test('only preserves named entities with two or more letters', async () => {
      const input = '&amp; &a; &gt;'
      const result = await convertInlineString(input)
      assert.equal(result, '&amp; &amp;a; &gt;')
    })

    test('replaces punctuation', async () => {
      const para = await blockFromString(
        "John's Hideout is the Whites`' place... foo\\'bar"
      )
      assert.equal(
        para.subReplacements(para.source),
        "John&#8217;s Hideout is the Whites&#8217; place&#8230;&#8203; foo'bar"
      )
    })

    test('should replace right single quote marks', async () => {
      const given = [
        "`'Twas the night",
        "a `'57 Chevy!",
        "the whites`' place",
        "the whites`'.",
        "the whites`'--where the wild things are",
        "the whites`'\nhave",
        "It's Mary`'s little lamb.",
        "consecutive single quotes '' are not modified",
        "he is 6' tall",
        "\\`'",
      ]
      const expected = [
        '&#8217;Twas the night',
        'a &#8217;57 Chevy!',
        'the whites&#8217; place',
        'the whites&#8217;.',
        'the whites&#8217;--where the wild things are',
        'the whites&#8217;\nhave',
        'It&#8217;s Mary&#8217;s little lamb.',
        "consecutive single quotes '' are not modified",
        "he is 6' tall",
        "`'",
      ]
      for (let i = 0; i < given.length; i++) {
        const para = await blockFromString(given[i])
        assert.equal(para.subReplacements(para.source), expected[i])
      }
    })
  })
})
