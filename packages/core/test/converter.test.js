// Port of converter_test.rb (Custom backends / Custom converters contexts).
//
// Omitted (not portable to JS):
//   - View options / Custom backends template tests: require Haml/Slim/ERB template engines
//   - Ruby interop: $==, $send, $handles?, $respond_to? — Opal-bridge specific
//   - method_missing delegation tests: no equivalent in JS
//   - DefaultFactoryProxy proxy semantics: new DefaultFactory() in JS is a standalone factory,
//     not a proxy over the global registry

import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  ConverterFactory,
  ConverterBase,
  ConverterCustomFactory,
  convert,
  load,
  Block,
  Html5Converter,
} from '../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, 'fixtures')

// ── Converter classes used across multiple tests ───────────────────────────────

class BlankConverter {
  convert() {
    return ''
  }
}

class DummyConverter {
  constructor() {
    this.transforms = {
      embedded: async (node) => {
        return `<dummy>${await node.getContent()}</dummy>`
      },
      paragraph: (node) => {
        return node.getContent()
      },
    }
  }

  convert(node, transform) {
    return this.transforms[transform || node.nodeName](node)
  }
}

class DelegateConverter {
  convert(node, transform) {
    return this[`convert_${transform || node.nodeName}`](node)
  }

  async convert_embedded(node) {
    // eslint-disable-line camelcase
    return `<delegate>${await node.getContent()}</delegate>`
  }

  convert_paragraph(node) {
    // eslint-disable-line camelcase
    return node.getContent()
  }
}

class TEIConverter {
  constructor(backend, _) {
    this.backend = backend
    this.backendTraits = {
      basebackend: 'xml',
      outfilesuffix: '.xml',
      filetype: 'xml',
      htmlsyntax: 'xml',
    }
    this.transforms = {
      embedded: async (node) => {
        return `<tei>${await node.getContent()}</tei>`
      },
    }
  }

  async convert(node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return await this.convertParagraph(node)
    }
    return await this.transforms[name](node)
  }

  convertParagraph(node) {
    return node.getContent()
  }
}

class XMLConverter {
  constructor() {
    this.backend = 'xml'
    this.basebackend = 'xml'
    this.outfilesuffix = '.xml'
    this.filetype = 'xml'
    this.htmlsyntax = 'xml'
    this.transforms = {
      embedded: async (node) => {
        return `<xml>${await node.getContent()}</xml>`
      },
    }
  }

  convert(node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return this.convertParagraph(node)
    }
    return this.transforms[name](node)
  }

  convertParagraph(node) {
    return node.getContent()
  }
}

class TxtConverter {
  constructor() {
    this.backendTraits = {
      basebackend: 'txt',
      outfilesuffix: '.txt',
      filetype: 'txt',
      htmlsyntax: 'txt',
      supports_templates: true,
    }
    this.transforms = {
      embedded: async (node) => {
        return `${await node.getContent()}`
      },
    }
  }

  convert(node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return this.convertParagraph(node)
    }
    return this.transforms[name](node)
  }

  convertParagraph(node) {
    return node.getContent()
  }
}

class EPUB3Converter {
  constructor() {
    this.backend = 'epub3'
    this.basebackend = 'html'
    this.outfilesuffix = '.epub'
    this.htmlsyntax = 'xml'
    this.transforms = {
      embedded: async (node) => {
        return `<epub3>${await node.getContent()}</epub3>`
      },
    }
  }

  convert(node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return this.convertParagraph(node)
    }
    return this.transforms[name](node)
  }

  convertParagraph(node) {
    return node.getContent()
  }
}

class XrefConverter {
  convert(node, transform) {
    const name = transform || node.nodeName
    if (name === 'inline_anchor') {
      return this.convertInlineAnchor(node)
    }
    return node.getContent()
  }

