// ESM conversion of paragraphs_test.rb
// Tests for paragraph handling in Asciidoctor.

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { MemoryLogger, LoggerManager, Severity } from '../src/logging.js'
import { ADMONITION_STYLES } from '../src/constants.js'
import { assertXpath, assertCss, assertMessage } from './helpers.js'
import { convertString, convertStringToEmbedded, blockFromString } from './harness.js'

// ── Paragraphs ────────────────────────────────────────────────────────────────

describe('Paragraphs', () => {
  describe('Normal', () => {
    test('should treat plain text separated by blank lines as paragraphs', async () => {
      const input = `Plain text for the win!

Yep. Text. Plain and simple.`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'p', 2)
      assertXpath(output, '(//p)[1][text() = "Plain text for the win!"]', 1)
      assertXpath(output, '(//p)[2][text() = "Yep. Text. Plain and simple."]', 1)
    })

    test('should associate block title with paragraph', async () => {
      const input = `.Titled
Paragraph.

Winning.`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'p', 2)
      assertXpath(output, '(//p)[1]/preceding-sibling::*[@class = "title"]', 1)
      assertXpath(output, '(//p)[1]/preceding-sibling::*[@class = "title"][text() = "Titled"]', 1)
      assertXpath(output, '(//p)[2]/preceding-sibling::*[@class = "title"]', 0)
    })

    test('no duplicate block before next section', async () => {
      const input = `= Title

Preamble

== First Section

Paragraph 1

Paragraph 2

== Second Section

Last words`
      const output = await convertString(input)
      assertXpath(output, '//p[text() = "Paragraph 2"]', 1)
    })

    test('does not treat wrapped line as a list item', async () => {
      const input = `paragraph
. wrapped line`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'p', 1)
      assertXpath(output, '//p[text()="paragraph\n. wrapped line"]', 1)
    })

    test('does not treat wrapped line as a block title', async () => {
      const input = `paragraph
.wrapped line`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'p', 1)
      assertXpath(output, '//p[text()="paragraph\n.wrapped line"]', 1)
    })

    test('interprets normal paragraph style as normal paragraph', async () => {
      const input = `[normal]
Normal paragraph.
Nothing special.`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'p', 1)
    })

    test('removes indentation from literal paragraph marked as normal', async () => {
      const input = `[normal]
  Normal paragraph.
    Nothing special.
  Last line.`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'p', 1)
      assertXpath(output, '//p[text()="Normal paragraph.\n  Nothing special.\nLast line."]', 1)
    })

    test('normal paragraph terminates at block attribute list', async () => {
      const input = `normal text
[literal]
literal text`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="paragraph"]', 1)
      assertXpath(output, '/*[@class="literalblock"]', 1)
    })

    test('normal paragraph terminates at block delimiter', async () => {
      const input = `normal text
--
text in open block
--`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="paragraph"]', 1)
      assertXpath(output, '/*[@class="openblock"]', 1)
    })

    test('normal paragraph terminates at list continuation', async () => {
      const input = `normal text
+`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="paragraph"]', 2)
      assertXpath(output, '(/*[@class="paragraph"])[1]/p[text() = "normal text"]', 1)
      assertXpath(output, '(/*[@class="paragraph"])[2]/p[text() = "+"]', 1)
    })

    test('normal style turns literal paragraph into normal paragraph', async () => {
      const input = `[normal]
 normal paragraph,
 despite the leading indent`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="paragraph"]/p', 1)
    })

    test('automatically promotes index terms in DocBook output if indexterm-promotion-option is set', async () => {
      const input = `Here is an index entry for ((tigers)).
indexterm:[Big cats,Tigers,Siberian Tiger]
Here is an index entry for indexterm2:[Linux].
(((Operating Systems,Linux)))
Note that multi-entry terms generate separate index entries.`
      const output = await convertStringToEmbedded(input, { backend: 'docbook', attributes: { 'indexterm-promotion-option': '' } })
      assertXpath(output, '/simpara', 1)

      assertXpath(output, '(//indexterm)[1]/primary[text()="tigers"]', 1)

      assertXpath(output, '(//indexterm)[2]/primary[text()="Big cats"]', 1)
      assertXpath(output, '(//indexterm)[2]/secondary[text()="Tigers"]', 1)
      assertXpath(output, '(//indexterm)[2]/tertiary[text()="Siberian Tiger"]', 1)

      assertXpath(output, '(//indexterm)[3]/primary[text()="Tigers"]', 1)
      assertXpath(output, '(//indexterm)[3]/secondary[text()="Siberian Tiger"]', 1)

      assertXpath(output, '(//indexterm)[4]/primary[text()="Siberian Tiger"]', 1)

      assertXpath(output, '(//indexterm)[5]/primary[text()="Linux"]', 1)

      assertXpath(output, '(//indexterm)[6]/*', 2)
      assertXpath(output, '(//indexterm)[7]/*', 1)
    })

    test('does not automatically promote index terms in DocBook output if indexterm-promotion-option is not set', async () => {
      const input = `The Siberian Tiger is one of the biggest living cats.
indexterm:[Big cats,Tigers,Siberian Tiger]
Note that multi-entry terms generate separate index entries.
(((Operating Systems,Linux)))`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertCss(output, 'indexterm', 2)

      assertXpath(output, '(//indexterm)[1]/primary[text()="Big cats"]', 1)
      assertXpath(output, '(//indexterm)[1]/secondary[text()="Tigers"]', 1)
      assertXpath(output, '(//indexterm)[1]/tertiary[text()="Siberian Tiger"]', 1)

      assertXpath(output, '(//indexterm)[2]/primary[text()="Operating Systems"]', 1)
      assertXpath(output, '(//indexterm)[2]/secondary[text()="Linux"]', 1)
    })

    test('normal paragraph should honor explicit subs list', async () => {
      const input = `[subs="specialcharacters"]
*<Hey Jude>*`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('*&lt;Hey Jude&gt;*'), `Expected output to include '*&lt;Hey Jude&gt;*' but got:\n${output}`)
    })

    test('normal paragraph should honor specialchars shorthand', async () => {
      const input = `[subs="specialchars"]
*<Hey Jude>*`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('*&lt;Hey Jude&gt;*'), `Expected output to include '*&lt;Hey Jude&gt;*' but got:\n${output}`)
    })

    test('should add a hardbreak at end of each line when hardbreaks option is set', async () => {
      const input = `[%hardbreaks]
read
my
lips`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'br', 2)
      assertXpath(output, '//p', 1)
      assert.ok(output.includes('<p>read<br>\nmy<br>\nlips</p>'), `Expected hardbreak output but got:\n${output}`)
    })

    test('should be able to toggle hardbreaks by setting hardbreaks-option on document', async () => {
      const input = `:hardbreaks-option:

make
it
so

:!hardbreaks:

roll it back`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//p)[1]/br', 2)
      assertXpath(output, '(//p)[2]/br', 0)
    })
  })

  describe('Literal', () => {
    test('single-line literal paragraphs', async () => {
      const input = `you know what?

 LITERALS

 ARE LITERALLY

 AWESOME!`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//pre', 3)
    })

    test('multi-line literal paragraph', async () => {
      const input = `Install instructions:

 yum install ruby rubygems
 gem install asciidoctor

You're good to go!`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//pre', 1)
      assertXpath(output, '//pre[text() = "yum install ruby rubygems\ngem install asciidoctor"]', 1)
    })

    test('literal paragraph', async () => {
      const input = `[literal]
this text is literally literal`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="literalblock"]//pre[text()="this text is literally literal"]', 1)
    })

    test('should read content below literal style verbatim', async () => {
      const input = `[literal]
image::not-an-image-block[]`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="literalblock"]//pre[text()="image::not-an-image-block[]"]', 1)
      assertCss(output, 'img', 0)
    })

    test('listing paragraph', async () => {
      const input = `[listing]
this text is a listing`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="listingblock"]//pre[text()="this text is a listing"]', 1)
    })

    test('source paragraph', async () => {
      const input = `[source]
use the source, luke!`
      const block = await blockFromString(input)
      assert.equal(block.context, 'listing')
      assert.equal(block.getAttribute('style'), 'source')
      assert.equal(block.getAttribute('cloaked-context'), 'paragraph')
      assert.equal(block.getAttribute('language'), undefined)
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="listingblock"]//pre[@class="highlight"]/code[text()="use the source, luke!"]', 1)
    })

    test('source code paragraph with language', async () => {
      const input = `[source, perl]
die 'zomg perl is tough';`
      const block = await blockFromString(input)
      assert.equal(block.context, 'listing')
      assert.equal(block.getAttribute('style'), 'source')
      assert.equal(block.getAttribute('cloaked-context'), 'paragraph')
      assert.equal(block.getAttribute('language'), 'perl')
      const output = await convertStringToEmbedded(input)
      assertXpath(output, `/*[@class="listingblock"]//pre[@class="highlight"]/code[@class="language-perl"][@data-lang="perl"][text()="die 'zomg perl is tough';"]`, 1)
    })

    test('literal paragraph terminates at block attribute list', async () => {
      const input = ` literal text
[normal]
normal text`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="literalblock"]', 1)
      assertXpath(output, '/*[@class="paragraph"]', 1)
    })

    test('literal paragraph terminates at block delimiter', async () => {
      const input = ` literal text
--
normal text
--`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="literalblock"]', 1)
      assertXpath(output, '/*[@class="openblock"]', 1)
    })

    test('literal paragraph terminates at list continuation', async () => {
      const input = ` literal text
+`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="literalblock"]', 1)
      assertXpath(output, '/*[@class="literalblock"]//pre[text() = "literal text"]', 1)
      assertXpath(output, '/*[@class="paragraph"]', 1)
      assertXpath(output, '/*[@class="paragraph"]/p[text() = "+"]', 1)
    })
  })

  describe('Quote', () => {
    test('single-line quote paragraph', async () => {
      const input = `[quote]
Famous quote.`
      const output = await convertString(input)
      assertXpath(output, '//*[@class = "quoteblock"]', 1)
      assertXpath(output, '//*[@class = "quoteblock"]//p', 0)
      assertXpath(output, '//*[@class = "quoteblock"]//*[contains(text(), "Famous quote.")]', 1)
    })

    test('quote paragraph terminates at list continuation', async () => {
      const input = `[quote]
A famouse quote.
+`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="quoteblock"]', 1)
      assertXpath(output, '/*[@class="paragraph"]', 1)
      assertXpath(output, '/*[@class="paragraph"]/p[text() = "+"]', 1)
    })

    test('verse paragraph', async () => {
      const output = await convertString('[verse]\nFamous verse.')
      assertXpath(output, '//*[@class = "verseblock"]', 1)
      assertXpath(output, '//*[@class = "verseblock"]/pre', 1)
      assertXpath(output, '//*[@class = "verseblock"]//p', 0)
      assertXpath(output, '//*[@class = "verseblock"]/pre[normalize-space(text()) = "Famous verse."]', 1)
    })

    test('should perform normal subs on a verse paragraph', async () => {
      const input = `[verse]
_GET /groups/link:#group-id[{group-id}]_`
      const output = await convertStringToEmbedded(input)
      assert.ok(
        output.includes('<pre class="content"><em>GET /groups/<a href="#group-id">{group-id}</a></em></pre>'),
        `Expected verse subs output but got:\n${output}`
      )
    })

    test('quote paragraph should honor explicit subs list', async () => {
      const input = `[subs="specialcharacters"]
[quote]
*Hey Jude*`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('*Hey Jude*'), `Expected output to include '*Hey Jude*' but got:\n${output}`)
    })
  })

  describe('Special', () => {
    test('note multiline syntax', async () => {
      for (const style of ADMONITION_STYLES) {
        const output = await convertString(`[${style}]\nThis is a winner.`)
        assertXpath(output, `//div[@class='admonitionblock ${style.toLowerCase()}']`, 1)
      }
    })

    test('note block syntax', async () => {
      for (const style of ADMONITION_STYLES) {
        const output = await convertString(`[${style}]\n====\nThis is a winner.\n====`)
        assertXpath(output, `//div[@class='admonitionblock ${style.toLowerCase()}']`, 1)
      }
    })

    test('note inline syntax', async () => {
      for (const style of ADMONITION_STYLES) {
        const output = await convertString(`${style}: This is important, fool!`)
        assertXpath(output, `//div[@class='admonitionblock ${style.toLowerCase()}']`, 1)
      }
    })

    test('should process preprocessor conditional in paragraph content', async () => {
      const input = `ifdef::asciidoctor-version[]
[sidebar]
First line of sidebar.
ifdef::backend[The backend is {backend}.]
Last line of sidebar.
endif::[]`
      const expected = `<div class="sidebarblock">
<div class="content">
First line of sidebar.
The backend is html5.
Last line of sidebar.
</div>
</div>`
      const result = await convertStringToEmbedded(input)
      assert.equal(result, expected)
    })

    describe('Styled Paragraphs', () => {
      test('should wrap text in simpara for styled paragraphs when converted to DocBook', async () => {
        const input = `= Book
:doctype: book

[preface]
= About this book

[abstract]
An abstract for the book.

= Part 1

[partintro]
An intro to this part.

== Chapter 1

[sidebar]
Just a side note.

[example]
As you can see here.

[quote]
Wise words from a wise person.

[open]
Make it what you want.`
        const output = await convertString(input, { backend: 'docbook' })
        assertCss(output, 'abstract > simpara', 1)
        assertCss(output, 'partintro > simpara', 1)
        assertCss(output, 'sidebar > simpara', 1)
        assertCss(output, 'informalexample > simpara', 1)
        assertCss(output, 'blockquote > simpara', 1)
        assertCss(output, 'chapter > simpara', 1)
      })

      test('should convert open paragraph to open block', async () => {
        const input = `[open]
Make it what you want.`
        const output = await convertStringToEmbedded(input)
        assertCss(output, '.openblock', 1)
        assertCss(output, '.openblock p', 0)
      })

      test('should wrap text in simpara for styled paragraphs with title when converted to DocBook', async () => {
        const input = `= Book
:doctype: book

[preface]
= About this book

[abstract]
.Abstract title
An abstract for the book.

= Part 1

[partintro]
.Part intro title
An intro to this part.

== Chapter 1

[sidebar]
.Sidebar title
Just a side note.

[example]
.Example title
As you can see here.

[quote]
.Quote title
Wise words from a wise person.`
        const output = await convertString(input, { backend: 'docbook' })
        assertCss(output, 'abstract > title', 1)
        assertXpath(output, '//abstract/title[text() = "Abstract title"]', 1)
        assertCss(output, 'abstract > title + simpara', 1)
        assertCss(output, 'partintro > title', 1)
        assertXpath(output, '//partintro/title[text() = "Part intro title"]', 1)
        assertCss(output, 'partintro > title + simpara', 1)
        assertCss(output, 'sidebar > title', 1)
        assertXpath(output, '//sidebar/title[text() = "Sidebar title"]', 1)
        assertCss(output, 'sidebar > title + simpara', 1)
        assertCss(output, 'example > title', 1)
        assertXpath(output, '//example/title[text() = "Example title"]', 1)
        assertCss(output, 'example > title + simpara', 1)
        assertCss(output, 'blockquote > title', 1)
        assertXpath(output, '//blockquote/title[text() = "Quote title"]', 1)
        assertCss(output, 'blockquote > title + simpara', 1)
      })
    })

    describe('Inline doctype', () => {
      test('should only format and output text in first paragraph when doctype is inline', async () => {
        const input = 'http://asciidoc.org[AsciiDoc] is a _lightweight_ markup language...\n\nignored'
        const output = await convertString(input, { doctype: 'inline' })
        assert.equal(output, '<a href="http://asciidoc.org">AsciiDoc</a> is a <em>lightweight</em> markup language&#8230;&#8203;')
      })

      test('should output nil and warn if first block is not a paragraph', async () => {
        const input = '* bullet'
        let logger
        const defaultLogger = LoggerManager.logger
        try {
          LoggerManager.logger = logger = new MemoryLogger()
          const output = await convertString(input, { doctype: 'inline' })
          assert.ok(output == null || output === '', `Expected nil/empty output but got: ${output}`)
          assertMessage(logger, 'WARN', 'no inline candidate')
        } finally {
          LoggerManager.logger = defaultLogger
        }
      })
    })
  })

  describe('Custom', () => {
    let defaultLogger

    beforeEach(() => {
      defaultLogger = LoggerManager.logger
    })

    afterEach(() => {
      LoggerManager.logger = defaultLogger
    })

    test('should not warn if paragraph style is unregisted', async () => {
      const input = `[foo]
bar`
      const logger = new MemoryLogger()
      LoggerManager.logger = logger
      await convertStringToEmbedded(input)
      assert.equal(logger.messages.length, 0, `Expected no log messages but got: ${JSON.stringify(logger.messages)}`)
    })

    test('should log debug message if paragraph style is unknown and debug level is enabled', async () => {
      const input = `[foo]
bar`
      const logger = new MemoryLogger()
      logger.level = Severity.DEBUG
      LoggerManager.logger = logger
      await convertStringToEmbedded(input)
      assertMessage(logger, 'DEBUG', 'unknown style for paragraph: foo')
    })
  })
})
