// Port of extensions_test.rb — unit tests for extensions.js
//
// Tests that depend on the full parsing / conversion pipeline
// (Integration context) are marked TODO and will be enabled once
// the parser and converters are ported to JavaScript.

import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  Processor,
  Preprocessor,
  TreeProcessor,
  Postprocessor,
  IncludeProcessor,
  DocinfoProcessor,
  BlockProcessor,
  MacroProcessor,
  BlockMacroProcessor,
  InlineMacroProcessor,
  Extension,
  ProcessorExtension,
  Group,
  Registry,
  Extensions,
  Treeprocessor,
  ProcessorDsl,
  DocumentProcessorDsl,
  SyntaxProcessorDsl,
  IncludeProcessorDsl,
  DocinfoProcessorDsl,
  BlockProcessorDsl,
  MacroProcessorDsl,
  InlineMacroProcessorDsl,
} from '../src/extensions.js'

// ── Shared test helpers ───────────────────────────────────────────────────────

// Creates a minimal Document-like object sufficient for Registry#activate.
function makeDoc(attrs = {}) {
  return {
    attributes: { ...attrs },
    hasAttribute(name, val = null) {
      return val !== null
        ? this.attributes[name] === val
        : name in this.attributes
    },
    setAttribute(name, val) {
      this.attributes[name] = val
    },
    doctype: 'article',
  }
}

// ── Shared fixture classes (mirrors Ruby global class definitions) ─────────────

class SamplePreprocessor extends Preprocessor {
  process(_doc, reader) {
    return null
  }
}

// Legacy 1-arg handles() method — triggers the legacy adapter in JS port.
class SampleIncludeProcessor extends IncludeProcessor {
  handles(target) {
    return 'affirmative'
  }
}

class SampleDocinfoProcessor extends DocinfoProcessor {}

// Intentionally using the deprecated alias Treeprocessor (mirrors Ruby test)
class SampleTreeprocessor extends Treeprocessor {
  process(_document) {
    return null
  }
}
const SampleTreeProcessor = SampleTreeprocessor

class SamplePostprocessor extends Postprocessor {}

class SampleBlock extends BlockProcessor {}

class SampleBlockMacro extends BlockMacroProcessor {}

class SampleInlineMacro extends InlineMacroProcessor {}

class SampleExtensionGroup extends Group {
  activate(registry) {
    registry.document.attributes['activate-method-called'] = ''
    registry.preprocessor(SamplePreprocessor)
  }
}

// ── Register ──────────────────────────────────────────────────────────────────

describe('Extensions.Register', () => {
  beforeEach(() => Extensions.unregisterAll())

  test('should register extension group class', () => {
    Extensions.register('sample', SampleExtensionGroup)
    const groups = Extensions.groups()
    assert.notEqual(groups, null)
    assert.equal(Object.keys(groups).length, 1)
    assert.equal(groups['sample'], SampleExtensionGroup)
  })

  test('should self-register extension group class', () => {
    SampleExtensionGroup.register('sample')
    const groups = Extensions.groups()
    assert.notEqual(groups, null)
    assert.equal(Object.keys(groups).length, 1)
    assert.equal(groups['sample'], SampleExtensionGroup)
  })

  test('should register extension group from instance', () => {
    Extensions.register('sample', new SampleExtensionGroup())
    const groups = Extensions.groups()
    assert.notEqual(groups, null)
    assert.equal(Object.keys(groups).length, 1)
    assert.ok(groups['sample'] instanceof SampleExtensionGroup)
  })

  test('should register extension block (function)', () => {
    const fn = function () {
      /* intentionally blank */
    }
    Extensions.register('sample', fn)
    const groups = Extensions.groups()
    assert.notEqual(groups, null)
    assert.equal(Object.keys(groups).length, 1)
    assert.equal(typeof groups['sample'], 'function')
  })

  test('should coerce group name to string when registering', () => {
    // Ruby coerces to Symbol; JS coerces to String — both normalise the name
    Extensions.register('sample', SampleExtensionGroup)
    const groups = Extensions.groups()
    assert.equal(Object.keys(groups).length, 1)
    assert.equal(groups['sample'], SampleExtensionGroup)
  })

  test('should unregister extension group by name', () => {
    Extensions.register('sample', SampleExtensionGroup)
    assert.equal(Object.keys(Extensions.groups()).length, 1)
    Extensions.unregister('sample')
    assert.equal(Object.keys(Extensions.groups()).length, 0)
  })

  test('should unregister multiple extension groups by name', () => {
    Extensions.register('sample1', SampleExtensionGroup)
    Extensions.register('sample2', SampleExtensionGroup)
    assert.equal(Object.keys(Extensions.groups()).length, 2)
    Extensions.unregister('sample1', 'sample2')
    assert.equal(Object.keys(Extensions.groups()).length, 0)
  })

  test('should not fail to unregister extension group if not registered', () => {
    assert.equal(Object.keys(Extensions.groups()).length, 0)
    Extensions.unregister('sample')
    assert.equal(Object.keys(Extensions.groups()).length, 0)
  })

  test('should allow standalone registry to be created without affecting global groups', () => {
    const registry = Extensions.create('sample', function () {
      this.block(function () {
        this.named('whisper')
        this.process(function (_parent, _reader, _attributes) {})
      })
    })

    assert.ok(registry instanceof Registry)
    assert.notEqual(registry.groups, null)
    assert.equal(Object.keys(registry.groups).length, 1)
    assert.equal(Object.keys(registry.groups)[0], 'sample')
    assert.equal(Object.keys(Extensions.groups()).length, 0)
  })

  test('should auto-generate name when none given', () => {
    const g1 = Extensions.register(SampleExtensionGroup)
    const g2 = Extensions.register(SampleExtensionGroup)
    const keys = Object.keys(Extensions.groups())
    assert.equal(keys.length, 2)
    // Names start with "extgrp" followed by an integer
    assert.ok(keys.every((k) => k.startsWith('extgrp')))
    assert.notEqual(keys[0], keys[1])
  })

  test('should throw if no group argument is given', () => {
    assert.throws(() => Extensions.register(), {
      message: /Extension group to register not specified/,
    })
  })
})

