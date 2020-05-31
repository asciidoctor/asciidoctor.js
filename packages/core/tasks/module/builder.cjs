'use strict'

const fs = require('fs')
const path = require('path')
const log = require('bestikk-log')
const bfs = require('bestikk-fs')
const Download = require('bestikk-download')
const download = new Download({})
const { rollup } = require('rollup')
const rollupPluginJson = require('@rollup/plugin-json')
const rollupPluginCommonJS = require('@rollup/plugin-commonjs')

const compilerModule = require('./compiler.cjs')
const uglifyModule = require('./uglify.cjs')

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

const concat = (files, destination) => {
  log.transform('concat', files.join(' + '), destination)
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

const generateCommonJSSpec = async () => {
  log.task('generate commonjs spec')
  const bundle = await rollup({
    input: 'spec/node/asciidoctor.spec.js',
    external: [
      'child_process',
      'module',
      'url',
      'path',
      'fs',
      'stream',
      'process',
      'chai',
      'dirty-chai',
      'dot',
      'nunjucks',
      'asciidoctor-opal-runtime',
      'unxhr',
      '../share/mock-server.cjs',
      '../../build/asciidoctor-node.cjs'
    ],
    plugins: [
      {
        // make sure that linked resources (i.e. 'css/asciidoctor.css') will be correctly resolved.
        resolveImportMeta: function (property, { moduleId }) {
          if (property === 'url') {
            if (moduleId.endsWith('asciidoctor-node.js')) {
              const buildDir = path.join(__dirname, '..', '..', 'build').replace(/\\/g, '/')
              return `new URL('file://${buildDir}/asciidoctor-node.js').href`
            }
          }
        }
      },
      rollupPluginJson(),
      rollupPluginCommonJS()
    ]
  })
  await bundle.write({
    file: 'spec/node/asciidoctor.spec.cjs',
    format: 'cjs'
  })
}

const generateFlavors = async (asciidoctorCoreTarget, environments) => {
  log.task('generate flavors')

  // Asciidoctor core + extensions
  const apiFiles = [
    'src/asciidoctor-core-api.js',
    'src/asciidoctor-extensions-api.js'
  ]

  const apiBundle = 'build/asciidoctor-api.js'
  concat(apiFiles, apiBundle)

  const packageJson = require('../../package.json')
  const templateModel = {
    '//{{opalCode}}': fs.readFileSync('node_modules/asciidoctor-opal-runtime/src/opal.js', 'utf8'),
    '//{{asciidoctorAPI}}': fs.readFileSync(apiBundle, 'utf8'),
    '//{{asciidoctorVersion}}': `var ASCIIDOCTOR_JS_VERSION = '${packageJson.version}';`
  }

  // Build a dedicated JavaScript file for each environment
  for (const environment of environments) {
    log.debug(environment)
    const opalExtData = fs.readFileSync(`build/opal-ext-${environment}.js`, 'utf8')
    const asciidoctorCoreData = fs.readFileSync(asciidoctorCoreTarget, 'utf8')
    let data
    if (['node', 'browser'].includes(environment)) {
      const asciidoctorExtData = fs.readFileSync(`build/asciidoctor-ext-${environment}.js`, 'utf8')
      data = opalExtData.concat('\n').concat(asciidoctorExtData).concat('\n').concat(asciidoctorCoreData)
    } else {
      data = opalExtData.concat('\n').concat(asciidoctorCoreData)
    }
    const asciidoctorData = parseTemplateData(data, {
      '//{{requireOpalRuntimeExt}}': `self.$require("asciidoctor/js/opal_ext/${environment}");`,
      // no specific runtime for GraalVM
      '//{{requireAsciidoctorRuntimeExt}}': environment === 'graalvm' ? '' : `self.$require("asciidoctor/js/asciidoctor_ext/${environment}");`
    })
    let templateFile
    const target = `build/asciidoctor-${environment}.js`
    if (environment === 'node') {
      templateFile = 'src/template-asciidoctor-node.js'
    } else {
      templateFile = 'src/template-asciidoctor-browser.js'
    }
    templateModel['//{{asciidoctorCode}}'] = asciidoctorData
    const content = parseTemplateFile(templateFile, templateModel)
      // remove the default export on Opal in the bundle because Asciidoctor is already the default export!
      // otherwise, the following exception is thrown: "Uncaught SyntaxError: Duplicate export of 'default'"
      .replace(/export default Opal/m, '')
    if (environment === 'browser') {
      const header = `/**
 * @license Asciidoctor.js ${packageJson.version} | MIT | https://github.com/asciidoctor/asciidoctor.js
 */
`
      const buffers = []
      buffers.push(Buffer.from(header, 'utf8'))
      buffers.push(Buffer.from(content, 'utf8'))
      fs.writeFileSync(target, Buffer.concat(buffers), 'utf8')
    } else {
      fs.writeFileSync(target, content, 'utf8')
      if (environment === 'node') {
        const bundle = await rollup({
          input: target,
          external: [
            'module',
            'url',
            'path',
            'fs',
            'asciidoctor-opal-runtime',
            'unxhr'
          ]
        })
        await bundle.write({
          file: `build/asciidoctor-${environment}.cjs`,
          format: 'cjs',
          exports: 'default'
        })
      }
    }
  }
}

const removeDistDirSync = (environments) => {
  log.debug('remove dist directory')
  bfs.removeSync('dist')
  bfs.mkdirsSync('dist/css')
  environments.forEach(environment => bfs.mkdirsSync(`dist/${environment}`))
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
      this.asciidoctorCoreVersion = asciidoctorRef || 'main'
    }
    this.benchmarkBuildDir = path.join('build', 'benchmark')
    this.examplesBuildDir = path.join('build', 'examples')
    this.asciidocRepoBaseURI = 'https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625'
    this.environments = ['node', 'graalvm', 'browser']
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
    await generateFlavors(this.asciidoctorCoreTarget, this.environments)
    await generateCommonJSSpec()
    await uglifyModule.uglify()
    if (process.env.COPY_DIST) {
      this.copyToDist()
    }
    log.success(`Done in ${process.hrtime(start)[0]} s`)
  }

  copyToDist () {
    log.task('copy to dist/')
    removeDistDirSync(this.environments)
    bfs.copySync('build/css/asciidoctor.css', 'dist/css/asciidoctor.css')
    bfs.copySync('build/asciidoctor-browser.min.js', 'dist/browser/asciidoctor.min.js')
    for (const environment of this.environments) {
      bfs.copySync(`build/asciidoctor-${environment}.js`, `dist/${environment}/asciidoctor.js`)
    }
  }
}
