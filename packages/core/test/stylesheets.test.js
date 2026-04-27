// Ported from api_test.rb — context 'Stylesheets'

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertCss } from './helpers.js'
import { convertString } from './harness.js'
import { Stylesheets } from '../src/stylesheets.js'
import { SafeMode } from '../src/constants.js'

const INPUT = `= Document Title

text`

// ── Stylesheets.instance ──────────────────────────────────────────────────────

describe('Stylesheets', () => {
  describe('instance', () => {
    test('primaryStylesheetName returns the default stylesheet name', () => {
      assert.equal(Stylesheets.instance.primaryStylesheetName, 'asciidoctor.css')
    })

    test('primaryStylesheetData returns non-empty CSS content', async () => {
      const css = await Stylesheets.instance.primaryStylesheetData()
      assert.ok(css.length > 0, 'CSS content should not be empty')
      assert.ok(css.includes('Asciidoctor'), 'CSS should contain Asciidoctor attribution')
    })

    test('primaryStylesheetData does not have trailing whitespace', async () => {
      const css = await Stylesheets.instance.primaryStylesheetData()
      assert.equal(css, css.trimEnd(), 'CSS should not have trailing whitespace')
    })

    test('primaryStylesheetData is memoized', async () => {
      const first = await Stylesheets.instance.primaryStylesheetData()
      const second = await Stylesheets.instance.primaryStylesheetData()
      assert.strictEqual(first, second)
    })

    test('embedPrimaryStylesheet wraps CSS in a <style> tag', async () => {
      const embedded = await Stylesheets.instance.embedPrimaryStylesheet()
      assert.ok(embedded.startsWith('<style>\n'), 'should start with <style>')
      assert.ok(embedded.endsWith('\n</style>'), 'should end with </style>')
      const css = await Stylesheets.instance.primaryStylesheetData()
      assert.ok(embedded.includes(css), 'should contain the CSS data')
    })
  })

  // ── Stylesheet embedding in HTML output ──────────────────────────────────────

  describe('HTML output', () => {
    test('should link to default stylesheet by default when safe mode is SECURE or greater', async () => {
      const output = await convertString(INPUT, { safe: 'secure' })
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href^="https://fonts.googleapis.com"]', 1)
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href="./asciidoctor.css"]', 1)
    })

    test('should embed default stylesheet by default if safe mode is less than SECURE', async () => {
      const output = await convertString(INPUT, { safe: SafeMode.SERVER })
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href^="https://fonts.googleapis.com"]', 1)
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href="./asciidoctor.css"]', 0)
      assertCss(output, 'html:root > head > style', 1)
      const styleContent = output.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
      assert.ok(styleContent.trim().length > 0, '<style> content should not be empty')
    })

    test('should not allow linkcss to be unset from document if safe mode is SECURE or greater', async () => {
      const input = `= Document Title
:linkcss!:

text`
      const output = await convertString(input, { safe: 'secure' })
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href^="https://fonts.googleapis.com"]', 1)
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href="./asciidoctor.css"]', 1)
    })

    test('should embed default stylesheet if linkcss is unset from API and safe mode is SECURE or greater', async () => {
      for (const attrs of [{ 'linkcss!': '' }, { linkcss: null }, { linkcss: false }]) {
        const output = await convertString(INPUT, { attributes: attrs })
        assertCss(output, 'html:root > head > link[rel="stylesheet"][href^="https://fonts.googleapis.com"]', 1)
        assertCss(output, 'html:root > head > link[rel="stylesheet"][href="./asciidoctor.css"]', 0)
        assertCss(output, 'html:root > head > style', 1)
        const styleContent = output.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
        assert.ok(styleContent.trim().length > 0, `<style> content should not be empty (attrs: ${JSON.stringify(attrs)})`)
      }
    })

    test('should embed default stylesheet if safe mode is less than SECURE and linkcss is unset from API', async () => {
      const output = await convertString(INPUT, { safe: SafeMode.SAFE, attributes: { 'linkcss!': '' } })
      assertCss(output, 'html:root > head > style', 1)
      const styleContent = output.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
      assert.ok(styleContent.trim().length > 0, '<style> content should not be empty')
    })

    test('should not link to stylesheet if stylesheet attribute is unset', async () => {
      const output = await convertString(INPUT, { attributes: { 'stylesheet!': '' } })
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href^="https://fonts.googleapis.com"]', 0)
      assertCss(output, 'html:root > head > link[rel="stylesheet"]', 0)
    })

    test('should link to custom stylesheet if specified in stylesheet attribute', async () => {
      // SECURE mode forces linkcss so the file is never read from disk
      const output = await convertString(INPUT, { safe: 'secure', attributes: { stylesheet: './custom.css' } })
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href^="https://fonts.googleapis.com"]', 0)
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href="./custom.css"]', 1)

      const output2 = await convertString(INPUT, { safe: 'secure', attributes: { stylesheet: 'file:///home/username/custom.css' } })
      assertCss(output2, 'html:root > head > link[rel="stylesheet"][href="file:///home/username/custom.css"]', 1)
    })

    test('should resolve custom stylesheet relative to stylesdir', async () => {
      // SECURE mode forces linkcss so the file is never read from disk
      const output = await convertString(INPUT, { safe: 'secure', attributes: { stylesheet: 'custom.css', stylesdir: './stylesheets' } })
      assertCss(output, 'html:root > head > link[rel="stylesheet"][href="./stylesheets/custom.css"]', 1)
    })
  })
})