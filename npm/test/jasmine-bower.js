var bfs = require('bestikk-fs');
var log = require('bestikk-log');
var Jasmine = require('jasmine');

log.task('Jasmine Bower');
bfs.concatSync([
  'build/asciidoctor-all.js',
  'build/asciidoctor-docbook.js',
  'spec/share/common-specs.js',
  'spec/bower/bower.spec.js'
], 'build/bower.spec.all.js');

var jasmine = new Jasmine();
jasmine.loadConfig({
  spec_dir: 'build',
  spec_files: [
    'bower.spec.all.js'
  ]
});

// This code is necessary to fake a browser for Opal
//--------------------------------------------------
window = {};

if (typeof XMLHttpRequest === 'undefined') {
  XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
  // Define overrideMimeType, not define by default in wrapper
  XMLHttpRequest.prototype.overrideMimeType = function() {};
}
//--------------------------------------------------

jasmine.execute();
