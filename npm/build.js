module.exports = Build;

var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var concat = require('./concat.js');
var Uglify = require('./uglify.js');
var Log = require('./log.js');
var log = new Log();
var uglify = new Uglify();

var stdout;

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var deleteFolderRecursive = function(path) {
  var files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function(file,index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

var walk = function(currentDirPath, callback) {
  fs.readdirSync(currentDirPath).forEach(function(name) {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
    if (stat.isFile()) {
      callback(filePath, stat);
    } else if (stat.isDirectory()) {
      walk(filePath, callback);
    }
  });
};

var javaVersionText = function() {
  var result = child_process.execSync('java -version 2>&1', {encoding: 'utf8'});
  var firstLine = result.split('\n')[0];
  var javaVersion = firstLine.match(/"(.*?)"/i)[1];
  return javaVersion.replace(/\./g, '').replace(/_/g, '');
}

function Build() {
  this.npmCoreFiles = [
    'src/npm/prepend-core.js',
    'build/asciidoctor-core.js'
  ];
}

Build.prototype.dist = function(callback) {
  if (process.env.DRY_RUN) {
    log.debug('dist');
    callback();
    return;
  }
  var build = this;
  var start = process.hrtime();

  // Step 1: clean
  build.clean();

  // Step 2: build
  build.buildRuby();

  // Step 3: concat
  build.concatJavaScripts();

  async.series([
    function(callback) {
      build.copyToDist(callback); // Step 4: Copy to dist
    },
    function(callback) {
      build.uglify(callback); // Step 5: Uglify (optional)
    }
  ], function() {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
    typeof callback === 'function' && callback();
  });
}

Build.prototype.clean = function() {
  log.title('clean');
  this.deleteBuildFolder(); // delete build folder
  this.deleteDistFolder(); // delete dist folder
}

Build.prototype.buildRuby = function() {
  log.title('build');
  this.execSync('bundle install');
  this.execSync('bundle exec rake dist');
}

Build.prototype.concatJavaScripts = function() {
  log.title('concat');
  this.concatCore();
  this.concatCoreMin();
  this.concatNpmExtensions();
  this.concatNpmDocbook();
  this.concatBowerCoreExtensions();
  this.concatBowerDocbook();
  this.concatBowerAll();
  this.concatBowerCore(); // must be the last because we're using 'build/asciidoctor-core.js' in other concat tasks
}

Build.prototype.release = function(releaseVersion) {
  var build = this;
  var start = process.hrtime();

  async.series([
    function(callback) { build.prepareRelease(releaseVersion, callback); },
    function(callback) { build.dist(callback); },
    function(callback) { build.runTest(callback); },
    function(callback) { build.commit(releaseVersion, callback); },
    function(callback) { build.publish(callback); },
    function(callback) { build.completeRelease(releaseVersion, callback); }
  ], function() {
    log.success('Done in ' + process.hrtime(start)[0] + 's');
  });
}

Build.prototype.prepareRelease = function(releaseVersion, callback) {
  log.title('Release version: ' + releaseVersion);

  if (process.env.DRY_RUN) {
    log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable');
  }

  this.replaceFileSync('package.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');
  this.replaceFileSync('bower.json', /"version": "(.*?)"/g, '"version": "' + releaseVersion + '"');
  callback();
}

Build.prototype.commit = function(releaseVersion, callback) {
  this.execSync('git add -A .');
  this.execSync('git commit -m "Prepare version ' + releaseVersion + '"');
  this.execSync('git tag v' + releaseVersion);
  callback();
}

Build.prototype.runTest = function(callback) {
  this.execSync('npm run test');
  callback();
}

Build.prototype.publish = function(callback) {
  if (process.env.SKIP_PUBLISH) {
    log.info('SKIP_PUBLISH environment variable is defined, skipping "publish" task');
    callback();
    return;
  } 
  this.execSync('npm publish');
  callback();
}

Build.prototype.completeRelease = function(releaseVersion, callback) {
  console.log('');
  log.info('To complete the release, you need to:');
  log.info("[ ] push changes upstream: 'git push origin master && git push origin v" + releaseVersion + "'");
  log.info("[ ] publish a release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/new");
  log.info('[ ] create an issue here: https://github.com/webjars/asciidoctor.js to update Webjars');
  callback();
}

Build.prototype.concat = function(message, files, destination) {
  log.debug(message);
  concat(files, destination);
}

Build.prototype.concatCore = function() {
  this.concat('npm core', this.npmCoreFiles.concat(['src/npm/append-core.js']), 'build/npm/asciidoctor-core.js');
}

Build.prototype.concatCoreMin = function() {
  this.concat('npm core.min', this.npmCoreFiles.concat(['src/npm/append-core-min.js']), 'build/npm/asciidoctor-core-min.js');
}

Build.prototype.concatNpmExtensions = function() {
  var files = [
    'src/npm/prepend-extensions.js',
    'build/asciidoctor-extensions.js',
    'src/append-require-extensions.js',
    'src/npm/append-extensions.js'
  ];
  this.concat('npm extensions', files, 'build/npm/asciidoctor-extensions.js');
}

Build.prototype.concatNpmDocbook = function() {
  var files = [
    'src/npm/prepend-extensions.js',
    'build/asciidoctor-docbook45.js',
    'build/asciidoctor-docbook5.js',
    'src/append-require-docbook.js',
    'src/npm/append-extensions.js'
  ];
  this.concat('npm docbook', files, 'build/npm/asciidoctor-docbook.js');
}

Build.prototype.concatBowerCoreExtensions = function() {
  var files = [
    'build/asciidoctor-core.js',
    'build/asciidoctor-extensions.js',
    'src/append-require-core.js',
    'src/append-require-extensions.js'
  ];
  this.concat('Bower core + extensions', files, 'build/asciidoctor.js');
}

Build.prototype.concatBowerDocbook = function() {
  var files = [
    'build/asciidoctor-docbook45.js',
    'build/asciidoctor-docbook5.js',
    'src/append-require-docbook.js'
  ];
  this.concat('Bower docbook', files, 'build/asciidoctor-docbook.js');
}

Build.prototype.concatBowerAll = function() {
  var files = [
    'bower_components/opal/opal/current/opal.js',
    'build/asciidoctor-core.js',
    'build/asciidoctor-extensions.js',
    'src/append-require-core.js',
    'src/append-require-extensions.js'
  ];
  this.concat('Bower all', files, 'build/asciidoctor-all.js');
}

Build.prototype.concatBowerCore = function() {
  var files = [
    'build/asciidoctor-core.js',
    'src/append-require-core.js'
  ];
  this.concat('Bower core', files, 'build/asciidoctor-core.js');
}

Build.prototype.deleteBuildFolder = function() {
  log.debug('delete build directory');
  deleteFolderRecursive('build');
  fs.mkdirSync('build');
  fs.mkdirSync('build/npm');
}

Build.prototype.deleteDistFolder = function() {
  log.debug('delete dist directory');
  deleteFolderRecursive('dist');
  fs.mkdirSync('dist');
  fs.mkdirSync('dist/css');
  fs.mkdirSync('dist/npm');
}

Build.prototype.replaceFileSync = function(file, regexp, newSubString) {
  log.debug('update ' + file);
  if (!process.env.DRY_RUN) {
    var data = fs.readFileSync(file, 'utf8');
    var dataUpdated = data.replace(regexp, newSubString);
    fs.writeFileSync(file, dataUpdated, 'utf8');
  }
}

Build.prototype.execSync = function(command) {
  log.debug(command);
  if (!process.env.DRY_RUN) {
    stdout = child_process.execSync(command);
    process.stdout.write(stdout);
  }
}

Build.prototype.uglify = function(callback) {
  // Preconditions
  // - MINIFY environment variable is defined
  if (!process.env.MINIFY) {
    log.info('MINIFY environment variable is not defined, skipping "minify" task');
    callback();
    return;
  }
  // - Java7 or higher is available in PATH
  try {
    if (javaVersionText() < '170') {
      log.warn('Closure Compiler requires Java7 or higher, skipping "minify" task');
      callback();
      return;
    }
  } catch (e) {
    log.warn('\'java\' binary is not available in PATH, skipping "minify" task');
    callback();
    return;
  }
  log.title('uglify');
  var files = [
    {source: 'build/npm/asciidoctor-core-min.js', destination: 'dist/npm/asciidoctor-core.min.js' },
    {source: 'build/npm/asciidoctor-extensions.js', destination: 'dist/npm/asciidoctor-extensions.min.js' },
    {source: 'build/npm/asciidoctor-docbook.js', destination: 'dist/npm/asciidoctor-docbook.min.js' },
    {source: 'build/asciidoctor-core.js', destination: 'dist/asciidoctor-core.min.js' },
    {source: 'build/asciidoctor-extensions.js', destination: 'dist/asciidoctor-extensions.min.js' },
    {source: 'build/asciidoctor-docbook.js', destination: 'dist/asciidoctor-docbook.min.js' },
    {source: 'build/asciidoctor-all.js', destination: 'dist/asciidoctor-all.min.js' }
  ];

  var functions = [];

  var tasks = [];
  files.forEach(function(file) {
    var source = file.source;
    var destination = file.destination;
    log.transform('minify', source, destination);
    tasks.push(function(callback) { uglify.minify(source, destination, callback) });
  });
  async.parallelLimit(tasks, 4, callback);
}

Build.prototype.copyToDist = function(callback) {
  log.title('copy to dist/')
  fs.createReadStream('build/asciidoctor.css').pipe(fs.createWriteStream('dist/css/asciidoctor.css'));
  walk('build', function(filePath, stat) {
    if (filePath.endsWith(".js") 
         && !filePath.endsWith("-min.js") 
         && !filePath.endsWith(".min.js") 
         && !filePath.endsWith('-docbook45.js') 
         && !filePath.endsWith('-docbook5.js')) {
      var basename = path.basename(filePath);
      var paths = path.dirname(filePath).split(path.sep);
      // remove 'build' base directory
      paths.shift();
      // add 'dist' base directory
      paths.unshift('dist');
      paths.push(basename);
      var destination = paths.join(path.sep);
      log.transform('copy', filePath, destination);
      fs.createReadStream(filePath).pipe(fs.createWriteStream(destination));
    }
  });
  callback();
}
