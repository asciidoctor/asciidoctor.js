var Jasmine = require('jasmine');
var log = require('bestikk-log');
var jasmine = new Jasmine();

log.task('Jasmine npm');
jasmine.loadConfig({
  spec_dir: 'spec',
  spec_files: [
    'npm/asciidoctor.spec.js'
  ]
});
jasmine.execute();
