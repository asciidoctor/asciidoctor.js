var Jasmine = require('jasmine');
var Log = require('../log.js');
var log = new Log();
var jasmine = new Jasmine();

log.title('Jasmine npm');
jasmine.loadConfig({
  spec_dir: 'spec',
  spec_files: [
    'npm/asciidoctor-all.spec.js',
  ]
});
jasmine.execute();
