var path = require('path');
var testOptions = {
  platform: 'Bower',
  baseDir: 'file://' + path.join(__dirname, '..')
};

commonSpec(testOptions, Opal, Opal.Asciidoctor);
