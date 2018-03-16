var shareSpec = require('../share/asciidoctor.spec.js');
var includeHttpsSpec = require('../share/asciidoctor-include-https.spec');
var asciidoctor = require('../../build/asciidoctor.js')();
require('asciidoctor-docbook.js')();

var testOptions = {
  platform: 'CommonJS',
  baseDir: 'http://localhost:9876/base'
};

shareSpec(testOptions, asciidoctor);
includeHttpsSpec(testOptions, asciidoctor);
