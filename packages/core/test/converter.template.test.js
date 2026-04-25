import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import nunjucks from 'nunjucks'
import dot from 'dot'

import { load } from '../src/load.js'
import { TemplateConverter } from '../src/converter/template.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, 'fixtures', 'templates')

async function convert (source, options = {}) {
  const doc = await load(source, options)
  return doc.convert()
}

describe('Using a template converter', () => {
  test('should use a Pug template', async () => {
    const result = await convert('content', { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'pug') })
    assert.ok(result.includes('<p class="paragraph-pug">content</p>'), `Unexpected output:\n${result}`)
  })

  test('should use a Nunjucks template', async () => {
    const result = await convert('content', { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'nunjucks') })
    assert.ok(result.includes('<p class="paragraph-nunjucks">content</p>'), `Unexpected output:\n${result}`)
  })

  test('should use an EJS template', async () => {
    const result = await convert('content', { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'ejs') })
    assert.ok(result.includes('<p class="paragraph-ejs">content</p>'), `Unexpected output:\n${result}`)
  })

  test('should use a Handlebars template', async () => {
    const result = await convert('content', { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars') })
    assert.ok(result.includes('<p class="paragraph-handlebars">content</p>'), `Unexpected output:\n${result}`)
  })

  test('should use a doT template', async () => {
    const options = { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'dot'), template_engine: 'dot' }
    TemplateConverter.TemplateEngine.register('dot', {
      compile (file, _name) {
        const fn = dot.template(readFileSync(file, 'utf8'))
        return { render: (ctx) => fn(ctx) }
      },
    })
    const result = await convert('content', options)
    assert.ok(result.includes('<p class="paragraph-dot">content</p>'), `Unexpected output:\n${result}`)
  })

  test('should use a JavaScript template', async () => {
    const result = await convert('*bold* statement', { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'js') })
    assert.ok(result.includes('<p class="paragraph-js"><strong>bold</strong> statement</p>'), `Unexpected output:\n${result}`)
  })

  test('should handle a given node', async () => {
    const doc = await load('content', { safe: 'safe', backend: '-', template_dir: join(TEMPLATES_DIR, 'nunjucks') })
    const templateConverter = doc.getConverter()
    assert.equal(templateConverter.handles('paragraph'), true)
    assert.equal(templateConverter.handles('admonition'), false)
  })

  test('should convert a given node', async () => {
    const { Block } = await import('../src/block.js')
    const doc = await load('content', { safe: 'safe', backend: '-', template_dir: join(TEMPLATES_DIR, 'nunjucks') })
    const templateConverter = doc.getConverter()
    const paragraph = Block.create(doc, 'paragraph', { source: 'This is a <test>' })
    const result = await templateConverter.convert(paragraph, 'paragraph')
    assert.equal(result, '<p class="paragraph-nunjucks">This is a &lt;test&gt;</p>')
  })

  test('should get templates', async () => {
    const { Block } = await import('../src/block.js')
    const doc = await load('content', { safe: 'safe', backend: '-', template_dir: join(TEMPLATES_DIR, 'nunjucks') })
    const templateConverter = doc.getConverter()
    const templates = templateConverter.getTemplates()
    assert.ok(templates.paragraph, 'Expected paragraph template')
    assert.equal(templates.admonition, undefined)
  })

  test('should get the template converter caches', async () => {
    TemplateConverter.clearCache()
    const templateDir = join(TEMPLATES_DIR, 'nunjucks')
    await load('content', { safe: 'safe', backend: '-', template_dir: templateDir })
    const cache = TemplateConverter.getCache()
    const templatesPattern = resolve(templateDir, '*').replace(/\\/g, '/')
    assert.ok(cache.scans[templatesPattern], 'Expected scan cache entry')
    assert.ok(cache.scans[templatesPattern].paragraph, 'Expected paragraph in scan cache')
    const templateFilePath = resolve(templateDir, 'paragraph.njk')
    assert.ok(cache.templates[templateFilePath], 'Expected template file in template cache')
  })

  test('should replace an existing template', async () => {
    const doc = await load('content', { safe: 'safe', backend: '-', template_dir: join(TEMPLATES_DIR, 'nunjucks') })
    const templateConverter = doc.getConverter()
    const template = nunjucks.compile('<p class="paragraph nunjucks">{{ node.getContent() }}</p>')
    templateConverter.register('paragraph', template)
    const templates = templateConverter.getTemplates()
    assert.ok(templates.paragraph, 'Expected replaced paragraph template')
  })

  test('should register a new template', async () => {
    const doc = await load('content', { safe: 'safe', backend: '-', template_dir: join(TEMPLATES_DIR, 'nunjucks') })
    const templateConverter = doc.getConverter()
    const template = nunjucks.compile(`<article class="message is-info">
  <div class="message-header">
    <p>{{ node.getAttribute('textlabel') }}</p>
  </div>
  <div class="message-body">
    {{ node.getContent() }}
  </div>
</article>`)
    templateConverter.register('admonition', template)
    const templates = templateConverter.getTemplates()
    assert.ok(templates.admonition, 'Expected admonition template to be registered')
  })

  test('should create an isolated environment per template directory', async () => {
    const result = await convert(`
image:a.png[]

image::b.png[]
`, {
      safe: 'safe',
      backend: 'html5',
      template_dirs: [join(TEMPLATES_DIR, 'nunjucks-ctx-a'), join(TEMPLATES_DIR, 'nunjucks-ctx-b')],
    })
    assert.equal(result, `<p class="paragraph"><img class="inline" src="https://cdn.jsdelivr.net/a.png"/></p>
<img src="https://cdn.statically.io/b.png"/>`)
  })

  test('should allow to use different template engines inside the same directory', async () => {
    const result = await convert(`This a paragraph with an inline image image:b.png[].
And here's a block image:

image::b.png[]
`, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'mixed') })
    assert.equal(result, `<p class="paragraph-handlebars">This a paragraph with an inline image <img class="inline" src="https://cdn.jsdelivr.net/b.png"/>.
And here&#8217;s a block image:</p>
<div class="imageblock">
<div class="content">
<img src="b.png" alt="b">
</div>
</div>`)
  })

  test('should resolve Nunjucks include', async () => {
    const result = await convert(`
* foo
* bar
* baz
`, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'nunjucks-include') })
    assert.equal(result.replace(/\r/g, '').replace(/\n/g, ''), '<ul class="ulist"><p>foo</p><p>bar</p><p>baz</p></ul>')
  })

  test('should configure Nunjucks environment using the template_engine_options', async () => {
    const result = await convert('Simple paragraph with an inline image image:cat.png[]', {
      safe: 'safe',
      backend: 'html5',
      template_dir: join(TEMPLATES_DIR, 'nunjucks'),
      template_cache: false,
      template_engine_options: {
        nunjucks: {
          autoescape: false,
          web: { async: true },
        },
      },
    })
    assert.equal(result, '<p class="paragraph-nunjucks">Simple paragraph with an inline image <span class="image"><img src="cat.png" alt="cat"></span></p>')
  })

  test('should configure Handlebars environment using the template_engine_options', async () => {
    const result = await convert('Simple paragraph with an inline image image:cat.png[]', {
      safe: 'safe',
      backend: 'html5',
      template_dir: join(TEMPLATES_DIR, 'handlebars'),
      template_cache: false,
      template_engine_options: {
        handlebars: { noEscape: true },
      },
    })
    assert.equal(result, '<p class="paragraph-handlebars">Simple paragraph with an inline image <span class="image"><img src="cat.png" alt="cat"></span></p>')
  })

  test('should configure Pug templates using the template_engine_options', async () => {
    const result = await convert('image:cat.png[]', {
      safe: 'safe',
      backend: 'html5',
      template_dir: join(TEMPLATES_DIR, 'pug'),
      template_cache: false,
      template_engine_options: {
        pug: { doctype: 'xml' },
      },
    })
    assert.equal(result, '<p class="paragraph-pug"><img src="cat.png"></img></p>')
  })

  test('should configure EJS templates using the template_engine_options', async () => {
    const result = await convert('A simple paragraph.', {
      safe: 'safe',
      backend: 'html5',
      template_dir: join(TEMPLATES_DIR, 'ejs-custom-delimiters'),
      template_cache: false,
      template_engine_options: {
        ejs: {
          delimiter: '?',
          openDelimiter: '[',
          closeDelimiter: ']',
        },
      },
    })
    assert.equal(result, '<p class="paragraph-ejs">A simple paragraph.</p>')
  })

  test('should resolve conflicts consistently when the same template exists in multiple directories', async () => {
    let result = await convert('a simple paragraph', {
      safe: 'safe',
      backend: 'html5',
      template_dirs: [join(TEMPLATES_DIR, 'nunjucks'), join(TEMPLATES_DIR, 'nunjucks-ctx-b')],
    })
    assert.equal(result, '<p class="paragraph">a simple paragraph</p>')

    result = await convert('a simple paragraph', {
      safe: 'safe',
      backend: 'html5',
      template_dirs: [join(TEMPLATES_DIR, 'nunjucks-ctx-b'), join(TEMPLATES_DIR, 'nunjucks')],
    })
    assert.equal(result, '<p class="paragraph-nunjucks">a simple paragraph</p>')
  })

  test('should resolve conflicts consistently when the same template exists in the same directory', async () => {
    const result = await convert('a simple paragraph', {
      safe: 'safe',
      backend: 'html5',
      template_dir: join(TEMPLATES_DIR, 'conflict'),
    })
    assert.equal(result, '<p class="paragraph-nunjucks">a simple paragraph</p>')
  })

  test('should cache helpers', async () => {
    const options = {
      safe: 'safe',
      backend: 'html5',
      template_cache: true,
      template_dir: join(TEMPLATES_DIR, 'helpers'),
    }
    const first = await convert('image::test.png[]', options)
    assert.equal(first, 'value')
    const second = await convert('image::test.png[]', options)
    assert.equal(second, 'value')
  })

  describe('Using Handlebar helpers', () => {
    test('should render the id', async () => {
      const content = `
[#id1]
content`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = '<div id="id1" class="paragraph-handlebars"><p>content</p>\n</div>'.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })

    test('should render additional classes of the paragraph', async () => {
      const content = `
[#id1.text-center]
content`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = `<div id="id1" class="paragraph-handlebars text-center">
  <p>content</p>
</div>`.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })

    test('should render the title of the paragraph', async () => {
      const content = `
.MyTitle
[#id1.text-center]
content`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = `<div id="id1" class="paragraph-handlebars text-center">
  <div class="title">MyTitle</div>
  <p>content</p>
</div>`.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })

    test('should render an ordered list', async () => {
      const content = `
. Item1
. Item2`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = `<div class="olist arabic">
  <ol class="arabic">
    <li><p>Item1</p>
    </li>
    <li><p>Item2</p>
    </li>
  </ol>
</div>`.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })

    test('should render a nested ordered list', async () => {
      const content = `
. Item1
.. Item1.1`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = `<div class="olist arabic">
      <ol class="arabic">
        <li><p>Item1</p>
          <div class="olist loweralpha">
          <ol class="loweralpha">
            <li><p>Item1.1</p></li>
          </ol>
        </div>
        </li>
      </ol>
</div>`.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })

    test('should recognize the reversed option of the list', async () => {
      const content = `
[%reversed]
. Item1
. Item2`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = `<div class="olist arabic">
  <ol class="arabic" reversed="true">
    <li><p>Item1</p>
    </li>
    <li><p>Item2</p>
    </li>
  </ol>
</div>`.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })

    test('should recognize the start attribute of the list', async () => {
      const content = `
[start=4]
. Item1
. Item2`
      const result = (await convert(content, { safe: 'safe', backend: 'html5', template_dir: join(TEMPLATES_DIR, 'handlebars-json') })).replace(/\s{2,}|\r?\n|\r/g, '')
      const expected = `<div class="olist arabic">
  <ol class="arabic" start="4">
    <li><p>Item1</p>
    </li>
    <li><p>Item2</p>
    </li>
  </ol>
</div>`.replace(/\s{2,}|\r?\n|\r/g, '')
      assert.ok(result.includes(expected), `Expected:\n${expected}\nIn:\n${result}`)
    })
  })
})
