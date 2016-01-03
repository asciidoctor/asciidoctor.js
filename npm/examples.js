var child_process = require('child_process');
var Log = require('./log.js');
var Build = require('./build.js');
var build = new Build();
var log = new Log();

var stdout;

log.title('examples');
// Step 1: rake
log.debug('bundle exec rake examples');
stdout = child_process.execSync('bundle exec rake examples');
process.stdout.write(stdout);

// Step2: concat core
build.concatCore();

// Step3: success!
log.success('You can now open the file build/asciidoctor_example.html');
