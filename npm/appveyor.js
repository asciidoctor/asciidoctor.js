var async = require('async');
var Log = require('./log.js');
var Builder = require('./builder.js');
var builder = new Builder();
var log = new Log();

log.title('Appveyor');
async.series([
  function (callback) { builder.build(callback); },
  function (callback) {
    if (process.env.APPVEYOR_SCHEDULED_BUILD) {
      builder.jdk8EA(callback);
    } else {
      callback();
    }
  },
  function (callback) {
    if (process.env.APPVEYOR_SCHEDULED_BUILD) {
      builder.jdk9EA(callback);
    } else {
      callback();
    }
  }]
);
