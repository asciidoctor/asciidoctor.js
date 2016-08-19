var path = require('path');
var commonSpec = require('../share/common-specs.js');
var asciidoctor = require('../../build/npm/asciidoctor-core.js')();
var testOptions = {
  platform: 'Node.js',
  baseDir: path.join(__dirname, '..', '..')
};
var Asciidoctor = asciidoctor.Asciidoctor(true);
var Opal = asciidoctor.Opal;

Opal.load('nodejs');
Opal.load('pathname');

commonSpec(testOptions, Opal, Asciidoctor);

describe('Node.js', function () {

  describe('Loading file', function() {
    it('should be able to load a file', function() {
      var doc = Asciidoctor.$load_file(__dirname + '/test.adoc', null);
      expect(doc.attributes.$fetch('docname')).toBe('test.adoc');
    });
  });
});

