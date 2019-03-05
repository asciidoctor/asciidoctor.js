/* global it, describe, mocha, chai, Asciidoctor, shareSpec, includeHttpsSpec, includeFileSpec */
// bootstrap
(async () => {
  let reporter
  const url = new URL(window.location)
  const reporterParam = url.searchParams.get('reporter')
  if (typeof reporterParam === 'string') {
    reporter = reporterParam
  } else {
    reporter = 'html'
  }
  mocha.setup({
    ui: 'bdd',
    ignoreLeaks: true,
    reporter: reporter
  })

  const expect = chai.expect
  const asciidoctor = Asciidoctor({ runtime: { platform: 'browser' } })
  const parts = window.location.href.split('/') // break the string into an array
  parts.pop()
  parts.pop()
  parts.pop()
  const baseDir = parts.join('/')
  const testOptions = {
    platform: 'Browser',
    baseDir: baseDir
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
