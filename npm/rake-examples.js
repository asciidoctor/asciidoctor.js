var child_process = require('child_process');
var fs = require('fs');
var https = require('https');

var Builder = require('./builder.js');
var OpalCompiler = require('./opal-compiler.js');
var Log = require('./log.js');
var builder = new Builder();
var opalCompiler = new OpalCompiler();
var log = new Log();

var examplesBuildDir = 'build/examples';
var copyToExamplesBuildDir = function(file) {
  builder.copyToDir(file, examplesBuildDir);
}
var examplesImagesBuildDir = examplesBuildDir + '/images';
var copyToExamplesImagesBuildDir = function(file) {
  builder.copyToDir(file, examplesImagesBuildDir);
}

builder.mkdirSync(examplesBuildDir);

log.title('compile examples');
opalCompiler.compile('examples/asciidoctor_example.rb', examplesBuildDir + '/asciidoctor_example.js');
opalCompiler.compile('examples/userguide_test.rb', examplesBuildDir + '/userguide_test.js');

log.title('copy resources to ' + examplesBuildDir + '/');
copyToExamplesBuildDir('examples/asciidoctor_example.html');
copyToExamplesBuildDir('examples/userguide_test.html');
copyToExamplesBuildDir('examples/asciidoctor.css');
copyToExamplesBuildDir('README.adoc');

log.title('copy images to ' + examplesImagesBuildDir + '/');
builder.mkdirSync(examplesBuildDir + '/images');
copyToExamplesImagesBuildDir('error-in-chrome-console.png');
copyToExamplesImagesBuildDir('error-in-javascript-debugger.png');

log.title('fetch content from AsciiDoc repository');
var asciidocRepoURI = 'https://raw.githubusercontent.com/asciidoc/asciidoc';
var asciidocRepoHash = 'd43faae38c4a8bf366dcba545971da99f2b2d625';
var asciidocRepoBaseURI = asciidocRepoURI + '/' + asciidocRepoHash;

var userguide = examplesBuildDir + '/userguide.adoc';
log.transform('fetch', 'asciidoc.txt', userguide);
var userguideFile = fs.createWriteStream(userguide);
var request = https.get(asciidocRepoBaseURI + '/doc/asciidoc.txt', function(response) {
  response.pipe(userguideFile);
});

var customers = examplesBuildDir + '/customers.csv';
log.transform('fetch', 'customers.csv', customers);
var customersFile = fs.createWriteStream(customers);
var request = https.get(asciidocRepoBaseURI + '/doc/customers.csv', function(response) {
  response.pipe(customersFile);
});
