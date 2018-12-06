'use strict'
const fs = require('fs')
const path = require('path')
const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const Download = require('bestikk-download')
const download = new Download({})

const cleanModule = require('./clean')
const compilerModule = require('./compiler')
const uglifyModule = require('./uglify')

const downloadDependencies = (asciidoctorCoreDependency) => {
  log.task('download dependencies')

  const target = 'build/asciidoctor.tar.gz'

  if (fs.existsSync(target)) {
    log.info(target + ' file already exists, skipping "download" task')
    return Promise.resolve({})
  }
  return download.getContentFromURL(`https://codeload.github.com/${asciidoctorCoreDependency.user}/${asciidoctorCoreDependency.repo}/tar.gz/${asciidoctorCoreDependency.version}`, target)
    .then(() => {
      if (fs.existsSync('build/asciidoctor')) {
        log.info('build/asciidoctor directory already exists, skipping "untar" task')
        return Promise.resolve({})
      }
      return bfs.untar(target, 'asciidoctor', 'build')
    })
}

const replaceUnsupportedFeatures = (asciidoctorCoreDependency) => {
  log.task('Replace unsupported features')
  const path = asciidoctorCoreDependency.target
  let data = fs.readFileSync(path, 'utf8')
  log.debug('Replace (g)sub! with (g)sub')
  data = data.replace(/\$send\(([^,]+), '(g?sub)!'/g, '$1 = $send($1, \'$2\'')
  // bypass use of IO.binread when reading include files in reader
  data = data.replace(/inc_content *= *(.*?)if *\(target_type\['\$=='\]\("file"\)\)(.*)/, 'inc_content = $1if (false)$2')
  fs.writeFileSync(path, data, 'utf8')
  return Promise.resolve({})
}

const replaceDefaultStylesheetPath = (asciidoctorCoreDependency) => {
  log.task('Replace default stylesheet path')
  const path = asciidoctorCoreDependency.target
  let data = fs.readFileSync(path, 'utf8')
  log.debug('Replace primary_stylesheet_data method')
  const primaryStylesheetDataImpl = `
var File = Opal.const_get_relative([], "File");
var stylesheetsPath;
if (Opal.const_get_relative([], "JAVASCRIPT_PLATFORM")["$=="]("node")) {
  if (File.$basename(__dirname) === "node" && File.$basename(File.$dirname(__dirname)) === "dist") {
    stylesheetsPath = File.$join(File.$dirname(__dirname), "css");
  } else {
    stylesheetsPath = File.$join(__dirname, "css");
  }
} else {
  stylesheetsPath = "css";
}
return ((($a = self.primary_stylesheet_data) !== false && $a !== nil && $a != null) ? $a : self.primary_stylesheet_data = Opal.const_get_relative([], "IO").$read(File.$join(stylesheetsPath, "asciidoctor.css")).$chomp());
  `
  data = data.replace(/(function \$\$primary_stylesheet_data\(\) {\n)(?:[^}]*)(\n\s+}.*)/g, '$1' + primaryStylesheetDataImpl + '$2')
  fs.writeFileSync(path, data, 'utf8')
  return Promise.resolve({})
}

const rebuild = (asciidoctorCoreDependency, environments) => {
  const target = asciidoctorCoreDependency.target
  if (fs.existsSync(target)) {
    log.info(`${target} file already exists, skipping "rebuild" task.\nTIP: Use "npm run clean" to rebuild from Asciidoctor core.`)
    return Promise.resolve({})
  }
  cleanModule.clean()
  return downloadDependencies(asciidoctorCoreDependency)
    .then(() => compilerModule.compile(environments))
    .then(() => replaceUnsupportedFeatures(asciidoctorCoreDependency))
    .then(() => replaceDefaultStylesheetPath(asciidoctorCoreDependency))
}

const concat = (message, files, destination) => {
  log.debug(message)
  bfs.concatSync(files, destination)
}

const parseTemplateFile = (templateFile, templateModel) =>
  parseTemplateData(fs.readFileSync(templateFile, 'utf8'), templateModel)

const parseTemplateData = (data, templateModel) => {
  return data
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => {
      if (line in templateModel) {
        return templateModel[line]
      } else {
        return line
      }
    })
    .join('\n')
}

