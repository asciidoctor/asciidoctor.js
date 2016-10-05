module.exports = Builder;

var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var https = require('https');
var http = require('http');
var os = require('os');
var OpalCompiler = require('./opal-compiler.js');
var log = require('bestikk-log');
var jdk = require('bestikk-jdk-ea');
var bfs = require('bestikk-fs');

var stdout;

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var isWin = function() {
  return /^win/.test(process.platform);
};

function Builder() {
  this.npmCoreFiles = [
    'src/npm/prepend-core.js',
    'build/asciidoctor-core.js'
  ];
  this.asciidoctorCoreVersion = '1.5.4';
  this.asciidoctorLatexVersion = '0.2';
  this.htmlEntitiesVersion = '4.3.3';
  this.benchmarkBuildDir = 'build' + path.sep + 'benchmark';
  this.examplesBuildDir = 'build' + path.sep + 'examples';
  this.examplesImagesBuildDir = this.examplesBuildDir + path.sep + 'images';
  var asciidocRepoURI = 'https://raw.githubusercontent.com/asciidoc/asciidoc';
  var asciidocRepoHash = 'd43faae38c4a8bf366dcba545971da99f2b2d625';
  this.asciidocRepoBaseURI = asciidocRepoURI + '/' + asciidocRepoHash;
}

