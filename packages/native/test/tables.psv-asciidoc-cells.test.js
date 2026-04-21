// ESM conversion of tables_test.rb — context 'Tables' > context 'PSV' (AsciiDoc cells)
// Covers: AsciiDoc cell content, nested documents, doctype, attributes, showtitle,
//         toc, anchors, footnotes, callouts, compat mode, nested tables, warnings

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

import { load } from '../src/load.js'
import { assertCss, assertXpath, assertMessage, countXpath, usingMemoryLogger } from './helpers.js'

const __dirname = import.meta.url.startsWith('http')
  ? new URL('.', import.meta.url).href.replace(/\/$/, '')
  : dirname(fileURLToPath(import.meta.url))

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertString = (input, opts = {}) => documentFromString(input, { standalone: true, ...opts }).then((doc) => doc.convert())
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())

// ── Tables › PSV › AsciiDoc Cells ────────────────────────────────────────────

describe('Tables', () => {
  describe('PSV', () => {
    test('basic AsciiDoc cell', async () => {
      const input = `|===
a|--
NOTE: content

content
--
|===`
      const result = await convertStringToEmbedded(input)
      assertCss(result, 'table.tableblock', 1)
      assertCss(result, 'table.tableblock td.tableblock', 1)
      assertCss(result, 'table.tableblock td.tableblock .openblock', 1)
      assertCss(result, 'table.tableblock td.tableblock .openblock .admonitionblock', 1)
      assertCss(result, 'table.tableblock td.tableblock .openblock .paragraph', 1)
    })

    test('AsciiDoc table cell should be wrapped in div with class "content"', async () => {
      const input = `|===
a|AsciiDoc table cell
|===`
      const result = await convertStringToEmbedded(input)
      assertCss(result, 'table.tableblock td.tableblock > div.content', 1)
      assertCss(result, 'table.tableblock td.tableblock > div.content > div.paragraph', 1)
    })

    test('doctype can be set in AsciiDoc table cell', async () => {
      const input = `|===
a|
:doctype: inline

content
|===`
      const result = await convertStringToEmbedded(input)
      assertCss(result, 'table.tableblock', 1)
      assertCss(result, 'table.tableblock .paragraph', 0)
    })

    test('should reset doctype to default in AsciiDoc table cell', async () => {
      const input = `= Book Title
:doctype: book

== Chapter 1

|===
a|
= AsciiDoc Table Cell

doctype={doctype}
{backend-html5-doctype-article}
{backend-html5-doctype-book}
|===`
      const result = await convertStringToEmbedded(input, { attributes: { 'attribute-missing': 'skip' } })
      assert.ok(result.includes('doctype=article'))
      assert.ok(!result.includes('{backend-html5-doctype-article}'))
      assert.ok(result.includes('{backend-html5-doctype-book}'))
    })

    test('should update doctype-related attributes in AsciiDoc table cell when doctype is set', async () => {
      const input = `= Document Title
:doctype: article

== Chapter 1

|===
a|
= AsciiDoc Table Cell
:doctype: book

doctype={doctype}
{backend-html5-doctype-book}
{backend-html5-doctype-article}
|===`
      const result = await convertStringToEmbedded(input, { attributes: { 'attribute-missing': 'skip' } })
      assert.ok(result.includes('doctype=book'))
      assert.ok(!result.includes('{backend-html5-doctype-book}'))
      assert.ok(result.includes('{backend-html5-doctype-article}'))
    })

    test('should not allow AsciiDoc table cell to set a document attribute that was hard set by the API', async () => {
      const input = `|===
a|
:icons:

NOTE: This admonition does not have a font-based icon.
|===`
      const result = await convertStringToEmbedded(input, { safe: 'safe', attributes: { icons: 'font' } })
      assertCss(result, 'td.icon .title', 0)
      assertCss(result, 'td.icon i.icon-note', 1)
    })

    test('should not allow AsciiDoc table cell to set a document attribute that was hard unset by the API', async () => {
      const input = `|===
a|
:icons: font

NOTE: This admonition does not have a font-based icon.
|===`
      const result = await convertStringToEmbedded(input, { safe: 'safe', attributes: { icons: null } })
      assertCss(result, 'td.icon .title', 1)
      assertCss(result, 'td.icon i.icon-note', 0)
      assertXpath(result, '//td[@class="icon"]/*[@class="title"][text()="Note"]', 1)
    })

    test('should keep attribute unset in AsciiDoc table cell if unset in parent document', async () => {
      const input = `:!sectids:
:!table-caption:

== Outer Heading

.Outer Table
|===
a|

== Inner Heading

.Inner Table
!===
! table cell
!===
|===`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, 'h2[id]', 0)
      assertXpath(result, '//caption[text()="Outer Table"]', 1)
      assertXpath(result, '//caption[text()="Inner Table"]', 1)
    })

    test('should allow attribute unset in parent document to be set in AsciiDoc table cell', async () => {
      const input = `:!sectids:

== No ID

|===
a|

== No ID

:sectids:

== Has ID
|===`
      const result = await convertStringToEmbedded(input)
      const { parse } = await import('node-html-parser')
      const root = parse(`<body>${result}</body>`)
      const headings = root.querySelectorAll('h2')
      assert.equal(headings.length, 3)
      assert.equal(headings[0].getAttribute('id'), undefined)
      assert.equal(headings[1].getAttribute('id'), undefined)
      assert.equal(headings[2].getAttribute('id'), '_has_id')
    })

    test('should not allow locked attribute unset in parent document to be set in AsciiDoc table cell', async () => {
      const input = `== No ID

|===
a|

== No ID

:sectids:

== Has ID
|===`
      const result = await convertStringToEmbedded(input, { attributes: { sectids: null } })
      const { parse } = await import('node-html-parser')
      const root = parse(`<body>${result}</body>`)
      const headings = root.querySelectorAll('h2')
      assert.equal(headings.length, 3)
      for (const heading of headings) {
        assert.equal(heading.getAttribute('id'), undefined)
      }
    })

    test('showtitle can be enabled in AsciiDoc table cell if unset in parent document', async () => {
      for (const name of ['showtitle', 'notitle']) {
        const unsetPrefix = name === 'showtitle' ? '!' : ''
        const setPrefix = name === 'showtitle' ? '' : '!'
        const input = `= Document Title
:${unsetPrefix}${name}:

|===
a|
= Nested Document Title
:${setPrefix}${name}:

content
|===`
        const result = await convertStringToEmbedded(input)
        assertCss(result, 'h1', 1)
        assertCss(result, '.tableblock h1', 1)
      }
    })

    test('showtitle can be enabled in AsciiDoc table cell if unset by API', async () => {
      for (const name of ['showtitle', 'notitle']) {
        const setPrefix = name === 'showtitle' ? '' : '!'
        const input = `= Document Title

|===
a|
= Nested Document Title
:${setPrefix}${name}:

content
|===`
        const result = await convertStringToEmbedded(input, {
          attributes: { [name]: name === 'showtitle' ? null : '' }
        })
        assertCss(result, 'h1', 1)
        assertCss(result, '.tableblock h1', 1)
      }
    })

    test('showtitle can be disabled in AsciiDoc table cell if set in parent document', async () => {
      for (const name of ['showtitle', 'notitle']) {
        const setPrefix = name === 'showtitle' ? '' : '!'
        const unsetPrefix = name === 'showtitle' ? '!' : ''
        const input = `= Document Title
:${setPrefix}${name}:

|===
a|
= Nested Document Title
:${unsetPrefix}${name}:

content
|===`
        const result = await convertStringToEmbedded(input)
        assertCss(result, 'h1', 1)
        assertCss(result, '.tableblock h1', 0)
      }
    })

    test('showtitle can be disabled in AsciiDoc table cell if set by API', async () => {
      for (const name of ['showtitle', 'notitle']) {
        const unsetPrefix = name === 'showtitle' ? '!' : ''
        const input = `= Document Title

|===
a|
= Nested Document Title
:${unsetPrefix}${name}:

content
|===`
        const result = await convertStringToEmbedded(input, {
          attributes: { [name]: name === 'showtitle' ? '' : null }
        })
        assertCss(result, 'h1', 1)
        assertCss(result, '.tableblock h1', 0)
      }
    })

    test('AsciiDoc content', async () => {
      const input = `[cols="1e,1,5a"]
|===
|Name |Backends |Description

|badges |xhtml11, html5 |
Link badges ('XHTML 1.1' and 'CSS') in document footers.

[NOTE]
====
The path names of images, icons and scripts are relative path
names to the output document not the source document.
====
|[[X97]] docinfo, docinfo1, docinfo2 |All backends |
These three attributes control which document information
files will be included in the the header of the output file:

docinfo:: Include \`<filename>-docinfo.<ext>\`
docinfo1:: Include \`docinfo.<ext>\`
docinfo2:: Include \`docinfo.<ext>\` and \`<filename>-docinfo.<ext>\`

Where \`<filename>\` is the file name (sans extension) of the AsciiDoc
input file and \`<ext>\` is \`.html\` for HTML outputs or \`.xml\` for
DocBook outputs. If the input file is the standard input then the
output file name is used.
|===`
      const doc = await documentFromString(input, { sourcemap: true })
      const table = doc.blocks[0]
      assert.ok(table != null)
      const tbody = table.rows.body
      assert.equal(tbody.length, 2)
      const bodyCell12 = tbody[0][1]
      assert.equal(bodyCell12.lineno, 5)
      const bodyCell13 = tbody[0][2]
      assert.ok(bodyCell13.innerDocument != null)
      assert.ok(bodyCell13.innerDocument.nested)
      assert.equal(bodyCell13.lineno, 5)
      const output = await doc.convert({ standalone: false })

      assertCss(output, 'table.tableblock > tbody > tr', 2)
      assertCss(output, 'table.tableblock > tbody > tr:nth-child(1) > td:nth-child(3) div.admonitionblock', 1)
      assertCss(output, 'table.tableblock > tbody > tr:nth-child(2) > td:nth-child(3) div.dlist', 1)
    })

    test('should preserve leading indentation in contents of AsciiDoc table cell if contents starts with newline', async () => {
      const input = `|===
a|
 $ command
a| paragraph
|===`
      const doc = await documentFromString(input, { sourcemap: true })
      const table = doc.blocks[0]
      const tbody = table.rows.body
      assert.equal(table.lineno, 1)
      assert.equal(tbody[0][0].lineno, 2)
      assert.equal(tbody[0][0].innerDocument.lineno, 3)
      assert.equal(tbody[1][0].lineno, 4)
      const output = await doc.convert({ standalone: false })
      assertCss(output, 'td', 2)
      assertXpath(output, '(//td)[1]//*[@class="literalblock"]', 1)
      assertXpath(output, '(//td)[2]//*[@class="paragraph"]', 1)
      assertXpath(output, '(//pre)[1][text()="$ command"]', 1)
      assertXpath(output, '(//p)[1][text()="paragraph"]', 1)
    })

    test('preprocessor directive on first line of an AsciiDoc table cell should be processed', async () => {
      const input = `|===
a|include::fixtures/include-file.adoc[]
|===`
      const output = await convertStringToEmbedded(input, { safe: 'safe', base_dir: __dirname })
      assert.ok(output.includes('included content'), `Expected "included content" in output, got:\n${output}`)
    })

    test('cross reference link in an AsciiDoc table cell should resolve to reference in main document', async () => {
      const input = `== Some

|===
a|See <<_more>>
|===

== More

content`
      const result = await convertString(input)
      assertXpath(result, '//a[@href="#_more"]', 1)
      assertXpath(result, '//a[@href="#_more"][text()="More"]', 1)
    })

    test('should discover anchor at start of cell and register it as a reference', async () => {
      const input = `The highest peak in the Front Range is <<grays-peak>>, which tops <<mount-evans>> by just a few feet.

[cols="1s,1"]
|===
|[[mount-evans,Mount Evans]]Mount Evans
|14,271 feet

h|[[grays-peak,Grays Peak]]
Grays Peak
|14,278 feet
|===`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok(refs['mount-evans'] != null || refs.has?.('mount-evans'))
      assert.ok(refs['grays-peak'] != null || refs.has?.('grays-peak'))
      const output = await doc.convert({ standalone: false })
      assertXpath(output, '(//p)[1]/a[@href="#grays-peak"][text()="Grays Peak"]', 1)
      assertXpath(output, '(//p)[1]/a[@href="#mount-evans"][text()="Mount Evans"]', 1)
      assertXpath(output, '(//table/tbody/tr)[1]//td//a[@id="mount-evans"]', 1)
      assertXpath(output, '(//table/tbody/tr)[2]//th//a[@id="grays-peak"]', 1)
    })

    test('should catalog anchor at start of cell in implicit header row when column has a style', async () => {
      const input = `[cols=1a]
|===
|[[foo,Foo]]* not AsciiDoc

| AsciiDoc
|===`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok(refs['foo'] != null || refs.has?.('foo'))
    })

    test('should catalog anchor at start of cell in explicit header row when column has a style', async () => {
      const input = `[%header,cols=1a]
|===
|[[foo,Foo]]* not AsciiDoc
| AsciiDoc
|===`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok(refs['foo'] != null || refs.has?.('foo'))
    })

    test('should catalog anchor at start of cell in first row', async () => {
      const input = `|===
|[[foo,Foo]]foo
| bar
|===`
      const doc = await documentFromString(input)
      const refs = doc.catalog.refs
      assert.ok(refs['foo'] != null || refs.has?.('foo'))
    })

    test('footnotes should not be shared between an AsciiDoc table cell and the main document', async () => {
      const input = `|===
a|AsciiDoc footnote:[A lightweight markup language.]
|===`
      const result = await convertString(input)
      assertCss(result, '#_footnotedef_1', 1)
    })

    test('callout numbers should be globally unique, including AsciiDoc table cells', async () => {
      const input = `= Document Title

== Section 1

|===
a|
[source, yaml]
----
key: value <1>
----
<1> First callout
|===

== Section 2

|===
a|
[source, yaml]
----
key: value <1>
----
<1> Second callout
|===

== Section 3

[source, yaml]
----
key: value <1>
----
<1> Third callout`
      const result = await convertStringToEmbedded(input, { backend: 'docbook' })
      const conums = countXpath(result, '//co')
      assert.equal(conums, 3)
      assertXpath(result, '(//co)[1][@xml:id="CO1-1"]', 1)
      assertXpath(result, '(//co)[2][@xml:id="CO2-1"]', 1)
      assertXpath(result, '(//co)[3][@xml:id="CO3-1"]', 1)
      assertXpath(result, '//callout', 3)
      assertXpath(result, '(//callout)[1][@arearefs="CO1-1"]', 1)
      assertXpath(result, '(//callout)[2][@arearefs="CO2-1"]', 1)
      assertXpath(result, '(//callout)[3][@arearefs="CO3-1"]', 1)
    })

    test('compat mode can be activated in AsciiDoc table cell', async () => {
      const input = `|===
a|
:compat-mode:

The word 'italic' is emphasized.
|===`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '//em[text()="italic"]', 1)
    })

    test('compat mode in AsciiDoc table cell inherits from parent document', async () => {
      const input = `:compat-mode:

The word 'italic' is emphasized.

[cols=1*]
|===
|The word 'oblique' is emphasized.
a|
The word 'slanted' is emphasized.
|===

The word 'askew' is emphasized.`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '//em[text()="italic"]', 1)
      assertXpath(result, '//em[text()="oblique"]', 1)
      assertXpath(result, '//em[text()="slanted"]', 1)
      assertXpath(result, '//em[text()="askew"]', 1)
    })

    test('compat mode in AsciiDoc table cell can be unset if set in parent document', async () => {
      const input = `:compat-mode:

The word 'italic' is emphasized.

[cols=1*]
|===
|The word 'oblique' is emphasized.
a|
:!compat-mode:

The word 'slanted' is not emphasized.
|===

The word 'askew' is emphasized.`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '//em[text()="italic"]', 1)
      assertXpath(result, '//em[text()="oblique"]', 1)
      assertXpath(result, '//em[text()="slanted"]', 0)
      assertXpath(result, '//em[text()="askew"]', 1)
    })

    test('nested table', async () => {
      const input = `[cols="1,2a"]
|===
|Normal cell
|Cell with nested table
[cols="2,1"]
!===
!Nested table cell 1 !Nested table cell 2
!===
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 2)
      assertCss(output, 'table table', 1)
      assertCss(output, 'table > tbody > tr > td:nth-child(2) table', 1)
      assertCss(output, 'table > tbody > tr > td:nth-child(2) table > tbody > tr > td', 2)
    })

    test('can set format of nested table to psv', async () => {
      const input = `[cols="2*"]
|===
|normal cell
a|
[format=psv]
!===
!nested cell
!===
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 2)
      assertCss(output, 'table table', 1)
      assertCss(output, 'table > tbody > tr > td:nth-child(2) table', 1)
      assertCss(output, 'table > tbody > tr > td:nth-child(2) table > tbody > tr > td', 1)
    })

    test('AsciiDoc table cell should not inherit toc setting from parent document', async () => {
      const input = `= Document Title
:toc:

== Section

|===
a|
== Section in Nested Document

content
|===`
      const output = await convertString(input)
      assertCss(output, '.toc', 1)
      assertCss(output, 'table .toc', 0)
    })

    test('should be able to enable toc in an AsciiDoc table cell', async () => {
      const input = `= Document Title

== Section A

|===
a|
= Subdocument Title
:toc:

== Subdocument Section A

content
|===`
      const output = await convertString(input)
      assertCss(output, '.toc', 1)
      assertCss(output, 'table .toc', 1)
    })

    test('should be able to enable toc in an AsciiDoc table cell even if hard unset by API', async () => {
      const input = `= Document Title

== Section A

|===
a|
= Subdocument Title
:toc:

== Subdocument Section A

content
|===`
      const output = await convertString(input, { attributes: { toc: null } })
      assertCss(output, '.toc', 1)
      assertCss(output, 'table .toc', 1)
    })

    test('should be able to enable toc in both outer document and in an AsciiDoc table cell', async () => {
      const input = `= Document Title
:toc:

== Section A

|===
a|
= Subdocument Title
:toc: macro

[#table-cell-toc]
toc::[]

== Subdocument Section A

content
|===`
      const output = await convertString(input)
      assertCss(output, '.toc', 2)
      assertCss(output, '#toc', 1)
      assertCss(output, 'table .toc', 1)
      assertCss(output, 'table #table-cell-toc', 1)
    })

    test('document in an AsciiDoc table cell should not see doctitle of parent', async () => {
      const input = `= Document Title

[cols="1a"]
|===
|AsciiDoc content
|===`
      const output = await convertString(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > tbody > tr > td', 1)
      assertCss(output, 'table > tbody > tr > td #preamble', 0)
      assertCss(output, 'table > tbody > tr > td .paragraph', 1)
    })

    test('cell background color', async () => {
      const input = `[cols="1e,1", options="header"]
|===
|{set:cellbgcolor:green}green
|{set:cellbgcolor!}
plain
|{set:cellbgcolor:red}red
|{set:cellbgcolor!}
plain
|===`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(/table/thead/tr/th)[1][@style="background-color: green;"]', 1)
      assertXpath(output, '(/table/thead/tr/th)[2][@style="background-color: green;"]', 0)
      assertXpath(output, '(/table/tbody/tr/td)[1][@style="background-color: red;"]', 1)
      assertXpath(output, '(/table/tbody/tr/td)[2][@style="background-color: green;"]', 0)
    })

    test('should warn if table block is not terminated', async () => {
      const input = `outside

|===
|
inside

still inside

eof`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertXpath(output, '/table', 1)
        assertMessage(logger, 'WARN', '<stdin>: line 3: unterminated table block')
      })
    })

    test('should show correct line number in warning about unterminated block inside AsciiDoc table cell', async () => {
      const input = `outside

* list item
+
|===
|cell
a|inside

====
unterminated example block
|===

eof`
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input)
        assertXpath(output, '//ul//table', 1)
        assertMessage(logger, 'WARN', '<stdin>: line 9: unterminated example block')
      })
    })

    test('custom separator for an AsciiDoc table cell', async () => {
      const input = `[cols=2,separator=!]
|===
!Pipe output to vim
a!
----
asciidoctor -o - -s test.adoc | view -
----
|===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > tbody > tr', 1)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td', 2)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(1) p', 1)
      assertCss(output, 'table > tbody > tr:nth-child(1) > td:nth-child(2) .listingblock', 1)
    })

    test('table with breakable option docbook 5', async () => {
      const input = `.Table with breakable
[%breakable]
|===
|Item       |Quantity
|Item 1     |1
|===`
      const output = await convertStringToEmbedded(input, { backend: 'docbook5' })
      assert.ok(output.includes('<?dbfo keep-together="auto"?>'), `Expected keep-together="auto", got:\n${output}`)
    })

    test('table with unbreakable option docbook 5', async () => {
      const input = `.Table with unbreakable
[%unbreakable]
|===
|Item       |Quantity
|Item 1     |1
|===`
      const output = await convertStringToEmbedded(input, { backend: 'docbook5' })
      assert.ok(output.includes('<?dbfo keep-together="always"?>'), `Expected keep-together="always", got:\n${output}`)
    })

    test('no implicit header row if cell in first line is quoted and spans multiple lines', async () => {
      const input = `[cols=2*l]
,===
"A1

A1 continued",B1
A2,B2
,===`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'table', 1)
      assertCss(output, 'table > colgroup > col', 2)
      assertCss(output, 'table > thead', 0)
      assertCss(output, 'table > tbody', 1)
      assertCss(output, 'table > tbody > tr', 2)
      assertXpath(output, `(//td)[1]//pre[text()="A1\n\nA1 continued"]`, 1)
    })
  })
})
