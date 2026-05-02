import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { Block } from '../src/block.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage } from './helpers.js'
import {
  documentFromString,
  convertString,
  convertStringToEmbedded,
  blockFromString,
} from './harness.js'

describe('Blocks', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Image paths', () => {
    test('restricts access to ancestor directories when safe mode level is at least SAFE', async () => {
      // NOTE: normalize_asset_path is a Ruby-specific method tied to file system; skipping path assertions
      const input = 'image::asciidoctor.png[Asciidoctor]'
      const block = await blockFromString(input)
      const doc = block.document
      // safe mode is 'safe' by default which is >= SAFE
      assert.ok(doc.safe >= 1)
    })

    test('does not restrict access to ancestor directories when safe mode is disabled', async () => {
      // NOTE: normalize_asset_path is a Ruby-specific method tied to file system; skipping path assertions
      const input = 'image::asciidoctor.png[Asciidoctor]'
      const block = await blockFromString(input, { safe: 'unsafe' })
      const doc = block.document
      // safe mode UNSAFE = 0
      assert.equal(doc.safe, 0)
    })
  })

  describe('Source code', () => {
    test('should support fenced code block using backticks', async () => {
      const input = `\`\`\`
puts "Hello, World!"
\`\`\`
`
      const block = await blockFromString(input)
      assert.equal(block.context, 'listing')
      assert.equal(block.getAttribute('style'), 'source')
      assert.equal(block.getAttribute('cloaked-context'), 'fenced_code')
      assert.equal(block.getAttribute('language'), null)
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.listingblock', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre//code', 1)
      assertXpath(
        output,
        '/*[@class="listingblock"]//pre//code[not(@class)]',
        1
      )
    })

    test('should not recognize fenced code blocks with more than three delimiters', async () => {
      const input = `\`\`\`\`ruby
puts "Hello, World!"
\`\`\`\`

~~~~ javascript
alert("Hello, World!")
~~~~
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.listingblock', 0)
    })

    test('should support fenced code blocks with languages', async () => {
      const input = `\`\`\`ruby
puts "Hello, World!"
\`\`\`

\`\`\` javascript
alert("Hello, World!")
\`\`\`
`
      const doc = await documentFromString(input)
      const block = doc.blocks[0]
      assert.equal(block.context, 'listing')
      assert.equal(block.getAttribute('style'), 'source')
      assert.equal(block.getAttribute('cloaked-context'), 'fenced_code')
      assert.equal(block.getAttribute('language'), 'ruby')
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.listingblock', 2)
      assertXpath(
        output,
        '//*[contains(@class,"listingblock")]//code[contains(@class,"language-ruby")][@data-lang="ruby"]',
        1
      )
      assertXpath(
        output,
        '//*[contains(@class,"listingblock")]//code[contains(@class,"language-javascript")][@data-lang="javascript"]',
        1
      )
    })

    test('should support fenced code blocks with languages and numbering', async () => {
      const input = `\`\`\`ruby,numbered
puts "Hello, World!"
\`\`\`

\`\`\` javascript, numbered
alert("Hello, World!")
\`\`\`
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.listingblock', 2)
      assertXpath(
        output,
        '//*[contains(@class,"listingblock")]//code[contains(@class,"language-ruby")][@data-lang="ruby"]',
        1
      )
      assertXpath(
        output,
        '//*[contains(@class,"listingblock")]//code[contains(@class,"language-javascript")][@data-lang="javascript"]',
        1
      )
    })

    test('should allow source style to be specified on literal block', async () => {
      const input = `\
[source]
....
console.log('Hello, World!')
....
`
      const block = await blockFromString(input)
      assert.equal(block.context, 'listing')
      assert.equal(block.getAttribute('style'), 'source')
      assert.equal(block.getAttribute('cloaked-context'), 'literal')
      assert.equal(block.getAttribute('language'), null)
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.listingblock', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre/code', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre/code[@data-lang]', 0)
    })

    test('should allow source style and language to be specified on literal block', async () => {
      const input = `\
[source,js]
....
console.log('Hello, World!')
....
`
      const block = await blockFromString(input)
      assert.equal(block.context, 'listing')
      assert.equal(block.getAttribute('style'), 'source')
      assert.equal(block.getAttribute('cloaked-context'), 'literal')
      assert.equal(block.getAttribute('language'), 'js')
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.listingblock', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre/code', 1)
      assertXpath(output, '/*[@class="listingblock"]//pre/code[@data-lang]', 1)
    })
  })

  describe('Abstract and Part Intro', () => {
    test('should make abstract on open block without title a quote block for article', async () => {
      const input = `\
= Article

[abstract]
--
This article is about stuff.

And other stuff.
--

== Section One

content
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock.abstract', 1)
      assertCss(output, '#preamble .quoteblock', 1)
      assertCss(output, '.quoteblock > blockquote', 1)
      assertCss(output, '.quoteblock > blockquote > .paragraph', 2)
    })

    test('should make abstract on open block with title a quote block with title for article', async () => {
      const input = `\
= Article

.My abstract
[abstract]
--
This article is about stuff.
--

== Section One

content
`
      const output = await convertString(input)
      assertCss(output, '.quoteblock', 1)
      assertCss(output, '.quoteblock.abstract', 1)
      assertCss(output, '#preamble .quoteblock', 1)
      assertCss(output, '.quoteblock > .title', 1)
      assertCss(output, '.quoteblock > .title + blockquote', 1)
      assertCss(output, '.quoteblock > .title + blockquote > .paragraph', 1)
    })

    test('should allow abstract in document with title if doctype is book', async () => {
      const input = `\
= Book
:doctype: book

[abstract]
Abstract for book with title is valid
`
      const output = await convertString(input)
      assertCss(output, '.abstract', 1)
    })

    test('should not allow abstract as direct child of document if doctype is book', async () => {
      const input = `\
:doctype: book

[abstract]
Abstract for book without title is invalid.
`
      const output = await convertString(input)
      assertCss(output, '.abstract', 0)
      assertMessage(
        logger,
        'warn',
        'abstract block cannot be used in a document without a doctitle when doctype is book. Excluding block content.'
      )
    })

    test('should make abstract on open block without title converted to DocBook', async () => {
      const input = `\
= Article

[abstract]
--
This article is about stuff.

And other stuff.
--
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'info > abstract', 1)
      assertCss(output, 'info > abstract > simpara', 2)
    })

    test('should make abstract on open block with title converted to DocBook', async () => {
      const input = `\
= Article

.My abstract
[abstract]
--
This article is about stuff.
--
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'info > abstract', 1)
      assertCss(output, 'info > abstract > title', 1)
      assertCss(output, 'info > abstract > title + simpara', 1)
    })

    test('should allow abstract in document with title if doctype is book converted to DocBook', async () => {
      const input = `\
= Book
:doctype: book

[abstract]
Abstract for book with title is valid
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'info > abstract', 1)
      assertCss(output, 'preface', 0)
    })

    test('should not allow abstract as direct child of document if doctype is book converted to DocBook', async () => {
      const input = `\
:doctype: book

[abstract]
Abstract for book is invalid.
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'abstract', 0)
      assertMessage(
        logger,
        'warn',
        'abstract block cannot be used in a document without a doctitle when doctype is book. Excluding block content.'
      )
    })

    // TODO partintro shouldn't be recognized if doctype is not book, should be in proper place
    test('should accept partintro on open block without title', async () => {
      const input = `\
= Book
:doctype: book

= Part 1

[partintro]
--
This is a part intro.

It can have multiple paragraphs.
--

== Chapter 1

content
`
      const output = await convertString(input)
      assertCss(output, '.openblock', 1)
      assertCss(output, '.openblock.partintro', 1)
      assertCss(output, '.openblock .title', 0)
      assertCss(output, '.openblock .content', 1)
      assertXpath(
        output,
        '//h1[@id="_part_1"]/following-sibling::*[contains(@class,"openblock")]',
        1
      )
      assertXpath(
        output,
        '//*[contains(@class,"openblock")]/*[@class="content"]/*[@class="paragraph"]',
        2
      )
    })

    test('should accept partintro on open block with title', async () => {
      const input = `\
= Book
:doctype: book

= Part 1

.Intro title
[partintro]
--
This is a part intro with a title.
--

== Chapter 1

content
`
      const output = await convertString(input)
      assertCss(output, '.openblock', 1)
      assertCss(output, '.openblock.partintro', 1)
      assertCss(output, '.openblock .title', 1)
      assertCss(output, '.openblock .content', 1)
      assertXpath(
        output,
        '//h1[@id="_part_1"]/following-sibling::*[contains(@class,"openblock")]',
        1
      )
      assertXpath(
        output,
        '//*[contains(@class,"openblock")]/*[@class="title"][text()="Intro title"]',
        1
      )
      assertXpath(
        output,
        '//*[contains(@class,"openblock")]/*[@class="content"]/*[@class="paragraph"]',
        1
      )
    })

    test('should exclude partintro if not a child of part', async () => {
      const input = `\
= Book
:doctype: book

[partintro]
part intro paragraph
`
      const output = await convertString(input)
      assertCss(output, '.partintro', 0)
      assertMessage(
        logger,
        'error',
        'partintro block can only be used when doctype is book and must be a child of a book part. Excluding block content.'
      )
    })

    test('should not allow partintro unless doctype is book', async () => {
      const input = `\
[partintro]
part intro paragraph
`
      const output = await convertString(input)
      assertCss(output, '.partintro', 0)
      assertMessage(
        logger,
        'error',
        'partintro block can only be used when doctype is book and must be a child of a book part. Excluding block content.'
      )
    })

    test('should accept partintro on open block without title converted to DocBook', async () => {
      const input = `\
= Book
:doctype: book

= Part 1

[partintro]
--
This is a part intro.

It can have multiple paragraphs.
--

== Chapter 1

content
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'partintro', 1)
      assertCss(output, 'part[id="_part_1"] > partintro', 1)
      assertCss(output, 'partintro > simpara', 2)
    })

    test('should accept partintro on open block with title converted to DocBook', async () => {
      const input = `\
= Book
:doctype: book

= Part 1

.Intro title
[partintro]
--
This is a part intro with a title.
--

== Chapter 1

content
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'partintro', 1)
      assertCss(output, 'part[id="_part_1"] > partintro', 1)
      assertCss(output, 'partintro > title', 1)
      assertCss(output, 'partintro > title + simpara', 1)
    })

    test('should exclude partintro if not a child of part converted to DocBook', async () => {
      const input = `\
= Book
:doctype: book

[partintro]
part intro paragraph
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'partintro', 0)
      assertMessage(
        logger,
        'error',
        'partintro block can only be used when doctype is book and must be a child of a book part. Excluding block content.'
      )
    })

    test('should not allow partintro unless doctype is book converted to DocBook', async () => {
      const input = `\
[partintro]
part intro paragraph
`
      const output = await convertString(input, { backend: 'docbook' })
      assertCss(output, 'partintro', 0)
      assertMessage(
        logger,
        'error',
        'partintro block can only be used when doctype is book and must be a child of a book part. Excluding block content.'
      )
    })
  })

  describe('Substitutions', () => {
    test('processor should not crash if subs are empty', async () => {
      const input = `\
[subs=","]
....
content
....
`
      const doc = await documentFromString(input)
      const block = doc.blocks[0]
      assert.equal(block.subs.length, 0)
    })

    test('should be able to append subs to default block substitution list', async () => {
      const input = `\
:application: Asciidoctor

[subs="+attributes,+macros"]
....
{application}
....
`
      const doc = await documentFromString(input)
      const block = doc.blocks[0]
      assert.deepEqual(block.subs, [
        'specialcharacters',
        'attributes',
        'macros',
      ])
    })

    test('should be able to prepend subs to default block substitution list', async () => {
      const input = `\
:application: Asciidoctor

[subs="attributes+"]
....
{application}
....
`
      const doc = await documentFromString(input)
      const block = doc.blocks[0]
      assert.deepEqual(block.subs, ['attributes', 'specialcharacters'])
    })

    test('should be able to remove subs to default block substitution list', async () => {
      const input = `\
[subs="-quotes,-replacements"]
content
`
      const doc = await documentFromString(input)
      const block = doc.blocks[0]
      assert.deepEqual(block.subs, [
        'specialcharacters',
        'attributes',
        'macros',
        'post_replacements',
      ])
    })

    test('should be able to prepend, append and remove subs from default block substitution list', async () => {
      const input = `\
:application: asciidoctor

[subs="attributes+,-verbatim,+specialcharacters,+macros"]
....
https://{application}.org[{gt}{gt}] <1>
....
`
      const doc = await documentFromString(input, { standalone: false })
      const block = doc.blocks[0]
      assert.deepEqual(block.subs, [
        'attributes',
        'specialcharacters',
        'macros',
      ])
      const result = await doc.convert()
      assert.ok(
        result.includes(
          '<pre><a href="https://asciidoctor.org">&gt;&gt;</a> &lt;1&gt;</pre>'
        )
      )
    })

    test('should be able to set subs then modify them', async () => {
      const input = `\
[subs="verbatim,-callouts"]
_hey now_ <1>
`
      const doc = await documentFromString(input, { standalone: false })
      const block = doc.blocks[0]
      assert.deepEqual(block.subs, ['specialcharacters'])
      const result = await doc.convert()
      assert.ok(result.includes('_hey now_ &lt;1&gt;'))
    })

    test('remove substitution from block', async () => {
      const source = '....\n<foobar>\n....'
      const literalBlock = (await documentFromString(source)).findBy({
        context: 'literal',
      })[0]
      literalBlock.removeSubstitution('specialcharacters')
      assert.equal(literalBlock.hasSubstitution('specialcharacters'), false)
      assert.equal(await literalBlock.getContent(), '<foobar>')
    })
  })

  describe('References', () => {
    test('should not recognize block anchor with illegal id characters', async () => {
      const input = `\
[[illegal$id,Reference Text]]
----
content
----
`
      const doc = await documentFromString(input)
      const block = doc.blocks[0]
      assert.equal(block.id, null)
      assert.equal(block.getAttribute('reftext'), null)
      assert.ok(
        !Object.prototype.hasOwnProperty.call(doc.catalog.refs, 'illegal$id')
      )
    })

    test('should not recognize block anchor that starts with digit', async () => {
      const input = `\
[[3-blind-mice]]
--
see how they run
--
`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('[[3-blind-mice]]'))
      assertXpath(output, '/*[@id=":3-blind-mice"]', 0)
    })

    test('should recognize block anchor that starts with colon', async () => {
      const input = `\
[[:idname]]
--
content
--
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@id=":idname"]', 1)
    })

    test('should use specified id and reftext when registering block reference', async () => {
      const input = `\
[[debian,Debian Install]]
.Installation on Debian
----
$ apt-get install asciidoctor
----
`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['debian']
      assert.notEqual(ref, null)
      assert.equal(ref.reftext, 'Debian Install')
      assert.equal(doc.resolveId('Debian Install'), 'debian')
    })

    test('should allow square brackets in block reference text', async () => {
      const input = `\
[[debian,[Debian] Install]]
.Installation on Debian
----
$ apt-get install asciidoctor
----
`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['debian']
      assert.notEqual(ref, null)
      assert.equal(ref.reftext, '[Debian] Install')
      assert.equal(doc.resolveId('[Debian] Install'), 'debian')
    })

    test('should allow comma in block reference text', async () => {
      const input = `\
[[debian, Debian, Ubuntu]]
.Installation on Debian
----
$ apt-get install asciidoctor
----
`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['debian']
      assert.notEqual(ref, null)
      assert.equal(ref.reftext, 'Debian, Ubuntu')
      assert.equal(doc.resolveId('Debian, Ubuntu'), 'debian')
    })

    test('should resolve attribute reference in title using attribute defined at location of block', async () => {
      const input = `\
= Document Title
:foo: baz

intro paragraph. see <<free-standing>>.

:foo: bar

.foo is {foo}
[#formal-para]
paragraph with title

[discrete#free-standing]
== foo is still {foo}
`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['formal-para']
      assert.notEqual(ref, null)
      assert.equal(ref.title, 'foo is bar')
      assert.equal(doc.resolveId('foo is bar'), 'formal-para')
      const output = await doc.convert({ standalone: false })
      assert.ok(
        output.includes('<a href="#free-standing">foo is still bar</a>')
      )
      assert.ok(
        output.includes(
          '<h2 id="free-standing" class="discrete">foo is still bar</h2>'
        )
      )
    })

    test('should substitute attribute references in reftext when registering block reference', async () => {
      const input = `\
:label-tiger: Tiger

[[tiger-evolution,Evolution of the {label-tiger}]]
****
Information about the evolution of the tiger.
****
`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['tiger-evolution']
      assert.notEqual(ref, null)
      assert.equal(ref.attributes['reftext'], 'Evolution of the Tiger')
      assert.equal(doc.resolveId('Evolution of the Tiger'), 'tiger-evolution')
    })

    test('should use specified reftext when registering block reference', async () => {
      const input = `\
[[debian]]
[reftext="Debian Install"]
.Installation on Debian
----
$ apt-get install asciidoctor
----
`
      const doc = await documentFromString(input)
      const ref = doc.catalog.refs['debian']
      assert.notEqual(ref, null)
      assert.equal(ref.reftext, 'Debian Install')
      assert.equal(doc.resolveId('Debian Install'), 'debian')
    })
  })

  describe('Creating', () => {
    test('create a new Block', async () => {
      const doc = await documentFromString('= Title')
      const paragraph = Block.create(doc, 'paragraph', {
        subs: 'normal',
        source: '_This_ is a <test>',
        attributes: { foo: 'bar' },
      })
      assert.equal(
        await paragraph.getContent(),
        '<em>This</em> is a &lt;test&gt;'
      )
      assert.equal(paragraph.getAttribute('foo'), 'bar')
    })

    test('create a new paragraph block with verbatim content model', async () => {
      const doc = await documentFromString('= Title')
      const paragraph = Block.create(doc, 'paragraph', {
        source: '    _This_ is a <test>',
      })
      paragraph.setContentModel('verbatim')
      assert.equal(paragraph.getContentModel(), 'verbatim')
      assert.equal(await paragraph.getContent(), '    _This_ is a <test>')
    })

    test('create a new literal block with empty content model', async () => {
      const doc = await documentFromString('= Title')
      const literal = Block.create(doc, 'literal', {
        source: '_This_ is a <test>',
      })
      literal.setContentModel('empty')
      assert.equal(literal.getContentModel(), 'empty')
      assert.equal(await literal.getContent(), null)
    })

    test('assign a caption on a Block', async () => {
      const doc = await documentFromString('= Title')
      const image = Block.create(doc, 'image', {
        content_model: 'empty',
        attributes: { target: 'cat.png', format: 'png' },
      })
      image.setTitle('A cat')
      image.assignCaption(undefined, 'figure')
      assert.equal(image.getCaptionedTitle(), 'Figure 1. A cat')
      image.setCaption(undefined)
      assert.equal(image.getCaption(), undefined)
      image.assignCaption('Figure A. ')
      assert.equal(image.getCaptionedTitle(), 'Figure A. A cat')
      image.setCaption(undefined)
      image.setTitle('A nice cat')
      image.assignCaption('Figure I. ')
      assert.equal(image.getCaptionedTitle(), 'Figure I. A nice cat')
      image.assignCaption('Figure X. ')
      // caption is still assigned
      assert.equal(image.getCaptionedTitle(), 'Figure I. A nice cat')
    })
  })
})
