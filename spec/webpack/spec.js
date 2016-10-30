var commonSpec = require('../share/common-spec.js');
var asciidoctor = require('../../build/npm/asciidoctor.js')();

var Asciidoctor = asciidoctor.Asciidoctor(true);
var Opal = asciidoctor.Opal;

commonSpec(testOptions, Opal, Asciidoctor);
