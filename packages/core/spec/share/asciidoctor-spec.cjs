/* global Opal, it, describe, define */
const shareSpec = function (testOptions, asciidoctor, expect) {
  describe(testOptions.platform, function () {
    describe('When loaded', function () {
      it('asciidoctor should not be null', function () {
        expect(asciidoctor).to.be.an.instanceof(Object)
      })
      it('should preserve Function methods', function () {
        const fundamentalObjects = [
          Function,
          Boolean,
          Error,
          Number,
          Date,
          String,
          RegExp,
          Array
        ]
        for (const index in fundamentalObjects) {
          const fundamentalObject = fundamentalObjects[index]
          expect(fundamentalObject.call, `${fundamentalObject.name}.call should be a Function`).to.be.an.instanceof(Function)
          expect(fundamentalObject.apply, `${fundamentalObject.name}.apply should be a Function`).to.be.an.instanceof(Function)
          expect(fundamentalObject.bind, `${fundamentalObject.name}.bind should be a Function`).to.be.an.instanceof(Function)
        }
      })
    })

    describe('Loading', function () {
      it('should load document with inline attributes @', function () {
        const options = { attributes: 'icons=font@' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getAttribute('icons')).to.equal('font')
      })

      it('should load document with inline attributes !', function () {
        const options = { attributes: 'icons=font@ data-uri!' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getAttribute('icons')).to.equal('font')
      })

      it('should load document attributes', function () {
        const options = { attributes: 'icons=font@ data-uri!' }
        const doc = asciidoctor.load(`= Document attributes
:bar: value
:!foo:

content`, options)
        expect(doc.getAttribute('bar')).to.equal('value')
        expect(doc.getAttribute('quz')).to.be.undefined()
        expect(doc.getAttributes().quz).to.be.undefined()
        expect(doc.getAttribute('foo')).to.be.undefined()
        expect(doc.getAttributes().foo).to.be.undefined()
      })

      it('should load document with array attributes !', function () {
        const options = { attributes: 'icons=font@ data-uri!' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getAttribute('icons')).to.equal('font')
        expect(doc.getAttribute('data-uri')).to.be.undefined()
      })

      it('should load document with hash attributes', function () {
        // NOTE we might want to look into the fact that sectids: false does not work
        const options = { attributes: { icons: 'font', sectids: null } }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getAttribute('icons')).to.equal('font')
        expect(doc.getAttribute('sectids')).to.be.undefined()
        expect(doc.findBy({ context: 'section' })[0].getId()).to.be.undefined()
      })

      it('should load document with boolean attributes', function () {
        const options = { attributes: 'sectnums' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getAttribute('sectnums')).to.equal('')
        expect(doc.isAttribute('sectnums')).to.equal(true)
        expect(doc.isAttribute('sectnums', 'not this')).to.equal(false)
        expect(doc.isAttribute('sectanchors')).to.equal(false)
        expect(doc.hasAttribute('sectnums')).to.equal(true)
        expect(doc.hasAttribute('sectanchors')).to.equal(false)
      })

      it('should load document authors', function () {
        const doc = asciidoctor.load('= Authors\nGuillaume Grossetie; Anders Nawroth\n')
        expect(doc.getAttribute('author')).to.equal('Guillaume Grossetie')
        expect(doc.getAttribute('author_1')).to.equal('Guillaume Grossetie')
        expect(doc.getAttribute('author_2')).to.equal('Anders Nawroth')
        expect(doc.getAttribute('authorcount')).to.equal(2)
        expect(doc.getAttribute('authorinitials')).to.equal('GG')
        expect(doc.getAttribute('authorinitials_1')).to.equal('GG')
        expect(doc.getAttribute('authorinitials_2')).to.equal('AN')
        expect(doc.getAttribute('authors')).to.equal('Guillaume Grossetie, Anders Nawroth')
        expect(doc.getAuthor()).to.equal('Guillaume Grossetie')
      })

      it('should populate the catalog', function () {
        const doc = asciidoctor.load('link:index.html[Docs]', { safe: 'safe', catalog_assets: true })
        doc.convert()
        const links = doc.getCatalog().links
        expect(links).to.have.members(['index.html'])
      })

      it('should populate the callouts', function () {
        const doc = asciidoctor.load(`
[source,javascript]
----
const asciidoctor = require('@asciidoctor/core')() // <1>
const doc = asciidoctor.load('hello') // <2>

doc.convert() // <3>
----
<1> require @asciidoctor/core
<2> load the document
<3> convert the document`, { safe: 'safe', catalog_assets: true })
        doc.convert()
        const callouts = doc.getCallouts()
        expect(callouts.getLists()[0].length).to.equal(3)
        expect(callouts.getLists()[0][0].ordinal).to.equal(1)
        expect(callouts.getLists()[0][0].id).to.equal('CO1-1')
        expect(callouts.getLists()[1]).to.be.an('array').that.is.empty()
        expect(callouts.getListIndex()).to.equal(2)
        expect(callouts.getCalloutIds(1)).to.equal('')
        expect(callouts.getCurrentList()).to.be.an('array').that.is.empty()
      })

      it('should return attributes as JSON object', function () {
        const doc = asciidoctor.load('= Authors\nGuillaume Grossetie; Anders Nawroth\n')
        expect(doc.getAttributes().author).to.equal('Guillaume Grossetie')
        expect(doc.getAttributes().authors).to.equal('Guillaume Grossetie, Anders Nawroth')
      })

      it('should get icon uri string reference', function () {
        const options = { attributes: 'data-uri!' }
        const doc = asciidoctor.load('== Test', options)
        // FIXME: On browser icon URI is './images/icons/note.png' but on Node.js icon URI is 'images/icons/note.png'
        expect(doc.getIconUri('note')).to.include('images/icons/note.png')
      })

      // FIXME: Skipping spec because the following error is thrown "SecurityError: Jail is not an absolute path: ."
      /*
      it('should get icon uri', function () {
        const options = {safe: 'safe', attributes: ['data-uri', 'icons=fonts']};
        const doc = asciidoctor.load('== Test', options);
        expect(doc.getIconUri('note')).to.equal('data:image/png:base64,');
      });
      */

      it('should get media uri', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.getMediaUri('target')).to.equal('target')
      })

      it('should get image uri', function () {
        const options = { attributes: 'data-uri!' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getImageUri('target.jpg')).to.equal('target.jpg')
        expect(doc.getImageUri('target.jpg', 'imagesdir')).to.equal('target.jpg')
      })

      it('should modify document attributes', function () {
        const content = '== Title'
        const doc = asciidoctor.load(content)
        doc.setAttribute('data-uri', 'true')
        expect(doc.getAttribute('data-uri')).to.equal('true')
        doc.removeAttribute('data-uri')
        expect(doc.getAttribute('data-uri')).to.be.undefined()
        doc.setAttribute('data-uri', 'false')
        expect(doc.getAttribute('data-uri')).to.equal('false')
      })

      it('should get source', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.getSource()).to.equal('== Test')
      })

      it('should get source lines', function () {
        const doc = asciidoctor.load('== Test\nThis is the first paragraph.\n\nThis is a second paragraph.')
        expect(doc.getSourceLines()).to.have.members(['== Test', 'This is the first paragraph.', '', 'This is a second paragraph.'])
      })

      it('should get reader lines', function () {
        const doc = asciidoctor.load('line one\nline two\nline three', { parse: false })
        expect(doc.getReader().getLines()).to.have.members(['line one', 'line two', 'line three'])
      })

      it('should get reader string', function () {
        const doc = asciidoctor.load('line one\nline two\nline three', { parse: false })
        expect(doc.getReader().getString()).to.equal('line one\nline two\nline three')
      })

      it('should not be nested', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.isNested()).to.equal(false)
      })

      it('should not have footnotes', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.hasFootnotes()).to.equal(false)
      })

      it('should get footnotes', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.getFootnotes()).to.have.members([])
      })

      it('should not be embedded', function () {
        const options = { header_footer: true }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.isEmbedded()).to.equal(false)
      })

      it('should be embedded', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.isEmbedded()).to.equal(true)
      })

      it('should not have extensions enabled by default', function () {
        const doc = asciidoctor.load('== Test')
        // extensions should not be enabled by default
        expect(doc.hasExtensions()).to.equal(false)
      })

      it('should get document', function () {
        const options = {}
        const doc = asciidoctor.load('= Document Title\n\ncontent', options)
        expect(doc.getDocument()).to.equal(doc)
        expect(doc.getBlocks()[0].getDocument()).to.equal(doc)
      })

      it('should get parent node', function () {
        const options = {}
        const doc = asciidoctor.load('= Document Title\n\ncontent', options)
        expect(doc.getParent()).to.be.undefined()
        expect(doc.getBlocks()[0].getParent()).to.equal(doc)
      })

      it('should get parent document', function () {
        const options = {}
        const doc = asciidoctor.load('= Document Title\n\n|===\na|subdoc\n|===', options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        const subdoc = table.rows.body[0][0].inner_document
        expect(subdoc).not.to.equal(doc)
        expect(subdoc.getParentDocument()).to.equal(doc)
      })

      it('should have extensions enabled after being autoloaded', function () {
        try {
          asciidoctor.Extensions.register(function () {
          })
          const doc = asciidoctor.load('== Test')
          // extensions should be enabled after being autoloaded
          expect(doc.hasExtensions()).to.equal(true)
          const extensions = doc.getExtensions()
          expect(extensions).to.be.an.instanceof(Object)
          expect('groups' in extensions).to.equal(true)
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })

      it('should get default doctype', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.getDoctype()).to.equal('article')
      })

      it('should get doctype', function () {
        const options = { doctype: 'inline' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getDoctype()).to.equal('inline')
      })

      it('should get default backend', function () {
        const doc = asciidoctor.load('== Test')
        expect(doc.getBackend()).to.equal('html5')
      })

      it('should get backend', function () {
        const options = { backend: 'xhtml5' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getBackend()).to.equal('html5')
        expect(doc.getAttribute('htmlsyntax')).to.equal('xml')
      })

      it('should get safe mode', function () {
        const options = { safe: 'server' }
        const doc = asciidoctor.load('== Test', options)
        expect(doc.getSafe()).to.equal(asciidoctor.$$const.SafeMode.$$const.SERVER)
        expect(doc.getAttribute('safe-mode-name')).to.equal('server')
      })

      it('should get compat mode', function () {
        const options = {}
        const doc = asciidoctor.load('Document Title\n==============\n\ncontent', options)
        expect(doc.getCompatMode()).to.equal(true)
      })

      it('should get extensions', function () {
        const doc = asciidoctor.load('get _extensions_')
        expect(doc.getExtensions()).to.be.undefined()
      })

      it('should get parent document', function () {
        const doc = asciidoctor.load('get _parent document_')
        expect(doc.getParentDocument()).to.be.undefined()
      })

      it('should get sourcemap', function () {
        const doc = asciidoctor.load('get _sourcemap_')
        expect(doc.getSourcemap()).to.equal(false)
      })

      it('should set sourcemap', function () {
        const doc = asciidoctor.load('get _sourcemap_')
        expect(doc.getSourcemap()).to.equal(false)
        doc.setSourcemap(true)
        expect(doc.getSourcemap()).to.equal(true)
      })

      it('should get options', function () {
        const options = { header_footer: true }
        const doc = asciidoctor.load('= Document Title', options)
        expect(doc.getOptions()).to.be.an.instanceof(Object)
        expect(doc.getOptions().header_footer).to.equal(true)
      })

      it('should get outfilesuffix', function () {
        const options = {}
        const doc = asciidoctor.load('= Document Title', options)
        expect(doc.getOutfilesuffix()).to.equal('.html')
      })

      it('should get converter', function () {
        const options = { backend: 'xhtml' }
        const doc = asciidoctor.load('= Document Title', options)
        const converter = doc.getConverter()
        expect(converter).to.be.an.instanceof(Object)
        expect(converter.xml_mode).to.equal(true)
      })

      it('should get title', function () {
        const doc = asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n:title: The Actual Dangerous Documentation Chronicles\n== The Ravages of Writing')
        expect(doc.getTitle()).to.equal('The Actual Dangerous Documentation Chronicles')
        expect(doc.getCaptionedTitle()).to.equal('The Actual Dangerous Documentation Chronicles')
      })

      it('should set title', function () {
        const doc = asciidoctor.load('= The Dangerous Documentation\n\n== The Ravages of Writing')
        doc.setTitle('The Dangerous & Thrilling Documentation')
        expect(doc.getDoctitle()).to.equal('The Dangerous &amp; Thrilling Documentation')
      })

      it('should get the line of number of a block when sourcemap is enabled', function () {
        const options = { sourcemap: true }
        const doc = asciidoctor.load('= Document Title\n\nPreamble\n\n== First section\n\nTrue story!', options)
        expect(doc.getSourcemap()).to.equal(true)
        const blocks = doc.getBlocks()
        expect(blocks.length).to.equal(2)
        // preamble
        if (testOptions.coreVersion.gte('2.0.11')) {
          expect(blocks[0].getLineNumber()).to.equal(3)
        } else {
          // before 2.0.11, the source location was not available on a preamble block
          // https://github.com/asciidoctor/asciidoctor/issues/3799
          expect(blocks[0].getLineNumber()).to.be.undefined()
        }
        expect(blocks[0].getBlocks().length).to.equal(1)
        expect(blocks[0].getBlocks()[0].getLineNumber()).to.equal(3)
        // first section
        expect(blocks[1].getLineNumber()).to.equal(5)
      })

      it('should return undefined when sourcemap is disabled', function () {
        const options = {}
        const doc = asciidoctor.load('= Document Title\n\nPreamble\n\n== First section\n\nTrue story!', options)
        const blocks = doc.getBlocks()
        expect(blocks.length).to.equal(2)
        // preamble
        expect(blocks[0].getLineNumber()).to.be.undefined()
        expect(blocks[0].getBlocks().length).to.equal(1)
        expect(blocks[0].getBlocks()[0].getLineNumber()).to.be.undefined()
        // first section
        expect(blocks[1].getLineNumber()).to.be.undefined()
      })

      it('should get doctitle', function () {
        const doc = asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n\n== The Ravages of Writing')
        expect(doc.getDoctitle()).to.equal('The Dangerous Documentation Chronicles: Based on True Events')
      })

      it('should get partitioned doctitle', function () {
        const doc = asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n\n== The Ravages of Writing')
        const doctitle = doc.getDoctitle({ partition: true })
        expect(doctitle.main).to.equal('The Dangerous Documentation Chronicles')
        expect(doctitle.subtitle).to.equal('Based on True Events')
        expect(doctitle.getMain()).to.equal('The Dangerous Documentation Chronicles')
        expect(doctitle.getSubtitle()).to.equal('Based on True Events')
        expect(doctitle.getCombined()).to.equal('The Dangerous Documentation Chronicles: Based on True Events')
        expect(doctitle.hasSubtitle()).to.equal(true)
        expect(doctitle.isSanitized()).to.equal(false)
      })

      it('should get partitioned doctitle without subtitle', function () {
        const doc = asciidoctor.load('= The Dangerous Documentation Chronicles\n\n== The Ravages of Writing')
        const doctitle = doc.getDoctitle({ partition: true })
        expect(doctitle.getMain()).to.equal('The Dangerous Documentation Chronicles')
        expect(doctitle.getSubtitle()).to.be.undefined()
        expect(doctitle.getCombined()).to.equal('The Dangerous Documentation Chronicles')
        expect(doctitle.hasSubtitle()).to.equal(false)
        expect(doctitle.isSanitized()).to.equal(false)
      })

      it('should get counters', function () {
        const doc = asciidoctor.load('{counter:countme}\n\n{counter:countme}')
        doc.convert()
        const counters = doc.getCounters()
        expect(counters).to.be.an.instanceof(Object)
        expect(counters.countme).to.equal(2)
      })

      it('should get and set attribute on block', function () {
        const doc = asciidoctor.load('= Blocks story: Based on True Events\n\n== Once upon a time\n\n[bold-statement="on"]\nBlocks are amazing!')
        const paragraphBlock = doc.getBlocks()[0].getBlocks()[0]
        expect(paragraphBlock.getAttribute('bold-statement')).to.equal('on')
        paragraphBlock.setAttribute('bold-statement', 'off')
        expect(paragraphBlock.getAttribute('bold-statement')).to.equal('off')
      })

      it('should get positional attributes in getAttributes', function () {
        const doc = asciidoctor.load('[positional1,positional2,attr=value]\ntext')
        const block = doc.getBlocks()[0]
        const attributes = block.getAttributes()
        expect(Object.getOwnPropertyNames(attributes).sort()).to.have.members(['$positional', 'attr', 'style'].sort())
        expect(attributes.$positional).to.have.members(['positional1', 'positional2'])
      })

      it('should assign sectname, caption, and numeral to appendix section by default', function () {
        const doc = asciidoctor.load('[appendix]\n== Attribute Options\n\nDetails')
        const appendix = doc.getBlocks()[0]
        expect(appendix.getNodeName()).to.equal('section')
        expect(appendix.getSectionName()).to.equal('appendix')
        expect(appendix.getCaption()).to.equal('Appendix A: ')
        expect(appendix.getCaptionedTitle()).to.equal('Appendix A: Attribute Options')
        expect(appendix.getNumeral()).to.equal('A')
        appendix.setNumeral('B')
        expect(appendix.getNumeral()).to.equal('B')
        appendix.setNumeral('C')
        expect(appendix.getNumeral()).to.equal('C')
        expect(appendix.isNumbered()).to.equal(true)
      })

      it('should assign style on a block', function () {
        const doc = asciidoctor.load(`[partintro]
--
This is the introduction to the first part of our mud-encrusted journey.
--`)
        const block = doc.getBlocks()[0]
        expect(block.getStyle()).to.equal('partintro')
        block.setStyle('preface')
        expect(block.getStyle()).to.equal('preface')
      })

      it('should get the source location on a block', function () {
        const doc = asciidoctor.load(`= Book
:doctype: book

== Part 1

[partintro]
intro
`, { sourcemap: true })
        const block = doc.getBlocks()[0]
        expect(block.getSourceLocation().getLineNumber()).to.equal(4)
        expect(block.getSourceLocation().getFile()).to.be.undefined()
        expect(block.getSourceLocation().getPath()).to.equal('<stdin>')
      })

      it('should assign the level on a section', function () {
        const doc = asciidoctor.load(`= Title

== Level 1

=== Level 2

==== Level 3
`)
        const block = doc.getBlocks()[0]
        expect(block.getLevel()).to.equal(1)
        expect(block.getBlocks()[0].getLevel()).to.equal(2)
        expect(block.getBlocks()[0].getBlocks()[0].getLevel()).to.equal(3)
        block.setLevel(2)
        expect(block.getLevel()).to.equal(2)
      })

      it('should assign the title on a block', function () {
        const doc = asciidoctor.load(`= Title

== Section A

== Section B
`)
        const firstBlock = doc.getBlocks()[0]
        const secondBlock = doc.getBlocks()[1]
        expect(firstBlock.getTitle()).to.equal('Section A')
        expect(secondBlock.getTitle()).to.equal('Section B')
        secondBlock.setTitle('Section BB')
        expect(secondBlock.getTitle()).to.equal('Section BB')
      })

      it('should set an undefined/nil title on a block', function () {
        const doc = asciidoctor.load(`= Title

== Section A

== Section B
`)
        const firstBlock = doc.getBlocks()[0]
        const secondBlock = doc.getBlocks()[1]
        expect(firstBlock.getTitle()).to.equal('Section A')
        expect(secondBlock.getTitle()).to.equal('Section B')
        secondBlock.setTitle(undefined)
        expect(secondBlock.title).to.equal(Opal.nil)
        expect(secondBlock.getTitle()).to.be.undefined()
      })

      it('remove_attr should remove attribute and return previous value', function () {
        const doc = asciidoctor.load('= Document\n\n== First section\n\n[foo="bar"]\nThis is a paragraph.')
        const paragraphBlock = doc.getBlocks()[0].getBlocks()[0]
        expect(paragraphBlock.getAttribute('foo')).to.equal('bar')
        expect(paragraphBlock.removeAttribute('foo')).to.equal('bar')
        expect(paragraphBlock.removeAttribute('foo')).to.be.undefined()
      })

      it('should get list of substitutions for block', function () {
        const source = '----\nverbatim <1>\n----\n<1> verbatim text'
        const listingBlock = asciidoctor.load(source).findBy({ context: 'listing' })[0]
        expect(listingBlock.getSubstitutions()).to.have.members(['specialcharacters', 'callouts'])
      })

      it('should return whether substitution exists', function () {
        const source = '----\nverbatim <1>\n----\n<1> verbatim text'
        const listingBlock = asciidoctor.load(source).findBy({ context: 'listing' })[0]
        expect(listingBlock.hasSubstitution('callouts')).to.equal(true)
        expect(listingBlock.hasSubstitution('macros')).to.equal(false)
      })

      it('should get no section', function () {
        const source = '= Title\n\nNo section in here...'
        const doc = asciidoctor.load(source)
        expect(doc.hasSections()).to.equal(false)
        expect(doc.getSections().length).to.equal(0)
      })

      it('should return false when hasSection is called on something other than a Section or a Document', function () {
        const source = `= Title

== First section

This is a paragraph.

[NOTE]
This is a note.

== Second section

This section has a subsection!

=== Subsection

This is another paragraph.
`
        const doc = asciidoctor.load(source)
        expect(doc.hasSections()).to.equal(true)
        const sections = doc.findBy({ context: 'section' })
        expect(sections[1].hasSections()).to.equal(false)
        expect(sections[2].hasSections()).to.equal(true)
        const firstParagraph = doc.findBy({ context: 'paragraph' })[0]
        expect(firstParagraph.hasSections()).to.equal(false)
        const firstAdmonition = doc.findBy({ context: 'admonition' })[0]
        expect(firstAdmonition.hasSections()).to.equal(false)
      })

      it('should get sections', function () {
        const source = '= Title\n:sectnums!:\n\n== First section\n\n:sectnums:\n== Second section\n\n[abstract]\n== Abstract section\n\n:appendix-caption: Appx\n[appendix]\n== Copyright and License'
        const doc = asciidoctor.load(source)
        expect(doc.hasSections()).to.equal(true)
        expect(doc.getSections().length).to.equal(4)
        const firstSection = doc.getSections()[0]
        expect(firstSection.getNodeName()).to.equal('section')
        expect(firstSection.getIndex()).to.equal(0)
        expect(firstSection.getName()).to.equal('First section')
        expect(firstSection.getTitle()).to.equal('First section')
        expect(firstSection.title).to.equal('First section')
        expect(firstSection.getSectionName()).to.equal('section')
        expect(firstSection.isNumbered()).to.equal(false)
        expect(firstSection.isSpecial()).to.equal(false)
        expect(firstSection.getCaption()).to.be.undefined()
        const secondSection = doc.getSections()[1]
        expect(secondSection.getIndex()).to.equal(1)
        expect(secondSection.getName()).to.equal('Second section')
        expect(secondSection.getTitle()).to.equal('Second section')
        expect(secondSection.title).to.equal('Second section')
        expect(secondSection.getSectionName()).to.equal('section')
        expect(secondSection.isNumbered()).to.equal(true)
        expect(secondSection.isSpecial()).to.equal(false)
        expect(secondSection.getCaption()).to.be.undefined()
        const abstractSection = doc.getSections()[2]
        expect(abstractSection.getIndex()).to.equal(2)
        expect(abstractSection.getName()).to.equal('Abstract section')
        expect(abstractSection.getTitle()).to.equal('Abstract section')
        expect(abstractSection.title).to.equal('Abstract section')
        expect(abstractSection.getSectionName()).to.equal('abstract')
        expect(abstractSection.isNumbered()).to.equal(false)
        expect(abstractSection.isSpecial()).to.equal(true)
        expect(abstractSection.getCaption()).to.be.undefined()
        const appendixSection = doc.getSections()[3]
        expect(appendixSection.getIndex()).to.equal(3)
        expect(appendixSection.getName()).to.equal('Copyright and License')
        expect(appendixSection.getTitle()).to.equal('Copyright and License')
        expect(appendixSection.title).to.equal('Copyright and License')
        expect(appendixSection.getSectionName()).to.equal('appendix')
        expect(appendixSection.isNumbered()).to.equal(true)
        expect(appendixSection.isSpecial()).to.equal(true)
        expect(appendixSection.getCaption()).to.equal('Appx A: ')
      })

      it('should load source with BOM from String', function () {
        const source = '\xef\xbb\xbf= Document Title\n:lang: fr\n:fixtures-dir: spec/fixtures\n\ncontent is in {lang}\n\ninclude::{fixtures-dir}/include.adoc[]'
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const doc = asciidoctor.load(source, opts)
        expect(doc.getAttribute('lang')).to.equal('fr')
        const html = doc.convert()
        expect(html).to.include('content is in fr')
        expect(html).to.include('include content')
      })

      it('should instantiate an Inline element', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const doc = asciidoctor.load('= Empty document', opts)
        const inlineElement = asciidoctor.Inline.create(doc, 'anchor', 'Tigers', {
          type: 'ref',
          target: 'tigers',
          attributes: {
            alt: 'Beautiful tigers'
          }
        })
        expect(inlineElement.getType()).to.equal('ref')
        expect(inlineElement.getText()).to.equal('Tigers')
        expect(inlineElement.getTarget()).to.equal('tigers')
        expect(inlineElement.getAlt()).to.equal('Beautiful tigers')
      })

      it('should get document date', function () {
        const now = new Date()
        const doc = asciidoctor.load('= Empty document')
        const year = now.getFullYear().toString()
        const month = ('0' + (now.getMonth() + 1)).slice(-2)
        const day = ('0' + (now.getDate())).slice(-2)
        const hours = now.getHours()
        const minutes = now.getMinutes()
        const seconds = now.getSeconds()
        expect(doc.getAttribute('docyear')).to.equal(now.getFullYear().toString())
        expect(doc.getAttribute('docdate')).to.equal(`${year}-${month}-${day}`)
        const documentTime = doc.getAttribute('doctime')
        const documentTimeParts = documentTime.split(':')
        const documentHours = parseInt(documentTimeParts[0])
        const documentMinutes = parseInt(documentTimeParts[1])
        const documentSeconds = parseInt(documentTimeParts[2])
        expect(documentHours).to.be.within(hours - 1, hours + 1)
        expect(documentMinutes).to.be.within(minutes - 1, minutes + 1)
        expect(documentSeconds).to.be.within(seconds - 10, seconds + 10)

        expect(doc.getAttribute('localyear')).to.equal(now.getFullYear().toString())
        expect(doc.getAttribute('localdate')).to.equal(`${year}-${month}-${day}`)
        const localTime = doc.getAttribute('localtime')
        const localTimeParts = localTime.split(':')
        const localHours = parseInt(localTimeParts[0])
        const localMinutes = parseInt(localTimeParts[1])
        const localSeconds = parseInt(localTimeParts[2])
        expect(localHours).to.be.within(hours - 1, hours + 1)
        expect(localMinutes).to.be.within(minutes - 1, minutes + 1)
        expect(localSeconds).to.be.within(seconds - 10, seconds + 10)
      })

      it('should get block role', function () {
        const doc = asciidoctor.load(`= Title

[.foreword]
== Section with role

== Section without role
`)
        const sectionWithRole = doc.getBlocks()[0]
        expect(sectionWithRole.getRole()).to.equal('foreword')
        const sectionWithoutRole = doc.getBlocks()[1]
        expect(sectionWithoutRole.getRole()).to.be.undefined()
      })

      describe('Get authors', function () {
        it('should return an empty list when the document has no author', function () {
          const input = `= Getting Real: The Smarter, Faster, Easier Way to Build a Successful Web Application

Getting Real details the business, design, programming, and marketing principles of 37signals.
`
          const doc = asciidoctor.load(input)
          expect(doc.getAuthors()).to.be.an('array').that.is.empty()
        })

        it('should return the document\'s author', function () {
          const input = `= Getting Real: The Smarter, Faster, Easier Way to Build a Successful Web Application
David Heinemeier Hansson <david@37signals.com>

Getting Real details the business, design, programming, and marketing principles of 37signals.
`
          const doc = asciidoctor.load(input)
          expect(doc.getAuthors()).to.have.lengthOf(1)
          const author = doc.getAuthors()[0]
          expect(author.getEmail()).to.equal('david@37signals.com')
          expect(author.getName()).to.equal('David Heinemeier Hansson')
          expect(author.getFirstName()).to.equal('David')
          expect(author.getMiddleName()).to.equal('Heinemeier')
          expect(author.getLastName()).to.equal('Hansson')
          expect(author.getInitials()).to.equal('DHH')
        })

        it('should return the two authors defined as an author line below the document title', function () {
          const input = `= Getting Real: The Smarter, Faster, Easier Way to Build a Successful Web Application
David Heinemeier Hansson <david@37signals.com>; Jason Fried <jason@37signals.com>

Getting Real details the business, design, programming, and marketing principles of 37signals.
`
          const doc = asciidoctor.load(input)
          expect(doc.getAuthors()).to.have.lengthOf(2)
          const firstAuthor = doc.getAuthors()[0]
          expect(firstAuthor.getEmail()).to.equal('david@37signals.com')
          expect(firstAuthor.getName()).to.equal('David Heinemeier Hansson')
          expect(firstAuthor.getFirstName()).to.equal('David')
          expect(firstAuthor.getMiddleName()).to.equal('Heinemeier')
          expect(firstAuthor.getLastName()).to.equal('Hansson')
          expect(firstAuthor.getInitials()).to.equal('DHH')
          const secondAuthor = doc.getAuthors()[1]
          expect(secondAuthor.getEmail()).to.equal('jason@37signals.com')
          expect(secondAuthor.getName()).to.equal('Jason Fried')
          expect(secondAuthor.getFirstName()).to.equal('Jason')
          expect(secondAuthor.getMiddleName()).to.be.undefined()
          expect(secondAuthor.getLastName()).to.equal('Fried')
          expect(secondAuthor.getInitials()).to.equal('JF')
        })

        it('should return the two authors defined as document attributes', function () {
          const input = `= Getting Real: The Smarter, Faster, Easier Way to Build a Successful Web Application
:author_1: David Heinemeier Hansson
:email_1: david@37signals.com
:author_2: Jason Fried
:email_2: jason@37signals.com

Getting Real details the business, design, programming, and marketing principles of 37signals.
`
          const doc = asciidoctor.load(input)
          expect(doc.getAuthors()).to.have.lengthOf(2)
          const firstAuthor = doc.getAuthors()[0]
          expect(firstAuthor.getEmail()).to.equal('david@37signals.com')
          expect(firstAuthor.getName()).to.equal('David Heinemeier Hansson')
          expect(firstAuthor.getFirstName()).to.equal('David')
          expect(firstAuthor.getMiddleName()).to.equal('Heinemeier')
          expect(firstAuthor.getLastName()).to.equal('Hansson')
          expect(firstAuthor.getInitials()).to.equal('DHH')
          const secondAuthor = doc.getAuthors()[1]
          expect(secondAuthor.getEmail()).to.equal('jason@37signals.com')
          expect(secondAuthor.getName()).to.equal('Jason Fried')
          expect(secondAuthor.getFirstName()).to.equal('Jason')
          expect(secondAuthor.getMiddleName()).to.be.undefined()
          expect(secondAuthor.getLastName()).to.equal('Fried')
          expect(secondAuthor.getInitials()).to.equal('JF')
        })
      })

      describe('findBy', function () {
        it('should stop looking for blocks when StopIteration is raised', function () {
          const input = `paragraph 1

====
paragraph 2

****
paragraph 3
****
====

paragraph 4

* item
+
paragraph 5`
          const doc = asciidoctor.load(input)
          let stop = false
          const result = doc.findBy((candidate) => {
            if (stop) {
              throw new asciidoctor.StopIteration()
            }
            if (candidate.getContext() === 'paragraph') {
              if (candidate.getParent().getContext() === 'sidebar') {
                stop = true
              }
              return true
            }
          })
          expect(result.length).to.equal(3)
          expect(result[0].getContent()).to.equal('paragraph 1')
          expect(result[1].getContent()).to.equal('paragraph 2')
          expect(result[2].getContent()).to.equal('paragraph 3')
        })

        it('should only return one result when matching by id', function () {
          const input = `== Section

content

[#subsection]
=== Subsection

[#last]
content`
          const doc = asciidoctor.load(input)
          let visitedLast = false
          const result = doc.findBy({ id: 'subsection' }, (candidate) => {
            if (candidate.getId() === 'last') {
              visitedLast = true
            }
            return true
          })
          expect(result.length).to.equal(1)
          expect(visitedLast).to.be.false()
        })

        it('should skip node and its children if block returns reject', function () {
          const input = `paragraph 1

====
paragraph 2

term::
+
paragraph 3
====

paragraph 4`
          const doc = asciidoctor.load(input)
          const result = doc.findBy((candidate) => {
            const ctx = candidate.getContext()
            if (ctx === 'example') {
              return 'reject'
            } else if (ctx === 'paragraph') {
              return true
            }
          })
          expect(result.length).to.equal(2)
          expect(result[0].getContext()).to.equal('paragraph')
          expect(result[1].getContext()).to.equal('paragraph')
        })

        it('should accept node but skip its children if block returns skip_children', function () {
          const input = `====
paragraph 2

term::
+
paragraph 3
====`
          const doc = asciidoctor.load(input)
          const result = doc.findBy((candidate) => {
            if (candidate.getContext() === 'example') {
              return 'prune'
            }
          })
          expect(result.length).to.equal(1)
          expect(result[0].getContext()).to.equal('example')
        })
      })

      describe('Get list', function () {
        it('should get the items of a list', function () {
          const input = `
* fist
* second
* third`
          const doc = asciidoctor.load(input)
          const result = doc.findBy({ context: 'ulist' })
          expect(result.length).to.equal(1)
          const list = result[0]
          expect(list.hasItems()).to.be.true()
          expect(list.getItems().length).to.equal(3)
        })

        it('should get and set the list item marker', function () {
          const input = `
* fist
* second
* third`
          const doc = asciidoctor.load(input)
          const listItems = doc.findBy({ context: 'list_item' })
          expect(listItems.length).to.equal(3)
          expect(listItems[0].getMarker()).to.equal('*')
          expect(listItems[0].setMarker('.'))
          expect(listItems[0].getMarker()).to.equal('.')
        })

        it('should get and set the list item text', function () {
          const input = `
* a
* b
* c`
          const doc = asciidoctor.load(input)
          const listItems = doc.findBy({ context: 'list_item' })
          expect(listItems.length).to.equal(3)
          expect(listItems[0].hasText()).to.be.true()
          expect(listItems[0].getText()).to.equal('a')
          expect(listItems[1].getText()).to.equal('b')
          expect(listItems[2].getText()).to.equal('c')
          expect(listItems[0].setText('x'))
          expect(listItems[0].getText()).to.equal('x')
        })

        it('should get the list item parent', function () {
          const input = `
* Guillaume
* Anthonny
* Dan`
          const doc = asciidoctor.load(input)
          const listItems = doc.findBy({ context: 'list_item' })
          expect(listItems.length).to.equal(3)
          expect(listItems[0].getList().getItems().length).to.equal(3)
          expect(listItems[0].getParent().getItems().length).to.equal(3)
          expect(listItems[0].getList().getItems()[0].getText()).to.equal('Guillaume')
          expect(listItems[0].getParent().getItems()[0].getText()).to.equal('Guillaume')
        })
      })
    })

    describe('Modifying', function () {
      it('should allow document-level attributes to be modified', function () {
        const doc = asciidoctor.load('= Document Title\n:lang: fr\n\ncontent is in {lang}')
        expect(doc.getAttribute('lang')).to.equal('fr')
        doc.setAttribute('lang', 'us')
        expect(doc.getAttribute('lang')).to.equal('us')
        const html = doc.convert()
        expect(html).to.include('content is in us')
      })

      it('should be able to remove substitution from block', function () {
        const source = '....\n<foobar>\n....'
        const literalBlock = asciidoctor.load(source).findBy({ context: 'literal' })[0]
        literalBlock.removeSubstitution('specialcharacters')
        expect(literalBlock.hasSubstitution('specialcharacters')).to.equal(false)
        expect(literalBlock.getContent()).to.equal('<foobar>')
      })

      it('should add a new Section to the document', function () {
        const doc = asciidoctor.load(`= Title

== Section A`)
        const sectionB = asciidoctor.Section.create(doc, 2, false, { attributes: { foo: 'bar' } })
        sectionB.setTitle('Section B')
        doc.append(sectionB)
        const sections = doc.findBy({ context: 'section' })
        const secondSection = sections[2]
        expect(secondSection.getLevel()).to.equal(2)
        expect(secondSection.getName()).to.equal('Section B')
        expect(secondSection.getTitle()).to.equal('Section B')
        expect(secondSection.getSectionName()).to.be.undefined()
        expect(secondSection.isNumbered()).to.equal(false)
        expect(secondSection.isSpecial()).to.equal(false)
        expect(secondSection.getCaption()).to.be.undefined()
        expect(secondSection.getAttribute('foo')).to.equal('bar')
      })

      it('should set role', function () {
        const doc = asciidoctor.load(`= Title

[.foreword]
== Foreword`)
        const sectionWithRole = doc.getBlocks()[0]
        expect(sectionWithRole.getRole()).to.equal('foreword')
        sectionWithRole.setRole('afterword')
        expect(sectionWithRole.getRole()).to.equal('afterword')

        sectionWithRole.setRole('afterword last')
        expect(sectionWithRole.getRole()).to.equal('afterword last')

        sectionWithRole.setRole('lastword', 'closing')
        expect(sectionWithRole.getRole()).to.equal('lastword closing')

        sectionWithRole.setRole(['finalword', 'conclude'])
        expect(sectionWithRole.getRole()).to.equal('finalword conclude')
      })
    })

    describe('Creating', function () {
      it('should create a new Block', function () {
        const doc = asciidoctor.load('= Title')
        const paragraph = asciidoctor.Block.create(doc, 'paragraph', { subs: 'normal', source: '_This_ is a <test>', attributes: { foo: 'bar' } })
        expect(paragraph.getContent()).to.equal('<em>This</em> is a &lt;test&gt;')
        expect(paragraph.getAttribute('foo')).to.equal('bar')
      })

      it('should assign a caption on a Block', function () {
        const doc = asciidoctor.load('= Title')
        const image = asciidoctor.Block.create(doc, 'image', {
          content_model: 'empty',
          attributes: {
            target: `${testOptions.baseDir}/spec/fixtures/images/cat.png[]`,
            format: 'png'
          }
        })
        image.setTitle('A cat')
        image.assignCaption(undefined, 'figure')
        expect(image.getCaptionedTitle()).to.equal('Figure 1. A cat')
        image.setCaption(undefined)
        expect(image.getCaption()).to.be.undefined()
        image.assignCaption('Figure A. ')
        expect(image.getCaptionedTitle()).to.equal('Figure A. A cat')
        image.setCaption(undefined)
        image.setTitle('A nice cat')
        image.assignCaption('Figure I. ')
        expect(image.getCaptionedTitle()).to.equal('Figure I. A nice cat')
        image.assignCaption('Figure X. ')
        // caption is still assigned!
        expect(image.getCaptionedTitle()).to.equal('Figure I. A nice cat')
      })
    })

    describe('Converting', function () {
      it('should convert a simple document with a title 2', function () {
        const html = asciidoctor.convert('== Test')
        expect(html).to.include('<h2 id="_test">Test</h2>')
      })

      it('should return an empty string when there\'s no candidate for inline conversion', function () {
        // Converting a document with inline document type should produce an empty string
        // Read more: http://asciidoctor.org/docs/user-manual/#document-types
        const options = { doctype: 'inline' }
        const content = '= Document Title\n\n== Introduction\n\nA simple paragraph.'
        let html = asciidoctor.convert(content, options)
        expect(html).to.equal('')
        const doc = asciidoctor.load(content, options)
        html = doc.convert()
        expect(html).to.equal('')
      })

      it('should convert a simple document with a title 3', function () {
        const html = asciidoctor.convert('=== Test')
        expect(html).to.include('<h3 id="_test">Test</h3>')
      })

      it('should convert a document with tabsize', function () {
        const html = asciidoctor.convert('= Learn Go\n:tabsize: 2\n\n[source]\n----\npackage main\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, playground")\n}\n----')
        expect(html).to.include('<div class="listingblock">\n<div class="content">\n<pre class="highlight"><code>package main\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, playground")\n}</code></pre>\n</div>\n</div>')
      })

      it('should convert a document with unicode', function () {
        const html = asciidoctor.convert('= HubPress\nAnthonny Quérouil\n\n{doctitle} was written by {firstname} {lastname}.\n\n[[bière]]\n== La bière\n\nLa bière c\'est la vie.\n\n[[ビール]]\n== ビール')
        expect(html).to.include('was written by Anthonny Quérouil.')
        expect(html).to.include('id="ビール"')
        expect(html).to.include('id="bière"')
      })

      it('should embed assets', function () {
        const options = {
          doctype: 'article',
          safe: 'unsafe',
          header_footer: true,
          base_dir: testOptions.baseDir,
          attributes: ['showtitle', 'stylesheet=asciidoctor.css', 'stylesdir=' + testOptions.baseDir + '/build/css']
        }
        const html = asciidoctor.convert('=== Test', options)
        expect(html).to.include('Asciidoctor default stylesheet')
      })

      it('should produce a html5 document with font icons', function () {
        const options = { attributes: 'icons=font@' }
        const html = asciidoctor.convert('= Document\n\nThis is a simple document.\n\n== Section\n\nCAUTION: This is important!', options)
        expect(html).to.include('<i class="fa icon-caution" title="Caution"></i>')
      })

      it('should convert a document with out of sequence section title', function () {
        const input = `= Document
:sectnums:

= Introduction to Asciidoctor

=== Asciidoctor's most notable benefits`
        const html = asciidoctor.convert(input)
        expect(html).to.include('<h3 id="_asciidoctors_most_notable_benefits">.1. Asciidoctor&#8217;s most notable benefits</h3>')
      })

      it('should convert a table and compute columns sizes', function () {
        const content = `
[cols="1e,1,5a",frame="topbot",options="header"]
|====
|Name |Backends |Description

|id |html4, html5, xhtml11, docbook |
Unique identifier typically serve as link targets.
Can also be set by the 'BlockId' element.

|role |html4, html5, xhtml11, docbook |
Role contains a string used to classify or subclassify an element and
can be applied to AsciiDoc block elements.  The AsciiDoc 'role'
attribute is translated to the 'role' attribute in DocBook outputs and
is included in the 'class' attribute in HTML outputs, in this respect
it behaves like the <<X96,quoted text role attribute>>.

DocBook XSL Stylesheets translate DocBook 'role' attributes to HTML
'class' attributes; CSS can then be used
http://www.sagehill.net/docbookxsl/UsingCSS.html[to style the
generated HTML].

|reftext |docbook |
'reftext' is used to set the DocBook 'xreflabel' attribute.
The 'reftext' attribute can an also be set by the 'BlockId' element.

|====`
        const html = asciidoctor.convert(content)
        expect(html).to.include('<table ')
        expect(html).to.include('width: 14.2857%')
      })

      it('should convert a conditional expression', function () {
        const content = `ifeval::["{backend}" == "html5"]
Hello HTML5
endif::[]`
        const html = asciidoctor.convert(content)
        expect(html).to.include('Hello HTML5')
      })

      it('should convert a pass inline macro with a normal sub group minus the attributes sub', function () {
        const content = `:adjective: strong
pass:normal,-attributes[*really* {adjective} \\]]`
        const html = asciidoctor.convert(content)
        expect(html).to.include('<p><strong>really</strong> {adjective} ]</p>')
      })

      it('should convert a pass inline macro with a normal sub grou', function () {
        const content = `:adjective: strong
pass:normal[*really* {adjective} \\]]`
        const html = asciidoctor.convert(content)
        expect(html).to.include('<p><strong>really</strong> strong ]</p>')
      })

      it('should convert a stem inline macro with an attribute', function () {
        const content = `:value: 4
stem:normal[\\\\sqrt{{value}} = 2 \\]]`
        const html = asciidoctor.convert(content)
        expect(html).to.include('<p>\\$\\\\sqrt{4} = 2 ]\\$</p>')
      })

      if (testOptions.coreVersion.gte('2.0.11')) {
        it('should process multiple single-item menu macros in single line', function () {
          const html = asciidoctor.convert('Click menu:File[] and menu:Edit[]', { doctype: 'inline', attributes: { experimental: '' } })
          expect(html).to.include('Click <b class="menuref">File</b> and <b class="menuref">Edit</b>')
        })
      }

      if (testOptions.coreVersion.gte('2.0.8')) {
        it('should embed an SVG with a width (but no height)', function () {
          const options = { safe: 'safe', attributes: { 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::${testOptions.baseDir}/spec/fixtures/images/cc-zero.svg[Embedded,300,opts=inline]`, options)
          expect(html).to.not.include('<?xml version="1.0" encoding="UTF-8" standalone="no"?>')
          if (testOptions.coreVersion.gte('2.0.12')) {
            expect(html).to.include('<svg id="svg2" xmlns="http://www.w3.org/2000/svg" version="1.0" width="300">')
          } else {
            expect(html).to.include('<svg id="svg2" xmlns="http://www.w3.org/2000/svg" version="1.0" width="300px">')
          }
          expect(html).to.include('<path d="m32 13.58c-10.564 0-13.22 9.97-13.22 18.42-0.002 8.452 2.66 18.42 13.22 18.42 10.565 0 13.22-9.97 13.22-18.42s-2.655-18.42-13.22-18.42zm0 6.95c0.43 0 0.82 0.06 1.19 0.15 0.76 0.66 1.13 1.564 0.4 2.83l-7.034 12.926c-0.216-1.636-0.246-3.24-0.246-4.436 0-3.723 0.257-11.474 5.69-11.474zm5.267 5.957c0.433 1.983 0.433 4.056 0.433 5.513 0 3.72-0.26 11.475-5.7 11.475-0.425 0-0.82-0.045-1.185-0.135-0.075-0.022-0.135-0.04-0.205-0.07-0.11-0.03-0.23-0.07-0.333-0.11-1.21-0.513-1.972-1.444-0.877-3.09l7.867-13.58z"/>')
        })
        it('should remove the preamble from embedded SVG', function () {
          const options = { safe: 'safe', attributes: { 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::${testOptions.baseDir}/spec/fixtures/images/cc-zero.svg[opts=inline]`, options)
          expect(html).to.not.include('<?xml version="1.0" encoding="UTF-8" standalone="no"?>')
          expect(html).to.include('<svg id="svg2" xmlns="http://www.w3.org/2000/svg" height="64" width="64" version="1.0">')
          expect(html).to.include('<path d="m32 13.58c-10.564 0-13.22 9.97-13.22 18.42-0.002 8.452 2.66 18.42 13.22 18.42 10.565 0 13.22-9.97 13.22-18.42s-2.655-18.42-13.22-18.42zm0 6.95c0.43 0 0.82 0.06 1.19 0.15 0.76 0.66 1.13 1.564 0.4 2.83l-7.034 12.926c-0.216-1.636-0.246-3.24-0.246-4.436 0-3.723 0.257-11.474 5.69-11.474zm5.267 5.957c0.433 1.983 0.433 4.056 0.433 5.513 0 3.72-0.26 11.475-5.7 11.475-0.425 0-0.82-0.045-1.185-0.135-0.075-0.022-0.135-0.04-0.205-0.07-0.11-0.03-0.23-0.07-0.333-0.11-1.21-0.513-1.972-1.444-0.877-3.09l7.867-13.58z"/>')
        })
      }

      it('should restore attributes to the previously saved state (attributes in header).', function () {
        const docWithAttributes = asciidoctor.load(`= Document Title
:foo: bar

content

:foo: baz

content`)
        expect(docWithAttributes.getAttribute('foo')).to.equal('bar')
        docWithAttributes.convert()
        expect(docWithAttributes.getAttribute('foo')).to.equal('baz')
        docWithAttributes.restoreAttributes()
        expect(docWithAttributes.getAttribute('foo')).to.equal('bar')
      })

      describe('Embed an image when data-uri is defined', function () {
        it('should embed a jpeg image', function () {
          const options = { safe: 'safe', attributes: { 'data-uri': true, 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::${testOptions.baseDir}/spec/fixtures/images/litoria-chloris.jpg[]`, options)
          expect(html).to.include('img src="data:image/jpg;base64,')
        })
        it('should embed an svg image', function () {
          const options = { safe: 'safe', attributes: { 'data-uri': true, 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::${testOptions.baseDir}/spec/fixtures/images/cc-zero.svg[]`, options)
          expect(html).to.include('img src="data:image/svg+xml;base64,')
        })
        it('should embed a png image', function () {
          const options = { safe: 'safe', attributes: { 'data-uri': true, 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::${testOptions.baseDir}/spec/fixtures/images/cat.png[]`, options)
          expect(html).to.include('img src="data:image/png;base64,')
        })
        if (testOptions.remoteBaseUri) {
          it('should embed a remote png image', function () {
            const options = { safe: 'safe', attributes: { 'data-uri': true, 'allow-uri-read': true } }
            const html = asciidoctor.convert(`image::${testOptions.remoteBaseUri}/cat.png[]`, options)
            expect(html).to.include('img src="data:image/png;base64,')
          })
        }
        it('should not throw an exception if the image does not exists', function () {
          const options = { safe: 'safe', attributes: { 'data-uri': true, 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::${testOptions.baseDir}/spec/fixtures/images/not_found.png[]`, options)
          if (testOptions.platform === 'Browser') {
            // The target is an URI (file://).
            // In this case, Asciidoctor will return the image URI when the image is not found...
            expect(html).to.include(`<img src="${testOptions.baseDir}/spec/fixtures/images/not_found.png" alt="not found">`)
          } else {
            // ... otherwise Asciidoctor will return an empty image
            expect(html).to.include('<img src="data:image/png;base64," alt="not found">')
          }
        })
      })

      it('should playback attributes', function () {
        const content = `= Title
:next-section:

This is a preamble!

:next-section: First section

== First section

:next-section: Second section

== Second section
`
        const doc = asciidoctor.load(content)
        const blocks = doc.getBlocks()
        expect(blocks.length).to.equal(3)
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i]
          if (i === 0) {
            expect(doc.getAttribute('next-section')).to.equal('')
            doc.playbackAttributes(block.getAttributes())
            expect(doc.getAttribute('next-section')).to.equal('')
          } else if (i === 1) {
            expect(doc.getAttribute('next-section')).to.equal('')
            doc.playbackAttributes(block.getAttributes())
            expect(doc.getAttribute('next-section')).to.equal('First section')
          } else if (i === 2) {
            expect(doc.getAttribute('next-section')).to.equal('First section')
            doc.playbackAttributes(block.getAttributes())
            expect(doc.getAttribute('next-section')).to.equal('Second section')
          }
        }
        doc.playbackAttributes({
          attribute_entries: [{
            name: 'next-section',
            value: 'Third section',
            negate: false
          }]
        })
        expect(doc.getAttribute('next-section')).to.equal('Third section')
      })

      it('should convert externalized footnotes', function () {
        const content = `:fn-hail-and-rainbow: footnote:[The double hail-and-rainbow level makes my toes tingle.]
:fn-disclaimer: footnote:disclaimer[Opinions are my own.]

The hail-and-rainbow protocol can be initiated at five levels:
double, tertiary, supernumerary, supermassive, and apocalyptic party.{fn-hail-and-rainbow}
A bold statement!{fn-disclaimer}

Another outrageous statement.{fn-disclaimer}`
        const html = asciidoctor.convert(content, { standalone: false })
        expect(html).to.equal(`<div class="paragraph">
<p>The hail-and-rainbow protocol can be initiated at five levels:
double, tertiary, supernumerary, supermassive, and apocalyptic party.<sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>
A bold statement!<sup class="footnote" id="_footnote_disclaimer">[<a id="_footnoteref_2" class="footnote" href="#_footnotedef_2" title="View footnote.">2</a>]</sup></p>
</div>
<div class="paragraph">
<p>Another outrageous statement.<sup class="footnoteref">[<a class="footnote" href="#_footnotedef_2" title="View footnote.">2</a>]</sup></p>
</div>
<div id="footnotes">
<hr>
<div class="footnote" id="_footnotedef_1">
<a href="#_footnoteref_1">1</a>. The double hail-and-rainbow level makes my toes tingle.
</div>
<div class="footnote" id="_footnotedef_2">
<a href="#_footnoteref_2">2</a>. Opinions are my own.
</div>
</div>`)
      })
    })

    describe('Wildcard character match', function () {
      it('should replace wildcard with negated line feed', function () {
        expect(asciidoctor.$$const.UnorderedListRx.source).not.to.include('.*')
        expect(asciidoctor.$$const.UnorderedListRx.source).to.include('[^\\n]*')
      })

      it('should match list item in an undered list item that has a trailing line separator', function () {
        const html = asciidoctor.convert('* a\n* b\u2028\n* c')
        expect(html).to.include('<li>\n<p>b</p>\n</li>')
      })

      it('should match line separator in text of list item in an unordered list', function () {
        const html = asciidoctor.convert('* a\n* b\u2028b')
        expect(html).to.include('<li>\n<p>b\u2028b</p>\n</li>')
      })

      it('should match line separator in text of list item in an ordered list', function () {
        const html = asciidoctor.convert('. a\n. b\u2028b')
        expect(html).to.include('<li>\n<p>b\u2028b</p>\n</li>')
      })

      it('should match line separator in text of list item in a description list', function () {
        const html = asciidoctor.convert('a:: a\nb:: b\u2028b')
        expect(html).to.include('<dd>\n<p>b\u2028b</p>\n</dd>')
      })

      it('should match line separator in text of list item in a nested description list', function () {
        const html = asciidoctor.convert('a:: a\nb:: b\nc::: c\u2028c\nd:: d')
        expect(html).to.include('<dd>\n<p>c\u2028c</p>\n</dd>')
      })

      it('should match line separator in text of list item in a callout list', function () {
        const html = asciidoctor.convert('----\nline 1 <1>\nline 2 <2>\n----\n<1> a\n<2> b\u2028b')
        expect(html).to.include('<li>\n<p>b\u2028b</p>\n</li>')
      })

      it('should match line separator in block title', function () {
        const html = asciidoctor.convert('.block\u2028title\ncontent')
        expect(html).to.include('<div class="title">block\u2028title</div>')
      })
    })

    describe('Escaping', function () {
      it('should escape table pipe', function () {
        const html = asciidoctor.convert('|===\n|`-a\\|-b`|Options cannot be used together\n|===')
        const columns = (html.match(/<td/g) || []).length
        expect(columns).to.equal(2)
      })
    })

    describe('Include', function () {
      it('should include file with a relative path (base_dir is explicitly defined)', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const html = asciidoctor.convert('include::spec/fixtures/include.adoc[]', opts)
        expect(html).to.include('include content')
      })

      it('should include file with a relative expandable path (base_dir is explicitly defined)', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const html = asciidoctor.convert('include::spec/../spec/fixtures/include.adoc[]', opts)
        expect(html).to.include('include content')
      })

      it('should include file with an absolute path (base_dir is not defined)', function () {
        const opts = { safe: 'safe', attributes: { 'allow-uri-read': true } }
        const html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include.adoc[]', opts)
        expect(html).to.include('include content')
      })

      it('should include file with an absolute expandable path (base_dir is not defined)', function () {
        const opts = { safe: 'safe', attributes: { 'allow-uri-read': true } }
        const html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/../spec/fixtures/include.adoc[]', opts)
        expect(html).to.include('include content')
      })

      it('should include csv file in table', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const html = asciidoctor.convert(',===\ninclude::spec/fixtures/sales.csv[]\n,===', opts)
        expect(html).to.include('March')
      })
    })

    describe('Converter', function () {
      it('should get converter factory', function () {
        const factory = asciidoctor.Converter.Factory.getDefault(false)
        expect(factory).to.be.an.instanceof(Object)
        expect(factory.$$name).to.equal('Converter')
      })

      it('should create instance of html5 converter', function () {
        const converter = asciidoctor.Converter.Factory.getDefault(false).create('html5')
        expect(converter).to.be.an.instanceof(Object)
        expect(converter.$$class.$name()).to.equal('Asciidoctor::Converter::Html5Converter')
      })

      it('should be able to convert node using converter instance retrieved from factory', function () {
        const converter = asciidoctor.Converter.Factory.getDefault(false).create('html5')
        const para = asciidoctor.load('text').getBlocks()[0]
        const result = converter.convert(para)
        expect(result).to.include('<p>text</p>')
      })
    })

    describe('Extensions', function () {
      it('should get global extension', function () {
        try {
          asciidoctor.Extensions.register(function () {
            this.treeProcessor(function () {
              const self = this
              self.process(function (doc) {
                doc.append(self.createBlock(doc, 'paragraph', 'd', {}))
              })
            })
          })

          const doc = asciidoctor.load('test')
          expect(doc.getExtensions()).to.be.an('object')
          expect(doc.getExtensions().tree_processor_extensions).to.have.lengthOf(1)
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })

      it('should get document extension', function () {
        const registry = asciidoctor.Extensions.create()
        const opts = { extension_registry: registry }
        registry.treeProcessor(function () {
          const self = this
          self.process(function (doc) {
            doc.append(self.createBlock(doc, 'paragraph', 'd', {}))
          })
        })
        const doc = asciidoctor.load('test', opts)
        expect(doc.getExtensions()).to.be.an('object')
        expect(doc.getExtensions().tree_processor_extensions).to.have.lengthOf(1)
      })

      it('should preprend the extension in the list', function () {
        const registry = asciidoctor.Extensions.create()
        const opts = { extension_registry: registry }
        registry.preprocessor(function () {
          const self = this
          self.process(function (doc, reader) {
            const lines = reader.lines
            for (let i = 0; i < lines.length; i++) {
              // starts with
              const match = lines[i].match(/\/\/ smiley/)
              if (match) {
                lines[i] = ':)'
              }
            }
            return reader
          })
        })
        // this extension is prepended (higher precedence)
        registry.preprocessor(function () {
          const self = this
          self.prepend()
          self.process(function (doc, reader) {
            const lines = reader.lines
            for (let i = 0; i < lines.length; i++) {
              // starts with
              const match = lines[i].match(/\/\/ smiley/)
              if (match) {
                lines[i] = ':('
              }
            }
            return reader
          })
        })
        const resultWithExtension = asciidoctor.convert('// smiley', opts)
        expect(resultWithExtension).to.include(':(') // sad face because the second extension is prepended
      })

      it('should append the extension in the list (default)', function () {
        const registry = asciidoctor.Extensions.create()
        const opts = { extension_registry: registry }
        registry.preprocessor(function () {
          const self = this
          self.process(function (doc, reader) {
            const lines = reader.lines
            for (let i = 0; i < lines.length; i++) {
              // starts with
              const match = lines[i].match(/\/\/ smiley/)
              if (match) {
                lines[i] = ':)'
              }
            }
            return reader
          })
        })
        // this extension is appended by default (lower precedence)
        registry.preprocessor(function () {
          const self = this
          self.process(function (doc, reader) {
            const lines = reader.lines
            for (let i = 0; i < lines.length; i++) {
              // starts with
              const match = lines[i].match(/\/\/ smiley/)
              if (match) {
                lines[i] = ':('
              }
            }
            return reader
          })
        })
        const resultWithExtension = asciidoctor.convert('// smiley', opts)
        expect(resultWithExtension).to.include(':)') // happy face because the second extension is appended
      })

      it('should be able to register preferred tree processor', function () {
        const SelfSigningTreeProcessor = asciidoctor.Extensions.createTreeProcessor('SelfSigningTreeProcessor', {
          process: function (document) {
            document.append(this.createBlock(document, 'paragraph', 'SelfSigningTreeProcessor', {}))
          }
        })
        try {
          asciidoctor.Extensions.register(function () {
            this.treeProcessor(function () {
              const self = this
              self.process(function (doc) {
                doc.append(self.createBlock(doc, 'paragraph', 'd', {}))
              })
            })
            this.treeProcessor(function () {
              const self = this
              self.prefer()
              self.process(function (doc) {
                doc.append(self.createBlock(doc, 'paragraph', 'c', {}))
              })
            })
            this.prefer('tree_processor', asciidoctor.Extensions.newTreeProcessor('AwesomeTreeProcessor', {
              process: function (doc) {
                doc.append(this.createBlock(doc, 'paragraph', 'b', {}))
              }
            }))
            this.prefer('tree_processor', asciidoctor.Extensions.newTreeProcessor({
              process: function (doc) {
                doc.append(this.createBlock(doc, 'paragraph', 'a', {}))
              }
            }))
            this.prefer('tree_processor', SelfSigningTreeProcessor)
          })
          const doc = asciidoctor.load('')
          const lines = doc.getBlocks().map(function (block) {
            return block.getSourceLines()[0]
          })
          expect(lines).to.have.members(['SelfSigningTreeProcessor', 'a', 'b', 'c', 'd'])
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })

      it('should register an inline macro with short format', function () {
        try {
          asciidoctor.Extensions.register(function () {
            this.inlineMacro('label', function () {
              const self = this
              self.matchFormat('short')
              self.parseContentAs('text')
              self.process(function (parent, _, attrs) {
                return self.createInline(parent, 'quoted', `<label>${attrs.text}</label>`)
              })
            })
          })
          const html = asciidoctor.convert('label:[Checkbox]', { doctype: 'inline' })
          expect(html).to.equal('<label>Checkbox</label>')
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })

      it('should register an block macro that creates link', function () {
        try {
          asciidoctor.Extensions.register(function () {
            this.blockMacro('extlink', function () {
              const self = this
              self.process(function (parent, target, attrs) {
                let text
                if (attrs.text === '') {
                  text = target
                }
                const openBlock = self.createBlock(parent, 'open', [], { role: 'external-url' })
                openBlock.title = attrs.title
                const link = self.createInline(parent, 'anchor', text, { type: 'link', target: target })
                openBlock.append(link)
                return openBlock
              })
            })
          })
          const html = asciidoctor.convert('extlink::http://github.com[title="GitHub"]')
          expect(html).to.equal(`<div class="openblock external-url">
<div class="title">GitHub</div>
<div class="content">
<a href="http://github.com"></a>
</div>
</div>`)
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })

      it('should parse attributes', function () {
        let parsedAttrs = {}
        const registry = asciidoctor.Extensions.create()
        registry.block(function () {
          this.named('attrs')
          this.onContext('open')
          this.process(function (parent, reader) {
            parsedAttrs = this.parseAttributes(parent, reader.readLine(), { positional_attributes: ['a', 'b'] })
            Object.assign(parsedAttrs, this.parseAttributes(parent, 'foo={foo}', { sub_attributes: true }))
          })
        })
        asciidoctor.convert(`:foo: bar
[attrs]
--
a,b,c,key=val
--
`, { extension_registry: registry })
        expect(parsedAttrs.a).to.equal('a')
        expect(parsedAttrs.b).to.equal('b')
        expect(parsedAttrs.key).to.equal('val')
        expect(parsedAttrs.foo).to.equal('bar')
      })

      it('should not share attributes between parsed blocks', function () {
        const registry = asciidoctor.Extensions.create()
        registry.block(function () {
          this.named('wrap')
          this.onContext('open')
          this.process(function (parent, reader, attrs) {
            const wrap = this.createOpenBlock(parent, undefined, attrs)
            return this.parseContent(wrap, reader.readLines())
          })
        })
        const input = `
[wrap]
--
[foo=bar]
====
content
====
[baz=qux]
====
content
====
--
`
        const doc = asciidoctor.load(input, { extension_registry: registry })
        expect(doc.getBlocks().length).to.equal(1)
        const wrap = doc.getBlocks()[0]
        expect(wrap.getBlocks().length).to.equal(2)
        expect(Object.keys(wrap.getBlocks()[0].getAttributes()).length).to.equal(2)
        expect(Object.keys(wrap.getBlocks()[1].getAttributes()).length).to.equal(2)
        expect(wrap.getBlocks()[1].getAttributes().foo).to.be.undefined()
      })
    })

    describe('Reader', function () {
      it('should read the content', function () {
        let read = ''
        let lines = ''
        let string = ''
        let hasMoreLines = ''
        let isEmpty = ''
        let peekLine = ''
        let readLine = ''
        let readLines = ''
        const registry = asciidoctor.Extensions.create()
        registry.block(function () {
          const self = this
          self.named('plantuml')
          self.onContext(['listing'])
          self.parseContentAs('raw')
          self.process(function (parent, reader) {
            read = reader.read()
            lines = reader.getLines()
            string = reader.getString()
            hasMoreLines = reader.hasMoreLines()
            isEmpty = reader.isEmpty()
            peekLine = reader.peekLine()
            readLine = reader.readLine()
            readLines = reader.readLines()
          })
        })
        const input = `
[plantuml]
----
alice -> bob
bob -> alice
----`
        asciidoctor.convert(input, { extension_registry: registry })
        expect(read).to.equal(`alice -> bob
bob -> alice`)
        expect(lines).to.be.an('array').that.is.empty()
        expect(string).to.equal('')
        expect(hasMoreLines).to.be.false()
        expect(isEmpty).to.be.true()
        expect(peekLine).to.be.undefined()
        expect(readLine).to.be.undefined()
        expect(readLines).to.be.an('array').that.is.empty()
      })
    })

    describe('Reading', function () {
      it('should read utf8 encoded data', () => {
        const doc = asciidoctor.load('empty', { attributes: { 'allow-uri-read': true } })
        const csv = doc.readContents(testOptions.baseDir + '/spec/fixtures/sales.csv')
          .replace(/\r\n|\n|\r/gm, '-')
        expect(csv).to.equal('Month,Value--January,12-February,24-March,20-April,32-')
      })
    })

    describe('Syntax Highligther', function () {
      it('should return the syntax highlighter class registered for the specified name', () => {
        const highlightjsSyntaxHighlighter = asciidoctor.SyntaxHighlighter.for('highlight.js')
        expect(highlightjsSyntaxHighlighter.$$name).to.equal('HighlightJsAdapter')
        const rougeSyntaxHighlighter = asciidoctor.SyntaxHighlighter.for('rouge')
        expect(rougeSyntaxHighlighter).to.be.undefined()
      })

      it('should register a new syntax highlighter', () => {
        asciidoctor.SyntaxHighlighter.register('unavailable', {
          initialize: function (name, backend, opts) {
            this.backend = opts.document.getAttribute('backend')
            this.super()
          },
          format: (node, language) => {
            return `<pre class="highlight"><code class="language-${language}" data-lang="${language}">${node.getContent()}</code></pre>`
          },
          handlesHighlighting: () => false,
          hasDocinfo: (location) => location === 'head',
          docinfo: function (location) {
            if (this.backend !== 'html5') {
              return ''
            }
            if (location === 'head') {
              return '<style>pre.highlight{background-color: lightgrey}</style>'
            }
          }
        })
        const source = `[source,ruby]
----
puts 'Hello, World!'
----`
        const doc = asciidoctor.load(source, { attributes: { 'source-highlighter': 'unavailable' } })
        const html = doc.convert({ standalone: true })
        expect(html).to.include('<pre class="highlight"><code class="language-ruby" data-lang="ruby">puts \'Hello, World!\'</code></pre>')
        expect(html).to.include('<style>pre.highlight{background-color: lightgrey}</style>')
      })

      it('should register a class as a new syntax highlighter', () => {
        class HtmlPipelineAdapter {
          constructor () {
            this.defaultClass = 'prettyprint'
          }

          format (node, lang, opts) {
            return `<pre${lang ? ` lang="${lang}"` : ''} class="${this.defaultClass}"><code>${node.getContent()}</code></pre>`
          }
        }

        asciidoctor.SyntaxHighlighter.register('html-pipeline', HtmlPipelineAdapter)
        const source = `[source,ruby]
----
puts 'Hello, World!'
----`
        const doc = asciidoctor.load(source, { attributes: { 'source-highlighter': 'html-pipeline' } })
        const html = doc.convert()
        expect(html).to.include('<pre lang="ruby" class="prettyprint"><code>puts \'Hello, World!\'</code></pre>')
      })

      it('should register a class as a new syntax highlighter which handles highlighting', () => {
        class HtmlPipelineAdapter {
          constructor () {
            this.defaultClass = 'prettyprint'
          }

          format (node, lang, opts) {
            if (lang) {
              return `<pre${lang ? ` lang="${lang}"` : ''} class="${this.defaultClass}"><code>${node.getContent()}</code></pre>`
            }
            return `<pre>${node.getContent()}</pre>`
          }

          highlight (node, source, lang, opts) {
            if (opts.callouts) {
              const lines = source.split('\n')
              for (const idx in opts.callouts) {
                const lineIndex = parseInt(idx)
                const line = lines[lineIndex]
                lines[lineIndex] = `<span class="has-callout${opts.callouts[idx][0][0] ? ' has-comment' : ''}">${line}</span>`
              }
              source = lines.join('\n')
            }
            if (lang) {
              return `<span class="has-lang lang-${lang}">${source}</span>`
            }
            return source
          }

          handlesHighlighting () {
            return true
          }

          hasDocinfo () {
            return false
          }
        }

        asciidoctor.SyntaxHighlighter.register('html-pipeline', HtmlPipelineAdapter)
        const source = `[source,ruby]
----
puts 'Hello, World!' # <1>
<2>
----
<1> Prints 'Hello, World!'
<2> ...

[source]
.options/zones.txt
----
Europe/London
America/New_York
----`
        const doc = asciidoctor.load(source, { attributes: { 'source-highlighter': 'html-pipeline' } })
        const html = doc.convert()
        expect(html).to.include(`<pre lang="ruby" class="prettyprint"><code><span class="has-lang lang-ruby"><span class="has-callout has-comment">puts 'Hello, World!' </span># <b class="conum">(1)</b>
<span class="has-callout"></span><b class="conum">(2)</b>
</span></code></pre>`)
        expect(html).to.include('<pre>Europe/London\nAmerica/New_York</pre>')
      })

      it('should register a class as a new syntax highlighter with a docinfo', () => {
        class PrismClientHighlighter {
          constructor (name, backend, opts) {
            this.backend = opts.document.getAttribute('backend')
          }

          format (node, lang, opts) {
            if (lang) {
              return `<pre${lang ? ` lang="${lang}"` : ''} class="prism${opts.nowrap === false ? ' wrap' : ' nowrap'}"><code>${node.getContent()}</code></pre>`
            }
            return `<pre>${node.getContent()}</pre>`
          }

          hasDocinfo (location) {
            return location === 'head'
          }

          docinfo (location) {
            if (this.backend !== 'html5') {
              return ''
            }
            if (location === 'head') {
              return '<style>pre.prism{background-color: lightgrey}</style>'
            }
          }
        }

        asciidoctor.SyntaxHighlighter.register('prism', PrismClientHighlighter)
        const source = `[source,ruby]
----
puts 'Hello, World!'
----

[source]
.options/zones.txt
----
Europe/London
America/New_York
----`
        const doc = asciidoctor.load(source, { attributes: { 'source-highlighter': 'prism' } })
        const html = doc.convert({ standalone: true })
        expect(html).to.include('<pre lang="ruby" class="prism wrap"><code>puts \'Hello, World!\'</code></pre>')
        expect(html).to.include('<pre>Europe/London\nAmerica/New_York</pre>')
        expect(html).to.include('<style>pre.prism{background-color: lightgrey}</style>')
      })
    })

    describe('Table', function () {
      it('should create a table, a column and a cell', function () {
        try {
          asciidoctor.Extensions.register(function () {
            this.blockMacro('table', function () {
              const self = this
              self.process(function (parent) {
                const table = asciidoctor.Table.create(parent, {})
                table.setRowCount(1)
                table.setColumnCount(1)
                const firstColumn = asciidoctor.Table.Column.create(table, 0, {})
                const firstCell = asciidoctor.Table.Cell.create(firstColumn, 'Cell in column 1, row 1', {}, {})
                table.getBodyRows().push([firstCell])
                return table
              })
            })
          })
          const html = asciidoctor.convert('table::[]')
          expect(html).to.equal(`<table class="tableblock frame-all grid-all stretch">
<colgroup>
</colgroup>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Cell in column 1, row 1</p></td>
</tr>
</tbody>
</table>`)
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })
      it('should create a table, a column and a cell with a row span', function () {
        try {
          asciidoctor.Extensions.register(function () {
            this.blockMacro('table', function () {
              const self = this
              self.process(function (parent) {
                const table = asciidoctor.Table.create(parent, {})
                table.setRowCount(2)
                const firstColumn = asciidoctor.Table.Column.create(table, 0, {})
                const firstColumnFirstCell = asciidoctor.Table.Cell.create(firstColumn, 'Asciidoctor', {}, {})
                firstColumnFirstCell.setRowSpan(2)
                const secondColumn = asciidoctor.Table.Column.create(table, 0, {})
                const secondColumnFirstCell = asciidoctor.Table.Cell.create(secondColumn, 'Awesome way to write documentation', {}, {})
                const secondColumnSecondCell = asciidoctor.Table.Cell.create(secondColumn, 'Works on the JVM', {}, {})
                table.getBodyRows().push([firstColumnFirstCell, secondColumnFirstCell], [secondColumnSecondCell])
                return table
              })
            })
          })
          const html = asciidoctor.convert('table::[]')
          expect(html).to.equal(`<table class="tableblock frame-all grid-all stretch">
<colgroup>
</colgroup>
<tbody>
<tr>
<td class="tableblock halign-left valign-top" rowspan="2"><p class="tableblock">Asciidoctor</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Awesome way to write documentation</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Works on the JVM</p></td>
</tr>
</tbody>
</table>`)
        } finally {
          asciidoctor.Extensions.unregisterAll()
        }
      })
      it('should return true for hasBodyRows()', function () {
        const options = {}
        const source = `
|===

|This is a body cell

|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasBodyRows()).to.equal(true)
      })
      it('should return false for hasBodyRows() when only header is set', function () {
        const options = {}
        const source = `
|===
|This is a header cell

|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasBodyRows()).to.equal(false)
      })
      it('should return false for hasHeaderOption()', function () {
        const options = {}
        const source = `
|===
|This is a header cell

|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasHeadRows()).to.equal(true)
        expect(table.hasHeaderOption()).to.equal(true)
        expect(table.hasBodyRows()).to.equal(false)
        expect(table.getFootRows()).to.be.an('array').that.is.empty()
        expect(table.getBodyRows()).to.be.an('array').that.is.empty()
        expect(table.getRows().getBody().length).to.equal(0)
        expect(table.getRows().getFoot().length).to.equal(0)
        expect(table.getRows().getHead().length).to.equal(1)
        expect(table.getHeadRows().length).to.equal(1)
      })
      it('should return true for hasHeaderOption()', function () {
        const options = {}
        const source = `
[%header]
|===
|This is a header cell

|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasHeaderOption()).to.equal(true)
      })
      it('should get the table rows', function () {
        const options = {}
        const source = `
[%header%footer]
|===
|This is a header cell

|This is a normal cell

|This is a footer cell
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        const rows = table.getRows()
        expect(rows.getHead().length).to.equal(1)
        expect(rows.getBody().length).to.equal(1)
        expect(rows.getFoot().length).to.equal(1)
        expect(rows.getBody()[0][0].getText()).to.equal('This is a normal cell')
      })
      it('should get the table rows by section', function () {
        const options = {}
        const source = `
[%header%footer]
|===
|This is a header cell

|This is a normal cell

|This is a footer cell
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        const rowsBySection = table.getRows().bySection()
        expect(rowsBySection[0][0]).to.equal('head')
        expect(rowsBySection[0][1][0][0].getText()).to.equal('This is a header cell')
        expect(rowsBySection[1][0]).to.equal('body')
        expect(rowsBySection[2][0]).to.equal('foot')
      })
      it('should return true for hasHeaderOption(), hasFooterOption() and hasAutowidthOption()', function () {
        const options = {}
        const source = `
[%header%footer%autowidth]
|===
|This is a header cell

|This is a normal cell

|This is a footer cell
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasHeaderOption()).to.equal(true)
        expect(table.hasFooterOption()).to.equal(true)
        expect(table.hasAutowidthOption()).to.equal(true)
        expect(table.hasHeadRows()).to.equal(true)
        expect(table.hasBodyRows()).to.equal(true)
        expect(table.hasFootRows()).to.equal(true)
      })
      it('should return true for hasHeadRows(), hasHeaderOption() and hasBodyRows() ', function () {
        const options = {}
        const source = `
|===
|This is a header cell

|This is a body cell
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasHeadRows()).to.equal(true)
        expect(table.hasHeaderOption()).to.equal(true)
        expect(table.hasBodyRows()).to.equal(true)
      })
      it('should return 3 for getRowCount() since header row is also counted', function () {
        const options = {}
        const source = `
|===
|This is a header cell

|This is a body cell
|This is a body cell
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getRowCount()).to.equal(3)
      })
      it('should return 1 for getColumnCount() ', function () {
        const options = {}
        const source = `
|===
|This is a header cell

|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getColumnCount()).to.equal(1)
      })
      it('should return "Table 1. " for getCaption(), "Table 1. Caption" for getCaptionedTitle() and "Caption" for getTitle()', function () {
        const options = {}
        const source = `
.Caption
|===
|This is a header cell

|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getCaption()).to.equal('Table 1. ')
        expect(table.getCaptionedTitle()).to.equal('Table 1. Caption')
        expect(table.getTitle()).to.equal('Caption')
      })
      it('should return a Rows object with a size-1 head and a size-1 body', function () {
        const options = {}
        const source = `
|===
|This is a header cell

|Cell in column 1, row 1
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getRows().head.length).to.equal(1)
        expect(table.getRows().body.length).to.equal(1)
      })
      it('should return a row in the body', function () {
        const options = {}
        const source = `= Document Title

|===
|Header

|Cell in column 1, row 1
|Cell in column 1, row 2
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getHeadRows()[0][0].getText()).to.equal('Header')
        const firstColumnFirstCellBody = table.getBodyRows()[0][0]
        expect(firstColumnFirstCellBody.getLines()[0]).to.equal('Cell in column 1, row 1')
        expect(firstColumnFirstCellBody.getLineNumber()).to.equal(undefined)
        expect(firstColumnFirstCellBody.getFile()).to.equal(undefined)
      })
      it('should be a table with headers and footers', function () {
        const source = `[options="footer"]
|===
|Name of Column 1 |Name of Column 2

|Cell in column 1, row 1
|Cell in column 2, row 1

|Cell in column 1, row 2
|Cell in column 2, row 2

|Footer in column 1, row 3
|Footer in column 2, row 3
|===
`
        const options = {}
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.hasHeadRows()).to.equal(true)
        expect(table.hasHeaderOption()).to.equal(true)
        expect(table.hasFootRows()).to.equal(true)
        expect(table.hasFooterOption()).to.equal(true)
        expect(table.getColumns()[0].getColumnNumber()).to.equal(1)
        expect(table.getBodyRows()[0][0].getColumn().getColumnNumber()).to.equal(1)
        expect(table.getBodyRows()[0][1].getColumn().getColumnNumber()).to.equal(2)
        expect(table.getBodyRows()[0][0].getColumn().getWidth()).to.equal(1)
        expect(table.getBodyRows()[0][0].getWidth()).to.equal(1)
        expect(table.getHeadRows()[0][0].getStyle()).to.equal(undefined)
      })
      it('should return tablewidth 75%', function () {
        const options = {}
        const source = `
[width=75%]
|===
|Header

|Cell in column 1, row 1
|Cell in column 1, row 2
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getAttribute('width')).to.equal('75%')
      })
      it('should handle colspan and rowspan', function () {
        const options = {}
        const source = `
|===

|Column 1, row 1 |Column 2, row 1 |Column 3, row 1 |Column 4, row 1

|Column 1, row 2
2.3+|Content in a single cell that spans over rows and columns
|Column 4, row 2

|Column 1, row 3
|Column 4, row 3

|Column 1, row 4
|Column 4, row 4
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getBodyRows()[1][1].getColumnSpan()).to.equal(2)
        expect(table.getBodyRows()[1][1].getRowSpan()).to.equal(3)
      })
      it('should handle cell duplication', function () {
        const options = {}
        const source = `
|===

|Column 1, row 1 |Column 2, row 1 |Column 3, row 1 |Column 4, row 1

3*|Same text
|Different text
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getBodyRows()[1][0].getText()).to.equal('Same text')
        expect(table.getBodyRows()[1][1].getText()).to.equal('Same text')
        expect(table.getBodyRows()[1][2].getText()).to.equal('Same text')
        expect(table.getBodyRows()[1][3].getText()).to.equal('Different text')
      })
      it('should handle CSV format', function () {
        const options = {}
        const source = `
[%header,format=csv]
|===
Artist,Track,Genre
Baauer,Harlem Shake,Hip Hop
The Lumineers,Ho Hey,Folk Rock
|===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getHeadRows()[0][0].getText()).to.equal('Artist')
        expect(table.getHeadRows()[0][1].getText()).to.equal('Track')
        expect(table.getHeadRows()[0][2].getText()).to.equal('Genre')
        expect(table.getBodyRows()[0][0].getText()).to.equal('Baauer')
        expect(table.getBodyRows()[0][1].getText()).to.equal('Harlem Shake')
        expect(table.getBodyRows()[0][2].getText()).to.equal('Hip Hop')
      })
      it('should handle CSV shorthand syntax', function () {
        const options = {}
        const source = `
,===
Artist,Track,Genre

Baauer,Harlem Shake,Hip Hop
The Lumineers,Ho Hey,Folk Rock
,===`
        const doc = asciidoctor.load(source, options)
        const table = doc.getBlocks()[0]
        expect(table.getContext()).to.equal('table')
        expect(table.getHeadRows()[0][0].getText()).to.equal('Artist')
        expect(table.getHeadRows()[0][1].getText()).to.equal('Track')
        expect(table.getHeadRows()[0][2].getText()).to.equal('Genre')
        expect(table.getBodyRows()[0][0].getText()).to.equal('Baauer')
        expect(table.getBodyRows()[0][1].getText()).to.equal('Harlem Shake')
        expect(table.getBodyRows()[0][2].getText()).to.equal('Hip Hop')
      })
      it('should return the inner document', function () {
        const doc = asciidoctor.load(`
= Table

[%header,cols=1]
|===
|Header

|Normal cell
a|
:foo: foo
AsciiDoc cell
|===`)
        const table = doc.findBy({ context: 'table' })[0]
        const normalCell = table.getBodyRows()[0][0]
        const asciidocCell = table.getBodyRows()[1][0]
        expect(normalCell.getInnerDocument()).to.be.undefined()
        expect(asciidocCell.getInnerDocument().getAttributes().foo).to.be.equal('foo')
        expect(asciidocCell.getInnerDocument().getParentDocument().getAttributes().foo).to.be.undefined()
        expect(asciidocCell.getInnerDocument().getParentDocument().getDocumentTitle()).to.be.equal('Table')
      })
    })
  })
}

if (typeof module !== 'undefined' && module.exports) {
  // Node.
  module.exports = shareSpec
} else if (typeof define === 'function' && define.amd) {
  // AMD. Register a named module.
  define('asciidoctor-share-spec', [''], function () {
    return shareSpec
  })
}
