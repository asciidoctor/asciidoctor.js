'use strict'
const fs = require('fs')
const path = require('path')
const bfs = require('bestikk-fs')
const log = require('bestikk-log')
const OpalBuilder = require('opal-compiler').Builder

const compileExt = (name, environment, skipped) => {
  if (fs.existsSync(`lib/asciidoctor/js/${name}_ext/${environment}.rb`)) {
    const module = `asciidoctor/js/${name}_ext/${environment}`
    log.debug(module)
    // Build a new instance each time, otherwise the context is shared.
    const target = `build/${name}-ext-${environment}.js`
    if (fs.existsSync(target)) {
      skipped.push(target)
      return
    }
    const opalBuilder = OpalBuilder.create()
    opalBuilder.appendPaths('lib')
    opalBuilder.setCompilerOptions({ dynamic_require_severity: 'ignore', requirable: true })
    // For performance reason we build "asciidoctor_ext" without "asciidoctor" core.
    // As a result Ruby modules required in "asciidoctor_ext" won't be found at compile time but will be resolved at runtime.
    opalBuilder.missing_require_severity = 'ignore'
    let data = opalBuilder.build(module).toString()
    fs.writeFileSync(target, data, 'utf8')
  }
}

const compileRuntimeEnvironments = (environments) => {
  log.task('compile runtime environments')

  const skipped = []
  environments.forEach((environment) => {
    compileExt('opal', environment, skipped)
    compileExt('asciidoctor', environment, skipped)
  })
  if (skipped.length > 0) {
    log.info(`${skipped.join(', ')} files already exist, skipping "compile" task.\nTIP: Use "npm run clean:ext" to compile again from Ruby sources.`)
  }
}

const compileAsciidoctorCore = (asciidoctorCoreDependency) => {
  log.task('compile core lib')
  const module = `asciidoctor/lib`
  log.debug(module)
  const target = asciidoctorCoreDependency.target
  if (fs.existsSync(target)) {
    log.info(`${target} file already exists, skipping "compile" task.\nTIP: Use "npm run clean:core" to compile again from Asciidoctor Ruby.`)
    return
  }
  const opalBuilder = OpalBuilder.create()
  opalBuilder.appendPaths('build/asciidoctor/lib')
  opalBuilder.appendPaths('node_modules/opal-compiler/src/stdlib')
  opalBuilder.appendPaths('lib')
  opalBuilder.setCompilerOptions({ dynamic_require_severity: 'ignore' })
  fs.writeFileSync(target, opalBuilder.build('asciidoctor').toString(), 'utf8')

  replaceUnsupportedFeatures(asciidoctorCoreDependency)
}

const replaceUnsupportedFeatures = (asciidoctorCoreDependency) => {
  log.task('Replace unsupported features')
  const path = asciidoctorCoreDependency.target
  let data = fs.readFileSync(path, 'utf8')
  log.debug('Replace (g)sub! with (g)sub')
  data = data.replace(/\$send\(([^,]+), '(g?sub)!'/g, '$1 = $send($1, \'$2\'')
  fs.writeFileSync(path, data, 'utf8')
}

module.exports.compile = (asciidoctorCoreDependency, environments) => {
  bfs.mkdirsSync('build')
  compileRuntimeEnvironments(environments)
  compileAsciidoctorCore(asciidoctorCoreDependency)

  log.task('copy resources')
  log.debug('copy asciidoctor.css')
  const asciidoctorPath = 'build/asciidoctor'
  const asciidoctorCSSFile = path.join(asciidoctorPath, 'data/stylesheets/asciidoctor-default.css')
  fs.createReadStream(asciidoctorCSSFile).pipe(fs.createWriteStream('build/css/asciidoctor.css'))
}
