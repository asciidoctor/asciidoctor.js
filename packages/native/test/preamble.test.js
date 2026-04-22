// ESM conversion of preamble_test.rb
// Tests for preamble handling in Asciidoctor.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertXpath, decodeChar } from './helpers.js'
import { documentFromString, convertString } from './harness.js'

// ── Preamble ──────────────────────────────────────────────────────────────────

describe('Preamble', () => {
  test('title and single paragraph preamble before section', async () => {
    const input = `= Title

Preamble paragraph 1.

== First Section

Section paragraph 1.`
    const result = await convertString(input)
    assertXpath(result, '//p', 2)
    assertXpath(result, '//*[@id="preamble"]', 1)
    assertXpath(result, '//*[@id="preamble"]//p', 1)
    assertXpath(result, '//*[@id="preamble"]/following-sibling::*//h2[@id="_first_section"]', 1)
    assertXpath(result, '//*[@id="preamble"]/following-sibling::*//p', 1)
  })

  test('title of preface is blank by default in DocBook output', async () => {
    const input = `= Document Title
:doctype: book

Preface content.

== First Section

Section content.`
    const result = await convertString(input, { backend: 'docbook' })
    assertXpath(result, '//preface/title', 1)
    // The preface title should be empty (no text node or empty text)
    assertXpath(result, '//preface/title[not(normalize-space())]', 1)
  })

  test('preface-title attribute is assigned as title of preface in DocBook output', async () => {
    const input = `= Document Title
:doctype: book
:preface-title: Preface

Preface content.

== First Section

Section content.`
    const result = await convertString(input, { backend: 'docbook' })
    assertXpath(result, '//preface/title[text()="Preface"]', 1)
  })

  test('title and multi-paragraph preamble before section', async () => {
    const input = `= Title

Preamble paragraph 1.

Preamble paragraph 2.

== First Section

Section paragraph 1.`
    const result = await convertString(input)
    assertXpath(result, '//p', 3)
    assertXpath(result, '//*[@id="preamble"]', 1)
    assertXpath(result, '//*[@id="preamble"]//p', 2)
    assertXpath(result, '//*[@id="preamble"]/following-sibling::*//h2[@id="_first_section"]', 1)
    assertXpath(result, '//*[@id="preamble"]/following-sibling::*//p', 1)
  })

  test('should not wrap content in preamble if document has title but no sections', async () => {
    const input = `= Title

paragraph`
    const result = await convertString(input)
    assertXpath(result, '//p', 1)
    assertXpath(result, '//*[@id="content"]/*[@class="paragraph"]/p', 1)
    assertXpath(result, '//*[@id="content"]/*[@class="paragraph"]/following-sibling::*', 0)
  })

  test('title and section without preamble', async () => {
    const input = `= Title

== First Section

Section paragraph 1.`
    const result = await convertString(input)
    assertXpath(result, '//p', 1)
    assertXpath(result, '//*[@id="preamble"]', 0)
    assertXpath(result, '//h2[@id="_first_section"]', 1)
  })

  test('no title with preamble and section', async () => {
    const input = `Preamble paragraph 1.

== First Section

Section paragraph 1.`
    const result = await convertString(input)
    assertXpath(result, '//p', 2)
    assertXpath(result, '//*[@id="preamble"]', 0)
    assertXpath(result, '//h2[@id="_first_section"]/preceding::p', 1)
  })

  test('preamble in book doctype', async () => {
    const input = `= Book
:doctype: book

Back then...

= Chapter One

[partintro]
It was a dark and stormy night...

== Scene One

Someone's gonna get axed.

= Chapter Two

[partintro]
They couldn't believe their eyes when...

== Scene One

The axe came swinging.`
    const doc = await documentFromString(input, { standalone: true })
    assert.equal(await doc.doctype, 'book')
    const output = await doc.convert()
    assertXpath(output, '//h1', 3)
    assertXpath(output, `//*[@id="preamble"]//p[text() = "Back then${decodeChar(8230)}${decodeChar(8203)}"]`, 1)
  })

  test('should output table of contents in preamble if toc-placement attribute value is preamble', async () => {
    const input = `= Article
:toc:
:toc-placement: preamble

Once upon a time...

== Section One

It was a dark and stormy night...

== Section Two

They couldn't believe their eyes when...`
    const output = await convertString(input)
    assertXpath(output, '//*[@id="preamble"]/*[@id="toc"]', 1)
  })

  test('should move abstract in implicit preface to info tag when converting to DocBook', async () => {
    const input = `= Document Title

[abstract]
This is the abstract.

== Fin`
    for (const doctype of ['article', 'book']) {
      const output = await convertString(input, { backend: 'docbook', doctype })
      assertXpath(output, '//abstract', 1)
      assertXpath(output, `/${doctype}/info/abstract`, 1)
    }
  })

  test('should move abstract as first section to info tag when converting to DocBook', async () => {
    const input = `= Document Title

[abstract]
== Abstract

This is the abstract.

== Fin`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//abstract', 1)
    assertXpath(output, '/article/info/abstract', 1)
  })

  test('should move abstract in preface section to info tag when converting to DocBook', async () => {
    const input = `= Document Title
:doctype: book

[preface]
== Preface

[abstract]
This is the abstract.

== Fin`
    const output = await convertString(input, { backend: 'docbook' })
    assertXpath(output, '//abstract', 1)
    assertXpath(output, '/book/info/abstract', 1)
    assertXpath(output, '//preface', 0)
  })
})
