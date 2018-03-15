'use strict';
const async = require('async');
const path = require('path');
const log = require('bestikk-log');
const bfs = require('bestikk-fs');
const download = require('bestikk-download');
const execModule = require('./module/exec');
const BuilderModule = require('./module/builder');

const args = process.argv.slice(2);
const runner = args[0];

const runners = ['node', 'chrome', 'nashorn'];
if (!runners.includes(runner)) {
  log.error(`Runner must be one of: ${runners.join(', ')}. 'npm run benchmark [${runners.join('|')}]'`);
  process.exit(9);
}

const getContentFromAsciiDocRepo = (source, target, callback) => {
  download.getContentFromURL(`${builder.asciidocRepoBaseURI}/doc/${source}`, target, callback);
};

const builder = new BuilderModule();
async.series([
  callback => builder.build(callback),
  callback => {
    bfs.mkdirsSync(builder.benchmarkBuildDir);
    ['node', 'nashorn', 'chrome'].forEach(runner => bfs.copyToDirSync(`benchmark/${runner}.js`, builder.benchmarkBuildDir));
    callback();
  },
  callback => {
    log.task('download sample data from AsciiDoc repository');
    callback();
  },
  callback => getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc', callback),
  callback => getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv', callback),
  () => {
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
  }
]);

