import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vento from 'ventojs'

import { load } from '../src/load.js'
import { TemplateEngine } from '../src/template_engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, 'fixtures', 'templates')

async function convert(source, options = {}) {
  const doc = await load(source, options)
  return doc.convert()
}

describe('TemplateEngine registry to add custom engines', () => {
  afterEach(() => {
    TemplateEngine.registry = {}
  })

  test('should register a new custom engine in TemplateEngine registry', () => {
    TemplateEngine.register('slim', {
      compile(file, _name) {
        return {
          render(ctx) {
            return 'dummy template'
          },
        }
      },
    })

    assert.equal(Object.keys(TemplateEngine.registry).length, 1)
  })

  test('should render an asynchronous template from custom engine', async () => {
    const options = {
      safe: 'safe',
      backend: 'html5',
      template_dir: join(TEMPLATES_DIR, 'vto'),
      template_engine: 'vto',
    }
    TemplateEngine.register('vto', {
      async compile(file, _name) {
        const env = vento()
        const render = await env.load(file)
        return {
          async render(ctx) {
            return (await render(ctx)).content
          },
        }
      },
    })
    const result = await convert('*bold* statement', options)
    assert.ok(
      result.includes(
        '<p class="paragraph-vto"><strong>bold</strong> statement</p>'
      ),
      `Unexpected output:\n${result}`
    )
  })
})
