'use strict'

const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const Download = require('bestikk-download')
const download = new Download({})
const log = require('bestikk-log')
const bfs = require('bestikk-fs')

const graalvmCheckConvert = (result, testName) => {
  if (result.indexOf('<h1>asciidoctor.js, AsciiDoc in JavaScript</h1>') === -1) {
    log.error(`${testName} failed, AsciiDoc source is not converted`)
    process.stdout.write(result)
    process.exit(1)
  }
  if (result.indexOf('Asciidoctor default stylesheet') === -1) {
    log.error(`${testName} failed, default stylesheet not embedded in converted document`)
    process.stdout.write(result)
    process.exit(1)
  }
  if (result.indexOf('include content') === -1) {
    log.error(`${testName} failed, include directive is not processed`)
    process.stdout.write(result)
    process.exit(1)
  }
}

const graalvmJavaCompileAndRun = (specName, className, javacBin, javaBin) => {
  // Compile
  log.debug(`compiling ${specName} to build/`)
  try {
    childProcess.execSync(`${javacBin} ./${specName} -d ./build`)
    // Run
    log.debug(`running ${className}`)
    const start = process.hrtime()
    const result = childProcess.execSync(`${javaBin} -classpath ./build ${className}`).toString('utf8')
    log.debug(`running ${className} in ${process.hrtime(start)[0]}s`)
    return result
  } catch (e) {
    process.exit(1)
  }
}

const graalvmInstallJs = (jdkInstallDir) => {
  log.task('gu install nodejs')

  const start = process.hrtime()

  let jdkBinDir
  const platform = process.platform
  if (platform === 'darwin') {
    jdkBinDir = path.join(jdkInstallDir, 'Contents', 'Home', 'bin')
  } else {
    jdkBinDir = path.join(jdkInstallDir, 'bin')
  }
  const guBin = path.join(jdkBinDir, 'gu')

  try {
    const result = childProcess.execSync(`${guBin} install nodejs`).toString('utf8')
    process.stdout.write(result)
  } catch (e) {
    if (e.stdout) {
      process.stdout.write(e.stdout.toString())
    }
    if (e.stderr) {
      process.stderr.write(e.stderr.toString())
    }
    process.exit(1)
  }
  log.success(`Done in ${process.hrtime(start)[0]}s`)
}

const graalvmRun = (name, jdkInstallDir) => {
  log.task(`run against ${name}`)

  const start = process.hrtime()

  let jdkBinDir
  const platform = process.platform
  if (platform === 'darwin') {
    jdkBinDir = path.join(jdkInstallDir, 'Contents', 'Home', 'bin')
  } else {
    jdkBinDir = path.join(jdkInstallDir, 'bin')
  }
  const javacBin = path.join(jdkBinDir, 'javac')
  const javaBin = path.join(jdkBinDir, 'java')
  const nodeBin = path.join(jdkBinDir, 'node')

  // Java classes
  const asciidoctorClassName = 'AsciidoctorConvertWithGraalVM'
  const asciidoctorSpec = `spec/graalvm/${asciidoctorClassName}.java`

  log.info(`run ${name} java`)
  const javaResult = graalvmJavaCompileAndRun(asciidoctorSpec, asciidoctorClassName, javacBin, javaBin)
  graalvmCheckConvert(javaResult, `run with ${name} java`)

  // Run with GraalVM node.js
  try {
    log.info(`run ${name} node.js`)
    const result = childProcess.execSync(`${nodeBin} spec/graalvm/run.cjs`).toString('utf8')
    process.stdout.write(result)
  } catch (e) {
    if (e.stdout) {
      process.stdout.write(e.stdout.toString())
    }
    if (e.stderr) {
      process.stderr.write(e.stderr.toString())
    }
    process.exit(1)
  }
  log.success(`Done ${name} in ${process.hrtime(start)[0]}s`)
}

const downloadGraalVM = async (version) => {
  log.task('download graalvm')

  const target = 'build/graalvm.tar.gz'
  if (fs.existsSync(target)) {
    log.info(target + ' file already exists, skipping "download" task')
    return
  }
  const platform = process.platform
  if (platform === 'darwin' || platform === 'linux') {
    await download.getContentFromURL(`https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-${version}/graalvm-ce-java11-${platform}-amd64-${version}.tar.gz`, target)
    if (fs.existsSync('build/graalvm')) {
      log.info('build/graalvm directory already exists, skipping "untar" task')
      return Promise.resolve({})
    }
    return bfs.untar(target, 'graalvm', 'build')
  } else {
    throw new Error(`The platform ${platform} is not supported!`)
  }
}

module.exports = class GraalVM {
  constructor () {
    this.graalvmVersion = '22.2.0'
  }

  async get () {
    await downloadGraalVM(this.graalvmVersion)
    graalvmInstallJs('./build/graalvm')
  }

  static run () {
    graalvmRun('GraalVM', './build/graalvm')
  }
}
