// Port of the 'Registering converter' describe block from packages/core/test/node/asciidoctor.test.js
//
// Ruby interop tests ($==, $send, $handles?, $respond_to?, $new) are not ported because
// they are specific to the Opal bridge and have no equivalent in the core JS implementation.
// Template-driven composite converter tests are also omitted as they require external fixtures.

import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import asciidoctor from '../src/index.js'

// ── Converter classes used across multiple tests ───────────────────────────────

class BlankConverter {
  convert () {
    return ''
  }
}

class DummyConverter {
  constructor () {
    this.transforms = {
      embedded: async (node) => {
        return `<dummy>${await node.getContent()}</dummy>`
      },
      paragraph: (node) => {
        return node.getContent()
      }
    }
  }

  convert (node, transform) {
    return this.transforms[transform || node.nodeName](node)
  }
}

class DelegateConverter {
  convert (node, transform) {
    return this[`convert_${transform || node.nodeName}`](node)
  }

  async convert_embedded (node) { // eslint-disable-line camelcase
    return `<delegate>${await node.getContent()}</delegate>`
  }

  convert_paragraph (node) { // eslint-disable-line camelcase
    return node.getContent()
  }
}

class TEIConverter {
  constructor (backend, _) {
    this.backend = backend
    this.backendTraits = {
      basebackend: 'xml',
      outfilesuffix: '.xml',
      filetype: 'xml',
      htmlsyntax: 'xml'
    }
    this.transforms = {
      embedded: async (node) => {
        return `<tei>${await node.getContent()}</tei>`
      }
    }
  }

  async convert (node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return await this.convertParagraph(node)
    }
    return await this.transforms[name](node)
  }

  convertParagraph (node) {
    return node.getContent()
  }
}

class XMLConverter {
  constructor () {
    this.backend = 'xml'
    this.basebackend = 'xml'
    this.outfilesuffix = '.xml'
    this.filetype = 'xml'
    this.htmlsyntax = 'xml'
    this.transforms = {
      embedded: async (node) => {
        return `<xml>${await node.getContent()}</xml>`
      }
    }
  }

  convert (node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return this.convertParagraph(node)
    }
    return this.transforms[name](node)
  }

  convertParagraph (node) {
    return node.getContent()
  }
}

class TxtConverter {
  constructor () {
    this.backendTraits = {
      basebackend: 'txt',
      outfilesuffix: '.txt',
      filetype: 'txt',
      htmlsyntax: 'txt',
      supports_templates: true
    }
    this.transforms = {
      embedded: async (node) => {
        return `${await node.getContent()}`
      }
    }
  }

  convert (node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return this.convertParagraph(node)
    }
    return this.transforms[name](node)
  }

  convertParagraph (node) {
    return node.getContent()
  }
}

class EPUB3Converter {
  constructor () {
    this.backend = 'epub3'
    this.basebackend = 'html'
    this.outfilesuffix = '.epub'
    this.htmlsyntax = 'xml'
    this.transforms = {
      embedded: async (node) => {
        return `<epub3>${await node.getContent()}</epub3>`
      }
    }
  }

  convert (node, transform) {
    const name = transform || node.nodeName
    if (name === 'paragraph') {
      return this.convertParagraph(node)
    }
    return this.transforms[name](node)
  }

  convertParagraph (node) {
    return node.getContent()
  }
}

class XrefConverter {
  convert (node, transform) {
    const name = transform || node.nodeName
    if (name === 'inline_anchor') {
      return this.convertInlineAnchor(node)
    }
    return node.getContent()
  }

