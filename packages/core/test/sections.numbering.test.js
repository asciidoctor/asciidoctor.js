// ESM conversion of sections_test.rb
// Contexts: Level offset, Section Numbering

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { Section } from '../src/section.js'
import { assertXpath, assertMessage, usingMemoryLogger } from './helpers.js'
import { documentFromString, convertString } from './harness.js'

const emptyDocument = () => documentFromString('')

// ── Sections › Level offset ───────────────────────────────────────────────────

describe('Sections', () => {
  describe('Level offset', () => {
    test('should print error if standalone document is included without level offset', async () => {
      const input = `= Main Document
Doc Writer

text in main document

// begin simulated include::[]
= Standalone Document
:author: Junior Writer

text in standalone document

// end simulated include::[]`
      await usingMemoryLogger(async (logger) => {
        await convertString(input)
        assertMessage(
          logger,
          'ERROR',
          '<stdin>: line 7: level 0 sections can only be used when doctype is book'
        )
      })
    })

    test('should add level offset to section level', async () => {
      const input = `= Main Document
Doc Writer

Main document written by {author}.

:leveloffset: 1

// begin simulated include::[]
= Standalone Document
:author: Junior Writer

Standalone document written by {author}.

== Section in Standalone

Standalone section text.
// end simulated include::[]

:leveloffset!:

== Section in Main

Main section text.`
      let output
      await usingMemoryLogger(async (logger) => {
        output = await convertString(input)
        assert.equal(logger.messages.length, 0)
      })
      assert.ok(/Main document written by Doc Writer/.test(output))
      assert.ok(/Standalone document written by Junior Writer/.test(output))
      assertXpath(
        output,
        '//*[@class="sect1"]/h2[text() = "Standalone Document"]',
        1
      )
      assertXpath(
        output,
        '//*[@class="sect2"]/h3[text() = "Section in Standalone"]',
        1
      )
      assertXpath(
        output,
        '//*[@class="sect1"]/h2[text() = "Section in Main"]',
        1
      )
    })

    test('level offset should be added to discrete heading', async () => {
      const input = `= Main Document
Doc Writer

:leveloffset: 1

[float]
= Discrete Heading`
      const output = await convertString(input)
      assertXpath(
        output,
        '//h2[@class="float"][text() = "Discrete Heading"]',
        1
      )
    })

    test('should be able to reset level offset', async () => {
      const input = `= Main Document
Doc Writer

Main preamble.

:leveloffset: 1

= Standalone Document

Standalone preamble.

:leveloffset!:

== Level 1 Section`
      const output = await convertString(input)
      assertXpath(
        output,
        '//*[@class = "sect1"]/h2[text() = "Standalone Document"]',
        1
      )
      assertXpath(
        output,
        '//*[@class = "sect1"]/h2[text() = "Level 1 Section"]',
        1
      )
    })

    test('should add relative offset value to current leveloffset', async () => {
      const input = `= Main Document
Doc Writer

Main preamble.

:leveloffset: 1

= Chapter 1

content

:leveloffset: +1

= Standalone Section

content`
      const output = await convertString(input)
      assertXpath(output, '//*[@class = "sect1"]/h2[text() = "Chapter 1"]', 1)
      assertXpath(
        output,
        '//*[@class = "sect2"]/h3[text() = "Standalone Section"]',
        1
      )
    })
  })

  // ── Sections › Section Numbering ────────────────────────────────────────────

  describe('Section Numbering', () => {
    test('should create section number with one entry for level 1', async () => {
      const doc = await emptyDocument()
      const sect1 = new Section(null, null, true)
      doc.append(sect1)
      assert.equal(sect1.sectnum(), '1.')
    })

    test('should create section number with two entries for level 2', async () => {
      const doc = await emptyDocument()
      const sect1 = new Section(null, null, true)
      doc.append(sect1)
      const sect1_1 = new Section(sect1, null, true)
      sect1.append(sect1_1)
      assert.equal(sect1_1.sectnum(), '1.1.')
    })

    test('should create section number with three entries for level 3', async () => {
      const doc = await emptyDocument()
      const sect1 = new Section(null, null, true)
      doc.append(sect1)
      const sect1_1 = new Section(sect1, null, true)
      sect1.append(sect1_1)
      const sect1_1_1 = new Section(sect1_1, null, true)
      sect1_1.append(sect1_1_1)
      assert.equal(sect1_1_1.sectnum(), '1.1.1.')
    })

    test('should create section number for second section in level', async () => {
      const doc = await emptyDocument()
      const sect1 = new Section(null, null, true)
      doc.append(sect1)
      const sect1_1 = new Section(sect1, null, true)
      sect1.append(sect1_1)
      const sect1_2 = new Section(sect1, null, true)
      sect1.append(sect1_2)
      assert.equal(sect1_2.sectnum(), '1.2.')
    })

    test('sectnum should use specified delimiter and append string', async () => {
      const doc = await emptyDocument()
      const sect1 = new Section(null, null, true)
      doc.append(sect1)
      const sect1_1 = new Section(sect1, null, true)
      sect1.append(sect1_1)
      const sect1_1_1 = new Section(sect1_1, null, true)
      sect1_1.append(sect1_1_1)
      assert.equal(sect1_1_1.sectnum(','), '1,1,1,')
      assert.equal(sect1_1_1.sectnum(':', false), '1:1:1')
    })

    test('should output section numbers when sectnums attribute is set', async () => {
      const input = `= Title
:sectnums:

== Section_1

text

=== Section_1_1

text

==== Section_1_1_1

text

== Section_2

text

=== Section_2_1

text

=== Section_2_2

text`
      const output = await convertString(input)
      assertXpath(
        output,
        '//h2[@id="_section_1"][starts-with(text(), "1. ")]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_1_1"][starts-with(text(), "1.1. ")]',
        1
      )
      assertXpath(
        output,
        '//h4[@id="_section_1_1_1"][starts-with(text(), "1.1.1. ")]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_2"][starts-with(text(), "2. ")]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_2_1"][starts-with(text(), "2.1. ")]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_2_2"][starts-with(text(), "2.2. ")]',
        1
      )
    })

    test('should output section numbers when numbered attribute is set', async () => {
      const input = `= Title
:numbered:

== Section_1

text

=== Section_1_1

text

==== Section_1_1_1

text

== Section_2

text

=== Section_2_1

text

=== Section_2_2

text`
      const output = await convertString(input)
      assertXpath(
        output,
        '//h2[@id="_section_1"][starts-with(text(), "1. ")]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_1_1"][starts-with(text(), "1.1. ")]',
        1
      )
      assertXpath(
        output,
        '//h4[@id="_section_1_1_1"][starts-with(text(), "1.1.1. ")]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_2"][starts-with(text(), "2. ")]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_2_1"][starts-with(text(), "2.1. ")]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_2_2"][starts-with(text(), "2.2. ")]',
        1
      )
    })

    test('should not crash if child section of part is out of sequence and part numbering is disabled', async () => {
      const input = `= Document Title
:doctype: book
:sectnums:

= Part

=== Out of Sequence Section`
      await usingMemoryLogger(async (logger) => {
        const output = await convertString(input)
        assertXpath(output, '//h1[text()="Part"]', 1)
        assertXpath(output, '//h3[text()=".1. Out of Sequence Section"]', 1)
        assertMessage(
          logger,
          'WARN',
          '<stdin>: line 7: section title out of sequence: expected level 1, got level 2'
        )
      })
    })

    test('should not hang if relative leveloffset attempts to make resolved section level negative', async () => {
      const input = `= Document Title
:doctype: book
:leveloffset: -1

= Part Title

== Chapter Title`
      await usingMemoryLogger(async (logger) => {
        const output = await convertString(input)
        assertXpath(output, '//h1[text()="Part Title"]', 1)
        assertXpath(output, '//h1[text()="Chapter Title"]', 1)
      })
    })

    test('should number parts when doctype is book and partnums attribute is set', async () => {
      const input = `= Book Title
:doctype: book
:sectnums:
:partnums:

= Language

== Syntax

content

= Processor

== CLI

content`
      const output = await convertString(input)
      assertXpath(output, '//h1[@id="_language"][text() = "I: Language"]', 1)
      assertXpath(output, '//h1[@id="_processor"][text() = "II: Processor"]', 1)
    })

    test('should assign sequential roman numerals to book parts', async () => {
      const input = `= Book Title
:doctype: book
:sectnums:
:partnums:

= First Part

part intro

== First Chapter

= Second Part

part intro

== Second Chapter`
      const doc = await documentFromString(input)
      assert.equal(doc.sections()[0].numeral, 'I')
      assert.equal(doc.sections()[0].sections()[0].numeral, '1')
      assert.equal(doc.sections()[1].numeral, 'II')
      assert.equal(doc.sections()[1].sections()[0].numeral, '2')
    })

    test('should prepend value of part-signifier attribute to title of numbered part', async () => {
      const input = `= Book Title
:doctype: book
:sectnums:
:partnums:
:part-signifier: Part

= Language

== Syntax

content

= Processor

== CLI

content`
      const output = await convertString(input)
      assertXpath(
        output,
        '//h1[@id="_language"][text() = "Part I: Language"]',
        1
      )
      assertXpath(
        output,
        '//h1[@id="_processor"][text() = "Part II: Processor"]',
        1
      )
    })

    test('should prepend value of chapter-signifier attribute to title of numbered chapter', async () => {
      const input = `= Book Title
:doctype: book
:sectnums:
:partnums:
:chapter-signifier: Chapter

= Language

== Syntax

content

= Processor

== CLI

content`
      const output = await convertString(input)
      assertXpath(
        output,
        '//h2[@id="_syntax"][text() = "Chapter 1. Syntax"]',
        1
      )
      assertXpath(output, '//h2[@id="_cli"][text() = "Chapter 2. CLI"]', 1)
    })

    test('should allow chapter number to be controlled using chapter-number attribute', async () => {
      const input = `= Book Title
:doctype: book
:sectnums:
:chapter-signifier: Chapter
:chapter-number: 9

== Not the Beginning

== Maybe the End`
      const output = await convertString(input)
      assertXpath(
        output,
        '//h2[@id="_not_the_beginning"][text() = "Chapter 10. Not the Beginning"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_maybe_the_end"][text() = "Chapter 11. Maybe the End"]',
        1
      )
    })

    test('blocks should have level', async () => {
      const input = `= Title

preamble

== Section 1

paragraph

=== Section 1.1

paragraph`
      const doc = await documentFromString(input)
      assert.equal(doc.blocks[0].level, 0)
      assert.equal(doc.blocks[1].level, 1)
      assert.equal(doc.blocks[1].blocks[0].level, 1)
      assert.equal(doc.blocks[1].blocks[1].level, 2)
      assert.equal(doc.blocks[1].blocks[1].blocks[0].level, 2)
    })

    test('section numbers should not increment when numbered attribute is turned off within document', async () => {
      const input = `= Document Title
:numbered:

:numbered!:

== Colophon Section

== Another Colophon Section

== Final Colophon Section

:numbered:

== Section One

=== Section One Subsection

== Section Two

== Section Three`
      const output = await convertString(input)
      assertXpath(output, '//h1[text()="Document Title"]', 1)
      assertXpath(
        output,
        '//h2[@id="_colophon_section"][text()="Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_another_colophon_section"][text()="Another Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_final_colophon_section"][text()="Final Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_one"][text()="1. Section One"]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_one_subsection"][text()="1.1. Section One Subsection"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_two"][text()="2. Section Two"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_three"][text()="3. Section Three"]',
        1
      )
    })

    test('section numbers can be toggled even if numbered attribute is enabled via the API', async () => {
      const input = `= Document Title

:numbered!:

== Colophon Section

== Another Colophon Section

== Final Colophon Section

:numbered:

== Section One

=== Section One Subsection

== Section Two

== Section Three`
      const output = await convertString(input, {
        attributes: { numbered: '' },
      })
      assertXpath(output, '//h1[text()="Document Title"]', 1)
      assertXpath(
        output,
        '//h2[@id="_colophon_section"][text()="Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_another_colophon_section"][text()="Another Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_final_colophon_section"][text()="Final Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_one"][text()="1. Section One"]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_one_subsection"][text()="1.1. Section One Subsection"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_two"][text()="2. Section Two"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_three"][text()="3. Section Three"]',
        1
      )
    })

    test('section numbers cannot be toggled even if numbered attribute is disabled via the API', async () => {
      const input = `= Document Title

:numbered!:

== Colophon Section

== Another Colophon Section

== Final Colophon Section

:numbered:

== Section One

=== Section One Subsection

== Section Two

== Section Three`
      const output = await convertString(input, {
        attributes: { 'numbered!': '' },
      })
      assertXpath(output, '//h1[text()="Document Title"]', 1)
      assertXpath(
        output,
        '//h2[@id="_colophon_section"][text()="Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_another_colophon_section"][text()="Another Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_final_colophon_section"][text()="Final Colophon Section"]',
        1
      )
      assertXpath(output, '//h2[@id="_section_one"][text()="Section One"]', 1)
      assertXpath(
        output,
        '//h3[@id="_section_one_subsection"][text()="Section One Subsection"]',
        1
      )
      assertXpath(output, '//h2[@id="_section_two"][text()="Section Two"]', 1)
      assertXpath(
        output,
        '//h2[@id="_section_three"][text()="Section Three"]',
        1
      )
    })

    test('section numbers should not increment until numbered attribute is turned back on', async () => {
      const input = `= Document Title
:numbered!:

== Colophon Section

== Another Colophon Section

== Final Colophon Section

:numbered:

== Section One

=== Section One Subsection

== Section Two

== Section Three`
      const output = await convertString(input)
      assertXpath(output, '//h1[text()="Document Title"]', 1)
      assertXpath(
        output,
        '//h2[@id="_colophon_section"][text()="Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_another_colophon_section"][text()="Another Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_final_colophon_section"][text()="Final Colophon Section"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_one"][text()="1. Section One"]',
        1
      )
      assertXpath(
        output,
        '//h3[@id="_section_one_subsection"][text()="1.1. Section One Subsection"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_two"][text()="2. Section Two"]',
        1
      )
      assertXpath(
        output,
        '//h2[@id="_section_three"][text()="3. Section Three"]',
        1
      )
    })

    test('table with asciidoc content should not disable numbering of subsequent sections', async () => {
      const input = `= Document Title
:numbered:

preamble

== Section One

|===
a|content
|===

== Section Two

content`
      const output = await convertString(input)
      assertXpath(output, '//h2[@id="_section_one"]', 1)
      assertXpath(
        output,
        '//h2[@id="_section_one"][text()="1. Section One"]',
        1
      )
      assertXpath(output, '//h2[@id="_section_two"]', 1)
      assertXpath(
        output,
        '//h2[@id="_section_two"][text()="2. Section Two"]',
        1
      )
    })

    test('should not number parts when doctype is book', async () => {
      const input = `= Document Title
:doctype: book
:numbered:

= Part 1

== Chapter 1

content

= Part 2

== Chapter 2

content`
      const output = await convertString(input)
      assertXpath(output, '(//h1)[1][text()="Document Title"]', 1)
      assertXpath(output, '(//h1)[2][text()="Part 1"]', 1)
      assertXpath(output, '(//h1)[3][text()="Part 2"]', 1)
      assertXpath(output, '(//h2)[1][text()="1. Chapter 1"]', 1)
      assertXpath(output, '(//h2)[2][text()="2. Chapter 2"]', 1)
    })

    test('should number chapters sequentially even when divided into parts', async () => {
      const input = `= Document Title
:doctype: book
:numbered:

== Chapter 1

content

= Part 1

== Chapter 2

content

= Part 2

== Chapter 3

content

== Chapter 4

content`
      const result = await convertString(input)
      for (let num = 1; num <= 4; num++) {
        assertXpath(result, `//h2[@id="_chapter_${num}"]`, 1)
        assertXpath(
          result,
          `//h2[@id="_chapter_${num}"][text()="${num}. Chapter ${num}"]`,
          1
        )
      }
    })

    test('reindex_sections should correct section enumeration after sections are modified', async () => {
      const input = `:sectnums:

== First Section

content

== Last Section

content`
      const doc = await documentFromString(input)
      const secondSection = new Section(doc, null, true)
      doc.blocks.splice(1, 0, secondSection)
      doc.reindexSections()
      const sections = doc.sections()
      for (let index = 0; index <= 2; index++) {
        assert.equal(sections[index].index, index)
        assert.equal(sections[index].numeral, String(index + 1))
        assert.equal(sections[index].number, index + 1)
      }
    })

    test('should allow sections to be renumbered using numeral or deprecated number property', async () => {
      const input = `== Somewhere in the Middle

== A Bit Later

== Nearing the End

== The End`
      const doc = await documentFromString(input, {
        attributes: { sectnums: '' },
      })
      for (const sect of doc.sections()) {
        const n = parseInt(sect.numeral, 10)
        if (n % 2 === 0) {
          sect.numeral = String(n + 1)
        } else {
          sect.number += 1
        }
      }
      const output = await doc.convert({ standalone: false })
      assertXpath(output, '//h2[text()="2. Somewhere in the Middle"]', 1)
      assertXpath(output, '//h2[text()="3. A Bit Later"]', 1)
      assertXpath(output, '//h2[text()="4. Nearing the End"]', 1)
      assertXpath(output, '//h2[text()="5. The End"]', 1)
    })
  })

  // ── Sections › Section API ────────────────────────────────────────────────────

  describe('Section API', () => {
    test('should get sections', async () => {
      const source = `= Title
:sectnums!:

== First section

:sectnums:
== Second section

[abstract]
== Abstract section

:appendix-caption: Appx
[appendix]
== Copyright and License`
      const doc = await documentFromString(source)
      assert.equal(doc.hasSections(), true)
      assert.equal(doc.getSections().length, 4)
      const firstSection = doc.getSections()[0]
      assert.equal(firstSection.getNodeName(), 'section')
      assert.equal(firstSection.getIndex(), 0)
      assert.equal(firstSection.getName(), 'First section')
      assert.equal(firstSection.getTitle(), 'First section')
      assert.equal(firstSection.title, 'First section')
      assert.equal(firstSection.getSectionName(), 'section')
      assert.equal(firstSection.isNumbered(), false)
      assert.equal(firstSection.getSectionNumeral(), '.')
      assert.equal(firstSection.isSpecial(), false)
      assert.equal(firstSection.getCaption(), undefined)
      const secondSection = doc.getSections()[1]
      assert.equal(secondSection.getIndex(), 1)
      assert.equal(secondSection.getName(), 'Second section')
      assert.equal(secondSection.getTitle(), 'Second section')
      assert.equal(secondSection.title, 'Second section')
      assert.equal(secondSection.getSectionName(), 'section')
      assert.equal(secondSection.isNumbered(), true)
      assert.equal(secondSection.getSectionNumeral(), '1.')
      assert.equal(secondSection.getSectionNumber(), '1.')
      assert.equal(secondSection.isSpecial(), false)
      assert.equal(secondSection.getCaption(), undefined)
      const abstractSection = doc.getSections()[2]
      assert.equal(abstractSection.getIndex(), 2)
      assert.equal(abstractSection.getName(), 'Abstract section')
      assert.equal(abstractSection.getTitle(), 'Abstract section')
      assert.equal(abstractSection.title, 'Abstract section')
      assert.equal(abstractSection.getSectionName(), 'abstract')
      assert.equal(abstractSection.isNumbered(), false)
      assert.equal(firstSection.getSectionNumeral(), '.')
      assert.equal(abstractSection.isSpecial(), true)
      assert.equal(abstractSection.getCaption(), undefined)
      const appendixSection = doc.getSections()[3]
      assert.equal(appendixSection.getIndex(), 3)
      assert.equal(appendixSection.getName(), 'Copyright and License')
      assert.equal(appendixSection.getTitle(), 'Copyright and License')
      assert.equal(appendixSection.title, 'Copyright and License')
      assert.equal(appendixSection.getSectionName(), 'appendix')
      assert.equal(appendixSection.getSectionNumeral(), 'A.')
      assert.equal(appendixSection.isNumbered(), true)
      assert.equal(appendixSection.isSpecial(), true)
      assert.equal(appendixSection.getCaption(), 'Appx A: ')
    })
  })
})
