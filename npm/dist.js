'use strict';

const async = require('async');
const log = require('bestikk-log');
const bfs = require('bestikk-fs');
const execModule = require('./module/exec');
const BuilderModule = require('./module/builder');

const runTest = (callback) => {
  execModule.execSync('npm run test');
  callback();
};

const removeDistDirSync = (environments) => {
  log.debug('remove dist directory');
  bfs.removeSync('dist');
  bfs.mkdirsSync('dist/css');
  environments.forEach(environment => bfs.mkdirsSync(`dist/${environment}`));
};

const copyToDist = (environments, callback) => {
  log.task('copy to dist/');
  removeDistDirSync();
  bfs.copySync('build/css/asciidoctor.css', 'dist/css/asciidoctor.css');
  bfs.copySync('build/asciidoctor.js', 'dist/asciidoctor.js');
  bfs.copySync('build/asciidoctor.min.js', 'dist/asciidoctor.min.js');
  environments.forEach((environment) => {
    bfs.copySync(`build/asciidoctor-${environment}.js`, `dist/${environment}/asciidoctor.js`);
  });
  typeof callback === 'function' && callback();
};

log.task('dist');
const builderModule = new BuilderModule();
const start = process.hrtime();

async.series([
  callback => builderModule.build(callback),
  callback => runTest(callback),
  callback => copyToDist(callback)
], () => log.success(`Done in ${process.hrtime(start)[0]} s`));
