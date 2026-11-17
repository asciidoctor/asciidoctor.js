// Document-level extensions (preprocessor, tree processor, postprocessor, docinfo processor)
// may be asynchronous: the conversion must wait for the returned promise.

import { describe, test, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { Extensions, convert } from '../src/index.js'

const delay = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms))

describe('Async document extensions', () => {
  afterEach(() => {
    Extensions.unregisterAll()
  })

  test('should wait for an async tree processor', async () => {
    Extensions.register(function () {
      this.treeProcessor(function () {
        this.process(async (document) => {
          await delay()
          document.setAttribute('value', 'Changed by tree processor')
        })
      })
    })
    const html = await convert(':value: Original text\n\n{value}')
    assert.ok(html.includes('Changed by tree processor'))
    assert.ok(!html.includes('Original text'))
  })

  test('should wait for an async preprocessor', async () => {
    Extensions.register(function () {
      this.preprocessor(function () {
        this.process(async (_document, reader) => {
          await delay()
          reader.pushInclude(['Changed by preprocessor'], 'x', 'x', 1, {})
          return reader
        })
      })
    })
    const html = await convert('Original text')
    assert.ok(html.includes('Changed by preprocessor'))
  })

  test('should wait for an async postprocessor', async () => {
    Extensions.register(function () {
      this.postprocessor(function () {
        this.process(async (_document, output) => {
          await delay()
          return output.replace('Original', 'Changed')
        })
      })
    })
    const html = await convert('Original text')
    assert.ok(html.includes('Changed text'))
  })

  test('should wait for an async docinfo processor', async () => {
    Extensions.register(function () {
      this.docinfoProcessor(function () {
        this.atLocation('footer')
        this.process(async () => {
          await delay()
          return '<p>async docinfo</p>'
        })
      })
    })
    const html = await convert('Original text', { standalone: true })
    assert.ok(html.includes('<p>async docinfo</p>'))
  })
})
