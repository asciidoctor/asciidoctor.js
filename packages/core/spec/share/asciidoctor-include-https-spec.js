/* global it, describe, define */
const includeHttpsSpec = function (testOptions, asciidoctor, expect) {
  describe('Include https URI', function () {
    const timeout = 15000 // 15 seconds
    it('should include file with an absolute https URI (base_dir is an absolute https URI)', function () {
      const opts = {
        safe: 'safe',
        base_dir: 'https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x',
        attributes: { 'allow-uri-read': true }
      }
      const html = asciidoctor.convert('include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x/README.adoc[]', opts)
      expect(html).to.include('Asciidoctor.js')
    }).timeout(timeout)

    it('should partially include file with an absolute https URI (using tag)', function () {
      const opts = {
        safe: 'safe',
        attributes: { 'allow-uri-read': true }
      }
      let html = asciidoctor.convert('include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x/packages/core/spec/fixtures/include-tag.adoc[tag=a]', opts)
      expect(html).to.include('tag-a')
      html = asciidoctor.convert('include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x/packages/core/spec/fixtures/include-tag.adoc[tag=b]', opts)
      expect(html).to.include('tag-b')
    }).timeout(timeout)

    it('should partially include file with an absolute https URI (using lines)', function () {
      const opts = {
        safe: 'safe',
        attributes: { 'allow-uri-read': true }
      }
      let html = asciidoctor.convert('include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x/packages/core/spec/fixtures/include-lines.adoc[lines=1..2]', opts)
      expect(html).to.include('First line')
      expect(html).to.include('Second line')
      html = asciidoctor.convert('include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x/packages/core/spec/fixtures/include-lines.adoc[lines=3..4]', opts)
      expect(html).to.include('Third line')
      expect(html).to.include('Fourth line')
    }).timeout(timeout)

    it('should include file with an absolute https URI (base_dir is not defined)', function () {
      const opts = { safe: 'safe', attributes: { 'allow-uri-read': true } }
      const html = asciidoctor.convert('include::https://raw.githubusercontent.com/HubPress/dev.hubpress.io/gh-pages/README.adoc[]', opts)
      expect(html).to.include('HubPress')
    }).timeout(timeout)
    if (testOptions.platform === 'Node.js') {
      // When running on Node.js, the following exception is thrown:
      // "SecurityError: Jail is not an absolute path: https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x"
    } else {
      it('should include file with a relative https URI (base_dir is an absolute https URI)', function () {
        const opts = {
          safe: 'safe',
          base_dir: 'https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x',
          attributes: { 'allow-uri-read': true }
        }
        const html = asciidoctor.convert('include::README.adoc[]', opts)
        expect(html).to.include('Asciidoctor.js')
      }).timeout(timeout)
    }

    if (testOptions.platform !== 'Browser') {
      // CommonJS and RequireJS tests suites are executed on a Browser (Chrome Headless).
      // Other tests suites are executed on Node.js (using the xmlhttprequest Node module to emulate the browser XMLHttpRequest)
      // Unlike the browser XMLHttpRequest, the xmlhttprequest node module does not expand path and therefore returns a 404!
    } else {
      it('should include file with a relative expandable path (base_dir is an absolute https URI)', function () {
        const opts = {
          safe: 'safe',
          base_dir: 'https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x',
          attributes: { 'allow-uri-read': true }
        }
        const html = asciidoctor.convert('include::../v1.5.0/README.adoc[]', opts)
        expect(html).to.include('Bower')
      }).timeout(timeout)

      it('should include file with an absolute expandable https URI (base_dir is not defined)', function () {
        const opts = { safe: 'safe', attributes: { 'allow-uri-read': true } }
        const html = asciidoctor.convert('include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/v2.2.x/../v1.5.0/README.adoc[]', opts)
        expect(html).to.include('Bower')
      }).timeout(timeout)
    }
  })
}

if (typeof module !== 'undefined' && module.exports) {
  // Node.
  module.exports = includeHttpsSpec
} else if (typeof define === 'function' && define.amd) {
  // AMD. Register a named module.
  define('asciidoctor-share-include-https-spec', [''], function () {
    return includeHttpsSpec
  })
}
