'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
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
  childProcess.execSync(`${javacBin} ./${specName} -d ./build`);

  // Run
  log.debug(`running ${className}`);
  const start = process.hrtime();
  const result = childProcess.execSync(`${javaBin} -classpath ./build ${className}`).toString('utf8');
  log.debug(`running ${className} in ${process.hrtime(start)[0] }s`);
  return result;
};

const graalvmRun = (name, jdkInstallDir) => {
  log.task(`run against ${name}`);

  const start = process.hrtime();

  let javacBin;
  let javaBin;
  const jdkBinDir = path.join(jdkInstallDir, 'bin');
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

const downloadGraalVM = (version) => {
  log.task('download graalvm');

  const target = 'build/graalvm.tar.gz';
  if (fs.existsSync(target)) {
    log.info(target + ' file already exists, skipping "download" task');
    return Promise.resolve({});
  }
  return download.getContentFromURL(`https://github.com/oracle/graal/releases/download/vm-${version}/graalvm-ce-${version}-linux-amd64.tar.gz`, target)
    .then(() => {
      if (fs.existsSync('build/graalvm')) {
        log.info('build/graalvm directory already exists, skipping "untar" task');
        return Promise.resolve({});
      }
      return bfs.untar(target, 'graalvm', 'build');
    });
};

module.exports = class GraalVM {
  constructor () {
    this.graalvmVersion = '1.0.0-rc7';
  }

  get () {
    return downloadGraalVM(this.graalvmVersion);
  }

  static run () {
    graalvmRun('GraalVM', './build/graalvm');
  }
};



