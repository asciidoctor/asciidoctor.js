'use strict'

const log = require('bestikk-log')
const Uglify = require('bestikk-uglify')

module.exports.uglify = async () => {
  // Preconditions
  // - MINIFY environment variable is defined
  if (!process.env.MINIFY) {
    log.info('MINIFY environment variable is not defined, skipping "minify" task')
    return
  }
  log.task('uglify')

  const browserSource = 'build/asciidoctor-browser.js'
  const browserDestination = 'build/asciidoctor-browser.min.js'
  log.transform('minify', browserSource, browserDestination)
  await new Uglify(['--jscomp_off=undefinedVars', '--warning_level=QUIET']).minify(browserSource, browserDestination)
}
