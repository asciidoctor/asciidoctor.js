'use strict'
const log = require('bestikk-log')
const uglify = require('bestikk-uglify')

module.exports.uglify = () => {
  // Preconditions
  // - MINIFY environment variable is defined
  if (!process.env.MINIFY) {
    log.info('MINIFY environment variable is not defined, skipping "minify" task')
    return Promise.resolve({})
  }
  log.task('uglify')
  const source = 'build/asciidoctor.js'
  const destination = 'build/asciidoctor.min.js'
  log.transform('minify', source, destination)
  return uglify.minify(source, destination)
}
