'use strict'
const fs = require('fs')
const path = require('path')
const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const Download = require('bestikk-download')
const download = new Download({})

const compilerModule = require('./compiler')
const uglifyModule = require('./uglify')

const downloadDependencies = async (asciidoctorCoreDependency) => {
  log.task('download dependencies')
  const target = 'build/asciidoctor.tar.gz'
  if (fs.existsSync(target)) {
    log.info(target + ' file already exists, skipping "download" task.\nTIP: Use "npm run clean" to download again the dependencies.')
    return
  }
  await download.getContentFromURL(`https://codeload.github.com/${asciidoctorCoreDependency.user}/${asciidoctorCoreDependency.repo}/tar.gz/${asciidoctorCoreDependency.version}`, target)
  if (fs.existsSync('build/asciidoctor')) {
    log.info('build/asciidoctor directory already exists, skipping "untar" task')
    return
  }
  return bfs.untar(target, 'asciidoctor', 'build')
}

const rebuild = async (asciidoctorCoreDependency, environments) => {
  await downloadDependencies(asciidoctorCoreDependency)
  compilerModule.compile(asciidoctorCoreDependency, environments)
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
    let data
    if (['node', 'browser'].includes(environment)) {
      const asciidoctorExtData = fs.readFileSync(`build/asciidoctor-ext-${environment}.js`, 'utf8')
      data = opalExtData.concat('\n').concat(asciidoctorExtData).concat('\n').concat(asciidoctorCoreData)
    } else {
      data = opalExtData.concat('\n').concat(asciidoctorCoreData)
    }
    let asciidoctorData = parseTemplateData(data, {
      '//{{requireOpalRuntimeExt}}': `self.$require("asciidoctor/js/opal_ext/${environment}");`,
      // no specific runtime for GraalVM
      '//{{requireAsciidoctorRuntimeExt}}': environment === 'graalvm' ? '' : `self.$require("asciidoctor/js/asciidoctor_ext/${environment}");`
    })
    let templateFile
    let target = `build/asciidoctor-${environment}.js`
    if (environment === 'browser') {
      templateFile = 'src/template-asciidoctor-browser.js'
    } else if (environment === 'node' || environment === 'electron') {
      templateFile = 'src/template-asciidoctor-node.js'
    } else {
      templateFile = 'src/template-asciidoctor-umd.js'
    }
    templateModel['//{{asciidoctorCode}}'] = asciidoctorData
    const content = parseTemplateFile(templateFile, templateModel)
    fs.writeFileSync(target, content, 'utf8')
    // To be backward compatible
    if (environment === 'umd') {
      fs.writeFileSync('build/asciidoctor.js', content, 'utf8')
    }
  })
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

  async build () {
    if (process.env.SKIP_BUILD) {
      log.info('SKIP_BUILD environment variable is true, skipping "build" task')
      return
    }
    if (process.env.DRY_RUN) {
      log.debug('build')
      return
    }

    const start = process.hrtime()

    const asciidoctorCoreDependency = {
      user: this.asciidoctorCoreUser,
      repo: this.asciidoctorCoreRepo,
      version: this.asciidoctorCoreVersion,
      target: this.asciidoctorCoreTarget
    }

    bfs.mkdirsSync('build/css')
    await rebuild(asciidoctorCoreDependency, this.environments)
    generateUMD(this.asciidoctorCoreTarget, this.environments)
    await uglifyModule.uglify()
    log.success(`Done in ${process.hrtime(start)[0]} s`)
  }
}
