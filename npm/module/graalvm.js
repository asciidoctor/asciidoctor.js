'use strict';
const async = require('async');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const Download = require('bestikk-download');
const download = new Download({});
const log = require('bestikk-log');
const bfs = require('bestikk-fs');


const graalvmCheckConvert = (result, testName) => {
  if (result.indexOf('<h1>asciidoctor.js, AsciiDoc in JavaScript</h1>') === -1) {
    log.error(`${testName} failed, AsciiDoc source is not converted`);
    process.stdout.write(result);
  }
  if (result.indexOf('Asciidoctor default stylesheet') === -1) {
    log.error(`${testName} failed, default stylesheet not embedded in converted document`);
    process.stdout.write(result);
  }
  if (result.indexOf('include content') === -1) {
    log.error(`${testName} failed, include directive is not processed`);
    process.stdout.write(result);
  }
};

const graalvmJavaCompileAndRun = (specName, className, javacBin, javaBin) => {
  // Compile
  log.debug(`compiling ${specName} to build/`);
  child_process.execSync(`${javacBin} ./${specName} -d ./build`);

  // Run
  log.debug(`running ${className}`);
  const start = process.hrtime();
  const result = child_process.execSync(`${javaBin} -classpath ./build ${className}`).toString('utf8');
  log.debug(`running ${className} in ${process.hrtime(start)[0] }s`);
  return result;
};

const graalvmRun = (name, jdkInstallDir) => {
  log.task(`run against ${name}`);

  const start = process.hrtime();

  let jjsBin;
  let javacBin;
  let javaBin;
  const jdkBinDir = path.join(jdkInstallDir, 'bin');
  jjsBin = path.join(jdkBinDir, 'jjs');
  javacBin = path.join(jdkBinDir, 'javac');
  javaBin = path.join(jdkBinDir, 'java');

  // Java classes
  const asciidoctorClassName = 'AsciidoctorConvertWithGraalVM';
  const asciidoctorSpec = `spec/graalvm/${asciidoctorClassName}.java`;

  log.info(`run ${name} java`);
  const javaResult = graalvmJavaCompileAndRun(asciidoctorSpec, asciidoctorClassName, javacBin, javaBin);
  graalvmCheckConvert(javaResult, `run with ${name} java`);
  log.success(`Done ${name} in ${process.hrtime(start)[0]}s`);
};

const downloadGraalVM = (version, callback) => {
  log.task('download graalvm');

  const target = 'build/graalvm.tar.gz';
  async.series([
    callback => {
      if (fs.existsSync(target)) {
        log.info(target + ' file already exists, skipping "download" task');
        callback();
      } else {
        download.getContentFromURL(`https://github.com/oracle/graal/releases/download/vm-${version}/graalvm-ce-${version}-linux-amd64.tar.gz`, target)
          .then(() => callback());
      }
    },
    callback => {
      if (fs.existsSync('build/graalvm')) {
        log.info('build/graalvm directory already exists, skipping "untar" task');
        callback();
      } else {
        bfs.untar(target, 'graalvm', 'build', callback);
      }
    }
  ], () => typeof callback === 'function' && callback());
};

module.exports = class GraalVM {
  constructor () {
    this.graalvmVersion = '1.0.0-rc7';
  }

  get (callback) {
    async.series([
      callback => downloadGraalVM(this.graalvmVersion, callback)
    ], () => {
      typeof callback === 'function' && callback();
    });
  }

  static run () {
    graalvmRun('GraalVM', './build/graalvm');
  }
};



