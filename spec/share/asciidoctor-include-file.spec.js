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
