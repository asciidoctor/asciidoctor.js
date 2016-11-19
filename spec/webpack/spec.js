var commonSpec = require('../share/common-spec.js');
var asciidoctor = require('../../build/asciidoctor.js')();
require('asciidoctor-docbook.js');

commonSpec(testOptions, asciidoctor);
