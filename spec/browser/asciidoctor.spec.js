var path = require('path');

var testOptions = {
  platform: 'Browser',
  baseDir: 'file://' + path.join(__dirname, '..')
};

var asciidoctor = require('./asciidoctor.js')({runtime: {platform: 'browser'}});
require('asciidoctor-docbook.js')();

shareSpec(testOptions, asciidoctor);
includeHttpsSpec(testOptions, asciidoctor);
includeFileSpec(testOptions, asciidoctor);

describe('Browser', function () {
  describe('Include', function () {
    // REMIND: Does not work because we are unable to get the current directory in a reliable way when running inside a browser
    /*
    it('Should include file with a relative path (base_dir is not defined)', function () {
      var opts = {safe: 'safe'};
      var html = asciidoctor.convert('include::spec/fixtures/include.adoc[]', opts);
      expect(html).toContain('include content');
    });
    */

    it('Should include file with an absolute path (base_dir is explicitly defined)', function () {
      var opts = {safe: 'safe', base_dir: testOptions.baseDir};
      var html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include.adoc[]', opts);
      expect(html).toContain('include content');
    });
  });
});



