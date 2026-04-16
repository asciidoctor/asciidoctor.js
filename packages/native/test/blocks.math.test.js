import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { load } from '../src/load.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage, decodeChar } from './helpers.js'

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertString = (input, opts = {}) => documentFromString(input, { standalone: true, ...opts }).then((doc) => doc.convert())
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())
const blockFromString = async (input, opts = {}) => (await documentFromString(input, opts)).blocks[0]

describe('Blocks', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Math blocks', () => {
    test('should not crash when converting stem block that has no lines', async () => {
      const input = `[stem]
++++
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
    })

    test('should return content as empty string for stem or pass block that has no lines', async () => {
      for (const input of ['++++\n++++', '[stem]\n++++\n++++']) {
        const doc = await documentFromString(input)
        assert.equal(await doc.blocks[0].content(), '')
      }
    })

    test('should add LaTeX math delimiters around latexmath block content', async () => {
      const input = `[latexmath]
++++
\\sqrt{3x-1}+(1+x)^2 < y
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
      // assert.equal(nodes.first.to_s.strip, '\\[\\sqrt{3x-1}+(1+x)^2 &lt; y\\]')
    })

    test('should not add LaTeX math delimiters around latexmath block content if already present', async () => {
      const input = `[latexmath]
++++
\\[\\sqrt{3x-1}+(1+x)^2 < y\\]
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
      // assert.equal(nodes.first.to_s.strip, '\\[\\sqrt{3x-1}+(1+x)^2 &lt; y\\]')
    })

    test('should display latexmath block in alt of equation in DocBook backend', async () => {
      const input = `[latexmath]
++++
\\sqrt{3x-1}+(1+x)^2 < y
++++`

      const expect = `<informalequation>
<alt><![CDATA[\\sqrt{3x-1}+(1+x)^2 < y]]></alt>
<mathphrase><![CDATA[\\sqrt{3x-1}+(1+x)^2 < y]]></mathphrase>
</informalequation>`

      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assert.equal(output.trim(), expect.trim())
    })

    test('should set autoNumber option for latexmath to none by default', async () => {
      const input = `:stem: latexmath

[stem]
++++
y = x^2
++++`

      const output = await convertString(input)
      assert.ok(output.includes('TeX: { equationNumbers: { autoNumber: "none" } }'))
    })

    test('should set autoNumber option for latexmath to none if eqnums is set to none', async () => {
      const input = `:stem: latexmath
:eqnums: none

[stem]
++++
y = x^2
++++`

      const output = await convertString(input)
      assert.ok(output.includes('TeX: { equationNumbers: { autoNumber: "none" } }'))
    })

    test('should set autoNumber option for latexmath to AMS if eqnums is set', async () => {
      const input = `:stem: latexmath
:eqnums:

[stem]
++++
\\begin{equation}
y = x^2
\\end{equation}
++++`

      const output = await convertString(input)
      assert.ok(output.includes('TeX: { equationNumbers: { autoNumber: "AMS" } }'))
    })

    test('should set autoNumber option for latexmath to all if eqnums is set to all', async () => {
      const input = `:stem: latexmath
:eqnums: all

[stem]
++++
y = x^2
++++`

      const output = await convertString(input)
      assert.ok(output.includes('TeX: { equationNumbers: { autoNumber: "all" } }'))
    })

    test('should not split equation in AsciiMath block at single newline', async () => {
      const input = `[asciimath]
++++
f: bbb"N" -> bbb"N"
f: x |-> x + 1
++++`
      const expected = `\\$f: bbb"N" -&gt; bbb"N"
f: x |-&gt; x + 1\\$`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]', output
      // assert.equal(nodes.first.inner_html.strip, expected)
    })

    test('should split equation in AsciiMath block at escaped newline', async () => {
      const input = `[asciimath]
++++
f: bbb"N" -> bbb"N" \\
f: x |-> x + 1
++++`
      const expected = `\\$f: bbb"N" -&gt; bbb"N"\\$
\\$f: x |-&gt; x + 1\\$`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]', output
      // assert.equal(nodes.first.inner_html.strip, expected)
    })

    test('should split equation in AsciiMath block at sequence of escaped newlines', async () => {
      const input = `[asciimath]
++++
f: bbb"N" -> bbb"N" \\
\\
f: x |-> x + 1
++++`
      const expected = `\\$f: bbb"N" -&gt; bbb"N"\\$
<br>
\\$f: x |-&gt; x + 1\\$`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]', output
      // assert.equal(nodes.first.inner_html.strip, expected)
    })

    test('should split equation in AsciiMath block at newline sequence and preserve breaks', async () => {
      const input = `[asciimath]
++++
f: bbb"N" -> bbb"N"


f: x |-> x + 1
++++`
      const expected = `\\$f: bbb"N" -&gt; bbb"N"\\$
<br>
<br>
\\$f: x |-&gt; x + 1\\$`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]', output
      // assert.equal(nodes.first.inner_html.strip, expected)
    })

    test('should add AsciiMath delimiters around asciimath block content', async () => {
      const input = `[asciimath]
++++
sqrt(3x-1)+(1+x)^2 < y
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
      // assert.equal(nodes.first.to_s.strip, '\\$sqrt(3x-1)+(1+x)^2 &lt; y\\$')
    })

    test('should not add AsciiMath delimiters around asciimath block content if already present', async () => {
      const input = `[asciimath]
++++
\\$sqrt(3x-1)+(1+x)^2 < y\\$
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
      // assert.equal(nodes.first.to_s.strip, '\\$sqrt(3x-1)+(1+x)^2 &lt; y\\$')
    })

    test('should convert contents of asciimath block to MathML in DocBook output if asciimath gem is available', async () => {
      // TODO: This test depends on the asciimath gem being available (Ruby-specific).
      // In JS, asciimath conversion to MathML would require a separate library.
      // Skipping the conditional asciimath availability check.
      const input = `[asciimath]
++++
x+b/(2a)<+-sqrt((b^2)/(4a^2)-c/a)
++++

[asciimath]
++++
++++`

      const doc = await documentFromString(input, { backend: 'docbook', standalone: false })
      const actual = await doc.convert()
      // TODO: assert MathML output when asciimath library is available in JS
    })

    test('should output title for latexmath block if defined', async () => {
      const input = `.The Lorenz Equations
[latexmath]
++++
\\begin{aligned}
\\dot{x} & = \\sigma(y-x) \\\\
\\dot{y} & = \\rho x - y - xz \\\\
\\dot{z} & = -\\beta z + xy
\\end{aligned}
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      assertCss(output, '.stemblock .title', 1)
      assertXpath(output, '//*[@class="title"][text()="The Lorenz Equations"]', 1)
    })

    test('should output title for asciimath block if defined', async () => {
      const input = `.Simple fraction
[asciimath]
++++
a//b
++++`

      const output = await convertStringToEmbedded(input)
      assertCss(output, '.stemblock', 1)
      assertCss(output, '.stemblock .title', 1)
      assertXpath(output, '//*[@class="title"][text()="Simple fraction"]', 1)
    })

    test('should add AsciiMath delimiters around stem block content if stem attribute is asciimath, empty, or not set', async () => {
      const input = `[stem]
++++
sqrt(3x-1)+(1+x)^2 < y
++++`

      for (const attributes of [
        {},
        { stem: '' },
        { stem: 'asciimath' },
        { stem: 'bogus' },
      ]) {
        const output = await convertStringToEmbedded(input, { attributes })
        assertCss(output, '.stemblock', 1)
        // TODO: needs DOM parser
        // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
        // assert.equal(nodes.first.to_s.strip, '\\$sqrt(3x-1)+(1+x)^2 &lt; y\\$')
      }
    })

    test('should add LaTeX math delimiters around stem block content if stem attribute is latexmath, latex, or tex', async () => {
      const input = `[stem]
++++
\\sqrt{3x-1}+(1+x)^2 < y
++++`

      for (const attributes of [
        { stem: 'latexmath' },
        { stem: 'latex' },
        { stem: 'tex' },
      ]) {
        const output = await convertStringToEmbedded(input, { attributes })
        assertCss(output, '.stemblock', 1)
        // TODO: needs DOM parser
        // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
        // assert.equal(nodes.first.to_s.strip, '\\[\\sqrt{3x-1}+(1+x)^2 &lt; y\\]')
      }
    })

    test('should allow stem style to be set using second positional argument of block attributes', async () => {
      const input = `:stem: latexmath

[stem,asciimath]
++++
sqrt(3x-1)+(1+x)^2 < y
++++`

      const doc = await documentFromString(input)
      const stemblock = doc.blocks[0]
      assert.equal(stemblock.context, 'stem')
      assert.equal(stemblock.attributes['style'], 'asciimath')
      const output = await doc.convert({ standalone: false })
      assertCss(output, '.stemblock', 1)
      // TODO: needs DOM parser
      // nodes = xmlnodes_at_xpath '//*[@class="content"]/child::text()', output
      // assert.equal(nodes.first.to_s.strip, '\\$sqrt(3x-1)+(1+x)^2 &lt; y\\$')
    })
  })
})