Builder.prototype.build = function(callback) {
  if (process.env.DRY_RUN) {
    log.debug('build');
    callback();
    return;
  }
  var builder = this;
  var start = process.hrtime();

  async.series([
    function(callback) { builder.clean(callback); }, // clean
    function(callback) { builder.downloadDependencies(callback); }, // download dependencies
    function(callback) { builder.compile(callback); }, // compile
    function(callback) { builder.replaceUnsupportedFeatures(callback); }, // replace unsupported features
    function(callback) { builder.concatJavaScripts(callback); }, // concat
    function(callback) { builder.uglify(callback); } // uglify (optional)
  ], function() {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.clean = function(callback) {
  log.task('clean');
  this.removeBuildDirSync(); // remove build directory
  callback();
};

Builder.prototype.downloadDependencies = function(callback) {
  log.task('download dependencies');

  var builder = this;
  async.series([
    function(callback) { builder.getContentFromURL('https://codeload.github.com/asciidoctor/asciidoctor/tar.gz/v' + builder.asciidoctorCoreVersion, 'build/asciidoctor.tar.gz', callback); },
    function(callback) { builder.getContentFromURL('https://codeload.github.com/asciidoctor/asciidoctor-latex/tar.gz/' + builder.asciidoctorLatexVersion, 'build/asciidoctor-latex.tar.gz', callback); },
    function(callback) { builder.getContentFromURL('https://codeload.github.com/threedaymonk/htmlentities/tar.gz/v' + builder.htmlEntitiesVersion, 'build/htmlentities.tar.gz', callback); },
    function(callback) { bfs.untar('build/asciidoctor.tar.gz', 'asciidoctor', 'build', callback); },
    function(callback) { bfs.untar('build/asciidoctor-latex.tar.gz', 'asciidoctor-latex', 'build', callback); },
    function(callback) { bfs.untar('build/htmlentities.tar.gz', 'htmlentities', 'build', callback); }
  ], function() {
    typeof callback === 'function' && callback();
  });
}

Builder.prototype.concatJavaScripts = function(callback) {
  log.task('concat');
  this.concatCore();
  this.concatCoreMin();
  this.concatNpmExtensions();
  this.concatNpmDocbook();
  this.concatBowerCoreExtensions();
  this.concatBowerDocbook();
  this.concatBowerAll();
  callback();
};

Builder.prototype.release = function(releaseVersion) {
  var builder = this;
  var start = process.hrtime();

  async.series([
    function(callback) { builder.prepareRelease(releaseVersion, callback); },
    function(callback) { builder.build(callback); },
    function(callback) { builder.runTest(callback); },
    function(callback) { builder.copyToDist(callback); },
    function(callback) { builder.commit(releaseVersion, callback); },
    function(callback) { builder.publish(callback); },
    function(callback) { builder.prepareNextIteration(callback); },
    function(callback) { builder.completeRelease(releaseVersion, callback); }
  ], function() {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
  });
};

Builder.prototype.prepareRelease = function(releaseVersion, callback) {
  log.task('Release version: ' + releaseVersion);

  if (process.env.DRY_RUN) {
    log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable');
  } else {
    bfs.updateFileSync('package.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');
    bfs.updateFileSync('bower.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');
  }
  callback();
};

Builder.prototype.commit = function(releaseVersion, callback) {
  this.execSync('git add -A .');
  this.execSync('git commit -m "Release ' + releaseVersion + '"');
  this.execSync('git tag v' + releaseVersion);
  callback();
};

Builder.prototype.prepareNextIteration = function(callback) {
  this.removeDistDirSync();
  this.execSync('git add -A .');
  this.execSync('git commit -m "Prepare for next development iteration"');
  callback();
};

Builder.prototype.runTest = function(callback) {
  this.execSync('npm run test');
  callback();
};

Builder.prototype.publish = function(callback) {
  if (process.env.SKIP_PUBLISH) {
    log.info('SKIP_PUBLISH environment variable is defined, skipping "publish" task');
    callback();
    return;
  }
  this.execSync('npm publish');
  callback();
};

Builder.prototype.completeRelease = function(releaseVersion, callback) {
  console.log('');
  log.info('To complete the release, you need to:');
  log.info("[ ] push changes upstream: 'git push origin master && git push origin v" + releaseVersion + "'");
  log.info("[ ] publish a release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/new");
  log.info('[ ] create an issue here: https://github.com/webjars/asciidoctor.js to update Webjars');
  callback();
};

Builder.prototype.concat = function(message, files, destination) {
  log.debug(message);
  bfs.concatSync(files, destination);
};

Builder.prototype.concatCore = function() {
  this.concat('npm core', this.npmCoreFiles.concat(['src/asciidoctor-core-api.js', 'src/npm/append-core.js']), 'build/npm/asciidoctor-core.js');
};

Builder.prototype.concatCoreMin = function() {
  this.concat('npm core.min', this.npmCoreFiles.concat(['src/asciidoctor-core-api.js', 'src/npm/append-core-min.js']), 'build/npm/asciidoctor-core-min.js');
};

Builder.prototype.concatNpmExtensions = function() {
  var files = [
    'src/npm/prepend-extensions.js',
    'build/asciidoctor-extensions.js',
    'src/asciidoctor-extensions-api.js',
    'src/npm/append-extensions.js'
  ];
  this.concat('npm extensions', files, 'build/npm/asciidoctor-extensions.js');
};

Builder.prototype.concatNpmDocbook = function() {
  var files = [
    'src/npm/prepend-extensions.js',
    'build/asciidoctor-docbook45.js',
    'build/asciidoctor-docbook5.js',
    'src/npm/append-extensions.js'
  ];
  this.concat('npm docbook', files, 'build/npm/asciidoctor-docbook.js');
};

Builder.prototype.concatBowerCoreExtensions = function() {
  var files = [
    'build/asciidoctor-core.js',
    'build/asciidoctor-extensions.js',
    'src/asciidoctor-core-api.js'
  ];
  this.concat('Bower core + extensions', files, 'build/asciidoctor.js');
};

Builder.prototype.concatBowerDocbook = function() {
  var files = [
    'build/asciidoctor-docbook45.js',
    'build/asciidoctor-docbook5.js'
  ];
  this.concat('Bower docbook', files, 'build/asciidoctor-docbook.js');
};

Builder.prototype.concatBowerAll = function() {
  var files = [
    'node_modules/opal-runtime/src/opal.js',
    'build/asciidoctor-core.js',
    'build/asciidoctor-extensions.js',
    'src/asciidoctor-core-api.js',
    'src/asciidoctor-extensions-api.js'
  ];
  this.concat('Bower all', files, 'build/asciidoctor-all.js');
};

Builder.prototype.removeBuildDirSync = function() {
  log.debug('remove build directory');
  bfs.removeSync('build');
  bfs.mkdirsSync('build/npm');
};

Builder.prototype.removeDistDirSync = function() {
  log.debug('remove dist directory');
  bfs.removeSync('dist');
  bfs.mkdirsSync('dist/css');
  bfs.mkdirsSync('dist/npm');
};

Builder.prototype.execSync = function(command) {
  log.debug(command);
  if (!process.env.DRY_RUN) {
    stdout = child_process.execSync(command);
    process.stdout.write(stdout);
  }
};

Builder.prototype.uglify = function(callback) {
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
    {source: 'build/npm/asciidoctor-core-min.js', destination: 'build/npm/asciidoctor-core.min.js' },
    {source: 'build/npm/asciidoctor-extensions.js', destination: 'build/npm/asciidoctor-extensions.min.js' },
    {source: 'build/npm/asciidoctor-docbook.js', destination: 'build/npm/asciidoctor-docbook.min.js' },
    {source: 'build/asciidoctor-core.js', destination: 'build/asciidoctor-core.min.js' },
    {source: 'build/asciidoctor-extensions.js', destination: 'build/asciidoctor-extensions.min.js' },
    {source: 'build/asciidoctor-docbook.js', destination: 'build/asciidoctor-docbook.min.js' },
    {source: 'build/asciidoctor-all.js', destination: 'build/asciidoctor-all.min.js' }
  ];

  var tasks = [];
  files.forEach(function(file) {
    var source = file.source;
    var destination = file.destination;
    log.transform('minify', source, destination);
    tasks.push(function(callback) { uglify.minify(source, destination, callback) });
  });
  async.parallelLimit(tasks, 4, callback);
};

Builder.prototype.copyToDist = function(callback) {
  var builder = this;

  log.task('copy to dist/');
  bfs.removeDistDirSync('dist');
  bfs.copySync('build/asciidoctor.css', 'dist/css/asciidoctor.css');
  bfs.walk('build', function(filePath) {
    var basename = path.basename(filePath);
    var paths = path.dirname(filePath).split(path.sep);
    if (filePath.endsWith('.js')
         && paths.indexOf('examples') == -1
         && paths.indexOf('benchmark') == -1
         && paths.indexOf('asciidoctor-latex') == -1
         && paths.indexOf('htmlentities') == -1
         && paths.indexOf('asciidoctor') == -1
         && filePath.indexOf('spec') == -1
         && !filePath.endsWith('-min.js')
         && !filePath.endsWith('-docbook45.js')
         && !filePath.endsWith('-docbook5.js')) {
      // remove 'build' base directory
      paths.shift();
      // add 'dist' base directory
      paths.unshift('dist');
      paths.push(basename);
      var destination = paths.join(path.sep);
      bfs.copySync(filePath, destination);
    }
  });
  typeof callback === 'function' && callback();
};

Builder.prototype.copyToExamplesBuildDir = function(file) {
  bfs.copyToDirSync(file, this.examplesBuildDir);
};

Builder.prototype.copyToExamplesImagesBuildDir = function(file) {
  bfs.copyToDirSync(file, this.examplesImagesBuildDir);
};

Builder.prototype.examples = function(callback) {
  var builder = this;

  async.series([
    function(callback) {
      builder.build(callback); // Step 1: Build
    },
    function(callback) {
      builder.compileExamples(callback); // Step 2: Compile examples
    },
    function(callback) {
      builder.copyExamplesResources(callback); // Step 3: Copy examples resources
    }
  ], function() {
    log.success('You can now open build/examples/asciidoctor_example.html and build/examples/userguide_test.html');
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.compileExamples = function(callback) {
  log.task('compile examples');
  bfs.mkdirsSync(this.examplesBuildDir);
  var opalCompiler = new OpalCompiler();
  opalCompiler.compile('examples/asciidoctor_example.rb', this.examplesBuildDir + '/asciidoctor_example.js');
  opalCompiler.compile('examples/userguide_test.rb', this.examplesBuildDir + '/userguide_test.js');
  callback();
};

Builder.prototype.getContentFromAsciiDocRepo = function(source, target, callback) {
  this.getContentFromURL(this.asciidocRepoBaseURI + '/doc/' + source, target, callback);
};

Builder.prototype.getContentFromURL = function(source, target, callback) {
  log.transform('get', source, target);
  var targetStream = fs.createWriteStream(target);
  var downloadModule;
  // startWith alternative
  if (source.lastIndexOf('https', 0) === 0) {
    downloadModule = https;
  } else {
    downloadModule = http;
  }
  downloadModule.get(source, function(response) {
    response.pipe(targetStream);
    targetStream.on('finish', function () {
      targetStream.close(callback);
    });
  });
};

Builder.prototype.copyExamplesResources = function(callback) {
  var builder = this;

  log.task('copy resources to ' + this.examplesBuildDir + '/');
  this.copyToExamplesBuildDir('examples/asciidoctor_example.html');
  this.copyToExamplesBuildDir('examples/userguide_test.html');
  this.copyToExamplesBuildDir('examples/asciidoctor.css');
  this.copyToExamplesBuildDir('README.adoc');

  log.task('download sample data from AsciiDoc repository');
  async.series([
    function(callback) {
      builder.getContentFromAsciiDocRepo('asciidoc.txt', builder.examplesBuildDir + '/userguide.adoc', callback);
    },
    function(callback) {
      builder.getContentFromAsciiDocRepo('customers.csv', builder.examplesBuildDir + '/customers.csv', callback);
    }
  ], function() {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.compile = function(callback) {
  var builder = this;

  var opalCompiler = new OpalCompiler({dynamicRequireLevel: 'ignore'});

  var opalCompileExtensions = function(names) {
    names.forEach(opalCompileExtension);
  };

  var opalCompileExtension = function(name) {
    opalCompiler.compile(name, 'build/asciidoctor-' + name + '.js', ['extensions-lab/lib']);
  };

  bfs.mkdirsSync('build');

  log.task('compile latex');
  opalCompiler.compile('asciidoctor-latex', 'build/asciidoctor-latex.js', ['build/asciidoctor-latex/lib', 'build/htmlentities/lib']);

  log.task('compile core lib');
  opalCompiler.compile('asciidoctor/converter/docbook5', 'build/asciidoctor-docbook5.js');
  opalCompiler.compile('asciidoctor/converter/docbook45', 'build/asciidoctor-docbook45.js');
  opalCompiler.compile('asciidoctor/extensions', 'build/asciidoctor-extensions.js');
  opalCompiler.compile('asciidoctor', 'build/asciidoctor-core.js');

  log.task('compile extensions-lab lib');
  if (fs.existsSync('extensions-lab/lib')) {
    opalCompileExtensions(['chrome-inline-macro', 'man-inline-macro', 'emoji-inline-macro', 'chart-block-macro']);
  } else {
    log.error("Unable to cross-compile extensions because git submodule 'extensions-lab' is not initialized.");
    log.info("To initialize the submodule use the following command `git submodule init` and `git submodule update`.");
    process.exit(9);
  }

  log.task('copy resources');
  log.debug('copy asciidoctor.css');
  var asciidoctorPath = 'build/asciidoctor';
  var asciidoctorCSSFile = asciidoctorPath + '/data/stylesheets/asciidoctor-default.css';
  fs.createReadStream(asciidoctorCSSFile).pipe(fs.createWriteStream('build/asciidoctor.css'));
  callback();
};

Builder.prototype.replaceUnsupportedFeatures = function(callback) {
  log.task('Replace unsupported features');
  var path = 'build/asciidoctor-core.js';
  var data = fs.readFileSync(path, 'utf8');
  log.debug('Replace (g)sub! with (g)sub');
  data = data.replace(/(\(\$\w+ = \(\$\w+ = (\w+)\))\['(\$g?sub)!'\]/g, "$2 = $1['$3']");
  fs.writeFileSync(path, data, 'utf8');
  callback();
};

Builder.prototype.benchmark = function(runner, callback) {
  var builder = this;

  async.series([
    function(callback) { builder.build(callback); },
    function(callback) {
      bfs.mkdirsSync(builder.benchmarkBuildDir);
      bfs.copyToDirSync('benchmark/run.js', builder.benchmarkBuildDir);
      callback();
    },
    function(callback) {
      log.task('download sample data from AsciiDoc repository');
      callback();
    },
    function(callback) { builder.getContentFromAsciiDocRepo('asciidoc.txt', 'build/benchmark/userguide.adoc', callback); },
    function(callback) { builder.getContentFromAsciiDocRepo('customers.csv', 'build/benchmark/customers.csv', callback); },
    function() {
      log.task('run benchmark');
      builder.execSync(runner + ' ' + builder.benchmarkBuildDir + '/run.js');
    }
  ], function() {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.nashornCheckConvert = function(result, testName) {
  if (result.indexOf('<h1>asciidoctor.js, AsciiDoc in JavaScript</h1>') == -1) {
    log.error(testName + ' failed, AsciiDoc source is not converted');
    process.stdout.write(result);
  }
  if (result.indexOf('include content') == -1) {
    log.error(testName + ' failed, include directive is not processed');
    process.stdout.write(result);
  }
};

Builder.prototype.nashornJJSRun = function(specName, jjsBin) {
  log.debug('running ' + specName);
  var start = process.hrtime();
  var result = child_process.execSync(jjsBin + ' ' + specName).toString('utf8');
  log.debug('running ' + specName + ' in ' + process.hrtime(start)[0] + 's');
  return result;
};

Builder.prototype.nashornJavaCompileAndRun = function(specName, className, javacBin, javaBin) {
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

Builder.prototype.nashornRun = function(name, jdkInstallDir) {
  log.task('run against ' + name);

  var start = process.hrtime();
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
  var jjsResult =  this.nashornJJSRun(asciidoctorSpec, jjsBin);
  this.nashornCheckConvert(jjsResult, 'run with ' + name + ' jjs');

  log.info('run Nashorn java');
  this.nashornJavaCompileAndRun(basicNashornSpec, basicNashornClassName, javacBin, javaBin);
  var javaResult = this.nashornJavaCompileAndRun(asciidoctorNashornSpec, asciidoctorNashornClassName, javacBin, javaBin);
  this.nashornCheckConvert(javaResult, 'run with ' + name + ' java');
  log.success('Done ' + name + ' in ' + process.hrtime(start)[0] + 's');
};

Builder.prototype.jdk8EA = function(callback) {
  var builder = this;
  async.series([
    function(callback) {
      jdk.installJDK8EA('build/jdk8', callback);
    },
    function(callback) {
      builder.nashornRun('jdk1.8.0-ea', 'build/jdk8');
      callback();
    }
  ], function() {
    typeof callback === 'function' && callback();
  });
};

Builder.prototype.jdk9EA = function(callback) {
  var builder = this;
  async.series([
    function(callback) {
      jdk.installJDK9EA('build/jdk9', callback);
    },
    function(callback) {
      builder.nashornRun('jdk1.9.0-ea', 'build/jdk9');
      callback();
    }
  ], function() {
    typeof callback === 'function' && callback();
  });
};
