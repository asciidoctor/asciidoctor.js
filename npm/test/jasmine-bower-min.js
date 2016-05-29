var concat = require('../concat.js');
var Log = require('../log.js');
var log = new Log();
var Jasmine = require('jasmine');

if (!process.env.MINIFY) {
  log.info('MINIFY environment variable is not defined, skipping "Jasmine Bower.min" task');
  return;
}
log.title('Jasmine Bower.min');
concat([
  'build/asciidoctor-all.min.js',
  'build/asciidoctor-docbook.min.js',
  'spec/share/common-specs.js',
  'spec/bower/bower.spec.js'
], 'build/bower.spec.all.min.js');

var jasmine = new Jasmine();
jasmine.loadConfig({
  spec_dir: 'build',
  spec_files: [
    'bower.spec.all.min.js',
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