// ── Activate ──────────────────────────────────────────────────────────────────

describe('Extensions.Activate', () => {
  beforeEach(() => Extensions.unregisterAll())

  test('should call activate on extension group class', () => {
    Extensions.register('sample', SampleExtensionGroup)
    const doc = makeDoc()
    const registry = new Registry()
    registry.activate(doc)
    assert.ok('activate-method-called' in doc.attributes)
    assert.ok(registry.hasPreprocessors())
  })

  test('should reset registry if activate is called again', () => {
    Extensions.register('sample', SampleExtensionGroup)

    let doc = makeDoc()
    const registry = new Registry()
    registry.activate(doc)
    assert.ok('activate-method-called' in doc.attributes)
    assert.ok(registry.hasPreprocessors())
    assert.equal(registry.preprocessors().length, 1)
    assert.equal(registry.document, doc)

    doc = makeDoc()
    registry.activate(doc)
    assert.ok('activate-method-called' in doc.attributes)
    assert.ok(registry.hasPreprocessors())
    assert.equal(registry.preprocessors().length, 1)
    assert.equal(registry.document, doc)
  })

  test('should invoke extension block (function) during activate', () => {
    Extensions.register('sample', function () {
      // "this" is the registry; this.document is set before groups are activated
      this.document.attributes['block-called'] = ''
      this.preprocessor(SamplePreprocessor)
    })

    const doc = makeDoc()
    const registry = new Registry()
    registry.activate(doc)
    assert.ok('block-called' in doc.attributes)
    assert.ok(registry.hasPreprocessors())
  })

  test('should invoke extension block that yields the registry as argument', () => {
    // Block with arity > 0: receives registry as explicit argument
    Extensions.register('sample', function (reg) {
      reg.document.attributes['yielded-block-called'] = ''
      reg.preprocessor(SamplePreprocessor)
    })

    const doc = makeDoc()
    const registry = new Registry()
    registry.activate(doc)
    assert.ok('yielded-block-called' in doc.attributes)
    assert.ok(registry.hasPreprocessors())
  })

  test('should activate local groups in addition to global groups', () => {
    // Stand-alone registry with its own group; no global groups
    const registry = new Registry({
      extra: function () {
        this.postprocessor(SamplePostprocessor)
      },
    })
    const doc = makeDoc()
    registry.activate(doc)
    assert.ok(registry.hasPostprocessors())
  })
})

// ── Instantiate ───────────────────────────────────────────────────────────────

