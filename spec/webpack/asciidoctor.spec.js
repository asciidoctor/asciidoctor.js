var shareSpec = require('../share/asciidoctor.spec.js');
var includeHttpsSpec = require('../share/asciidoctor-include-https.spec');
var asciidoctor = require('../../build/asciidoctor.js')({runtime: {platform: 'browser'}});

shareSpec(testOptions, asciidoctor);
includeHttpsSpec(testOptions, asciidoctor);
