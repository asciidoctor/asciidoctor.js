// Run the following script before running this benchmark:
//
// $ ruby fetch-sample-data.rb
//
// Then run the script using node, js or jjs
//
// $ node benchmark-a.js

// define console object in Nashorn
if (typeof console === 'undefined') {
  console = {
    log: function(str) {
      print(str);
    },
    warn: function(str) {
      print(str);
    }
  };
}

function currentTimeMillis() {
  return new Date().getTime();
}

function secondsSince(start) {
  return ((currentTimeMillis() - start) / 1000.0) + "s";
}

var start = currentTimeMillis();
var asciidoctor = false;
var pwd = '';
if (typeof load === 'function') {
  AsciidoctorConfiguration = {};
  AsciidoctorConfiguration.autoLoadModule = false;
  load('../bower_components/opal/opal/current/opal.js');
  load('../dist/asciidoctor-core.js');
  //or...
  //load('../dist/asciidoctor-all.js');
  Opal.require('asciidoctor');
  if (typeof Java === 'undefined') {
    pwd = '../benchmark/';
  }
}
else {
  Opal = require('opal-npm-wrapper').Opal;
  asciidoctor = require('../dist/npm/asciidoctor-core.js')(Opal, (typeof phantom === 'undefined' ? null : false)).Asciidoctor();
  // patch the FS module in PhantomJS so it maps to the FS API in Node
  if (typeof phantom !== 'undefined') {
    var fs = require('fs');
    fs.readFileSync = fs.read;
  }
}
console.log("Load scripts: " + secondsSince(start));
start = currentTimeMillis();

var data = "include::" + pwd + "sample-data/userguide.adoc[]";

var options = Opal.hash({
  safe: 'safe',
  doctype: 'article',
  header_footer: true,
  attributes: 'linkcss copycss! toc! numbered! icons! compat-mode'
});
//var doc = (asciidoctor ? asciidoctor : Opal.Asciidoctor).$load(data, options);
var html;
var runs = 4;
for (var i = 1; i <= runs; i++) {
  start = currentTimeMillis();
  //doc = (asciidoctor ? asciidoctor : Opal.Asciidoctor).$load(data, options);
  html = (asciidoctor ? asciidoctor : Opal.Asciidoctor).$convert(data, options);
  console.log("Run #" + i + ": " + secondsSince(start));
}
// TODO add flag to output result
//console.log(html);

if (typeof phantom !== 'undefined') {
  phantom.exit();
}