  convertInlineAnchor(node) {
    return `
getAttributes().fragment: ${typeof node.getAttributes().fragment === 'undefined'}
getAttribute('fragment'): ${node.getAttribute('fragment') === null}`
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Registering converter', () => {
  afterEach(() => {
    ConverterFactory.unregisterAll()
  })

  test('should get inline anchor attributes', async () => {
    ConverterFactory.register(new XrefConverter(), ['xref'])
    const html = await convert('xref:file.adoc[]', { backend: 'xref' })
    assert.equal(
      html,
      `
getAttributes().fragment: true
getAttribute('fragment'): true`
    )
  })

  test('should return the default converter registry', async () => {
    const doc = await load('')
    let registry = ConverterFactory.getRegistry()
    assert.ok('html5' in registry)
    assert.equal(ConverterFactory.for('blank'), undefined)
    ConverterFactory.register(new BlankConverter(), ['blank'])
    registry = ConverterFactory.getRegistry()
    assert.deepEqual(Object.keys(registry).sort(), ['blank', 'html5'].sort())
    assert.equal(typeof ConverterFactory.for('html5'), 'function')
    assert.equal(typeof ConverterFactory.for('blank'), 'object')
    assert.equal(ConverterFactory.for('foo'), undefined)
    const result = registry.blank.convert()
    assert.equal(result, '')
    const html5Converter = registry.html5.create()
    assert.equal(
      await html5Converter.convert(Block.create(doc, 'paragraph')),
      `<div class="paragraph">\n<p></p>\n</div>`
    )
  })

  test('should register a custom converter', async () => {
    ConverterFactory.register(new DummyConverter(), ['dummy'])
    const result = await convert('content', { safe: 'safe', backend: 'dummy' })
    assert.ok(result.includes('<dummy>content</dummy>'))
  })

  test('should register a custom converter with delegate', async () => {
    ConverterFactory.register(new DelegateConverter(), ['delegate'])
    const result = await convert('content', {
      safe: 'safe',
      backend: 'delegate',
    })
    assert.ok(result.includes('<delegate>content</delegate>'))
  })

  test('should retrieve backend traits from a converter class using backendTraits', async () => {
    ConverterFactory.register(TEIConverter, ['tei'])
    const doc = await load('content', { safe: 'safe', backend: 'tei' })
    assert.equal(doc.getAttribute('basebackend'), 'xml')
    assert.equal(doc.getAttribute('outfilesuffix'), '.xml')
    assert.equal(doc.getAttribute('filetype'), 'xml')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<tei>content</tei>'))
  })

  test('should retrieve backend traits from a converter instance using backendTraits property', async () => {
    ConverterFactory.register(new TxtConverter(), ['txt'])
    const doc = await load('content', { safe: 'safe', backend: 'txt' })
    assert.equal(doc.getAttribute('basebackend'), 'txt')
    assert.equal(doc.getAttribute('outfilesuffix'), '.txt')
    assert.equal(doc.getAttribute('filetype'), 'txt')
    assert.equal(doc.getAttribute('htmlsyntax'), 'txt')
    const result = await doc.convert()
    assert.ok(result.includes('content'))
  })

  test('should retrieve backend traits from a converter instance using plain properties', async () => {
    ConverterFactory.register(new XMLConverter(), ['xml'])
    const doc = await load('content', { safe: 'safe', backend: 'xml' })
    assert.equal(doc.getAttribute('basebackend'), 'xml')
    assert.equal(doc.getAttribute('outfilesuffix'), '.xml')
    assert.equal(doc.getAttribute('filetype'), 'xml')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<xml>content</xml>'))
  })

  test('should retrieve backend traits from a converter class using plain properties', async () => {
    ConverterFactory.register(new EPUB3Converter(), ['epub3'])
    const doc = await load('content', { safe: 'safe', backend: 'epub3' })
    assert.equal(doc.getAttribute('basebackend'), 'html')
    assert.equal(doc.getAttribute('outfilesuffix'), '.epub')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<epub3>content</epub3>'))
  })

  test('should register a custom converter (fallback to the built-in HTML5 converter)', async () => {
    class BlogConverter {
      constructor() {
        this.baseConverter = Html5Converter.create()
        this.transforms = {
          document: async (node) => {
            return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog</title>
  <link rel="stylesheet" href="./stylesheets/blog.css" />
</head>
<body>
  <section>
    <div class="meta">
      <div class="avatar">by</div>
      <div class="byline">
        <span class="blog-author">${node.getDocument().getAuthor()}</span>
        <time>${node.getDocument().getAttribute('revdate')}</time>
      </div>
    </div>
    <h1 class="blog-title">${node.getDocumentTitle()}</h1>
  </section>
  <section>
    ${await node.getContent()}
  </section>
</body>`
          },
        }
      }

      convert(node, transform, opts) {
        const template = this.transforms[transform || node.nodeName]
        if (template) {
          return template(node)
        }
        return this.baseConverter.convert(node, transform, opts)
      }
    }

    ConverterFactory.register(new BlogConverter(), ['blog'])
    const options = { safe: 'safe', header_footer: true, backend: 'blog' }
    const input = `= One Thing to Write the Perfect Blog Post
Guillaume Grossetie <ggrossetie@yuzutech.fr>

== Write in AsciiDoc!

AsciiDoc is about being able to focus on expressing your ideas, writing with ease and passing on knowledge without the distraction of complex applications or angle brackets.
In other words, it's about discovering writing zen.`
    const result = await convert(input, options)
    assert.ok(
      result.includes('<span class="blog-author">Guillaume Grossetie</span>')
    ) // custom blog converter
    assert.ok(result.includes('<div class="sect1">')) // built-in HTML5 converter
  })
})

describe('Custom backends', () => {
  afterEach(() => {
    ConverterFactory.unregisterAll()
  })

  test('should set outfilesuffix according to backend info', async () => {
    const doc = await load('content')
    await doc.convert()
    assert.equal(doc.getAttribute('outfilesuffix'), '.html')
  })

  test('should not override outfilesuffix attribute if locked', async () => {
    const doc = await load('content', { attributes: { outfilesuffix: '.foo' } })
    await doc.convert()
    assert.equal(doc.getAttribute('outfilesuffix'), '.foo')
  })
})

describe('Custom converters', () => {
  afterEach(() => {
    ConverterFactory.unregisterAll()
  })

  test('should derive backend traits for the given backend', () => {
    const expected = {
      basebackend: 'dita',
      filetype: 'dita',
      outfilesuffix: '.dita',
    }
    assert.deepEqual(ConverterFactory.deriveBackendTraits('dita2'), expected)
  })

  test('should use specified converter for current backend', async () => {
    class CustomHtmlConverterA {
      convert(_node) {
        return 'document'
      }
    }
    const doc = await load('= Title\n\n== Section\n\ncontent', {
      converter: CustomHtmlConverterA,
    })
    assert.ok(doc.converter instanceof CustomHtmlConverterA)
    assert.equal(doc.getAttribute('filetype'), 'html')
    assert.equal(await doc.convert(), 'document')
  })

  test('should use specified converter for specified backend', async () => {
    class CustomTextConverterA {
      convert(_node) {
        return 'document'
      }
    }
    const doc = await load('= Title\n\n== Section\n\ncontent', {
      backend: 'text',
      converter: CustomTextConverterA,
    })
    assert.ok(doc.converter instanceof CustomTextConverterA)
    assert.equal(doc.getAttribute('filetype'), 'text')
    assert.equal(await doc.convert(), 'document')
  })

  test('should get converter from specified converter factory', async () => {
    class MyConverter extends ConverterBase {
      async convert(_node, _transform, _opts) {
        return 'document'
      }
    }
    const converterFactory = new ConverterCustomFactory({ html5: MyConverter })
    const doc = await load('= Title\n\n== Section\n\ncontent', {
      converter_factory: converterFactory,
    })
    assert.ok(doc.converter instanceof MyConverter)
    assert.equal(doc.getAttribute('filetype'), 'html')
    assert.equal(await doc.convert(), 'document')
  })

  test('should allow converter to set htmlsyntax when basebackend is html', async () => {
    const converter = Html5Converter.create('html5', { htmlsyntax: 'xml' })
    const doc = await load('image::sunset.jpg[]', { converter })
    assert.equal(doc.converter, converter)
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const output = await doc.convert({ standalone: false })
    assert.ok(output.includes('<img src="sunset.jpg" alt="sunset"/>'))
  })

  test('should use converter registered for backend via ConverterBase.registerFor', async () => {
    class CustomConverterB extends ConverterBase {
      constructor(backend, opts) {
        super(backend, opts)
        this.basebackend('text')
        this.filetype('text')
        this.outfilesuffix('.fb')
      }

      convert(_node) {
        return 'foobar content'
      }
    }
    CustomConverterB.registerFor('foobar')

    assert.equal(ConverterFactory.for('foobar'), CustomConverterB)
    const registry = ConverterFactory.converters()
    assert.ok('foobar' in registry)
    assert.equal(registry.foobar, CustomConverterB)
    const output = await convert('content', { backend: 'foobar' })
    assert.equal(output, 'foobar content')
  })

  test('should be able to register converter class via registerFor with string', async () => {
    class FooBazConverter extends ConverterBase {
      constructor(backend, opts) {
        super(backend, opts)
        this.basebackend('text')
        this.filetype('text')
        this.outfilesuffix('.fb')
      }
    }
    FooBazConverter.registerFor('foobaz')
    assert.equal(ConverterFactory.for('foobaz'), FooBazConverter)
  })

  test('should use basebackend to compute filetype and outfilesuffix', async () => {
    class SlidesConverter extends ConverterBase {
      constructor(backend, opts) {
        super(backend, opts)
        this.basebackend('html')
      }
    }
    SlidesConverter.registerFor('slides')

    const doc = await load('content', { backend: 'slides' })
    assert.equal(doc.outfilesuffix, '.html')
    assert.equal(doc.getAttribute('basebackend'), 'html')
    assert.equal(doc.getAttribute('filetype'), 'html')
    assert.equal(doc.getAttribute('htmlsyntax'), 'html')
    assert.equal(doc.getAttribute('outfilesuffix'), '.html')
  })

  test('should be able to register converter from the converter class itself', async () => {
    class AnotherCustomConverter extends ConverterBase {}
    assert.equal(ConverterFactory.for('another'), undefined)
    AnotherCustomConverter.registerFor('another')
    assert.equal(ConverterFactory.for('another'), AnotherCustomConverter)
  })

  test('should default to catch-all converter', async () => {
    class CustomConverterF {
      convert(_node) {
        return 'foobaz content'
      }
    }
    ConverterFactory.register(CustomConverterF, '*')

    assert.equal(ConverterFactory.for('all'), CustomConverterF)
    assert.equal(ConverterFactory.for('whatever'), CustomConverterF)
    // html5 is in _defaultRegistry (loaded by earlier tests) — catch-all must not shadow it
    assert.notEqual(ConverterFactory.for('html5'), CustomConverterF)
    const registry = ConverterFactory.converters()
    assert.equal(registry['*'], undefined)
    assert.equal(ConverterFactory._catchAll, CustomConverterF)
    const output = await convert('content', { backend: 'foobaz' })
    assert.equal(output, 'foobaz content')
  })

  test('should use catch-all converter from custom factory only if no other converter matches', () => {
    class FooConverter extends ConverterBase {}
    class CatchAllConverter extends ConverterBase {}

    const factory = new ConverterCustomFactory({
      foo: FooConverter,
      '*': CatchAllConverter,
    })
    assert.equal(factory.for('foo'), FooConverter)
    assert.equal(factory.for('nada'), CatchAllConverter)
    assert.equal(factory.for('html5'), CatchAllConverter)
  })

  test('should create a new ConverterCustomFactory with seeded converters', () => {
    class MyConverter extends ConverterBase {}
    const factory = new ConverterCustomFactory({ mine: MyConverter })
    assert.ok(factory instanceof ConverterCustomFactory)
    assert.equal(factory.for('mine'), MyConverter)
  })

  test('can call readSvgContents on built-in HTML5 converter', async () => {
    const doc = await load('image::circle.svg[]', {
      base_dir: fixturesDir,
      safe: 'safe',
    })
    const result = await doc.converter.readSvgContents(
      doc.blocks[0],
      'circle.svg'
    )
    // In browser environments the SVG file cannot be read via node:fs;
    // using this message triggers the shim's isBrowserIncompatible check → test is skipped.
    assert.ok(result != null, 'SVG does not exist or cannot be read')
    assert.ok(result.startsWith('<svg'))
  })
})
