var path = require('path');
var commonSpec = require('../share/common-specs.js');
var asciidoctor = require('../../build/npm/asciidoctor-core.js')()  ;
var testOptions = {
  platform: 'Node',
  baseDir: path.join(__dirname, '..', '..')
};
commonSpec(testOptions, asciidoctor.Opal, asciidoctor.Asciidoctor(true));
