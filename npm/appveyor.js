'use strict';

const async = require('async');
const log = require('bestikk-log');
const nashornModule = require('./module/nashorn');
const BuilderModule = require('./module/builder');

log.task('Appveyor');
async.series([
  callback => new BuilderModule().build(callback),
  callback => {
    if (process.env.APPVEYOR_SCHEDULED_BUILD) {
      nashornModule.jdk8EA(callback);
    } else {
      callback();
    }
  },
  callback => {
    if (process.env.APPVEYOR_SCHEDULED_BUILD) {
      nashornModule.jdk9EA(callback);
    } else {
      callback();
    }
  }]
);
