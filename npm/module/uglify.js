'use strict';
const async = require('async');
const log = require('bestikk-log');

module.exports.uglify = (callback) => {
  // Preconditions
  // - MINIFY environment variable is defined
  if (!process.env.MINIFY) {
    log.info('MINIFY environment variable is not defined, skipping "minify" task');
    callback();
    return;
  }
  const uglify = require('bestikk-uglify');
  log.task('uglify');

  const tasks = [
    {source: 'build/asciidoctor.js', destination: 'build/asciidoctor.min.js'}
  ].map(file => {
    const source = file.source;
    const destination = file.destination;
    log.transform('minify', source, destination);
    return callback => uglify.minify(source, destination, callback);
  });

  async.parallelLimit(tasks, 4, callback);
};
