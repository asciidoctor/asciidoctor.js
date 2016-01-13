module.exports = OpalCompiler;

var child_process = require('child_process');

var Builder = require('./builder.js');
var builder = new Builder();

function OpalCompiler(config) {
  this.config = config || {};
  var dynamicRequireLevel = this.config.dynamicRequireLevel || 'warning';
  this.config.options = this.config.options || ['--compile', '--dynamic-require ' + dynamicRequireLevel, '--no-opal', '--no-exit'];
}

OpalCompiler.prototype.compile = function(inputFile, outputFile) {
  var options = this.config.options.join(' ');
  builder.execSync('opal ' + options + ' ' + inputFile + ' > ' + outputFile);
}
