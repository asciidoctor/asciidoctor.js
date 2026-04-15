// ESM conversion of lists_test.rb
// Tests for list handling in Asciidoctor.

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { DOMParser } from '@xmldom/xmldom'
import { select } from 'xpath'

import { load } from '../src/load.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertXpath, assertCss } from './helpers.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertString = (input, opts = {}) => documentFromString(input, { standalone: true, ...opts }).then((doc) => doc.convert())
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())

function assertMessage (logger, severity, text) {
  const sev = severity.toUpperCase()
  const found = logger.messages.some((m) => {
    if (m.severity.toUpperCase() !== sev) return false
    const msgText = typeof m.message === 'string' ? m.message : String(m.message)
    return msgText.includes(text)
  })
  assert.ok(found, `Expected ${sev} message containing "${text}" but got: ${JSON.stringify(logger.messages)}`)
}

function getTextAtXpath (html, xpath) {
  const xmlSrc = `<root>${html.replace(/<(meta|link|br|hr|img|input|area|base|col|embed|param|source|track|wbr)((?:[^>"']|"[^"]*"|'[^']*')*?)>/gi, '<$1$2/>')}</root>`
  const cleanSrc = xmlSrc.replace(/\s+xmlns(?::\w+)?="[^"]*"/g, '')
  const adjustedXpath = xpath.replace(/^\/([^/])/, '/root/$1').replace(/\(\/([^/])/g, '(/root/$1')
  const doc = new DOMParser({ onError: () => {} }).parseFromString(cleanSrc, 'text/xml')
  const nodes = select(adjustedXpath, /** @type {any} */ (doc))
  if (!Array.isArray(nodes) || nodes.length === 0) return null
  return nodes[0].textContent
}

// ── Bulleted lists (:ulist) ───────────────────────────────────────────────────

describe('Bulleted lists (ulist)', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Simple lists', () => {
    test('dash elements with no blank lines', async () => {
      const input = `List
====

- Foo
- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('indented dash elements using spaces', async () => {
      const input = ' - Foo\n - Boo\n - Blech\n'
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('indented dash elements using tabs', async () => {
      const input = '\t-\tFoo\n\t-\tBoo\n\t-\tBlech\n'
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('dash elements separated by blank lines should merge lists', async () => {
      const input = `List
====

- Foo

- Boo


- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('dash elements with interspersed line comments should be skipped and not break list', async () => {
      const input = `== List

- Foo
// line comment
// another line comment
- Boo
// line comment
more text
// another line comment
- Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul/li)[2]/p[text()="Boo\nmore text"]', 1)
    })

    test('dash elements separated by a line comment offset by blank lines should not merge lists', async () => {
      const input = `List
====

- Foo
- Boo

//

- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[2]/li', 1)
    })

    test('dash elements separated by a block title offset by a blank line should not merge lists', async () => {
      const input = `List
====

- Foo
- Boo

.Also
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[2]/li', 1)
      assertXpath(output, '(//ul)[2]/preceding-sibling::*[@class = "title"][text() = "Also"]', 1)
    })

    test('dash elements separated by an attribute entry offset by a blank line should not merge lists', async () => {
      const input = `== List

- Foo
- Boo

:foo: bar
- Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[2]/li', 1)
    })

    test('a non-indented wrapped line is folded into text of list item', async () => {
      const input = `List
====

- Foo
wrapped content
- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li[1]/*', 1)
      assertXpath(output, `//ul/li[1]/p[text() = 'Foo\nwrapped content']`, 1)
    })

    test('a non-indented wrapped line that resembles a block title is folded into text of list item', async () => {
      const input = `== List

- Foo
.wrapped content
- Boo
- Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li[1]/*', 1)
      assertXpath(output, `//ul/li[1]/p[text() = 'Foo\n.wrapped content']`, 1)
    })

    test('a non-indented wrapped line that resembles an attribute entry is folded into text of list item', async () => {
      const input = `== List

- Foo
:foo: bar
- Boo
- Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li[1]/*', 1)
      assertXpath(output, `//ul/li[1]/p[text() = 'Foo\n:foo: bar']`, 1)
    })

    test('a list item with a nested marker terminates non-indented paragraph for text of list item', async () => {
      const input = `- Foo
Bar
* Foo
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul ul', 1)
      assert.ok(!output.includes('* Foo'), 'output should not include "* Foo"')
    })

    test('a list item for a different list terminates non-indented paragraph for text of list item', async () => {
      const input = `== Example 1

- Foo
Bar
. Foo

== Example 2

* Item
text
term:: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul ol', 1)
      assert.ok(!output.includes('* Foo'), 'output should not include "* Foo"')
      assertCss(output, 'ul dl', 1)
      assert.ok(!output.includes('term:: def'), 'output should not include "term:: def"')
    })

    test('an indented wrapped line is unindented and folded into text of list item', async () => {
      const input = `List
====

- Foo
  wrapped content
- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li[1]/*', 1)
      assertXpath(output, `//ul/li[1]/p[text() = 'Foo\nwrapped content']`, 1)
    })

    test('wrapped list item with hanging indent followed by non-indented line', async () => {
      const input = `== Lists

- list item 1
  // not line comment
second wrapped line
- list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul li', 2)
      const text = getTextAtXpath(output, '(//ul/li)[1]/p')
      if (text !== null) {
        const lines = text.replace(/\n\s*\n/g, '\n').split('\n').filter((l) => l.length > 0)
        assert.equal(lines.length, 3)
        assert.equal(lines[0], 'list item 1')
        assert.equal(lines[1], '  // not line comment')
        assert.equal(lines[2], 'second wrapped line')
      }
    })

    test('a list item with a nested marker terminates indented paragraph for text of list item', async () => {
      const input = `- Foo
  Bar
* Foo
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul ul', 1)
      assert.ok(!output.includes('* Foo'), 'output should not include "* Foo"')
    })

    test('a list item that starts with a sequence of list markers characters should not match a nested list', async () => {
      const input = ' * first item\n *. normal text\n'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul li', 1)
      assertXpath(output, `//ul/li/p[text()='first item\n*. normal text']`, 1)
    })

    test('a list item for a different list terminates indented paragraph for text of list item', async () => {
      const input = `== Example 1

- Foo
  Bar
. Foo

== Example 2

* Item
  text
term:: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul ol', 1)
      assert.ok(!output.includes('* Foo'), 'output should not include "* Foo"')
      assertCss(output, 'ul dl', 1)
      assert.ok(!output.includes('term:: def'), 'output should not include "term:: def"')
    })

    test('a literal paragraph offset by blank lines in list content is appended as a literal block', async () => {
      const input = `List
====

- Foo

  literal

- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul/li)[1]/p[text() = "Foo"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]', 1)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '((//ul/li)[1]/*[@class="literalblock"])[1]//pre[text() = "literal"]', 1)
    })

    test('should escape special characters in all literal paragraphs attached to list item', async () => {
      const input = `* first item

  <code>text</code>

  more <code>text</code>

* second item
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'li', 2)
      assertCss(output, 'code', 0)
      assertCss(output, 'li:first-of-type > *', 3)
      assertCss(output, 'li:first-of-type pre', 2)
      assertXpath(output, '((//li)[1]//pre)[1][text()="<code>text</code>"]', 1)
      assertXpath(output, '((//li)[1]//pre)[2][text()="more <code>text</code>"]', 1)
    })

    test('a literal paragraph offset by a blank line in list content followed by line with continuation is appended as two blocks', async () => {
      const input = `List
====

- Foo

  literal
+
para

- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul/li)[1]/p[text() = "Foo"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]', 1)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '((//ul/li)[1]/*[@class="literalblock"])[1]//pre[text() = "literal"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('an admonition paragraph attached by a line continuation to a list item with wrapped text should produce admonition', async () => {
      const input = `- first-line text
  wrapped text
+
NOTE: This is a note.
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul > li', 1)
      assertCss(output, 'ul > li > p', 1)
      assertXpath(output, `//ul/li/p[text()="first-line text\nwrapped text"]`, 1)
      assertCss(output, 'ul > li > p + .admonitionblock.note', 1)
      assertXpath(output, '//ul/li/*[@class="admonitionblock note"]//td[@class="content"][normalize-space(text())="This is a note."]', 1)
    })

    test('paragraph-like blocks attached to an ancestor list item by a list continuation should produce blocks', async () => {
      const input = `* parent
 ** child

+
NOTE: This is a note.

* another parent
 ** another child

+
'''
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul ul .admonitionblock.note', 0)
      assertXpath(output, '(//ul)[1]/li/*[@class="admonitionblock note"]', 1)
      assertCss(output, 'ul ul hr', 0)
      assertXpath(output, '(//ul)[1]/li/hr', 1)
    })

    test('should not inherit block attributes from previous block when block is attached using a list continuation', async () => {
      const input = `* complex list item
+
[source,xml]
----
<name>value</name> <!--1-->
----
<1> a configuration value
`
      const doc = await documentFromString(input)
      const colist = doc.blocks[0].items[0].blocks[doc.blocks[0].items[0].blocks.length - 1]
      assert.equal(colist.context, 'colist')
      assert.notEqual(colist.style, 'source')
      const output = await doc.convert()
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul > li', 1)
      assertCss(output, 'ul > li > p', 1)
      assertCss(output, 'ul > li > .listingblock', 1)
      assertCss(output, 'ul > li > .colist', 1)
    })

    test('should continue to parse blocks attached by a list continuation after block is dropped', async () => {
      const input = `* item
+
paragraph
+
[comment]
comment
+
====
example
====
'''
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul > li > .paragraph', 1)
      assertCss(output, 'ul > li > .exampleblock', 1)
    })

    test('appends line as paragraph if attached by continuation following line comment', async () => {
      const input = `- list item 1
// line comment
+
paragraph in list item 1

- list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul li', 2)
      assertXpath(output, '(//ul/li)[1]/p[text()="list item 1"]', 1)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="paragraph"]/p[text()="paragraph in list item 1"]', 1)
      assertXpath(output, '(//ul/li)[2]/p[text()="list item 2"]', 1)
    })

    test('a literal paragraph with a line that appears as a list item that is followed by a continuation should create two blocks', async () => {
      const input = `* Foo
+
  literal
. still literal
+
para

* Bar
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '(//ul/li)[1]/p[text() = "Foo"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]', 1)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, `((//ul/li)[1]/*[@class="literalblock"])[1]//pre[text() = "  literal\n. still literal"]`, 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('consecutive literal paragraph offset by blank lines in list content are appended as a literal blocks', async () => {
      const input = `List
====

- Foo

  literal

  more
  literal

- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul/li)[1]/p[text() = "Foo"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]', 2)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="literalblock"]', 2)
      assertXpath(output, `((//ul/li)[1]/*[@class="literalblock"])[1]//pre[text()="literal"]`, 1)
      assertXpath(output, `((//ul/li)[1]/*[@class='literalblock'])[2]//pre[text()='more\nliteral']`, 1)
    })

    test('a literal paragraph without a trailing blank line consumes following list items', async () => {
      const input = `List
====

- Foo

  literal
- Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 1)
      assertXpath(output, '(//ul/li)[1]/p[text() = "Foo"]', 1)
      assertXpath(output, '(//ul/li)[1]/*[@class="literalblock"]', 1)
      assertXpath(output, '(//ul/li)[1]/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, `((//ul/li)[1]/*[@class='literalblock'])[1]//pre[text() = '  literal\n- Boo\n- Blech']`, 1)
    })

    test('asterisk elements with no blank lines', async () => {
      const input = `List
====

* Foo
* Boo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('indented asterisk elements using spaces', async () => {
      const input = ' * Foo\n * Boo\n * Blech\n'
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('indented unicode bullet elements using spaces', async () => {
      const input = ' \u2022 Foo\n \u2022 Boo\n \u2022 Blech\n'
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('indented asterisk elements using tabs', async () => {
      const input = '\t*\tFoo\n\t*\tBoo\n\t*\tBlech\n'
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('should represent block style as style class', async () => {
      for (const style of ['disc', 'square', 'circle']) {
        const input = `[${style}]\n* a\n* b\n* c\n`
        const output = await convertStringToEmbedded(input)
        assertCss(output, `.ulist.${style}`, 1)
        assertCss(output, `.ulist.${style} ul.${style}`, 1)
      }
    })

    test('asterisk elements separated by blank lines should merge lists', async () => {
      const input = `List
====

* Foo

* Boo


* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
    })

    test('asterisk elements with interspersed line comments should be skipped and not break list', async () => {
      const input = `== List

* Foo
// line comment
// another line comment
* Boo
// line comment
more text
// another line comment
* Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul/li)[2]/p[text()="Boo\nmore text"]', 1)
    })

    test('asterisk elements separated by a line comment offset by blank lines should not merge lists', async () => {
      const input = `List
====

* Foo
* Boo

//

* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[2]/li', 1)
    })

    test('asterisk elements separated by a block title offset by a blank line should not merge lists', async () => {
      const input = `List
====

* Foo
* Boo

.Also
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[2]/li', 1)
      assertXpath(output, '(//ul)[2]/preceding-sibling::*[@class = "title"][text() = "Also"]', 1)
    })

    test('asterisk elements separated by an attribute entry offset by a blank line should not merge lists', async () => {
      const input = `== List

* Foo
* Boo

:foo: bar
* Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[2]/li', 1)
    })

    test('list should terminate before next lower section heading', async () => {
      const input = `List
====

* first
item
* second
item

== Section
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//h2[text() = "Section"]', 1)
    })

    test('list should terminate before next lower section heading with implicit id', async () => {
      const input = `List
====

* first
item
* second
item

[[sec]]
== Section
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//h2[@id = "sec"][text() = "Section"]', 1)
    })

    test('should not find section title immediately below last list item', async () => {
      const input = `* first
* second
== Not a section
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul > li', 2)
      assertCss(output, 'h2', 0)
      assert.ok(output.includes('== Not a section'), 'output should include "== Not a section"')
      assertXpath(output, `(//li)[2]/p[text() = "second\n== Not a section"]`, 1)
    })

    test('should match trailing line separator in text of list item', async () => {
      const ls = String.fromCodePoint(8232)
      const input = `* a\n* b${ls}\n* c`
      const output = await convertString(input)
      assertCss(output, 'li', 3)
      assert.ok(output.includes(`<p>b${ls}</p>`), `expected <p>b${ls}</p> in output`)
    })

    test('should match line separator in text of list item', async () => {
      const ls = String.fromCodePoint(8232)
      const input = `* a\n* b${ls}b\n* c`
      const output = await convertString(input)
      assertCss(output, 'li', 3)
      assert.ok(output.includes(`<p>b${ls}b</p>`), `expected <p>b${ls}b</p> in output`)
    })
  })

  describe('Lists with inline markup', () => {
    test('quoted text', async () => {
      const input = `List
====

- I am *strong*.
- I am _stressed_.
- I am \`flexible\`.
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul/li)[1]//strong', 1)
      assertXpath(output, '(//ul/li)[2]//em', 1)
      assertXpath(output, '(//ul/li)[3]//code', 1)
    })

    test('attribute substitutions', async () => {
      const input = `List
====
:foo: bar

- side a {vbar} side b
- Take me to a {foo}.
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '(//ul/li)[1]//p[text() = "side a | side b"]', 1)
      assertXpath(output, '(//ul/li)[2]//p[text() = "Take me to a bar."]', 1)
    })

    test('leading dot is treated as text not block title', async () => {
      const input = `* .first
* .second
* .third
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 3)
      for (const [index, text] of ['.first', '.second', '.third'].entries()) {
        assertXpath(output, `(//ul/li)[${index + 1}]//p[text() = '${text}']`, 1)
      }
    })

    test('word ending sentence on continuing line not treated as a list item', async () => {
      const input = `A. This is the story about
   AsciiDoc. It begins here.
B. And it ends here.
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '//ol/li', 2)
    })

    test('should discover anchor at start of unordered list item text and register it as a reference', async () => {
      const input = `The highest peak in the Front Range is <<grays-peak>>, which tops <<mount-evans>> by just a few feet.

* [[mount-evans,Mount Evans]]At 14,271 feet, Mount Evans is the highest summit of the Chicago Peaks in the Front Range of the Rocky Mountains.
* [[grays-peak,Grays Peak]]
Grays Peak rises to 14,278 feet, making it the highest summit in the Front Range of the Rocky Mountains.
* Longs Peak is a 14,259-foot high, prominent mountain summit in the northern Front Range of the Rocky Mountains.
* Pikes Peak is the highest summit of the southern Front Range of the Rocky Mountains at 14,115 feet.
`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok('mount-evans' in refs, 'refs should contain mount-evans')
      assert.ok('grays-peak' in refs, 'refs should contain grays-peak')
      const output = await doc.convert()
      assertXpath(output, '(//p)[1]/a[@href="#grays-peak"][text()="Grays Peak"]', 1)
      assertXpath(output, '(//p)[1]/a[@href="#mount-evans"][text()="Mount Evans"]', 1)
    })

    test('should discover anchor at start of ordered list item text and register it as a reference', async () => {
      const input = `This is a cross-reference to <<step-2>>.
This is a cross-reference to <<step-4>>.

. Ordered list, item 1, without anchor
. [[step-2,Step 2]]Ordered list, item 2, with anchor
. Ordered list, item 3, without anchor
. [[step-4,Step 4]]Ordered list, item 4, with anchor
`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok('step-2' in refs, 'refs should contain step-2')
      assert.ok('step-4' in refs, 'refs should contain step-4')
      const output = await doc.convert()
      assertXpath(output, '(//p)[1]/a[@href="#step-2"][text()="Step 2"]', 1)
      assertXpath(output, '(//p)[1]/a[@href="#step-4"][text()="Step 4"]', 1)
    })

    test('should discover anchor at start of callout list item text and register it as a reference', async () => {
      const input = `This is a cross-reference to <<url-mapping>>.

[source,ruby]
----
require 'sinatra' <1>

get '/hi' do <2> <3>
  "Hello World!"
end
----
<1> Library import
<2> [[url-mapping,url mapping]]URL mapping
<3> Response block
`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok('url-mapping' in refs, 'refs should contain url-mapping')
      const output = await doc.convert()
      assertXpath(output, '(//p)[1]/a[@href="#url-mapping"][text()="url mapping"]', 1)
    })
  })

  describe('Nested lists', () => {
    test('asterisk element mixed with dash elements should be nested', async () => {
      const input = `List
====

- Foo
* Boo
- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[1]/li//ul/li', 1)
    })

    test('dash element mixed with asterisks elements should be nested', async () => {
      const input = `List
====

* Foo
- Boo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[1]/li//ul/li', 1)
    })

    test('lines prefixed with alternating list markers separated by blank lines should be nested', async () => {
      const input = `List
====

- Foo

* Boo


- Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[1]/li//ul/li', 1)
    })

    test('nested elements (2) with asterisks', async () => {
      const input = `List
====

* Foo
** Boo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 2)
      assertXpath(output, '//ul/li', 3)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '(//ul)[1]/li//ul/li', 1)
    })

    test('nested elements (3) with asterisks', async () => {
      const input = `List
====

* Foo
** Boo
*** Snoo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 3)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li//ul)[1]/li', 1)
      assertXpath(output, '(((//ul)[1]/li//ul)[1]/li//ul)[1]/li', 1)
    })

    test('nested elements (4) with asterisks', async () => {
      const input = `List
====

* Foo
** Boo
*** Snoo
**** Froo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 4)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li//ul)[1]/li', 1)
      assertXpath(output, '(((//ul)[1]/li//ul)[1]/li//ul)[1]/li', 1)
      assertXpath(output, '((((//ul)[1]/li//ul)[1]/li//ul)[1]/li//ul)[1]/li', 1)
    })

    test('nested elements (5) with asterisks', async () => {
      const input = `List
====

* Foo
** Boo
*** Snoo
**** Froo
***** Groo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 5)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li//ul)[1]/li', 1)
      assertXpath(output, '(((//ul)[1]/li//ul)[1]/li//ul)[1]/li', 1)
      assertXpath(output, '((((//ul)[1]/li//ul)[1]/li//ul)[1]/li//ul)[1]/li', 1)
      assertXpath(output, '(((((//ul)[1]/li//ul)[1]/li//ul)[1]/li//ul)[1]/li//ul)[1]/li', 1)
    })

    test('nested arbitrary depth with asterisks', async () => {
      const items = []
      for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(97 + i)
        items.push(`${'*'.repeat(i + 1)} ${ch}`)
      }
      const output = await convertStringToEmbedded(items.join('\n'))
      assert.ok(!output.includes('*'), 'output should not include literal asterisks')
      assertCss(output, 'li', 26)
    })

    test('level of unordered list should match section level', async () => {
      const input = `== Parent Section

* item 1.1
 ** item 2.1
  *** item 3.1
 ** item 2.2
* item 1.2

=== Nested Section

* item 1.1
`
      const doc = await documentFromString(input)
      const lists = doc.findBy({ context: 'ulist' })
      assert.equal(lists[0].level, 1)
      assert.equal(lists[1].level, 1)
      assert.equal(lists[2].level, 1)
      assert.equal(lists[3].level, 2)
    })

    test('does not recognize lists with repeating unicode bullets', async () => {
      const input = '\u2022\u2022 Boo'
      const output = await convertString(input)
      assertXpath(output, '//ul', 0)
      assert.ok(output.includes('\u2022'), 'output should include unicode bullet')
    })

    test('nested ordered elements (2)', async () => {
      const input = `List
====

. Foo
.. Boo
. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 2)
      assertXpath(output, '//ol/li', 3)
      assertXpath(output, '(//ol)[1]/li', 2)
      assertXpath(output, '(//ol)[1]/li//ol/li', 1)
    })

    test('nested ordered elements (3)', async () => {
      const input = `List
====

. Foo
.. Boo
... Snoo
. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 3)
      assertXpath(output, '(//ol)[1]/li', 2)
      assertXpath(output, '((//ol)[1]/li//ol)[1]/li', 1)
      assertXpath(output, '(((//ol)[1]/li//ol)[1]/li//ol)[1]/li', 1)
    })

    test('nested arbitrary depth with dot marker', async () => {
      const items = []
      for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(97 + i)
        items.push(`${'.'.repeat(i + 1)} ${ch}`)
      }
      const output = await convertStringToEmbedded(items.join('\n'))
      assert.ok(!output.includes('.'), 'output should not include literal dots')
      assertCss(output, 'li', 26)
    })

    test('level of ordered list should match section level', async () => {
      const input = `== Parent Section

. item 1.1
 .. item 2.1
  ... item 3.1
 .. item 2.2
. item 1.2

=== Nested Section

. item 1.1
`
      const doc = await documentFromString(input)
      const lists = doc.findBy({ context: 'olist' })
      assert.equal(lists[0].level, 1)
      assert.equal(lists[1].level, 1)
      assert.equal(lists[2].level, 1)
      assert.equal(lists[3].level, 2)
    })

    test('nested unordered inside ordered elements', async () => {
      const input = `List
====

. Foo
* Boo
. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '(//ol)[1]/li', 2)
      assertXpath(output, '((//ol)[1]/li//ul)[1]/li', 1)
    })

    test('nested ordered inside unordered elements', async () => {
      const input = `List
====

* Foo
. Boo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li//ol)[1]/li', 1)
    })

    test('three levels of alternating unordered and ordered elements', async () => {
      const input = `== Lists

* bullet 1
. numbered 1.1
** bullet 1.1.1
* bullet 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.ulist', 2)
      assertCss(output, '.olist', 1)
      assertCss(output, '.ulist > ul > li > p', 3)
      assertCss(output, '.ulist > ul > li > p + .olist', 1)
      assertCss(output, '.ulist > ul > li > p + .olist > ol > li > p', 1)
      assertCss(output, '.ulist > ul > li > p + .olist > ol > li > p + .ulist', 1)
      assertCss(output, '.ulist > ul > li > p + .olist > ol > li > p + .ulist > ul > li > p', 1)
      assertCss(output, '.ulist > ul > li + li > p', 1)
    })

    test('lines with alternating markers of unordered and ordered list types separated by blank lines should be nested', async () => {
      const input = `List
====

* Foo

. Boo


* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li//ol)[1]/li', 1)
    })

    test('list item with literal content should not consume nested list of different type', async () => {
      const input = `List
====

- bullet

  literal
  but not
  hungry

. numbered
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//li', 2)
      assertXpath(output, '//ul//ol', 1)
      assertXpath(output, '//ul/li/p', 1)
      assertXpath(output, '//ul/li/p[text()="bullet"]', 1)
      assertXpath(output, '//ul/li/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, `//ul/li/p/following-sibling::*[@class="literalblock"]//pre[text()="literal\nbut not\nhungry"]`, 1)
      assertXpath(output, '//*[@class="literalblock"]/following-sibling::*[@class="olist arabic"]', 1)
      assertXpath(output, '//*[@class="literalblock"]/following-sibling::*[@class="olist arabic"]//p[text()="numbered"]', 1)
    })

    test('nested list item does not eat the title of the following detached block', async () => {
      const input = `List
====

- bullet
  * nested bullet 1
  * nested bullet 2

.Title
....
literal
....
`
      const output = await convertString(input)
      assertXpath(output, '//*[@class="ulist"]/ul', 2)
      assertXpath(output, '(//*[@class="ulist"])[1]/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '(//*[@class="ulist"])[1]/following-sibling::*[@class="literalblock"]/*[@class="title"]', 1)
    })

    test('lines with alternating markers of bulleted and description list types separated by blank lines should be nested', async () => {
      const input = `List
====

* Foo

term1:: def1

* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//ul[1]/li', 2)
      assertXpath(output, '//ul[1]/li//dl[1]/dt', 1)
      assertXpath(output, '//ul[1]/li//dl[1]/dd', 1)
    })

    test('nested ordered with attribute inside unordered elements', async () => {
      const input = `Blah
====

* Foo
[start=2]
. Boo
* Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li//ol)[1][@start = 2]/li', 1)
    })
  })

  describe('List continuations', () => {
    test('adjacent list continuation line attaches following paragraph', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
Item one, paragraph two
+
* Item two
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/p', 1)
      assertXpath(output, '//ul/li[1]//p', 2)
      assertXpath(output, '//ul/li[1]/p[text() = "Item one, paragraph one"]', 1)
      assertXpath(output, '//ul/li[1]/*[@class = "paragraph"]/p[text() = "Item one, paragraph two"]', 1)
    })

    test('adjacent list continuation line attaches following block', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
....
Item one, literal block
....
+
* Item two
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/p', 1)
      assertXpath(output, '(//ul/li[1]/p/following-sibling::*)[1][@class = "literalblock"]', 1)
    })

    test('adjacent list continuation line attaches following block with block attributes', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
:foo: bar
[[beck]]
.Read the following aloud to yourself
[source, ruby]
----
5.times { print "Odelay!" }
----

* Item two
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/p', 1)
      assertXpath(output, '(//ul/li[1]/p/following-sibling::*)[1][@id="beck"][@class = "listingblock"]', 1)
      assertXpath(output, '(//ul/li[1]/p/following-sibling::*)[1][@id="beck"]/div[@class="title"][starts-with(text(),"Read")]', 1)
      assertXpath(output, '(//ul/li[1]/p/following-sibling::*)[1][@id="beck"]//code[@data-lang="ruby"][starts-with(text(),"5.times")]', 1)
    })

    test('trailing block attribute line attached by continuation should not create block', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
[source]

* Item two
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/*', 1)
      assertXpath(output, '//ul/li//*[@class="listingblock"]', 0)
    })

    test('trailing block title line attached by continuation should not create block', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
.Disappears into the ether

* Item two
`
      const output = await convertString(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/*', 1)
    })

    test('consecutive blocks in list continuation attach to list item', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
....
Item one, literal block
....
+
____
Item one, quote block
____
+
* Item two
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/p', 1)
      assertXpath(output, '(//ul/li[1]/p/following-sibling::*)[1][@class = "literalblock"]', 1)
      assertXpath(output, '(//ul/li[1]/p/following-sibling::*)[2][@class = "quoteblock"]', 1)
    })

    test('list item with hanging indent followed by block attached by list continuation', async () => {
      const input = `== Lists

. list item 1
  continued
+
--
open block in list item 1
--

. list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol', 1)
      assertCss(output, 'ol li', 2)
      assertXpath(output, `(//ol/li)[1]/p[text()="list item 1\ncontinued"]`, 1)
      assertXpath(output, '(//ol/li)[1]/p/following-sibling::*[@class="openblock"]', 1)
      assertXpath(output, '(//ol/li)[1]/p/following-sibling::*[@class="openblock"]//p[text()="open block in list item 1"]', 1)
      assertXpath(output, `(//ol/li)[2]/p[text()="list item 2"]`, 1)
    })

    test('list item paragraph in list item and nested list item', async () => {
      const input = `== Lists

. list item 1
+
list item 1 paragraph

* nested list item
+
nested list item paragraph

. list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist ol', 1)
      assertCss(output, '.olist ol > li', 2)
      assertCss(output, '.ulist ul', 1)
      assertCss(output, '.ulist ul > li', 1)
      assertXpath(output, '(//ol/li)[1]/*', 3)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p', 1)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p[text()="list item 1"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="paragraph"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="ulist"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="ulist"]/ul/li', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="ulist"]/ul/li/p[text()="nested list item"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="ulist"]/ul/li/p/following-sibling::div[@class="paragraph"]', 1)
    })

    test('trailing list continuations should attach to list items at respective levels', async () => {
      const input = `== Lists

. list item 1
+
* nested list item 1
* nested list item 2
+
paragraph for nested list item 2

+
paragraph for list item 1

. list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist ol', 1)
      assertCss(output, '.olist ol > li', 2)
      assertCss(output, '.ulist ul', 1)
      assertCss(output, '.ulist ul > li', 2)
      assertCss(output, '.olist .ulist', 1)
      assertXpath(output, '(//ol/li)[1]/*', 3)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p', 1)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p[text()="list item 1"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/*', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/p', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/div[@class="paragraph"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="paragraph"]', 1)
    })

    test('trailing list continuations should attach to list items of different types at respective levels', async () => {
      const input = `== Lists

* bullet 1
. numbered 1.1
** bullet 1.1.1

+
numbered 1.1 paragraph

+
bullet 1 paragraph

* bullet 2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//ul)[1]/li', 2)
      assertXpath(output, '((//ul)[1]/li[1])/*', 3)
      assertXpath(output, '(((//ul)[1]/li[1])/*)[1]/self::p[text()="bullet 1"]', 1)
      assertXpath(output, '(((//ul)[1]/li[1])/*)[2]/ol', 1)
      assertXpath(output, '(((//ul)[1]/li[1])/*)[3]/self::div[@class="paragraph"]/p[text()="bullet 1 paragraph"]', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div/ol/li', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div/ol/li/*', 3)
      assertXpath(output, '(((//ul)[1]/li)[1]/div/ol/li/*)[1]/self::p[text()="numbered 1.1"]', 1)
      assertXpath(output, '(((//ul)[1]/li)[1]/div/ol/li/*)[2]/self::div[@class="ulist"]', 1)
      assertXpath(output, '(((//ul)[1]/li)[1]/div/ol/li/*)[3]/self::div[@class="paragraph"]/p[text()="numbered 1.1 paragraph"]', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div/ol/li/div[@class="ulist"]/ul/li', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div/ol/li/div[@class="ulist"]/ul/li/*', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div/ol/li/div[@class="ulist"]/ul/li/p[text()="bullet 1.1.1"]', 1)
    })

    test('repeated list continuations should attach to list items at respective levels', async () => {
      const input = `== Lists

. list item 1

* nested list item 1
+
--
open block for nested list item 1
--
+
* nested list item 2
+
paragraph for nested list item 2

+
paragraph for list item 1

. list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist ol', 1)
      assertCss(output, '.olist ol > li', 2)
      assertCss(output, '.ulist ul', 1)
      assertCss(output, '.ulist ul > li', 2)
      assertCss(output, '.olist .ulist', 1)
      assertXpath(output, '(//ol/li)[1]/*', 3)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p', 1)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p[text()="list item 1"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[1]/*', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[1]/p', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[1]/div[@class="openblock"]', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/*', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/p', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/div[@class="paragraph"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="paragraph"]', 1)
    })

    test('repeated list continuations attached directly to list item should attach to list items at respective levels', async () => {
      const input = `== Lists

. list item 1
+
* nested list item 1
+
--
open block for nested list item 1
--
+
* nested list item 2
+
paragraph for nested list item 2

+
paragraph for list item 1

. list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist ol', 1)
      assertCss(output, '.olist ol > li', 2)
      assertCss(output, '.ulist ul', 1)
      assertCss(output, '.ulist ul > li', 2)
      assertCss(output, '.olist .ulist', 1)
      assertXpath(output, '(//ol/li)[1]/*', 3)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p', 1)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p[text()="list item 1"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[1]/*', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[1]/p', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[1]/div[@class="openblock"]', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/*', 2)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/p', 1)
      assertXpath(output, '(((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li)[2]/div[@class="paragraph"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="paragraph"]', 1)
    })

    test('repeated list continuations should attach to list items at respective levels ignoring blank lines', async () => {
      const input = `== Lists

. list item 1
+
* nested list item 1
+
--
open block for nested list item 1
--
+
* nested list item 2
+
paragraph for nested list item 2


+
paragraph for list item 1

. list item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist ol', 1)
      assertCss(output, '.olist ol > li', 2)
      assertCss(output, '.ulist ul', 1)
      assertCss(output, '.ulist ul > li', 2)
      assertCss(output, '.olist .ulist', 1)
      assertXpath(output, '(//ol/li)[1]/*', 3)
      assertXpath(output, '((//ol/li)[1]/*)[1]/self::p[text()="list item 1"]', 1)
      assertXpath(output, '((//ol/li)[1]/*)[2]/self::div[@class="ulist"]/ul/li', 2)
      assertXpath(output, '((//ol/li)[1]/*)[3]/self::div[@class="paragraph"]', 1)
    })

    test('trailing list continuations should ignore preceding blank lines', async () => {
      const input = `== Lists

* bullet 1
** bullet 1.1
*** bullet 1.1.1
+
--
open block
--


+
bullet 1.1 paragraph


+
bullet 1 paragraph

* bullet 2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '((//ul)[1]/li[1])/*', 3)
      assertXpath(output, '(((//ul)[1]/li[1])/*)[1]/self::p[text()="bullet 1"]', 1)
      assertXpath(output, '(((//ul)[1]/li[1])/*)[2]/self::div[@class="ulist"]', 1)
      assertXpath(output, '(((//ul)[1]/li[1])/*)[3]/self::div[@class="paragraph"]/p[text()="bullet 1 paragraph"]', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/*', 3)
      assertXpath(output, '(((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/*)[1]/self::p[text()="bullet 1.1"]', 1)
      assertXpath(output, '(((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/*)[2]/self::div[@class="ulist"]', 1)
      assertXpath(output, '(((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/*)[3]/self::div[@class="paragraph"]/p[text()="bullet 1.1 paragraph"]', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/div[@class="ulist"]/ul/li', 1)
      assertXpath(output, '((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/div[@class="ulist"]/ul/li/*', 2)
      assertXpath(output, '(((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/div[@class="ulist"]/ul/li/*)[1]/self::p', 1)
      assertXpath(output, '(((//ul)[1]/li)[1]/div[@class="ulist"]/ul/li/div[@class="ulist"]/ul/li/*)[2]/self::div[@class="openblock"]', 1)
    })

    test('indented outline list item with different marker offset by a blank line should be recognized as a nested list', async () => {
      const input = `* item 1

  . item 1.1
+
attached paragraph

  . item 1.2
+
attached paragraph

* item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ol', 1)
      assertCss(output, 'ul ol', 1)
      assertCss(output, 'ul > li', 2)
      assertXpath(output, '((//ul/li)[1]/*)', 2)
      assertXpath(output, '((//ul/li)[1]/*)[1]/self::p', 1)
      assertXpath(output, '((//ul/li)[1]/*)[2]/self::div/ol', 1)
      assertXpath(output, '((//ul/li)[1]/*)[2]/self::div/ol/li', 2)
      for (let idx = 1; idx <= 2; idx++) {
        assertXpath(output, `(((//ul/li)[1]/*)[2]/self::div/ol/li)[${idx}]/*`, 2)
        assertXpath(output, `((((//ul/li)[1]/*)[2]/self::div/ol/li)[${idx}]/*)[1]/self::p`, 1)
        assertXpath(output, `((((//ul/li)[1]/*)[2]/self::div/ol/li)[${idx}]/*)[2]/self::div[@class="paragraph"]`, 1)
      }
    })

    test('indented description list item inside outline list item offset by a blank line should be recognized as a nested list', async () => {
      const input = `* item 1

  term a:: description a
+
attached paragraph

  term b:: description b
+
attached paragraph

* item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'dl', 1)
      assertCss(output, 'ul dl', 1)
      assertCss(output, 'ul > li', 2)
      assertXpath(output, '((//ul/li)[1]/*)', 2)
      assertXpath(output, '((//ul/li)[1]/*)[1]/self::p', 1)
      assertXpath(output, '((//ul/li)[1]/*)[2]/self::div/dl', 1)
      assertXpath(output, '((//ul/li)[1]/*)[2]/self::div/dl/dt', 2)
      assertXpath(output, '((//ul/li)[1]/*)[2]/self::div/dl/dd', 2)
      for (let idx = 1; idx <= 2; idx++) {
        assertXpath(output, `(((//ul/li)[1]/*)[2]/self::div/dl/dd)[${idx}]/*`, 2)
        assertXpath(output, `((((//ul/li)[1]/*)[2]/self::div/dl/dd)[${idx}]/*)[1]/self::p`, 1)
        assertXpath(output, `((((//ul/li)[1]/*)[2]/self::div/dl/dd)[${idx}]/*)[2]/self::div[@class="paragraph"]`, 1)
      }
    })

    test('consecutive list continuation lines are folded', async () => {
      const input = `Lists
=====

* Item one, paragraph one
+
+
Item one, paragraph two
+
+
* Item two
+
+
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul', 1)
      assertXpath(output, '//ul/li', 2)
      assertXpath(output, '//ul/li[1]/p', 1)
      assertXpath(output, '//ul/li[1]/div/p', 1)
      assertXpath(output, '//ul/li[1]//p[text() = "Item one, paragraph one"]', 1)
    })

    test('should warn if unterminated block is detected in list item', async () => {
      const input = `* item
+
====
example
* swallowed item
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ul/li', 1)
      assertXpath(output, '//ul/li/*[@class="exampleblock"]', 1)
      assertXpath(output, `//p[text()="example\n* swallowed item"]`, 1)
      assertMessage(logger, 'WARN', 'unterminated example block')
    })
  })
})

// ── Ordered lists (:olist) ────────────────────────────────────────────────────

describe('Ordered lists (olist)', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Simple lists', () => {
    test('dot elements with no blank lines', async () => {
      const input = `List
====

. Foo
. Boo
. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 1)
      assertCss(output, 'ol[start]', 0)
      assertXpath(output, '//ol/li', 3)
    })

    test('indented dot elements using spaces', async () => {
      const input = ' . Foo\n . Boo\n . Blech\n'
      const output = await convertString(input)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '//ol/li', 3)
    })

    test('indented dot elements using tabs', async () => {
      const input = '\t.\tFoo\n\t.\tBoo\n\t.\tBlech\n'
      const output = await convertString(input)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '//ol/li', 3)
    })

    test('should represent explicit role attribute as style class', async () => {
      const input = `[role="dry"]
. Once
. Again
. Refactor!
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist.arabic.dry', 1)
      assertCss(output, '.olist ol.arabic', 1)
    })

    test('should base list style on marker length rather than list depth', async () => {
      const input = `... parent
.. child
. grandchild
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist.lowerroman', 1)
      assertCss(output, '.olist.lowerroman .olist.loweralpha', 1)
      assertCss(output, '.olist.lowerroman .olist.loweralpha .olist.arabic', 1)
    })

    test('should allow list style to be specified explicitly when using markers with implicit style', async () => {
      const input = `[loweralpha]
i) 1
ii) 2
iii) 3
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist.loweralpha', 1)
      assertCss(output, '.olist.lowerroman', 0)
    })

    test('should represent custom numbering and explicit role attribute as style classes', async () => {
      const input = `[loweralpha, role="dry"]
. Once
. Again
. Refactor!
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist.loweralpha.dry', 1)
      assertCss(output, '.olist ol.loweralpha', 1)
    })

    test('should set reversed attribute on list if reversed option is set', async () => {
      const input = `[%reversed, start=3]
. three
. two
. one
. blast off!
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol[reversed][start="3"]', 1)
    })

    test('should represent implicit role attribute as style class', async () => {
      const input = `[.dry]
. Once
. Again
. Refactor!
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist.arabic.dry', 1)
      assertCss(output, '.olist ol.arabic', 1)
    })

    test('should represent custom numbering and implicit role attribute as style classes', async () => {
      const input = `[loweralpha.dry]
. Once
. Again
. Refactor!
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.olist.loweralpha.dry', 1)
      assertCss(output, '.olist ol.loweralpha', 1)
    })

    test('dot elements separated by blank lines should merge lists', async () => {
      const input = `List
====

. Foo

. Boo


. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '//ol/li', 3)
    })

    test('should escape special characters in all literal paragraphs attached to list item', async () => {
      const input = `. first item

  <code>text</code>

  more <code>text</code>

. second item
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'li', 2)
      assertCss(output, 'code', 0)
      assertCss(output, 'li:first-of-type > *', 3)
      assertCss(output, 'li:first-of-type pre', 2)
      assertXpath(output, '((//li)[1]//pre)[1][text()="<code>text</code>"]', 1)
      assertXpath(output, '((//li)[1]//pre)[2][text()="more <code>text</code>"]', 1)
    })

    test('dot elements with interspersed line comments should be skipped and not break list', async () => {
      const input = `== List

. Foo
// line comment
// another line comment
. Boo
// line comment
more text
// another line comment
. Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ol', 1)
      assertXpath(output, '//ol/li', 3)
      assertXpath(output, `(//ol/li)[2]/p[text()="Boo\nmore text"]`, 1)
    })

    test('dot elements separated by line comment offset by blank lines should not merge lists', async () => {
      const input = `List
====

. Foo
. Boo

//

. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 2)
      assertXpath(output, '(//ol)[1]/li', 2)
      assertXpath(output, '(//ol)[2]/li', 1)
    })

    test('dot elements separated by a block title offset by a blank line should not merge lists', async () => {
      const input = `List
====

. Foo
. Boo

.Also
. Blech
`
      const output = await convertString(input)
      assertXpath(output, '//ol', 2)
      assertXpath(output, '(//ol)[1]/li', 2)
      assertXpath(output, '(//ol)[2]/li', 1)
      assertXpath(output, '(//ol)[2]/preceding-sibling::*[@class = "title"][text() = "Also"]', 1)
    })

    test('dot elements separated by an attribute entry offset by a blank line should not merge lists', async () => {
      const input = `== List

. Foo
. Boo

:foo: bar
. Blech
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//ol', 2)
      assertXpath(output, '(//ol)[1]/li', 2)
      assertXpath(output, '(//ol)[2]/li', 1)
    })

    test('should honor start attribute on ordered list', async () => {
      const input = `== List

[start=7]
. item 7
. item 8
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol.arabic', 1)
      assertCss(output, 'ol[start=7]', 1)
    })

    test('should allow value of start attribute to be 0', async () => {
      const input = `== List

[start=0]
. item 0
. item 1
. item 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol.arabic', 1)
      assertCss(output, 'ol[start=0]', 1)
    })

    test('should allow value of start attribute to be negative', async () => {
      const input = `== List

[start=-10]
. -10
. -9
. -8
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol.arabic', 1)
      assertCss(output, 'ol[start=-10]', 1)
    })

    test('should use start number in docbook5 backend', async () => {
      const input = `== List

[start=7]
. item 7
. item 8
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook5' })
      assertXpath(output, '//orderedlist', 1)
      assertXpath(output, '(//orderedlist)/listitem', 2)
      assertXpath(output, '(//orderedlist)[@startingnumber = "7"]', 1)
    })

    test('should not warn if explicit numbering starts at value of start attribute', async () => {
      const input = `== List

[start=7]
7. item 7
8. item 8
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol[start=7]', 1)
      assertCss(output, 'ol.arabic', 1)
      assertCss(output, 'ol li', 2)
      assert.equal(logger.messages.length, 0)
    })

    test('should implicitly set start on ordered list if explicit arabic numbering does not start at 1', async () => {
      const input = `== List

7. item 7
8. item 8
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol[start=7]', 1)
      assertCss(output, 'ol.arabic', 1)
      assertCss(output, 'ol li', 2)
      assert.equal(logger.messages.length, 0)
    })

    test('should implicitly set start on ordered list if explicit roman numbering does not start at 1', async () => {
      const input = `== List

IV) item 4
V) item 5
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol[start=4]', 1)
      assertCss(output, 'ol.upperroman', 1)
      assertCss(output, 'ol li', 2)
      assert.equal(logger.messages.length, 0)
    })

    test('should warn if item with explicit numbering in ordered list is out of sequence', async () => {
      const input = `== List

x. x
z. z
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ol[start=24]', 1)
      assertCss(output, 'ol.loweralpha', 1)
      assertCss(output, 'ol li', 2)
      assertMessage(logger, 'WARN', 'list item index: expected y, got z')
    })

    test('should match trailing line separator in text of list item', async () => {
      const ls = String.fromCodePoint(8232)
      const input = `. a\n. b${ls}\n. c`
      const output = await convertString(input)
      assertCss(output, 'li', 3)
      assert.ok(output.includes(`<p>b${ls}</p>`), `expected <p>b${ls}</p> in output`)
    })

    test('should match line separator in text of list item', async () => {
      const ls = String.fromCodePoint(8232)
      const input = `. a\n. b${ls}b\n. c`
      const output = await convertString(input)
      assertCss(output, 'li', 3)
      assert.ok(output.includes(`<p>b${ls}b</p>`), `expected <p>b${ls}b</p> in output`)
    })
  })

  test('should warn if explicit uppercase roman numerals in list are out of sequence', async () => {
    const input = `I) one
III) three
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//ol/li', 2)
    assertMessage(logger, 'WARN', 'list item index: expected II, got III')
  })

  test('should warn if explicit lowercase roman numerals in list are out of sequence', async () => {
    const input = `i) one
iii) three
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//ol/li', 2)
    assertMessage(logger, 'WARN', 'list item index: expected ii, got iii')
  })
})

// ── Description lists (:dlist) ────────────────────────────────────────────────

describe('Description lists (dlist)', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Simple lists', () => {
    test('should not parse a bare dlist delimiter as a dlist', async () => {
      const input = '::'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 0)
      assertXpath(output, '//p[text()="::"]', 1)
    })

    test('should not parse an indented bare dlist delimiter as a dlist', async () => {
      const input = ' ::'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 0)
      assertXpath(output, '//pre[text()="::"]', 1)
    })

    test('should parse a dlist delimiter preceded by a blank attribute as a dlist', async () => {
      const input = '{blank}::'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 1)
      assertCss(output, 'dl > dt:empty', 1)
    })

    test('should parse a dlist if term is include and principal text is []', async () => {
      const input = 'include:: []'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "[]"]', 1)
    })

    test('should parse a dlist if term is include and principal text matches macro form', async () => {
      const input = 'include:: pass:[${placeholder}]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "${placeholder}"]', 1)
    })

    test('single-line adjacent elements', async () => {
      const input = `term1:: def1
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('should parse sibling items using same rules', async () => {
      const input = `term1;; ;; def1
term2;; ;; def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = ";; def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = ";; def2"]', 1)
    })

    test('should allow term to end with a semicolon when using double semicolon delimiter', async () => {
      const input = `term;;; def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 1)
      assertXpath(output, '(//dl/dt)[1][text() = "term;"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def"]', 1)
    })

    test('single-line indented adjacent elements', async () => {
      const input = `term1:: def1
 term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('single-line indented adjacent elements with tabs', async () => {
      const input = `term1::\tdef1\n\tterm2::\tdef2\n`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('single-line elements separated by blank line should create a single list', async () => {
      const input = `term1:: def1

term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
    })

    test('a line comment between elements should divide them into separate lists', async () => {
      const input = `term1:: def1

//

term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '(//dl)[1]/dt', 1)
      assertXpath(output, '(//dl)[2]/dt', 1)
    })

    test('a ruler between elements should divide them into separate lists', async () => {
      const input = `term1:: def1

'''

term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl//hr', 0)
      assertXpath(output, '(//dl)[1]/dt', 1)
      assertXpath(output, '(//dl)[2]/dt', 1)
    })

    test('a block title between elements should divide them into separate lists', async () => {
      const input = `term1:: def1

.Some more
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '(//dl)[1]/dt', 1)
      assertXpath(output, '(//dl)[2]/dt', 1)
      assertXpath(output, '(//dl)[2]/preceding-sibling::*[@class="title"][text() = "Some more"]', 1)
    })

    test('multi-line elements with paragraph content', async () => {
      const input = `term1::
def1
term2::
def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line elements with indented paragraph content', async () => {
      const input = `term1::
 def1
term2::
  def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line elements with indented paragraph content that includes comment lines', async () => {
      const input = `term1::
 def1
// comment
term2::
  def2
// comment
  def2 continued
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, `(//dl/dt)[2]/following-sibling::dd/p[text() = "def2\ndef2 continued"]`, 1)
    })

    test('should not strip comment line in literal paragraph block attached to list item', async () => {
      const input = `term1::
+
 line 1
// not a comment
 line 3
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="literalblock"]', 1)
      assertXpath(output, `//*[@class="literalblock"]//pre[text()=" line 1\n// not a comment\n line 3"]`, 1)
    })

    test('should escape special characters in all literal paragraphs attached to list item', async () => {
      const input = `term:: desc

  <code>text</code>

  more <code>text</code>

another term::

  <code>text</code> in a paragraph
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dt', 2)
      assertCss(output, 'code', 0)
      assertCss(output, 'dd:first-of-type > *', 3)
      assertCss(output, 'dd:first-of-type pre', 2)
      assertXpath(output, '((//dd)[1]//pre)[1][text()="<code>text</code>"]', 1)
      assertXpath(output, '((//dd)[1]//pre)[2][text()="more <code>text</code>"]', 1)
      assertXpath(output, '((//dd)[2]//p)[1][text()="<code>text</code> in a paragraph"]', 1)
    })

    test('multi-line element with paragraph starting with multiple dashes should not be seen as list', async () => {
      const thin = String.fromCodePoint(8201)
      const em = String.fromCodePoint(8212)
      const input = `term1::
  def1
  -- and a note

term2::
  def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, `(//dl/dt)[1]/following-sibling::dd/p[text() = "def1${thin}${em}${thin}and a note"]`, 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line element with multiple terms', async () => {
      const input = `term1::
term2::
def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dd', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dt', 1)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('consecutive terms share same varlistentry in docbook', async () => {
      const input = `term::
alt term::
description

last::
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//varlistentry', 2)
      assertXpath(output, '(//varlistentry)[1]/term', 2)
      assertXpath(output, '(//varlistentry)[2]/term', 1)
      assertXpath(output, '(//varlistentry)[2]/listitem', 1)
      assertXpath(output, '(//varlistentry)[2]/listitem[normalize-space(text())=""]', 1)
    })

    test('multi-line elements with blank line before paragraph content', async () => {
      const input = `term1::

def1
term2::

def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line elements with paragraph and literal content', async () => {
      const input = `term1::
def1

  literal

term2::
  def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd//pre', 1)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('mixed single and multi-line adjacent elements', async () => {
      const input = `term1:: def1
term2::
def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dt/following-sibling::dd', 2)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('should discover anchor at start of description term text and register it as a reference', async () => {
      const input = `The highest peak in the Front Range is <<grays-peak>>, which tops <<mount-evans>> by just a few feet.

[[mount-evans,Mount Evans]]Mount Evans:: 14,271 feet
[[grays-peak]]Grays Peak:: 14,278 feet
`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok('mount-evans' in refs, 'refs should contain mount-evans')
      assert.ok('grays-peak' in refs, 'refs should contain grays-peak')
      const output = await doc.convert()
      assertXpath(output, '(//p)[1]/a[@href="#grays-peak"][text()="Grays Peak"]', 1)
      assertXpath(output, '(//p)[1]/a[@href="#mount-evans"][text()="Mount Evans"]', 1)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '(//dl/dt)[1]/a[@id="mount-evans"]', 1)
      assertXpath(output, '(//dl/dt)[2]/a[@id="grays-peak"]', 1)
    })

    test('missing space before term does not produce description list', async () => {
      const input = `term1::def1
term2::def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 0)
    })

    test('literal block inside description list', async () => {
      const input = `term::
+
....
literal, line 1

literal, line 2
....
anotherterm:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '//dl/dd//pre', 1)
      assertXpath(output, '(//dl/dd)[1]/*[@class="literalblock"]//pre', 1)
      assertXpath(output, '(//dl/dd)[2]/p[text() = "def"]', 1)
    })

    test('literal block inside description list with trailing line continuation', async () => {
      const input = `term::
+
....
literal, line 1

literal, line 2
....
+
anotherterm:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '//dl/dd//pre', 1)
      assertXpath(output, '(//dl/dd)[1]/*[@class="literalblock"]//pre', 1)
      assertXpath(output, '(//dl/dd)[2]/p[text() = "def"]', 1)
    })

    test('multiple listing blocks inside description list', async () => {
      const input = `term::
+
----
listing, line 1

listing, line 2
----
+
----
listing, line 1

listing, line 2
----
anotherterm:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dt', 2)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '//dl/dd//pre', 2)
      assertXpath(output, '(//dl/dd)[1]/*[@class="listingblock"]//pre', 2)
      assertXpath(output, '(//dl/dd)[2]/p[text() = "def"]', 1)
    })

    test('open block inside description list', async () => {
      const input = `term::
+
--
Open block as description of term.

And some more detail...
--
anotherterm:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dd//p', 3)
      assertXpath(output, '(//dl/dd)[1]//*[@class="openblock"]//p', 2)
    })

    test('paragraph attached by a list continuation on either side in a description list', async () => {
      const input = `term1:: def1
+
more detail
+
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text())="term1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text())="term2"]', 1)
      assertXpath(output, '(//dl/dd)[1]//p', 2)
      assertXpath(output, '((//dl/dd)[1]//p)[1][text()="def1"]', 1)
      assertXpath(output, '(//dl/dd)[1]/p/following-sibling::*[@class="paragraph"]/p[text() = "more detail"]', 1)
    })

    test('paragraph attached by a list continuation on either side to a multi-line element in a description list', async () => {
      const input = `term1::
def1
+
more detail
+
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '(//dl/dt)[1][normalize-space(text())="term1"]', 1)
      assertXpath(output, '(//dl/dt)[2][normalize-space(text())="term2"]', 1)
      assertXpath(output, '(//dl/dd)[1]//p', 2)
      assertXpath(output, '((//dl/dd)[1]//p)[1][text()="def1"]', 1)
      assertXpath(output, '(//dl/dd)[1]/p/following-sibling::*[@class="paragraph"]/p[text() = "more detail"]', 1)
    })

    test('should continue to parse subsequent blocks attached to list item after first block is dropped', async () => {
      const input = `:attribute-missing: drop-line

term::
+
image::{unresolved}[]
+
paragraph
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 1)
      assertCss(output, 'dl > dt + dd', 1)
      assertCss(output, 'dl > dt + dd > .imageblock', 0)
      assertCss(output, 'dl > dt + dd > .paragraph', 1)
    })

    test('verse paragraph inside a description list', async () => {
      const input = `term1:: def
+
[verse]
la la la

term2:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dd//p', 2)
      assertXpath(output, '(//dl/dd)[1]/*[@class="verseblock"]/pre[text() = "la la la"]', 1)
    })

    test('list inside a description list', async () => {
      const input = `term1::
* level 1
** level 2
* level 1
term2:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '//dl/dd/p', 1)
      assertXpath(output, '(//dl/dd)[1]//ul', 2)
      assertXpath(output, '((//dl/dd)[1]//ul)[1]//ul', 1)
    })

    test('list inside a description list offset by blank lines', async () => {
      const input = `term1::

* level 1
** level 2
* level 1

term2:: def
`
      const output = await convertString(input)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '//dl/dd/p', 1)
      assertXpath(output, '(//dl/dd)[1]//ul', 2)
      assertXpath(output, '((//dl/dd)[1]//ul)[1]//ul', 1)
    })

    test('should only grab one line following last item if item has no inline description', async () => {
      const input = `term1::

def1

term2::

def2

A new paragraph

Another new paragraph
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '(//dl/dd)[1]/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dd)[2]/p[text() = "def2"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]', 2)
      assertXpath(output, '(//*[@class="dlist"]/following-sibling::*[@class="paragraph"])[1]/p[text() = "A new paragraph"]', 1)
      assertXpath(output, '(//*[@class="dlist"]/following-sibling::*[@class="paragraph"])[2]/p[text() = "Another new paragraph"]', 1)
    })

    test('should only grab one literal line following last item if item has no inline description', async () => {
      const input = `term1::

def1

term2::

  def2

A new paragraph

Another new paragraph
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '(//dl/dd)[1]/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dd)[2]/p[text() = "def2"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]', 2)
      assertXpath(output, '(//*[@class="dlist"]/following-sibling::*[@class="paragraph"])[1]/p[text() = "A new paragraph"]', 1)
      assertXpath(output, '(//*[@class="dlist"]/following-sibling::*[@class="paragraph"])[2]/p[text() = "Another new paragraph"]', 1)
    })

    test('should append subsequent paragraph literals to list item as block content', async () => {
      const input = `term1::

def1

term2::

  def2

  literal

A new paragraph.
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dd', 2)
      assertXpath(output, '(//dl/dd)[1]/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl/dd)[2]/p[text() = "def2"]', 1)
      assertXpath(output, '(//dl/dd)[2]/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '(//dl/dd)[2]/p/following-sibling::*[@class="literalblock"]//pre[text() = "literal"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '(//*[@class="dlist"]/following-sibling::*[@class="paragraph"])[1]/p[text() = "A new paragraph."]', 1)
    })

    test('should not match comment line that looks like description list term', async () => {
      const input = `before

//key:: val

after
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 0)
    })

    test('should not match comment line following list that looks like description list term', async () => {
      const input = `* item

//term:: desc
== Section

section text
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="ulist"]', 1)
      assertXpath(output, '/*[@class="sect1"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[text()="Section"]', 1)
      assertXpath(output, '/*[@class="ulist"]/following-sibling::*[@class="sect1"]', 1)
    })

    test('should not match comment line that looks like sibling description list term', async () => {
      const input = `before

foo:: bar
//yin:: yang

after
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist', 1)
      assertCss(output, '.dlist dt', 1)
      assert.ok(!output.includes('yin'), 'output should not include "yin"')
    })

    test('should not hang on description list item in list that begins with ///', async () => {
      const input = `* a
///b::
c
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'ul', 1)
      assertCss(output, 'ul li dl', 1)
      assertXpath(output, '//ul/li/p[text()="a"]', 1)
      assertXpath(output, '//dt[text()="///b"]', 1)
      assertXpath(output, '//dd/p[text()="c"]', 1)
    })

    test('should not hang on sibling description list item that begins with ///', async () => {
      const input = `a::
///b::
c
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertXpath(output, '(//dl/dt)[1][text()="a"]', 1)
      assertXpath(output, '(//dl/dt)[2][text()="///b"]', 1)
      assertXpath(output, '//dl/dd/p[text()="c"]', 1)
    })

    test('should skip dlist term that begins with // unless it begins with ///', async () => {
      const input = `category a::
//ignored term:: def

category b::
///term:: def
`
      const output = await convertStringToEmbedded(input)
      assert.ok(!output.includes('ignored term'), 'output should not include "ignored term"')
      assertXpath(output, '//dt[text()="///term"]', 1)
    })

    test('more than 4 consecutive colons should become part of description list term', async () => {
      const input = `A term::::: a description
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 1)
      assertXpath(output, '//dl/dt[text()="A term:"]', 1)
      assertXpath(output, '//dl/dd/p[text()="a description"]', 1)
    })

    test('text method of dd node should return nil if dd node only contains blocks', async () => {
      const input = `term::
+
paragraph
`
      const doc = await documentFromString(input)
      const dd = doc.blocks[0].items[0][1]
      assert.equal(dd.text, null)
    })

    test('should match trailing line separator in text of list item', async () => {
      const ls = String.fromCodePoint(8232)
      const input = `A:: a\nB:: b${ls}\nC:: c`
      const output = await convertString(input)
      assertCss(output, 'dd', 3)
      assert.ok(output.includes(`<p>b${ls}</p>`), `expected <p>b${ls}</p> in output`)
    })

    test('should match line separator in text of list item', async () => {
      const ls = String.fromCodePoint(8232)
      const input = `A:: a\nB:: b${ls}b\nC:: c`
      const output = await convertString(input)
      assertCss(output, 'dd', 3)
      assert.ok(output.includes(`<p>b${ls}b</p>`), `expected <p>b${ls}b</p> in output`)
    })
  })

  describe('Nested lists', () => {
    test('should not parse a nested dlist delimiter without a term as a dlist', async () => {
      const input = `t::
;;
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '//dl/dd/p[text()=";;"]', 1)
    })

    test('should not parse a nested indented dlist delimiter without a term as a dlist', async () => {
      const input = `t::
desc
  ;;
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, `//dl/dd/p[text()="desc\n  ;;"]`, 1)
    })

    test('single-line adjacent nested elements', async () => {
      const input = `term1:: def1
label1::: detail1
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('single-line adjacent maximum nested elements', async () => {
      const input = `term1:: def1
label1::: detail1
name1:::: value1
item1;; price1
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 4)
      assertXpath(output, '//dl//dl//dl//dl', 1)
    })

    test('single-line nested elements separated by blank line at top level', async () => {
      const input = `term1:: def1

label1::: detail1

term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('single-line nested elements separated by blank line at nested level', async () => {
      const input = `term1:: def1
label1::: detail1

label2::: detail2
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('single-line adjacent nested elements with alternate delimiters', async () => {
      const input = `term1:: def1
label1;; detail1
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line adjacent nested elements', async () => {
      const input = `term1::
def1
label1:::
detail1
term2::
def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line nested elements separated by blank line at nested level repeated', async () => {
      const input = `term1::
def1
label1:::

detail1
label2:::
detail2

term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '(//dl//dl/dt)[1][normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '(//dl//dl/dt)[1]/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl//dl/dt)[2][normalize-space(text()) = "label2"]', 1)
      assertXpath(output, '(//dl//dl/dt)[2]/following-sibling::dd/p[text() = "detail2"]', 1)
    })

    test('multi-line element with indented nested element', async () => {
      const input = `term1::
  def1
  label1;;
   detail1
term2::
  def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt', 2)
      assertXpath(output, '(//dl)[1]/dd', 2)
      assertXpath(output, '((//dl)[1]/dt)[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '((//dl)[1]/dt)[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '((//dl)[1]/dt)[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '((//dl)[1]/dt)[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('mixed single and multi-line elements with indented nested elements', async () => {
      const input = `term1:: def1
  label1:::
   detail1
term2:: def2
`
      const output = await convertString(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[text() = "def1"]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2][normalize-space(text()) = "term2"]', 1)
      assertXpath(output, '(//dl)[1]/dt[2]/following-sibling::dd/p[text() = "def2"]', 1)
    })

    test('multi-line elements with first paragraph folded to text with adjacent nested element', async () => {
      const input = `term1:: def1
continued
label1:::
detail1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "term1"]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[starts-with(text(), "def1")]', 1)
      assertXpath(output, '(//dl)[1]/dt[1]/following-sibling::dd/p[contains(text(), "continued")]', 1)
      assertXpath(output, '//dl//dl/dt[normalize-space(text()) = "label1"]', 1)
      assertXpath(output, '//dl//dl/dt/following-sibling::dd/p[text() = "detail1"]', 1)
    })

    test('nested dlist attached by list continuation should not consume detached paragraph', async () => {
      const input = `term:: text
+
nested term::: text

paragraph
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertCss(output, '.dlist .paragraph', 0)
      assertCss(output, '.dlist + .paragraph', 1)
    })

    test('nested dlist with attached block offset by empty line', async () => {
      const input = `category::

term 1:::
+
--
def 1
--
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '//dl//dl', 1)
      assertXpath(output, '(//dl)[1]/dt[1][normalize-space(text()) = "category"]', 1)
      assertXpath(output, '(//dl)[1]//dl/dt[1][normalize-space(text()) = "term 1"]', 1)
      assertXpath(output, '(//dl)[1]//dl/dt[1]/following-sibling::dd//p[starts-with(text(), "def 1")]', 1)
    })
  })

  describe('Special lists', () => {
    test('should convert glossary list with proper semantics', async () => {
      const input = `[glossary]
term 1:: def 1
term 2:: def 2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist.glossary', 1)
      assertCss(output, '.dlist dt:not([class])', 2)
    })

    test('consecutive glossary terms should share same glossentry element in docbook', async () => {
      const input = `[glossary]
term::
alt term::
description

last::
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '/glossentry', 2)
      assertXpath(output, '(/glossentry)[1]/glossterm', 2)
      assertXpath(output, '(/glossentry)[2]/glossterm', 1)
      assertXpath(output, '(/glossentry)[2]/glossdef', 1)
      assertXpath(output, '(/glossentry)[2]/glossdef[normalize-space(text())=""]', 1)
    })

    test('should convert horizontal list with proper markup', async () => {
      const input = `[horizontal]
first term:: description
+
more detail

second term:: description
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.hdlist', 1)
      assertCss(output, '.hdlist table', 1)
      assertCss(output, '.hdlist table colgroup', 0)
      assertCss(output, '.hdlist table tr', 2)
      assert.ok(!output.includes('<tbody>'), 'output should not include <tbody>')
      assertXpath(output, `/*[@class="hdlist"]/table/tr[1]/td`, 2)
      assertXpath(output, `/*[@class="hdlist"]/table/tr[1]/td[@class="hdlist1"]`, 1)
      assertXpath(output, `/*[@class="hdlist"]/table/tr[1]/td[@class="hdlist2"]`, 1)
      assertXpath(output, `/*[@class="hdlist"]/table/tr[1]/td[@class="hdlist2"]/p`, 1)
      assertXpath(output, `/*[@class="hdlist"]/table/tr[1]/td[@class="hdlist2"]/p/following-sibling::*[@class="paragraph"]`, 1)
      assertXpath(output, '((//tr)[1]/td)[1][normalize-space(text())="first term"]', 1)
      assertXpath(output, '((//tr)[1]/td)[2]/p[normalize-space(text())="description"]', 1)
      assertXpath(output, `/*[@class="hdlist"]/table/tr[2]/td`, 2)
      assertXpath(output, '((//tr)[2]/td)[1][normalize-space(text())="second term"]', 1)
      assertXpath(output, '((//tr)[2]/td)[2]/p[normalize-space(text())="description"]', 1)
    })

    test('should set col widths of item and label if specified', async () => {
      const input = `[horizontal]
[labelwidth="25", itemwidth="75"]
term:: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertXpath(output, '(//table/colgroup/col)[1][@width="25%"]', 1)
      assertXpath(output, '(//table/colgroup/col)[2][@width="75%"]', 1)
    })

    test('should set col widths of item and label in docbook if specified', async () => {
      const input = `[horizontal]
[labelwidth="25", itemwidth="75"]
term:: def
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertCss(output, 'informaltable', 1)
      assertCss(output, 'informaltable > tgroup', 1)
      assertCss(output, 'informaltable > tgroup > colspec', 2)
      assertXpath(output, '(/informaltable/tgroup/colspec)[1][@colwidth="25*"]', 1)
      assertXpath(output, '(/informaltable/tgroup/colspec)[2][@colwidth="75*"]', 1)
    })

    test('should add strong class to label if strong option is set', async () => {
      const input = `[horizontal, options="strong"]
term:: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.hdlist', 1)
      assertCss(output, '.hdlist td.hdlist1.strong', 1)
    })

    test('consecutive terms in horizontal list should share same cell', async () => {
      const input = `[horizontal]
term::
alt term::
description

last::
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//tr', 2)
      assertXpath(output, '(//tr)[1]/td[@class="hdlist1"]', 1)
      assertXpath(output, '(//tr)[1]/td[@class="hdlist1"]/br', 1)
      assertXpath(output, '(//tr)[2]/td[@class="hdlist2"]', 1)
    })

    test('consecutive terms in horizontal list should share same entry in docbook', async () => {
      const input = `[horizontal]
term::
alt term::
description

last::
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//row', 2)
      assertXpath(output, '(//row)[1]/entry', 2)
      assertXpath(output, '((//row)[1]/entry)[1]/simpara', 2)
      assertXpath(output, '(//row)[2]/entry', 2)
      assertXpath(output, '((//row)[2]/entry)[2][normalize-space(text())=""]', 1)
    })

    test('should convert horizontal list in docbook with proper markup', async () => {
      const input = `.Terms
[horizontal]
first term:: description
+
more detail

second term:: description
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '/table', 1)
      assertXpath(output, '/table[@tabstyle="horizontal"]', 1)
      assertXpath(output, '/table[@tabstyle="horizontal"]/title[text()="Terms"]', 1)
      assertXpath(output, '/table//row', 2)
      assertXpath(output, '(/table//row)[1]/entry', 2)
      assertXpath(output, '(/table//row)[2]/entry', 2)
      assertXpath(output, '((/table//row)[1]/entry)[2]/simpara', 2)
    })

    test('should convert qanda list in HTML with proper semantics', async () => {
      const input = `[qanda]
Question 1::
        Answer 1.
Question 2::
        Answer 2.
+
NOTE: A note about Answer 2.
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.qlist.qanda', 1)
      assertCss(output, '.qanda > ol', 1)
      assertCss(output, '.qanda > ol > li', 2)
      for (let idx = 1; idx <= 2; idx++) {
        assertCss(output, `.qanda > ol > li:nth-child(${idx}) > p`, 2)
        assertCss(output, `.qanda > ol > li:nth-child(${idx}) > p:first-child > em`, 1)
        assertXpath(output, `/*[@class = 'qlist qanda']/ol/li[${idx}]/p[1]/em[normalize-space(text()) = 'Question ${idx}']`, 1)
        assertCss(output, `.qanda > ol > li:nth-child(${idx}) > p:last-child > *`, 0)
        assertXpath(output, `/*[@class = 'qlist qanda']/ol/li[${idx}]/p[2][normalize-space(text()) = 'Answer ${idx}.']`, 1)
      }
      assertXpath(output, '/*[@class = "qlist qanda"]/ol/li[2]/p[2]/following-sibling::div[@class="admonitionblock note"]', 1)
    })

    test('should convert qanda list in DocBook with proper semantics', async () => {
      const input = `[qanda]
Question 1::
        Answer 1.
Question 2::
        Answer 2.
+
NOTE: A note about Answer 2.
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertCss(output, 'qandaset', 1)
      assertCss(output, 'qandaset > qandaentry', 2)
      for (let idx = 1; idx <= 2; idx++) {
        assertCss(output, `qandaset > qandaentry:nth-child(${idx}) > question`, 1)
        assertCss(output, `qandaset > qandaentry:nth-child(${idx}) > question > simpara`, 1)
        assertXpath(output, `/qandaset/qandaentry[${idx}]/question/simpara[normalize-space(text()) = 'Question ${idx}']`, 1)
        assertCss(output, `qandaset > qandaentry:nth-child(${idx}) > answer`, 1)
        assertCss(output, `qandaset > qandaentry:nth-child(${idx}) > answer > simpara`, 1)
        assertXpath(output, `/qandaset/qandaentry[${idx}]/answer/simpara[normalize-space(text()) = 'Answer ${idx}.']`, 1)
      }
      assertXpath(output, '/qandaset/qandaentry[2]/answer/simpara/following-sibling::note', 1)
    })

    test('consecutive questions should share same question element in docbook', async () => {
      const input = `[qanda]
question::
follow-up question::
response

last question::
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//qandaentry', 2)
      assertXpath(output, '(//qandaentry)[1]/question', 1)
      assertXpath(output, '(//qandaentry)[1]/question/simpara', 2)
      assertXpath(output, '(//qandaentry)[2]/question', 1)
      assertXpath(output, '(//qandaentry)[2]/answer', 1)
      assertXpath(output, '(//qandaentry)[2]/answer[normalize-space(text())=""]', 1)
    })

    test('should convert bibliography list with proper semantics', async () => {
      const input = `[bibliography]
- [[[taoup]]] Eric Steven Raymond. _The Art of Unix
  Programming_. Addison-Wesley. ISBN 0-13-142901-9.
- [[[walsh-muellner]]] Norman Walsh & Leonard Muellner.
  _DocBook - The Definitive Guide_. O'Reilly & Associates. 1999.
  ISBN 1-56592-580-7.
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.ulist.bibliography', 1)
      assertCss(output, '.ulist.bibliography ul', 1)
      assertCss(output, '.ulist.bibliography ul li', 2)
      assertCss(output, '.ulist.bibliography ul li p', 2)
      assertCss(output, '.ulist.bibliography ul li:nth-child(1) p a#taoup', 1)
      assertXpath(output, '//a/*', 0)
      assertXpath(output, '(//a)[1][starts-with(following-sibling::text(), "[taoup] ")]', 1)
    })

    test('should convert bibliography list with proper semantics to DocBook', async () => {
      const input = `[bibliography]
- [[[taoup]]] Eric Steven Raymond. _The Art of Unix
  Programming_. Addison-Wesley. ISBN 0-13-142901-9.
- [[[walsh-muellner]]] Norman Walsh & Leonard Muellner.
  _DocBook - The Definitive Guide_. O'Reilly & Associates. 1999.
  ISBN 1-56592-580-7.
`
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertCss(output, 'bibliodiv', 1)
      assertCss(output, 'bibliodiv > bibliomixed', 2)
      assertCss(output, 'bibliodiv > bibliomixed > bibliomisc', 2)
      assertCss(output, 'bibliodiv > bibliomixed:nth-child(1) > bibliomisc > anchor', 1)
      assertCss(output, 'bibliodiv > bibliomixed:nth-child(1) > bibliomisc > anchor[xreflabel="[taoup]"]', 1)
      assertXpath(output, '(//bibliomixed)[1]/bibliomisc/anchor[starts-with(following-sibling::text(), "[taoup] Eric")]', 1)
      assertCss(output, 'bibliodiv > bibliomixed:nth-child(2) > bibliomisc > anchor', 1)
      assertCss(output, 'bibliodiv > bibliomixed:nth-child(2) > bibliomisc > anchor[xreflabel="[walsh-muellner]"]', 1)
      assertXpath(output, '(//bibliomixed)[2]/bibliomisc/anchor[starts-with(following-sibling::text(), "[walsh-muellner] Norman")]', 1)
    })

    test('should warn if a bibliography ID is already in use', async () => {
      const input = `[bibliography]
* [[[Fowler]]] Fowler M. _Analysis Patterns: Reusable Object Models_.
Addison-Wesley. 1997.
* [[[Fowler]]] Fowler M. _Analysis Patterns: Reusable Object Models_.
Addison-Wesley. 1997.
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.ulist.bibliography', 1)
      assertCss(output, '.ulist.bibliography ul li:nth-child(1) p a#Fowler', 1)
      assertCss(output, '.ulist.bibliography ul li:nth-child(2) p a#Fowler', 1)
      assertMessage(logger, 'WARN', 'id assigned to bibliography anchor already in use: Fowler')
    })

    test('should automatically add bibliography style to top-level lists in bibliography section', async () => {
      const input = `[bibliography]
== Bibliography

.Books
* [[[taoup]]] Eric Steven Raymond. _The Art of Unix
  Programming_. Addison-Wesley. ISBN 0-13-142901-9.
* [[[walsh-muellner]]] Norman Walsh & Leonard Muellner.
  _DocBook - The Definitive Guide_. O'Reilly & Associates. 1999.
  ISBN 1-56592-580-7.

.Periodicals
* [[[doc-writer]]] Doc Writer. _Documentation As Code_. Static Times, 54. August 2016.
`
      const doc = await documentFromString(input)
      const ulists = doc.findBy({ context: 'ulist' })
      assert.equal(ulists.length, 2)
      assert.equal(ulists[0].style, 'bibliography')
      assert.equal(ulists[1].style, 'bibliography')
    })

    test('should not recognize bibliography anchor that begins with a digit', async () => {
      const input = `[bibliography]
- [[[1984]]] George Orwell. _1984_. New American Library. 1950.
`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('[[[1984]]]'), 'output should include [[[1984]]]')
      assertXpath(output, '//a[@id="1984"]', 0)
    })

    test('should recognize bibliography anchor that contains a digit but does not start with one', async () => {
      const input = `[bibliography]
- [[[_1984]]] George Orwell. __1984__. New American Library. 1950.
`
      const output = await convertStringToEmbedded(input)
      assert.ok(!output.includes('[[[_1984]]]'), 'output should not include [[[_1984]]]')
      assert.ok(output.includes('[_1984]'), 'output should include [_1984]')
      assertXpath(output, '//a[@id="_1984"]', 1)
    })

    test('should catalog bibliography anchors in bibliography list', async () => {
      const input = `= Article Title

Please read <<Fowler_1997>>.

[bibliography]
== References

* [[[Fowler_1997]]] Fowler M. _Analysis Patterns: Reusable Object Models_. Addison-Wesley. 1997.
`
      const doc = await documentFromString(input)
      assert.ok(doc.catalog.refs['Fowler_1997'] != null, 'refs should contain Fowler_1997')
    })

    test('should use reftext from bibliography anchor at xref and entry', async () => {
      const input = `= Article Title

Begin with <<TMMM>>.
Then move on to <<Fowler_1997>>.

[bibliography]
== References

* [[[TMMM]]] Brooks F. _The Mythical Man-Month_. Addison-Wesley. 1975.
* [[[Fowler_1997,1]]] Fowler M. _Analysis Patterns: Reusable Object Models_. Addison-Wesley. 1997.
`
      const doc = await documentFromString(input)
      const tmmm_ref = doc.catalog.refs['TMMM']
      assert.ok(tmmm_ref != null, 'TMMM ref should exist')
      assert.equal(tmmm_ref.reftext, null)
      const fowler_1997_ref = doc.catalog.refs['Fowler_1997']
      assert.ok(fowler_1997_ref != null, 'Fowler_1997 ref should exist')
      assert.equal(fowler_1997_ref.reftext, '[1]')
      const result = await doc.convert()
      assertXpath(result, '//a[@href="#Fowler_1997"]', 1)
      assertXpath(result, '//a[@href="#Fowler_1997"][text()="[1]"]', 1)
      assertXpath(result, '//a[@id="Fowler_1997"]', 1)
      assertXpath(result, '(//a[@id="Fowler_1997"])[1][starts-with(following-sibling::text(), "[1] ")]', 1)
      assertXpath(result, '//a[@href="#TMMM"]', 1)
      assertXpath(result, '//a[@href="#TMMM"][text()="[TMMM]"]', 1)
      assertXpath(result, '//a[@id="TMMM"]', 1)
      assertXpath(result, '(//a[@id="TMMM"])[1][starts-with(following-sibling::text(), "[TMMM] ")]', 1)
    })

    test('should assign reftext of bibliography anchor to xreflabel in DocBook backend', async () => {
      const input = `[bibliography]
* [[[Fowler_1997,1]]] Fowler M. _Analysis Patterns: Reusable Object Models_. Addison-Wesley. 1997.
`
      const result = await convertStringToEmbedded(input, { backend: 'docbook' })
      assert.ok(result.includes('<anchor xml:id="Fowler_1997" xreflabel="[1]"/>[1] Fowler'), 'result should include expected anchor')
    })
  })
})

// ── Description lists redux ───────────────────────────────────────────────────

describe('Description lists redux', () => {
  describe('Label without text on same line', () => {
    test('folds text from subsequent line', async () => {
      const input = `== Lists

term1::
def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
    })

    test('folds text from first line after blank lines', async () => {
      const input = `== Lists

term1::


def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
    })

    test('folds text from first line after blank line and immediately preceding next item', async () => {
      const input = `== Lists

term1::

def1
term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 2)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p[text()="def1"]', 1)
    })

    test('paragraph offset by blank lines does not break list if label does not have inline text', async () => {
      const input = `== Lists

term1::

def1

term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'dl', 1)
      assertCss(output, 'dl > dt', 2)
      assertCss(output, 'dl > dd', 2)
      assertXpath(output, '(//dl/dd)[1]/p[text()="def1"]', 1)
    })

    test('folds text from first line after comment line', async () => {
      const input = `== Lists

term1::
// comment
def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
    })

    test('folds text from line following comment line offset by blank line', async () => {
      const input = `== Lists

term1::

// comment
def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
    })

    test('folds text from subsequent indented line', async () => {
      const input = `== Lists

term1::
  def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
    })

    test('folds text from indented line after blank line', async () => {
      const input = `== Lists

term1::

  def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
    })

    test("folds text that looks like ruler offset by blank line", async () => {
      const input = `== Lists

term1::

'''
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[text()="'''"]`, 1)
    })

    test("folds text that looks like ruler offset by blank line and line comment", async () => {
      const input = `== Lists

term1::

// comment
'''
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[text()="'''"]`, 1)
    })

    test("folds text that looks like ruler and the line following it offset by blank line", async () => {
      const input = `== Lists

term1::

'''
continued
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[normalize-space(text())="''' continued"]`, 1)
    })

    test('folds text that looks like title offset by blank line', async () => {
      const input = `== Lists

term1::

.def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()=".def1"]', 1)
    })

    test('folds text that looks like title offset by blank line and line comment', async () => {
      const input = `== Lists

term1::

// comment
.def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()=".def1"]', 1)
    })

    test('folds text that looks like admonition offset by blank line', async () => {
      const input = `== Lists

term1::

NOTE: def1
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="NOTE: def1"]', 1)
    })

    test('folds text that looks like section title offset by blank line', async () => {
      const input = `== Lists

term1::

== Another Section
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="== Another Section"]', 1)
      assertXpath(output, '//h2', 1)
    })

    test('folds text of first literal line offset by blank line appends subsequent literals offset by blank line as blocks', async () => {
      const input = `== Lists

term1::

  def1

  literal


  literal
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]', 2)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 2)
    })

    test('folds text of subsequent line and appends following literal line offset by blank line as block if term has no inline description', async () => {
      const input = `== Lists

term1::
def1

  literal

term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 2)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p[text()="def1"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 1)
    })

    test('appends literal line attached by continuation as block if item has no inline description', async () => {
      const input = `== Lists

term1::
+
  literal
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]//pre[text()="literal"]', 1)
    })

    test('appends literal line attached by continuation as block if item has no inline description followed by ruler', async () => {
      const input = `== Lists

term1::
+
  literal

'''
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]//pre[text()="literal"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::hr', 1)
    })

    test('appends line attached by continuation as block if item has no inline description followed by ruler', async () => {
      const input = `== Lists

term1::
+
para

'''
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/p[text()="para"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::hr', 1)
    })

    test('appends line attached by continuation as block if item has no inline description followed by block', async () => {
      const input = `== Lists

term1::
+
para

....
literal
....
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/p[text()="para"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 1)
    })

    test('appends block attached by continuation but not subsequent block not attached by continuation', async () => {
      const input = `== Lists

term1::
+
....
literal
....
....
detached
....
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]//pre[text()="literal"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="literalblock"]//pre[text()="detached"]', 1)
    })

    test('appends list if item has no inline description', async () => {
      const input = `== Lists

term1::

* one
* two
* three
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd//ul/li', 3)
    })

    test('appends list to first term when followed immediately by second term', async () => {
      const input = `== Lists

term1::

* one
* two
* three
term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 2)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p', 0)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]//ul/li', 3)
      assertXpath(output, '(//*[@class="dlist"]//dd)[2]/p[text()="def2"]', 1)
    })

    test('appends indented list to first term that is adjacent to second term', async () => {
      const input = `== Lists

label 1::
  description 1

  * one
  * two
  * three
label 2::
  description 2

paragraph
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist > dl', 1)
      assertCss(output, '.dlist dt', 2)
      assertXpath(output, '(//*[@class="dlist"]//dt)[1][normalize-space(text())="label 1"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dt)[2][normalize-space(text())="label 2"]', 1)
      assertCss(output, '.dlist dd', 2)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p[text()="description 1"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[2]/p[text()="description 2"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p/following-sibling::*[@class="ulist"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p/following-sibling::*[@class="ulist"]//li', 3)
      assertCss(output, '.dlist + .paragraph', 1)
    })

    test('appends indented list to first term that is attached by a continuation and adjacent to second term', async () => {
      const input = `== Lists

label 1::
  description 1
+
  * one
  * two
  * three
label 2::
  description 2

paragraph
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist > dl', 1)
      assertCss(output, '.dlist dt', 2)
      assertXpath(output, '(//*[@class="dlist"]//dt)[1][normalize-space(text())="label 1"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dt)[2][normalize-space(text())="label 2"]', 1)
      assertCss(output, '.dlist dd', 2)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p[text()="description 1"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[2]/p[text()="description 2"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p/following-sibling::*[@class="ulist"]', 1)
      assertXpath(output, '(//*[@class="dlist"]//dd)[1]/p/following-sibling::*[@class="ulist"]//li', 3)
      assertCss(output, '.dlist + .paragraph', 1)
    })

    test('appends list and paragraph block when line following list attached by continuation', async () => {
      const input = `== Lists

term1::

* one
* two
* three

+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/ul/li', 3)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('first continued line associated with nested list item and second continued line associated with term', async () => {
      const input = `== Lists

term1::
* one
+
nested list para

+
term1 para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/ul/li', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/ul/li/*[@class="paragraph"]/p[text()="nested list para"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="ulist"]/following-sibling::*[@class="paragraph"]/p[text()="term1 para"]', 1)
    })

    test('literal line attached by continuation swallows adjacent line that looks like term', async () => {
      const input = `== Lists

term1::
+
  literal
notnestedterm:::
+
  literal
notnestedterm:::
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]', 2)
      assertXpath(output, `//*[@class="dlist"]//dd/*[@class="literalblock"]//pre[text()="  literal\nnotnestedterm:::"]`, 2)
    })

    test('line attached by continuation is appended as paragraph if term has no inline description', async () => {
      const input = `== Lists

term1::
+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('attached paragraph does not break on adjacent nested description list term', async () => {
      const input = `term1:: def
+
more description
not a term::: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist > dl > dt', 1)
      assertCss(output, '.dlist > dl > dd', 1)
      assertCss(output, '.dlist > dl > dd > .paragraph', 1)
      assert.ok(output.includes('not a term::: def'), 'output should include "not a term::: def"')
    })

    test('attached paragraph is terminated by adjacent sibling description list term', async () => {
      const input = `term1:: def
+
more description
not a term:: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist > dl > dt', 2)
      assertCss(output, '.dlist > dl > dd', 2)
      assertCss(output, '.dlist > dl > dd > .paragraph', 1)
      assert.ok(!output.includes('not a term:: def'), 'output should not include "not a term:: def"')
    })

    test('attached styled paragraph does not break on adjacent nested description list term', async () => {
      const input = `term1:: def
+
[quote]
more description
not a term::: def
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.dlist > dl > dt', 1)
      assertCss(output, '.dlist > dl > dd', 1)
      assertCss(output, '.dlist > dl > dd > .quoteblock', 1)
      assert.ok(output.includes('not a term::: def'), 'output should include "not a term::: def"')
    })

    test('appends line as paragraph if attached by continuation following blank line and line comment when term has no inline description', async () => {
      const input = `== Lists

term1::

// comment
+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('line attached by continuation offset by blank line is appended as paragraph if term has no inline description', async () => {
      const input = `== Lists

term1::

+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p', 0)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('delimited block breaks list even when term has no inline description', async () => {
      const input = `== Lists

term1::
====
detached
====
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 0)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="exampleblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="exampleblock"]//p[text()="detached"]', 1)
    })

    test('block attribute line above delimited block that breaks a dlist is not duplicated', async () => {
      const input = `== Lists

term:: desc
[.rolename]
----
detached
----
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="listingblock rolename"]', 1)
    })

    test('block attribute line above paragraph breaks list even when term has no inline description', async () => {
      const input = `== Lists

term1::
[verse]
detached
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 0)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="verseblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="verseblock"]/pre[text()="detached"]', 1)
    })

    test('block attribute line above paragraph that breaks a dlist is not duplicated', async () => {
      const input = `== Lists

term:: desc
[.rolename]
detached
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph rolename"]', 1)
    })

    test('block anchor line breaks list even when term has no inline description', async () => {
      const input = `== Lists

term1::
[[id]]
detached
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 0)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]/p[text()="detached"]', 1)
    })

    test('block attribute lines above nested horizontal list does not break list', async () => {
      const input = `Operating Systems::
[horizontal]
  Linux::: Fedora
  BSD::: OpenBSD

Cloud Providers::
  PaaS::: OpenShift
  IaaS::: AWS
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '/*[@class="dlist"]/dl', 1)
      assertXpath(output, '(//dl)[1]/dd', 2)
      assertXpath(output, '((//dl)[1]/dd)[1]//table', 1)
      assertXpath(output, '((//dl)[1]/dd)[2]//table', 0)
    })

    test('block attribute lines above nested list with style does not break list', async () => {
      const input = `TODO List::
* get groceries
Grocery List::
[square]
* bread
* milk
* lettuce
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 1)
      assertXpath(output, '(//dl)[1]/dd', 2)
      assertXpath(output, '((//dl)[1]/dd)[2]//ul[@class="square"]', 1)
    })

    test('multiple block attribute lines above nested list does not break list', async () => {
      const input = `Operating Systems::
[[variants]]
[horizontal]
  Linux::: Fedora
  BSD::: OpenBSD

Cloud Providers::
  PaaS::: OpenShift
  IaaS::: AWS
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '/*[@class="dlist"]/dl', 1)
      assertXpath(output, '(//dl)[1]/dd', 2)
      assertXpath(output, '(//dl)[1]/dd/*[@id="variants"]', 1)
      assertXpath(output, '((//dl)[1]/dd)[1]//table', 1)
      assertXpath(output, '((//dl)[1]/dd)[2]//table', 0)
    })

    test('multiple block attribute lines separated by empty line above nested list does not break list', async () => {
      const input = `Operating Systems::
[[variants]]

[horizontal]

  Linux::: Fedora
  BSD::: OpenBSD

Cloud Providers::
  PaaS::: OpenShift
  IaaS::: AWS
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//dl', 2)
      assertXpath(output, '/*[@class="dlist"]/dl', 1)
      assertXpath(output, '(//dl)[1]/dd', 2)
      assertXpath(output, '(//dl)[1]/dd/*[@id="variants"]', 1)
      assertXpath(output, '((//dl)[1]/dd)[1]//table', 1)
      assertXpath(output, '((//dl)[1]/dd)[2]//table', 0)
    })
  })

  describe('Item with text inline', () => {
    test('folds text from inline description and subsequent line', async () => {
      const input = `== Lists

term1:: def1
continued
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[text()="def1\ncontinued"]`, 1)
    })

    test('folds text from inline description and subsequent lines', async () => {
      const input = `== Lists

term1:: def1
continued
continued
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[text()="def1\ncontinued\ncontinued"]`, 1)
    })

    test('folds text from inline description and line following comment line', async () => {
      const input = `== Lists

term1:: def1
// comment
continued
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[text()="def1\ncontinued"]`, 1)
    })

    test('folds text from inline description and subsequent indented line', async () => {
      const input = `== List

term1:: def1
  continued
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, `//*[@class="dlist"]//dd/p[text()="def1\ncontinued"]`, 1)
    })

    test('appends literal line offset by blank line as block if item has inline description', async () => {
      const input = `== Lists

term1:: def1

  literal
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 1)
    })

    test('appends literal line offset by blank line as block and appends line after continuation as block if item has inline description', async () => {
      const input = `== Lists

term1:: def1

  literal
+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="literalblock"]/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('appends line after continuation as block and literal line offset by blank line as block if item has inline description', async () => {
      const input = `== Lists

term1:: def1
+
para

  literal
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/*[@class="paragraph"]/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 1)
    })

    test('appends list if item has inline description', async () => {
      const input = `== Lists

term1:: def1

* one
* two
* three
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="ulist"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="ulist"]/ul/li', 3)
    })

    test('appends literal line attached by continuation as block if item has inline description followed by ruler', async () => {
      const input = `== Lists

term1:: def1
+
  literal

'''
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="literalblock"]//pre[text()="literal"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::hr', 1)
    })

    test('line offset by blank line breaks list if term has inline description', async () => {
      const input = `== Lists

term1:: def1

detached
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]/p[text()="detached"]', 1)
    })

    test('nested term with description does not consume following heading', async () => {
      const input = `== Lists

term::
  def
  nestedterm;;
    nesteddef

Detached
~~~~~~~~
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 2)
      assertXpath(output, '//*[@class="dlist"]//dd', 2)
      assertXpath(output, '//*[@class="dlist"]/dl//dl', 1)
      assertXpath(output, '//*[@class="dlist"]/dl//dl/dt', 1)
      assertXpath(output, '((//*[@class="dlist"])[1]//dd)[1]/p[text()="def"]', 1)
      assertXpath(output, '((//*[@class="dlist"])[1]//dd)[1]/p/following-sibling::*[@class="dlist"]', 1)
      assertXpath(output, '((//*[@class="dlist"])[1]//dd)[1]/p/following-sibling::*[@class="dlist"]//dd/p[text()="nesteddef"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="sect2"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="sect2"]/h3[text()="Detached"]', 1)
    })

    test('line attached by continuation is appended as paragraph if term has inline description followed by detached paragraph', async () => {
      const input = `== Lists

term1:: def1
+
para

detached
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="paragraph"]/p[text()="detached"]', 1)
    })

    test('line attached by continuation is appended as paragraph if term has inline description followed by detached block', async () => {
      const input = `== Lists

term1:: def1
+
para

****
detached
****
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="sidebarblock"]', 1)
      assertXpath(output, '//*[@class="dlist"]/following-sibling::*[@class="sidebarblock"]//p[text()="detached"]', 1)
    })

    test('line attached by continuation offset by line comment is appended as paragraph if term has inline description', async () => {
      const input = `== Lists

term1:: def1
// comment
+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('line attached by continuation offset by blank line is appended as paragraph if term has inline description', async () => {
      const input = `== Lists

term1:: def1

+
para
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 1)
      assertXpath(output, '//*[@class="dlist"]//dd', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p[text()="def1"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="dlist"]//dd/p/following-sibling::*[@class="paragraph"]/p[text()="para"]', 1)
    })

    test('line comment offset by blank line divides lists because item has text', async () => {
      const input = `== Lists

term1:: def1

//

term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 2)
    })

    test('ruler offset by blank line divides lists because item has text', async () => {
      const input = `== Lists

term1:: def1

'''

term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 2)
    })

    test('block title offset by blank line divides lists and becomes title of second list because item has text', async () => {
      const input = `== Lists

term1:: def1

.title

term2:: def2
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//*[@class="dlist"]/dl', 2)
      assertXpath(output, '(//*[@class="dlist"])[2]/*[@class="title"][text()="title"]', 1)
    })
  })
})

// ── Callout lists ─────────────────────────────────────────────────────────────

describe('Callout lists', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  test('does not recognize callout list denoted by markers that only have a trailing bracket', async () => {
    const input = `----
require 'asciidoctor' # <1>
----
1> Not a callout list item
`
    const output = await convertStringToEmbedded(input)
    assertCss(output, '.colist', 0)
  })

  test('should not hang if obsolete callout list is found inside list item', async () => {
    const input = `* foo
1> bar
`
    const output = await convertStringToEmbedded(input)
    assertCss(output, '.colist', 0)
  })

  test('should not hang if obsolete callout list is found inside dlist item', async () => {
    const input = `foo::
1> bar
`
    const output = await convertStringToEmbedded(input)
    assertCss(output, '.colist', 0)
  })

  test('should recognize auto-numbered callout list inside list', async () => {
    const input = `----
require 'asciidoctor' # <1>
----
* foo
<.> bar
`
    const output = await convertStringToEmbedded(input)
    assertCss(output, '.colist', 1)
  })

  test('listing block with sequential callouts followed by adjacent callout list', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <3>
----
<1> Describe the first line
<2> Describe the second line
<3> Describe the third line
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//programlisting', 1)
    assertXpath(output, '//programlisting//co', 3)
    assertXpath(output, '(//programlisting//co)[1][@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//programlisting//co)[2][@xml:id="CO1-2"]', 1)
    assertXpath(output, '(//programlisting//co)[3][@xml:id="CO1-3"]', 1)
    assertXpath(output, '//programlisting/following-sibling::calloutlist/callout', 3)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[1][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[2][@arearefs = "CO1-2"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[3][@arearefs = "CO1-3"]', 1)
  })

  test('listing block with sequential callouts followed by non-adjacent callout list', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <3>
----

Paragraph.

<1> Describe the first line
<2> Describe the second line
<3> Describe the third line
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//programlisting', 1)
    assertXpath(output, '//programlisting//co', 3)
    assertXpath(output, '(//programlisting//co)[1][@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//programlisting//co)[2][@xml:id="CO1-2"]', 1)
    assertXpath(output, '(//programlisting//co)[3][@xml:id="CO1-3"]', 1)
    assertXpath(output, '//programlisting/following-sibling::*[1][self::simpara]', 1)
    assertXpath(output, '//programlisting/following-sibling::calloutlist/callout', 3)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[1][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[2][@arearefs = "CO1-2"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[3][@arearefs = "CO1-3"]', 1)
  })

  test('listing block with a callout that refers to two different lines', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <2>
----
<1> Import the library
<2> Where the magic happens
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//programlisting', 1)
    assertXpath(output, '//programlisting//co', 3)
    assertXpath(output, '(//programlisting//co)[1][@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//programlisting//co)[2][@xml:id="CO1-2"]', 1)
    assertXpath(output, '(//programlisting//co)[3][@xml:id="CO1-3"]', 1)
    assertXpath(output, '//programlisting/following-sibling::calloutlist/callout', 2)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[1][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[2][@arearefs = "CO1-2 CO1-3"]', 1)
  })

  test('source block with non-sequential callouts followed by adjacent callout list', async () => {
    const input = `[source,ruby]
----
require 'asciidoctor' # <2>
doc = Asciidoctor::Document.new('Hello, World!') # <3>
puts doc.convert # <1>
----
<1> Describe the first line
<2> Describe the second line
<3> Describe the third line
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//programlisting', 1)
    assertXpath(output, '//programlisting//co', 3)
    assertXpath(output, '(//programlisting//co)[1][@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//programlisting//co)[2][@xml:id="CO1-2"]', 1)
    assertXpath(output, '(//programlisting//co)[3][@xml:id="CO1-3"]', 1)
    assertXpath(output, '//programlisting/following-sibling::calloutlist/callout', 3)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[1][@arearefs = "CO1-3"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[2][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//programlisting/following-sibling::calloutlist/callout)[3][@arearefs = "CO1-2"]', 1)
  })

  test('two listing blocks can share the same callout list', async () => {
    const input = `.Import library
[source, ruby]
----
require 'asciidoctor' # <1>
----

.Use library
[source, ruby]
----
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <3>
----

<1> Describe the first line
<2> Describe the second line
<3> Describe the third line
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//programlisting', 2)
    assertXpath(output, '(//programlisting)[1]//co', 1)
    assertXpath(output, '(//programlisting)[1]//co[@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//programlisting)[2]//co', 2)
    assertXpath(output, '((//programlisting)[2]//co)[1][@xml:id="CO1-2"]', 1)
    assertXpath(output, '((//programlisting)[2]//co)[2][@xml:id="CO1-3"]', 1)
    assertXpath(output, '(//calloutlist/callout)[1][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//calloutlist/callout)[2][@arearefs = "CO1-2"]', 1)
    assertXpath(output, '(//calloutlist/callout)[3][@arearefs = "CO1-3"]', 1)
  })

  test('two listing blocks each followed by an adjacent callout list', async () => {
    const input = `.Import library
[source, ruby]
----
require 'asciidoctor' # <1>
----
<1> Describe the first line

.Use library
[source, ruby]
----
doc = Asciidoctor::Document.new('Hello, World!') # <1>
puts doc.convert # <2>
----
<1> Describe the second line
<2> Describe the third line
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//programlisting', 2)
    assertXpath(output, '(//programlisting)[1]//co', 1)
    assertXpath(output, '(//programlisting)[1]//co[@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//programlisting)[2]//co', 2)
    assertXpath(output, '((//programlisting)[2]//co)[1][@xml:id="CO2-1"]', 1)
    assertXpath(output, '((//programlisting)[2]//co)[2][@xml:id="CO2-2"]', 1)
    assertXpath(output, '//calloutlist', 2)
    assertXpath(output, '(//calloutlist)[1]/callout', 1)
    assertXpath(output, '((//calloutlist)[1]/callout)[1][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//calloutlist)[2]/callout', 2)
    assertXpath(output, '((//calloutlist)[2]/callout)[1][@arearefs = "CO2-1"]', 1)
    assertXpath(output, '((//calloutlist)[2]/callout)[2][@arearefs = "CO2-2"]', 1)
  })

  test('callout list retains block content', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <3>
----
<1> Imports the library
as a RubyGem
<2> Creates a new document
* Scans the lines for known blocks
* Converts the lines into blocks
<3> Renders the document
+
You can write this to file rather than printing to stdout.
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//ol/li', 3)
    assertXpath(output, `(//ol/li)[1]/p[text()="Imports the library\nas a RubyGem"]`, 1)
    assertXpath(output, `(//ol/li)[2]//ul`, 1)
    assertXpath(output, `(//ol/li)[2]//ul/li`, 2)
    assertXpath(output, `(//ol/li)[3]//p`, 2)
  })

  test('callout list retains block content when converted to DocBook', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <3>
----
<1> Imports the library
as a RubyGem
<2> Creates a new document
* Scans the lines for known blocks
* Converts the lines into blocks
<3> Renders the document
+
You can write this to file rather than printing to stdout.
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//calloutlist', 1)
    assertXpath(output, '//calloutlist/callout', 3)
    assertXpath(output, '(//calloutlist/callout)[1]/*', 1)
    assertXpath(output, '(//calloutlist/callout)[2]/para', 1)
    assertXpath(output, '(//calloutlist/callout)[2]/itemizedlist', 1)
    assertXpath(output, '(//calloutlist/callout)[3]/para', 1)
    assertXpath(output, '(//calloutlist/callout)[3]/simpara', 1)
  })

  test('escaped callout should not be interpreted as a callout', async () => {
    const input = `[source,text]
----
require 'asciidoctor' # \\<1>
Asciidoctor.convert 'convert me!' \\<2>
----
`
    for (const attributes of [{}, { 'source-highlighter': 'coderay' }]) {
      const output = await convertStringToEmbedded(input, { attributes })
      assertCss(output, 'pre b', 0)
      assert.ok(output.includes(' # &lt;1&gt;'), 'output should include escaped callout 1')
      assert.ok(output.includes(' &lt;2&gt;'), 'output should include escaped callout 2')
    }
  })

  test('should autonumber <.> callouts', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <.>
doc = Asciidoctor::Document.new('Hello, World!') # <.>
puts doc.convert # <.>
----
<.> Describe the first line
<.> Describe the second line
<.> Describe the third line
`
    const output = await convertStringToEmbedded(input)
    assert.ok(output.includes('(1)'), 'output should include (1)')
    assert.ok(output.includes('(2)'), 'output should include (2)')
    assert.ok(output.includes('(3)'), 'output should include (3)')
    assertCss(output, '.colist ol', 1)
    assertCss(output, '.colist ol li', 3)
  })

  test('should not recognize callouts in middle of line', async () => {
    const input = `[source, ruby]
----
puts "The syntax <1> at the end of the line makes a code callout"
----
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//b', 0)
  })

  test('should allow multiple callouts on the same line', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' <1>
doc = Asciidoctor.load('Hello, World!') # <2> <3> <4>
puts doc.convert <5><6>
exit 0
----
<1> Require library
<2> Load document from String
<3> Uses default backend and doctype
<4> One more for good luck
<5> Renders document to String
<6> Prints output to stdout
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//code/b', 6)
    assert.ok(/ <b class="conum">\(1\)<\/b>/.test(output), 'output should match callout (1) pattern')
    assert.ok(/ <b class="conum">\(2\)<\/b> <b class="conum">\(3\)<\/b> <b class="conum">\(4\)<\/b>/.test(output), 'output should match callouts (2)(3)(4) pattern')
    assert.ok(/ <b class="conum">\(5\)<\/b><b class="conum">\(6\)<\/b>/.test(output), 'output should match callouts (5)(6) pattern')
  })

  test('should allow XML comment-style callouts', async () => {
    const input = `[source, xml]
----
<section>
  <title>Section Title</title> <!--1-->
  <simpara>Just a paragraph</simpara> <!--2-->
</section>
----
<1> The title is required
<2> The content isn't
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//b', 2)
    assertXpath(output, '//b[text()="(1)"]', 1)
    assertXpath(output, '//b[text()="(2)"]', 1)
  })

  test('should not allow callouts with half an XML comment', async () => {
    const input = `----
First line <1-->
Second line <2-->
----
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//b', 0)
  })

  test('should not recognize callouts in an indented description list paragraph', async () => {
    const input = `foo::
  bar <1>

<1> Not pointing to a callout
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//dl//b', 0)
    assertXpath(output, '//dl/dd/p[text()="bar <1>"]', 1)
    assertXpath(output, '//ol/li/p[text()="Not pointing to a callout"]', 1)
    assertMessage(logger, 'WARN', 'no callout found for <1>')
  })

  test('should not recognize callouts in an indented outline list paragraph', async () => {
    const input = `* foo
  bar <1>

<1> Not pointing to a callout
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//ul//b', 0)
    assertXpath(output, `//ul/li/p[text()="foo\nbar <1>"]`, 1)
    assertXpath(output, '//ol/li/p[text()="Not pointing to a callout"]', 1)
    assertMessage(logger, 'WARN', 'no callout found for <1>')
  })

  test('should warn if numbers in callout list are out of sequence', async () => {
    const input = `----
<beans> <1>
  <bean class="com.example.HelloWorld"/>
</beans>
----
<1> Container of beans.
Beans are fun.
<3> An actual bean.
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//ol/li', 2)
    assertMessage(logger, 'WARN', 'callout list item index: expected 2, got 3')
    assertMessage(logger, 'WARN', 'no callout found for <2>')
  })

  test('should preserve line comment chars that precede callout number if icons is not set', async () => {
    const input = `[source,ruby]
----
puts 'Hello, world!' # <1>
----
<1> Ruby

[source,groovy]
----
println 'Hello, world!' // <1>
----
<1> Groovy

[source,clojure]
----
(def hello (fn [] "Hello, world!")) ;; <1>
(hello)
----
<1> Clojure

[source,haskell]
----
main = putStrLn "Hello, World!" -- <1>
----
<1> Haskell
`
    for (const attributes of [{}, { 'source-highlighter': 'coderay' }]) {
      const output = await convertStringToEmbedded(input, { attributes })
      assertXpath(output, '//b', 4)
      assert.ok(output.includes('# <b class="conum">(1)</b>'), 'output should include ruby callout with guard')
      assert.ok(output.includes('// <b class="conum">(1)</b>'), 'output should include groovy callout with guard')
      assert.ok(output.includes(';; <b class="conum">(1)</b>'), 'output should include clojure callout with guard')
      assert.ok(output.includes('-- <b class="conum">(1)</b>'), 'output should include haskell callout with guard')
    }
  })

  test('should remove line comment chars that precede callout number if icons is font', async () => {
    const input = `[source,ruby]
----
puts 'Hello, world!' # <1>
----
<1> Ruby

[source,groovy]
----
println 'Hello, world!' // <1>
----
<1> Groovy

[source,clojure]
----
(def hello (fn [] "Hello, world!")) ;; <1>
(hello)
----
<1> Clojure

[source,haskell]
----
main = putStrLn "Hello, World!" -- <1>
----
<1> Haskell
`
    for (const attributes of [{}, { 'source-highlighter': 'coderay' }]) {
      const output = await convertStringToEmbedded(input, { attributes: { ...attributes, icons: 'font' } })
      assertXpath(output, '//code/b', 4)
      assertXpath(output, '//code/i[@class="conum"]', 4)
      assert.ok(!output.includes("puts 'Hello, world!' # "), 'ruby line comment guard should be removed')
      assert.ok(!output.includes("println 'Hello, world!' // "), 'groovy line comment guard should be removed')
      assert.ok(!output.includes('(def hello (fn [] "Hello, world!")) ;; '), 'clojure line comment guard should be removed')
      assert.ok(!output.includes('main = putStrLn "Hello, World!" -- '), 'haskell line comment guard should be removed')
    }
  })

  test('should allow line comment chars that precede callout number to be specified', async () => {
    const input = `[source,erlang,line-comment=%]
----
hello_world() -> % <1>
  io:fwrite("hello, world~n"). %<2>
----
<1> Erlang function clause head.
<2> ~n adds a new line to the output.
`
    const output = await convertStringToEmbedded(input)
    assertXpath(output, '//b', 2)
    assert.ok(output.includes('% <b class="conum">(1)</b>'), 'output should include erlang callout 1 with guard')
    assert.ok(output.includes('%<b class="conum">(2)</b>'), 'output should include erlang callout 2 with guard')
  })

  test('should allow line comment chars preceding callout number to be configurable when source-highlighter is coderay', async () => {
    const input = `[source,html,line-comment=-#]
----
-# <1>
%p Hello
----
<1> Prints a paragraph with the text "Hello"
`
    const output = await convertStringToEmbedded(input, { attributes: { 'source-highlighter': 'coderay' } })
    assertXpath(output, '//b', 1)
    assert.ok(output.includes('-# <b class="conum">(1)</b>'), 'output should include -# callout with guard')
    assert.ok(output.includes('%p Hello'), 'output should include %p Hello')
  })

  test('should not eat whitespace before callout number if line-comment attribute is empty', async () => {
    const input = `[source,asciidoc,line-comment=]
----
-- <1>
----
<1> The start of an open block.
`
    const output = await convertStringToEmbedded(input, { attributes: { icons: 'font' } })
    assert.ok(output.includes('-- <i class="conum"'), 'output should include -- before conum icon')
  })

  test('literal block with callouts', async () => {
    const input = `....
Roses are red <1>
Violets are blue <2>
....


<1> And so is Ruby
<2> But violet is more like purple
`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//literallayout', 1)
    assertXpath(output, '//literallayout//co', 2)
    assertXpath(output, '(//literallayout//co)[1][@xml:id="CO1-1"]', 1)
    assertXpath(output, '(//literallayout//co)[2][@xml:id="CO1-2"]', 1)
    assertXpath(output, '//literallayout/following-sibling::*[1][self::calloutlist]/callout', 2)
    assertXpath(output, '(//literallayout/following-sibling::*[1][self::calloutlist]/callout)[1][@arearefs = "CO1-1"]', 1)
    assertXpath(output, '(//literallayout/following-sibling::*[1][self::calloutlist]/callout)[2][@arearefs = "CO1-2"]', 1)
  })

  test('callout list with icons enabled', async () => {
    const input = `[source, ruby]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') # <2>
puts doc.convert # <3>
----
<1> Describe the first line
<2> Describe the second line
<3> Describe the third line
`
    const output = await convertStringToEmbedded(input, { attributes: { icons: '' } })
    assertXpath(output, '//div[@class="listingblock"]//code/img', 3)
    for (let i = 1; i <= 3; i++) {
      assertXpath(output, `(/div[@class="listingblock"]//code/img)[${i}][@src="./images/icons/callouts/${i}.png"][@alt="${i}"]`, 1)
    }
    assertCss(output, '.colist table td img', 3)
    for (let i = 1; i <= 3; i++) {
      assertXpath(output, `(/div[@class="colist arabic"]//td/img)[${i}][@src="./images/icons/callouts/${i}.png"][@alt="${i}"]`, 1)
    }
  })

  test('callout list with font-based icons enabled', async () => {
    const input = `[source]
----
require 'asciidoctor' # <1>
doc = Asciidoctor::Document.new('Hello, World!') #<2>
puts doc.convert #<3>
----
<1> Describe the first line
<2> Describe the second line
<3> Describe the third line
`
    const output = await convertStringToEmbedded(input, { attributes: { icons: 'font' } })
    assertXpath(output, '//div[@class="listingblock"]//code/i', 3)
    for (let i = 1; i <= 3; i++) {
      assertXpath(output, `(/div[@class="listingblock"]//code/i)[${i}]`, 1)
      assertXpath(output, `(/div[@class="listingblock"]//code/i)[${i}][@class="conum"][@data-value="${i}"]`, 1)
      assertXpath(output, `(/div[@class="listingblock"]//code/i)[${i}]/following-sibling::b[text()="(${i})"]`, 1)
    }
    assertCss(output, '.colist table td i', 3)
    for (let i = 1; i <= 3; i++) {
      assertXpath(output, `(/div[@class="colist arabic"]//td/i)[${i}]`, 1)
      assertXpath(output, `(/div[@class="colist arabic"]//td/i)[${i}][@class="conum"][@data-value = "${i}"]`, 1)
      assertXpath(output, `(/div[@class="colist arabic"]//td/i)[${i}]/following-sibling::b[text() = "${i}"]`, 1)
    }
  })

  test('should match trailing line separator in text of list item', async () => {
    const ls = String.fromCodePoint(8232)
    const input = `----
A <1>
B <2>
C <3>
----
<1> a
<2> b${ls}
<3> c`
    const output = await convertString(input)
    assertCss(output, 'li', 3)
    assert.ok(output.includes(`<p>b${ls}</p>`), `expected <p>b${ls}</p> in output`)
  })

  test('should match line separator in text of list item', async () => {
    const ls = String.fromCodePoint(8232)
    const input = `----
A <1>
B <2>
C <3>
----
<1> a
<2> b${ls}b
<3> c`
    const output = await convertString(input)
    assertCss(output, 'li', 3)
    assert.ok(output.includes(`<p>b${ls}b</p>`), `expected <p>b${ls}b</p> in output`)
  })
})

// ── Checklists ────────────────────────────────────────────────────────────────

describe('Checklists', () => {
  test('should create checklist if at least one item has checkbox syntax', async () => {
    const check = String.fromCodePoint(10003)
    const cross = String.fromCodePoint(10063)
    const input = `- [ ] todo
- [x] done
- [ ] another todo
- [*] another done
- plain
`
    const doc = await documentFromString(input)
    const checklist = doc.blocks[0]
    assert.ok(checklist.hasOption('checklist'), 'checklist should have checklist option')
    assert.ok(checklist.items[0].hasAttribute('checkbox'), 'item 0 should have checkbox attr')
    assert.ok(!checklist.items[0].hasAttribute('checked'), 'item 0 should not have checked attr')
    assert.ok(checklist.items[1].hasAttribute('checkbox'), 'item 1 should have checkbox attr')
    assert.ok(checklist.items[1].hasAttribute('checked'), 'item 1 should have checked attr')
    assert.ok(!checklist.items[4].hasAttribute('checkbox'), 'item 4 should not have checkbox attr')

    const output = await doc.convert()
    assertCss(output, '.ulist.checklist', 1)
    assertXpath(output, `(/*[@class="ulist checklist"]/ul/li)[1]/p[text()="${cross} todo"]`, 1)
    assertXpath(output, `(/*[@class="ulist checklist"]/ul/li)[2]/p[text()="${check} done"]`, 1)
    assertXpath(output, `(/*[@class="ulist checklist"]/ul/li)[3]/p[text()="${cross} another todo"]`, 1)
    assertXpath(output, `(/*[@class="ulist checklist"]/ul/li)[4]/p[text()="${check} another done"]`, 1)
    assertXpath(output, '(/*[@class="ulist checklist"]/ul/li)[5]/p[text()="plain"]', 1)
  })

  test('entry is not a checklist item if the closing bracket is not immediately followed by the space character', async () => {
    const input = `- [ ]    todo
- [x] \t done
- [ ]\t  another todo
- [x]\t  another done
`
    const doc = await documentFromString(input)
    const checklist = doc.blocks[0]
    assert.ok(checklist.hasOption('checklist'), 'checklist should have checklist option')
    assert.ok(checklist.items[0].hasAttribute('checkbox'), 'item 0 should have checkbox attr')
    assert.ok(!checklist.items[0].hasAttribute('checked'), 'item 0 should not have checked attr')
    assert.ok(checklist.items[1].hasAttribute('checkbox'), 'item 1 should have checkbox attr')
    assert.ok(checklist.items[1].hasAttribute('checked'), 'item 1 should have checked attr')
    assert.ok(!checklist.items[2].hasAttribute('checkbox'), 'item 2 should not have checkbox attr')
    assert.ok(!checklist.items[3].hasAttribute('checkbox'), 'item 3 should not have checkbox attr')
  })

  test('should create checklist with font icons if at least one item has checkbox syntax and icons attribute is font', async () => {
    const input = `- [ ] todo
- [x] done
- plain
`
    const output = await convertStringToEmbedded(input, { attributes: { icons: 'font' } })
    assertCss(output, '.ulist.checklist', 1)
    assertCss(output, '.ulist.checklist li i.fa-check-square-o', 1)
    assertCss(output, '.ulist.checklist li i.fa-square-o', 1)
    assertXpath(output, '(/*[@class="ulist checklist"]/ul/li)[3]/p[text()="plain"]', 1)
  })

  test('should create interactive checklist if interactive option is set even with icons attribute is font', async () => {
    const input = `:icons: font

[%interactive]
- [ ] todo
- [x] done
`
    const doc = await documentFromString(input)
    const checklist = doc.blocks[0]
    assert.ok(checklist.hasOption('checklist'), 'checklist should have checklist option')
    assert.ok(checklist.hasOption('interactive'), 'checklist should have interactive option')

    const output = await doc.convert()
    assertCss(output, '.ulist.checklist', 1)
    assertCss(output, '.ulist.checklist li input[type="checkbox"]', 2)
    assertCss(output, '.ulist.checklist li input[type="checkbox"][disabled]', 0)
    assertCss(output, '.ulist.checklist li input[type="checkbox"][checked]', 1)
  })

  test('should not create checklist if checkbox on item is followed by a tab', async () => {
    for (const checkbox of ['[ ]', '[x]', '[*]']) {
      const input = `- ${checkbox}\ttodo\n`
      const doc = await documentFromString(input)
      const list = doc.blocks[0]
      assert.equal(list.context, 'ulist')
      assert.ok(!list.hasOption('checklist'), 'list should not have checklist option')
    }
  })
})

// ── Lists model ───────────────────────────────────────────────────────────────

describe('Lists model', () => {
  test('content should return items in list', async () => {
    const input = `* one
* two
* three
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    const items = list.items
    assert.equal(items.length, 3)
    assert.deepEqual(list.items, list.content)
  })

  test('list item should be the parent of block attached to a list item', async () => {
    const input = `* list item 1
+
----
listing block in list item 1
----
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    const list_item_1 = list.items[0]
    const listing_block = list_item_1.blocks[0]
    assert.equal(listing_block.context, 'listing')
    assert.equal(listing_block.parent, list_item_1)
  })

  test('outline? should return true for unordered list', async () => {
    const input = `* one
* two
* three
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    assert.ok(list.outline())
  })

  test('outline? should return true for ordered list', async () => {
    const input = `. one
. two
. three
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    assert.ok(list.outline())
  })

  test('outline? should return false for description list', async () => {
    const doc = await documentFromString('label:: desc')
    const list = doc.blocks[0]
    assert.ok(!list.outline())
  })

  test('simple? should return true for list item with no nested blocks', async () => {
    const input = `* one
* two
* three
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    assert.ok(list.items[0].simple())
    assert.ok(!list.items[0].compound())
  })

  test('simple? should return true for list item with nested outline list', async () => {
    const input = `* one
  ** more about one
  ** and more
* two
* three
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    assert.ok(list.items[0].simple())
    assert.ok(!list.items[0].compound())
  })

  test('simple? should return false for list item with block content', async () => {
    const input = `* one
+
----
listing block in list item 1
----
* two
* three
`
    const doc = await documentFromString(input)
    const list = doc.blocks[0]
    assert.ok(!list.items[0].simple())
    assert.ok(list.items[0].compound())
  })

  test('should allow text of ListItem to be assigned', async () => {
    const input = `* one
* two
* three
`
    const doc = await documentFromString(input)
    const list = doc.findBy({ context: 'ulist' })[0]
    assert.equal(list.items.length, 3)
    assert.equal(list.items[0].text, 'one')
    list.items[0].text = 'un'
    assert.equal(list.items[0].text, 'un')
  })

  test('id and role assigned to ulist item in model are transmitted to output', async () => {
    const input = `* one
* two
* three
`
    const doc = await documentFromString(input)
    const item_0 = doc.blocks[0].items[0]
    item_0.id = 'one'
    item_0.addRole('item')
    const output = await doc.convert()
    assertCss(output, 'li#one.item', 1)
  })

  test('id and role assigned to olist item in model are transmitted to output', async () => {
    const input = `. one
. two
. three
`
    const doc = await documentFromString(input)
    const item_0 = doc.blocks[0].items[0]
    item_0.id = 'one'
    item_0.addRole('item')
    const output = await doc.convert()
    assertCss(output, 'li#one.item', 1)
  })

  test('should allow API control over substitutions applied to ListItem text', async () => {
    const input = `* *one*
* _two_
* \`three\`
* #four#
`
    const doc = await documentFromString(input)
    const list = doc.findBy({ context: 'ulist' })[0]
    assert.equal(list.items.length, 4)
    list.items[0].removeSub('quotes')
    assert.equal(list.items[0].text, '*one*')
    assert.ok(!list.items[0].subs.includes('quotes'))
    list.items[1].subs.splice(0)
    assert.equal(list.items[1].subs.length, 0)
    assert.equal(list.items[1].text, '_two_')
    list.items[2].subs.splice(0, list.items[2].subs.length, 'specialcharacters')
    assert.deepEqual(list.items[2].subs, ['specialcharacters'])
    assert.equal(list.items[2].text, '`three`')
    assert.equal(list.items[3].text, '<mark>four</mark>')
  })

  test('should set lineno to line number in source where list starts', async () => {
    const input = `* bullet 1
** bullet 1.1
*** bullet 1.1.1
* bullet 2
`
    const doc = await documentFromString(input, { sourcemap: true })
    const lists = doc.findBy({ context: 'ulist' })
    assert.equal(lists[0].lineno, 1)
    assert.equal(lists[1].lineno, 2)
    assert.equal(lists[2].lineno, 3)

    const list_items = doc.findBy({ context: 'list_item' })
    assert.equal(list_items[0].lineno, 1)
    assert.equal(list_items[1].lineno, 2)
    assert.equal(list_items[2].lineno, 3)
    assert.equal(list_items[3].lineno, 4)
  })
})
