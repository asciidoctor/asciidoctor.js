// Coverage tests for the uncovered public API of extensions.js:
// DSL aliases, processor factory methods (Extensions.create*/new*),
// Processor helper methods (createList, createImageBlock, etc.),
// Registry query methods, base-class guards, and Group.

import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  Extensions,
  Registry,
  Processor,
  Preprocessor,
  TreeProcessor,
  Postprocessor,
  IncludeProcessor,
  DocinfoProcessor,
  BlockProcessor,
  InlineMacroProcessor,
  BlockMacroProcessor,
  load,
  convert,
} from '../src/index.js'
import { Group } from '../src/extensions.js'

afterEach(() => Extensions.unregisterAll())

// ── DSL aliases ───────────────────────────────────────────────────────────────

describe('DSL aliases', () => {
  test('parseContentAs is an alias for contentModel', async () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('demo')
      this.parseContentAs('simple')
      this.process(function (parent, reader) {
        return this.createBlock(
          parent,
          'paragraph',
          reader.getLines().join('\n'),
          {}
        )
      })
    })
    const html = await convert('[demo]\nHello', {
      extension_registry: registry,
    })
    assert.ok(html.includes('Hello'))
  })

  test('positionalAttrs is an alias for positionalAttributes', async () => {
    const registry = Extensions.create()
    registry.blockMacro(function () {
      this.named('pos')
      this.positionalAttrs('label', 'alt')
      this.process(function (parent, target, attrs) {
        return this.createBlock(parent, 'paragraph', attrs.label || target, {})
      })
    })
    const html = await convert('pos::myfile[caption]', {
      extension_registry: registry,
    })
    assert.ok(html.includes('caption'))
  })

  test('defaultAttrs is an alias for defaultAttributes', async () => {
    const registry = Extensions.create()
    registry.blockMacro(function () {
      this.named('defaults')
      this.defaultAttrs({ color: 'red' })
      this.process(function (parent, _target, attrs) {
        return this.createBlock(parent, 'paragraph', attrs.color, {})
      })
    })
    const html = await convert('defaults::x[]', {
      extension_registry: registry,
    })
    assert.ok(html.includes('red'))
  })

  test('resolvesAttributes (SyntaxProcessorDsl) is an alias for resolveAttributes', async () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('resv')
      this.resolvesAttributes('foo')
      this.process(function (parent) {
        return this.createBlock(parent, 'paragraph', 'resolved', {})
      })
    })
    const html = await convert('[resv]\nsome text', {
      extension_registry: registry,
    })
    assert.ok(html.includes('resolved'))
  })

  test('onContexts is an alias for contexts', async () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('ctx')
      this.onContexts('paragraph')
      this.process(function (parent, reader) {
        return this.createBlock(parent, 'paragraph', 'ctx-ok', {})
      })
    })
    const html = await convert('[ctx]\nsome text', {
      extension_registry: registry,
    })
    assert.ok(html.includes('ctx-ok'))
  })

  test('bindTo is an alias for contexts', async () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('bnd')
      this.bindTo('paragraph')
      this.process(function (parent, reader) {
        return this.createBlock(parent, 'paragraph', 'bnd-ok', {})
      })
    })
    const html = await convert('[bnd]\nsome text', {
      extension_registry: registry,
    })
    assert.ok(html.includes('bnd-ok'))
  })

  test('MacroProcessorDsl.resolveAttributes with falsy arg sets content_model to text', async () => {
    const registry = Extensions.create()
    registry.inlineMacro(function () {
      this.named('noattr')
      this.resolveAttributes(false)
      this.process(function (parent, target) {
        return this.createInline(parent, 'quoted', target)
      })
    })
    const html = await convert('text noattr:hello[]', {
      extension_registry: registry,
    })
    assert.ok(html.includes('hello'))
  })

  test('InlineMacroProcessorDsl.usingFormat is an alias for format', async () => {
    const registry = Extensions.create()
    registry.inlineMacro(function () {
      this.named('fmt')
      this.usingFormat('short')
      this.process(function (parent, target) {
        return this.createInline(parent, 'quoted', target)
      })
    })
    const html = await convert('text fmt:[hello]', {
      extension_registry: registry,
    })
    assert.ok(html.includes('hello'))
  })
})

// ── Static DSL methods ────────────────────────────────────────────────────────

describe('Processor.enableDsl / useDsl', () => {
  test('enableDsl mixes DSL into the class prototype', () => {
    class MyProc extends Preprocessor {}
    MyProc.DSL = {
      customHelper() {
        return 'helped'
      },
    }
    MyProc.enableDsl()
    const inst = new MyProc()
    assert.equal(inst.customHelper(), 'helped')
  })

  test('useDsl is an alias for enableDsl', () => {
    class MyProc extends Preprocessor {}
    MyProc.DSL = {
      anotherHelper() {
        return 'also helped'
      },
    }
    MyProc.useDsl()
    const inst = new MyProc()
    assert.equal(inst.anotherHelper(), 'also helped')
  })
})

