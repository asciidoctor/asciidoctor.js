// ESM conversion of sections_test.rb
// Contexts: heading patterns in blocks, article doctype, book doctype

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertXpath, assertCss, assertMessage, usingMemoryLogger } from './helpers.js'
import { documentFromString, convertString, convertStringToEmbedded } from './harness.js'

// ── Sections › heading patterns in blocks ────────────────────────────────────

describe('Sections', () => {
  describe('heading patterns in blocks', () => {
    test('should not interpret a listing block as a heading', async () => {
      const input = `Section
-------

----
code
----

fin.`
      const output = await convertString(input)
      assertXpath(output, '//h2', 1)
    })

    test('should not interpret an open block as a heading', async () => {
      const input = `Section
-------

--
ha
--

fin.`
      const output = await convertString(input)
      assertXpath(output, '//h2', 1)
    })

    test('should not interpret an attribute list as a heading', async () => {
      const input = `Section
=======

preamble

[TIP]
====
This should be a tip, not a heading.
====`
      const output = await convertString(input)
      assertXpath(output, '//*[@class="admonitionblock tip"]//p[text() = "This should be a tip, not a heading."]', 1)
    })

    test('should not match a heading in a description list', async () => {
      const input = `Section
-------

term1::
+
----
list = [1, 2, 3];
----
term2::
== not a heading
term3:: def

//

fin.`
      const output = await convertString(input)
      assertXpath(output, '//h2', 1)
      assertXpath(output, '//dl', 1)
    })

    test('should not match a heading in a bulleted list', async () => {
      const input = `Section
-------

* first
+
----
list = [1, 2, 3];
----
+
* second
== not a heading
* third

fin.`
      const output = await convertString(input)
      assertXpath(output, '//h2', 1)
      assertXpath(output, '//ul', 1)
    })

    test('should not match a heading in a block', async () => {
      const input = `====

== not a heading

====`
      const output = await convertString(input)
      assertXpath(output, '//h2', 0)
      assertXpath(output, '//*[@class="exampleblock"]//p[text() = "== not a heading"]', 1)
    })
  })

  // ── Sections › article doctype ───────────────────────────────────────────────

  describe('article doctype', () => {
    test('should create only sections in docbook backend', async () => {
      const input = `= Article
Doc Writer

== Section 1

The adventure.

=== Subsection One

It was a dark and stormy night...

=== Subsection Two

They couldn't believe their eyes when...

== Section 2

The return.

=== Subsection Three

While they were returning...

=== Subsection Four

That's all she wrote!`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '//part', 0)
      assertXpath(output, '//chapter', 0)
      assertXpath(output, '/article/section', 2)
      assertXpath(output, '/article/section[1]/title[text() = "Section 1"]', 1)
      assertXpath(output, '/article/section[2]/title[text() = "Section 2"]', 1)
      assertXpath(output, '/article/section/section', 4)
      assertXpath(output, '/article/section[1]/section[1]/title[text() = "Subsection One"]', 1)
      assertXpath(output, '/article/section[2]/section[1]/title[text() = "Subsection Three"]', 1)
    })
  })

  // ── Sections › book doctype ──────────────────────────────────────────────────

  describe('book doctype', () => {
    test('document title with level 0 headings', async () => {
      const input = `= Book
Doc Writer
:doctype: book

= Chapter One

[partintro]
It was a dark and stormy night...

== Scene One

Someone's gonna get axed.

= Chapter Two

[partintro]
They couldn't believe their eyes when...

== Interlude

While they were waiting...

= Chapter Three

== Scene One

That's all she wrote!`
      const output = await convertString(input)
      assertCss(output, 'body.book', 1)
      assertCss(output, 'h1', 4)
      assertCss(output, '#header h1', 1)
      assertCss(output, '#content h1', 3)
      assertCss(output, '#content h1.sect0', 3)
      assertCss(output, 'h2', 3)
      assertCss(output, '#content h2', 3)
      assertXpath(output, '//h1[@id="_chapter_one"][text() = "Chapter One"]', 1)
      assertXpath(output, '//h1[@id="_chapter_two"][text() = "Chapter Two"]', 1)
      assertXpath(output, '//h1[@id="_chapter_three"][text() = "Chapter Three"]', 1)
      assertCss(output, '#_chapter_one + .openblock.partintro p', 1)
      assertCss(output, '#_chapter_two + .openblock.partintro p', 1)
    })

    test('should print error if level 0 section comes after nested section and doctype is not book', async () => {
      const input = `= Document Title

== Level 1 Section

=== Level 2 Section

= Level 0 Section`
      await usingMemoryLogger(async (logger) => {
        await convertString(input)
        assertMessage(logger, 'ERROR', '<stdin>: line 7: level 0 sections can only be used when doctype is book')
      })
    })

    test('should add class matching role to part', async () => {
      const input = `= Book Title
:doctype: book

[.newbie]
= Part 1

== Chapter A

content

= Part 2

== Chapter B

content`
      const result = await convertStringToEmbedded(input)
      assertCss(result, 'h1.sect0', 2)
      assertCss(result, 'h1.sect0.newbie', 1)
      assertCss(result, 'h1.sect0.newbie#_part_1', 1)
    })

    test('should assign appropriate sectname for section type', async () => {
      const input = `= Book Title
:doctype: book
:idprefix:
:idseparator: -

= Part Title

== Chapter Title

=== Section Title

content

[appendix]
== Appendix Title

=== Appendix Section Title

content`
      const doc = await documentFromString(input)
      assert.equal(doc.header.sectname, 'header')
      assert.equal(doc.findBy({ id: 'part-title' })[0].sectname, 'part')
      assert.equal(doc.findBy({ id: 'chapter-title' })[0].sectname, 'chapter')
      assert.equal(doc.findBy({ id: 'section-title' })[0].sectname, 'section')
      assert.equal(doc.findBy({ id: 'appendix-title' })[0].sectname, 'appendix')
      assert.equal(doc.findBy({ id: 'appendix-section-title' })[0].sectname, 'section')
    })

    test('should allow part intro to be defined using special section', async () => {
      const input = `= Book
:doctype: book

= Part 1

[partintro]
== Part Intro

Part intro content

== Chapter 1

Chapter content`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '/book/part[@xml:id="_part_1"]', 1)
      assertXpath(output, '/book/part[@xml:id="_part_1"]/partintro', 1)
      assertXpath(output, '/book/part[@xml:id="_part_1"]/partintro[@xml:id="_part_intro"]', 1)
      assertXpath(output, '/book/part[@xml:id="_part_1"]/partintro[@xml:id="_part_intro"]/title[text()="Part Intro"]', 1)
      assertXpath(output, '/book/part[@xml:id="_part_1"]/partintro[@xml:id="_part_intro"]/following-sibling::chapter[@xml:id="_chapter_1"]', 1)
    })

    test('should add partintro style to child paragraph of part', async () => {
      const input = `= Book
:doctype: book

= Part 1

part intro--a summary

== Chapter 1`
      const doc = await documentFromString(input)
      const partintro = doc.blocks[0].blocks[0]
      assert.equal(partintro.context, 'open')
      assert.equal(partintro.contentModel, 'compound')
      assert.deepEqual(partintro.lines, [])
      assert.deepEqual(partintro.subs, [])
      assert.equal(partintro.style, 'partintro')
      assert.equal(partintro.blocks[0].context, 'paragraph')
      assert.deepEqual(partintro.blocks[0].lines, ['part intro--a summary'])
      assert.ok((await partintro.convert()).includes('part intro&#8212;&#8203;a summary'))
    })

    test('should preserve title on partintro defined as partintro paragraph', async () => {
      const input = `= Book
:doctype: book

= Part 1

.Intro
[partintro]
Read this first.

== Chapter 1`
      const doc = await documentFromString(input)
      const partintro = doc.blocks[0].blocks[0]
      assert.equal(partintro.context, 'open')
      assert.equal(partintro.title, 'Intro')
    })

    test('should not promote title on partintro defined as normal paragraph', async () => {
      const input = `= Book
:doctype: book

= Part 1

.Intro
Read this first.

== Chapter 1`
      const doc = await documentFromString(input)
      const partintro = doc.blocks[0].blocks[0]
      assert.equal(partintro.context, 'open')
      assert.equal(partintro.title, null)
      assert.equal(partintro.blocks[0].title, 'Intro')
    })

    test('should add partintro style to child open block of part', async () => {
      const input = `= Book
:doctype: book

= Part 1

--
part intro
--

== Chapter 1`
      const doc = await documentFromString(input)
      const partintro = doc.blocks[0].blocks[0]
      assert.equal(partintro.context, 'open')
      assert.equal(partintro.contentModel, 'compound')
      assert.equal(partintro.style, 'partintro')
      assert.equal(partintro.blocks[0].context, 'paragraph')
    })

    test('should wrap child paragraphs of part in partintro open block', async () => {
      const input = `= Book
:doctype: book

= Part 1

part intro

more part intro

== Chapter 1`
      const doc = await documentFromString(input)
      const partintro = doc.blocks[0].blocks[0]
      assert.equal(partintro.context, 'open')
      assert.equal(partintro.contentModel, 'compound')
      assert.equal(partintro.style, 'partintro')
      assert.equal(partintro.blocks.length, 2)
      assert.equal(partintro.blocks[0].context, 'paragraph')
      assert.equal(partintro.blocks[1].context, 'paragraph')
    })

    test('should wrap abstract in implicit part intro in info tag when converting to DocBook', async () => {
      const input = `= Book
:doctype: book

= Part 1

[abstract]
Abstract of part.

more part intro

== Chapter 1`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '//abstract', 1)
      assertXpath(output, '//partintro/info/abstract', 1)
    })

    test('should wrap abstract in part intro section in info tag when converting to DocBook', async () => {
      const input = `= Book
:doctype: book

= Part 1

[partintro]
== Part Intro

[abstract]
Abstract of part.

more part intro

== Chapter 1`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '//abstract', 1)
      assertXpath(output, '//partintro/info/abstract', 1)
      assertXpath(output, '//partintro/simpara', 1)
    })

    test('should warn if part has no sections', async () => {
      const input = `= Book
:doctype: book

= Part 1

[partintro]
intro`
      await usingMemoryLogger(async (logger) => {
        await documentFromString(input)
        assertMessage(logger, 'ERROR', '<stdin>: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)')
      })
    })

    test('should create parts and chapters in docbook backend', async () => {
      const input = `= Book
Doc Writer
:doctype: book

= Part 1

[partintro]
The adventure.

== Chapter One

It was a dark and stormy night...

== Chapter Two

They couldn't believe their eyes when...

= Part 2

[partintro]
The return.

== Chapter Three

While they were returning...

== Chapter Four

That's all she wrote!`
      const output = await convertString(input, { backend: 'docbook' })
      assertXpath(output, '//chapter/chapter', 0)
      assertXpath(output, '/book/part', 2)
      assertXpath(output, '/book/part[1]/title[text() = "Part 1"]', 1)
      assertXpath(output, '/book/part[2]/title[text() = "Part 2"]', 1)
      assertXpath(output, '/book/part/chapter', 4)
      assertXpath(output, '/book/part[1]/chapter[1]/title[text() = "Chapter One"]', 1)
      assertXpath(output, '/book/part[2]/chapter[1]/title[text() = "Chapter Three"]', 1)
    })

    test('subsections in preface and appendix should start at level 2', async () => {
      const input = `= Multipart Book
Doc Writer
:doctype: book

[preface]
= Preface

Preface content

=== Preface subsection

Preface subsection content

= Part 1

.Part intro title
[partintro]
Part intro content

== Chapter 1

content

[appendix]
= Appendix

Appendix content

=== Appendix subsection

Appendix subsection content`
      let output
      await usingMemoryLogger(async (logger) => {
        output = await convertString(input, { backend: 'docbook' })
        assert.equal(logger.messages.length, 0)
      })
      assertXpath(output, '/book/preface', 1)
      assertXpath(output, '/book/preface/section', 1)
      assertXpath(output, '/book/part', 1)
      assertXpath(output, '/book/part/partintro', 1)
      assertXpath(output, '/book/part/partintro/title', 1)
      assertXpath(output, '/book/part/partintro/simpara', 1)
      assertXpath(output, '/book/appendix', 1)
      assertXpath(output, '/book/appendix/section', 1)
    })
  })
})
