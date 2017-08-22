var shareSpec = require('../share/asciidoctor.spec.js');
var asciidoctor = require('../../build/asciidoctor.js')({runtime: {platform: 'browser'}});
require('asciidoctor-docbook.js');

shareSpec(testOptions, asciidoctor);
