var includeFileSpec = function (testOptions, asciidoctor) {
  describe('Include file URI', function () {
    it('should include file with an absolute file URI (base_dir is an absolute file URI)', function () {
      var opts = {
        safe: 'safe',
        base_dir: testOptions.baseDir
      };
      var html = asciidoctor.convert('include::' + testOptions.baseDir + '/README.adoc[]', opts);
      expect(html).toContain('Asciidoctor.js');
    });

    it('should partially include file with an absolute file URI (using tag)', function () {
      var opts = {
        safe: 'safe'
      };
      var html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/share/include-tag.adoc[tag=a]', opts);
      expect(html).toContain('tag-a');
      html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/share/include-tag.adoc[tag=b]', opts);
      expect(html).toContain('tag-b');
    });

    it('should partially include file with an absolute file URI (using lines)', function () {
      var opts = {
        safe: 'safe'
      };
      var html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/share/include-lines.adoc[lines=1..2]', opts);
      expect(html).toContain('First line');
      expect(html).toContain('Second line');
      html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/share/include-lines.adoc[lines=3..4]', opts);
      expect(html).toContain('Third line');
      expect(html).toContain('Fourth line');
    });
  });
};

if (typeof module !== 'undefined' && module.exports) {
  // Node.
  module.exports = includeFileSpec;
} else if (typeof define === 'function' && define.amd) {
  // AMD. Register a named module.
  define('asciidoctor-share-include-file-spec', [''], function () {
    return includeFileSpec;
  });
}
