'use strict';

const path = require('path');
const log = require('bestikk-log');
const bfs = require('bestikk-fs');
const Download = require('bestikk-download');
const download = new Download({});
const execModule = require('./module/exec');
const BuilderModule = require('./module/builder');

const args = process.argv.slice(2);
const runner = args[0];

const runners = ['node', 'chrome', 'nashorn'];
if (!runners.includes(runner)) {
  log.error(`Runner must be one of: ${runners.join(', ')}. 'npm run benchmark [${runners.join('|')}]'`);
  process.exit(9);
}

const getContentFromAsciiDocRepo = (source, target) => {
  return download.getContentFromURL(`${builder.asciidocRepoBaseURI}/doc/${source}`, target);
};

const builder = new BuilderModule();
builder.build()
  .then(() => {
    bfs.mkdirsSync(builder.benchmarkBuildDir);
    ['node', 'nashorn', 'chrome'].forEach(runner => bfs.copyToDirSync(`benchmark/${runner}.js`, builder.benchmarkBuildDir));
    log.task('download sample data from AsciiDoc repository');
    return Promise.all([
      getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc'),
      getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv')
    ]);
  })
  .then(() => {
    log.task('run benchmark');
    if (runner === 'chrome') {
      execModule.execSync('node ' + path.join(builder.benchmarkBuildDir, 'chrome.js'));
    } else if (runner === 'nashorn') {
      execModule.execSync('jjs ' + path.join(builder.benchmarkBuildDir, 'nashorn.js'));
    } else if (runner === 'node') {
      execModule.execSync('node ' + path.join(builder.benchmarkBuildDir, 'node.js'));
    } else {
      log.error(`${runner} runner is unsupported!`);
    }
    return Promise.resolve({});
  });
