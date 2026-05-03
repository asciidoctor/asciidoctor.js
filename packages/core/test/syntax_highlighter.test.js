import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { assertCss, assertXpath } from './helpers.js'
import {
  convertString,
  convertStringToEmbedded,
  documentFromString,
} from './harness.js'
import {
  SyntaxHighlighterBase,
  CustomFactory,
  DefaultFactory,
  SyntaxHighlighter,
} from '../src/syntax_highlighter.js'
import { HtmlPipelineAdapter } from '../src/syntaxHighlighter/html_pipeline.js'

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
        assertXpath(
          output,
          '//*[contains(@class,"listingblock")]//pre/code[contains(@class,"language-ruby")]',
          1
        )
        assert(
          output.includes('puts &quot;hello&quot;') ||
            output.includes('puts "hello"')
        )
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
        assertXpath(
          output,
          '//*[contains(@class,"listingblock")]//pre/code[@data-lang="javascript"]',
          1
        )
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
        assertXpath(
          output,
          '//*[contains(@class,"listingblock")]//pre/code[contains(@class,"language-ruby")]',
          1
        )
        assert(output.includes('def greet'))
        assert(output.includes('end'))
      })
    })

    describe('syntax_highlighter_factory option', () => {
      test('should work with a synchronous format() method', async () => {
        class SyncHighlighter extends SyntaxHighlighterBase {
          format(node, lang, opts) {
            return '<pre class="sync-hl"><code>sync-format-output</code></pre>'
          }
        }
        const factory = new CustomFactory()
        factory.register(SyncHighlighter, 'sync-hl')
        const input = `\
:source-highlighter: sync-hl

[source,ruby]
----
puts "hello"
----
`
        const output = await convertStringToEmbedded(input, {
          safe: 'safe',
          syntax_highlighter_factory: factory,
        })
        assert(output.includes('sync-format-output'))
      })

      test('should substitute a custom syntax highlighter factory instance', async () => {
        const input = `\
[source,ruby]
----
puts 'Hello, World!'
----
`
        // Map 'github' → HtmlPipelineAdapter via a custom factory
        const factory = new CustomFactory({
          github: SyntaxHighlighter.for('html-pipeline'),
        })
        const doc = await documentFromString(input, {
          safe: 'safe',
          syntax_highlighter_factory: factory,
          attributes: { 'source-highlighter': 'github' },
        })
        assert(doc.syntaxHighlighter instanceof HtmlPipelineAdapter)
        const output = await doc.convert()
        assert(output.includes('<pre lang="ruby"><code>'))
      })

      test('should substitute an extended syntax highlighter factory implementation', async () => {
        const input = `\
[source,ruby]
----
puts 'Hello, World!'
----
`
        // Factory that ignores the requested name and always resolves to highlightjs
        // Delegates to the global SyntaxHighlighter singleton since built-ins are
        // only registered there (not on individual DefaultFactory instances).
        class RedirectFactory extends DefaultFactory {
          for(name) {
            return SyntaxHighlighter.for('highlightjs')
          }
        }
        const doc = await documentFromString(input, {
          safe: 'safe',
          syntax_highlighter_factory: new RedirectFactory(),
          attributes: { 'source-highlighter': 'coderay' },
        })
        assert(doc.syntaxHighlighter != null)
        const output = await doc.convert()
        assert(!output.includes('CodeRay'))
        assert(output.includes('hljs'))
      })
    })

    describe('syntax_highlighters option', () => {
      test('should disable a syntax highlighter by setting its value to null', async () => {
        const doc = await documentFromString('', {
          safe: 'safe',
          syntax_highlighters: { coderay: null },
          attributes: { 'source-highlighter': 'coderay' },
        })
        assert(doc.syntaxHighlighter == null)
      })

      test('should override a syntax highlighter with a custom implementation', async () => {
        class CustomHighlighter extends SyntaxHighlighterBase {
          handlesHighlighting() {
            return true
          }

          highlight(node, source, lang, opts) {
            return 'highlighted'
          }
        }
        const input = `\
[source,ruby]
----
puts 'Hello, World!'
----
`
        const output = await convertStringToEmbedded(input, {
          safe: 'safe',
          syntax_highlighters: { coderay: CustomHighlighter },
          attributes: { 'source-highlighter': 'coderay' },
        })
        assertCss(output, 'pre.coderay.highlight', 1)
        assertXpath(
          output,
          '//pre[@class="coderay highlight"]/code[text()="highlighted"]',
          1
        )
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
        assertCss(
          output,
          'html > head > link[rel="stylesheet"][href*="github.min.css"]',
          1
        )
        assertCss(output, 'html > body > script[src*="highlight.min.js"]', 1)
      })
    })
  })
})
