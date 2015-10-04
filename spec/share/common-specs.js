var commonSpec = function(Opal, Asciidoctor) {

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
      expect(doc.attributes.smap['icons']).toBe('font');
    });

    // Regression with Opal 0.8.0
    /*
    it('should load document with inline attributes !', function() {
      var options = Opal.hash({'attributes': 'icons=font@ data-uri!'});
      var doc = Asciidoctor.$load('== Test', options);
      expect(doc.attributes.smap['icons']).toBe('font');
    });
    */

    it('should load document with array attributes !', function() {
      var options = Opal.hash({'attributes': ['icons=font@', 'data-uri!']});
      var doc = Asciidoctor.$load('== Test', options);
      expect(doc.attributes.smap['icons']).toBe('font');
      expect(doc.attributes.smap['data-uri']).toBeUndefined();
    });

    it('should load document with boolean attributes', function() {
      var options = Opal.hash({'attributes': ['sectnums=true']});
      var doc = Asciidoctor.$load('== Test', options);
      expect(doc.attributes.smap['sectnums']).toBe('true');
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
<book xmlns="http://docbook.org/ns/docbook" xmlns:xlink="http://www.w3.org/1999/xlink" version="5.0" xml:lang="en">\n\
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
    it('Should includes file', function() {
      var opts = Opal.hash({'safe': 'safe'});
      var html = Asciidoctor.$convert('include::spec/share/include.adoc[]', opts);
      expect(html).toContain('include content');
    });
  });

}


// Export commonSpec for node test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonSpec;
}