const generateUMD = (asciidoctorCoreTarget, environments) => {
  log.task('generate UMD')

  // Asciidoctor core + extensions
  const apiFiles = [
    'src/asciidoctor-core-api.js',
    'src/asciidoctor-extensions-api.js'
  ]

  const apiBundle = 'build/asciidoctor-api.js'
  concat('Asciidoctor API core + extensions', apiFiles, apiBundle)

  const packageJson = require('../../package.json')
  const templateModel = {
    '//{{opalCode}}': fs.readFileSync('node_modules/opal-runtime/src/opal.js', 'utf8'),
    '//{{asciidoctorAPI}}': fs.readFileSync(apiBundle, 'utf8'),
    '//{{asciidoctorVersion}}': `var ASCIIDOCTOR_JS_VERSION = '${packageJson.version}';`
  }

  // Build a dedicated JavaScript file for each environment
  environments.forEach((environment) => {
    const opalExtData = fs.readFileSync(`build/opal-ext-${environment}.js`, 'utf8')
    const asciidoctorCoreData = fs.readFileSync(asciidoctorCoreTarget, 'utf8')
    let moduleData = parseTemplateData(opalExtData.concat('\n').concat(asciidoctorCoreData), {
      '//{{asciidoctorRuntimeEnvironment}}': `self.$require("asciidoctor/js/opal_ext/${environment}");`
    })
    let templateFile
    let target = `build/asciidoctor-${environment}.js`
    if (['node', 'electron'].includes(environment)) {
      templateFile = 'src/template-asciidoctor-node.js'
    } else {
      templateFile = 'src/template-asciidoctor-umd.js'
    }
    templateModel['//{{asciidoctorCode}}'] = moduleData
    const content = parseTemplateFile(templateFile, templateModel)
    fs.writeFileSync(target, content, 'utf8')
    // To be backward compatible
    if (environment === 'umd') {
      fs.writeFileSync('build/asciidoctor.js', content, 'utf8')
    }
  })
  return Promise.resolve({})
}

module.exports = class Builder {
  constructor () {
    const asciidoctorRef = process.env.ASCIIDOCTOR_CORE_VERSION
    if (asciidoctorRef && asciidoctorRef.includes('/')) {
      // check if ASCIIDOCTOR_CORE_VERSION is user/repo#branch
      let segments = asciidoctorRef.split('/')
      this.asciidoctorCoreUser = segments[0]
      segments = segments[1].split('#')
      this.asciidoctorCoreRepo = segments[0]
      this.asciidoctorCoreVersion = segments[1]
    } else {
      // assume ASCIIDOCTOR_CORE_VERSION is a ref (branch or tag) in asciidoctor/asciidoctor
      this.asciidoctorCoreUser = this.asciidoctorCoreRepo = 'asciidoctor'
      this.asciidoctorCoreVersion = asciidoctorRef || 'master'
    }
    this.benchmarkBuildDir = path.join('build', 'benchmark')
    this.examplesBuildDir = path.join('build', 'examples')
    this.asciidocRepoBaseURI = 'https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625'
    this.environments = ['umd', 'node', 'graalvm', 'browser']
    this.asciidoctorCoreTarget = path.join('build', 'asciidoctor-core.js')
  }

  build () {
    if (process.env.SKIP_BUILD) {
      log.info('SKIP_BUILD environment variable is true, skipping "build" task')
      return Promise.resolve({})
    }
    if (process.env.DRY_RUN) {
      log.debug('build')
      return Promise.resolve({})
    }

    const start = process.hrtime()

    const asciidoctorCoreDependency = {
      user: this.asciidoctorCoreUser,
      repo: this.asciidoctorCoreRepo,
      version: this.asciidoctorCoreVersion,
      target: this.asciidoctorCoreTarget
    }

    return rebuild(asciidoctorCoreDependency, this.environments)
      .then(() => generateUMD(this.asciidoctorCoreTarget, this.environments))
      .then(() => uglifyModule.uglify())
      .then(() => {
        log.success(`Done in ${process.hrtime(start)[0]} s`)
        return Promise.resolve({})
      })
  }
}
