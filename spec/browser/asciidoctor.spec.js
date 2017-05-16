var path = require('path');

var testOptions = {
  platform: 'Browser',
  baseDir: 'file://' + path.join(__dirname, '..')
};

var asciidoctor = require('./asciidoctor.js')({runtime: {platform: 'browser'}});
require('asciidoctor-docbook.js');

commonSpec(testOptions, asciidoctor);
