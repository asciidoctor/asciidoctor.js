var child_process = require('child_process');
var Log = require('./log.js');
var Builder = require('./builder.js');
var builder = new Builder();
var log = new Log();

var stdout;

log.title('examples');
// Step 1: rake
log.debug('bundle exec rake examples');
stdout = child_process.execSync('bundle exec rake examples');
process.stdout.write(stdout);

// Step2: concat asciidoctor-core.js
builder.concatBowerCore();

// Step3: success!
log.success('You can now open build/examples/asciidoctor_example.html and build/examples/userguide_test.html');