// ── Processor base class guards ───────────────────────────────────────────────

describe('base class process() guards', () => {
  test('Processor.process() throws when not overridden', () => {
    const proc = new Processor()
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('Preprocessor.process() throws when not overridden', () => {
    const proc = new Preprocessor()
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('TreeProcessor.process() throws when not overridden', () => {
    const proc = new TreeProcessor()
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('Postprocessor.process() throws when not overridden', () => {
    const proc = new Postprocessor()
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('IncludeProcessor.process() throws when not overridden', () => {
    const proc = new IncludeProcessor()
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('DocinfoProcessor.process() throws when not overridden', () => {
    const proc = new DocinfoProcessor()
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('BlockProcessor.process() throws when not overridden', () => {
    const proc = new BlockProcessor('test')
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('InlineMacroProcessor.process() throws when not overridden', () => {
    const proc = new InlineMacroProcessor('test')
    assert.throws(() => proc.process(), /must implement the process method/)
  })

  test('BlockMacroProcessor.process() throws when not overridden', () => {
    const proc = new BlockMacroProcessor('test')
    assert.throws(() => proc.process(), /must implement the process method/)
  })
})

// ── Group ─────────────────────────────────────────────────────────────────────

describe('Group', () => {
  test('Group.register() registers the class globally', () => {
    class MyGroup extends Group {
      activate(registry) {
        registry.preprocessor(function () {
          this.process((_doc, reader) => reader)
        })
      }
    }
    MyGroup.register('my-group')
    assert.ok('my-group' in Extensions.groups())
    Extensions.unregister('my-group')
  })

  test('Group.activate() throws when not overridden', () => {
    const g = new Group()
    assert.throws(() => g.activate({}), /must implement the activate method/)
  })

  test('Registry.activate() calls group.activate() on plain object with activate()', async () => {
    const registry = new Registry()
    const activated = []
    registry.groups['obj-group'] = {
      activate(reg) {
        activated.push(reg)
        reg.preprocessor(function () {
          this.process((_doc, reader) => reader)
        })
      },
    }
    const _doc = await load('hello', { extension_registry: registry })
    assert.ok(activated.length > 0)
    assert.ok(registry.hasPreprocessors())
  })
})

// ── Extensions factory methods ────────────────────────────────────────────────

describe('Extensions.create* / new*', () => {
  test('createPreprocessor returns a Preprocessor subclass', () => {
    const Klass = Extensions.createPreprocessor({
      process(doc, reader) {
        return reader
      },
    })
    assert.ok(new Klass() instanceof Preprocessor)
  })

  test('createPreprocessor accepts an optional name', () => {
    const Klass = Extensions.createPreprocessor('MyPreprocessor', {
      process(doc, reader) {
        return reader
      },
    })
    assert.equal(Klass.name, 'MyPreprocessor')
  })

  test('newPreprocessor returns a Preprocessor instance', () => {
    const inst = Extensions.newPreprocessor({
      process(doc, reader) {
        return reader
      },
    })
    assert.ok(inst instanceof Preprocessor)
  })

  test('createTreeProcessor returns a TreeProcessor subclass', () => {
    const Klass = Extensions.createTreeProcessor({ process(doc) {} })
    assert.ok(new Klass() instanceof TreeProcessor)
  })

  test('newTreeProcessor returns a TreeProcessor instance', () => {
    const inst = Extensions.newTreeProcessor({ process(doc) {} })
    assert.ok(inst instanceof TreeProcessor)
  })

  test('createPostprocessor returns a Postprocessor subclass', () => {
    const Klass = Extensions.createPostprocessor({
      process(doc, output) {
        return output
      },
    })
    assert.ok(new Klass() instanceof Postprocessor)
  })

  test('newPostprocessor returns a Postprocessor instance', () => {
    const inst = Extensions.newPostprocessor({
      process(doc, output) {
        return output
      },
    })
    assert.ok(inst instanceof Postprocessor)
  })

  test('createIncludeProcessor returns an IncludeProcessor subclass', () => {
    const Klass = Extensions.createIncludeProcessor({
      process(doc, reader, target, attrs) {},
    })
    assert.ok(new Klass() instanceof IncludeProcessor)
  })

  test('newIncludeProcessor returns an IncludeProcessor instance', () => {
    const inst = Extensions.newIncludeProcessor({
      process(doc, reader, target, attrs) {},
    })
    assert.ok(inst instanceof IncludeProcessor)
  })

  test('createDocinfoProcessor returns a DocinfoProcessor subclass', () => {
    const Klass = Extensions.createDocinfoProcessor({
      process(doc) {
        return ''
      },
    })
    assert.ok(new Klass() instanceof DocinfoProcessor)
  })

  test('newDocinfoProcessor returns a DocinfoProcessor instance', () => {
    const inst = Extensions.newDocinfoProcessor({
      process(doc) {
        return ''
      },
    })
    assert.ok(inst instanceof DocinfoProcessor)
  })

  test('createBlockProcessor returns a BlockProcessor subclass', () => {
    const Klass = Extensions.createBlockProcessor({
      process(parent, reader, attrs) {},
    })
    assert.ok(new Klass() instanceof BlockProcessor)
  })

  test('newBlockProcessor returns a BlockProcessor instance', () => {
    const inst = Extensions.newBlockProcessor('myblock', {
      process(parent, reader, attrs) {},
    })
    assert.ok(inst instanceof BlockProcessor)
  })

  test('createInlineMacroProcessor returns an InlineMacroProcessor subclass', () => {
    const Klass = Extensions.createInlineMacroProcessor({
      process(parent, target, attrs) {},
    })
    assert.ok(new Klass() instanceof InlineMacroProcessor)
  })

  test('newInlineMacroProcessor returns an InlineMacroProcessor instance', () => {
    const inst = Extensions.newInlineMacroProcessor('mymacro', {
      process(parent, target, attrs) {},
    })
    assert.ok(inst instanceof InlineMacroProcessor)
  })

  test('createBlockMacroProcessor returns a BlockMacroProcessor subclass', () => {
    const Klass = Extensions.createBlockMacroProcessor({
      process(parent, target, attrs) {},
    })
    assert.ok(new Klass() instanceof BlockMacroProcessor)
  })

  test('newBlockMacroProcessor returns a BlockMacroProcessor instance', () => {
    const inst = Extensions.newBlockMacroProcessor('myblockmacro', {
      process(parent, target, attrs) {},
    })
    assert.ok(inst instanceof BlockMacroProcessor)
  })
})

// ── Registry query methods ────────────────────────────────────────────────────

describe('Registry query methods', () => {
  test('preprocessors() and preprocessor_extensions return registered preprocessors', () => {
    const registry = Extensions.create()
    assert.equal(registry.preprocessors(), null)
    registry.preprocessor(function () {
      this.process((_doc, reader) => reader)
    })
    assert.ok(registry.preprocessors().length === 1)
    assert.ok(registry.preprocessor_extensions.length === 1)
    assert.ok(registry.hasPreprocessors())
  })

  test('treeProcessors() / treeprocessors() and hasTreeProcessors / hasTeeProcessors', () => {
    const registry = Extensions.create()
    assert.equal(registry.treeProcessors(), null)
    assert.ok(!registry.hasTreeProcessors())
    registry.treeProcessor(function () {
      this.process((_doc) => {})
    })
    assert.ok(registry.treeProcessors().length === 1)
    assert.ok(registry.treeprocessors().length === 1)
    assert.ok(registry.hasTreeProcessors())
    assert.ok(registry.hasTeeProcessors())
    assert.ok(registry.tree_processor_extensions.length === 1)
  })

  test('postprocessors() and hasPostprocessors', () => {
    const registry = Extensions.create()
    assert.equal(registry.postprocessors(), null)
    assert.ok(!registry.hasPostprocessors())
    registry.postprocessor(function () {
      this.process((_doc, output) => output)
    })
    assert.ok(registry.postprocessors().length === 1)
    assert.ok(registry.hasPostprocessors())
    assert.ok(registry.postprocessor_extensions.length === 1)
  })

  test('includeProcessors() / hasIncludeProcessors and snake_case alias', () => {
    const registry = Extensions.create()
    assert.ok(!registry.hasIncludeProcessors())
    registry.include_processor(function () {
      this.process((_doc, _reader, _target, _attrs) => {})
    })
    assert.ok(registry.hasIncludeProcessors())
    assert.ok(registry.includeProcessors().length === 1)
    assert.ok(registry.include_processor_extensions.length === 1)
  })

  test('docinfoProcessors() with location filter', () => {
    const registry = Extensions.create()
    registry.docinfoProcessor(function () {
      this.atLocation('footer')
      this.process((_doc) => '<p>footer</p>')
    })
    registry.docinfo_processor(function () {
      this.process((_doc) => '<meta name="x"/>')
    })
    assert.ok(registry.hasDocinfoProcessors())
    assert.ok(registry.hasDocinfoProcessors('footer'))
    assert.ok(registry.hasDocinfoProcessors('head'))
    assert.equal(registry.docinfoProcessors('footer').length, 1)
    assert.equal(registry.docinfoProcessors('head').length, 1)
    assert.equal(registry.docinfoProcessors().length, 2)
    assert.ok(registry.docinfo_processor_extensions.length === 2)
  })

  test('block_macro and inline_macro snake_case aliases', () => {
    const registry = Extensions.create()
    registry.block_macro(function () {
      this.named('bm')
      this.process(function (parent, target) {
        return this.createBlock(parent, 'paragraph', target, {})
      })
    })
    registry.inline_macro(function () {
      this.named('im')
      this.process(function (parent, target) {
        return this.createInline(parent, 'quoted', target)
      })
    })
    assert.ok(registry.hasBlockMacros())
    assert.ok(registry.hasInlineMacros())
    assert.ok(registry.registeredForBlockMacro('bm'))
    assert.ok(!registry.registeredForBlockMacro('nope'))
    assert.ok(registry.registeredForInlineMacro('im'))
    assert.ok(!registry.registeredForInlineMacro('nope'))
    assert.equal(registry.inlineMacros().length, 1)
    assert.ok(registry.findBlockMacroExtension('bm') != null)
    assert.equal(registry.findBlockMacroExtension('nope'), null)
    assert.ok(registry.findInlineMacroExtension('im') != null)
    assert.equal(registry.findInlineMacroExtension('nope'), null)
  })

  test('findBlockExtension and registeredForBlock', () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('myblock')
      this.onContext('paragraph')
      this.process(function (parent, reader) {
        return this.createBlock(parent, 'paragraph', 'ok', {})
      })
    })
    assert.ok(registry.hasBlocks())
    assert.ok(registry.registeredForBlock('myblock', 'paragraph'))
    assert.ok(!registry.registeredForBlock('myblock', 'listing'))
    assert.ok(!registry.registeredForBlock('nope', 'paragraph'))
    assert.ok(registry.findBlockExtension('myblock') != null)
    assert.equal(registry.findBlockExtension('nope'), null)
  })
})

// ── Processor helper methods (create*) ───────────────────────────────────────

describe('Processor helper methods', () => {
  test('createList and createListItem', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        const list = this.createList(doc, 'ulist')
        const item = this.createListItem(list, 'list item text')
        list.append(item)
        doc.append(list)
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('list item text'))
  })

  test('createImageBlock', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        const img = this.createImageBlock(doc, {
          target: 'logo.png',
          alt: 'Logo',
        })
        doc.append(img)
      })
    })
    const html = await convert('content', { extension_registry: registry })
    assert.ok(html.includes('logo.png'))
  })

  test('createList with attributes', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        const list = this.createList(doc, 'ulist', { role: 'highlighted' })
        const item = this.createListItem(list, 'item')
        list.append(item)
        doc.append(list)
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('highlighted'))
  })

  test('createParagraph shorthand', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        doc.append(this.createParagraph(doc, 'paragraph-text'))
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('paragraph-text'))
  })

  test('createOpenBlock shorthand', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        const open = this.createOpenBlock(doc, null, {})
        open.append(this.createBlock(doc, 'paragraph', 'open-content', {}))
        doc.append(open)
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('open-content'))
  })

  test('createExampleBlock shorthand', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        doc.append(this.createExampleBlock(doc, 'example-content', {}))
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('example-content'))
  })

  test('createPassBlock shorthand', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        doc.append(this.createPassBlock(doc, '<em>pass-content</em>', {}))
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('<em>pass-content</em>'))
  })

  test('createListingBlock shorthand', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        doc.append(this.createListingBlock(doc, 'code here', {}))
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('code here'))
  })

  test('createLiteralBlock shorthand', async () => {
    const registry = Extensions.create()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        doc.append(this.createLiteralBlock(doc, 'literal text', {}))
      })
    })
    const html = await convert('preamble', { extension_registry: registry })
    assert.ok(html.includes('literal text'))
  })

  test('createAnchor shorthand', async () => {
    const registry = Extensions.create()
    registry.inlineMacro(function () {
      this.named('mylink')
      this.process(function (parent, target) {
        return this.createAnchor(parent, target, { type: 'link', target })
      })
    })
    const html = await convert('Click mylink:https://example.com[here]', {
      extension_registry: registry,
      attributes: { 'allow-uri-read': '' },
    })
    assert.ok(html.includes('https://example.com'))
  })

  test('createInlinePass shorthand', async () => {
    const registry = Extensions.create()
    registry.inlineMacro(function () {
      this.named('rawout')
      this.process(function (parent, target) {
        return this.createInlinePass(parent, target)
      })
    })
    const html = await convert('text rawout:world[]', {
      extension_registry: registry,
    })
    assert.ok(html.includes('world'))
  })
})
