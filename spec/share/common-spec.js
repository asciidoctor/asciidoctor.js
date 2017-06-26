var commonSpec = function (testOptions, asciidoctor) {

  describe(testOptions.platform, function () {

    describe('When loaded', function () {
      it('asciidoctor should not be null', function () {
        expect(asciidoctor).not.toBe(null);
      });
    });

    describe('Loading', function () {
      it('should load document with inline attributes @', function () {
        var options = {attributes: 'icons=font@'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
      });

      it('should load document with inline attributes !', function () {
        var options = {attributes: 'icons=font@ data-uri!'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
      });

      it('should load document attributes', function () {
        var options = {attributes: 'icons=font@ data-uri!'};
        var doc = asciidoctor.load('= Document Title\n:attribute-key: attribute-value\n\ncontent', options);
        expect(doc.getAttribute('attribute-key')).toBe('attribute-value');
      });

      it('should load document with array attributes !', function () {
        var options = {attributes: 'icons=font@ data-uri!'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
        expect(doc.getAttribute('data-uri')).toBeUndefined();
      });

      it('should load document with hash attributes', function () {
        // NOTE we might want to look into the fact that sectids: false does not work
        var options = { attributes: { icons: 'font', sectids: null } };
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
        expect(doc.getAttribute('sectids')).toBeUndefined();
        expect(doc.findBy({ context: 'section' })[0].getId()).toBe(Opal.nil);
      });

      it('should load document with boolean attributes', function () {
        var options = {attributes: 'sectnums=true'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getAttribute('sectnums')).toBe('true');
      });

      it('should load document authors', function () {
        var doc = asciidoctor.load('= Authors\nGuillaume Grossetie;Anders Nawroth\n');
        expect(doc.getAttribute('author')).toBe('Guillaume Grossetie');
        expect(doc.getAttribute('author_1')).toBe('Guillaume Grossetie');
        expect(doc.getAttribute('author_2')).toBe('Anders Nawroth');
        expect(doc.getAttribute('authorcount')).toBe(2);
        expect(doc.getAttribute('authorinitials')).toBe('GG');
        expect(doc.getAttribute('authorinitials_1')).toBe('GG');
        expect(doc.getAttribute('authorinitials_2')).toBe('AN');
        expect(doc.getAttribute('authors')).toBe('Guillaume Grossetie, Anders Nawroth');
        expect(doc.getAuthor()).toBe('Guillaume Grossetie');
      });

      it('should populate the catalog', function () {
        var doc = asciidoctor.load('link:index.html[Docs]', {'safe': 'safe', 'catalog_assets': true});
        doc.convert();
        var links = doc.getCatalog().links;
        expect(links).toEqual(['index.html']);
      });

      it('should return attributes as JSON object', function () {
        var doc = asciidoctor.load('= Authors\nGuillaume Grossetie;Anders Nawroth\n');
        expect(doc.getAttributes()['author']).toBe('Guillaume Grossetie');
        expect(doc.getAttributes()['authors']).toBe('Guillaume Grossetie, Anders Nawroth');
      });

      it('should get icon uri string reference', function () {
        var options = {attributes: 'data-uri!'};
        var doc = asciidoctor.load('== Test', options);
        // FIXME: On browser icon URI is './images/icons/note.png' but on Node.js icon URI is 'images/icons/note.png'
        expect(doc.getIconUri('note')).toContain('images/icons/note.png');
      });

// FIXME: Skipping spec because the following error is thrown "SecurityError: Jail is not an absolute path: ."
/*
      it('should get icon uri', function () {
        var options = {safe: 'safe', attributes: ['data-uri', 'icons=fonts']};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getIconUri('note')).toBe('data:image/png:base64,');
      });
*/

      it('should get media uri', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.getMediaUri('target')).toBe('target');
      });

      it('should get image uri', function () {
        var options = {attributes: 'data-uri!'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getImageUri('target.jpg')).toBe('target.jpg');
        expect(doc.getImageUri('target.jpg', 'imagesdir')).toBe('target.jpg');
      });

      it('should modify document attributes', function () {
        var content = '== Title';
        var doc = asciidoctor.load(content);
        doc.setAttribute('data-uri', 'true');
        expect(doc.getAttribute('data-uri')).toBe('true');
        doc.removeAttribute('data-uri');
        expect(doc.getAttribute('data-uri')).toBeUndefined();
        doc.setAttribute('data-uri', 'false');
        expect(doc.getAttribute('data-uri')).toBe('false');
      });

      it('should get source', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.getSource()).toBe('== Test');
      });

      it('should get source lines', function () {
        var doc = asciidoctor.load('== Test\nThis is the first paragraph.\n\nThis is a second paragraph.');
        expect(doc.getSourceLines()).toEqual([ '== Test', 'This is the first paragraph.', '', 'This is a second paragraph.' ]);
      });

      it('should not be nested', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.isNested()).toBe(false);
      });

      it('should not have footnotes', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.hasFootnotes()).toBe(false);
      });

      it('should get footnotes', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.getFootnotes()).toEqual([]);
      });

      it('should not be embedded', function () {
        var options = {header_footer: true};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.isEmbedded()).toBe(false);
      });

      it('should be embedded', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.isEmbedded()).toBe(true);
      });

      it('should have extensions', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.hasExtensions()).toBe(true);
      });

      it('should get default doctype', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.getDoctype()).toBe('article');
      });

      it('should get doctype', function () {
        var options = {doctype: 'inline'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getDoctype()).toBe('inline');
      });

      it('should get default backend', function () {
        var doc = asciidoctor.load('== Test');
        expect(doc.getBackend()).toBe('html5');
      });

      it('should get backend', function () {
        var options = {backend: 'xhtml5'};
        var doc = asciidoctor.load('== Test', options);
        expect(doc.getBackend()).toBe('html5');
        expect(doc.getAttribute('htmlsyntax')).toBe('xml');
      });

      it('should get title', function () {
        var doc = asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n:title: The Actual Dangerous Documentation Chronicles\n== The Ravages of Writing');
        expect(doc.getTitle()).toBe('The Actual Dangerous Documentation Chronicles');
      });

      it('should set title', function () {
        var doc = asciidoctor.load('= The Dangerous Documentation\n\n== The Ravages of Writing');
        doc.setTitle('The Dangerous & Thrilling Documentation');
        expect(doc.getDoctitle()).toBe('The Dangerous &amp; Thrilling Documentation');
      });

      it('should get the line of number of a block when sourcemap is enabled', function () {
        var options = {sourcemap: true};
        var doc = asciidoctor.load('= Document Title\n\nPreamble\n\n== First section\n\nTrue story!', options);
        var blocks = doc.getBlocks();
        expect(blocks.length).toBe(2);
        // preamble
        expect(blocks[0].getLineNumber()).toBeUndefined();
        expect(blocks[0].getBlocks().length).toBe(1);
        expect(blocks[0].getBlocks()[0].getLineNumber()).toBe(3);
        // first section
        expect(blocks[1].getLineNumber()).toBe(5);
      });

      it('should return undefined when sourcemap is disabled', function () {
        var options = {};
        var doc = asciidoctor.load('= Document Title\n\nPreamble\n\n== First section\n\nTrue story!', options);
        var blocks = doc.getBlocks();
        expect(blocks.length).toBe(2);
        // preamble
        expect(blocks[0].getLineNumber()).toBeUndefined();
        expect(blocks[0].getBlocks().length).toBe(1);
        expect(blocks[0].getBlocks()[0].getLineNumber()).toBeUndefined();
        // first section
        expect(blocks[1].getLineNumber()).toBeUndefined();
      });

      it('should get doctitle', function () {
        var doc = asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n\n== The Ravages of Writing');
        expect(doc.getDoctitle()).toBe('The Dangerous Documentation Chronicles: Based on True Events');
      });

      it('should get partitioned doctitle', function () {
        var doc = asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n\n== The Ravages of Writing');
        var doctitle = doc.getDoctitle({partition: true});
        expect(doctitle.main).toBe('The Dangerous Documentation Chronicles');
        expect(doctitle.subtitle).toBe('Based on True Events');
        expect(doctitle.getMain()).toBe('The Dangerous Documentation Chronicles');
        expect(doctitle.getSubtitle()).toBe('Based on True Events');
        expect(doctitle.getCombined()).toBe('The Dangerous Documentation Chronicles: Based on True Events');
        expect(doctitle.hasSubtitle()).toBe(true);
        expect(doctitle.isSanitized()).toBe(false);
      });

      it('should get and set attribute on block', function () {
        var doc = asciidoctor.load('= Blocks story: Based on True Events\n\n== Once upon a time\n\n[bold-statement="on"]\nBlocks are amazing!');
        var paragraphBlock = doc.getBlocks()[0].getBlocks()[0];
        expect(paragraphBlock.getAttribute('bold-statement')).toBe('on');
        paragraphBlock.setAttribute('bold-statement', 'off');
        expect(paragraphBlock.getAttribute('bold-statement')).toBe('off');
      });

    });

    describe('Modifying', function () {
      it('should allow document-level attributes to be modified', function () {
        var doc = asciidoctor.load('= Document Title\n:lang: fr\n\ncontent is in {lang}');
        expect(doc.getAttribute('lang')).toBe('fr');
        doc.setAttribute('lang', 'us');
        expect(doc.getAttribute('lang')).toBe('us');
        var html = doc.convert();
        expect(html).toContain('content is in us');
      });
    });

    describe('Parsing', function () {
      it('should convert a simple document with a title 2', function () {
        var html = asciidoctor.convert('== Test');
        expect(html).toContain('<h2 id="_test">Test</h2>');
      });

      it('should return an empty string when there\'s no candidate for inline conversion', function () {
        // Converting a document with inline document type should produce an empty string
        // Read more: http://asciidoctor.org/docs/user-manual/#document-types
        var options = {doctype: 'inline'};
        var content = '= Document Title\n\n== Introduction\n\nA simple paragraph.';
        var html = asciidoctor.convert(content, options);
        expect(html).toBe('');
        var doc = asciidoctor.load(content, options);
        html = doc.convert();
        expect(html).toBe('');
      });

      it('should convert a simple document with a title 3', function () {
        var html = asciidoctor.convert('=== Test');
        expect(html).toContain('<h3 id="_test">Test</h3>');
      });

      it('should convert a document with tabsize', function () {
        var html = asciidoctor.convert('= Learn Go\n:tabsize: 2\n\n[source]\n----\npackage main\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, playground")\n}');
        expect(html).toContain('<div class="listingblock">\n<div class="content">\n<pre class="highlight"><code>package main\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, playground")\n}</code></pre>\n</div>\n</div>');
      });

      it('should convert a document with unicode', function () {
        var asciidoctorVersion = asciidoctor.$$const.VERSION;
        var asciidoctorVersionNumber = parseInt(asciidoctorVersion.replace(/(\.|dev)/g, ''));
        // Available only in Asciidoctor core 1.5.6 and greater.
        if (asciidoctorVersion === '1.5.6' || asciidoctorVersionNumber > 156) {
          var html = asciidoctor.convert('= HubPress\nAnthonny Quérouil\n\n{doctitle} was written by {firstname} {lastname}.\n\n[[bière]]\n== La bière\n\nLa bière c\'est la vie.\n\n[[ビール]]\n== ビール');
          expect(html).toContain('was written by Anthonny Quérouil.');
          expect(html).toContain('id="ビール"');
          expect(html).toContain('id="bière"');
        } 
      });

      it('should embed assets', function () {
        var options = {doctype: 'article', safe: 'unsafe', header_footer: true, attributes: ['showtitle', 'stylesheet=asciidoctor.css', 'stylesdir=' + testOptions.baseDir + '/build/css']};
        var html = asciidoctor.convert('=== Test', options);
        expect(html).toContain('Asciidoctor default stylesheet');
      });

      it('should produce a docbook45 document when backend=docbook45', function () {
        var options = {attributes: ['backend=docbook45', 'doctype=book'], header_footer: true};
        var html = asciidoctor.convert(':doctitle: DocTitle\n:docdate: 2014-01-01\n== Test', options);
        expect(html).toBe('<?xml version="1.0" encoding="UTF-8"?>\n' +
'<!DOCTYPE book PUBLIC "-//OASIS//DTD DocBook XML V4.5//EN" "http://www.oasis-open.org/docbook/xml/4.5/docbookx.dtd">\n' +
'<?asciidoc-toc?>\n' +
'<?asciidoc-numbered?>\n' +
'<book lang="en">\n' +
'<bookinfo>\n' +
'<title>DocTitle</title>\n' +
'<date>2014-01-01</date>\n' +
'</bookinfo>\n' +
'<chapter id="_test">\n' +
'<title>Test</title>\n' +
'\n' +
'</chapter>\n' +
'</book>');
      });

      it('should produce a docbook5 document when backend=docbook5', function () {
        var options = {attributes: ['backend=docbook5', 'doctype=book'], header_footer: true};
        var html = asciidoctor.convert(':doctitle: DocTitle\n:docdate: 2014-01-01\n== Test', options);
        expect(html).toBe('<?xml version="1.0" encoding="UTF-8"?>\n' +
'<?asciidoc-toc?>\n' +
'<?asciidoc-numbered?>\n' +
'<book xmlns="http://docbook.org/ns/docbook" xmlns:xl="http://www.w3.org/1999/xlink" version="5.0" xml:lang="en">\n' +
'<info>\n' +
'<title>DocTitle</title>\n' +
'<date>2014-01-01</date>\n' +
'</info>\n' +
'<chapter xml:id="_test">\n' +
'<title>Test</title>\n' +
'\n' +
'</chapter>\n' +
'</book>');
      });

      it('should produce a html5 document with font icons', function () {
        var options = {attributes: 'icons=font@'};
        var html = asciidoctor.convert('= Document\n\nThis is a simple document.\n\n== Section\n\nCAUTION: This is important!', options);
        expect(html).toContain('<i class="fa icon-caution" title="Caution"></i>');
      });

    });

    describe('Include', function () {
      it('Should include file', function () {
        var opts = {safe: 'safe', base_dir: testOptions.baseDir};
        var html = asciidoctor.convert('include::spec/share/include.adoc[]', opts);
        expect(html).toContain('include content');
      });

      it('Should include csv file in table', function () {
        var opts = {safe: 'safe', base_dir: testOptions.baseDir};
        var html = asciidoctor.convert(',===\ninclude::spec/share/sales.csv[]\n,===', opts);
        expect(html).toContain('March');
      });
    });
  });
};

if (typeof module !== 'undefined' && module.exports) {
  // Node.
  module.exports = commonSpec;
} else if (typeof define === 'function' && define.amd) {
  // AMD. Register a named module.
  define('common-spec', [''], function () {
    return commonSpec;
  });
}
