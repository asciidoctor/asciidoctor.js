'use strict';
const fs = require('fs');
const path = require('path');
const bfs = require('bestikk-fs');
const log = require('bestikk-log');
const OpalCompiler = require('bestikk-opal-compiler');

module.exports.compile = (environments, callback) => {
  bfs.mkdirsSync('build');

  log.task('compile specific implementation');
  const opalCompiler = new OpalCompiler({dynamicRequireLevel: 'ignore', requirable: true});
  environments.forEach((environment) => {
    opalCompiler.compile(`asciidoctor/js/opal_ext/${environment}`, `build/opal-ext-${environment}.js`);
  });

  log.task('compile core lib');
  new OpalCompiler({dynamicRequireLevel: 'ignore', defaultPaths: ['build/asciidoctor/lib']})
    .compile('asciidoctor', 'build/asciidoctor-core.js');

  log.task('copy resources');
  log.debug('copy asciidoctor.css');
  const asciidoctorPath = 'build/asciidoctor';
  const asciidoctorCSSFile = path.join(asciidoctorPath, 'data/stylesheets/asciidoctor-default.css');
  fs.createReadStream(asciidoctorCSSFile).pipe(fs.createWriteStream('build/css/asciidoctor.css'));
  callback();
};
