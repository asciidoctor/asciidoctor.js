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
var Asciidoctor;
var verbose = false;
if (typeof load === 'function') {
  load('./bower_components/opal/opal/current/opal.js');
  load('./build/asciidoctor-core.js'); //or... load('./build/asciidoctor-all.js');
  Opal.require('asciidoctor');
  Asciidoctor = Opal.Asciidoctor;
  verbose = $ENV.VERBOSE;
}
else {
  Opal = require('opal-npm-wrapper').Opal;
  Asciidoctor = require('../npm/asciidoctor-core.js')(Opal, (typeof phantom === 'undefined' ? null : false)).Asciidoctor();
  // patch the FS module in PhantomJS so it maps to the FS API in Node
  if (typeof phantom !== 'undefined') {
    var fs = require('fs');
    fs.readFileSync = fs.read;
    var system = require('system');
    var env = system.env;
    verbose = env.VERBOSE;
  } else {
    verbose = process.env.VERBOSE;
  }
}
console.log("Load scripts: " + secondsSince(start));
start = currentTimeMillis();

var data = "include::build/benchmark/userguide.adoc[]";

var options = Opal.hash({
  safe: 'safe',
  doctype: 'article',
  header_footer: true,
  attributes: 'linkcss copycss! toc! numbered! icons! compat-mode'
});
//var doc = Asciidoctor.$load(data, options);
var html;
var runs = 4;
for (var i = 1; i <= runs; i++) {
  start = currentTimeMillis();
  //doc = Asciidoctor.$load(data, options);
  html = Asciidoctor.$convert(data, options);
  console.log("Run #" + i + ": " + secondsSince(start));
}

if (verbose) {
  console.log(html);
}

if (typeof phantom !== 'undefined') {
  phantom.exit();
}
