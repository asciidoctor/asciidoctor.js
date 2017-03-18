// define console object in Nashorn
if (typeof console === 'undefined') {
  console = {
    log: function (str) {
      print(str);
    },
    warn: function (str) {
      print(str);
    }
  };
}

function currentTimeMillis () {
  return new Date().getTime();
}

function secondsSince (start) {
  return ((currentTimeMillis() - start) / 1000.0) + 's';
}

var start = currentTimeMillis();
var asciidoctor;
var verbose = false;
if (typeof load === 'function') {
  load('./node_modules/opal-runtime/src/opal.js');
  load('./build/asciidoctor.js');
  Opal.require('asciidoctor');
  var Asciidoctor = Opal.Asciidoctor;
  asciidoctor = Asciidoctor();
}
else {
  if (typeof phantom !== 'undefined') {
    require('../../node_modules/opal-runtime/src/opal.js');
    asciidoctor = require('../asciidoctor.js')({'runtime': {'ioModule': 'phantomjs'}});
    var system = require('system');
    var env = system.env;
    verbose = env.VERBOSE;
  }
  else {
    asciidoctor = require('../asciidoctor.js')({'runtime': {'platform': 'node'}});
    verbose = process.env.VERBOSE;
  }
}
console.log('Load scripts: ' + secondsSince(start));
start = currentTimeMillis();

var data = 'include::build/benchmark/userguide.adoc[]';

var options = {
  safe: 'safe',
  doctype: 'article',
  header_footer: true,
  attributes: 'linkcss copycss! toc! numbered! icons! compat-mode'
};
var html;
var runs = 4;
for (var i = 1; i <= runs; i++) {
  start = currentTimeMillis();
  html = asciidoctor.convert(data, options);
  console.log('Run #' + i + ': ' + secondsSince(start));
}

if (verbose) {
  console.log(html);
}

if (typeof phantom !== 'undefined') {
  phantom.exit();
}
