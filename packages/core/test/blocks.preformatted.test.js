import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage } from './helpers.js'
import {
  documentFromString,
  convertString,
  convertStringToEmbedded,
  blockFromString,
} from './harness.js'

describe('Blocks', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Preformatted Blocks', () => {
    test('should separate adjacent paragraphs and listing into blocks', async () => {
      const input = `\
paragraph 1
----
listing content
----
paragraph 2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="paragraph"]/p', 2)
      assertXpath(output, '/*[@class="listingblock"]', 1)
      assertXpath(
        output,
        '(/*[@class="paragraph"]/following-sibling::*)[1][@class="listingblock"]',
        1
      )
    })

    test('should warn if listing block is not terminated', async () => {
      const input = `\
outside

----
inside

still inside

eof
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="listingblock"]', 1)
      assertMessage(
        logger,
        'warn',
        '<stdin>: line 3: unterminated listing block'
      )
    })

    test('should not crash when converting verbatim block that has no lines', async () => {
      for (const input of ['----\n----', '....\n....']) {
        const output = await convertStringToEmbedded(input)
        assertCss(output, 'pre', 1)
        assertCss(output, 'pre:empty', 1)
      }
    })

    test('should return content as empty string for verbatim or raw block that has no lines', async () => {
      for (const input of ['----\n----', '....\n....']) {
        const doc = await documentFromString(input)
        assert.equal(await doc.blocks[0].content(), '')
      }
    })

    test('should preserve newlines in literal block', async () => {
      const input = `\
....
line one

line two

line three
....
`
      for (const standalone of [true, false]) {
        const output = await convertString(input, { standalone })
        assertXpath(output, '//pre', 1)
        assertXpath(output, '//pre/text()', 1)
        // TODO: needs DOM parser
        // const text = xmlnodes_at_xpath('//pre/text()', output, 1).text
        // const lines = text.split('\n').map((l) => l + '\n')
        // assert.equal(lines.length, 5)
        // const expected = 'line one\n\nline two\n\nline three'.split('\n').map((l) => l + '\n')
        // assert.deepEqual(lines, expected)
        const blankLines = (output.match(/\n[ \t]*\n/g) || []).length
        assert.ok(blankLines >= 2)
      }
    })

    test('should preserve newlines in listing block', async () => {
      const input = `\
----
line one

line two

line three
----
`
      for (const standalone of [true, false]) {
        const output = await convertString(input, { standalone })
        assertXpath(output, '//pre', 1)
        assertXpath(output, '//pre/text()', 1)
        // TODO: needs DOM parser
        // const text = xmlnodes_at_xpath('//pre/text()', output, 1).text
        // const lines = text.split('\n').map((l) => l + '\n')
        // assert.equal(lines.length, 5)
        // const expected = 'line one\n\nline two\n\nline three'.split('\n').map((l) => l + '\n')
        // assert.deepEqual(lines, expected)
        const blankLines = (output.match(/\n[ \t]*\n/g) || []).length
        assert.ok(blankLines >= 2)
      }
    })

    test('should preserve newlines in verse block', async () => {
      const input = `\
--
[verse]
____
line one

line two

line three
____
--
`
      for (const standalone of [true, false]) {
        const output = await convertString(input, { standalone })
        assertXpath(output, '//*[@class="verseblock"]/pre', 1)
        assertXpath(output, '//*[@class="verseblock"]/pre/text()', 1)
        // TODO: needs DOM parser
        // const text = xmlnodes_at_xpath('//*[@class="verseblock"]/pre/text()', output, 1).text
        // const lines = text.split('\n').map((l) => l + '\n')
        // assert.equal(lines.length, 5)
        // const expected = 'line one\n\nline two\n\nline three'.split('\n').map((l) => l + '\n')
        // assert.deepEqual(lines, expected)
        const blankLines = (output.match(/\n[ \t]*\n/g) || []).length
        assert.ok(blankLines >= 2)
      }
    })

    test('should strip leading and trailing blank lines when converting verbatim block', async () => {
      const input = `\
[subs=attributes+]
....


  first line

last line

{empty}

....
`
      const doc = await documentFromString(input, { standalone: false })
      const block = doc.blocks[0]
      assert.deepEqual(block.lines, [
        '',
        '',
        '  first line',
        '',
        'last line',
        '',
        '{empty}',
        '',
      ])
      const result = await doc.convert()
      assertXpath(result, `//pre[text()="  first line\n\nlast line"]`, 1)
    })

    test('should process block with CRLF line endings', async () => {
      const input = `----\r\nsource line 1\r\nsource line 2\r\n----\r\n`

      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="listingblock"]//pre', 1)
      assertXpath(
        output,
        `/*[@class="listingblock"]//pre[text()="source line 1\nsource line 2"]`,
        1
      )
    })

    test('should remove block indent if indent attribute is 0', async () => {
      const input = `\
[indent="0"]
----
    def names

      @names.split

    end
----
`
      const _expected = `def names

  @names.split

end`

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre', 1)
      assertCss(output, '.listingblock pre', 1)
      // TODO: needs DOM parser
      // const result = xmlnodes_at_xpath('//pre', output, 1).text
      // assert.equal(result, expected)
    })

    test('should not remove block indent if indent attribute is -1', async () => {
      const input = `\
[indent="-1"]
----
    def names

      @names.split

    end
----
`
      // expected = lines 2..6 (0-based) joined, with trailing newline chopped
      const inputLines = input.split('\n')
      const _expected = inputLines.slice(2, 7).join('\n').replace(/\n$/, '')

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre', 1)
      assertCss(output, '.listingblock pre', 1)
      // TODO: needs DOM parser
      // const result = xmlnodes_at_xpath('//pre', output, 1).text
      // assert.equal(result, expected)
    })

    test('should set block indent to value specified by indent attribute', async () => {
      const input = `\
[indent="1"]
----
    def names

      @names.split

    end
----
`
      // expected = lines 2..6 with 4 spaces replaced by 1 space, joined, trailing newline chopped
      const inputLines = input.split('\n')
      const _expected = inputLines
        .slice(2, 7)
        .map((l) => l.replace('    ', ' '))
        .join('\n')
        .replace(/\n$/, '')

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre', 1)
      assertCss(output, '.listingblock pre', 1)
      // TODO: needs DOM parser
      // const result = xmlnodes_at_xpath('//pre', output, 1).text
      // assert.equal(result, expected)
    })

    test('should set block indent to value specified by indent document attribute', async () => {
      const input = `\
:source-indent: 1

[source,ruby]
----
    def names

      @names.split

    end
----
`
      // expected = lines 4..8 with 4 spaces replaced by 1 space, joined, trailing newline chopped
      const inputLines = input.split('\n')
      const _expected = inputLines
        .slice(4, 9)
        .map((l) => l.replace('    ', ' '))
        .join('\n')
        .replace(/\n$/, '')

      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre', 1)
      assertCss(output, '.listingblock pre', 1)
      // TODO: needs DOM parser
      // const result = xmlnodes_at_xpath('//pre', output, 1).text
      // assert.equal(result, expected)
    })

    test('should expand tabs if tabsize attribute is positive', async () => {
      const input = `:tabsize: 4

[indent=0]
----
\tdef names

\t\t@names.split

\tend
----
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre', 1)
      assertCss(output, '.listingblock pre', 1)
      assertXpath(
        output,
        `//pre[text()="def names\n\n    @names.split\n\nend"]`,
        1
      )
    })

    test('should expand tabs if tabsize is set as a block attribute', async () => {
      const input = `\
[tabsize=4,indent=0]
----
\tdef names

\t\t@names.split

\tend
----
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre', 1)
      assertCss(output, '.listingblock pre', 1)
      assertXpath(
        output,
        `//pre[text()="def names\n\n    @names.split\n\nend"]`,
        1
      )
    })

    test('literal block should honor nowrap option', async () => {
      const input = `\
[options="nowrap"]
----
Do not wrap me if I get too long.
----
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre.nowrap', 1)
    })

    test('literal block should set nowrap class if prewrap document attribute is disabled', async () => {
      const input = `\
:prewrap!:

----
Do not wrap me if I get too long.
----
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'pre.nowrap', 1)
    })

    test('should preserve guard in front of callout if icons are not enabled', async () => {
      const input = `\
----
puts 'Hello, World!' # <1>
puts 'Goodbye, World ;(' # <2>
----
`
      const result = await convertStringToEmbedded(input)
      assert.ok(result.includes(' # <b class="conum">(1)</b>'))
      assert.ok(result.includes(' # <b class="conum">(2)</b>'))
    })

    test('should preserve guard around callout if icons are not enabled', async () => {
      const input = `\
----
<parent> <!--1-->
  <child/> <!--2-->
</parent>
----
`
      const result = await convertStringToEmbedded(input)
      assert.ok(result.includes(' &lt;!--<b class="conum">(1)</b>--&gt;'))
      assert.ok(result.includes(' &lt;!--<b class="conum">(2)</b>--&gt;'))
    })

    test('literal block should honor explicit subs list', async () => {
      const input = `\
[subs="verbatim,quotes"]
----
Map<String, String> *attributes*; //<1>
----
`
      const block = await blockFromString(input)
      assert.deepEqual(block.subs, ['specialcharacters', 'callouts', 'quotes'])
      const output = await block.convert()
      assert.ok(
        output.includes(
          'Map&lt;String, String&gt; <strong>attributes</strong>;'
        )
      )
      assertXpath(output, '//pre/b[text()="(1)"]', 1)
    })

    test('should be able to disable callouts for literal block', async () => {
      const input = `\
[subs="specialcharacters"]
----
No callout here <1>
----
`
      const block = await blockFromString(input)
      assert.deepEqual(block.subs, ['specialcharacters'])
      const output = await block.convert()
      assertXpath(output, '//pre/b[text()="(1)"]', 0)
    })

    test('listing block should honor explicit subs list', async () => {
      const input = `\
[subs="specialcharacters,quotes"]
----
$ *python functional_tests.py*
Traceback (most recent call last):
  File "functional_tests.py", line 4, in <module>
    assert 'Django' in browser.title
AssertionError
----
`
      const output = await convertStringToEmbedded(input)

      assertCss(output, '.listingblock pre', 1)
      assertXpath(output, '//*[contains(@class,"listingblock")]//pre/strong', 1)
      assertXpath(output, '//*[contains(@class,"listingblock")]//pre/em', 0)

      const input2 = `\
[subs="specialcharacters,macros"]
----
$ pass:quotes[*python functional_tests.py*]
Traceback (most recent call last):
  File "functional_tests.py", line 4, in <module>
    assert pass:quotes['Django'] in browser.title
AssertionError
----
`
      const output2 = await convertStringToEmbedded(input2)
      assert.equal(output2, output)
    })

    test('should not mangle array that contains formatted text with role in listing block with quotes sub enabled', async () => {
      const input = `\
[,ruby,subs=+quotes]
----
nums = [1, 2, 3, [.added]#4#]
----
`
      const output = await convertStringToEmbedded(input)
      assert.ok(
        output.includes('nums = [1, 2, 3, <span class="added">4</span>]')
      )
    })

    test('first character of block title may be a period if not followed by space', async () => {
      const input = `\
..gitignore
----
/.bundle/
/build/
/Gemfile.lock
----
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="title"][text()=".gitignore"]', 1)
    })

    test('listing block without title should generate screen element in docbook', async () => {
      const input = `\
----
listing block
----
`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertXpath(output, '/screen[text()="listing block"]', 1)
    })

    test('listing block with title should generate screen element inside formalpara element in docbook', async () => {
      const input = `\
.title
----
listing block
----
`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertXpath(output, '/formalpara', 1)
      assertXpath(output, '/formalpara/title[text()="title"]', 1)
      assertXpath(output, '/formalpara/para/screen[text()="listing block"]', 1)
    })

    test('should not prepend caption to title of listing block with title if listing-caption attribute is not set', async () => {
      const input = `\
.title
----
listing block content
----
`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/*[@class="listingblock"][1]/*[@class="title"][text()="title"]',
        1
      )
    })

    test('should prepend caption specified by listing-caption attribute and number to title of listing block with title', async () => {
      const input = `\
:listing-caption: Listing

.title
----
listing block content
----
`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/*[@class="listingblock"][1]/*[@class="title"][text()="Listing 1. title"]',
        1
      )
    })

    test('should prepend caption specified by caption attribute on listing block even if listing-caption attribute is not set', async () => {
      const input = `\
[caption="Listing {counter:listing-number}. "]
.Behold!
----
listing block content
----
`
      const output = await convertStringToEmbedded(input)
      assertXpath(
        output,
        '/*[@class="listingblock"][1]/*[@class="title"][text()="Listing 1. Behold!"]',
        1
      )
    })

    test('listing block without an explicit style and with a second positional argument should be promoted to a source block', async () => {
      const input = `\
[,ruby]
----
puts 'Hello, Ruby!'
----
`
      const doc = await documentFromString(input)
      const matches = doc.findBy({ context: 'listing', style: 'source' })
      assert.equal(matches.length, 1)
      assert.equal(matches[0].getAttribute('language'), 'ruby')
    })

    test('listing block without an explicit style should be promoted to a source block if source-language is set', async () => {
      const input = `\
:source-language: ruby

----
puts 'Hello, Ruby!'
----
`
      const doc = await documentFromString(input)
      const matches = doc.findBy({ context: 'listing', style: 'source' })
      assert.equal(matches.length, 1)
      assert.equal(matches[0].getAttribute('language'), 'ruby')
    })

    test('listing block with an explicit style and a second positional argument should not be promoted to a source block', async () => {
      const input = `\
[listing,ruby]
----
puts 'Hello, Ruby!'
----
`
      const doc = await documentFromString(input)
      const matches = doc.findBy({ context: 'listing' })
      assert.equal(matches.length, 1)
      assert.equal(matches[0].style, 'listing')
      assert.equal(matches[0].getAttribute('language'), null)
    })

    test('listing block with an explicit style should not be promoted to a source block if source-language is set', async () => {
      const input = `\
:source-language: ruby

[listing]
----
puts 'Hello, Ruby!'
----
`
      const doc = await documentFromString(input)
      const matches = doc.findBy({ context: 'listing' })
      assert.equal(matches.length, 1)
      assert.equal(matches[0].style, 'listing')
      assert.equal(matches[0].getAttribute('language'), null)
    })

    test('source block with no title or language should generate screen element in docbook', async () => {
      const input = `\
[source]
----
source block
----
`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertXpath(
        output,
        '/screen[@linenumbering="unnumbered"][text()="source block"]',
        1
      )
    })

    test('source block with title and no language should generate screen element inside formalpara element for docbook', async () => {
      const input = `\
[source]
.title
----
source block
----
`
      const output = await convertStringToEmbedded(input, {
        backend: 'docbook',
      })
      assertXpath(output, '/formalpara', 1)
      assertXpath(output, '/formalpara/title[text()="title"]', 1)
      assertXpath(
        output,
        '/formalpara/para/screen[@linenumbering="unnumbered"][text()="source block"]',
        1
      )
    })
  })
})
