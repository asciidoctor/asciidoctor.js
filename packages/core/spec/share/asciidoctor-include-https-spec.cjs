/* global it, describe, define */
const includeHttpsSpec = function (testOptions, asciidoctor, expect) {
  if (testOptions.remoteBaseUri) {
    describe('Include https URI', function () {
      it('should include file with an absolute http URI (base_dir is an absolute http URI)', function () {
        const opts = {
          safe: 'safe',
          base_dir: testOptions.remoteBaseUri,
          attributes: { 'allow-uri-read': true }
        }
        const html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/foo.adoc[]`, opts)
        expect(html).to.include('Foo')
      })

      it('should partially include file with an absolute http URI (using tag)', function () {
        const opts = {
          safe: 'safe',
          attributes: { 'allow-uri-read': true }
        }
        let html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/include-tag.adoc[tag=a]`, opts)
        expect(html).to.include('tag-a')
        html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/include-tag.adoc[tag=b]`, opts)
        expect(html).to.include('tag-b')
      })

      it('should partially include file with an absolute http URI (using lines)', function () {
        const opts = {
          safe: 'safe',
          attributes: { 'allow-uri-read': true }
        }
        let html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/include-lines.adoc[lines=1..2]`, opts)
        expect(html).to.include('First line')
        expect(html).to.include('Second line')
        html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/include-lines.adoc[lines=3..4]`, opts)
        expect(html).to.include('Third line')
        expect(html).to.include('Fourth line')
      })

      it('should include file with an absolute http URI (base_dir is not defined)', function () {
        const opts = { safe: 'safe', attributes: { 'allow-uri-read': true } }
        const html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/dir/bar.adoc[]`, opts)
        expect(html).to.include('Bar')
      })

      if (testOptions.platform === 'Node.js') {
        // When running on Node.js, the following exception is thrown:
        // "SecurityError: Jail is not an absolute path: http://localhost:8080"
      } else {
        it('should include file with a relative http URI (base_dir is an absolute http URI)', function () {
          const opts = {
            safe: 'safe',
            base_dir: testOptions.remoteBaseUri,
            attributes: { 'allow-uri-read': true }
          }
          const html = asciidoctor.convert('include::foo.adoc[]', opts)
          expect(html).to.include('Foo')
        })
      }

      if (testOptions.platform !== 'Browser') {
        // CommonJS and RequireJS tests suites are executed on a Browser (Chrome Headless).
        // Other tests suites are executed on Node.js (using the xmlhttprequest Node module to emulate the browser XMLHttpRequest)
        // Unlike the browser XMLHttpRequest, the xmlhttprequest node module does not expand path and therefore returns a 404!
      } else {
        it('should include file with a relative expandable path (base_dir is an absolute http URI)', function () {
          const opts = {
            safe: 'safe',
            base_dir: `${testOptions.remoteBaseUri}/dir/subdir`,
            attributes: { 'allow-uri-read': true }
          }
          const html = asciidoctor.convert('include::../1.0.0/release.adoc[]', opts)
          expect(html).to.include('Emojis')
        })

        it('should include file with an absolute expandable https URI (base_dir is not defined)', function () {
          const opts = { safe: 'safe', attributes: { 'allow-uri-read': true } }
          const html = asciidoctor.convert(`include::${testOptions.remoteBaseUri}/dir/subdir/../1.0.0/release.adoc[]`, opts)
          expect(html).to.include('Emojis')
        })
      }
    })
  }
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
