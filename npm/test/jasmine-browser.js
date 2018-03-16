var bfs = require('bestikk-fs');
var log = require('bestikk-log');
var Jasmine = require('jasmine');

log.task('Jasmine Browser');
bfs.concatSync([
  'spec/share/asciidoctor.spec.js',
  'spec/share/asciidoctor-include-https.spec.js',
  'spec/browser/asciidoctor.spec.js'
], 'build/browser.spec.all.js');

var jasmine = new Jasmine();
jasmine.loadConfig({
  spec_dir: 'build',
  spec_files: [
    'browser.spec.all.js'
  ]
});

// This code is necessary to fake a browser for Opal
//--------------------------------------------------
process.browser = true;

if (typeof XMLHttpRequest === 'undefined') {
  XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
  // Define overrideMimeType, not define by default in wrapper
  XMLHttpRequest.prototype.overrideMimeType = function () {};
}
//--------------------------------------------------

jasmine.execute();
