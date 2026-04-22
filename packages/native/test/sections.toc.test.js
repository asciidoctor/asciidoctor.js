// ESM conversion of sections_test.rb — context 'Table of Contents'

import { test, describe } from 'node:test'

import { assertXpath, assertCss } from './helpers.js'
import { convertString, convertStringToEmbedded } from './harness.js'

// ── Sections › Table of Contents ─────────────────────────────────────────────

describe('Sections', () => {
  describe('Table of Contents', () => {
    test('should output unnumbered table of contents in header if toc attribute is set', async () => {
      const input = `= Article
:toc:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...

=== Interlude

While they were waiting...

== Section Three

That's all she wrote!`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/*[@id="toctitle"][text()="Table of Contents"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul[@class="sectlevel1"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//ul', 2)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//li', 4)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="Section One"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul[@class="sectlevel2"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul/li', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul/li/a[@href="#_interlude"][text()="Interlude"]', 1)
      assertXpath(output, '((//*[@id="header"]//*[@id="toc"]/ul)[1]/li)[3]/a[@href="#_section_three"][text()="Section Three"]', 1)
    })

    test('should output numbered table of contents in header if toc and numbered attributes are set', async () => {
      const input = `= Article
:toc:
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...

=== Interlude

While they were waiting...

== Section Three

That's all she wrote!`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/*[@id="toctitle"][text()="Table of Contents"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//ul', 2)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//li', 4)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul/li', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul/li/a[@href="#_interlude"][text()="2.1. Interlude"]', 1)
      assertXpath(output, '((//*[@id="header"]//*[@id="toc"]/ul)[1]/li)[3]/a[@href="#_section_three"][text()="3. Section Three"]', 1)
    })

    test('should output a table of contents that honors numbered setting at position of section in document', async () => {
      const input = `= Article
:toc:
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...

=== Interlude

While they were waiting...

:numbered!:

== Section Three

That's all she wrote!`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/*[@id="toctitle"][text()="Table of Contents"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//ul', 2)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//li', 4)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
      assertXpath(output, '((//*[@id="header"]//*[@id="toc"]/ul)[1]/li)[3]/a[@href="#_section_three"][text()="Section Three"]', 1)
    })

    test('should not number parts in table of contents for book doctype when numbered attribute is set', async () => {
      const input = `= Book
:doctype: book
:toc:
:numbered:

= Part 1

== First Section of Part 1

blah

== Second Section of Part 1

blah

= Part 2

== First Section of Part 2

blah`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul', 1)
      assertXpath(output, '//*[@id="toc"]/ul[@class="sectlevel0"]', 1)
      assertXpath(output, '//*[@id="toc"]/ul[@class="sectlevel0"]/li', 2)
      assertXpath(output, '(//*[@id="toc"]/ul[@class="sectlevel0"]/li)[1]/a[text()="Part 1"]', 1)
      assertXpath(output, '(//*[@id="toc"]/ul[@class="sectlevel0"]/li)[2]/a[text()="Part 2"]', 1)
      assertXpath(output, '(//*[@id="toc"]/ul[@class="sectlevel0"]/li)[1]/ul', 1)
      assertXpath(output, '(//*[@id="toc"]/ul[@class="sectlevel0"]/li)[1]/ul[@class="sectlevel1"]', 1)
      assertXpath(output, '(//*[@id="toc"]/ul[@class="sectlevel0"]/li)[1]/ul/li', 2)
      assertXpath(output, '((//*[@id="toc"]/ul[@class="sectlevel0"]/li)[1]/ul/li)[1]/a[text()="1. First Section of Part 1"]', 1)
    })

    test('should output table of contents in header if toc2 attribute is set', async () => {
      const input = `= Article
:toc2:
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, 'body.article.toc2.toc-left', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc2"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
    })

    test('should set toc position if toc attribute is set to position', async () => {
      const input = `= Article
:toc: >
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, 'body.article.toc2.toc-right', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc2"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
    })

    test('should set toc position if toc and toc-position attributes are set', async () => {
      const input = `= Article
:toc:
:toc-position: right
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, 'body.article.toc2.toc-right', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc2"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
    })

    test('should set toc position if toc2 and toc-position attribute are set', async () => {
      const input = `= Article
:toc2:
:toc-position: right
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, 'body.article.toc2.toc-right', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc2"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
    })

    test('should set toc position if toc attribute is set to direction', async () => {
      const input = `= Article
:toc: right
:numbered:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, 'body.article.toc2.toc-right', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc2"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[1]/a[@href="#_section_one"][text()="1. Section One"]', 1)
    })

    test('should set toc placement to preamble if toc attribute is set to preamble', async () => {
      const input = `= Article
:toc: preamble

Yada yada

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, '#preamble #toc', 1)
      assertCss(output, '#preamble .sectionbody + #toc', 1)
    })

    test('should use document attributes toc-class, toc-title and toclevels to create toc', async () => {
      const input = `= Article
:toc:
:toc-title: Contents
:toc-class: toc2
:toclevels: 1

== Section 1

=== Section 1.1

==== Section 1.1.1

==== Section 1.1.2

=== Section 1.2

== Section 2

Fin.`
      const output = await convertString(input)
      assertCss(output, '#header #toc', 1)
      assertCss(output, '#header #toc.toc2', 1)
      assertCss(output, '#header #toc li', 2)
      assertCss(output, '#header #toc #toctitle', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/*[@id="toctitle"][text()="Contents"]', 1)
    })

    test('should only show parts in toc if toclevels is 0', async () => {
      const input = `= Book
:doctype: book
:toc:
:toclevels: 0

= Part 1

== Chapter 1

= Part 2

== Chapter 2`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toc a', 2)
      assertCss(output, '#toc a[href="#_part_1"]', 1)
      assertCss(output, '#toc a[href="#_part_2"]', 1)
      assertCss(output, '#toc a[href="#_chapter_1"]', 0)
      assertCss(output, '#toc a[href="#_chapter_2"]', 0)
    })

    test('should only show parts in toc if toclevels is 0 and book starts with special section', async () => {
      const input = `= Book
:doctype: book
:toc:
:toclevels: 0

[dedication]
= Dedication

For my family.

= Part 1

== Chapter 1

= Part 2

== Chapter 2`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toc a', 2)
      assertCss(output, '#toc a[href="#_part_1"]', 1)
      assertCss(output, '#toc a[href="#_part_2"]', 1)
      assertCss(output, '#toc a[href="#_chapter_1"]', 0)
      assertCss(output, '#toc a[href="#_chapter_2"]', 0)
    })

    test('should not move parts down a level in toc if book starts with special section', async () => {
      const input = `= Book
:doctype: book
:toc:
:toclevels: 0

[dedication]
= Dedication

For my family.

= Part 1

== Chapter 1

= Part 2

== Chapter 2`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toc > ul.sectlevel0', 1)
      assertCss(output, '#toc > ul.sectlevel0 > li:not([class])', 2)
      assertCss(output, '#toc a', 2)
      assertCss(output, '#toc a[href="#_part_1"]', 1)
      assertCss(output, '#toc a[href="#_part_2"]', 1)
    })

    test('should add class to special sections in TOC that precede first part', async () => {
      const input = `= Book
:doctype: book
:toc:
:toclevels: 1

[dedication]
= Dedication

For my family.

= Part 1

== Chapter 1

= Part 2

== Chapter 2`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toc > ul.sectlevel0', 1)
      assertCss(output, '#toc a', 5)
      assertCss(output, '#toc > ul.sectlevel0 > li.sectlevel1', 1)
      assertCss(output, '#toc > ul.sectlevel0 > li.sectlevel1 a[href="#_dedication"]', 1)
      assertCss(output, '#toc > ul.sectlevel0 ul.sectlevel1', 2)
    })

    test('should coerce minimum toclevels to 1 if first section of document is not a part', async () => {
      const input = `= Article
:doctype: book
:toc:
:toclevels: 0

== Chapter 1

== Chapter 2`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toc a[href="#_chapter_1"]', 1)
      assertCss(output, '#toc a[href="#_chapter_2"]', 1)
    })

    test('should not output table of contents if toc-placement attribute is unset', async () => {
      const input = `= Article
:toc:
:toc-placement!:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="toc"]', 0)
    })

    test('should output table of contents at location of toc macro', async () => {
      const input = `= Article
:toc:
:toc-placement: macro

Once upon a time...

toc::[]

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, '#preamble #toc', 1)
      assertCss(output, '#preamble .paragraph + #toc', 1)
    })

    test('should output table of contents at location of toc macro in embedded document', async () => {
      const input = `= Article
:toc:
:toc-placement: macro

Once upon a time...

toc::[]

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '#preamble:root #toc', 1)
      assertCss(output, '#preamble:root .paragraph + #toc', 1)
    })

    test('should output table of contents at default location in embedded document if toc attribute is set', async () => {
      const input = `= Article
:showtitle:
:toc:

Once upon a time...

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'h1:root', 1)
      assertCss(output, 'h1:root + #toc:root', 1)
      assertCss(output, 'h1:root + #toc:root + #preamble:root', 1)
    })

    test('should not activate toc macro if toc-placement is not set', async () => {
      const input = `= Article
:toc:

Once upon a time...

toc::[]

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toctitle', 1)
      assertCss(output, '.toc', 1)
      assertCss(output, '#content .toc', 0)
    })

    test('should only output toc at toc macro if toc is macro', async () => {
      const input = `= Article
:toc: macro

Once upon a time...

toc::[]

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toctitle', 1)
      assertCss(output, '.toc', 1)
      assertCss(output, '#content .toc', 1)
    })

    test('should use global attributes for toc-title, toc-class and toclevels for toc macro', async () => {
      const input = `= Article
:toc:
:toc-placement: macro
:toc-title: Contents
:toc-class: contents
:toclevels: 1

Preamble.

toc::[]

== Section 1

=== Section 1.1

==== Section 1.1.1

==== Section 1.1.2

=== Section 1.2

== Section 2

Fin.`
      const output = await convertString(input)
      assertCss(output, '#toc', 1)
      assertCss(output, '#toctitle', 1)
      assertCss(output, '#preamble #toc', 1)
      assertCss(output, '#preamble #toc.contents', 1)
      assertXpath(output, '//*[@id="toc"]/*[@class="title"][text() = "Contents"]', 1)
      assertCss(output, '#toc li', 2)
      assertXpath(output, '(//*[@id="toc"]//li)[1]/a[text() = "Section 1"]', 1)
      assertXpath(output, '(//*[@id="toc"]//li)[2]/a[text() = "Section 2"]', 1)
    })

    test('should honor id, title, role and level attributes on toc macro', async () => {
      const input = `= Article
:toc:
:toc-placement: macro
:toc-title: Ignored
:toc-class: ignored
:tocmacrolevels: 3

Preamble.

[[contents]]
[role="contents"]
.Contents
toc::[levels={tocmacrolevels}]

== Section 1

=== Section 1.1

==== Section 1.1.1

==== Section 1.1.2

=== Section 1.2

== Section 2

Fin.`
      const output = await convertString(input)
      assertCss(output, '#toc', 0)
      assertCss(output, '#toctitle', 0)
      assertCss(output, '#preamble #contents', 1)
      assertCss(output, '#preamble #contents.contents', 1)
      assertXpath(output, '//*[@id="contents"]/*[@class="title"][text() = "Contents"]', 1)
      assertCss(output, '#contents li', 6)
      assertCss(output, '#contents a[href="#_section_1"]', 1)
      assertCss(output, '#contents a[href="#_section_1_1"]', 1)
      assertCss(output, '#contents a[href="#_section_1_1_1"]', 1)
    })

    test('should allow section to override toclevels for descendant sections', async () => {
      const input = `= Document Title
:toc:
:toclevels: 1
:nofooter:

== Level 1

=== Level 2

[toclevels=2]
== Another Level 1

=== Another Level 2`
      const output = await convertString(input)
      assertCss(output, '#toc a[href="#_level_2"]', 0)
      assertCss(output, '#toc a[href="#_another_level_2"]', 1)
    })

    test('should allow section to remove itself from toc by setting toclevels to less than own section level', async () => {
      const input = `= Document Title
:doctype: book
:toc:
:toclevels: 3

[#ch1]
== Chapter

[#ch1-s1]
=== Chapter Section

[appendix#app1,toclevels=0]
== Lorem Ipsum

[#app1-s1]
=== Appendix Section`
      const output = await convertString(input)
      assertCss(output, '#toc a[href="#ch1"]', 1)
      assertCss(output, '#toc a[href="#ch1-s1"]', 1)
      assertCss(output, '#toc a[href="#app1"]', 0)
      assertCss(output, '#toc a[href="#app1-s1"]', 0)
    })

    test('child toc levels should not have additional bullet at parent level in html', async () => {
      const input = `= Article
:toc:

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...

=== Interlude

While they were waiting...

== Section Three

That's all she wrote!`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"][@class="toc"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/*[@id="toctitle"][text()="Table of Contents"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//ul', 2)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]//li', 4)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[2]/a[@href="#_section_two"][text()="Section Two"]', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul/li', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li[2]/ul/li', 1)
      assertXpath(output, '//*[@id="header"]//*[@id="toc"]/ul/li/ul/li/a[@href="#_interlude"][text()="Interlude"]', 1)
      assertXpath(output, '((//*[@id="header"]//*[@id="toc"]/ul)[1]/li)[3]/a[@href="#_section_three"][text()="Section Three"]', 1)
    })

    test('should not display a table of contents if document has no sections', async () => {
      const inputSrc = `= Document Title
:toc:

toc::[]

This document has no sections.

It only has content.`
      for (const placement of ['', 'left', 'preamble', 'macro']) {
        const input = inputSrc.replace(':toc:', `:toc: ${placement}`)
        const output = await convertString(input)
        assertCss(output, '#toctitle', 0)
      }
    })

    test('should drop anchors from contents of entries in table of contents', async () => {
      const input = `= Document Title
:toc:

== [[un]]Section One

content

== [[two]][[deux]]Section Two

content

== Plant Trees by https://ecosia.org[Searching]

content`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@id="toc"]', 1)
      assertXpath(output, '/*[@id="toc"]//li', 3)
      assertXpath(output, '/*[@id="toc"]//li[1]/a[@href="#_section_one"][text()="Section One"]', 1)
      assertXpath(output, '/*[@id="toc"]//li[2]/a[@href="#_section_two"][text()="Section Two"]', 1)
      assertXpath(output, '/*[@id="toc"]//li[3]/a[@href="#_plant_trees_by_searching"][text()="Plant Trees by Searching"]', 1)
    })

    test('should not remove non-anchor tags from contents of entries in table of contents', async () => {
      const input = `= Document Title
:toc:
:icons: font

== \`run\` command

content

== icon:bug[] Issues

content

== https://ecosia.org[_Sustainable_ Searches]

content`
      const output = await convertStringToEmbedded(input, { safe: 'safe' })
      assertXpath(output, '/*[@id="toc"]', 1)
      assertXpath(output, '/*[@id="toc"]//li', 3)
      assertXpath(output, '/*[@id="toc"]//li[1]/a[@href="#_run_command"]/code[text()="run"]', 1)
      assertXpath(output, '/*[@id="toc"]//li[2]/a[@href="#_issues"]/span[@class="icon"]', 1)
      assertXpath(output, '/*[@id="toc"]//li[3]/a[@href="#_sustainable_searches"]/em[text()="Sustainable"]', 1)
    })
  })
})
