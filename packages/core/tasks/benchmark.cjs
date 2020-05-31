'use strict'

const path = require('path')
const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const Download = require('bestikk-download')
const download = new Download({})
const execModule = require('./module/exec.cjs')
const BuilderModule = require('./module/builder.cjs')

const args = process.argv.slice(2)
const runner = args[0]

const runners = ['node', 'chrome']
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
  const runners = ['node', 'chrome']
  runners.forEach(runner => bfs.copyToDirSync(`benchmark/${runner}.cjs`, builder.benchmarkBuildDir))
  bfs.copyToDirSync('benchmark/stats.cjs', builder.benchmarkBuildDir)
  log.task('download sample data from AsciiDoc repository')
  await Promise.all([
    getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc'),
    getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv')
  ])
  log.task('run benchmark')
  if (runner === 'chrome') {
    execModule.execSync('node ' + path.join(builder.benchmarkBuildDir, 'chrome.cjs'))
  } else if (runner === 'node') {
    execModule.execSync('node ' + path.join(builder.benchmarkBuildDir, 'node.cjs'))
  } else {
    log.error(`${runner} runner is unsupported!`)
  }
})()