describe('Extensions.Instantiate', () => {
  test('should instantiate preprocessors registered as a class', () => {
    const registry = new Registry()
    registry.preprocessor(SamplePreprocessor)
    registry.activate(makeDoc())

    assert.ok(registry.hasPreprocessors())
    const extensions = registry.preprocessors()
    assert.equal(extensions.length, 1)
    assert.ok(extensions[0] instanceof ProcessorExtension)
    assert.ok(extensions[0].instance instanceof SamplePreprocessor)
    assert.equal(typeof extensions[0].processMethod, 'function')
  })

  test('should instantiate include processors and apply legacy handles adapter', () => {
    const registry = new Registry()
    registry.includeProcessor(SampleIncludeProcessor)
    registry.activate(makeDoc())

    assert.ok(registry.hasIncludeProcessors())
    const extensions = registry.includeProcessors()
    assert.equal(extensions.length, 1)
    assert.ok(extensions[0] instanceof ProcessorExtension)
    assert.ok(extensions[0].instance instanceof SampleIncludeProcessor)
    assert.equal(typeof extensions[0].processMethod, 'function')

    // Verify that the legacy 1-arg handles() is adapted to accept (doc, target)
    const inst = extensions[0].instance
    assert.equal(inst.handles.length, 2)
    assert.equal(inst.handles(null, 'include.adoc'), 'affirmative')
  })

  test('should instantiate docinfo processors', () => {
    const registry = new Registry()
    registry.docinfoProcessor(SampleDocinfoProcessor)
    registry.activate(makeDoc())

    assert.ok(registry.hasDocinfoProcessors())
    assert.ok(registry.hasDocinfoProcessors('head'))
    assert.ok(!registry.hasDocinfoProcessors('footer'))
    const extensions = registry.docinfoProcessors()
    assert.equal(extensions.length, 1)
    assert.ok(extensions[0] instanceof ProcessorExtension)
    assert.ok(extensions[0].instance instanceof SampleDocinfoProcessor)
    assert.equal(typeof extensions[0].processMethod, 'function')
  })

  // NOTE: intentionally using the legacy Treeprocessor alias
  test('should instantiate tree processors (legacy alias)', () => {
    const registry = new Registry()
    registry.treeprocessor(SampleTreeprocessor)
    registry.activate(makeDoc())

    assert.ok(registry.treeprocessors() !== null)
    const extensions = registry.treeprocessors()
    assert.equal(extensions.length, 1)
    assert.ok(extensions[0] instanceof ProcessorExtension)
    assert.ok(extensions[0].instance instanceof SampleTreeprocessor)
    assert.equal(typeof extensions[0].processMethod, 'function')
  })

  test('should instantiate postprocessors', () => {
    const registry = new Registry()
    registry.postprocessor(SamplePostprocessor)
    registry.activate(makeDoc())

    assert.ok(registry.hasPostprocessors())
    const extensions = registry.postprocessors()
    assert.equal(extensions.length, 1)
    assert.ok(extensions[0] instanceof ProcessorExtension)
    assert.ok(extensions[0].instance instanceof SamplePostprocessor)
    assert.equal(typeof extensions[0].processMethod, 'function')
  })

  test('should instantiate block processor registered as a class with explicit name', () => {
    const registry = new Registry()
    registry.block(SampleBlock, 'sample')
    registry.activate(makeDoc())

    assert.ok(registry.hasBlocks())
    assert.ok(registry.registeredForBlock('sample', 'paragraph'))
    const extension = registry.findBlockExtension('sample')
    assert.ok(extension instanceof ProcessorExtension)
    assert.ok(extension.instance instanceof SampleBlock)
    assert.equal(typeof extension.processMethod, 'function')
  })

  test('should not match block processor for unsupported context', () => {
    const registry = new Registry()
    registry.block(SampleBlock, 'sample')
    registry.activate(makeDoc())

    assert.equal(registry.registeredForBlock('sample', 'sidebar'), false)
  })

  test('should instantiate block macro processor', () => {
    const registry = new Registry()
    registry.blockMacro(SampleBlockMacro, 'sample')
    registry.activate(makeDoc())

    assert.ok(registry.hasBlockMacros())
    assert.ok(registry.registeredForBlockMacro('sample'))
    const extension = registry.findBlockMacroExtension('sample')
    assert.ok(extension instanceof ProcessorExtension)
    assert.ok(extension.instance instanceof SampleBlockMacro)
    assert.equal(typeof extension.processMethod, 'function')
  })

  test('should instantiate inline macro processor', () => {
    const registry = new Registry()
    registry.inlineMacro(SampleInlineMacro, 'sample')
    registry.activate(makeDoc())

    assert.ok(registry.hasInlineMacros())
    assert.ok(registry.registeredForInlineMacro('sample'))
    const extension = registry.findInlineMacroExtension('sample')
    assert.ok(extension instanceof ProcessorExtension)
    assert.ok(extension.instance instanceof SampleInlineMacro)
    assert.equal(typeof extension.processMethod, 'function')
  })

  test('should instantiate processor registered as an instance', () => {
    const registry = new Registry()
    registry.preprocessor(new SamplePreprocessor())
    registry.activate(makeDoc())

    assert.ok(registry.hasPreprocessors())
    assert.ok(
      registry.preprocessors()[0].instance instanceof SamplePreprocessor
    )
  })

  test('should raise if processor class does not inherit from correct base', () => {
    class NotAPreprocessor {}
    const registry = new Registry()
    assert.throws(
      () => registry.preprocessor(NotAPreprocessor),
      /Invalid type for preprocessor extension/
    )
  })

  test('should raise if invalid argument given for registering processor', () => {
    const registry = new Registry()
    assert.throws(() => registry.preprocessor(42), {
      message:
        /Invalid arguments specified for registering preprocessor extension/,
    })
  })

  test('does not match extension lookup when no extensions are registered', () => {
    const registry = new Registry()
    registry.activate(makeDoc())

    assert.equal(registry.registeredForBlock('unknown', 'paragraph'), false)
    assert.equal(registry.findBlockExtension('unknown'), null)
    assert.equal(registry.registeredForBlockMacro('unknown'), false)
    assert.equal(registry.findBlockMacroExtension('unknown'), null)
    assert.equal(registry.registeredForInlineMacro('unknown'), false)
    assert.equal(registry.findInlineMacroExtension('unknown'), null)
    assert.deepEqual(registry.inlineMacros(), [])
  })
})

