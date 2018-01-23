'use strict';
module.exports = Builder;

const async = require('async');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const OpalCompiler = require('bestikk-opal-compiler');
const log = require('bestikk-log');
const jdk = require('bestikk-jdk-ea');
const bfs = require('bestikk-fs');
const download = require('bestikk-download');

let stdout;

String.prototype.endsWith = function (suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

const isWin = function () {
  return /^win/.test(process.platform);
};

function Builder () {
  this.npmCoreFiles = [
    'src/prepend-core.js',
    'node_modules/opal-runtime/src/opal.js',
    'build/asciidoctor-lib.js'
  ];
  if (process.env.ASCIIDOCTOR_CORE_VERSION) {
    this.asciidoctorCoreVersion = process.env.ASCIIDOCTOR_CORE_VERSION;
  } else {
    this.asciidoctorCoreVersion = 'master'; // or v1.5.5 to build against a release
  }
  this.benchmarkBuildDir = path.join('build', 'benchmark');
  this.examplesBuildDir =  path.join('build', 'examples');
  this.asciidocRepoBaseURI = 'https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625';
}

Builder.prototype.build = function (callback) {
  if (process.env.SKIP_BUILD) {
    log.info('SKIP_BUILD environment variable is true, skipping "build" task');
    callback();
    return;
  }
  if (process.env.DRY_RUN) {
    log.debug('build');
    callback();
    return;
  }

  const builder = this;
  const start = process.hrtime();

  async.series([
    callback => builder.rebuild(callback), // rebuild from Asciidoctor core
    callback => builder.generateUMD(callback), // generate UMD
    callback => builder.uglify(callback) // uglify (optional)
  ], () => {
    log.success(`Done in ${process.hrtime(start)[0]} s`);
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.rebuild = function (callback) {
  const target = 'build/asciidoctor-lib.js';
  if (fs.existsSync(target)) {
    log.info(`${target} file already exists, skipping "rebuild" task.\nTIP: Use "npm run clean" to rebuild from Asciidoctor core.`);
    callback();
    return;
  }

  const builder = this;

  async.series([
    callback => builder.clean(callback), // clean
    callback => builder.downloadDependencies(callback), // download dependencies
    callback => builder.compile(callback), // compile
    callback => builder.patchAsciidoctorCore(callback), // patch Asciidoctor core. TODO: remove once Asciidoctor 1.5.6 is released
    callback => builder.replaceUnsupportedFeatures(callback), // replace unsupported features
    callback => builder.replaceDefaultStylesheetPath(callback) // replace the default stylesheet path
  ], () => {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.clean = function (callback) {
  if (process.env.SKIP_CLEAN) {
    log.info('SKIP_CLEAN environment variable is true, skipping "clean" task');
    typeof callback === 'function' && callback();
    return;
  }
  log.task('clean');
  this.removeBuildDirSync(); // remove build directory
  typeof callback === 'function' && callback();
};

Builder.prototype.downloadDependencies = function (callback) {
  log.task('download dependencies');

  const builder = this;
  const target = 'build/asciidoctor.tar.gz';

  async.series([
    callback => {
      if (fs.existsSync(target)) {
        log.info(target + ' file already exists, skipping "download" task');
        callback();
      } else {
        download.getContentFromURL(`https://codeload.github.com/asciidoctor/asciidoctor/tar.gz/${builder.asciidoctorCoreVersion}`, target, callback);
      }
    },
    callback => {
      if (fs.existsSync('build/asciidoctor')) {
        log.info('build/asciidoctor directory already exists, skipping "untar" task');
        callback();
      } else {
        bfs.untar(target, 'asciidoctor', 'build', callback);
      }
    }
  ], () => typeof callback === 'function' && callback());
};

const parseTemplate = function (templateFile, templateModel) {
  return fs.readFileSync(templateFile, 'utf8')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => {
      if(line in templateModel){
        return templateModel[line];
      } else {
        return line;
      }
    })
    .join('\n');
};

Builder.prototype.generateUMD = function (callback) {
  log.task('generate UMD');

  // Asciidoctor
  const apiFiles = [
    'src/asciidoctor-core-api.js',
    'src/asciidoctor-extensions-api.js'
  ];
  this.concat('Asciidoctor API core + extensions', apiFiles, 'build/asciidoctor-api.js');

  var packageJson = require('../package.json');
  const templateModel = {
    '//#{opalCode}': fs.readFileSync('node_modules/opal-runtime/src/opal.js', 'utf8'),
    '//#{asciidoctorCode}': fs.readFileSync('build/asciidoctor-lib.js', 'utf8'),
    '//#{asciidoctorAPI}': fs.readFileSync('build/asciidoctor-api.js', 'utf8'),
    '//#{asciidoctorVersion}': `var ASCIIDOCTOR_JS_VERSION = '${packageJson.version}';`
  };

  const content = parseTemplate('src/template-asciidoctor.js', templateModel);
  fs.writeFileSync('build/asciidoctor.js', content, 'utf8');
  callback();
};

Builder.prototype.release = function (releaseVersion) {
  const builder = this;
  const start = process.hrtime();

  let releasePushed;
  async.series([
    callback => builder.prepareRelease(releaseVersion, callback),
    callback => {
      releasePushed = builder.pushRelease();
      callback();
    },
    callback => builder.completeRelease(releasePushed, releaseVersion, callback)
  ], () => log.success(`Done in ${process.hrtime(start)[0]} s`));
};

Builder.prototype.dist = function () {
  const builder = this;
  const start = process.hrtime();

  async.series([
    callback => builder.build(callback),
    callback => builder.runTest(callback),
    callback => builder.copyToDist(callback)
  ], () => log.success(`Done in ${process.hrtime(start)[0]} s`));
};

Builder.prototype.prepareRelease = function (releaseVersion, callback) {
  log.task(`Release version: ${releaseVersion}`);

  if (process.env.DRY_RUN) {
    log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable');
  } else {
    this.execSync(`npm version ${releaseVersion}`);
  }
  callback();
};

Builder.prototype.runTest = function (callback) {
  this.execSync('npm run test');
  callback();
};

Builder.prototype.pushRelease = function () {
  const remoteName = child_process.execSync('git remote -v').toString('utf8')
    .split(/\r?\n/)
    .filter(line => line.includes('(push)') && line.includes('asciidoctor/asciidoctor.js.git'))
    .map(line => line.split('\t')[0])
    .reduce((a, b) => a + b, '');

  if (remoteName) {
    this.execSync(`git push ${remoteName} master`);
    this.execSync(`git push ${remoteName} --tags`);
    return true;
  } else {
    log.warn('Unable to find the remote name of the original repository asciidoctor/asciidoctor.js');
    return false;
  }
};

Builder.prototype.completeRelease = function (releasePushed, releaseVersion, callback) {
  log.info('');
  log.info('To complete the release, you need to:');
  if (!releasePushed) {
    log.info('[ ] push changes upstream: `git push origin master && git push origin --tags');
  }
  log.info(`[ ] edit the release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/tag/v${releaseVersion}`);
  log.info('[ ] create an issue here: https://github.com/webjars/asciidoctor.js to update Webjars');
  callback();
};

Builder.prototype.concat = function (message, files, destination) {
  log.debug(message);
  bfs.concatSync(files, destination);
};

Builder.prototype.removeBuildDirSync = function () {
  log.debug('remove build directory');
  bfs.removeSync('build');
  bfs.mkdirsSync('build/css');
};

Builder.prototype.removeDistDirSync = function () {
  log.debug('remove dist directory');
  bfs.removeSync('dist');
  bfs.mkdirsSync('dist/css');
};

Builder.prototype.execSync = function (command) {
  log.debug(command);
  if (!process.env.DRY_RUN) {
    stdout = child_process.execSync(command);
    process.stdout.write(stdout);
    return stdout;
  }
};

Builder.prototype.uglify = function (callback) {
  // Preconditions
  // - MINIFY environment variable is defined
  if (!process.env.MINIFY) {
    log.info('MINIFY environment variable is not defined, skipping "minify" task');
    callback();
    return;
  }
  const uglify = require('bestikk-uglify');
  log.task('uglify');

  const tasks = [
    {source: 'build/asciidoctor.js', destination: 'build/asciidoctor.min.js' }
  ].map(file => {
    const source = file.source;
    const destination = file.destination;
    log.transform('minify', source, destination);
    return callback => uglify.minify(source, destination, callback);
  });

  async.parallelLimit(tasks, 4, callback);
};

Builder.prototype.copyToDist = function (callback) {
  const builder = this;

  log.task('copy to dist/');
  builder.removeDistDirSync();
  bfs.copySync('build/css/asciidoctor.css', 'dist/css/asciidoctor.css');
  bfs.copySync('build/asciidoctor.js', 'dist/asciidoctor.js');
  bfs.copySync('build/asciidoctor.min.js', 'dist/asciidoctor.min.js');
  typeof callback === 'function' && callback();
};

Builder.prototype.copyToExamplesBuildDir = function (files) {
  files.forEach(file => bfs.copyToDirSync(file, this.examplesBuildDir));
};

Builder.prototype.examples = function (callback) {
  const builder = this;

  async.series([
    callback => builder.build(callback), // Build
    callback => builder.compileExamples(callback), // Compile examples
    callback => builder.copyExamplesResources(callback) // Copy examples resources
  ], () => {
    log.info(`
In order to visualize the result, a local HTTP server must be started within the root of this project otherwise you will have cross-origin issues.
For this purpose, you can run the following command to start a HTTP server locally: 'npm run server'.`);
    log.success(`You can now open:
 - build/examples/asciidoctor_example.html
 - build/examples/userguide_test.html
 - build/examples/slide.html
 - build/examples/basic.html`);
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.compileExamples = function (callback) {
  log.task('compile examples');
  bfs.mkdirsSync(this.examplesBuildDir);
  var opalCompiler = new OpalCompiler({defaultPaths: ['build/asciidoctor/lib']});
  opalCompiler.compile('examples/asciidoctor_example.rb', path.join(this.examplesBuildDir, 'asciidoctor_example.js'));
  opalCompiler.compile('examples/userguide_test.rb', path.join(this.examplesBuildDir, 'userguide_test.js'));
  callback();
};

Builder.prototype.getContentFromAsciiDocRepo = function (source, target, callback) {
  download.getContentFromURL(`${this.asciidocRepoBaseURI}/doc/${source}`, target, callback);
};

Builder.prototype.copyExamplesResources = function (callback) {
  const builder = this;

  log.task(`copy resources to ${this.examplesBuildDir}/`);
  this.copyToExamplesBuildDir([
    'examples/asciidoctor_example.html',
    'examples/userguide_test.html',
    'examples/slide.html',
    'README.adoc'
  ]);

  log.task('Download sample data from AsciiDoc repository');
  async.series([
    callback => builder.getContentFromAsciiDocRepo('asciidoc.txt', path.join(builder.examplesBuildDir, 'userguide.adoc'), callback),
    callback => builder.getContentFromAsciiDocRepo('customers.csv', path.join(builder.examplesBuildDir, 'customers.csv'), callback)
  ], () => typeof callback === 'function' && callback());
};

Builder.prototype.compile = function (callback) {
  var opalCompiler = new OpalCompiler({dynamicRequireLevel: 'ignore', defaultPaths: ['build/asciidoctor/lib']});

  bfs.mkdirsSync('build');

  log.task('compile core lib');
  opalCompiler.compile('asciidoctor', 'build/asciidoctor-lib.js');

  log.task('copy resources');
  log.debug('copy asciidoctor.css');
  var asciidoctorPath = 'build/asciidoctor';
  var asciidoctorCSSFile = path.join(asciidoctorPath, 'data/stylesheets/asciidoctor-default.css');
  fs.createReadStream(asciidoctorCSSFile).pipe(fs.createWriteStream('build/css/asciidoctor.css'));
  callback();
};

Builder.prototype.patchAsciidoctorCore = function (callback) {
  log.task('Patch Asciidoctor core');
  var path = 'build/asciidoctor-lib.js';
  var data = fs.readFileSync(path, 'utf8');
  log.debug('Apply pull-request #1925');
  data = data.replace(/path\['\$start_with\?'\]\("file:\/\/\/"\)/g, 'path[\'\$start_with?\']("file://")');
  fs.writeFileSync(path, data, 'utf8');
  callback();
};

Builder.prototype.replaceUnsupportedFeatures = function (callback) {
  log.task('Replace unsupported features');
  const path = 'build/asciidoctor-lib.js';
  let data = fs.readFileSync(path, 'utf8');
  log.debug('Replace (g)sub! with (g)sub');
  data = data.replace(/\$send\(([^,]+), '(g?sub)!'/g, '$1 = $send\($1, \'$2\'');
  // replace dot wildcard with negated line feed in single-line match expressions
  data = data.replace(/Opal\.const_set\([^']+'[^']+Rx', *\/.+\/\);$/gm, function (m) {
    return m.replace(/\.([*+])/g, '[^\\n]$1');
  });
  fs.writeFileSync(path, data, 'utf8');
  callback();
};

Builder.prototype.replaceDefaultStylesheetPath = function (callback) {
  log.task('Replace default stylesheet path');
  const path = 'build/asciidoctor-lib.js';
  let data = fs.readFileSync(path, 'utf8');
  log.debug('Replace primary_stylesheet_data method');
  const primaryStylesheetDataImpl = `
var stylesheetsPath;
if (Opal.const_get_relative([], "JAVASCRIPT_PLATFORM")["$=="]("node")) {
  stylesheetsPath = Opal.const_get_relative([], "File").$join(__dirname, "css");
} else {
  stylesheetsPath = "css";
}
return ((($a = self.primary_stylesheet_data) !== false && $a !== nil && $a != null) ? $a : self.primary_stylesheet_data = Opal.const_get_relative([], "IO").$read(Opal.const_get_relative([], "File").$join(stylesheetsPath, "asciidoctor.css")).$chomp());
  `;
  data = data.replace(/(function \$\$primary_stylesheet_data\(\)\ {\n)(?:[^}]*)(\n\s+}.*)/g, '$1' + primaryStylesheetDataImpl + '$2');
  fs.writeFileSync(path, data, 'utf8');
  callback();
};

Builder.prototype.benchmark = function (runner, callback) {
  const builder = this;

  async.series([
    callback => builder.build(callback),
    callback => {
      bfs.mkdirsSync(builder.benchmarkBuildDir);
      bfs.copyToDirSync('benchmark/run.js', builder.benchmarkBuildDir);
      callback();
    },
    callback => {
      log.task('download sample data from AsciiDoc repository');
      callback();
    },
    callback => builder.getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc', callback),
    callback => builder.getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv', callback),
    () => {
      log.task('run benchmark');
      builder.execSync(runner + ' ' + path.join(builder.benchmarkBuildDir, 'run.js'));
    }
  ], () => typeof callback === 'function' && callback());
};

Builder.prototype.nashornCheckConvert = function (result, testName) {
  if (result.indexOf('<h1>asciidoctor.js, AsciiDoc in JavaScript</h1>') == -1) {
    log.error(`${testName} failed, AsciiDoc source is not converted`);
    process.stdout.write(result);
  }
  if (result.indexOf('include content') == -1) {
    log.error(`${testName} failed, include directive is not processed`);
    process.stdout.write(result);
  }
};

Builder.prototype.nashornJJSRun = function (specName, jjsBin) {
  log.debug(`running ${specName}`);
  const start = process.hrtime();
  const result = child_process.execSync(jjsBin + ' ' + specName).toString('utf8');
  log.debug(`running ${specName} in ${process.hrtime(start)[0]}s`);
  return result;
};

Builder.prototype.nashornJavaCompileAndRun = function (specName, className, javacBin, javaBin) {
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

Builder.prototype.nashornRun = function (name, jdkInstallDir) {
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
  this.nashornJJSRun(basicSpec, jjsBin);
  const jjsResult = this.nashornJJSRun(asciidoctorSpec, jjsBin);
  this.nashornCheckConvert(jjsResult, `run with ${name} jjs`);

  log.info('run Nashorn java');
  this.nashornJavaCompileAndRun(basicNashornSpec, basicNashornClassName, javacBin, javaBin);
  const javaResult = this.nashornJavaCompileAndRun(asciidoctorNashornSpec, asciidoctorNashornClassName, javacBin, javaBin);
  this.nashornCheckConvert(javaResult, `run with ${name} java`);
  log.success(`Done ${name} in ${process.hrtime(start)[0]}s`);
};

Builder.prototype.jdk8EA = function (callback) {
  const builder = this;

  async.series([
    callback => jdk.installJDK8EA('build/jdk8', callback),
    callback => {
      builder.nashornRun('jdk1.8.0-ea', 'build/jdk8');
      callback();
    }
  ], () => typeof callback === 'function' && callback());
};

Builder.prototype.jdk9EA = function (callback) {
  const builder = this;

  async.series([
    callback => jdk.installJDK9EA('build/jdk9', callback),
    callback => {
      builder.nashornRun('jdk1.9.0-ea', 'build/jdk9');
      callback();
    }
  ], () => typeof callback === 'function' && callback());
};
