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
  assert.ok(
    !doc.getAttribute('docfile'),
    'docfile should not be set for string input'
  )
})

test('load input string array', async () => {
  const input = ['Document Title', '==============', '', 'preamble']
  const doc = await load(input, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
})

test('load with attributes as space-separated string', async () => {
  const doc = await load('text', {
    safe: 'safe',
    attributes: 'toc numbered sectanchors',
  })
  assert.equal(doc.getAttribute('toc'), '')
  assert.equal(doc.getAttribute('numbered'), '')
  assert.equal(doc.getAttribute('sectanchors'), '')
})

test('load with attributes as key=value string', async () => {
  const doc = await load('text', {
    safe: 'safe',
    attributes: 'toc-placement=auto icons=font source-highlighter=highlight.js',
  })
  assert.equal(doc.getAttribute('toc-placement'), 'auto')
  assert.equal(doc.getAttribute('icons'), 'font')
  assert.equal(doc.getAttribute('source-highlighter'), 'highlight.js')
})

test('load input file via loadFile', async () => {
  const samplePath = join(FIXTURES_DIR, 'sample.adoc')
  const doc = await loadFile(samplePath, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
  assert.equal(doc.getAttribute('docfile'), resolve(samplePath))
  assert.equal(doc.getAttribute('docdir'), dirname(resolve(samplePath)))
  assert.equal(doc.getAttribute('docfilesuffix'), '.adoc')
})
