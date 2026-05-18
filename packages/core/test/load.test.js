import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

import { load, loadFile } from '../src/load.js'
import { convert } from '../src/convert.js'

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

test('load source with BOM from Buffer', async () => {
  const content = '= Document Title\n\nPreamble'
  const buffer = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(content, 'utf8'),
  ])
  const doc = await load(buffer, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
  assert.equal(doc.blocks.length, 1)
  const output = await convert(buffer, { safe: 'safe', standalone: false })
  assert.match(output, /<p>Preamble<\/p>/)
  assert.doesNotMatch(output, /﻿|ï»¿/)
})

test('load source with UTF-8 BOM bytes as raw Latin-1 characters', async () => {
  // When content is decoded with Latin-1 / binary encoding, the UTF-8 BOM bytes
  // (0xEF 0xBB 0xBF) appear as three separate characters (ï»¿) rather than U+FEFF.
  const content = '\xEF\xBB\xBF= Document Title\n\nPreamble'
  const doc = await load(content, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
  assert.equal(doc.blocks.length, 1)
  const output = await convert(content, { safe: 'safe', standalone: false })
  assert.match(output, /<p>Preamble<\/p>/)
  assert.doesNotMatch(output, /﻿|ï»¿/)
})

test('load input file via loadFile', async () => {
  const samplePath = join(FIXTURES_DIR, 'sample.adoc')
  const doc = await loadFile(samplePath, { safe: 'safe' })
  assert.equal(doc.doctitle(), 'Document Title')
  assert.equal(doc.getAttribute('docfile'), resolve(samplePath))
  assert.equal(doc.getAttribute('docdir'), dirname(resolve(samplePath)))
  assert.equal(doc.getAttribute('docfilesuffix'), '.adoc')
})

test('load file with UTF-8 BOM via loadFile', async () => {
  const bomPath = join(FIXTURES_DIR, 'file-with-utf8-bom.adoc')
  const doc = await loadFile(bomPath, { safe: 'safe' })
  assert.equal(doc.doctitle(), '人')
  assert.doesNotMatch(doc.doctitle(), /﻿|ï»¿/)
})
