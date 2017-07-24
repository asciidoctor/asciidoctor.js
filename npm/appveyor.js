const async = require('async');
const log = require('bestikk-log');
const Builder = require('./builder.js');
const builder = new Builder();

log.task('Appveyor');
async.series([
  callback => builder.build(callback),
  callback => {
    if (process.env.APPVEYOR_SCHEDULED_BUILD) {
      builder.jdk8EA(callback);
    } else {
      callback();
    }
  },
  callback => {
    if (process.env.APPVEYOR_SCHEDULED_BUILD) {
      builder.jdk9EA(callback);
    } else {
      callback();
    }
  }]
);
