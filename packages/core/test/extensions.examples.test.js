// Integration tests for the extension examples in spec/share/extensions/.
// Mirrors packages/core/spec/node/asciidoctor.spec.js → describe('Extensions').

import { describe, test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import asciidoctor from '../src/index.js'
import fooBarPostprocessor from './extensions/foo-bar-postprocessor.js'
import loveTreeProcessor from './extensions/love-tree-processor.js'
import draftPreprocessor from './extensions/draft-preprocessor.js'
import moarFooterDocinfoProcessor from './extensions/moar-footer-docinfo-processor.js'
import shoutBlock from './extensions/shout-block.js'
import chartBlock from './extensions/chart-block.js'
import smileyInlineMacro from './extensions/smiley-inline-macro.js'
import emojiInlineMacro from './extensions/emoji-inline-macro.js'
import loremBlockMacro from './extensions/lorem-block-macro.js'
import fooInclude from './extensions/foo-include.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'fixtures')

function fixture (name) {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8')
}

describe('Extensions (examples)', () => {
  afterEach(() => {
    asciidoctor.Extensions.unregisterAll()
  })

  describe('Postprocessor', () => {
    test('should replace foo with bar', async () => {
      const registry = asciidoctor.Extensions.create()
      fooBarPostprocessor(registry)
      const result = await asciidoctor.convert(fixture('foo-bar-postprocessor-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('bar, qux, bar.'))
      assert.ok(!result.includes('foo'))
    })

    test('should not replace without extension', async () => {
      const result = await asciidoctor.convert(fixture('foo-bar-postprocessor-ex.adoc'))
      assert.ok(result.includes('foo, qux, foo.'))
      assert.ok(!result.includes('bar,'))
    })

    test('should register postprocessor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      fooBarPostprocessor(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasPostprocessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasInlineMacros())
      assert.ok(!exts.hasIncludeProcessors())
      assert.equal(exts.postprocessors().length, 1)
      assert.equal(exts.postprocessors()[0].kind, 'postprocessor')
    })
  })

  describe('Tree processor', () => {
    test('should replace first block with love message', async () => {
      const registry = asciidoctor.Extensions.create()
      loveTreeProcessor(registry)
      const result = await asciidoctor.convert(fixture('love-tree-processor-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('Made with icon:heart[]'))
    })

    test('should not replace without extension', async () => {
      const result = await asciidoctor.convert(fixture('love-tree-processor-ex.adoc'))
      assert.ok(result.includes('How this document was made ?'))
    })

    test('should register tree processor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      loveTreeProcessor(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasTreeProcessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasInlineMacros())
      assert.ok(!exts.hasIncludeProcessors())
      assert.equal(exts.treeprocessors().length, 1)
      assert.equal(exts.treeprocessors()[0].kind, 'tree_processor')
    })
  })

  describe('Preprocessor', () => {
    test('should mark document as DRAFT', async () => {
      const registry = asciidoctor.Extensions.create()
      draftPreprocessor(registry)
      const doc = await asciidoctor.load(fixture('draft-preprocessor-ex.adoc'), { extension_registry: registry })
      assert.equal(doc.getAttribute('status'), 'DRAFT')
      const result = await doc.convert()
      assert.ok(result.includes('Important'))
      assert.ok(result.includes('This section is a draft: we need to talk about Y.'))
    })

    test('should register preprocessor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      draftPreprocessor(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasPreprocessors())
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasInlineMacros())
      assert.ok(!exts.hasIncludeProcessors())
      assert.equal(exts.preprocessors().length, 1)
      assert.equal(exts.preprocessors()[0].kind, 'preprocessor')
    })
  })

  describe('Docinfo processor', () => {
    test('should inject moar footer', async () => {
      const registry = asciidoctor.Extensions.create()
      moarFooterDocinfoProcessor(registry)
      const result = await asciidoctor.convert(fixture('moar-footer-docinfo-processor-ex.adoc'), {
        safe: 'server',
        header_footer: true,
        extension_registry: registry,
      })
      assert.ok(result.includes('moar footer'))
    })

    test('should not inject footer without extension', async () => {
      const result = await asciidoctor.convert(fixture('moar-footer-docinfo-processor-ex.adoc'))
      assert.ok(!result.includes('moar footer'))
    })

    test('should register docinfo processor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      moarFooterDocinfoProcessor(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasDocinfoProcessors())
      assert.ok(exts.hasDocinfoProcessors('footer'))
      assert.ok(!exts.hasDocinfoProcessors('head'))
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasInlineMacros())
      assert.ok(!exts.hasIncludeProcessors())
      assert.equal(exts.docinfoProcessors('footer').length, 1)
      assert.equal(exts.docinfoProcessors('footer')[0].kind, 'docinfo_processor')
    })
  })

  describe('Block processor (shout)', () => {
    test('should uppercase paragraph content', async () => {
      const registry = asciidoctor.Extensions.create()
      shoutBlock(registry)
      const result = await asciidoctor.convert(fixture('shout-block-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('<p>SAY IT LOUD.\nSAY IT PROUD.</p>'))
    })

    test('should register block processor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      shoutBlock(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasBlocks())
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasInlineMacros())
      assert.ok(!exts.hasIncludeProcessors())
    })
  })

  describe('Block processor (chart)', () => {
    test('should render chart HTML from literal block', async () => {
      const registry = asciidoctor.Extensions.create()
      chartBlock(registry)
      const result = await asciidoctor.convert(fixture('chart-block-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('<div class="chart"'))
      assert.ok(result.includes('data-chart-series-0='))
      assert.ok(result.includes('data-chart-series-1='))
    })
  })

  describe('Inline macro processor (smiley)', () => {
    test('should convert smiley macros to emoticons', async () => {
      const registry = asciidoctor.Extensions.create()
      smileyInlineMacro(registry)
      const result = await asciidoctor.convert(fixture('smiley-inline-macro-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('<strong>:D</strong>'))
      assert.ok(result.includes('<strong>;)</strong>'))
      assert.ok(result.includes('<strong>:)</strong>'))
    })

    test('should register inline macro processor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      smileyInlineMacro(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasInlineMacros())
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasIncludeProcessors())
    })
  })

  describe('Inline macro processor (emoji)', () => {
    test('should render emoji img tags', async () => {
      const registry = asciidoctor.Extensions.create()
      emojiInlineMacro(registry)
      const result = await asciidoctor.convert(fixture('emoji-inline-macro-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('1f422.svg'))
      assert.ok(result.includes('2764.svg'))
      assert.ok(result.includes('twemoji.maxcdn.com'))
    })
  })

  describe('Block macro processor (lorem)', () => {
    test('should generate lorem ipsum sentences', async () => {
      const registry = asciidoctor.Extensions.create()
      loremBlockMacro(registry)
      const result = await asciidoctor.convert(fixture('lorem-block-macro-ex.adoc'), { extension_registry: registry })
      assert.ok(result.includes('Lorem ipsum dolor sit amet'))
    })

    test('should register block macro processor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      loremBlockMacro(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasBlockMacros())
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasInlineMacros())
      assert.ok(!exts.hasIncludeProcessors())
    })
  })

  describe('Include processor (foo)', () => {
    test('should handle .foo includes', async () => {
      const registry = asciidoctor.Extensions.create()
      fooInclude(registry)
      const result = await asciidoctor.convert('include::test.foo[]', {
        safe: 'safe',
        extension_registry: registry,
      })
      assert.ok(result.includes('foo'))
    })

    test('should register include processor in extension list', async () => {
      const registry = asciidoctor.Extensions.create()
      fooInclude(registry)
      const doc = await asciidoctor.load('test', { extension_registry: registry })
      const exts = doc.getExtensions()
      assert.ok(exts.hasIncludeProcessors())
      assert.ok(!exts.hasTreeProcessors())
      assert.ok(!exts.hasPreprocessors())
      assert.ok(!exts.hasPostprocessors())
      assert.ok(!exts.hasBlocks())
      assert.ok(!exts.hasBlockMacros())
      assert.ok(!exts.hasInlineMacros())
    })
  })
})
