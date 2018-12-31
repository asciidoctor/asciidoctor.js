'use strict'

const GraalVMModule = require('./module/graalvm')
const graalvmModule = new GraalVMModule()
const execModule = require('./module/exec')

;(async () => {
  await graalvmModule.get()
  execModule.execSync('./build/graalvm/bin/node spec/graalvm/run.js')
  GraalVMModule.run()
})()
