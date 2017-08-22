const async = require('async');
const Builder = require('./builder.js');
const builder = new Builder();

async.series([
  callback => builder.jdk8EA(callback),
  callback => builder.jdk9EA(callback)
]);
