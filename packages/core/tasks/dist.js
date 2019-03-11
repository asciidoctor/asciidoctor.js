'use strict'

const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const execModule = require('./module/exec')
const BuilderModule = require('./module/builder')

const runTest = () => {
  execModule.execSync('npm run test')
}

const removeDistDirSync = (environments) => {
  log.debug('remove dist directory')
  bfs.removeSync('dist')
  bfs.mkdirsSync('dist/css')
  environments.forEach(environment => bfs.mkdirsSync(`dist/${environment}`))
}

const copyToDist = (environments) => {
  log.task('copy to dist/')
  removeDistDirSync(environments)
  bfs.copySync('build/css/asciidoctor.css', 'dist/css/asciidoctor.css')
  bfs.copySync('build/asciidoctor-browser.min.js', 'dist/browser/asciidoctor.min.js')
  environments.forEach((environment) => {
    bfs.copySync(`build/asciidoctor-${environment}.js`, `dist/${environment}/asciidoctor.js`)
  })
}

log.task('dist')
const builderModule = new BuilderModule()
const start = process.hrtime()

;(async () => {
  await builderModule.build()
  runTest()
  copyToDist(['browser', 'node', 'graalvm'])
  log.success(`Done in ${process.hrtime(start)[0]} s`)
})()
