'use strict';

const async = require('async');
const GraalVMModule = new require('./module/graalvm');
const graalvmModule = new GraalVMModule();
const execModule = require('./module/exec');

async.series([
  callback => graalvmModule.get(callback),
  callback => {
    execModule.execSync('./build/graalvm/bin/node spec/graalvm/run.js');
    callback();
  },
  callback => {
    GraalVMModule.run();
    callback();
  }
]);
