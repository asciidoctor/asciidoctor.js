var async = require('async');
var Builder = require('./builder.js');
var builder = new Builder();

async.series([
  function (callback) {
    builder.jdk8EA(callback);
  },
  function (callback) {
    builder.jdk9EA(callback);
  }]
);
