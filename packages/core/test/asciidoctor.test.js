import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

import { getVersion, SafeMode, load, loadFile } from '../src/index.js'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'fixtures')

test('return Asciidoctor.js version', () => {
  assert.equal(getVersion(), packageJson.version)
})

describe('Safe mode', () => {
  test('get constants', () => {
    assert.equal(SafeMode.UNSAFE, 0)
    assert.equal(SafeMode.SAFE, 1)
    assert.equal(SafeMode.SERVER, 10)
    assert.equal(SafeMode.SECURE, 20)
  })
  test('get value for name', () => {
    assert.equal(SafeMode.getValueForName('secure'), 20)
  })
  test('get name for value', () => {
    assert.equal(SafeMode.getNameForValue(0), 'unsafe')
  })
  test('get names', () => {
    assert.deepEqual(SafeMode.getNames(), [
      'unsafe',
      'safe',
      'server',
      'secure',
    ])
  })
})

describe('Loading', () => {
  test('load document with inline attributes @', async () => {
    const options = { attributes: 'icons=font@' }
    const doc = await load('== Test', options)
    assert.equal(doc.getAttribute('icons'), 'font')
  })

  test('load document with inline attributes !', async () => {
    const options = { attributes: 'icons=font@ data-uri!' }
    const doc = await load('== Test', options)
    assert.equal(doc.getAttribute('icons'), 'font')
  })

  test('load document attributes', async () => {
    const options = { attributes: 'icons=font@ data-uri!' }
    const doc = await load(
      `= Document attributes
:bar: value
:!foo:

content`,
      options
    )
    assert.equal(doc.getAttribute('bar'), 'value')
    assert.equal(doc.getAttribute('quz'), null)
    assert.equal(doc.getAttributes().quz, undefined)
    assert.equal(doc.getAttribute('foo'), null)
    assert.equal(doc.getAttributes().foo, undefined)
  })

  test('load document with hash attributes', async () => {
    const options = { attributes: { icons: 'font', sectids: null } }
    const doc = await load('== Test', options)
    assert.equal(doc.getAttribute('icons'), 'font')
    assert.equal(doc.getAttribute('sectids'), null)
    assert.equal(doc.findBy({ context: 'section' })[0].getId(), undefined)
  })

  test('load document with boolean attributes', async () => {
    const options = { attributes: 'sectnums' }
    const doc = await load('== Test', options)
    assert.equal(doc.getAttribute('sectnums'), '')
    assert.equal(doc.isAttribute('sectnums'), true)
    assert.equal(doc.isAttribute('sectnums', 'not this'), false)
    assert.equal(doc.isAttribute('sectanchors'), false)
    assert.equal(doc.hasAttribute('sectnums'), true)
    assert.equal(doc.hasAttribute('sectanchors'), false)
  })

  test('load document authors', async () => {
    const doc = await load(`= Authors
Guillaume Grossetie; Anders Nawroth
`)
    assert.equal(doc.getAttribute('author'), 'Guillaume Grossetie')
    assert.equal(doc.getAttribute('author_1'), 'Guillaume Grossetie')
    assert.equal(doc.getAttribute('author_2'), 'Anders Nawroth')
    assert.equal(doc.getAttribute('authorcount'), 2)
    assert.equal(doc.getAttribute('authorinitials'), 'GG')
    assert.equal(doc.getAttribute('authorinitials_1'), 'GG')
    assert.equal(doc.getAttribute('authorinitials_2'), 'AN')
    assert.equal(
      doc.getAttribute('authors'),
      'Guillaume Grossetie, Anders Nawroth'
    )
    assert.equal(doc.getAuthor(), 'Guillaume Grossetie')
  })

  test('return attributes as JSON object', async () => {
    const doc = await load(`= Authors
Guillaume Grossetie; Anders Nawroth
`)
    assert.equal(doc.getAttributes().author, 'Guillaume Grossetie')
    assert.equal(
      doc.getAttributes().authors,
      'Guillaume Grossetie, Anders Nawroth'
    )
  })

  test('modify document attributes', async () => {
    const doc = await load('== Title')
    doc.setAttribute('data-uri', 'true')
    assert.equal(doc.getAttribute('data-uri'), 'true')
    doc.removeAttribute('data-uri')
    assert.equal(doc.getAttribute('data-uri'), null)
    doc.setAttribute('data-uri', 'false')
    assert.equal(doc.getAttribute('data-uri'), 'false')
  })

  test('get source', async () => {
    const doc = await load('== Test')
    assert.equal(doc.getSource(), '== Test')
  })

  test('get source lines', async () => {
    const doc = await load(`== Test
This is the first paragraph.

This is a second paragraph.`)
    assert.deepEqual(doc.getSourceLines(), [
      '== Test',
      'This is the first paragraph.',
      '',
      'This is a second paragraph.',
    ])
  })

  test('get reader lines', async () => {
    const doc = await load(
      `line one
line two
line three`,
      { parse: false }
    )
    assert.deepEqual(doc.getReader().getLines(), [
      'line one',
      'line two',
      'line three',
    ])
  })

  test('get reader string', async () => {
    const doc = await load(
      `line one
line two
line three`,
      { parse: false }
    )
    assert.equal(
      doc.getReader().getString(),
      `line one
line two
line three`
    )
  })

  test('document is not be nested', async () => {
    const doc = await load('== Test')
    assert.equal(doc.isNested(), false)
  })

  test('document does not have footnotes', async () => {
    const doc = await load('== Test')
    assert.equal(doc.hasFootnotes(), false)
  })

  test('get document', async () => {
    const doc = await load(`= Document Title

content`)
    assert.equal(doc.getDocument(), doc)
    assert.equal(doc.getBlocks()[0].getDocument(), doc)
  })

  test('get parent node', async () => {
    const doc = await load(`= Document Title

content`)
    assert.equal(doc.getParent(), undefined)
    assert.equal(doc.getBlocks()[0].getParent(), doc)
  })

  test('get default doctype', async () => {
    const doc = await load('== Test')
    assert.equal(doc.getDoctype(), 'article')
  })

  test('get doctype', async () => {
    const doc = await load('== Test', { doctype: 'inline' })
    assert.equal(doc.getDoctype(), 'inline')
  })

  test('get default backend', async () => {
    const doc = await load('== Test')
    assert.equal(doc.getBackend(), 'html5')
  })

  test('get backend for xhtml5', async () => {
    const doc = await load('== Test', { backend: 'xhtml5' })
    assert.equal(doc.getBackend(), 'html5')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
  })

  test('get compat mode', async () => {
    const doc = await load(`Document Title
==============

content`)
    assert.equal(doc.getCompatMode(), true)
  })

  test('get sourcemap', async () => {
    const doc = await load('get _sourcemap_')
    assert.equal(doc.getSourcemap(), false)
  })

  test('set sourcemap', async () => {
    const doc = await load('set _sourcemap_')
    assert.equal(doc.getSourcemap(), false)
    doc.setSourcemap(true)
    assert.equal(doc.getSourcemap(), true)
  })

  test('get outfilesuffix', async () => {
    const doc = await load('= Document Title')
    assert.equal(doc.getOutfilesuffix(), '.html')
  })

  test('get title', async () => {
    const doc =
      await load(`= The Dangerous Documentation Chronicles: Based on True Events
:title: The Actual Dangerous Documentation Chronicles

== The Ravages of Writing`)
    assert.equal(
      doc.getTitle(),
      'The Actual Dangerous Documentation Chronicles'
    )
    assert.equal(
      doc.getCaptionedTitle(),
      'The Actual Dangerous Documentation Chronicles'
    )
  })

  test('set title', async () => {
    const doc = await load(`= The Dangerous Documentation

== The Ravages of Writing`)
    doc.setTitle('The Dangerous & Thrilling Documentation')
    assert.equal(
      doc.getDoctitle(),
      'The Dangerous &amp; Thrilling Documentation'
    )
  })

  test('get doctitle', async () => {
    const doc =
      await load(`= The Dangerous Documentation Chronicles: Based on True Events

== The Ravages of Writing`)
    assert.equal(
      doc.getDoctitle(),
      'The Dangerous Documentation Chronicles: Based on True Events'
    )
  })

  test('get line number of a block when sourcemap is enabled', async () => {
    const doc = await load(
      `= Document Title

Preamble

== First section

First paragraph.`,
      { sourcemap: true }
    )
    assert.equal(doc.getSourcemap(), true)
    const blocks = doc.getBlocks()
    assert.equal(blocks.length, 2)
    // preamble
    assert.equal(blocks[0].getLineNumber(), 3)
    assert.equal(blocks[0].getBlocks().length, 1)
    assert.equal(blocks[0].getBlocks()[0].getLineNumber(), 3)
    // first section
    assert.equal(blocks[1].getLineNumber(), 5)
  })

  test('return undefined when sourcemap is disabled', async () => {
    const doc = await load(`= Document Title

Preamble

== First section

First paragraph.`)
    const blocks = doc.getBlocks()
    assert.equal(blocks.length, 2)
    assert.equal(blocks[0].getLineNumber(), undefined)
    assert.equal(blocks[0].getBlocks()[0].getLineNumber(), undefined)
    assert.equal(blocks[1].getLineNumber(), undefined)
  })

  test('get counters', async () => {
    const doc = await load(`{counter:countme}

{counter:countme}`)
    await doc.convert()
    const counters = doc.getCounters()
    assert.equal(typeof counters, 'object')
    assert.equal(counters.countme, 2)
  })

  test('get and set attribute on block', async () => {
    const doc = await load(`= Blocks story: Based on True Events

== Once upon a time

[bold-statement="on"]
Blocks are amazing!`)
    const paragraphBlock = doc.getBlocks()[0].getBlocks()[0]
    assert.equal(paragraphBlock.getAttribute('bold-statement'), 'on')
    paragraphBlock.setAttribute('bold-statement', 'off')
    assert.equal(paragraphBlock.getAttribute('bold-statement'), 'off')
  })

  test('populate the catalog', async () => {
    const doc = await load('link:index.html[Docs]', {
      safe: 'safe',
      catalog_assets: true,
    })
    await doc.convert()
    const links = doc.getCatalog().links
    assert.deepEqual(links, ['index.html'])
  })
})

describe('loadFile', () => {
  test('load file and set docfile attributes', async () => {
    const samplePath = join(FIXTURES_DIR, 'sample.adoc')
    const doc = await loadFile(samplePath, { safe: 'safe' })
    assert.equal(doc.doctitle(), 'Document Title')
    assert.equal(doc.getAttribute('docfile'), resolve(samplePath))
    assert.equal(doc.getAttribute('docdir'), dirname(resolve(samplePath)))
    assert.equal(doc.getAttribute('docfilesuffix'), '.adoc')
    assert.equal(doc.getAttribute('docname'), 'sample')
  })
})
