var bfs = require('bestikk-fs');
var log = require('bestikk-log');
var webpack = require('webpack');
var Jasmine = require('jasmine');

var config = {
  entry: './spec/webpack/asciidoctor.spec.js',
  output: {
    path: __dirname + '../../../build',
    filename: 'webpack-bundle.js'
  }
};

webpack(config, function () {
  log.task('Jasmine webpack');
  bfs.concatSync([
    'spec/webpack/prepare.js',
    'build/webpack-bundle.js'
  ], 'build/webpack.spec.js');

  var jasmine = new Jasmine();
  jasmine.loadConfig({
    spec_dir: 'build',
    spec_files: [
      'webpack.spec.js'
    ]
  });

  // This code is necessary to fake a browser for Opal
  //--------------------------------------------------
  window = global;

  if (typeof XMLHttpRequest === 'undefined') {
    XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
    // Define overrideMimeType, not define by default in wrapper
    XMLHttpRequest.prototype.overrideMimeType = function () {};
  }
  //--------------------------------------------------

  jasmine.execute();
});