// ── DSL ───────────────────────────────────────────────────────────────────────

describe('Extensions.DSL', () => {
  // ── ProcessorDsl ────────────────────────────────────────────────────────────

  describe('ProcessorDsl', () => {
    test('option() sets a key on the config', () => {
      const proc = new Preprocessor()
      Object.assign(proc, ProcessorDsl)
      proc.option('foo', 'bar')
      assert.equal(proc.config.foo, 'bar')
    })

    test('process() with a function stores the process block', () => {
      const proc = new Preprocessor()
      Object.assign(proc, ProcessorDsl)
      const fn = function (doc, reader) {
        return reader
      }
      proc.process(fn)
      assert.ok(proc.processBlockGiven())
    })

    test('process() without a function calls the stored block', () => {
      const proc = new Preprocessor()
      Object.assign(proc, ProcessorDsl)
      let called = false
      proc.process(function () {
        called = true
      })
      proc.process()
      assert.ok(called)
    })

    test('process() passes arguments to the stored block', () => {
      const proc = new Preprocessor()
      Object.assign(proc, ProcessorDsl)
      let received
      proc.process(function (doc) {
        received = doc
      })
      const doc = makeDoc()
      proc.process(doc)
      assert.equal(received, doc)
    })

    test('process() throws if called before block is registered', () => {
      const proc = new Preprocessor()
      Object.assign(proc, ProcessorDsl)
      assert.throws(() => proc.process(), {
        message: /#process method called before being registered/,
      })
    })

    test('processBlockGiven() returns false before block is set', () => {
      const proc = new Preprocessor()
      Object.assign(proc, ProcessorDsl)
      assert.equal(proc.processBlockGiven(), false)
    })
  })

  // ── DocumentProcessorDsl ────────────────────────────────────────────────────

  describe('DocumentProcessorDsl', () => {
    test('prefer() sets position to >> in config', () => {
      const proc = new Preprocessor()
      Object.assign(proc, DocumentProcessorDsl)
      proc.prefer()
      assert.equal(proc.config.position, '>>')
    })
  })

  // ── SyntaxProcessorDsl ──────────────────────────────────────────────────────

  describe('SyntaxProcessorDsl', () => {
    test('named() sets name on an instance', () => {
      const proc = new BlockProcessor()
      Object.assign(proc, SyntaxProcessorDsl)
      proc.named('myblock')
      assert.equal(proc.name, 'myblock')
    })

    test('contentModel() / parseContentAs() set content_model option', () => {
      const proc = new BlockProcessor()
      Object.assign(proc, SyntaxProcessorDsl)
      proc.contentModel('simple')
      assert.equal(proc.config.content_model, 'simple')
      proc.parseContentAs('compound')
      assert.equal(proc.config.content_model, 'compound')
    })

    test('positionalAttributes() sets positional_attrs option', () => {
      const proc = new BlockProcessor()
      Object.assign(proc, SyntaxProcessorDsl)
      proc.positionalAttributes('name', 'value')
      assert.deepEqual(proc.config.positional_attrs, ['name', 'value'])
    })

    test('defaultAttributes() sets default_attrs option', () => {
      const proc = new BlockProcessor()
      Object.assign(proc, SyntaxProcessorDsl)
      proc.defaultAttributes({ format: 'html' })
      assert.deepEqual(proc.config.default_attrs, { format: 'html' })
    })

    describe('resolveAttributes()', () => {
      function makeProc() {
        const p = new BlockProcessor()
        Object.assign(p, SyntaxProcessorDsl)
        return p
      }

      test('with no args sets empty positional_attrs and default_attrs', () => {
        const p = makeProc()
        p.resolveAttributes()
        assert.deepEqual(p.config.positional_attrs, [])
        assert.deepEqual(p.config.default_attrs, {})
      })

      test('with true sets empty positional_attrs and default_attrs', () => {
        const p = makeProc()
        p.resolveAttributes(true)
        assert.deepEqual(p.config.positional_attrs, [])
        assert.deepEqual(p.config.default_attrs, {})
      })

      test('parses simple positional attribute names from array', () => {
        const p = makeProc()
        p.resolveAttributes('units', 'precision')
        assert.deepEqual(p.config.positional_attrs, ['units', 'precision'])
        assert.deepEqual(p.config.default_attrs, {})
      })

      test('parses indexed positional names (e.g. "1:units")', () => {
        const p = makeProc()
        p.resolveAttributes('1:units', 'precision=1')
        assert.deepEqual(p.config.positional_attrs, ['units'])
        assert.deepEqual(p.config.default_attrs, { precision: '1' })
      })

      test('parses @-indexed names (append to current length)', () => {
        const p = makeProc()
        p.resolveAttributes('@:first', '@:second')
        assert.deepEqual(p.config.positional_attrs, ['first', 'second'])
      })

      test('parses indexed name with default value', () => {
        const p = makeProc()
        p.resolveAttributes('1:name=default')
        assert.deepEqual(p.config.positional_attrs, ['name'])
        assert.deepEqual(p.config.default_attrs, { name: 'default' })
      })

      test('parses Object-style { "1:name": null } specs', () => {
        const p = makeProc()
        p.resolveAttributes({ '1:name': null })
        assert.deepEqual(p.config.positional_attrs, ['name'])
        assert.deepEqual(p.config.default_attrs, {})
      })

      test('parses Object-style with default values', () => {
        const p = makeProc()
        p.resolveAttributes({ format: 'html', '1:target': null })
        // Object key order may vary; check both outcomes
        assert.ok(p.config.positional_attrs.includes('target'))
        assert.equal(p.config.default_attrs.format, 'html')
      })
    })
  })

  // ── BlockProcessorDsl ───────────────────────────────────────────────────────

  describe('BlockProcessorDsl', () => {
    test('contexts() / onContext() set contexts option as a Set', () => {
      const proc = new BlockProcessor()
      Object.assign(proc, BlockProcessorDsl)
      proc.contexts('paragraph', 'open')
      assert.ok(proc.config.contexts instanceof Set)
      assert.ok(proc.config.contexts.has('paragraph'))
      assert.ok(proc.config.contexts.has('open'))
    })

    test('onContext() is an alias for contexts()', () => {
      const proc = new BlockProcessor()
      Object.assign(proc, BlockProcessorDsl)
      proc.onContext('sidebar')
      assert.ok(proc.config.contexts.has('sidebar'))
    })
  })

  // ── MacroProcessorDsl ───────────────────────────────────────────────────────

  describe('MacroProcessorDsl', () => {
    test('resolveAttributes(false) sets content_model to text', () => {
      const proc = new BlockMacroProcessor()
      Object.assign(proc, MacroProcessorDsl)
      proc.resolveAttributes(false)
      assert.equal(proc.config.content_model, 'text')
    })

    test('resolveAttributes() with args sets positional_attrs and content_model to attributes', () => {
      const proc = new BlockMacroProcessor()
      Object.assign(proc, MacroProcessorDsl)
      proc.resolveAttributes('1:target')
      assert.deepEqual(proc.config.positional_attrs, ['target'])
      assert.equal(proc.config.content_model, 'attributes')
    })
  })

  // ── InlineMacroProcessorDsl ─────────────────────────────────────────────────

  describe('InlineMacroProcessorDsl', () => {
    test('format() / matchFormat() set format option', () => {
      const proc = new InlineMacroProcessor()
      Object.assign(proc, InlineMacroProcessorDsl)
      proc.format('short')
      assert.equal(proc.config.format, 'short')
      proc.matchFormat('long')
      assert.equal(proc.config.format, 'long')
    })

    test('match() sets regexp option', () => {
      const proc = new InlineMacroProcessor()
      Object.assign(proc, InlineMacroProcessorDsl)
      const rx = /foo:\[(.+?)\]/
      proc.match(rx)
      assert.equal(proc.config.regexp, rx)
    })
  })
})

