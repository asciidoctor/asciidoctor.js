var fs = require('fs');
var log = require('bestikk-log');

log.task('Check unsupported features');
var data = fs.readFileSync('build/asciidoctor-core.js', 'utf8');
var mutableStringPattern = /\['\$(g)?sub!'\]/;
if (mutableStringPattern.test(data)) {
  log.error("Mutable String methods are not supported in Opal, please replace sub! and gsub! methods");
  process.exit(1);
}
