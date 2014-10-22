var commonSpec = function(Opal, Asciidoctor) {

  describe('When loaded', function() {
    it('Opal should not be null', function() {
      expect(Opal).not.toBe(null);
    });

    it('Asciidoctor should not be null', function() {
      expect(Opal).not.toBe(null);
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
      var options = Opal.hash2(['attributes','header_footer'], {'attributes': ['backend=docbook45', 'doctype=book'],'header_footer':true});
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
      var options = Opal.hash2(['attributes','header_footer'], {'attributes': ['backend=docbook5', 'doctype=book'],'header_footer':true});
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

  });
  
  describe('Include', function() {
    it('Should includes file', function() {
      var opts = Opal.hash2(['safe'], {
        'safe': 'safe'
      });
      var html = Asciidoctor.$convert('include::spec/share/include.adoc[]', opts);
      expect(html).toContain('include content');
    });

  });

}


// Export commonSpec for node test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonSpec;
}
