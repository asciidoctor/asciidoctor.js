'use strict'

const path = require('path')
const fs = require('fs')
const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const Download = require('bestikk-download')
const download = new Download({})
const OpalBuilder = require('opal-compiler').Builder
const BuilderModule = require('./module/builder.cjs')

const compileExamples = () => {
  log.task('compile examples')
  bfs.mkdirsSync(builder.examplesBuildDir)

  const opalBuilder = OpalBuilder.create()
  opalBuilder.appendPaths('build/asciidoctor/lib')
  opalBuilder.appendPaths('node_modules/opal-compiler/src/stdlib')
  opalBuilder.appendPaths('lib')

  fs.writeFileSync(path.join(builder.examplesBuildDir, 'userguide_test.js'), opalBuilder.build('examples/userguide_test.rb').toString(), 'utf8')
}

const getContentFromAsciiDocRepo = (source, target) => {
  return download.getContentFromURL(`${builder.asciidocRepoBaseURI}/doc/${source}`, target)
}

const copyExamplesResources = () => {
  log.task(`copy resources to ${builder.examplesBuildDir}/`)
  copyToExamplesBuildDir([
    'examples/asciidoctor_example.html',
    'examples/userguide_test.html',
    '../../README.adoc'
  ])

  log.task('Download sample data from AsciiDoc repository')
  return Promise.all([
    getContentFromAsciiDocRepo('asciidoc.txt', path.join(builder.examplesBuildDir, 'userguide.adoc')),
    getContentFromAsciiDocRepo('customers.csv', path.join(builder.examplesBuildDir, 'customers.csv'))
  ])
}

const copyToExamplesBuildDir = (files) => {
  files.forEach(file => bfs.copyToDirSync(file, builder.examplesBuildDir))
}

log.task('examples')
const builder = new BuilderModule()

;(async () => {
  await builder.build()
  compileExamples()
  await copyExamplesResources()
  log.info(`
In order to visualize the result, a local HTTP server must be started within the root of this project otherwise you will have cross-origin issues.
For this purpose, you can run the following command to start a HTTP server locally: 'npm run server'.`)
  log.success(`You can now open:
 - build/examples/asciidoctor_example.html
 - build/examples/userguide_test.html
 - build/examples/basic.html`)
})()
