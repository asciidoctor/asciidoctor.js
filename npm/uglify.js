module.exports = Uglify;

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

function Uglify() {
}

Uglify.prototype.minify = function(source, destination, callback) {
  return child_process.exec('java -jar ' + __dirname + '/compiler.jar --warning_level=QUIET --js_output_file=' + destination + ' ' + source, callback);
}
