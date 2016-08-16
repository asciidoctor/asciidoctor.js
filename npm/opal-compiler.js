var Log = require('./log.js');
var log = new Log();

module.exports = OpalCompiler;

var Log = require('./log.js');
var log = new Log();
var Builder = require('opal-compiler').Builder;
var fs = require('fs');

function OpalCompiler(config) {
  this.config = config || {};
  this.dynamicRequireLevel = this.config.dynamicRequireLevel || 'warning';
  Opal.config.unsupported_features_severity = 'ignore';
}

OpalCompiler.prototype.compile = function(require, outputFile, includes) {
  var builder = Builder.$new();
  builder.$append_paths('node_modules/opal-compiler/src/stdlib', 'lib', 'build/asciidoctor/lib');
  builder.compiler_options = Opal.hash({'dynamic_require_severity': this.dynamicRequireLevel});
  if (typeof includes !== 'undefined') {
    var includesLength = includes.length;
    for (var i = 0; i < includesLength; i++) {
      builder.$append_paths(includes[i]);
    }
  }
  log.debug('compile ' + require);
  var result = builder.$build(require);
  fs.writeFileSync(outputFile, result.$to_s(), 'utf8');
}
