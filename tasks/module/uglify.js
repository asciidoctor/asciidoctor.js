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
  const umdSource = 'build/asciidoctor-umd.js'
  const umdDestination = 'build/asciidoctor-umd.min.js'
  log.transform('minify', umdSource, umdDestination)
  await new Uglify().minify(umdSource, umdDestination)

  const browserSource = 'build/asciidoctor-browser.js'
  const browserDestination = 'build/asciidoctor-browser.min.js'
  log.transform('minify', browserSource, browserDestination)
  await new Uglify(['--jscomp_off=undefinedVars', '--compilation_level=ADVANCED', '--warning_level=QUIET']).minify(browserSource, browserDestination)
}
