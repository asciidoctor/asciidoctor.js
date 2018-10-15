'use strict';

const GraalVMModule = new require('./module/graalvm');
const graalvmModule = new GraalVMModule();
const execModule = require('./module/exec');

graalvmModule.get()
  .then(() => {
    execModule.execSync('./build/graalvm/bin/node spec/graalvm/run.js');
    GraalVMModule.run();
  });
