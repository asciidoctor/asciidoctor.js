'use strict'

const GraalVMModule = require('./module/graalvm')
const graalvmModule = new GraalVMModule()

;(async () => {
  await graalvmModule.get()
  GraalVMModule.run()
})()
