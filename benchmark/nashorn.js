// import
var Paths = Java.type('java.nio.file.Paths');
var Files = Java.type('java.nio.file.Files');

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

var verbose = false;
var include = false;
if (typeof $ENV !== 'undefined') {
  var verbose = $ENV.VERBOSE;
  var include = $ENV.INCLUDE;
}

var start = currentTimeMillis();
load('./build/asciidoctor-nashorn.js');
console.log('Load scripts: ' + secondsSince(start));

var asciidoctor = Asciidoctor();

var baseDir = Paths.get('').toAbsolutePath().toString() + '/build/benchmark';
var content;
if (include) {
  content = 'include::userguide.adoc[]';
} else {
  var Paths = Java.type('java.nio.file.Paths');
  var Files = Java.type('java.nio.file.Files');
  var lines = Files.readAllLines(Paths.get(baseDir, 'userguide.adoc'), Java.type('java.nio.charset.StandardCharsets').UTF_8);
  var data = [];
  lines.forEach(function(line) { data.push(line); });
  content = data.join('\n');
}

start = currentTimeMillis();

var options = {
  safe: 'safe',
  base_dir: baseDir,
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
