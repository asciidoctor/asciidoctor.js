var commonSpec = require('../share/common-spec.js');
var asciidoctor = require('../../build/asciidoctor.js')({runtime: {platform: 'browser'}});
require('asciidoctor-docbook.js');

commonSpec(testOptions, asciidoctor);
