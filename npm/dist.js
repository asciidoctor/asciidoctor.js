var async = require('async');
var Log = require('./log.js');
var Build = require('./build.js');
var build = new Build();
var log = new Log();

var start = process.hrtime();

// Step 1: clean
log.title('clean');
build.deleteBuildFolder(); // delete build folder
build.deleteDistFolder(); // delete dist folder

// Step 2: build
log.title('build');
build.execSync('bundle install');
build.execSync('bundle exec rake dist');

// Step 3: concat
log.title('concat');
build.concatCore();
build.concatCoreMin();
build.concatNpmExtensions();
build.concatNpmDocbook();
build.concatBowerCoreExtensions();
build.concatBowerDocbook();
build.concatBowerAll();
build.concatBowerCore(); // must be the last because we're using 'build/asciidoctor-core.js' in other concat tasks

async.series([
  function(callback) {
    // Step 4: Copy to dist
    build.copyToDist(callback);
  },
  function(callback) {
    // Step 5: Uglify (optional)
    build.uglify(callback);
  },
  function(callback) {
    // Step 6: Gzip
    build.gzip(callback);
  }
], function() {
  log.success('Done in ' + process.hrtime(start)[0] + 's');
});
