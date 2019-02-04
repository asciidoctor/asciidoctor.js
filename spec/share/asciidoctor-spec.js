/* global it, describe, define */
const shareSpec = function (testOptions, asciidoctor, expect) {
  const getCoreVersionNumber = function (asciidoctor) {
    const asciidoctorVersion = asciidoctor.getCoreVersion()
    // ignore the fourth number, keep only major, minor and patch numbers
    return parseInt(asciidoctorVersion.replace(/(\.|dev)/g, '').substring(0, 3))
  }

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
        for (let index in fundamentalObjects) {
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
        const doc = asciidoctor.load('= Document Title\n:attribute-key: attribute-value\n\ncontent', options)
        expect(doc.getAttribute('attribute-key')).to.equal('attribute-value')
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
        const doc = asciidoctor.load('= Authors\nGuillaume Grossetie;Anders Nawroth\n')
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
        const doc = asciidoctor.load('link:index.html[Docs]', { 'safe': 'safe', 'catalog_assets': true })
        doc.convert()
        const links = doc.getCatalog().links
        expect(links).to.have.members(['index.html'])
      })

      it('should return attributes as JSON object', function () {
        const doc = asciidoctor.load('= Authors\nGuillaume Grossetie;Anders Nawroth\n')
        expect(doc.getAttributes()['author']).to.equal('Guillaume Grossetie')
        expect(doc.getAttributes()['authors']).to.equal('Guillaume Grossetie, Anders Nawroth')
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
        const asciidoctorVersionNumber = getCoreVersionNumber(asciidoctor)
        if (asciidoctorVersionNumber >= 157) {
          const doc = asciidoctor.load('== Test')
          // extensions should not be enabled by default
          expect(doc.hasExtensions()).to.equal(false)
        }
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
        expect(blocks[0].getLineNumber()).to.be.undefined()
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

      it('should hide positional attributes in getAttributes', function () {
        const doc = asciidoctor.load('[positional1,positional2,attr=value]\ntext')
        const block = doc.getBlocks()[0]
        const attributes = block.getAttributes()
        expect(Object.getOwnPropertyNames(attributes).sort()).to.have.members(['attr', 'style'].sort())
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

      it('should load a file with bom', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const doc = asciidoctor.load('\xef\xbb\xbf= Document Title\n:lang: fr\n:fixtures-dir: spec/fixtures\n\ncontent is in {lang}\n\ninclude::{fixtures-dir}/include.adoc[]', opts)
        expect(doc.getAttribute('lang')).to.equal('fr')
        const html = doc.convert()
        expect(html).to.include('content is in fr')
        expect(html).to.include('include content')
      })

      it('should instantiate an Inline element', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const doc = asciidoctor.load('= Empty document', opts)
        const inlineElement = asciidoctor.Inline.create(doc, 'anchor', 'Tigers', { 'type': 'ref', 'target': 'tigers' })
        expect(inlineElement.getType()).to.equal('ref')
        expect(inlineElement.getText()).to.equal('Tigers')
        expect(inlineElement.getTarget()).to.equal('tigers')
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
          var author = doc.getAuthors()[0]
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
          var firstAuthor = doc.getAuthors()[0]
          expect(firstAuthor.getEmail()).to.equal('david@37signals.com')
          expect(firstAuthor.getName()).to.equal('David Heinemeier Hansson')
          expect(firstAuthor.getFirstName()).to.equal('David')
          expect(firstAuthor.getMiddleName()).to.equal('Heinemeier')
          expect(firstAuthor.getLastName()).to.equal('Hansson')
          expect(firstAuthor.getInitials()).to.equal('DHH')
          var secondAuthor = doc.getAuthors()[1]
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
          var firstAuthor = doc.getAuthors()[0]
          expect(firstAuthor.getEmail()).to.equal('david@37signals.com')
          expect(firstAuthor.getName()).to.equal('David Heinemeier Hansson')
          expect(firstAuthor.getFirstName()).to.equal('David')
          expect(firstAuthor.getMiddleName()).to.equal('Heinemeier')
          expect(firstAuthor.getLastName()).to.equal('Hansson')
          expect(firstAuthor.getInitials()).to.equal('DHH')
          var secondAuthor = doc.getAuthors()[1]
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
          const result = doc.findBy({ 'id': 'subsection' }, (candidate) => {
            if (candidate.getId() === 'last') {
              visitedLast = true
            }
            return true
          })
          expect(result.length).to.equal(1)
          expect(visitedLast).to.be.false()
        })

        it('should skip node and its children if block returns skip', function () {
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
              return 'skip'
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
              return 'skip_children'
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
        it('should embed a remote png image', function () {
          const options = { safe: 'safe', attributes: { 'data-uri': true, 'allow-uri-read': true } }
          const html = asciidoctor.convert(`image::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/master/spec/fixtures/images/cat.png[]`, options)
          expect(html).to.include('img src="data:image/png;base64,')
        }).timeout(5000)
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
        expect(csv).to.equal(`Month,Value

January,12
February,24
March,20
April,32
`)
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