// ── BlockProcessor defaults ───────────────────────────────────────────────────

describe('BlockProcessor', () => {
  test('default content_model is compound', () => {
    const bp = new BlockProcessor('myblock')
    assert.equal(bp.config.content_model, 'compound')
  })

  test('default contexts is Set containing open and paragraph', () => {
    const bp = new BlockProcessor('myblock')
    assert.ok(bp.config.contexts instanceof Set)
    assert.ok(bp.config.contexts.has('open'))
    assert.ok(bp.config.contexts.has('paragraph'))
  })

  test('contexts can be overridden via config', () => {
    const bp = new BlockProcessor('myblock', { contexts: ['sidebar'] })
    assert.ok(bp.config.contexts.has('sidebar'))
    assert.ok(!bp.config.contexts.has('open'))
  })
})

// ── DocinfoProcessor ─────────────────────────────────────────────────────────

describe('DocinfoProcessor', () => {
  test('default location is head', () => {
    const dp = new DocinfoProcessor()
    assert.equal(dp.config.location, 'head')
  })

  test('location can be overridden via config', () => {
    const dp = new DocinfoProcessor({ location: 'footer' })
    assert.equal(dp.config.location, 'footer')
  })
})

// ── InlineMacroProcessor regexp ───────────────────────────────────────────────

