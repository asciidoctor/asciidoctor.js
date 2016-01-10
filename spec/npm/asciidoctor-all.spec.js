var commonSpec = require('../share/common-specs.js');
var asciidoctor = require('../../build/npm/asciidoctor-core.js')()  ;
commonSpec(asciidoctor.Opal, asciidoctor.Asciidoctor(true));
