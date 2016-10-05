var commonSpec = function (testOptions, Opal, Asciidoctor) {

  describe(testOptions.platform, function () {

    describe('When loaded', function () {
      it('Opal should not be null', function () {
        expect(Opal).not.toBe(null);
      });

      it('Asciidoctor should not be null', function () {
        expect(Asciidoctor).not.toBe(null);
      });
    });

    describe('Loading', function () {
      it('should load document with inline attributes @', function () {
        var options = {attributes: 'icons=font@'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
      });

      it('should load document with inline attributes !', function () {
        var options = {attributes: 'icons=font@ data-uri!'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
      });

      it('should load document attributes', function () {
        var options = {attributes: 'icons=font@ data-uri!'};
        var doc = Asciidoctor.load('= Document Title\n:attribute-key: attribute-value\n\ncontent', options);
        expect(doc.getAttribute('attribute-key')).toBe('attribute-value');
      });

      it('should load document with array attributes !', function () {
        var options = {attributes: 'icons=font@ data-uri!'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getAttribute('icons')).toBe('font');
        expect(doc.getAttribute('data-uri')).toBeUndefined();
      });

      it('should load document with boolean attributes', function () {
        var options = {attributes: 'sectnums=true'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getAttribute('sectnums')).toBe('true');
      });

      it('should load document authors', function () {
        var doc = Asciidoctor.load('= Authors\nGuillaume Grossetie;Anders Nawroth\n');
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

      it('should get icon uri string reference', function () {
        var options = {attributes: 'data-uri!'};
        var doc = Asciidoctor.load('== Test', options);
        // FIXME: On browser icon URI is './images/icons/note.png' but on Node.js icon URI is 'images/icons/note.png'
        expect(doc.getIconURI('note')).toContain('images/icons/note.png');
      });

// FIXME: Skipping spec because the following error is thrown "SecurityError: Jail is not an absolute path: ."
/*
      it('should get icon uri', function () {
        var options = {safe: 'safe', attributes: ['data-uri', 'icons=fonts']};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getIconURI('note')).toBe('data:image/png:base64,');
      });
*/

      it('should get media uri', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.getMediaURI('target')).toBe('target');
      });

      it('should get image uri', function () {
        var options = {attributes: 'data-uri!'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getImageURI('target.jpg')).toBe('target.jpg');
        expect(doc.getImageURI('target.jpg', 'imagesdir')).toBe('target.jpg');
      });

      it('should modify document attributes', function () {
        var content = '== Title';
        var doc = Asciidoctor.load(content);
        doc.setAttribute('data-uri', 'true');
        expect(doc.getAttribute('data-uri')).toBe('true');
        doc.removeAttribute('data-uri');
        expect(doc.getAttribute('data-uri')).toBeUndefined();
        doc.setAttribute('data-uri', 'false');
        expect(doc.getAttribute('data-uri')).toBe('false');
      });

      it('should get source', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.getSource()).toBe('== Test');
      });

      it('should get source lines', function () {
        var doc = Asciidoctor.load('== Test\nThis is the first paragraph.\n\nThis is a second paragraph.', null);
        expect(doc.getSourceLines()).toEqual([ '== Test', 'This is the first paragraph.', '', 'This is a second paragraph.' ]);
      });

      it('should not be nested', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.isNested()).toBe(false);
      });

      it('should not have footnotes', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.hasFootnotes()).toBe(false);
      });

      it('should get footnotes', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.getFootnotes()).toEqual([]);
      });

      it('should not be embedded', function () {
        var options = {header_footer: true};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.isEmbedded()).toBe(false);
      });

      it('should be embedded', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.isEmbedded()).toBe(true);
      });

      it('should have extensions', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.hasExtensions()).toBe(true);
      });

      it('should get default doctype', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.getDoctype()).toBe('article');
      });

      it('should get doctype', function () {
        var options = {doctype: 'inline'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getDoctype()).toBe('inline');
      });

      it('should get default backend', function () {
        var doc = Asciidoctor.load('== Test', null);
        expect(doc.getBackend()).toBe('html5');
      });

      it('should get backend', function () {
        var options = {backend: 'revealjs'};
        var doc = Asciidoctor.load('== Test', options);
        expect(doc.getBackend()).toBe('revealjs');
      });

      it('should get title', function () {
        var doc = Asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n:title: The Actual Dangerous Documentation Chronicles\n== The Ravages of Writing', null);
        expect(doc.getTitle()).toBe('The Actual Dangerous Documentation Chronicles');
      });

      it('should set title', function () {
        var doc = Asciidoctor.load('= The Dangerous Documentation\n\n== The Ravages of Writing', null);
        doc.setTitle('The Dangerous & Thrilling Documentation');
        expect(doc.getDoctitle()).toBe('The Dangerous &amp; Thrilling Documentation');
      });

      it('should get doctitle', function () {
        var doc = Asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n\n== The Ravages of Writing', null);
        expect(doc.getDoctitle()).toBe('The Dangerous Documentation Chronicles: Based on True Events');
      });

      it('should get partitioned doctitle', function () {
        var doc = Asciidoctor.load('= The Dangerous Documentation Chronicles: Based on True Events\n\n== The Ravages of Writing', null);
        var doctitle = doc.getDoctitle({partition: true});
        expect(doctitle.main).toBe('The Dangerous Documentation Chronicles');
        expect(doctitle.subtitle).toBe('Based on True Events');
        expect(doctitle.getMain()).toBe('The Dangerous Documentation Chronicles');
        expect(doctitle.getSubtitle()).toBe('Based on True Events');
        expect(doctitle.getCombined()).toBe('The Dangerous Documentation Chronicles: Based on True Events');
        expect(doctitle.hasSubtitle()).toBe(true);
        expect(doctitle.isSanitized()).toBe(false);
      });

    });

    describe('Modifying', function () {
      it('should allow document-level attributes to be modified', function () {
        var doc = Asciidoctor.load('= Document Title\n:lang: fr\n\ncontent is in {lang}');
        expect(doc.getAttribute('lang')).toBe('fr');
        doc.setAttribute('lang', 'us');
        expect(doc.getAttribute('lang')).toBe('us');
        var html = doc.convert();
        expect(html).toContain('content is in us');
      });
    });

    describe('Parsing', function () {
      it('should convert a simple document with a title 2', function () {
        var html = Asciidoctor.convert('== Test', null);
        expect(html).toContain('<h2 id="_test">Test</h2>');
      });

      it('should convert a simple document with a title 3', function () {
        var html = Asciidoctor.convert('=== Test', null);
        expect(html).toContain('<h3 id="_test">Test</h3>');
      });

      it('should convert a document with tabsize', function () {
        var html = Asciidoctor.convert('= Learn Go\n:tabsize: 2\n\n[source]\n----\npackage main\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, playground")\n}', null);
        expect(html).toContain('<div class="listingblock">\n<div class="content">\n<pre class="highlight"><code>package main\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, playground")\n}</code></pre>\n</div>\n</div>');
      });

      it('should embed assets', function () {
        var options = {doctype: 'article', safe: 'unsafe', header_footer: true, attributes: ['showtitle', 'stylesheet=asciidoctor.css', 'stylesdir=' + testOptions.baseDir + '/build']};
        var html = Asciidoctor.convert('=== Test', options);
        expect(html).toContain('Asciidoctor default stylesheet');
      });

      it('should produce a docbook45 document when backend=docbook45', function () {
        var options = {attributes: ['backend=docbook45', 'doctype=book'], header_footer: true};
        var html = Asciidoctor.convert(':doctitle: DocTitle\n:docdate: 2014-01-01\n== Test', options);
        expect(html).toContain('<?xml version="1.0" encoding="UTF-8"?>\n\
<!DOCTYPE book PUBLIC "-//OASIS//DTD DocBook XML V4.5//EN" "http://www.oasis-open.org/docbook/xml/4.5/docbookx.dtd">\n\
<?asciidoc-toc?>\n\
<?asciidoc-numbered?>\n\
<book lang="en">\n\
<bookinfo>\n\
<title>DocTitle</title>\n\
<date>2014-01-01</date>\n\
</bookinfo>\n\
<chapter id="_test">\n\
<title>Test</title>\n\
\n\
</chapter>\n\
</book>');
      });

      it('should produce a docbook5 document when backend=docbook5', function () {
        var options = {attributes: ['backend=docbook5', 'doctype=book'], header_footer: true};
        var html = Asciidoctor.convert(':doctitle: DocTitle\n:docdate: 2014-01-01\n== Test', options);
        expect(html).toContain('<?xml version="1.0" encoding="UTF-8"?>\n\
<?asciidoc-toc?>\n\
<?asciidoc-numbered?>\n\
<book xmlns="http://docbook.org/ns/docbook" xmlns:xl="http://www.w3.org/1999/xlink" version="5.0" xml:lang="en">\n\
<info>\n\
<title>DocTitle</title>\n\
<date>2014-01-01</date>\n\
</info>\n\
<chapter xml:id="_test">\n\
<title>Test</title>\n\
\n\
</chapter>\n\
</book>');
      });

      it('should produce a html5 document with font icons', function () {
        var options = {attributes: 'icons=font@'};
        var html = Asciidoctor.convert('= Document\n\nThis is a simple document.\n\n== Section\n\nCAUTION: This is important!', options);
        expect(html).toContain('<i class="fa icon-caution" title="Caution"></i>');
      });

    });

    describe('Include', function () {
      it('Should include file', function () {
        var opts = {safe: 'safe', base_dir: testOptions.baseDir};
        var html = Asciidoctor.convert('include::spec/share/include.adoc[]', opts);
        expect(html).toContain('include content');
      });

      it('Should include csv file in table', function () {
        var opts = {safe: 'safe', base_dir: testOptions.baseDir};
        var html = Asciidoctor.convert(',===\ninclude::spec/share/sales.csv[]\n,===', opts);
        expect(html).toContain('March');
      });
    });
  });
};

// Export commonSpec for node test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonSpec;
}
