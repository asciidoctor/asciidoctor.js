module.exports = Builder;

var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var OpalCompiler = require('bestikk-opal-compiler');
var log = require('bestikk-log');
var jdk = require('bestikk-jdk-ea');
var bfs = require('bestikk-fs');
var download = require('bestikk-download');

var stdout;

String.prototype.endsWith = function (suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var isWin = function () {
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
  this.benchmarkBuildDir = 'build' + path.sep + 'benchmark';
  this.examplesBuildDir = 'build' + path.sep + 'examples';
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
  var builder = this;
  var start = process.hrtime();

  async.series([
    function (callback) { builder.clean(callback); }, // clean
    function (callback) { builder.downloadDependencies(callback); }, // download dependencies
    function (callback) { builder.compile(callback); }, // compile
    function (callback) { builder.patchAsciidoctorCore(callback); }, // patch Asciidoctor core. TODO: remove once Asciidoctor 1.5.6 is released
    function (callback) { builder.replaceUnsupportedFeatures(callback); }, // replace unsupported features
    function (callback) { builder.replaceDefaultStylesheetPath(callback); }, // replace the default stylesheet path
    function (callback) { builder.generateUMD(callback); }, // generate UMD
    function (callback) { builder.uglify(callback); } // uglify (optional)
  ], function () {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.clean = function (callback) {
  if (process.env.SKIP_CLEAN) {
    log.info('SKIP_CLEAN environment variable is true, skipping "clean" task');
    callback();
    return;
  }
  log.task('clean');
  this.removeBuildDirSync(); // remove build directory
  callback();
};

Builder.prototype.downloadDependencies = function (callback) {
  log.task('download dependencies');

  var builder = this;
  var target = 'build/asciidoctor.tar.gz';
  async.series([
    function (callback) {
      if (fs.existsSync(target)) {
        log.info(target + ' file already exists, skipping "download" task');
        callback();
      } else {
        download.getContentFromURL('https://codeload.github.com/asciidoctor/asciidoctor/tar.gz/' + builder.asciidoctorCoreVersion, target, callback);
      }
    },
    function (callback) {
      if (fs.existsSync('build/asciidoctor')) {
        log.info('build/asciidoctor directory already exists, skipping "untar" task');
        callback();
      } else {
        bfs.untar(target, 'asciidoctor', 'build', callback);
      }
    }
  ], function () {
    typeof callback === 'function' && callback();
  });
};

var templateFile = function (templateFile, context, outputFile) {
  var template = fs.readFileSync(templateFile, 'utf8');
  var lines = template.replace(/\r\n/g, '\n').split('\n');
  lines.forEach(function (line, index, result) {
    if (line in context) {
      result[index] = context[line];
    }
  });
  var content = lines.join('\n');
  fs.writeFileSync(outputFile, content, 'utf8');
};

Builder.prototype.generateUMD = function (callback) {
  log.task('generate UMD');

  // Asciidoctor
  var apiFiles = [
    'src/asciidoctor-core-api.js',
    'src/asciidoctor-extensions-api.js'
  ];
  this.concat('Asciidoctor API core + extensions', apiFiles, 'build/asciidoctor-api.js');
  var asciidoctorTemplateContext = {
    '//#{opalCode}': fs.readFileSync('node_modules/opal-runtime/src/opal.js', 'utf8'),
    '//#{asciidoctorCode}': fs.readFileSync('build/asciidoctor-lib.js', 'utf8'),
    '//#{asciidoctorAPI}': fs.readFileSync('build/asciidoctor-api.js', 'utf8')
  };
  templateFile('src/template-asciidoctor.js', asciidoctorTemplateContext, 'build/asciidoctor.js');
  callback();
};

Builder.prototype.release = function (releaseVersion) {
  var builder = this;
  var start = process.hrtime();

  async.series([
    function (callback) { builder.prepareRelease(releaseVersion, callback); },
    function (callback) { builder.build(callback); },
    function (callback) { builder.runTest(callback); },
    function (callback) { builder.copyToDist(callback); },
    function (callback) { builder.commit(releaseVersion, callback); },
    function (callback) { builder.publish(callback); },
    function (callback) { builder.prepareNextIteration(callback); },
    function (callback) { builder.completeRelease(releaseVersion, callback); }
  ], function () {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
  });
};

Builder.prototype.dist = function () {
  var builder = this;
  var start = process.hrtime();

  async.series([
    function (callback) { builder.build(callback); },
    function (callback) { builder.runTest(callback); },
    function (callback) { builder.copyToDist(callback); }
  ], function () {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
  });
};

Builder.prototype.prepareRelease = function (releaseVersion, callback) {
  log.task('Release version: ' + releaseVersion);

  if (process.env.DRY_RUN) {
    log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable');
  } else {
    bfs.updateFileSync('package.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');
  }
  callback();
};

Builder.prototype.commit = function (releaseVersion, callback) {
  this.execSync('git add -A .');
  this.execSync('git commit -m "Release ' + releaseVersion + '"');
  this.execSync('git tag v' + releaseVersion);
  callback();
};

Builder.prototype.prepareNextIteration = function (callback) {
  this.removeDistDirSync();
  this.execSync('git add -A .');
  this.execSync('git commit -m "Prepare for next development iteration"');
  callback();
};

Builder.prototype.runTest = function (callback) {
  this.execSync('npm run test');
  callback();
};

Builder.prototype.publish = function (callback) {
  if (process.env.SKIP_PUBLISH) {
    log.info('SKIP_PUBLISH environment variable is defined, skipping "publish" task');
    callback();
    return;
  }
  this.execSync('npm publish');
  callback();
};

Builder.prototype.completeRelease = function (releaseVersion, callback) {
  log.info('');
  log.info('To complete the release, you need to:');
  log.info('[ ] push changes upstream: `git push origin master && git push origin v' + releaseVersion + '`');
  log.info('[ ] publish a release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/new');
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
  var uglify = require('bestikk-uglify');
  log.task('uglify');
  var files = [
    {source: 'build/asciidoctor.js', destination: 'build/asciidoctor.min.js' }
  ];

  var tasks = [];
  files.forEach(function (file) {
    var source = file.source;
    var destination = file.destination;
    log.transform('minify', source, destination);
    tasks.push(function (callback) {
      uglify.minify(source, destination, callback);
    });
  });
  async.parallelLimit(tasks, 4, callback);
};

Builder.prototype.copyToDist = function (callback) {
  var builder = this;

  log.task('copy to dist/');
  builder.removeDistDirSync();
  bfs.copySync('build/css/asciidoctor.css', 'dist/css/asciidoctor.css');
  bfs.copySync('build/asciidoctor.js', 'dist/asciidoctor.js');
  bfs.copySync('build/asciidoctor.min.js', 'dist/asciidoctor.min.js');
  typeof callback === 'function' && callback();
};

Builder.prototype.copyToExamplesBuildDir = function (file) {
  bfs.copyToDirSync(file, this.examplesBuildDir);
};

Builder.prototype.examples = function (callback) {
  var builder = this;

  async.series([
    function (callback) { builder.build(callback); }, // Build
    function (callback) { builder.compileExamples(callback); }, // Compile examples
    function (callback) { builder.copyExamplesResources(callback); } // Copy examples resources
  ], function () {
    log.info('');
    log.info('In order to visualize the result, a local HTTP server must be started within the root of this project otherwise you will have cross-origin issues.');
    log.info('For this purpose, you can run the following command to start a HTTP server locally: npm run server');
    log.success('You can now open:'
      + '\n - build/examples/asciidoctor_example.html'
      + '\n - build/examples/userguide_test.html'
      + '\n - build/examples/slide.html'
      + '\n - build/examples/basic.html');
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.compileExamples = function (callback) {
  log.task('compile examples');
  bfs.mkdirsSync(this.examplesBuildDir);
  var opalCompiler = new OpalCompiler({defaultPaths: ['build/asciidoctor/lib']});
  opalCompiler.compile('examples/asciidoctor_example.rb', this.examplesBuildDir + '/asciidoctor_example.js');
  opalCompiler.compile('examples/userguide_test.rb', this.examplesBuildDir + '/userguide_test.js');
  callback();
};

Builder.prototype.getContentFromAsciiDocRepo = function (source, target, callback) {
  download.getContentFromURL(this.asciidocRepoBaseURI + '/doc/' + source, target, callback);
};

Builder.prototype.copyExamplesResources = function (callback) {
  var builder = this;

  log.task('copy resources to ' + this.examplesBuildDir + '/');
  this.copyToExamplesBuildDir('examples/asciidoctor_example.html');
  this.copyToExamplesBuildDir('examples/userguide_test.html');
  this.copyToExamplesBuildDir('examples/slide.html');
  this.copyToExamplesBuildDir('examples/basic.html');
  this.copyToExamplesBuildDir('README.adoc');

  log.task('download sample data from AsciiDoc repository');
  async.series([
    function (callback) {
      builder.getContentFromAsciiDocRepo('asciidoc.txt', builder.examplesBuildDir + '/userguide.adoc', callback);
    },
    function (callback) {
      builder.getContentFromAsciiDocRepo('customers.csv', builder.examplesBuildDir + '/customers.csv', callback);
    }
  ], function () {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.compile = function (callback) {
  var opalCompiler = new OpalCompiler({dynamicRequireLevel: 'ignore', defaultPaths: ['build/asciidoctor/lib']});

  bfs.mkdirsSync('build');

  log.task('compile core lib');
  opalCompiler.compile('asciidoctor', 'build/asciidoctor-lib.js');

  log.task('copy resources');
  log.debug('copy asciidoctor.css');
  var asciidoctorPath = 'build/asciidoctor';
  var asciidoctorCSSFile = asciidoctorPath + '/data/stylesheets/asciidoctor-default.css';
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
  var path = 'build/asciidoctor-lib.js';
  var data = fs.readFileSync(path, 'utf8');
  log.debug('Replace (g)sub! with (g)sub');
  data = data.replace(/\$send\(([^,]+), '(g?sub)!'/g, '$1 = $send\($1, \'$2\'');
  fs.writeFileSync(path, data, 'utf8');
  callback();
};

Builder.prototype.replaceDefaultStylesheetPath = function (callback) {
  log.task('Replace default stylesheet path');
  var path = 'build/asciidoctor-lib.js';
  var data = fs.readFileSync(path, 'utf8');
  log.debug('Replace primary_stylesheet_data method');
  var primaryStylesheetDataImpl = 'var stylesheetsPath;\n' +
    'if (Opal.const_get_relative([], "JAVASCRIPT_PLATFORM")["$=="]("node")) {\n' +
    '  stylesheetsPath = Opal.const_get_relative([], "File").$join(__dirname, "css");\n' +
    '} else {\n' +
    '  stylesheetsPath = "css";\n' +
    '}\n' +
    'return ((($a = self.primary_stylesheet_data) !== false && $a !== nil && $a != null) ? $a : self.primary_stylesheet_data = Opal.const_get_relative([], "IO").$read(Opal.const_get_relative([], "File").$join(stylesheetsPath, "asciidoctor.css")).$chomp());';
  data = data.replace(/(function \$\$primary_stylesheet_data\(\)\ {\n)(?:[^}]*)(\n\s+}.*)/g, '$1' + primaryStylesheetDataImpl + '$2');
  fs.writeFileSync(path, data, 'utf8');
  callback();
};

Builder.prototype.benchmark = function (runner, callback) {
  var builder = this;

  async.series([
    function (callback) { builder.build(callback); },
    function (callback) {
      bfs.mkdirsSync(builder.benchmarkBuildDir);
      bfs.copyToDirSync('benchmark/run.js', builder.benchmarkBuildDir);
      callback();
    },
    function (callback) {
      log.task('download sample data from AsciiDoc repository');
      callback();
    },
    function (callback) { builder.getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc', callback); },
    function (callback) { builder.getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv', callback); },
    function () {
      log.task('run benchmark');
      builder.execSync(runner + ' ' + builder.benchmarkBuildDir + '/run.js');
    }
  ], function () {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.nashornCheckConvert = function (result, testName) {
  if (result.indexOf('<h1>asciidoctor.js, AsciiDoc in JavaScript</h1>') == -1) {
    log.error(testName + ' failed, AsciiDoc source is not converted');
    process.stdout.write(result);
  }
  if (result.indexOf('include content') == -1) {
    log.error(testName + ' failed, include directive is not processed');
    process.stdout.write(result);
  }
};

Builder.prototype.nashornJJSRun = function (specName, jjsBin) {
  log.debug('running ' + specName);
  var start = process.hrtime();
  var result = child_process.execSync(jjsBin + ' ' + specName).toString('utf8');
  log.debug('running ' + specName + ' in ' + process.hrtime(start)[0] + 's');
  return result;
};

Builder.prototype.nashornJavaCompileAndRun = function (specName, className, javacBin, javaBin) {
  // Compile
  log.debug('compiling ' + specName + ' to build/');
  child_process.execSync(javacBin + ' ./' + specName + ' -d ./build');

  // Run
  log.debug('running ' + className);
  var start = process.hrtime();
  var result = child_process.execSync(javaBin + ' -classpath ./build ' + className).toString('utf8');
  log.debug('running ' + className + ' in ' + process.hrtime(start)[0] + 's');
  return result;
};

Builder.prototype.nashornRun = function (name, jdkInstallDir) {
  log.task('run against ' + name);

  var start = process.hrtime();
  if (isWin()) {
    jdkInstallDir = jdkInstallDir.replace(/\\\//, '\\\\').replace(/\//, '\\\\');
  }
  var jdkBinDir = jdkInstallDir + path.sep + 'bin';
  var jjsBin = jdkBinDir + path.sep + 'jjs';
  var javacBin = jdkBinDir + path.sep + 'javac';
  var javaBin = jdkBinDir + path.sep + 'java';
  if (isWin()) {
    jjsBin = jjsBin + '.exe';
    javacBin = javacBin + '.exe';
    javaBin = javaBin + '.exe';
  }

  // jjs scripts
  var basicSpec = 'spec/share/basic.js';
  var asciidoctorSpec = 'spec/share/asciidoctor-convert.js';

  // Nashorn classes
  var basicNashornClassName = 'BasicJavascriptWithNashorn';
  var basicNashornSpec = 'spec/nashorn/' + basicNashornClassName + '.java';
  var asciidoctorNashornClassName = 'AsciidoctorConvertWithNashorn';
  var asciidoctorNashornSpec = 'spec/nashorn/' + asciidoctorNashornClassName + '.java';

  log.info('run Nashorn jjs');
  this.nashornJJSRun(basicSpec, jjsBin);
  var jjsResult = this.nashornJJSRun(asciidoctorSpec, jjsBin);
  this.nashornCheckConvert(jjsResult, 'run with ' + name + ' jjs');

  log.info('run Nashorn java');
  this.nashornJavaCompileAndRun(basicNashornSpec, basicNashornClassName, javacBin, javaBin);
  var javaResult = this.nashornJavaCompileAndRun(asciidoctorNashornSpec, asciidoctorNashornClassName, javacBin, javaBin);
  this.nashornCheckConvert(javaResult, 'run with ' + name + ' java');
  log.success('Done ' + name + ' in ' + process.hrtime(start)[0] + 's');
};

Builder.prototype.jdk8EA = function (callback) {
  var builder = this;
  async.series([
    function (callback) { jdk.installJDK8EA('build/jdk8', callback); },
    function (callback) {
      builder.nashornRun('jdk1.8.0-ea', 'build/jdk8');
      callback();
    }
  ], function () {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.jdk9EA = function (callback) {
  var builder = this;
  async.series([
    function (callback) { jdk.installJDK9EA('build/jdk9', callback); },
    function (callback) {
      builder.nashornRun('jdk1.9.0-ea', 'build/jdk9');
      callback();
    }
  ], function () {
    typeof callback === 'function' && callback();
  });
};