  convertInlineAnchor (node) {
    return `
getAttributes().fragment: ${typeof node.getAttributes().fragment === 'undefined'}
getAttribute('fragment'): ${typeof node.getAttribute('fragment') === 'undefined'}`
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Registering converter', () => {
  afterEach(() => {
    asciidoctor.ConverterFactory.unregisterAll()
  })

  test('should get inline anchor attributes', async () => {
    asciidoctor.ConverterFactory.register(new XrefConverter(), ['xref'])
    const html = await asciidoctor.convert('xref:file.adoc[]', { backend: 'xref' })
    assert.equal(html, `
getAttributes().fragment: true
getAttribute('fragment'): true`)
  })

  test('should return the default converter registry', async () => {
    const doc = await asciidoctor.load('')
    let registry = asciidoctor.ConverterFactory.getRegistry()
    assert.ok('html5' in registry)
    assert.equal(asciidoctor.ConverterFactory.for('blank'), undefined)
    asciidoctor.ConverterFactory.register(new BlankConverter(), ['blank'])
    registry = asciidoctor.ConverterFactory.getRegistry()
    assert.deepEqual(Object.keys(registry).sort(), ['blank', 'html5'].sort())
    assert.equal(typeof asciidoctor.ConverterFactory.for('html5'), 'function')
    assert.equal(typeof asciidoctor.ConverterFactory.for('blank'), 'object')
    assert.equal(asciidoctor.ConverterFactory.for('foo'), undefined)
    const result = registry.blank.convert()
    assert.equal(result, '')
    const html5Converter = registry.html5.create()
    assert.equal(
      await html5Converter.convert(asciidoctor.Block.create(doc, 'paragraph')),
      `<div class="paragraph">\n<p></p>\n</div>`
    )
  })

  test('should register a custom converter', async () => {
    asciidoctor.ConverterFactory.register(new DummyConverter(), ['dummy'])
    const result = await asciidoctor.convert('content', { safe: 'safe', backend: 'dummy' })
    assert.ok(result.includes('<dummy>content</dummy>'))
  })

  test('should register a custom converter with delegate', async () => {
    asciidoctor.ConverterFactory.register(new DelegateConverter(), ['delegate'])
    const result = await asciidoctor.convert('content', { safe: 'safe', backend: 'delegate' })
    assert.ok(result.includes('<delegate>content</delegate>'))
  })

  test('should retrieve backend traits from a converter class using backendTraits', async () => {
    asciidoctor.ConverterFactory.register(TEIConverter, ['tei'])
    const doc = await asciidoctor.load('content', { safe: 'safe', backend: 'tei' })
    assert.equal(doc.getAttribute('basebackend'), 'xml')
    assert.equal(doc.getAttribute('outfilesuffix'), '.xml')
    assert.equal(doc.getAttribute('filetype'), 'xml')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<tei>content</tei>'))
  })

  test('should retrieve backend traits from a converter instance using backendTraits property', async () => {
    asciidoctor.ConverterFactory.register(new TxtConverter(), ['txt'])
    const doc = await asciidoctor.load('content', { safe: 'safe', backend: 'txt' })
    assert.equal(doc.getAttribute('basebackend'), 'txt')
    assert.equal(doc.getAttribute('outfilesuffix'), '.txt')
    assert.equal(doc.getAttribute('filetype'), 'txt')
    assert.equal(doc.getAttribute('htmlsyntax'), 'txt')
    const result = await doc.convert()
    assert.ok(result.includes('content'))
  })

  test('should retrieve backend traits from a converter instance using plain properties', async () => {
    asciidoctor.ConverterFactory.register(new XMLConverter(), ['xml'])
    const doc = await asciidoctor.load('content', { safe: 'safe', backend: 'xml' })
    assert.equal(doc.getAttribute('basebackend'), 'xml')
    assert.equal(doc.getAttribute('outfilesuffix'), '.xml')
    assert.equal(doc.getAttribute('filetype'), 'xml')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<xml>content</xml>'))
  })

  test('should retrieve backend traits from a converter class using plain properties', async () => {
    asciidoctor.ConverterFactory.register(new EPUB3Converter(), ['epub3'])
    const doc = await asciidoctor.load('content', { safe: 'safe', backend: 'epub3' })
    assert.equal(doc.getAttribute('basebackend'), 'html')
    assert.equal(doc.getAttribute('outfilesuffix'), '.epub')
    assert.equal(doc.getAttribute('htmlsyntax'), 'xml')
    const result = await doc.convert()
    assert.ok(result.includes('<epub3>content</epub3>'))
  })

  test('should register a custom converter (fallback to the built-in HTML5 converter)', async () => {
    class BlogConverter {
      constructor () {
        this.baseConverter = asciidoctor.Html5Converter.create()
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
          }
        }
      }

      convert (node, transform, opts) {
        const template = this.transforms[transform || node.nodeName]
        if (template) {
          return template(node)
        }
        return this.baseConverter.convert(node, transform, opts)
      }
    }

    asciidoctor.ConverterFactory.register(new BlogConverter(), ['blog'])
    const options = { safe: 'safe', header_footer: true, backend: 'blog' }
    const input = `= One Thing to Write the Perfect Blog Post
Guillaume Grossetie <ggrossetie@yuzutech.fr>

== Write in AsciiDoc!

AsciiDoc is about being able to focus on expressing your ideas, writing with ease and passing on knowledge without the distraction of complex applications or angle brackets.
In other words, it's about discovering writing zen.`
    const result = await asciidoctor.convert(input, options)
    assert.ok(result.includes('<span class="blog-author">Guillaume Grossetie</span>')) // custom blog converter
    assert.ok(result.includes('<div class="sect1">')) // built-in HTML5 converter
  })
})
