// ESM conversion of substitutions_test.rb — Passthroughs context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { PASS_START, PASS_END } from '../src/substitutors.js'
import { assertMessage, usingMemoryLogger } from './helpers.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BACKSLASH = '\\'

const load_ = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const blockFromString = async (input, opts = {}) => (await load_(input, opts)).blocks[0]
const convertStringToEmbedded = async (input, opts = {}) => (await load_(input, opts)).convert()
const convertInlineString = async (input, opts = {}) => (await load_(input, { doctype: 'inline', ...opts })).convert()

// ── Substitutions — Passthroughs ──────────────────────────────────────────────

describe('Substitutions', () => {
  describe('Passthroughs', () => {
    test('collect inline triple plus passthroughs', async () => {
      const para = await blockFromString('+++<code>inline code</code>+++')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, '<code>inline code</code>')
      assert.deepEqual(passthroughs[0].subs, [])
    })

    test('collect multi-line inline triple plus passthroughs', async () => {
      const para = await blockFromString('+++<code>inline\ncode</code>+++')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, '<code>inline\ncode</code>')
      assert.deepEqual(passthroughs[0].subs, [])
    })

    test('collect inline double dollar passthroughs', async () => {
      const para = await blockFromString('$$<code>{code}</code>$$')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, '<code>{code}</code>')
      assert.deepEqual(passthroughs[0].subs, ['specialcharacters'])
    })

    test('collect inline double plus passthroughs', async () => {
      const para = await blockFromString('++<code>{code}</code>++')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, '<code>{code}</code>')
      assert.deepEqual(passthroughs[0].subs, ['specialcharacters'])
    })

    test("should not crash if role on passthrough is enclosed in quotes", async () => {
      for (const input of [
        `['role']${BACKSLASH}++This++++++++++++`,
        `['role']${BACKSLASH}+++++++++This++++++++++++`,
      ]) {
        const para = await blockFromString(input)
        assert.ok(para.content.includes("<span class=\"'role'\">"))
      }
    })

    test('should allow inline double plus passthrough to be escaped using backslash', async () => {
      const para = await blockFromString(`you need to replace \`int a = n${BACKSLASH}++;\` with \`int a = ++n;\`!`)
      const result = para.applySubs(para.source)
      assert.equal(result, 'you need to replace <code>int a = n++;</code> with <code>int a = ++n;</code>!')
    })

    test('should allow inline double plus passthrough with attributes to be escaped using backslash', async () => {
      const para = await blockFromString(`=[attrs]${BACKSLASH.repeat(2)}++text++`)
      const result = para.applySubs(para.source)
      assert.equal(result, '=[attrs]++text++')
    })

    test('collect multi-line inline double dollar passthroughs', async () => {
      const para = await blockFromString('$$<code>\n{code}\n</code>$$')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, '<code>\n{code}\n</code>')
      assert.deepEqual(passthroughs[0].subs, ['specialcharacters'])
    })

    test('collect multi-line inline double plus passthroughs', async () => {
      const para = await blockFromString('++<code>\n{code}\n</code>++')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, '<code>\n{code}\n</code>')
      assert.deepEqual(passthroughs[0].subs, ['specialcharacters'])
    })

    test('collect passthroughs from inline pass macro', async () => {
      const para = await blockFromString("pass:specialcharacters,quotes[<code>['code'\\]</code>]")
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, "<code>['code']</code>")
      assert.deepEqual(passthroughs[0].subs, ['specialcharacters', 'quotes'])
    })

    test('collect multi-line passthroughs from inline pass macro', async () => {
      const para = await blockFromString("pass:specialcharacters,quotes[<code>['more\ncode'\\]</code>]")
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(result, `${PASS_START}0${PASS_END}`)
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, "<code>['more\ncode']</code>")
      assert.deepEqual(passthroughs[0].subs, ['specialcharacters', 'quotes'])
    })

    test('should find and replace placeholder duplicated by substitution', async () => {
      const input = '+first passthrough+ followed by link:$$http://example.com/__u_no_format_me__$$[] with passthrough'
      const result = await convertInlineString(input)
      assert.equal(result, 'first passthrough followed by <a href="http://example.com/__u_no_format_me__" class="bare">http://example.com/__u_no_format_me__</a> with passthrough')
    })

    test('resolves sub shorthands on inline pass macro', async () => {
      const para = await blockFromString('pass:q,a[*<{backend}>*]')
      let result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(passthroughs.length, 1)
      assert.deepEqual(passthroughs[0].subs, ['quotes', 'attributes'])
      result = para.restorePassthroughs(result)
      assert.equal(result, '<strong><html5></strong>')
    })

    test('inline pass macro supports incremental subs', async () => {
      const para = await blockFromString('pass:n,-a[<{backend}>]')
      let result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(passthroughs.length, 1)
      result = para.restorePassthroughs(result)
      assert.equal(result, '&lt;{backend}&gt;')
    })

    test('should not recognize pass macro with invalid substitution list', async () => {
      for (const subs of [',', '42', 'a,']) {
        const para = await blockFromString(`pass:${subs}[foobar]`)
        const result = para.extractPassthroughs(para.source)
        assert.equal(result, `pass:${subs}[foobar]`)
      }
    })

    test('should warn if substitutions on pass macro are invalid', async () => {
      const subs = 'bogus'
      const input = `pass:${subs}[++]`
      await usingMemoryLogger(async (logger) => {
        const para = await blockFromString(input, { attributes: { stem: 'asciimath' } })
        assert.equal(para.content, '++')
        assertMessage(logger, 'WARN', `invalid substitution type for passthrough macro: ${subs}`)
      })
    })

    test('should allow content of inline pass macro to be empty', async () => {
      const para = await blockFromString('pass:[]')
      const result = para.extractPassthroughs(para.source)
      const passthroughs = para.passthroughs
      assert.equal(passthroughs.length, 1)
      assert.equal(para.restorePassthroughs(result), '')
    })

    // NOTE placeholder is surrounded by text to prevent reader from stripping trailing boundary char (unique to test scenario)
    test('restore inline passthroughs without subs', async () => {
      const para = await blockFromString(`some ${PASS_START}0${PASS_END} to study`)
      para.extractPassthroughs('')
      const passthroughs = para.passthroughs
      passthroughs[0] = { text: '<code>inline code</code>', subs: [] }
      const result = para.restorePassthroughs(para.source)
      assert.equal(result, 'some <code>inline code</code> to study')
    })

    // NOTE placeholder is surrounded by text to prevent reader from stripping trailing boundary char (unique to test scenario)
    test('restore inline passthroughs with subs', async () => {
      const para = await blockFromString(`some ${PASS_START}0${PASS_END} to study in the ${PASS_START}1${PASS_END} programming language`)
      para.extractPassthroughs('')
      const passthroughs = para.passthroughs
      passthroughs[0] = { text: '<code>{code}</code>', subs: ['specialcharacters'] }
      passthroughs[1] = { text: '{language}', subs: ['specialcharacters'] }
      const result = para.restorePassthroughs(para.source)
      assert.equal(result, 'some &lt;code&gt;{code}&lt;/code&gt; to study in the {language} programming language')
    })

    test('should restore nested passthroughs', async () => {
      const result = await convertInlineString("+Sometimes you feel pass:q[`mono`].+ Sometimes you +$$don't$$+.")
      assert.equal(result, "Sometimes you feel <code>mono</code>. Sometimes you don't.")
    })

    test('should not fail to restore remaining passthroughs after processing inline passthrough with macro substitution', async () => {
      const input = 'pass:m[.] pass:[.]'
      assert.equal(await convertInlineString(input), '. .')
    })

    test('should honor role on double plus passthrough', async () => {
      const result = await convertInlineString('Print the version using [var]++{asciidoctor-version}++.')
      assert.equal(result, 'Print the version using <span class="var">{asciidoctor-version}</span>.')
    })

    test('complex inline passthrough macro', async () => {
      const textToEscape = "[(] <'basic form'> <'logical operator'> <'basic form'> [)]"
      let para = await blockFromString(`$$${textToEscape}$$`)
      para.extractPassthroughs(para.source)
      let passthroughs = para.passthroughs
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, textToEscape)

      const textToEscapeEscaped = "[(\\] <'basic form'> <'logical operator'> <'basic form'> [)\\]"
      para = await blockFromString(`pass:specialcharacters[${textToEscapeEscaped}]`)
      para.extractPassthroughs(para.source)
      passthroughs = para.passthroughs
      assert.equal(passthroughs.length, 1)
      assert.equal(passthroughs[0].text, textToEscape)
    })

    test('inline pass macro with a composite sub', async () => {
      const para = await blockFromString('pass:verbatim[<{backend}>]')
      assert.equal(para.content, '&lt;{backend}&gt;')
    })

    test('should support constrained passthrough in middle of monospace span', async () => {
      const para = await blockFromString('a `foo +bar+ baz` kind of thing')
      assert.equal(para.content, 'a <code>foo bar baz</code> kind of thing')
    })

    test('should support constrained passthrough in monospace span preceded by escaped boxed attrlist with transitional role', async () => {
      const para = await blockFromString(`${BACKSLASH}[x-]\`foo +bar+ baz\``)
      assert.equal(para.content, '[x-]<code>foo bar baz</code>')
    })

    test('should treat monospace phrase with escaped boxed attrlist with transitional role as monospace', async () => {
      const para = await blockFromString(`${BACKSLASH}[x-]\`*foo* +bar+ baz\``)
      assert.equal(para.content, '[x-]<code><strong>foo</strong> bar baz</code>')
    })

    test('should ignore escaped attrlist with transitional role on monospace phrase if not proceeded by [', async () => {
      const para = await blockFromString(`${BACKSLASH}x-]\`*foo* +bar+ baz\``)
      assert.equal(para.content, `${BACKSLASH}x-]<code><strong>foo</strong> bar baz</code>`)
    })

    test('should not process passthrough inside transitional literal monospace span', async () => {
      const para = await blockFromString('a [x-]`foo +bar+ baz` kind of thing')
      assert.equal(para.content, 'a <code>foo +bar+ baz</code> kind of thing')
    })

    test('should support constrained passthrough in monospace phrase with attrlist', async () => {
      const para = await blockFromString('[.role]`foo +bar+ baz`')
      assert.equal(para.content, '<code class="role">foo bar baz</code>')
    })

    test('should support attrlist on a literal monospace phrase', async () => {
      const para = await blockFromString('[.baz]`+foo--bar+`')
      assert.equal(para.content, '<code class="baz">foo--bar</code>')
    })

    test('should not process an escaped passthrough macro inside a monospaced phrase', async () => {
      const para = await blockFromString('use the `\\pass:c[]` macro')
      assert.equal(para.content, 'use the <code>pass:c[]</code> macro')
    })

    test('should not process an escaped passthrough macro inside a monospaced phrase with attributes', async () => {
      const para = await blockFromString('use the [syntax]`\\pass:c[]` macro')
      assert.equal(para.content, 'use the <code class="syntax">pass:c[]</code> macro')
    })

    test('should honor an escaped single plus passthrough inside a monospaced phrase', async () => {
      const para = await blockFromString('use `\\+{author}+` to show an attribute reference', { attributes: { author: 'Dan' } })
      assert.equal(para.content, 'use <code>+Dan+</code> to show an attribute reference')
    })

    describe('Math macros', () => {
      test('should passthrough text in asciimath macro and surround with AsciiMath delimiters', async () => {
        await usingMemoryLogger(async (logger) => {
          const input = 'asciimath:[x/x={(1,if x!=0),(text{undefined},if x=0):}]'
          const para = await blockFromString(input, { attributes: { 'attribute-missing': 'warn' } })
          assert.equal(para.content, '\\$x/x={(1,if x!=0),(text{undefined},if x=0):}\\$')
          assert.equal(logger.messages.length, 0)
        })
      })

      test('should not recognize asciimath macro with no content', async () => {
        const para = await blockFromString('asciimath:[]')
        assert.equal(para.content, 'asciimath:[]')
      })

      test('should perform specialcharacters subs on asciimath macro content in html backend by default', async () => {
        const para = await blockFromString('asciimath:[a < b]')
        assert.equal(para.content, '\\$a &lt; b\\$')
      })

      test('should honor explicit subslist on asciimath macro', async () => {
        const para = await blockFromString('asciimath:attributes[{expr}]', { attributes: { expr: 'x != 0' } })
        assert.equal(para.content, '\\$x != 0\\$')
      })

      test('should passthrough text in latexmath macro and surround with LaTeX math delimiters', async () => {
        const para = await blockFromString('latexmath:[C = \\alpha + \\beta Y^{\\gamma} + \\epsilon]')
        assert.equal(para.content, '\\(C = \\alpha + \\beta Y^{\\gamma} + \\epsilon\\)')
      })

      test('should strip legacy LaTeX math delimiters around latexmath content if present', async () => {
        const para = await blockFromString('latexmath:[$C = \\alpha + \\beta Y^{\\gamma} + \\epsilon$]')
        assert.equal(para.content, '\\(C = \\alpha + \\beta Y^{\\gamma} + \\epsilon\\)')
      })

      test('should not recognize latexmath macro with no content', async () => {
        const para = await blockFromString('latexmath:[]')
        assert.equal(para.content, 'latexmath:[]')
      })

      test('should unescape escaped square bracket in equation', async () => {
        const para = await blockFromString('latexmath:[\\sqrt[3\\]{x}]')
        assert.equal(para.content, '\\(\\sqrt[3]{x}\\)')
      })

      test('should perform specialcharacters subs on latexmath macro in html backend by default', async () => {
        const para = await blockFromString('latexmath:[a < b]')
        assert.equal(para.content, '\\(a &lt; b\\)')
      })

      test('should not perform specialcharacters subs on latexmath macro content in docbook backend by default', async () => {
        const para = await blockFromString('latexmath:[a < b]', { backend: 'docbook' })
        assert.equal(para.content, '<inlineequation><alt><![CDATA[a < b]]></alt><mathphrase><![CDATA[a < b]]></mathphrase></inlineequation>')
      })

      test('should honor explicit subslist on latexmath macro', async () => {
        const para = await blockFromString('latexmath:attributes[{expr}]', { attributes: { expr: '\\sqrt{4} = 2' } })
        assert.equal(para.content, '\\(\\sqrt{4} = 2\\)')
      })

      test('should passthrough math macro inside another passthrough', async () => {
        let para = await blockFromString('the text `asciimath:[x = y]` should be passed through as +literal+ text', { attributes: { 'compat-mode': '' } })
        assert.equal(para.content, 'the text <code>asciimath:[x = y]</code> should be passed through as <code>literal</code> text')

        para = await blockFromString('the text [x-]`asciimath:[x = y]` should be passed through as `literal` text')
        assert.equal(para.content, 'the text <code>asciimath:[x = y]</code> should be passed through as <code>literal</code> text')

        para = await blockFromString('the text `+asciimath:[x = y]+` should be passed through as `literal` text')
        assert.equal(para.content, 'the text <code>asciimath:[x = y]</code> should be passed through as <code>literal</code> text')
      })

      test('should not recognize stem macro with no content', async () => {
        const para = await blockFromString('stem:[]')
        assert.equal(para.content, 'stem:[]')
      })

      test('should passthrough text in stem macro and surround with AsciiMath delimiters if stem attribute is asciimath, empty, or not set', async () => {
        for (const attributes of [{}, { stem: '' }, { stem: 'asciimath' }, { stem: 'bogus' }]) {
          await usingMemoryLogger(async (logger) => {
            const para = await blockFromString('stem:[x/x={(1,if x!=0),(text{undefined},if x=0):}]', { attributes: { ...attributes, 'attribute-missing': 'warn' } })
            assert.equal(para.content, '\\$x/x={(1,if x!=0),(text{undefined},if x=0):}\\$')
            assert.equal(logger.messages.length, 0)
          })
        }
      })

      test('should passthrough text in stem macro and surround with LaTeX math delimiters if stem attribute is latexmath, latex, or tex', async () => {
        for (const attributes of [{ stem: 'latexmath' }, { stem: 'latex' }, { stem: 'tex' }]) {
          const para = await blockFromString('stem:[C = \\alpha + \\beta Y^{\\gamma} + \\epsilon]', { attributes })
          assert.equal(para.content, '\\(C = \\alpha + \\beta Y^{\\gamma} + \\epsilon\\)')
        }
      })

      test('should apply substitutions specified on stem macro', async () => {
        for (const input of ['stem:c,a[sqrt(x) <=> {solve-for-x}]', 'stem:n,-r[sqrt(x) <=> {solve-for-x}]']) {
          const para = await blockFromString(input, { attributes: { stem: 'asciimath', 'solve-for-x': '13' } })
          assert.equal(para.content, '\\$sqrt(x) &lt;=&gt; 13\\$')
        }
      })

      test('should replace passthroughs inside stem expression', async () => {
        for (const [input, expected] of [
          ['stem:[+1+]', '\\$1\\$'],
          ['stem:[+\\infty-(+\\infty)]', '\\$\\infty-(\\infty)\\$'],
          ['stem:[+++\\infty-(+\\infty)++]', '\\$+\\infty-(+\\infty)\\$'],
        ]) {
          const para = await blockFromString(input, { attributes: { stem: '' } })
          assert.equal(para.content, expected)
        }
      })

      test('should allow passthrough inside stem expression to be escaped', async () => {
        for (const [input, expected] of [
          ['stem:[\\+] and stem:[+]', '\\$+\\$ and \\$+\\$'],
          ['stem:[\\+1+]', '\\$+1+\\$'],
        ]) {
          const para = await blockFromString(input, { attributes: { stem: '' } })
          assert.equal(para.content, expected)
        }
      })

      test('should not recognize stem macro with invalid substitution list', async () => {
        for (const subs of [',', '42', 'a,']) {
          const para = await blockFromString(`stem:${subs}[x^2]`, { attributes: { stem: 'asciimath' } })
          assert.equal(para.content, `stem:${subs}[x^2]`)
        }
      })

      test('should warn if substitutions on stem macro are invalid', async () => {
        const subs = 'bogus'
        const input = `stem:${subs}[x^2]`
        await usingMemoryLogger(async (logger) => {
          const para = await blockFromString(input, { attributes: { stem: 'asciimath' } })
          assert.equal(para.content, '\\$x^2\\$')
          assertMessage(logger, 'WARN', `invalid substitution type for stem macro: ${subs}`)
        })
      })
    })
  })
})