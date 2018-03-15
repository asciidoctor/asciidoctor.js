'use strict';

const async = require('async');
const path = require('path');
const log = require('bestikk-log');
const bfs = require('bestikk-fs');
const download = require('bestikk-download');
const OpalCompiler = require('bestikk-opal-compiler');
const BuilderModule = require('./module/builder');

const compileExamples = (callback) => {
  log.task('compile examples');
  bfs.mkdirsSync(builder.examplesBuildDir);
  const opalCompiler = new OpalCompiler({defaultPaths: ['build/asciidoctor/lib']});
  opalCompiler.compile('examples/asciidoctor_example.rb', path.join(builder.examplesBuildDir, 'asciidoctor_example.js'));
  opalCompiler.compile('examples/userguide_test.rb', path.join(builder.examplesBuildDir, 'userguide_test.js'));
  callback();
};

const getContentFromAsciiDocRepo = (source, target, callback) => {
  download.getContentFromURL(`${builder.asciidocRepoBaseURI}/doc/${source}`, target, callback);
};

const copyExamplesResources = (callback) => {
  log.task(`copy resources to ${builder.examplesBuildDir}/`);
  copyToExamplesBuildDir([
    'examples/asciidoctor_example.html',
    'examples/userguide_test.html',
    'examples/slide.html',
    'README.adoc'
  ]);

  log.task('Download sample data from AsciiDoc repository');
  async.series([
    callback => getContentFromAsciiDocRepo('asciidoc.txt', path.join(builder.examplesBuildDir, 'userguide.adoc'), callback),
    callback => getContentFromAsciiDocRepo('customers.csv', path.join(builder.examplesBuildDir, 'customers.csv'), callback)
  ], () => typeof callback === 'function' && callback());
};



const copyToExamplesBuildDir = (files) => {
  files.forEach(file => bfs.copyToDirSync(file, builder.examplesBuildDir));
};

log.task('examples');
const builder = new BuilderModule();
async.series([
  callback => builder.build(callback), // Build
  callback => compileExamples(callback), // Compile examples
  callback => copyExamplesResources(callback) // Copy examples resources
], () => {
  log.info(`
In order to visualize the result, a local HTTP server must be started within the root of this project otherwise you will have cross-origin issues.
For this purpose, you can run the following command to start a HTTP server locally: 'npm run server'.`);
  log.success(`You can now open:
 - build/examples/asciidoctor_example.html
 - build/examples/userguide_test.html
 - build/examples/slide.html
 - build/examples/basic.html`);
});

