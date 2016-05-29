var commonSpec = function(testOptions, Opal, Asciidoctor) {

  describe(testOptions.platform, function () {

    describe('When loaded', function() {
      it('Opal should not be null', function() {
        expect(Opal).not.toBe(null);
      });

      it('Asciidoctor should not be null', function() {
        expect(Asciidoctor).not.toBe(null);
      });
    });


    describe('Loading', function() {
      it('should load document with inline attributes @', function() {
        var options = Opal.hash({'attributes': 'icons=font@'});
        var doc = Asciidoctor.$load('== Test', options);
        expect(doc.$attr('icons')).toBe('font');
        expect(doc.attributes['$[]']('icons')).toBe('font');
        expect(doc.attributes.$fetch('icons')).toBe('font');
      });

      it('should load document with inline attributes !', function() {
        var options = Opal.hash({'attributes': 'icons=font@ data-uri!'});
        var doc = Asciidoctor.$load('== Test', options);
        expect(doc.$attr('icons')).toBe('font');
      });

      it('should load document attributes', function() {
        var options = Opal.hash({'attributes': 'icons=font@ data-uri!'});
        var doc = Asciidoctor.$load('= Document Title\n:attribute-key: attribute-value\n\ncontent', options);
        expect(doc.$attr('attribute-key')).toBe('attribute-value');
      });

      it('should load document with array attributes !', function() {
        var options = Opal.hash({'attributes': ['icons=font@', 'data-uri!']});
        var doc = Asciidoctor.$load('== Test', options);
        expect(doc.$attr('icons')).toBe('font');
        expect(doc.$attr('data-uri')).toBe(Opal.nil);
      });

      it('should load document with boolean attributes', function() {
        var options = Opal.hash({'attributes': ['sectnums=true']});
        var doc = Asciidoctor.$load('== Test', options);
        expect(doc.$attr('sectnums')).toBe('true');
      });

      it('should load document authors', function() {
        var doc = Asciidoctor.$load('= Authors\nGuillaume Grossetie;Anders Nawroth\n');
        expect(doc.$attr('author')).toBe('Guillaume Grossetie');
        expect(doc.$attr('author_1')).toBe('Guillaume Grossetie');
        expect(doc.$attr('author_2')).toBe('Anders Nawroth');
        expect(doc.$attr('authorcount')).toBe(2);
        expect(doc.$attr('authorinitials')).toBe('GG');
        expect(doc.$attr('authorinitials_1')).toBe('GG');
        expect(doc.$attr('authorinitials_2')).toBe('AN');
        expect(doc.$attr('authors')).toBe('Guillaume Grossetie, Anders Nawroth');
      });

      it('should modify document attributes', function() {
        var content = '== Title';
        var doc = Opal.Asciidoctor.$load(content);
        doc.$set_attribute('data-uri', 'true');
        expect(doc.$attr('data-uri')).toBe('true');
        doc.attributes.$delete('data-uri');
        doc.attribute_overrides.$delete('data-uri');
        expect(doc.$attr('data-uri')).toBe(Opal.nil);
        doc.$set_attribute('data-uri', 'false');
        expect(doc.$attr('data-uri')).toBe('false');
      });
    });

    describe('Modifying', function() {
      it('should allow document-level attributes to be modified', function() {
        var doc = Asciidoctor.$load('= Document Title\n:lang: fr\n\ncontent is in {lang}');
        expect(doc.$attr('lang')).toBe('fr');
        doc.$set_attribute('lang', 'us');
        expect(doc.$attr('lang')).toBe('us');
        var html = doc.$convert();
        expect(html).toContain('content is in us');
      });
    });

    describe('Parsing', function() {
      it('== Test should contains <h2 id="_test">Test</h2>', function() {
        var html = Asciidoctor.$convert('== Test', null);
        expect(html).toContain('<h2 id="_test">Test</h2>');
      });

      it('=== Test should contains <h3 id="_test">Test</h3>', function() {
        var html = Asciidoctor.$convert('=== Test', null);
        expect(html).toContain('<h3 id="_test">Test</h3>');
      });

      it('=== Test should embed assets', function() {
        var options = Opal.hash({doctype: 'article', safe: 'unsafe', header_footer: true, attributes: ['showtitle', 'stylesheet=asciidoctor.css', 'stylesdir='+testOptions.baseDir+'/build']});
        var html = Asciidoctor.$convert('=== Test', options);
        expect(html).toContain('Asciidoctor default stylesheet');
      });

      it('backend=docbook45 should produce a docbook45 document', function() {
        var options = Opal.hash({'attributes': ['backend=docbook45', 'doctype=book'],'header_footer':true});
        var html = Asciidoctor.$convert(':doctitle: DocTitle\n:docdate: 2014-01-01\n== Test', options);
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

      it('backend=docbook5 should produce a docbook5 document', function() {
        var options = Opal.hash({'attributes': ['backend=docbook5', 'doctype=book'],'header_footer':true});
        var html = Asciidoctor.$convert(':doctitle: DocTitle\n:docdate: 2014-01-01\n== Test', options);
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

      it('should produce a html5 document with font icons', function() {
        var options = Opal.hash({'attributes': 'icons=font@'});
        var html = Asciidoctor.$convert('= Document\n\nThis is a simple document.\n\n== Section\n\nCAUTION: This is important!', options);
        expect(html).toContain('<i class="fa icon-caution" title="Caution"></i>');
      });

    });

    describe('Include', function() {
      it('Should include file', function() {
        var opts = Opal.hash({base_dir: testOptions.baseDir, 'safe': 'safe'});
        var html = Asciidoctor.$convert('include::spec/share/include.adoc[]', opts);
        expect(html).toContain('include content');
      });

      it('Should include csv file in table', function() {
        var opts = Opal.hash({base_dir: testOptions.baseDir, 'safe': 'safe'});
        var html = Asciidoctor.$convert(',===\ninclude::spec/share/sample.csv[]\n,===', opts);
        expect(html).toContain('March');
      });
    });
  });
}

// Export commonSpec for node test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonSpec;
}
