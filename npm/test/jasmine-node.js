var Jasmine = require('jasmine');
var log = require('bestikk-log');
var jasmine = new Jasmine();

log.task('Jasmine Node.js');
jasmine.loadConfig({
  spec_dir: 'spec',
  spec_files: [
    'node/asciidoctor.spec.js'
  ]
});
jasmine.execute();
