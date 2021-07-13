'use strict'

const GraalVMModule = require('./module/graalvm.cjs')
const graalvmModule = new GraalVMModule()

;(async () => {
  await graalvmModule.get()
  GraalVMModule.run()
})().catch(err => {
  console.error('Error while running the tests suite against GraalVM: ' + err)
})
