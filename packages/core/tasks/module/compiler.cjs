'use strict'

const fs = require('fs')
const path = require('path')
const bfs = require('bestikk-fs')
const log = require('bestikk-log')

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
    const opalBuilder = require('opal-compiler').Builder.create()
    opalBuilder.appendPaths('lib')
    opalBuilder.setCompilerOptions({ dynamic_require_severity: 'ignore', requirable: true })
    // For performance reason we build "asciidoctor_ext" without "asciidoctor" core.
    // As a result Ruby modules required in "asciidoctor_ext" won't be found at compile time but will be resolved at runtime.
    opalBuilder.missing_require_severity = 'ignore'
    try {
      const data = opalBuilder.build(module).toString()
      fs.writeFileSync(target, data, 'utf8')
    } catch (e) {
      console.error(`Unable to compile: ${module}`, e)
      throw e
    }
  }
}

const compileRuntimeEnvironments = (environments) => {
  log.task('compile runtime environments')

  const skipped = []
  for (const environment of environments) {
    compileExt('opal', environment, skipped)
    compileExt('asciidoctor', environment, skipped)
  }
  if (skipped.length > 0) {
    log.info(`${skipped.join(', ')} files already exist, skipping "compile" task.\nTIP: Use "npm run clean:patch" to compile again from Ruby sources.`)
  }
}

const compileAsciidoctorCore = (asciidoctorCoreDependency) => {
  log.task('compile core lib')
  const module = 'asciidoctor/lib'
  log.debug(module)
  const target = asciidoctorCoreDependency.target
  if (fs.existsSync(target)) {
    log.info(`${target} file already exists, skipping "compile" task.\nTIP: Use "npm run clean:core" to compile again from Asciidoctor Ruby.`)
    return
  }
  // FIXME: remove once https://github.com/asciidoctor/asciidoctor/pull/4205 is merged and released!
  // start::asciidoctor#4205
  const converterFilePath = path.join(__dirname, '..', '..', 'build', 'asciidoctor', 'lib', 'asciidoctor', 'converter.rb')
  if (fs.existsSync(converterFilePath)) {
    const converterSource = fs.readFileSync(converterFilePath, 'utf8')
    fs.writeFileSync(converterFilePath, converterSource.replace(/^(\s+autoload :TemplateConverter,.*)$/m, '$1 unless RUBY_ENGINE == \'opal\''), 'utf-8')
  }
  // end::asciidoctor#4205
  const opalBuilder = require('opal-compiler').Builder.create()
  opalBuilder.appendPaths('build/asciidoctor/lib')
  opalBuilder.appendPaths('node_modules/opal-compiler/src/stdlib')
  opalBuilder.appendPaths('lib')
  opalBuilder.setCompilerOptions({ dynamic_require_severity: 'ignore', use_strict: true })
  fs.writeFileSync(target, opalBuilder.build('asciidoctor').toString(), 'utf8')

  replaceUnsupportedFeatures(asciidoctorCoreDependency)
  applyPatches(asciidoctorCoreDependency)
}

const replaceUnsupportedFeatures = (asciidoctorCoreDependency) => {
  log.task('replace unsupported features')
  const path = asciidoctorCoreDependency.target
  let data = fs.readFileSync(path, 'utf8')
  log.debug('replace (g)sub! with (g)sub')
  data = data.replace(/\$send\(([^,]+), '(g?sub)!'/g, '$1 = $send($1, \'$2\'')
  fs.writeFileSync(path, data, 'utf8')
}

const applyPatches = (asciidoctorCoreDependency) => {
  log.task('apply patches')
  const path = asciidoctorCoreDependency.target
  let data = fs.readFileSync(path, 'utf8')
  log.debug('preserve stack on Error (workaround: https://github.com/opal/opal/issues/1962)')
  data = data.replace(/([\s]+)(wrapped_ex\.\$set_backtrace\(ex\.\$backtrace\(\)\);)/g, '$1$2$1wrapped_ex.stack = ex.stack;')
  fs.writeFileSync(path, data, 'utf8')
}

const patchOpalCompiler = () => {
  // revert https://github.com/opal/opal/commit/d46792d2160e4f524c3add711f6424dd99187d1c
  // see: https://github.com/opal/opal/issues/2099
  const sourceFile = path.join(__dirname, '..', '..', 'node_modules', 'opal-compiler', 'src', 'opal-builder.js')
  const source = fs.readFileSync(sourceFile, 'utf8')
  fs.writeFileSync(sourceFile, source.replace(/(Opal\.modules\["opal\/parser\/patch"].*?)(\s+\(function\([^)]+\) {\n\s+var self = \$klass\(\$base, \$super, 'Lexer'\);.*},\s\$Lexer_source_buffer\$eq\$1\.\$\$arity = 1\), nil\) && 'source_buffer='\n\s+}\)\(\$\$\(\$nesting, 'Parser'\), null, \$nesting\);)/gs, '$1'))
}

module.exports.compile = (asciidoctorCoreDependency, environments) => {
  bfs.mkdirsSync('build')
  patchOpalCompiler()
  compileRuntimeEnvironments(environments)
  compileAsciidoctorCore(asciidoctorCoreDependency)
  log.task('copy resources')
  log.debug('copy asciidoctor.css')
  const asciidoctorPath = 'build/asciidoctor'
  const asciidoctorCSSFile = path.join(asciidoctorPath, 'data/stylesheets/asciidoctor-default.css')
  fs.createReadStream(asciidoctorCSSFile).pipe(fs.createWriteStream('build/css/asciidoctor.css'))
}
