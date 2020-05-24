'use strict'

const log = require('bestikk-log')
const execModule = require('./module/exec.js')
const BuilderModule = require('./module/builder.js')

const runTest = () => {
  execModule.execSync('npm run test')
}

log.task('dist')
const builderModule = new BuilderModule()
const start = process.hrtime()

;(async () => {
  process.env.COPY_DIST = "true"
  await builderModule.build()
  runTest()
  log.success(`Done in ${process.hrtime(start)[0]} s`)
})()
