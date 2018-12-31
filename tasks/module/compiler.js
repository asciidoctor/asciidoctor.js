'use strict'
const fs = require('fs')
const path = require('path')
const bfs = require('bestikk-fs')
const log = require('bestikk-log')
const OpalBuilder = require('opal-compiler').Builder

const compileRuntimeEnvironments = (environments) => {
  log.task('compile runtime environments')

  environments.forEach((environment) => {
    // Build a new instance each time, otherwise the context is shared.
    const opalBuilder = OpalBuilder.create()
    opalBuilder.appendPaths('lib')
    opalBuilder.setCompilerOptions({ dynamic_require_severity: 'ignore', requirable: true })
    let module = `asciidoctor/js/opal_ext/${environment}`
    log.debug(module)
    let data = opalBuilder.build(module).toString()
    fs.writeFileSync(`build/opal-ext-${environment}.js`, data, 'utf8')
  })
}

const compileAsciidoctorCore = () => {
  log.task('compile core lib')
  const opalBuilder = OpalBuilder.create()
  opalBuilder.appendPaths('build/asciidoctor/lib')
  opalBuilder.appendPaths('node_modules/opal-compiler/src/stdlib')
  opalBuilder.appendPaths('lib')
  opalBuilder.setCompilerOptions({ dynamic_require_severity: 'ignore' })
  fs.writeFileSync('build/asciidoctor-core.js', opalBuilder.build('asciidoctor').toString(), 'utf8')
}

module.exports.compile = (environments) => {
  bfs.mkdirsSync('build')

  compileRuntimeEnvironments(environments)
  compileAsciidoctorCore()

  log.task('copy resources')
  log.debug('copy asciidoctor.css')
  const asciidoctorPath = 'build/asciidoctor'
  const asciidoctorCSSFile = path.join(asciidoctorPath, 'data/stylesheets/asciidoctor-default.css')
  fs.createReadStream(asciidoctorCSSFile).pipe(fs.createWriteStream('build/css/asciidoctor.css'))
}
