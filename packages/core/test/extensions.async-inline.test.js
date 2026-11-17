// Inline macros and syntax highlighter docinfo may be asynchronous.

import { describe, test, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { Extensions, SyntaxHighlighter, convert } from '../src/index.js'
import { SyntaxHighlighterBase } from '../src/syntax_highlighter.js'

const delay = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms))

describe('Async inline macro', () => {
  afterEach(() => {
    Extensions.unregisterAll()
  })

  test('should wait for an async inline macro', async () => {
    Extensions.register(function () {
      this.inlineMacro(function () {
        this.named('shout')
        this.process(async function (parent, target) {
          await delay()
          return this.createInline(parent, 'quoted', target.toUpperCase())
        })
      })
    })
    const html = await convert('Say shout:hello[] now')
    assert.ok(html.includes('Say HELLO now'))
  })
})

describe('Async syntax highlighter docinfo', () => {
  class AsyncDocinfoHighlighter extends SyntaxHighlighterBase {
    hasDocinfo() {
      return true
    }

    async docinfo(location) {
      await delay()
      return `<!-- async docinfo ${location} -->`
    }
  }

  for (const backend of ['html5', 'semantic-html5']) {
    test(`should await docinfo() with the ${backend} backend`, async () => {
      SyntaxHighlighter.register(AsyncDocinfoHighlighter, 'asyncdocinfo')
      const html = await convert('[source,js]\n----\nx\n----', {
        standalone: true,
        backend,
        attributes: { 'source-highlighter': 'asyncdocinfo' },
      })
      assert.ok(html.includes('<!-- async docinfo head -->'))
      assert.ok(html.includes('<!-- async docinfo footer -->'))
      assert.ok(!html.includes('[object Promise]'))
    })
  }
})
