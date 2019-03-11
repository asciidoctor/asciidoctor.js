/* global it, describe, define */
const includeFileSpec = function (testOptions, asciidoctor, expect) {
  describe('Include file URI', function () {
    it('should include file with an absolute file URI (base_dir is an absolute file URI)', function () {
      const opts = {
        safe: 'safe',
        base_dir: testOptions.baseDir
      }
      const html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/test.adoc[]', opts)
      expect(html).to.contain('Hello world')
    })

    it('should partially include file with an absolute file URI (using tag)', function () {
      const opts = {
        safe: 'safe',
        attributes: { 'allow-uri-read': true }
      }
      let html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include-tag.adoc[tag=a]', opts)
      expect(html).to.contain('tag-a')
      html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include-tag.adoc[tag=b]', opts)
      expect(html).to.contain('tag-b')
    })

    it('should partially include file with an absolute file URI (using lines)', function () {
      const opts = {
        safe: 'safe',
        attributes: { 'allow-uri-read': true }
      }
      let html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include-lines.adoc[lines=1..2]', opts)
      expect(html).to.contain('First line')
      expect(html).to.contain('Second line')
      html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include-lines.adoc[lines=3..4]', opts)
      expect(html).to.contain('Third line')
      expect(html).to.contain('Fourth line')
    })
  })
}

if (typeof module !== 'undefined' && module.exports) {
  // Node.
  module.exports = includeFileSpec
} else if (typeof define === 'function' && define.amd) {
  // AMD. Register a named module.
  define('asciidoctor-share-include-file-spec', [''], function () {
    return includeFileSpec
  })
}
