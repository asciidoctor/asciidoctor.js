/* global it, describe, mocha, chai, Asciidoctor, mochaOpts, shareSpec, includeHttpsSpec, includeFileSpec, semVer */
// bootstrap
(async () => {
  let reporter
  if (typeof mochaOpts === 'function') {
    const opts = await mochaOpts()
    reporter = opts.reporter
  } else {
    reporter = 'html'
  }
  mocha.setup({
    ui: 'bdd',
    checkLeaks: false,
    reporter: reporter
  })

  const expect = chai.expect
  const asciidoctor = Asciidoctor({ runtime: { platform: 'browser' } })
  const parts = window.location.href.split('/') // break the string into an array
  parts.pop()
  parts.pop()
  parts.pop()
  const baseDir = parts.join('/')
  const asciidoctorCoreSemVer = semVer(asciidoctor.getCoreVersion())
  const testOptions = {
    platform: 'Browser',
    baseDir: baseDir,
    coreVersion: asciidoctorCoreSemVer
  }
  shareSpec(testOptions, asciidoctor, expect)
  includeHttpsSpec(testOptions, asciidoctor, expect)
  includeFileSpec(testOptions, asciidoctor, expect)

  describe('Browser', function () {
    describe('Include', function () {
      // REMIND: Does not work because we are unable to get the current directory in a reliable way when running inside a browser
      /*
      it('should include file with a relative path (base_dir is not defined)', function () {
        var opts = {safe: 'safe'};
        var html = asciidoctor.convert('include::spec/fixtures/include.adoc[]', opts);
        expect(html).to.include('include content');
      });
      */
      it('should include file with an absolute path (base_dir is explicitly defined)', function () {
        const opts = { safe: 'safe', base_dir: testOptions.baseDir }
        const html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include.adoc[]', opts)
        expect(html).to.include('include content')
      })

      it('should resolve a stylesheet using chrome:// protocol (root)', function () {
        const attributes = {
          stylesheet: 'asciidoctor-plus.css',
          stylesdir: 'chrome://asciidoctor/extension/css',
          copycss: false
        }
        const options = {
          doctype: 'article',
          safe: 'unsafe',
          standalone: true,
          attributes
        }
        const defaultLogger = asciidoctor.LoggerManager.getLogger()
        const memoryLogger = asciidoctor.MemoryLogger.create()
        try {
          asciidoctor.LoggerManager.setLogger(memoryLogger)
          asciidoctor.convert('Hello world', options)
          const errorMessage = memoryLogger.getMessages()[0]
          expect(errorMessage.getSeverity()).to.equal('WARN')
          expect(errorMessage.getText()).to.include('could not retrieve contents of stylesheet at URI: chrome://asciidoctor/extension/css/asciidoctor-plus.css')
        } catch (e) {
          // the resource does not exist but chrome:// is a root path and should not be prepended by "./"
          // we expect the processor to try to load the resource 'chrome://asciidoctor/extension/css/asciidoctor-plus.css' and fail!
          if (asciidoctorCoreSemVer.lte('2.0.10')) {
            expect(e.message).to.include('Failed to load \'chrome://asciidoctor/extension/css/asciidoctor-plus.css\'')
          } else {
            throw e
          }
        } finally {
          asciidoctor.LoggerManager.setLogger(defaultLogger)
        }
      })
    })
  })

  mocha.run(function (failures) {
    if (failures > 0) {
      console.error('%d failures', failures)
    }
  })
})().catch(err => {
  console.error('Unable to start the browser tests suite: ' + err)
})
