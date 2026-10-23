// Empty attribute values and non-numeric values
//
// In Ruby, only nil and false are falsy: an empty string (e.g., `[foo=]`) is truthy, and
// String#to_i returns 0 for a non-numeric value. These tests make sure that Asciidoctor.js
// handles these values like Asciidoctor (Ruby).
// See https://github.com/asciidoctor/asciidoctor.js/issues/1903

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Extensions, Html5Converter } from '../src/index.js'
import {
  Processor,
  MacroProcessorDsl,
  InlineMacroProcessor,
} from '../src/extensions.js'
import { assertMessage, usingMemoryLogger } from './helpers.js'
import {
  documentFromString,
  convertString,
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

  describe('Substitutions', () => {
    test('should only drop attribute reference if attribute-undefined is empty', async () => {
      const output = await convertStringToEmbedded(
        ':attribute-undefined:\n\ntext {set:foo!} more'
      )
      assert.ok(output.includes('<p>text  more</p>'))
    })

    test('should add empty subject and body to mailto link', async () => {
      let output = await convertStringToEmbedded('mailto:a@b.com[Text,""]')
      assert.ok(output.includes('href="mailto:a@b.com?subject="'))
      output = await convertStringToEmbedded('mailto:a@b.com[Text,Subj,""]')
      assert.ok(output.includes('href="mailto:a@b.com?subject=Subj&amp;body="'))
    })

    test('should register footnote with empty text from footnoteref macro', async () => {
      await usingMemoryLogger(async (logger) => {
        const doc = await documentFromString('A footnoteref:[x,] B')
        await doc.convert()
        assert.equal(doc.catalog.footnotes.length, 1)
        assert.equal(doc.catalog.footnotes[0].id, 'x')
        assert.equal(doc.catalog.footnotes[0].text, '')
        assertMessage(
          logger,
          'WARN',
          'found deprecated footnoteref macro: footnoteref:[x,]; use footnote macro with target instead'
        )
      })
    })

    test('should honor empty terms in index term macros', async () => {
      let output = await convertStringToEmbedded('indexterm2:["",see=y]')
      assert.ok(output.includes('<p></p>'))
      output = await convertStringToEmbedded('x indexterm:[Tigers,"",see=x]', {
        backend: 'docbook5',
      })
      assert.ok(
        output.includes('<primary>Tigers</primary><secondary></secondary>')
      )
      output = await convertStringToEmbedded('x indexterm:[Tigers,see-also=]', {
        backend: 'docbook5',
      })
      assert.ok(output.includes('<seealso></seealso>'))
    })

    test('should not create menu items from an empty menu path', async () => {
      const output = await convertStringToEmbedded(
        ':experimental:\n\nmenu:File[>]'
      )
      assert.ok(output.includes('<b class="menuref">File</b>'))
    })

    test('should use the number of lines as the end of an open range of lines to highlight', async () => {
      const block = await blockFromString('----\na\nb\n----')
      assert.deepEqual(block.resolveLinesToHighlight('a\nb', '1-'), [1, 2])
      assert.deepEqual(block.resolveLinesToHighlight('a\nb', '1,'), [1])
    })
  })

  describe('Captions and signifiers', () => {
    test('should use empty caption prefix in xreftext', async () => {
      const output = await convertStringToEmbedded(
        ':xrefstyle: full\n\n[#t]\n.Tbl\n|===\n|a\n|===\n\n:table-caption:\n\n<<t>>'
      )
      assert.ok(output.includes('<a href="#t"> 1, &#8220;Tbl&#8221;</a>'))
    })

    test('should use empty appendix caption', async () => {
      const output = await convertStringToEmbedded(
        ':appendix-caption:\n:doctype: book\n\n[appendix]\n== App\n\ntext'
      )
      assert.ok(output.includes('<h2 id="_app"> A: App</h2>'))
    })

    test('should use empty section signifier in xreftext', async () => {
      const output = await convertStringToEmbedded(
        ':sectnums:\n:section-refsig:\n:xrefstyle: short\n\n== Sec\n\n<<_sec>>'
      )
      assert.ok(output.includes('<a href="#_sec"> 1</a>'))
    })
  })

  describe('Document attributes', () => {
    test('should set doctitle attribute to empty title', async () => {
      const output = await convertStringToEmbedded(':title:\n\nA{doctitle}B')
      assert.ok(output.includes('<p>AB</p>'))
    })

    test('should not position toc if toc-placement is empty', async () => {
      const doc = await documentFromString(
        '= Doc\n:toc:\n:toc-placement:\n:toc-position: right\n\n== S\n\nx',
        { standalone: true }
      )
      assert.equal(doc.getAttribute('toc-placement'), '')
      assert.equal(doc.getAttribute('toc-class'), null)
    })

    test('should keep empty docdate and localdate', async () => {
      const doc = await documentFromString('x', {
        attributes: { docdate: '', localdate: '' },
      })
      assert.equal(doc.getAttribute('docdate'), '')
      assert.equal(doc.getAttribute('docyear'), null)
      assert.equal(doc.getAttribute('localdate'), '')
      assert.equal(doc.getAttribute('localyear'), null)
    })

    test('should only derive year from date in ISO format', async () => {
      const doc = await documentFromString('x', {
        attributes: { docdate: '20201231', localdate: '2020-12-31' },
      })
      assert.equal(doc.getAttribute('docyear'), null)
      assert.equal(doc.getAttribute('localyear'), '2020')
    })

    test('should limit attribute values to 0 bytes if max-attribute-value-size is empty', async () => {
      const output = await convertStringToEmbedded(':foo: bar\n\nx [{foo}]', {
        attributes: { 'max-attribute-value-size': '' },
      })
      assert.ok(output.includes('<p>x []</p>'))
    })

    test('should keep empty docinfo content from docinfo processor', async () => {
      const registry = Extensions.create()
      registry.docinfoProcessor(function () {
        this.process(() => '')
      })
      registry.docinfoProcessor(function () {
        this.process(() => '<meta name="x">')
      })
      const doc = await documentFromString('x', {
        standalone: true,
        extension_registry: registry,
      })
      assert.equal(await doc.docinfo('head'), '\n<meta name="x">')
    })
  })

  describe('Node API', () => {
    test('should append role to empty role', async () => {
      const block = await blockFromString('[role=]\npara')
      block.addRole('foo')
      assert.equal(block.role, ' foo')
    })

    test('should compare attribute value with empty expected value', async () => {
      let block = await blockFromString('[foo=]\npara')
      assert.equal(block.hasAttribute('foo', ''), true)
      block = await blockFromString('[foo=x]\npara')
      assert.equal(block.hasAttribute('foo', ''), false)
    })
  })

  describe('HTML converter', () => {
    const convert = (input, opts = {}) => convertStringToEmbedded(input, opts)

    test('should output empty role and id', async () => {
      let output = await convert('[role=]\npara')
      assert.ok(output.includes('<div class="paragraph ">'))
      output = await convert('[role=]\n--\nopen\n--')
      assert.ok(output.includes('<div class="openblock ">'))
      output = await convert("[role=]\n'''")
      assert.ok(output.includes('<hr class="">'))
      output = await convert('[role=]\n* item')
      assert.ok(output.includes('<div class="ulist ">'))
      output = await convert('image:b.png[role=]')
      assert.ok(output.includes('<span class="image ">'))
      output = await convert('[id=]\npara')
      assert.ok(output.includes('<div id="" class="paragraph">'))
      output = await convert('[discrete,id=]\n== Float')
      assert.ok(output.includes('<h2 id="" class="discrete">Float</h2>'))
    })

    test('should output empty role on body', async () => {
      const output = await convertString('= Doc\n:role:\n\nx')
      assert.ok(output.includes('<body class="article ">'))
    })

    test('should output empty style', async () => {
      let output = await convert('[""]\n--\nopen\n--')
      assert.ok(output.includes('<div class="openblock ">'))
      output = await convert('[bibliography]\n== Refs\n\n[""]\n* [[[a]]] A')
      assert.ok(output.includes('<ul class="">'))
    })

    test('should output empty start and end on audio and video', async () => {
      let output = await convert('audio::a.mp3[start=]')
      assert.ok(output.includes('<audio src="a.mp3#t="'))
      output = await convert('video::a.mp4[end=]')
      assert.ok(output.includes('<video src="a.mp4#t=,"'))
    })

    test('should output empty Vimeo hash and YouTube list and playlist', async () => {
      let output = await convert('video::123[vimeo,hash=]')
      assert.ok(output.includes('player.vimeo.com/video/123?h="'))
      output = await convert('video::abc[youtube,list=]')
      assert.ok(output.includes('?rel=0&amp;list="'))
      output = await convert('video::abc[youtube,playlist=]')
      assert.ok(output.includes('?rel=0&amp;playlist=abc,"'))
    })

    test('should keep rest of video target after first slash', async () => {
      let output = await convert('video::123/abc/def[vimeo]')
      assert.ok(output.includes('player.vimeo.com/video/123?h=abc/def"'))
      output = await convert('video::abc/def/ghi[youtube]')
      assert.ok(output.includes('embed/abc?rel=0&amp;list=def/ghi"'))
    })

    test('should link image to empty link', async () => {
      let output = await convert('image::a.png[link=]')
      assert.ok(output.includes('<a class="image" href=""><img'))
      output = await convert('image:b.png[link=]')
      assert.ok(output.includes('<a class="image" href=""><img'))
    })

    test('should output empty window target on link', async () => {
      const output = await convert('link:http://x.org[x,window=]')
      assert.ok(output.includes('<a href="http://x.org" target="">x</a>'))
    })

    test('should output empty stripes, stem, attribution, language and cell background color', async () => {
      let output = await convert('[stripes=]\n|===\n|a\n|===')
      assert.ok(output.includes('grid-all stripes- stretch'))
      output = await convert('[stem]\n++++\n++++')
      assert.ok(output.includes('\\$\\$'))
      output = await convert('[quote,attribution=]\n____\nq\n____')
      assert.ok(output.includes('<div class="attribution">\n&#8212; \n</div>'))
      output = await convert('[quote,,citetitle=]\n____\nq\n____')
      assert.ok(
        output.includes('<div class="attribution">\n<cite></cite>\n</div>')
      )
      output = await convert('[source,language=]\n----\nx\n----')
      assert.ok(
        output.includes('<code class="language-" data-lang="">x</code>')
      )
      output = await convert(':cellbgcolor:\n\n|===\n|a\n|===')
      assert.ok(output.includes('style="background-color: ;"'))
    })

    test('should output empty language with syntax highlighter', async () => {
      let output = await convert('[source,language=]\n----\nx\n----', {
        attributes: { 'source-highlighter': 'highlight.js' },
      })
      assert.ok(output.includes('<code class="language- hljs" data-lang="">'))
      output = await convert('[source,language=]\n----\nx\n----', {
        attributes: { 'source-highlighter': 'html-pipeline' },
      })
      assert.ok(output.includes('<pre lang=""><code>'))
    })

    test('should treat empty or non-numeric levels as 0', async () => {
      let output = await convert('= Doc\n:sectnums:\n:sectnumlevels:\n\n== A')
      assert.ok(output.includes('<h2 id="_a">A</h2>'))
      output = await convertString('= Doc\n:toc:\n:toclevels:\n\n== A\n\n=== B')
      assert.ok(!output.includes('href="#_b"'))
      output = await convert('= Doc\n:toc: macro\n\n== A\n\ntoc::[levels=]')
      assert.ok(!output.includes('href="#_a"'))
      output = await convertString(
        '= Doc\n:toc:\n\n[toclevels=]\n== A\n\n=== B'
      )
      assert.ok(!output.includes('href="#_a"'))
    })

    test('should output empty chapter and part signifiers', async () => {
      const output = await convert(
        '= Book\n:doctype: book\n:sectnums:\n:partnums:\n:chapter-signifier:\n:part-signifier:\n\n= P\n\n== A\n\nx'
      )
      assert.ok(output.includes('<h1 id="_p" class="sect0"> I: P</h1>'))
      assert.ok(output.includes('<h2 id="_a"> 1. A</h2>'))
    })

    test('should link toc entry of section without id to empty fragment', async () => {
      const output = await convertString('= Doc\n:toc:\n\n[id=]\n== Foo\n\nx')
      assert.ok(output.includes('<li><a href="#">Foo</a></li>'))
    })
  })

  describe('Semantic HTML converter', () => {
    const convert = (input) =>
      convertStringToEmbedded(input, { backend: 'semantic-html5' })

    test('should output empty role and id', async () => {
      let output = await convert('[role=]\npara')
      assert.ok(output.includes('<p class="">'), output)
      output = await convert('[id=]\npara')
      assert.ok(output.includes('<p id="">'), output)
    })

    test('should not output class attribute on image without role', async () => {
      const output = await convert('image:b.png[]')
      assert.ok(!output.includes('class='), output)
    })

    test('should link toc entry of section without id to empty fragment', async () => {
      const output = await convertString('= Doc\n:toc:\n\n[id=]\n== Foo\n\nx', {
        backend: 'semantic-html5',
      })
      assert.ok(output.includes('<a href="#">Foo</a>'), output)
    })
  })

  describe('DocBook converter', () => {
    const convert = (input, opts = {}) =>
      convertStringToEmbedded(input, { backend: 'docbook5', ...opts })
    const convertStandalone = (input) =>
      convertString(input, {
        backend: 'docbook5',
        attributes: { reproducible: '' },
      })

    test('should output empty id, role and reftext', async () => {
      let output = await convert('[id=]\nfoo')
      assert.ok(output.includes('<simpara xml:id="">foo</simpara>'))
      output = await convert('[reftext=]\n== Sec\n\ntext')
      assert.ok(output.includes('xreflabel=""'))
      output = await convert('[role=]\n--\nopen\n--')
      assert.ok(output.includes('<para role="">'))
    })

    test('should not output xreflabel on open block without id', async () => {
      const output = await convert('[role=r,reftext=x]\n--\nopen\n--')
      assert.ok(output.includes('<para role="r">\n<simpara>open</simpara>'))
    })

    test('should output empty table width, list mark and index see', async () => {
      let output = await convert('[width=]\n|===\n|a\n|===')
      assert.ok(output.includes('<?dbhtml table-width=""?>'))
      assert.ok(output.includes('colwidth="425*"'))
      output = await convert('[""]\n* a')
      assert.ok(output.includes('<itemizedlist mark="">'))
      output = await convert('x indexterm:[a,see=]')
      assert.ok(output.includes('<see></see>'))
      output = await convert('x indexterm:[b,see-also=]')
      assert.ok(output.includes('<seealso></seealso>'))
    })

    test('should output empty date, copyright, email and authorinitials', async () => {
      let output = await convertStandalone('= T\n:revdate:\n\nx')
      assert.ok(output.includes('<date></date>'))
      output = await convertStandalone('= T\n:copyright:\n\nx')
      assert.ok(output.includes('<copyright>\n<holder></holder>\n</copyright>'))
      output = await convertStandalone('= T\nA B <x>\n:email:\n\nx')
      assert.ok(output.includes('<email></email>'))
      output = await convertStandalone('= T\nA B\n:authorinitials:\n\nx')
      assert.ok(output.includes('<authorinitials></authorinitials>'))
    })

    test('should output cover image with empty target and size attributes', async () => {
      let output = await convertStandalone(
        '= T\n:doctype: book\n:front-cover-image:\n\nx'
      )
      assert.ok(output.includes('<imagedata fileref=""/>'))
      output = await convertStandalone(
        '= T\n:doctype: book\n:front-cover-image: image:cover.png[Cover,200,300]\n\nx'
      )
      assert.ok(
        output.includes(
          '<imagedata fileref="cover.png" contentwidth="200" contentdepth="300"/>'
        )
      )
    })
  })

  describe('Manpage converter', () => {
    test('should output empty manmanual, mansource and docdate', async () => {
      const output = await convertString(
        '= foo(1)\n:manmanual:\n:mansource:\n:docdate:\n\n== NAME\n\nfoo - bar',
        { backend: 'manpage', doctype: 'manpage' }
      )
      assert.ok(output.includes('.\\"      Date: \n'))
      assert.ok(output.includes('.\\"    Manual: \n.\\"    Source: \n'))
      assert.ok(output.includes('.TH "FOO" "1" "" "" ""'))
    })
  })

  describe('Extension API', () => {
    test('should keep empty id and style when creating a section', async () => {
      const doc = await documentFromString('x')
      const processor = new Processor()
      let section = processor.createSection(doc, 'Sec', { id: '' })
      assert.equal(section.id, '')
      section = processor.createSection(doc, 'Sec', { style: '' })
      assert.equal(section.sectname, '')
      assert.equal(section.special, true)
      assert.equal('style' in section.attributes, false)
      section = processor.createSection(
        doc,
        'App',
        { style: 'appendix' },
        { level: 0 }
      )
      assert.equal(section.level, 1)
    })

    test('should keep empty target, alt and title when creating an image block', async () => {
      const doc = await documentFromString('x')
      const processor = new Processor()
      let block = processor.createImageBlock(doc, { target: '' })
      assert.equal(block.getAttribute('target'), '')
      block = processor.createImageBlock(doc, { target: 'a_b.png', alt: '' })
      assert.equal(block.getAttribute('alt'), '')
      block = processor.createImageBlock(doc, { target: 'a.png', title: '' })
      assert.equal(block.title, '')
      assert.equal(block.caption, 'Figure 1. ')
    })

    test('should keep empty and zero default attribute values', () => {
      const processor = new InlineMacroProcessor()
      Object.assign(processor, MacroProcessorDsl)
      processor.resolveAttributes({ '1:alt': '', n: 0 })
      assert.deepEqual(processor.config.positionalAttrs, ['alt'])
      assert.deepEqual(processor.config.defaultAttrs, { alt: '', n: 0 })
    })

    test('should set empty outfilesuffix on converter', () => {
      const converter = new Html5Converter('html5')
      converter.outfilesuffix('')
      assert.equal(converter.outfilesuffix(), '')
    })
  })
})
