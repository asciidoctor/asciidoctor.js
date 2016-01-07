var child_process = require('child_process');
var fs = require('fs');
var https = require('https');

var Log = require('./log.js');
var Build = require('./build.js');
var build = new Build();
var log = new Log();

var examplesBuildDir = 'build/examples';
if (!fs.existsSync(examplesBuildDir)) {
  fs.mkdirSync(examplesBuildDir);
}

log.title('compile examples');
stdout = child_process.execSync('opal --compile examples/asciidoctor_example.rb --dynamic-require warning --no-opal > ' + examplesBuildDir + '/asciidoctor_example.js');
process.stdout.write(stdout);

stdout = child_process.execSync('opal --compile examples/userguide_test.rb --dynamic-require warning --no-opal > ' + examplesBuildDir + '/userguide_test.js');
process.stdout.write(stdout);

log.title('copy resources to ' + examplesBuildDir + '/');
fs.createReadStream('examples/asciidoctor_example.html').pipe(fs.createWriteStream(examplesBuildDir + '/asciidoctor_example.html'));
fs.createReadStream('examples/userguide_test.html').pipe(fs.createWriteStream(examplesBuildDir + '/userguide_test.html'));
fs.createReadStream('README.adoc').pipe(fs.createWriteStream(examplesBuildDir + '/README.adoc'));
fs.createReadStream('examples/asciidoctor.css').pipe(fs.createWriteStream(examplesBuildDir + '/asciidoctor.css'));

if (!fs.existsSync(examplesBuildDir + '/images')) {
  fs.mkdirSync(examplesBuildDir + '/images');
}

fs.createReadStream('error-in-chrome-console.png').pipe(fs.createWriteStream(examplesBuildDir + '/images/error-in-chrome-console.png'));
fs.createReadStream('error-in-javascript-debugger.png').pipe(fs.createWriteStream(examplesBuildDir + '/images/error-in-javascript-debugger.png'));

log.title('fetch AsciiDoc User Guide');
var userguide = fs.createWriteStream(examplesBuildDir + '/userguide.adoc');
var request = https.get('https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625/doc/asciidoc.txt', function(response) {
  response.pipe(userguide);
});

var customers = fs.createWriteStream(examplesBuildDir + '/customers.csv');
var request = https.get('https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625/doc/customers.csv', function(response) {
  response.pipe(customers);
});
