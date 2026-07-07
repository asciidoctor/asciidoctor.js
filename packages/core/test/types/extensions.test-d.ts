// Type-level tests for the extension registration DSL.
//
// These are compile-only checks: `npm run test:types` runs `tsc --noEmit`
// against this file using the generated declarations in ../../types.
// A regression in the JSDoc typings makes this file fail to compile.

import {
  type BlockProcessorDslInterface,
  BlockProcessor,
  type Document,
  IncludeProcessor,
  Registry,
} from '../../types/index.js'

const registry = new Registry()

// ── block(name, fn): `this` is the block DSL, `parent`/`reader` are typed ──────
registry.block('shout', function () {
  // `this` is BlockProcessorDslInterface
  this.onContext('paragraph')

  this.process((parent, reader) =>
    // `parent` is AbstractBlock, `reader` is Reader (so getLines() resolves),
    // and createBlock is available on the bound `this`.
    this.createBlock(
      parent,
      'paragraph',
      reader.getLines().join('\n').toUpperCase()
    )
  )
})

// ── block(fn) overload (no explicit name) ─────────────────────────────────────
registry.block(function () {
  this.named('shout')
  this.process((parent, reader) =>
    this.createBlock(parent, 'paragraph', reader.getLines().join('\n'))
  )
})

// ── block(ClassConstructor) overload ──────────────────────────────────────────
class ShoutBlock extends BlockProcessor {}
registry.block(ShoutBlock)
registry.block(ShoutBlock, 'shout')

// ── `this` inside the registration fn is explicitly the DSL interface ──────────
registry.block('typed', function (this: BlockProcessorDslInterface) {
  this.onContexts('paragraph', 'open')
})

// ── blockMacro(name, fn): parent/target/attributes typed, createBlock on `this` ─
registry.blockMacro('gist', function () {
  this.process((parent, target, attributes) => {
    const id: string = target
    void attributes
    return this.createBlock(parent, 'pass', `<script src="${id}"></script>`)
  })
})

// ── inlineMacro(name, fn): returns an Inline via createInline ──────────────────
registry.inlineMacro('kbd', function () {
  this.process((parent, target) =>
    this.createInline(parent, 'quoted', target, { type: 'monospaced' })
  )
})

// ── preprocessor(fn): (document, reader) → Reader | void ──────────────────────
registry.preprocessor(function () {
  this.process((document, reader) => {
    void document.getAttributes()
    return reader
  })
})

// ── treeProcessor(fn): (document) → Document | void ───────────────────────────
registry.treeProcessor(function () {
  this.process((document) => {
    void document.getBlocks()
  })
})

// ── postprocessor(fn): (document, output) → string ────────────────────────────
registry.postprocessor(function () {
  this.process((document, output) => {
    void document
    return output.replace('</body>', '<footer>x</footer></body>')
  })
})

// ── includeProcessor(fn): (document, reader, target, attributes) → void ───────
registry.includeProcessor(function () {
  this.handles((target) => target.startsWith('http'))
  this.process((document, reader, target, attributes) => {
    void document
    void attributes
    void target
    // `reader` is a Reader — getLines() resolves to string[]
    void reader.getLines()
  })
})

// ── IncludeProcessor#handles: both the arity-1 (target-only, Ruby-style) and ──
//    the arity-2 (doc, target) override forms must type-check.
class HttpInclude extends IncludeProcessor {
  handles(target: string): boolean {
    return target.startsWith('http')
  }
}
class ScopedInclude extends IncludeProcessor {
  handles(doc: Document, target: string): boolean {
    void doc
    return target.startsWith('http')
  }
}
registry.includeProcessor(HttpInclude)
registry.includeProcessor(ScopedInclude)

// ── docinfoProcessor(fn): (document) → string ─────────────────────────────────
registry.docinfoProcessor(function () {
  this.atLocation('head')
  this.process((document) => {
    void document
    return '<meta name="x" content="y">'
  })
})

// ── Negative checks: misuse must NOT compile ──────────────────────────────────
registry.block('bad-context', function () {
  // @ts-expect-error onContext takes string(s), not a number
  this.onContext(42)
})

registry.block('bad-reader', function () {
  this.process((_parent, reader) => {
    // @ts-expect-error getLines() returns string[]; there is no `.nope`
    reader.nope()
    return undefined
  })
})

registry.postprocessor(function () {
  // @ts-expect-error postprocessor process must return a string, not a number
  this.process((_document, _output) => 42)
})

registry.inlineMacro('bad-inline', function () {
  this.process((parent, target) => {
    void target
    // @ts-expect-error createInline needs a context + text, not just parent
    return this.createInline(parent)
  })
})
