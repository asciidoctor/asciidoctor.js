import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

import { load, loadFile } from '../src/load.js'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), './fixtures')

test('load input string', async () => {
  const input = `Document Title
==============

preamble`
  const doc = await load(input, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
  assert.ok(!doc.attr('docfile'), 'docfile should not be set for string input')
})

test('load input string array', async () => {
  const input = [
    'Document Title',
    '==============',
    '',
    'preamble',
  ]
  const doc = await load(input, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
})

test('load input file via loadFile', async () => {
  const samplePath = join(FIXTURES_DIR, 'sample.adoc')
  const doc = await loadFile(samplePath, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
  assert.equal(doc.attr('docfile'), resolve(samplePath))
  assert.equal(doc.attr('docdir'), dirname(resolve(samplePath)))
  assert.equal(doc.attr('docfilesuffix'), '.adoc')
})
