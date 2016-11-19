var bfs = require('bestikk-fs');
var log = require('bestikk-log');
var Jasmine = require('jasmine');

if (!process.env.MINIFY) {
  log.info('MINIFY environment variable is not defined, skipping "Jasmine Bower.min" task');
  return;
}
log.task('Jasmine Browser (minified)');
bfs.concatSync([
  'spec/share/common-spec.js',
  'spec/browser/asciidoctor.spec.js'
], 'build/bower.spec.all.min.js');

var jasmine = new Jasmine();
jasmine.loadConfig({
  spec_dir: 'build',
  spec_files: [
    'bower.spec.all.min.js'
  ]
});

// This code is necessary to fake a browser for Opal
//--------------------------------------------------
window = {};
process.browser = true;

if (typeof XMLHttpRequest === 'undefined') {
  XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
  // Define overrideMimeType, not define by default in wrapper
  XMLHttpRequest.prototype.overrideMimeType = function () {};
}
//--------------------------------------------------

jasmine.execute();
