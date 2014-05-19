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

  });

}


// Export commonSpec for node test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = commonSpec;
}