describe('InlineMacroProcessor', () => {
  test('resolveRegexp throws for invalid macro name', () => {
    const proc = new InlineMacroProcessor('valid')
    assert.throws(() => proc.resolveRegexp('invalid name', null), {
      message: /invalid name for inline macro/,
    })
  })

  test('regexp is resolved lazily and memoised', () => {
    const proc = new InlineMacroProcessor('mymacro')
    const rx1 = proc.regexp
    const rx2 = proc.regexp
    assert.ok(rx1 instanceof RegExp)
    assert.equal(rx1, rx2)
  })

  test('short format regexp matches short macro syntax', () => {
    const proc = new InlineMacroProcessor('btn')
    proc.config.format = 'short'
    // Reset cached regexp
    delete proc.config.regexp
    const rx = proc.regexp
    assert.ok(rx.test('btn:[text]'))
  })
})

// ── BlockMacroProcessor name validation ──────────────────────────────────────

describe('BlockMacroProcessor', () => {
  test('name getter throws for illegal macro name', () => {
    const proc = new BlockMacroProcessor('illegal name')
    assert.throws(() => proc.name, { message: /invalid name for block macro/ })
  })

  test('name getter does not throw for valid macro name', () => {
    const proc = new BlockMacroProcessor('my-macro')
    assert.equal(proc.name, 'my-macro')
  })
})

// ── Registry block-style registration ────────────────────────────────────────

