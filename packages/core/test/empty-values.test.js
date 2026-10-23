// Empty attribute values and non-numeric values
//
// In Ruby, only nil and false are falsy: an empty string (e.g., `[foo=]`) is truthy, and
// String#to_i returns 0 for a non-numeric value. These tests make sure that the parser
// and the reader handle these values like Asciidoctor (Ruby).
// See https://github.com/asciidoctor/asciidoctor.js/issues/1903

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertMessage, usingMemoryLogger } from './helpers.js'
import {
  documentFromString,
  convertStringToEmbedded,
  blockFromString,
} from './harness.js'

// In browser (Vitest), use the server origin so includes can be fetched via URL.
const BASE_DIR = import.meta.url.startsWith('http')
  ? new URL('.', import.meta.url).href.replace(/\/$/, '')
  : path.dirname(fileURLToPath(import.meta.url))

describe('Empty attribute values', () => {
  describe('Block style', () => {
    test('should set style of delimited block to empty first positional attribute', async () => {
      const block = await blockFromString('[""]\n--\nopen\n--')
      assert.equal(block.style, '')
    })

    test('should not assign implicit style to ordered list with empty style', async () => {
      const list = await blockFromString('[""]\n. a')
      assert.equal(list.style, '')
      assert.equal(list.attributes.style, '')
    })

    test('should not assign bibliography style to list with empty style in bibliography section', async () => {
      const doc = await documentFromString(
        '[bibliography]\n== Refs\n\n[""]\n* [[[a]]] A'
      )
      assert.equal(doc.blocks[0].blocks[0].style, '')
    })

    test('should parse indented paragraph with unknown style as literal block', async () => {
      const block = await blockFromString('[foo]\n  indented')
      assert.equal(block.context, 'literal')
    })

    test('should make section with empty style a special unnumbered section', async () => {
      const doc = await documentFromString('= Doc\n:sectnums:\n\n[""]\n== Foo')
      const section = doc.blocks[0]
      assert.equal(section.sectname, '')
      assert.equal(section.special, true)
      assert.equal(section.numbered, false)
    })

    test('should not convert listing block to source block if first positional attribute is empty', async () => {
      const block = await blockFromString('["",ruby]\n----\nx\n----')
      assert.equal(block.style, '')
      assert.equal(block.attributes.language, undefined)
    })

    test('should convert listing block to source block if language is empty', async () => {
      const block = await blockFromString('[,""]\n----\nx\n----')
      assert.equal(block.style, 'source')
      assert.equal(block.attributes.language, '')
    })
  })

  describe('Block id and title', () => {
    test('should not use inline anchor as id of section with empty id', async () => {
      const input = '[id=]\n== Foo [[bar]]\n\n<<bar>>'
      const doc = await documentFromString(input)
      assert.equal(doc.blocks[0].id, null)
      const output = await doc.convert()
      assert.ok(output.includes('<h2>Foo <a id="bar"></a></h2>'))
    })

    test('should not generate id for discrete heading with empty id', async () => {
      const block = await blockFromString('[discrete,id=]\n== Float')
      assert.equal(block.id, '')
    })

    test('should warn if empty block id is already in use', async () => {
      await usingMemoryLogger(async (logger) => {
        await documentFromString('[id=]\npara1\n\n[id=]\npara2')
        assertMessage(logger, 'WARN', 'id assigned to block already in use: ')
      })
    })

    test('should assign empty title and caption to block', async () => {
      const block = await blockFromString('[title=]\n----\nx\n----')
      assert.equal(block.title, '')
      assert.equal(block.hasTitle(), true)
      const doc = await documentFromString(
        '[title=]\nimage::a.png[]\n\n.Real\nimage::b.png[]'
      )
      assert.equal(doc.blocks[0].caption, 'Figure 1. ')
      assert.equal(doc.blocks[1].caption, 'Figure 2. ')
    })

    test('should number captioned block if caption attribute is empty', async () => {
      const output = await convertStringToEmbedded(
        ':table-caption:\n\n.Tbl\n|===\n|a\n|==='
      )
      assert.ok(output.includes('<caption class="title"> 1. Tbl</caption>'))
    })
  })

  describe('Quoted paragraph', () => {
    test('should set empty attribution on quoted paragraph', async () => {
      const block = await blockFromString('"quoted"\n-- , Title')
      assert.equal(block.attributes.attribution, '')
      assert.equal(block.attributes.citetitle, 'Title')
    })

    test('should set empty attribution on markdown-style quote', async () => {
      const block = await blockFromString('> quoted\n> -- , Title')
      assert.equal(block.attributes.attribution, '')
      assert.equal(block.attributes.citetitle, 'Title')
    })
  })

  describe('Image block', () => {
    test('should drop empty scaledwidth attribute', async () => {
      const block = await blockFromString('image::a.png[scaledwidth=]')
      assert.equal('scaledwidth' in block.attributes, false)
    })

    test('should add % to scaledwidth that ends with digits', async () => {
      const block = await blockFromString('image::a.png[scaledwidth=x50]')
      assert.equal(block.attributes.scaledwidth, 'x50%')
    })
  })

  describe('Ordered list start', () => {
    test('should use 0 as start of ordered list if start attribute is empty or not a number', async () => {
      for (const start of ['', 'abc']) {
        const list = await blockFromString(`[start=${start}]\n. a`)
        assert.equal(list.attributes.start, 0)
      }
    })
  })

  describe('Document header', () => {
    test('should assign empty block attributes above document title to document', async () => {
      const doc = await documentFromString(
        '[separator=,role=,reftext=,id=]\n= Main: Sub\n\nx'
      )
      assert.equal(doc.attributes['title-separator'], '')
      assert.equal(doc.attributes.role, '')
      assert.equal(doc.attributes.reftext, '')
      assert.equal(doc.id, '')
    })

    test('should not override empty authorinitials attribute', async () => {
      const doc = await documentFromString(
        ':author: Doc Writer\n:authorinitials:\n\nx'
      )
      assert.equal(doc.attributes.authorinitials, '')
    })

    test('should accept empty manpurpose attribute', async () => {
      await usingMemoryLogger(async (logger) => {
        const doc = await documentFromString(
          '= foo(1)\n:manname: foo\n:manpurpose:\n\n== Section\n\ntext',
          { doctype: 'manpage' }
        )
        assert.equal(doc.attributes.manname, 'foo')
        assert.deepEqual(doc.attributes.mannames, ['foo'])
        assert.equal(doc.blocks[0].title, 'Section')
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should set empty revnumber and revremark from revision line', async () => {
      let doc = await documentFromString('= T\nA B\nv, 2020-01-01\n\nx')
      assert.equal(doc.attributes.revnumber, '')
      assert.equal(doc.attributes.revdate, '2020-01-01')
      doc = await documentFromString('= T\nA B\n1.0, 2020-01-01:\n\nx')
      assert.equal(doc.attributes.revnumber, '1.0')
      assert.equal(doc.attributes.revremark, '')
    })

    test('should skip missing attribute references in doctitle regardless of attribute-missing', async () => {
      const doc = await documentFromString('= Title {nope}\n\nx', {
        attributes: { 'attribute-missing': 'drop-line' },
      })
      assert.equal(doc.attributes.doctitle, 'Title {nope}')
    })
  })

  describe('Level offset', () => {
    test('should treat non-numeric leveloffset as 0', async () => {
      const section = await blockFromString(':leveloffset: abc\n\n== A')
      assert.equal(section.level, 1)
    })

    test('should restore empty leveloffset after include', async () => {
      const output = await convertStringToEmbedded(
        ':leveloffset:\n\ninclude::fixtures/section-a.adoc[leveloffset=+1]\n\nafter [{leveloffset}]',
        { base_dir: BASE_DIR }
      )
      assert.ok(output.includes('after []'))
    })
  })

  describe('Include directive', () => {
    test('should ignore tag attribute if lines attribute is empty', async () => {
      const output = await convertStringToEmbedded(
        'include::fixtures/include-file.adoc[lines=,tag=snippetA]',
        { base_dir: BASE_DIR }
      )
      assert.ok(output.includes('first line of included content'))
      assert.ok(output.includes('last line of included content'))
    })

    test('should treat empty entry in lines attribute as line 0', async () => {
      // like Ruby, line 0 comes first in the sorted line numbers, so no line is selected
      const output = await convertStringToEmbedded(
        'include::fixtures/include-file.adoc[lines=1;;1]',
        { base_dir: BASE_DIR }
      )
      assert.equal(output, '')
    })
  })

  describe('Conditional preprocessor directive', () => {
    test('should coerce non-numeric value to 0 in ifeval expression', async () => {
      for (const rhs of ['0', '0.0']) {
        const output = await convertStringToEmbedded(
          `:x: abc\n\nifeval::[{x} == ${rhs}]\nyes\nendif::[]`
        )
        assert.ok(output.includes('yes'), `{x} == ${rhs}`)
      }
    })
  })
})
