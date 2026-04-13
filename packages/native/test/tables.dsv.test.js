// ESM conversion of tables_test.rb — context 'Tables' > context 'DSV'
// Covers: simple DSV table, DSV shorthand, single cell, trailing colon

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { assertCss, assertXpath, countXpath } from './helpers.js'

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())

// ── Tables › DSV ──────────────────────────────────────────────────────────────

describe('Tables', () => {
  describe('DSV', () => {
    test('converts simple dsv table', async () => {
      const input = `[width="75%",format="dsv"]
|===
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
mysql:x:27:27:MySQL\\:Server:/var/lib/mysql:/bin/bash
gdm:x:42:42::/var/lib/gdm:/sbin/nologin
sshd:x:74:74:Privilege-separated SSH:/var/empty/sshd:/sbin/nologin
nobody:x:99:99:Nobody:/:/sbin/nologin
|===`
      const doc = await documentFromString(input, { standalone: false })
      const table = doc.blocks[0]
      const sum = table.columns.map((col) => col.attributes['colpcwidth']).reduce((a, b) => a + b, 0)
      assert.equal(sum, 100)
      const output = doc.convert()
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col[width="14.2857%"]', 6)
      assertCss(output, 'table > colgroup > col:last-of-type[width="14.2858%"]', 1)
      assertCss(output, 'table > tbody > tr', 6)
      assertXpath(output, '//tr[4]/td[5]/p/text()', 0)
      assertXpath(output, '//tr[3]/td[5]/p[text()="MySQL:Server"]', 1)
    })

    test('dsv format shorthand', async () => {
      const input = `:===
a:b:c
1:2:3
:===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 3)
      assertCss(output, 'table > tbody > tr', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 3)
      assertCss(output, 'table > tbody > tr:nth-child(2) > td', 3)
    })

    test('single cell in DSV table should only produce single row', async () => {
      const input = `:===
single cell
:===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table td', 1)
    })

    test('should treat trailing colon as an empty cell', async () => {
      const input = `:===
A1:
B1:B2
C1:C2
:===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 3)
      assertXpath(output, '/table/tbody/tr[1]/td', 2)
      assertXpath(output, '/table/tbody/tr[1]/td[1]/p[text()="A1"]', 1)
      assertXpath(output, '/table/tbody/tr[1]/td[2]/p', 0)
      assertXpath(output, '/table/tbody/tr[2]/td[1]/p[text()="B1"]', 1)
    })
  })
})