describe('Registry.blockStyle', () => {
  test('preprocessor registered with block style invokes process block', () => {
    const registry = new Registry()
    let invoked = false
    registry.preprocessor(function () {
      this.process(function (_doc, reader) {
        invoked = true
        return reader
      })
    })
    registry.activate(makeDoc())
    const ext = registry.preprocessors()[0]
    ext.processMethod({}, {})
    assert.ok(invoked)
  })

  test('preprocessor registered with block style with arity > 0 yields processor', () => {
    const registry = new Registry()
    let invoked = false
    registry.preprocessor(function (processor) {
      processor.process(function (_doc, reader) {
        invoked = true
        return reader
      })
    })
    registry.activate(makeDoc())
    const ext = registry.preprocessors()[0]
    ext.processMethod({}, {})
    assert.ok(invoked)
  })

  test('block registered with block style and explicit name', () => {
    const registry = new Registry()
    registry.block('yell', function () {
      this.process(function (_parent, _reader, _attrs) {})
    })
    registry.activate(makeDoc())
    assert.ok(registry.hasBlocks())
    assert.ok(registry.registeredForBlock('yell', 'open'))
  })

  test('block_macro registered with block style and explicit name', () => {
    const registry = new Registry()
    registry.blockMacro('gist', function () {
      this.process(function (_parent, _target, _attrs) {})
    })
    registry.activate(makeDoc())
    assert.ok(registry.hasBlockMacros())
    assert.ok(registry.registeredForBlockMacro('gist'))
  })

  test('inline_macro registered with block style and explicit name', () => {
    const registry = new Registry()
    registry.inlineMacro('chrome', function () {
      this.process(function (_parent, _target, _attrs) {})
    })
    registry.activate(makeDoc())
    assert.ok(registry.hasInlineMacros())
    assert.ok(registry.registeredForInlineMacro('chrome'))
  })

  test('throws if block style processor has no process block', () => {
    const registry = new Registry()
    assert.throws(
      () =>
        registry.preprocessor(function () {
          /* no process() call */
        }),
      { message: /No block specified to process preprocessor extension/ }
    )
  })

  test('throws if block style syntax processor has no name', () => {
    const registry = new Registry()
    assert.throws(
      () =>
        registry.block(function () {
          this.process(function () {})
          // no named() call
        }),
      { message: /No name specified for block extension/ }
    )
  })
})

// ── Registry.prefer ───────────────────────────────────────────────────────────

describe('Registry.prefer', () => {
  test('prefer() with DSL sets position >> causing extension to be inserted at front', () => {
    const registry = new Registry()
    // Register D first (goes to back)
    registry.treeProcessor(function () {
      this.process(function (doc) {
        return doc
      })
    })
    // Register C with DSL prefer (position = '>>' → inserted at front)
    registry.treeProcessor(function () {
      this.prefer()
      this.process(function (doc) {
        return doc
      })
    })
    registry.activate(makeDoc())
    const exts = registry.treeprocessors()
    assert.equal(exts.length, 2)
    // C (with prefer) should be at index 0, D at index 1
    assert.equal(exts[0].config.position, '>>')
  })

  test('prefer() with method name registers and moves extension to front', () => {
    const registry = new Registry()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        return doc
      })
    })
    // prefer registers a new extension and moves it to front
    const extB = registry.prefer('treeProcessor', function () {
      this.process(function (doc) {
        return doc
      })
    })
    registry.activate(makeDoc())
    const exts = registry.treeprocessors()
    assert.equal(exts[0], extB)
  })

  test('prefer() with ProcessorExtension directly moves it to front', () => {
    const registry = new Registry()
    // Register A first
    registry.treeProcessor(function () {
      this.process(function (doc) {
        return doc
      })
    })
    // Register B (to be preferred later)
    const extB = registry.treeProcessor(function () {
      this.process(function (doc) {
        return doc
      })
    })
    registry.activate(makeDoc())
    // B is currently at index 1; prefer moves it to 0
    registry.prefer(extB)
    const exts = registry.treeprocessors()
    assert.equal(exts[0], extB)
  })

  test('prefer() with class name and class registers class and moves to front', () => {
    class MyTree extends TreeProcessor {
      process(doc) {
        return doc
      }
    }
    const registry = new Registry()
    registry.treeProcessor(function () {
      this.process(function (doc) {
        return doc
      })
    })
    const extMy = registry.prefer('treeProcessor', MyTree)
    registry.activate(makeDoc())
    const exts = registry.treeprocessors()
    assert.equal(exts[0], extMy)
    assert.ok(exts[0].instance instanceof MyTree)
  })

  test('prefer() ordering with all styles produces correct order', () => {
    // Mirrors the Ruby test: SelfSigningTree, A, B, C, D
    class SelfSigningTreeProcessor extends TreeProcessor {
      process(doc) {
        return doc
      }
    }

    const registry = new Registry()

    // D – registered first, no prefer → goes to back
    registry.treeProcessor(function () {
      this.process(function () {})
    })

    // C – DSL prefer, inserted at front immediately → [C, D]
    registry.treeProcessor(function () {
      this.prefer()
      this.process(function () {})
    })

    // B – prefer with method name: registered at back [C, D, B] then moved to front → [B, C, D]
    registry.prefer('treeProcessor', function () {
      this.process(function () {})
    })

    // A – registered first at back [B, C, D, A], then preferred → [A, B, C, D]
    const extA = registry.treeProcessor(function () {
      this.process(function () {})
    })
    registry.prefer(extA)

    // Self – prefer with class: registered at back [A, B, C, D, Self], then preferred → [Self, A, B, C, D]
    registry.prefer('treeProcessor', SelfSigningTreeProcessor)

    registry.activate(makeDoc())
    const exts = registry.treeprocessors()
    assert.equal(exts.length, 5)
    assert.ok(exts[0].instance instanceof SelfSigningTreeProcessor)
    assert.equal(exts[1], extA)
  })
})

