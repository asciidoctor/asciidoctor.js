'use strict';

const async = require('async');
const nashornModule = require('./module/nashorn');

async.series([
  callback => nashornModule.jdk8EA(callback),
  callback => nashornModule.jdk9EA(callback)
]);
