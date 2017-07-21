var Jasmine = require('jasmine');
var log = require('bestikk-log');
var jasmine = new Jasmine();

log.task('Builder spec');
jasmine.loadConfig({
  spec_dir: 'spec',
  spec_files: [
    'build/builder.spec.js'
  ]
});
jasmine.execute();

