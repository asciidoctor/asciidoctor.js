import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { loadFile } from '../src/load.js'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const BASIC_ADOC = join(FIXTURES_DIR, 'basic.adoc')

const defs = {
  docinfo: { head_script: true, meta: false, top_link: false, footer_script: true, navbar: true },
  'docinfo=private': { head_script: true, meta: false, top_link: false, footer_script: true, navbar: true },
  docinfo1: { head_script: false, meta: true, top_link: true, footer_script: false, navbar: false },
  'docinfo=shared': { head_script: false, meta: true, top_link: true, footer_script: false, navbar: false },
  docinfo2: { head_script: true, meta: true, top_link: true, footer_script: true, navbar: true },
  'docinfo docinfo2': { head_script: true, meta: true, top_link: true, footer_script: true, navbar: true },
  'docinfo=private,shared': { head_script: true, meta: true, top_link: true, footer_script: true, navbar: true },
  'docinfo=private-head': { head_script: true, meta: false, top_link: false, footer_script: false, navbar: false },
  'docinfo=private-header': { head_script: false, meta: false, top_link: false, footer_script: false, navbar: true },
  'docinfo=shared-head': { head_script: false, meta: true, top_link: false, footer_script: false, navbar: false },
  'docinfo=private-footer': { head_script: false, meta: false, top_link: false, footer_script: true, navbar: false },
  'docinfo=shared-footer': { head_script: false, meta: false, top_link: true, footer_script: false, navbar: false },
  'docinfo=private-head,shared-footer': { head_script: true, meta: false, top_link: true, footer_script: false, navbar: false },
}

describe('Docinfo files', () => {
  for (const [key, markup] of Object.entries(defs)) {
    test(`should include docinfo files for html backend with attribute ${key}`, async () => {
      const extraAttrs = {}
      for (const part of key.split(' ')) {
        const [k, v] = part.split('=')
        extraAttrs[k] = v !== undefined ? v : ''
      }
      const doc = await loadFile(BASIC_ADOC, {
        safe: 'safe',
        standalone: true,
        attributes: { linkcss: '', 'copycss!': '', ...extraAttrs },
      })
      const html = await doc.convert()

      if (markup.head_script) {
        assert.ok(html.includes('<script src="modernizr.js"></script>'), `Expected head script in:\n${html}`)
      } else {
        assert.ok(!html.includes('<script src="modernizr.js"></script>'), `Did not expect head script in:\n${html}`)
      }

      if (markup.meta) {
        assert.ok(html.includes('<meta http-equiv="imagetoolbar" content="false">'), `Expected meta in:\n${html}`)
      } else {
        assert.ok(!html.includes('<meta http-equiv="imagetoolbar" content="false">'), `Did not expect meta in:\n${html}`)
      }

      if (markup.top_link) {
        assert.ok(html.includes('<a id="top" href="#">Back to top</a>'), `Expected top link in:\n${html}`)
      } else {
        assert.ok(!html.includes('<a id="top" href="#">Back to top</a>'), `Did not expect top link in:\n${html}`)
      }

      if (markup.footer_script) {
        assert.ok(
          html.includes("var p1 = document.createElement('script'); p1.async = true; p1.src = 'https://apis.google.com/js/plusone.js';"),
          `Expected footer script in:\n${html}`
        )
      } else {
        assert.ok(
          !html.includes("var p1 = document.createElement('script'); p1.async = true; p1.src = 'https://apis.google.com/js/plusone.js';"),
          `Did not expect footer script in:\n${html}`
        )
      }

      if (markup.navbar) {
        assert.ok(html.includes('<nav class="navbar">'), `Expected navbar in:\n${html}`)
        assert.ok(html.includes('</nav>\n<div id="header">'), `Expected navbar closing in:\n${html}`)
      } else {
        assert.ok(!html.includes('<nav class="navbar">'), `Did not expect navbar in:\n${html}`)
      }
    })
  }
})