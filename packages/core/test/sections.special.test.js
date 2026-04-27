// ESM conversion of sections_test.rb
// Contexts: Links and anchors, Special sections

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertXpath } from './helpers.js'
import { documentFromString, convertString, convertStringToEmbedded, blockFromString } from './harness.js'

function decodeChar (code) { return String.fromCodePoint(code) }

// ── Sections › Links and anchors ─────────────────────────────────────────────

describe('Sections', () => {
  describe('Links and anchors', () => {
    test('should include anchor if sectanchors document attribute is set', async () => {
      const input = `== Installation

Installation section.

=== Linux

Linux installation instructions.`
      const output = await convertStringToEmbedded(input, { attributes: { sectanchors: '' } })
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a[@class="anchor"][@href="#_installation"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a/following-sibling::text()="Installation"', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a[@class="anchor"][@href="#_linux"]', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a/following-sibling::text()="Linux"', 1)
    })

    test('should position after title text if sectanchors is set to after', async () => {
      const input = `== Installation

Installation section.

=== Linux

Linux installation instructions.`
      const output = await convertStringToEmbedded(input, { attributes: { sectanchors: 'after' } })
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a[@class="anchor"][@href="#_installation"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a/preceding-sibling::text()="Installation"', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a[@class="anchor"][@href="#_linux"]', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a/preceding-sibling::text()="Linux"', 1)
    })

    test('should link section if sectlinks document attribute is set', async () => {
      const input = `== Installation

Installation section.

=== Linux

Linux installation instructions.`
      const output = await convertStringToEmbedded(input, { attributes: { sectlinks: '' } })
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a[@class="link"][@href="#_installation"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="_installation"]/a[text()="Installation"]', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a[@class="link"][@href="#_linux"]', 1)
      assertXpath(output, '//*[@class="sect2"]/h3[@id="_linux"]/a[text()="Linux"]', 1)
    })

    test('should start section link after supplemental anchors when sectlinks is set', async () => {
      const input = `:sectlinks:

[#foo]
== [[fu]]Foo`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="foo"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="foo"]/a', 2)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="foo"]/a[@id="fu"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="foo"]/a[@class="link"]', 1)
      assertXpath(output, '/*[@class="sect1"]/h2[@id="foo"]/a[@id="fu"]/following-sibling::a[@class="link"]', 1)
    })
  })

  // ── Sections › Special sections ──────────────────────────────────────────────

  describe('Special sections', () => {
    test('should ignore style if it matches sectN', async () => {
      const input = `= Document Title

[sect1]
== Section Level 1

content

[sect2]
== Section Level 2

content`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '//section', 2)
      assertXpath(output, '//sect1', 0)
      assertXpath(output, '//sect2', 0)
    })

    test('should assign sectname, caption, and numeral to appendix section by default', async () => {
      const input = `[appendix]
== Attribute Options

Details`
      const appendix = await blockFromString(input)
      assert.equal(appendix.sectname, 'appendix')
      assert.equal(appendix.caption, 'Appendix A: ')
      assert.equal(appendix.numeral, 'A')
      assert.equal(appendix.number, 'A')
      assert.ok(appendix.numbered)
    })

    test('should not promote level-0 special section in book doctype to document title', async () => {
      const input = `:doctype: book

[appendix]
= Installation

Installation details here.`
      const doc = await documentFromString(input)
      assert.ok(!doc.hasHeader())
      assert.ok(doc.attributes['title'] == null)
      const appendix = doc.blocks[0]
      assert.equal(appendix.sectname, 'appendix')
      assert.equal(appendix.caption, 'Appendix A: ')
    })

    test('should prefix appendix title by numbered label even when section numbering is disabled', async () => {
      const input = `[appendix]
== Attribute Options

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2[text()="Appendix A: Attribute Options"]', 1)
    })

    test('should allow appendix number to be controlled using appendix-number attribute', async () => {
      const input = `:appendix-number: \u03b1

[appendix]
== Attribute Options

Details

[appendix]
== All the Other Stuff

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, `//h2[text()="Appendix ${decodeChar(946)}: Attribute Options"]`, 1)
      assertXpath(output, `//h2[text()="Appendix ${decodeChar(947)}: All the Other Stuff"]`, 1)
    })

    test('should use style from last block attribute line above section that defines a style', async () => {
      const input = `[glossary]
[appendix]
== Attribute Options

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2[text()="Appendix A: Attribute Options"]', 1)
    })

    test('setting ID using style shorthand should not clear section style', async () => {
      const input = `[appendix]
[#attribute-options]
== Attribute Options

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2[@id="attribute-options"][text()="Appendix A: Attribute Options"]', 1)
    })

    test('should use custom appendix caption if specified', async () => {
      const input = `:appendix-caption: App

[appendix]
== Attribute Options

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2[text()="App A: Attribute Options"]', 1)
    })

    test('should only assign letter to appendix when numbered is enabled and appendix caption is not set', async () => {
      const input = `:numbered:
:!appendix-caption:

[appendix]
== Attribute Options

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2[text()="A. Attribute Options"]', 1)
    })

    test('should increment appendix number for each appendix section', async () => {
      const input = `[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//h2)[1][text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '(//h2)[2][text()="Appendix B: Migration"]', 1)
    })

    test('should continue numbering after appendix', async () => {
      const input = `:numbered:

== First Section

content

[appendix]
== Attribute Options

content

== Migration

content`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//h2)[1][text()="1. First Section"]', 1)
      assertXpath(output, '(//h2)[2][text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '(//h2)[3][text()="2. Migration"]', 1)
    })

    test('should number appendix subsections using appendix letter', async () => {
      const input = `:numbered:

[appendix]
== Attribute Options

Details

=== Optional Attributes

Details`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//h2)[1][text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '(//h3)[1][text()="A.1. Optional Attributes"]', 1)
    })

    test('should not number level 4 section by default', async () => {
      const input = `:numbered:

== Level_1

=== Level_2

==== Level_3

===== Level_4

text`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h5', 1)
      assertXpath(output, '//h5[text()="Level_4"]', 1)
    })

    test('should only number levels up to value defined by sectnumlevels attribute', async () => {
      const input = `:numbered:
:sectnumlevels: 2

== Level_1

=== Level_2

==== Level_3

===== Level_4

text`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//h2', 1)
      assertXpath(output, '//h2[text()="1. Level_1"]', 1)
      assertXpath(output, '//h3', 1)
      assertXpath(output, '//h3[text()="1.1. Level_2"]', 1)
      assertXpath(output, '//h4', 1)
      assertXpath(output, '//h4[text()="Level_3"]', 1)
      assertXpath(output, '//h5', 1)
      assertXpath(output, '//h5[text()="Level_4"]', 1)
    })

    test('should not number sections or subsections in regions where numbered is off', async () => {
      const input = `:numbered:

== Section One

:numbered!:

[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details

=== Gotchas

Details

[glossary]
== Glossary

Terms`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//h2)[1][text()="1. Section One"]', 1)
      assertXpath(output, '(//h2)[2][text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '(//h2)[3][text()="Appendix B: Migration"]', 1)
      assertXpath(output, '(//h3)[1][text()="Gotchas"]', 1)
      assertXpath(output, '(//h2)[4][text()="Glossary"]', 1)
    })

    test('should not number sections or subsections in toc in regions where numbered is off', async () => {
      const input = `:numbered:
:toc:

== Section One

:numbered!:

[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details

=== Gotchas

Details

[glossary]
== Glossary

Terms`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="1. Section One"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Appendix B: Migration"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Gotchas"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Glossary"]', 1)
    })

    test('should only number sections in toc up to value defined by sectnumlevels attribute', async () => {
      const input = `:numbered:
:toc:
:sectnumlevels: 2
:toclevels: 3

== Level 1

=== Level 2

==== Level 3`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]//a[@href="#_level_1"][text()="1. Level 1"]', 1)
      assertXpath(output, '//*[@id="toc"]//a[@href="#_level_2"][text()="1.1. Level 2"]', 1)
      assertXpath(output, '//*[@id="toc"]//a[@href="#_level_3"][text()="Level 3"]', 1)
    })

    test('should not number special sections or their subsections by default except for appendices', async () => {
      const input = `:doctype: book
:sectnums:

[preface]
== Preface

=== Preface Subsection

content

== Section One

content

[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details

=== Gotchas

Details

[glossary]
== Glossary

Terms`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//h2)[1][text()="Preface"]', 1)
      assertXpath(output, '(//h3)[1][text()="Preface Subsection"]', 1)
      assertXpath(output, '(//h2)[2][text()="1. Section One"]', 1)
      assertXpath(output, '(//h2)[3][text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '(//h2)[4][text()="Appendix B: Migration"]', 1)
      assertXpath(output, '(//h3)[2][text()="B.1. Gotchas"]', 1)
      assertXpath(output, '(//h2)[5][text()="Glossary"]', 1)
    })

    test('should not number special sections or their subsections in toc by default except for appendices', async () => {
      const input = `:doctype: book
:sectnums:
:toc:

[preface]
== Preface

=== Preface Subsection

content

== Section One

content

[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details

=== Gotchas

Details

[glossary]
== Glossary

Terms`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Preface"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Preface Subsection"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="1. Section One"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Appendix B: Migration"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="B.1. Gotchas"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Glossary"]', 1)
    })

    test('should number special sections and their subsections when sectnums is all', async () => {
      const input = `:doctype: book
:sectnums: all

[preface]
== Preface

=== Preface Subsection

content

== Section One

content

[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details

=== Gotchas

Details

[glossary]
== Glossary

Terms`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//h2)[1][text()="1. Preface"]', 1)
      assertXpath(output, '(//h3)[1][text()="1.1. Preface Subsection"]', 1)
      assertXpath(output, '(//h2)[2][text()="2. Section One"]', 1)
      assertXpath(output, '(//h2)[3][text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '(//h2)[4][text()="Appendix B: Migration"]', 1)
      assertXpath(output, '(//h3)[2][text()="B.1. Gotchas"]', 1)
      assertXpath(output, '(//h2)[5][text()="3. Glossary"]', 1)
    })

    test('should number special sections and their subsections in toc when sectnums is all', async () => {
      const input = `:doctype: book
:sectnums: all
:toc:

[preface]
== Preface

=== Preface Subsection

content

== Section One

content

[appendix]
== Attribute Options

Details

[appendix]
== Migration

Details

=== Gotchas

Details

[glossary]
== Glossary

Terms`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="1. Preface"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="1.1. Preface Subsection"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="2. Section One"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Appendix A: Attribute Options"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="Appendix B: Migration"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="B.1. Gotchas"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul//li/a[text()="3. Glossary"]', 1)
    })

    test('level 0 special sections in multipart book should be coerced to level 1', async () => {
      const input = `= Multipart Book
Doc Writer
:doctype: book

[preface]
= Preface

Preface text

[appendix]
= Appendix

Appendix text`
      const output = await convertString(input)
      assertXpath(output, '//h2[@id = "_preface"]', 1)
      assertXpath(output, '//h2[@id = "_appendix"]', 1)
    })

    test('should output docbook elements that correspond to special sections in book doctype', async () => {
      const input = `= Multipart Book
:doctype: book
:idprefix:

[abstract]
= Abstract Title

Normal chapter (no abstract in book)

[dedication]
= Dedication Title

Dedication content

[preface]
= Preface Title

Preface content

=== Preface sub-section

Preface subsection content

= Part 1

[partintro]
.Part intro title
Part intro content

== Chapter 1

blah blah

== Chapter 2

blah blah

= Part 2

[partintro]
blah blah

== Chapter 3

blah blah

== Chapter 4

blah blah

[appendix]
= Appendix Title

Appendix content

=== Appendix sub-section

Appendix sub-section content

[bibliography]
= Bibliography Title

Bibliography content

[glossary]
= Glossary Title

Glossary content

[colophon]
= Colophon Title

Colophon content

[index]
= Index Title`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '/book/chapter[@xml:id="abstract_title"]', 1)
      assertXpath(output, '/book/chapter[@xml:id="abstract_title"]/title[text()="Abstract Title"]', 1)
      assertXpath(output, '/book/chapter/following-sibling::dedication[@xml:id="dedication_title"]', 1)
      assertXpath(output, '/book/chapter/following-sibling::dedication[@xml:id="dedication_title"]/title[text()="Dedication Title"]', 1)
      assertXpath(output, '/book/dedication/following-sibling::preface[@xml:id="preface_title"]', 1)
      assertXpath(output, '/book/dedication/following-sibling::preface[@xml:id="preface_title"]/title[text()="Preface Title"]', 1)
      assertXpath(output, '/book/preface/section[@xml:id="preface_sub_section"]', 1)
      assertXpath(output, '/book/preface/section[@xml:id="preface_sub_section"]/title[text()="Preface sub-section"]', 1)
      assertXpath(output, '/book/preface/following-sibling::part[@xml:id="part_1"]', 1)
      assertXpath(output, '/book/preface/following-sibling::part[@xml:id="part_1"]/title[text()="Part 1"]', 1)
      assertXpath(output, '/book/part[@xml:id="part_1"]/partintro', 1)
      assertXpath(output, '/book/part[@xml:id="part_1"]/partintro/title[text()="Part intro title"]', 1)
      assertXpath(output, '/book/part[@xml:id="part_1"]/partintro/following-sibling::chapter[@xml:id="chapter_1"]', 1)
      assertXpath(output, '/book/part[@xml:id="part_1"]/partintro/following-sibling::chapter[@xml:id="chapter_1"]/title[text()="Chapter 1"]', 1)
      assertXpath(output, '(/book/part)[2]/following-sibling::appendix[@xml:id="appendix_title"]', 1)
      assertXpath(output, '(/book/part)[2]/following-sibling::appendix[@xml:id="appendix_title"]/title[text()="Appendix Title"]', 1)
      assertXpath(output, '/book/appendix/section[@xml:id="appendix_sub_section"]', 1)
      assertXpath(output, '/book/appendix/section[@xml:id="appendix_sub_section"]/title[text()="Appendix sub-section"]', 1)
      assertXpath(output, '/book/appendix/following-sibling::bibliography[@xml:id="bibliography_title"]', 1)
      assertXpath(output, '/book/appendix/following-sibling::bibliography[@xml:id="bibliography_title"]/title[text()="Bibliography Title"]', 1)
      assertXpath(output, '/book/bibliography/following-sibling::glossary[@xml:id="glossary_title"]', 1)
      assertXpath(output, '/book/bibliography/following-sibling::glossary[@xml:id="glossary_title"]/title[text()="Glossary Title"]', 1)
      assertXpath(output, '/book/glossary/following-sibling::colophon[@xml:id="colophon_title"]', 1)
      assertXpath(output, '/book/glossary/following-sibling::colophon[@xml:id="colophon_title"]/title[text()="Colophon Title"]', 1)
      assertXpath(output, '/book/colophon/following-sibling::index[@xml:id="index_title"]', 1)
      assertXpath(output, '/book/colophon/following-sibling::index[@xml:id="index_title"]/title[text()="Index Title"]', 1)
    })

    test('abstract section maps to abstract element in docbook for article doctype', async () => {
      const input = `= Article
:idprefix:

[abstract]
== Abstract Title

Abstract content`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '/article/info/abstract[@xml:id="abstract_title"]', 1)
      assertXpath(output, '/article/info/abstract[@xml:id="abstract_title"]/title[text()="Abstract Title"]', 1)
    })

    test('should allow a special section to be nested at arbitrary depth in DocBook output', async () => {
      const input = `= Document Title
:doctype: book

== Glossaries

[glossary]
=== Glossary A

Glossaries are optional.
Glossaries entries are an example of a style of AsciiDoc description lists.

[glossary]
A glossary term::
The corresponding definition.

A second glossary term::
The corresponding definition.`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '//glossary', 1)
      assertXpath(output, '//chapter/glossary', 1)
      assertXpath(output, '//glossary/title[text()="Glossary A"]', 1)
      assertXpath(output, '//glossary/glossentry', 2)
    })

    test('should drop title on special section in DocBook output if notitle or untitled option is set', async () => {
      for (const option of ['notitle', 'untitled']) {
        const input = `[dedication%${option}]
== Dedication

content`
        const output = await convertStringToEmbedded(input, { backend: 'docbook' })
        assertXpath(output, '/dedication', 1)
        assertXpath(output, '/dedication/title', 0)
      }
    })
  })
})