// ── Extension / ProcessorExtension ───────────────────────────────────────────

describe('Extension', () => {
  test('Extension stores kind, instance, and config', () => {
    const inst = new SamplePreprocessor()
    const ext = new Extension('preprocessor', inst, inst.config)
    assert.equal(ext.kind, 'preprocessor')
    assert.equal(ext.instance, inst)
    assert.equal(ext.config, inst.config)
  })

  test('ProcessorExtension stores a processMethod function', () => {
    const inst = new SamplePreprocessor()
    const ext = new ProcessorExtension('preprocessor', inst)
    assert.equal(typeof ext.processMethod, 'function')
  })

  test('ProcessorExtension.processMethod delegates to instance.process', () => {
    class MyPrep extends Preprocessor {
      process(doc) {
        return `processed:${doc}`
      }
    }
    const inst = new MyPrep()
    const ext = new ProcessorExtension('preprocessor', inst)
    assert.equal(ext.processMethod('doc'), 'processed:doc')
  })
})

// ── IncludeProcessor.handles DSL ─────────────────────────────────────────────

describe('IncludeProcessorDsl.handles', () => {
  test('handles with arity-2 function is stored as-is', () => {
    const proc = new IncludeProcessor()
    Object.assign(proc, IncludeProcessorDsl)
    proc.handles(function (_doc, target) {
      return target === 'foo.adoc'
    })
    assert.ok(proc.handles(null, 'foo.adoc'))
    assert.ok(!proc.handles(null, 'bar.adoc'))
  })

  test('handles with arity-1 function is wrapped to accept (doc, target)', () => {
    const proc = new IncludeProcessor()
    Object.assign(proc, IncludeProcessorDsl)
    proc.handles(function (target) {
      return target.endsWith('.txt')
    })
    assert.ok(proc.handles(null, 'lorem.txt'))
    assert.ok(!proc.handles(null, 'lorem.adoc'))
  })

  test('handles with no block returns true by default', () => {
    const proc = new IncludeProcessor()
    Object.assign(proc, IncludeProcessorDsl)
    assert.equal(proc.handles(null, 'anything.adoc'), true)
  })
})

// ── DocinfoProcessorDsl.atLocation ───────────────────────────────────────────

describe('DocinfoProcessorDsl', () => {
  test('atLocation() sets location option', () => {
    const proc = new DocinfoProcessor()
    Object.assign(proc, DocinfoProcessorDsl)
    proc.atLocation('footer')
    assert.equal(proc.config.location, 'footer')
  })
})

// ── Processor static config inheritance ──────────────────────────────────────

describe('Processor.staticConfig', () => {
  test('static option() sets default config for the class', () => {
    class Configured extends Preprocessor {}
    Configured.option('custom', 'value')
    const inst = new Configured()
    assert.equal(inst.config.custom, 'value')
  })

  test('instance config inherits from class config but can override', () => {
    class Configured extends Preprocessor {}
    Configured.option('key', 'class-value')
    const inst = new Configured({ key: 'instance-value' })
    assert.equal(inst.config.key, 'instance-value')
  })

  test('static configs are not shared between sibling subclasses', () => {
    class A extends Preprocessor {}
    class B extends Preprocessor {}
    A.option('only-in-a', true)
    assert.ok(!('only-in-a' in B.config))
  })
})

// ── Group ─────────────────────────────────────────────────────────────────────

describe('Group', () => {
  beforeEach(() => Extensions.unregisterAll())

  test('Group.register() adds the class to global groups', () => {
    SampleExtensionGroup.register('mygroup')
    assert.equal(Extensions.groups()['mygroup'], SampleExtensionGroup)
  })

  test('Group subclass activate() is called during registry.activate()', () => {
    class MyGroup extends Group {
      activate(registry) {
        registry.document.attributes['my-group-activated'] = true
      }
    }
    Extensions.register('mygroup', MyGroup)
    const doc = makeDoc()
    const registry = new Registry()
    registry.activate(doc)
    assert.ok(doc.attributes['my-group-activated'])
  })
})
