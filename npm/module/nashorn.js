'use strict';
const async = require('async');
const path = require('path');
const child_process = require('child_process');
const log = require('bestikk-log');
const jdk = require('bestikk-jdk-ea');

const isWin = () => /^win/.test(process.platform);

const nashornCheckConvert = (result, testName) => {
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

const nashornJJSRun = (specName, jjsBin) => {
  log.debug(`running ${specName}`);
  const start = process.hrtime();
  const result = child_process.execSync(jjsBin + ' ' + specName).toString('utf8');
  log.debug(`running ${specName} in ${process.hrtime(start)[0]}s`);
  return result;
};

const nashornJavaCompileAndRun = (specName, className, javacBin, javaBin) => {
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

const nashornRun = (name, jdkInstallDir) => {
  log.task(`run against ${name}`);

  const start = process.hrtime();

  let jjsBin;
  let javacBin;
  let javaBin;
  if (jdkInstallDir) {
    if (isWin()) {
      jdkInstallDir = jdkInstallDir.replace(/\\\//, '\\\\').replace(/\//, '\\\\');
    }
    const jdkBinDir = path.join(jdkInstallDir, 'bin');
    jjsBin = path.join(jdkBinDir, 'jjs');
    javacBin = path.join(jdkBinDir, 'javac');
    javaBin = path.join(jdkBinDir, 'java');
  } else {
    // Should be available in PATH
    jjsBin = 'jjs';
    javacBin = 'javac';
    javaBin = 'java';
  }

  if (isWin()) {
    jjsBin = jjsBin + '.exe';
    javacBin = javacBin + '.exe';
    javaBin = javaBin + '.exe';
  }

  // jjs scripts
  const basicSpec = 'spec/nashorn/basic.js';
  const asciidoctorSpec = 'spec/nashorn/asciidoctor-convert.js';

  // Nashorn classes
  const basicNashornClassName = 'BasicJavascriptWithNashorn';
  const basicNashornSpec = `spec/nashorn/${basicNashornClassName}.java`;
  const asciidoctorNashornClassName = 'AsciidoctorConvertWithNashorn';
  const asciidoctorNashornSpec = `spec/nashorn/${asciidoctorNashornClassName}.java`;

  log.info('run Nashorn jjs');
  nashornJJSRun(basicSpec, jjsBin);
  const jjsResult = nashornJJSRun(asciidoctorSpec, jjsBin);
  nashornCheckConvert(jjsResult, `run with ${name} jjs`);

  log.info('run Nashorn java');
  nashornJavaCompileAndRun(basicNashornSpec, basicNashornClassName, javacBin, javaBin);
  const javaResult = nashornJavaCompileAndRun(asciidoctorNashornSpec, asciidoctorNashornClassName, javacBin, javaBin);
  nashornCheckConvert(javaResult, `run with ${name} java`);
  log.success(`Done ${name} in ${process.hrtime(start)[0]}s`);
};

const jdk8EA = (callback) => {
  async.series([
    callback => jdk.installJDK8EA('build/jdk8', callback),
    callback => {
      nashornRun('jdk1.8.0-ea', 'build/jdk8');
      callback();
    }
  ], () => typeof callback === 'function' && callback());
};

const jdk9EA = (callback) => {
  async.series([
    callback => jdk.installJDK9EA('build/jdk9', callback),
    callback => {
      nashornRun('jdk1.9.0-ea', 'build/jdk9');
      callback();
    }
  ], () => typeof callback === 'function' && callback());
};

module.exports = {
  jdk8EA: jdk8EA,
  jdk9EA: jdk9EA,
  nashornRun: nashornRun
};
