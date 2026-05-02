// ESM conversion of sections_test.rb — context 'Levels'

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { Section } from '../src/section.js'
import {
  assertXpath,
  assertCss,
  assertMessage,
  usingMemoryLogger,
} from './helpers.js'
import {
  documentFromString,
  convertString,
  convertStringToEmbedded,
} from './harness.js'

function decodeChar(code) {
  return String.fromCodePoint(code)
}

// ── Sections › Levels ─────────────────────────────────────────────────────────

describe('Sections', () => {
  describe('Levels', () => {
    describe('Document Title (Level 0)', () => {
      test('document title with multiline syntax', async () => {
        const title = 'My Title'
        const chars = '='.repeat(title.length)
        assertXpath(
          await convertString(title + '\n' + chars),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
        assertXpath(
          await convertString(title + '\n' + chars + '\n'),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
      })

      test('document title with multiline syntax, give a char', async () => {
        const title = 'My Title'
        const chars = '='.repeat(title.length + 1)
        assertXpath(
          await convertString(title + '\n' + chars),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
        assertXpath(
          await convertString(title + '\n' + chars + '\n'),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
      })

      test('document title with multiline syntax, take a char', async () => {
        const title = 'My Title'
        const chars = '='.repeat(title.length - 1)
        assertXpath(
          await convertString(title + '\n' + chars),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
        assertXpath(
          await convertString(title + '\n' + chars + '\n'),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
      })

      test('document title with multiline syntax and unicode characters', async () => {
        const input = `AsciiDoc Writer\u2019s Guide
=======================
Author Name

preamble`
        const result = await convertString(input)
        assertXpath(result, '//h1', 1)
        assertXpath(result, `//h1[text()="AsciiDoc Writer\u2019s Guide"]`, 1)
      })

      test('not enough chars for a multiline document title', async () => {
        const title = 'My Title'
        const chars = '='.repeat(title.length - 2)
        await usingMemoryLogger(async (logger) => {
          let output = await convertString(title + '\n' + chars)
          assertXpath(output, '//h1', 0)
          assert.ok(logger.messages.length > 0)
          logger.clear()
          output = await convertString(title + '\n' + chars + '\n')
          assertXpath(output, '//h1', 0)
          assert.ok(logger.messages.length > 0)
        })
      })

      test('too many chars for a multiline document title', async () => {
        const title = 'My Title'
        const chars = '='.repeat(title.length + 2)
        await usingMemoryLogger(async (logger) => {
          let output = await convertString(title + '\n' + chars)
          assertXpath(output, '//h1', 0)
          assert.ok(logger.messages.length > 0)
          logger.clear()
          output = await convertString(title + '\n' + chars + '\n')
          assertXpath(output, '//h1', 0)
          assert.ok(logger.messages.length > 0)
        })
      })

      test('document title with multiline syntax cannot begin with a dot', async () => {
        const title = '.My Title'
        const chars = '='.repeat(title.length)
        await usingMemoryLogger(async (logger) => {
          const output = await convertString(title + '\n' + chars)
          assertXpath(output, '//h1', 0)
          assert.ok(logger.messages.length > 0)
        })
      })

      test('document title with atx syntax', async () => {
        assertXpath(
          await convertString('= My Title'),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
      })

      test('document title with symmetric syntax', async () => {
        assertXpath(
          await convertString('= My Title ='),
          '//h1[not(@id)][text() = "My Title"]',
          1
        )
      })

      test('document title created from leveloffset shift defined in document', async () => {
        assertXpath(
          await convertString(':leveloffset: -1\n== Document Title'),
          '//h1[not(@id)][text() = "Document Title"]',
          1
        )
      })

      test('document title created from leveloffset shift defined in API', async () => {
        assertXpath(
          await convertString('== Document Title', {
            attributes: { leveloffset: '-1@' },
          }),
          '//h1[not(@id)][text() = "Document Title"]',
          1
        )
      })

      test('should assign id on document title to body', async () => {
        const input = `[[idname]]
= Document Title

content`
        const output = await convertString(input)
        assertCss(output, 'body#idname', 1)
      })

      test('should assign id defined using shorthand syntax on document title to body', async () => {
        const input = `[#idname]
= Document Title

content`
        const output = await convertString(input)
        assertCss(output, 'body#idname', 1)
      })

      test('should use ID defined in block attributes instead of ID defined inline', async () => {
        const input = `[#idname-block]
= Document Title [[idname-inline]]

content`
        const output = await convertString(input)
        assertCss(output, 'body#idname-block', 1)
      })

      test('block id above document title sets id on document', async () => {
        const input = `[[reference]]
= Reference Manual
:css-signature: refguide

preamble`
        const doc = await documentFromString(input, { standalone: true })
        assert.equal(doc.id, 'reference')
        assert.equal(doc.getAttribute('css-signature'), 'refguide')
        const output = await doc.convert()
        assertCss(output, 'body#reference', 1)
      })

      test('should register document in catalog if id is set', async () => {
        const input = `[[manual,Manual]]
= Reference Manual

preamble`
        const doc = await documentFromString(input)
        assert.equal(doc.id, 'manual')
        assert.equal(doc.attributes['reftext'], 'Manual')
        assert.equal(doc.catalog.refs['manual'], doc)
      })

      test('should compute xreftext to document title', async () => {
        const input = `[#manual]
= Reference Manual
:xrefstyle: full

This is the <<manual>>.`
        const output = await convertString(input)
        assertXpath(output, '//a[text()="Reference Manual"]', 1)
      })

      test('should not interpret level-0 section as document title if it has a style', async () => {
        const input = `[glossary]
= Document Title

content`
        await usingMemoryLogger(async (logger) => {
          const doc = await documentFromString(input)
          assertMessage(
            logger,
            'ERROR',
            '<stdin>: line 2: level 0 sections can only be used when doctype is book'
          )
          assert.ok(!doc.hasHeader())
          assert.ok(doc.attributes['title'] == null)
          assert.equal(doc.blocks[0].attributes['style'], 'glossary')
        })
      })

      test('should discard role and options shorthand attributes defined on document title', async () => {
        const input = `[#idname.rolename%optionname]
= Document Title

content`
        const doc = await documentFromString(input, { standalone: true })
        assert.deepEqual(await doc.blocks[0].attributes, {})
        const output = await doc.convert()
        assertCss(output, '#idname', 1)
        assertCss(output, 'body#idname', 1)
        assertCss(output, '.rolename', 1)
        assertCss(output, 'body.rolename', 1)
      })
    })

    describe('Level 1', () => {
      test('with multiline syntax', async () => {
        assertXpath(
          await convertString('My Section\n-----------'),
          '//h2[@id="_my_section"][text() = "My Section"]',
          1
        )
      })

      test('should not recognize underline containing a mix of characters as setext section title', async () => {
        const input = 'My Section\n----^^----'
        const result = await convertStringToEmbedded(input)
        assertXpath(result, '//h2[@id="_my_section"][text() = "My Section"]', 0)
        assert.ok(result.includes('----^^----'))
      })

      test('should not recognize section title that does not contain alphanumeric character', async () => {
        const input = '!@#$\n----'
        await usingMemoryLogger(async (logger) => {
          const result = await convertStringToEmbedded(input)
          assertCss(result, 'h2', 0)
          assertMessage(
            logger,
            'WARN',
            '<stdin>: line 2: unterminated listing block'
          )
        })
      })

      test('should not recognize section title that consists of only underscores', async () => {
        const input = '____\n----'
        await usingMemoryLogger(async (logger) => {
          const result = await convertStringToEmbedded(input)
          assertCss(result, 'h2', 0)
          assertMessage(
            logger,
            'WARN',
            '<stdin>: line 1: unterminated quote block'
          )
          assertMessage(
            logger,
            'WARN',
            '<stdin>: line 2: unterminated listing block'
          )
        })
      })

      test('should preprocess second line of setext section title', async () => {
        const input = `Section Title
ifdef::asciidoctor[]
-------------
endif::[]`
        const result = await convertStringToEmbedded(input)
        assertXpath(result, '//h2', 1)
      })

      test('heading title with multiline syntax cannot begin with a dot', async () => {
        const title = '.My Title'
        const chars = '-'.repeat(title.length)
        await usingMemoryLogger(async (logger) => {
          const output = await convertString(title + '\n' + chars)
          assertXpath(output, '//h2', 0)
          assert.ok(logger.messages.length > 0)
        })
      })

      test('with atx syntax', async () => {
        assertXpath(
          await convertString('== My Title'),
          '//h2[@id="_my_title"][text() = "My Title"]',
          1
        )
      })

      test('with atx symmetric syntax', async () => {
        assertXpath(
          await convertString('== My Title =='),
          '//h2[@id="_my_title"][text() = "My Title"]',
          1
        )
      })

      test('with atx non-matching symmetric syntax', async () => {
        assertXpath(
          await convertString('== My Title ==='),
          '//h2[@id="_my_title"][text() = "My Title ==="]',
          1
        )
      })

      test('with XML entity', async () => {
        assertXpath(
          await convertString('== What\u2019s new?'),
          `//h2[@id='_whats_new'][text() = "What${decodeChar(8217)}s new?"]`,
          1
        )
      })

      test('with non-word character', async () => {
        assertXpath(
          await convertString('== What\u2019s new?'),
          '//h2[@id="_whats_new"][text() = "What\u2019s new?"]',
          1
        )
      })

      test('with sequential non-word characters', async () => {
        assertXpath(
          await convertString('== What the #@$ is this?'),
          '//h2[@id="_what_the_is_this"][text() = "What the #@$ is this?"]',
          1
        )
      })

      test('with trailing whitespace', async () => {
        assertXpath(
          await convertString('== My Title '),
          '//h2[@id="_my_title"][text() = "My Title"]',
          1
        )
      })

      test('with custom blank idprefix', async () => {
        assertXpath(
          await convertString(':idprefix:\n\n== My Title '),
          '//h2[@id="my_title"][text() = "My Title"]',
          1
        )
      })

      test('with custom non-blank idprefix', async () => {
        assertXpath(
          await convertString(':idprefix: ref_\n\n== My Title '),
          '//h2[@id="ref_my_title"][text() = "My Title"]',
          1
        )
      })

      test('with multibyte characters', async () => {
        const input = '== Asciidoctor in \u4e2d\u6587'
        const output = await convertString(input)
        assertXpath(
          output,
          '//h2[@id="_asciidoctor_in_\u4e2d\u6587"][text()="Asciidoctor in \u4e2d\u6587"]',
          1
        )
      })

      test('with only multibyte characters', async () => {
        const input = '== \u89c6\u56fe'
        const output = await convertStringToEmbedded(input)
        assertXpath(
          output,
          '//h2[@id="_\u89c6\u56fe"][text()="\u89c6\u56fe"]',
          1
        )
      })

      test('multiline syntax with only multibyte characters', async () => {
        const input = `\u89c6\u56fe
--

content

\u8fde\u63a5\u5668
---

content`
        const output = await convertStringToEmbedded(input)
        assertXpath(
          output,
          '//h2[@id="_\u89c6\u56fe"][text()="\u89c6\u56fe"]',
          1
        )
        assertXpath(
          output,
          '//h2[@id="_\u8fde\u63a5\u5668"][text()="\u8fde\u63a5\u5668"]',
          1
        )
      })
    })

    describe('Level 2', () => {
      test('with multiline syntax', async () => {
        assertXpath(
          await convertString(':fragment:\nMy Section\n~~~~~~~~~~~'),
          '//h3[@id="_my_section"][text() = "My Section"]',
          1
        )
      })

      test('with atx line syntax', async () => {
        assertXpath(
          await convertString(':fragment:\n=== My Title'),
          '//h3[@id="_my_title"][text() = "My Title"]',
          1
        )
      })
    })

    describe('Level 3', () => {
      test('with multiline syntax', async () => {
        assertXpath(
          await convertString(':fragment:\nMy Section\n^^^^^^^^^^'),
          '//h4[@id="_my_section"][text() = "My Section"]',
          1
        )
      })

      test('with atx line syntax', async () => {
        assertXpath(
          await convertString(':fragment:\n==== My Title'),
          '//h4[@id="_my_title"][text() = "My Title"]',
          1
        )
      })
    })

    describe('Level 4', () => {
      test('with multiline syntax', async () => {
        assertXpath(
          await convertString(':fragment:\nMy Section\n++++++++++'),
          '//h5[@id="_my_section"][text() = "My Section"]',
          1
        )
      })

      test('with atx line syntax', async () => {
        assertXpath(
          await convertString(':fragment:\n===== My Title'),
          '//h5[@id="_my_title"][text() = "My Title"]',
          1
        )
      })
    })

    describe('Level 5', () => {
      test('with atx line syntax', async () => {
        assertXpath(
          await convertString(':fragment:\n====== My Title'),
          '//h6[@id="_my_title"][text() = "My Title"]',
          1
        )
      })
    })
  })

  describe('API', () => {
    test('add a new Section to the document', async () => {
      const doc = await documentFromString(`= Title

== Section A`)
      const sectionB = Section.create(doc, 2, true, {
        attributes: { foo: 'bar' },
      })
      sectionB.setTitle('Section B')
      doc.append(sectionB)
      const sections = doc.findBy({ context: 'section' })
      const secondSection = sections[2]
      assert.equal(secondSection.getLevel(), 2)
      assert.equal(secondSection.getName(), 'Section B')
      assert.equal(secondSection.getTitle(), 'Section B')
      assert.equal(secondSection.getSectionName(), undefined)
      assert.equal(secondSection.isNumbered(), true)
      assert.equal(secondSection.isSpecial(), false)
      assert.equal(secondSection.getCaption(), undefined)
      assert.equal(secondSection.getAttribute('foo'), 'bar')
      assert.equal(secondSection.getNumeral(), '1')
    })
  })
})
