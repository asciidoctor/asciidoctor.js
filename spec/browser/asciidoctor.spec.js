var path = require('path');

var testOptions = {
  platform: 'Bower',
  baseDir: 'file://' + path.join(__dirname, '..')
};

var asciidoctor = require('./asciidoctor.js')();
require('asciidoctor-docbook.js');

commonSpec(testOptions, asciidoctor);
