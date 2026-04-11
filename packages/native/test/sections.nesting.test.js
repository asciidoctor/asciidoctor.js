// ESM conversion of sections_test.rb
// Contexts: Substitutions, Nesting, Markdown-style headings, Discrete Heading

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { assertXpath, assertCss, assertMessage, assertMessages, usingMemoryLogger } from './helpers.js'

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertString = (input, opts = {}) => documentFromString(input, { standalone: true, ...opts }).then((doc) => doc.convert())
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())
const blockFromString = async (input, opts = {}) => (await documentFromString(input, opts)).blocks[0]

function decodeChar (code) { return String.fromCodePoint(code) }

// ── Sections › Substitutions ──────────────────────────────────────────────────

describe('Sections', () => {
  describe('Substitutions', () => {
    test('should apply substitutions in normal order', async () => {
      const input = `== {link-url}[{link-text}]{tm}

The one and only!`
      const output = await convertStringToEmbedded(input, {
        attributes: {
          'link-url': 'https://acme.com',
          'link-text': 'ACME',
          tm: '(TM)',
        },
      })
      assertCss(output, 'h2', 1)
      assertCss(output, 'h2 a[href="https://acme.com"]', 1)
      assertXpath(output, `//h2[contains(text(),"${decodeChar(8482)}")]`, 1)
    })
  })

  // ── Sections › Nesting ──────────────────────────────────────────────────────

  describe('Nesting', () => {
    test('should warn if section title is out of sequence', async () => {
      const input = `= Document Title

== Section A

==== Nested Section

content

== Section B

content`
      await usingMemoryLogger(async (logger) => {
        const result = await convertStringToEmbedded(input)
        assertXpath(result, '//h4[text()="Nested Section"]', 1)
        assertMessage(logger, 'WARN', '<stdin>: line 5: section title out of sequence: expected level 2, got level 3')
      })
    })

    test('should warn if chapter title is out of sequence', async () => {
      const input = `= Document Title
:doctype: book

=== Not a Chapter

content`
      await usingMemoryLogger(async (logger) => {
        const result = await convertStringToEmbedded(input)
        assertXpath(result, '//h3[text()="Not a Chapter"]', 1)
        assertMessage(logger, 'WARN', '<stdin>: line 4: section title out of sequence: expected levels 0 or 1, got level 2')
      })
    })

    test('should not warn if top-level section title is out of sequence when fragment attribute is set on document', async () => {
      const input = `= Document Title

=== First Section

content`
      await usingMemoryLogger(async (logger) => {
        await convertStringToEmbedded(input, { attributes: { fragment: '' } })
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should warn if nested section title is out of sequence when fragment attribute is set on document', async () => {
      const input = `= Document Title

=== First Section

===== Nested Section`
      await usingMemoryLogger(async (logger) => {
        await convertStringToEmbedded(input, { attributes: { fragment: '' } })
        assertMessage(logger, 'WARN', '<stdin>: line 5: section title out of sequence: expected level 3, got level 4')
      })
    })

    test('should log error if subsections are found in special sections in article that do not support subsections', async () => {
      const input = `= Document Title

== Section

=== Subsection of Section

allowed

[appendix]
== Appendix

=== Subsection of Appendix

allowed

[glossary]
== Glossary

=== Subsection of Glossary

not allowed

[bibliography]
== Bibliography

=== Subsection of Bibliography

not allowed`
      await usingMemoryLogger(async (logger) => {
        await convertStringToEmbedded(input)
        assertMessages(logger, [
          ['ERROR', '<stdin>: line 19: glossary sections do not support nested sections'],
          ['ERROR', '<stdin>: line 26: bibliography sections do not support nested sections'],
        ])
      })
    })

    test('should log error if subsections are found in special sections in book that do not support subsections', async () => {
      const input = `= Document Title
:doctype: book

[preface]
= Preface

=== Subsection of Preface

allowed

[colophon]
= Colophon

=== Subsection of Colophon

not allowed

[dedication]
= Dedication

=== Subsection of Dedication

not allowed

= Part 1

[abstract]
== Abstract

=== Subsection of Abstract

allowed

== Chapter 1

=== Subsection of Chapter

allowed

[appendix]
= Appendix

=== Subsection of Appendix

allowed

[glossary]
= Glossary

=== Subsection of Glossary

not allowed

[bibliography]
= Bibliography

=== Subsection of Bibliography

not allowed`
      await usingMemoryLogger(async (logger) => {
        await convertStringToEmbedded(input)
        assertMessages(logger, [
          ['ERROR', '<stdin>: line 14: colophon sections do not support nested sections'],
          ['ERROR', '<stdin>: line 21: dedication sections do not support nested sections'],
          ['ERROR', '<stdin>: line 50: glossary sections do not support nested sections'],
          ['ERROR', '<stdin>: line 57: bibliography sections do not support nested sections'],
        ])
      })
    })
  })

  // ── Sections › Markdown-style headings ──────────────────────────────────────

  describe('Markdown-style headings', () => {
    test('atx document title with leading marker', async () => {
      const output = await convertString('# Document Title')
      assertXpath(output, '//h1[not(@id)][text() = "Document Title"]', 1)
    })

    test('atx document title with symmetric markers', async () => {
      const output = await convertString('# Document Title #')
      assertXpath(output, '//h1[not(@id)][text() = "Document Title"]', 1)
    })

    test('atx section title with leading marker', async () => {
      const input = `## Section One

blah blah`
      const output = await convertString(input)
      assertXpath(output, '//h2[@id="_section_one"][text() = "Section One"]', 1)
    })

    test('atx section title with symmetric markers', async () => {
      const input = `## Section One ##

blah blah`
      const output = await convertString(input)
      assertXpath(output, '//h2[@id="_section_one"][text() = "Section One"]', 1)
    })

    test('should not match atx syntax with mixed markers', async () => {
      const output = await convertStringToEmbedded('=#= My Title')
      assertXpath(output, '//h3[@id="_my_title"][text() = "My Title"]', 0)
      assert.ok(output.includes('<p>=#= My Title</p>'))
    })
  })

  // ── Sections › Discrete Heading ─────────────────────────────────────────────

  describe('Discrete Heading', () => {
    test('should create discrete heading instead of section if style is float', async () => {
      const input = `[float]
= Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h1[@id="_independent_heading"]', 1)
      assertXpath(output, '/h1[@class="float"]', 1)
      assertXpath(output, '/h1[@class="float"][text()="Independent Heading!"]', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]/p', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]/p[text()="not in section"]', 1)
    })

    test('should create discrete heading instead of section if style is discrete', async () => {
      const input = `[discrete]
=== Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h3', 1)
      assertXpath(output, '/h3[@id="_independent_heading"]', 1)
      assertXpath(output, '/h3[@class="discrete"]', 1)
      assertXpath(output, '/h3[@class="discrete"][text()="Independent Heading!"]', 1)
      assertXpath(output, '/h3/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '/h3/following-sibling::*[@class="paragraph"]/p', 1)
      assertXpath(output, '/h3/following-sibling::*[@class="paragraph"]/p[text()="not in section"]', 1)
    })

    test('should generate id for discrete heading from converted title', async () => {
      const input = `[discrete]
=== {sp}Heading{sp}

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h3', 1)
      assertXpath(output, '/h3[@class="discrete"][@id="_heading"]', 1)
      assertXpath(output, '/h3[@class="discrete"][@id="_heading"][text()=" Heading "]', 1)
    })

    test('should create discrete heading if style is float with shorthand role and id', async () => {
      const input = `[float.independent#first]
= Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h1[@id="first"]', 1)
      assertXpath(output, '/h1[@class="float independent"]', 1)
      assertXpath(output, '/h1[@class="float independent"][text()="Independent Heading!"]', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]/p', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]/p[text()="not in section"]', 1)
    })

    test('should create discrete heading if style is discrete with shorthand role and id', async () => {
      const input = `[discrete.independent#first]
= Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h1[@id="first"]', 1)
      assertXpath(output, '/h1[@class="discrete independent"]', 1)
      assertXpath(output, '/h1[@class="discrete independent"][text()="Independent Heading!"]', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]/p', 1)
      assertXpath(output, '/h1/following-sibling::*[@class="paragraph"]/p[text()="not in section"]', 1)
    })

    test('discrete heading should be a block with context floating_title', async () => {
      const input = `[float]
=== Independent Heading!

not in section`
      const doc = await documentFromString(input)
      const heading = doc.blocks[0]
      assert.equal(heading.context, 'floating_title')
      assert.equal(heading.id, '_independent_heading')
      assert.ok('_independent_heading' in doc.catalog.refs)
    })

    test('should preprocess second line of setext discrete heading', async () => {
      const input = `[discrete]
Heading Title
ifdef::asciidoctor[]
-------------
endif::[]`
      const result = await convertStringToEmbedded(input)
      assertXpath(result, '//h2', 1)
    })

    test('can assign explicit id to discrete heading', async () => {
      const input = `[[unchained]]
[float]
=== Independent Heading!

not in section`
      const doc = await documentFromString(input)
      const heading = doc.blocks[0]
      assert.equal(heading.id, 'unchained')
      assert.ok('unchained' in doc.catalog.refs)
    })

    test('should not include discrete heading in toc', async () => {
      const input = `:toc:

== Section One

[float]
=== Miss Independent

== Section Two`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]', 1)
      assertXpath(output, '//*[@id="toc"]//a[contains(text(), "Section ")]', 2)
      assertXpath(output, '//*[@id="toc"]//a[text()="Miss Independent"]', 0)
    })

    test('should not set id on discrete heading if sectids attribute is unset', async () => {
      const input = `[float]
=== Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input, { attributes: { sectids: null } })
      assertXpath(output, '/h3', 1)
      assertXpath(output, '/h3[@id="_independent_heading"]', 0)
      assertXpath(output, '/h3[@class="float"]', 1)
    })

    test('should use explicit id for discrete heading if specified', async () => {
      const input = `[[free]]
[float]
== Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h2', 1)
      assertXpath(output, '/h2[@id="free"]', 1)
      assertXpath(output, '/h2[@class="float"]', 1)
    })

    test('should add role to class attribute on discrete heading', async () => {
      const input = `[float, role="isolated"]
== Independent Heading!

not in section`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/h2', 1)
      assertXpath(output, '/h2[@id="_independent_heading"]', 1)
      assertXpath(output, '/h2[@class="float isolated"]', 1)
    })

    test('should ignore title attribute on discrete heading', async () => {
      const input = `[discrete,title="Captured!"]
== Independent Heading!

not in section`
      const doc = await documentFromString(input)
      const heading = doc.blocks[0]
      assert.equal(heading.title, 'Independent Heading!')
      assert.ok(!Object.prototype.hasOwnProperty.call(heading.attributes, 'title'))
    })

    test('should use specified id and reftext when registering discrete section reference', async () => {
      const input = `[[install,Install Procedure]]
[discrete]
== Install

content`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['install']
      assert.ok(ref != null)
      assert.equal(ref.reftext, 'Install Procedure')
      assert.equal(doc.resolveId('Install Procedure'), 'install')
    })

    test('should use specified reftext when registering discrete section reference', async () => {
      const input = `[reftext="Install Procedure"]
[discrete]
== Install

content`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['_install']
      assert.ok(ref != null)
      assert.equal(ref.reftext, 'Install Procedure')
      assert.equal(doc.resolveId('Install Procedure'), '_install')
    })

    test('should not process inline anchor in discrete heading if explicit ID is assigned', async () => {
      const input = `[discrete#install]
== Install [[installation]]

content`
      const block = await blockFromString(input)
      assert.equal(block.id, 'install')
      assert.equal(block.title, 'Install <a id="installation"></a>')
    })
  })
})