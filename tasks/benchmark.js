'use strict'

const path = require('path')
const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const Download = require('bestikk-download')
const download = new Download({})
const execModule = require('./module/exec')
const BuilderModule = require('./module/builder')

const args = process.argv.slice(2)
const runner = args[0]

const runners = ['node', 'chrome', 'firefox']
if (!runners.includes(runner)) {
  log.error(`Runner must be one of: ${runners.join(', ')}. 'npm run benchmark [${runners.join('|')}]'`)
  process.exit(9)
}

const getContentFromAsciiDocRepo = (source, target) => {
  return download.getContentFromURL(`${builder.asciidocRepoBaseURI}/doc/${source}`, target)
}

const builder = new BuilderModule()

;(async () => {
  await builder.build()
  bfs.mkdirsSync(builder.benchmarkBuildDir)
  runners.forEach(runner => bfs.copyToDirSync(`benchmark/${runner}.js`, builder.benchmarkBuildDir))
  bfs.copyToDirSync(`benchmark/stats.js`, builder.benchmarkBuildDir)
  bfs.copyToDirSync(`benchmark/puppeteer-runner.js`, builder.benchmarkBuildDir)
  log.task('download sample data from AsciiDoc repository')
  await Promise.all([
    getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc'),
    getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv')
  ])
  log.task('run benchmark')
  if (runners.includes(runner)) {
    execModule.execSync('node ' + path.join(builder.benchmarkBuildDir, `${runner}.js`))
  } else {
    log.error(`${runner} runner is unsupported!`)
  }
})()
