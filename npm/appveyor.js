var async = require('async');
var log = require('bestikk-log');
var Builder = require('./builder.js');
var builder = new Builder();

log.task('Appveyor');
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
