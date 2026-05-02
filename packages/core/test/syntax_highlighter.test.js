import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { assertCss, assertXpath } from './helpers.js'
import { convertString, convertStringToEmbedded } from './harness.js'

describe('SyntaxHighlighter', () => {
  describe('highlightjs', () => {
    describe('format', () => {
      test('should render source block content inside pre>code tags', async () => {
        const input = `\
:source-highlighter: highlightjs

[source,ruby]
----
puts "hello"
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertCss(output, '.listingblock pre.highlightjs.highlight', 1)
        assertXpath(output, '//*[contains(@class,"listingblock")]//pre/code[contains(@class,"language-ruby")]', 1)
        assert(output.includes('puts &quot;hello&quot;') || output.includes('puts "hello"'))
      })

      test('should set data-lang attribute on code element', async () => {
        const input = `\
:source-highlighter: highlightjs

[source,javascript]
----
console.log('hi')
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertXpath(output, '//*[contains(@class,"listingblock")]//pre/code[@data-lang="javascript"]', 1)
      })

      test('should render source block without language', async () => {
        const input = `\
:source-highlighter: highlightjs

[source]
----
some code
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertCss(output, '.listingblock pre.highlightjs.highlight', 1)
        assertXpath(output, '//*[contains(@class,"listingblock")]//pre/code', 1)
        assert(output.includes('some code'))
      })

      test('should add nowrap class to pre element when nowrap option is set', async () => {
        const input = `\
:source-highlighter: highlightjs

[source%nowrap,ruby]
----
puts "hello"
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertCss(output, '.listingblock pre.highlightjs.highlight.nowrap', 1)
      })

      test('should add nowrap class to pre element when prewrap attribute is unset', async () => {
        const input = `\
:source-highlighter: highlightjs
:prewrap!:

[source,ruby]
----
puts "hello"
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertCss(output, '.listingblock pre.highlightjs.highlight.nowrap', 1)
      })

      test('should remove highlight class from pre when nohighlight-option is set', async () => {
        const input = `\
:source-highlighter: highlightjs

[source%nohighlight,ruby]
----
puts "hello"
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertCss(output, '.listingblock pre.highlightjs:not(.highlight)', 1)
        assertCss(output, '.listingblock pre.highlight', 0)
      })

      test('should preserve multiline content', async () => {
        const input = `\
:source-highlighter: highlightjs

[source,ruby]
----
def greet(name)
  puts "Hello, #{name}"
end
----
`
        const output = await convertStringToEmbedded(input, { safe: 'safe' })
        assertCss(output, '.listingblock pre.highlightjs.highlight', 1)
        assertXpath(output, '//*[contains(@class,"listingblock")]//pre/code[contains(@class,"language-ruby")]', 1)
        assert(output.includes('def greet'))
        assert(output.includes('end'))
      })
    })

    describe('docinfo', () => {
      test('should add highlight.js script and stylesheet to document', async () => {
        const input = `\
:source-highlighter: highlightjs

[source,ruby]
----
puts "hello"
----
`
        const output = await convertString(input, { safe: 'safe' })
        assertCss(output, 'html > head > link[rel="stylesheet"][href*="github.min.css"]', 1)
        assertCss(output, 'html > body > script[src*="highlight.min.js"]', 1)
      })
    })
  })
})