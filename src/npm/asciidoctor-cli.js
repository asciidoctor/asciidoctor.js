#!/usr/bin/env node
var cli = require('cli').enable('status');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var asciidoctor = require('../../dist/npm/asciidoctor-core.js')();
var opal = asciidoctor.Opal;
var processor = asciidoctor.Asciidoctor(true);

var convert_options = function (cliOptions) {
  var backend = cliOptions['backend'];
  var doctype = cliOptions['doctype'];
  var safeMode = cliOptions['safe-mode'];
  var sectionNumbers = cliOptions['section-numbers'];
  var baseDir = cliOptions['base-dir'];
  var destinationDir = cliOptions['destination-dir'];
  var quiet = cliOptions['quiet'];
  var verbose = cliOptions['verbose'];
  var timings = cliOptions['timings'];
  var trace = cliOptions['trace'];
  cli.debug('backend ' + backend);
  cli.debug('doctype ' + doctype);
  cli.debug('section-numbers ' + sectionNumbers);
  cli.debug('quiet ' + quiet);
  cli.debug('verbose ' + verbose);
  cli.debug('timings ' + timings);
  cli.debug('trace ' + trace);
  cli.debug('baseDir ' + baseDir);
  cli.debug('destinationDir ' + destinationDir);
  var verboseMode = quiet ? 0 : verbose ? 2 : 1;
  var defaultAttributes = 'showtitle';
  var attributes = defaultAttributes;
  if (sectionNumbers) {
    attributes.concat(' ').concat('sectnums');
  }
  cli.debug('verboseMode ' + verboseMode);
  cli.debug('attributes ' + attributes);
  var optionsKeys = ['backend', 'doctype', 'safe', 'verbose', /*'timings',*/ 'trace'];
  var optionsValues = {
    backend: backend,
    doctype: doctype,
    safe: safeMode,
    verbose: verboseMode,
    // FIXME 22/12/2014, exception is thrown at runtime
    //timings: timings,
    trace: trace
  };
  if (baseDir != null) {
    optionsKeys.push('base_dir');
    optionsValues.base_dir = baseDir
  }/*
  if (destinationDir != null) {
    optionsKeys.push('to_dir');
    optionsValues.to_dir = destinationDir;
  }*/
  optionsKeys.push('attributes');
  optionsValues.attributes = attributes;
  cli.debug('optionsKeys ' + optionsKeys);
  cli.debug('optionsValues ' + JSON.stringify(optionsValues));
  return opal.hash2(optionsKeys, optionsValues);
}

var convert_file = function (file, options) {
  cli.debug('convert file ' + file + ' with options ' + options);
  var data = fs.readFileSync(file, 'utf8');
  return processor.$convert(data, options);
};

var output_result = function (data, file, cliOptions) {
  var backend = cliOptions['backend'];
  var outFile = cliOptions['out-file'];
  var destinationDir = cliOptions['destination-dir'];
  cli.debug('out-file ' + outFile);
  if (outFile == '') {
    console.log(data);
  } else {
    if (destinationDir != null) {
      var outDir = destinationDir;
      mkdirp.sync(outDir);
    } else {
      var outDir = path.dirname(file);
    }
    if (outFile == null) {
      var extname = path.extname(file);
      if (backend == 'docbook45' || backend == 'docbook5') {
        var outputExtname = '.xml';
      } else {
        var outputExtname = '.html';
      }
      var outputFile = outDir + path.sep + path.basename(file, extname) + outputExtname;
    } else {
      var outputFile = outDir + path.sep + outFile;
    }
    cli.debug('write result in ' + outputFile);
    fs.writeFileSync(outputFile, data);
    cli.ok(file + ' converted to ' + backend + ' in ' + outputFile);
  }
}

cli.parse({
  'backend':          ['b', 'set output format backend (default: html5)', 'string', 'html5'],
  'doctype':          ['d', 'document type to use when converting document: [article, book, manpage, inline] (default: article)', 'string', 'article'],
  'out-file':         ['o', 'output file (default: based on path of input file); use \'\' to output to STDOUT', 'file'],
  'safe-mode':        ['S', 'set safe mode level explicitly: [unsafe, safe, server, secure] (default: unsafe)), disables potentially dangerous macros in source files, such as include::[]', 'string', 'unsafe'],
  'section-numbers':  ['n', 'auto-number section titles in the HTML backend; disabled by default', 'boolean', 'false'],
  'base-dir':         ['B', 'base directory containing the document and resources (default: directory of source file)', 'path'],
  'destination-dir':  ['D', 'destination output directory (default: directory of source file)', 'path'],
  'quiet':            ['q', 'suppress warnings (default: false)', 'boolean', 'false'],
  'trace':            [false, 'include backtrace information on errors (default: false)', 'boolean', 'false'],
  'verbose':          ['v', 'enable verbose mode (default: false)', 'boolean', 'false'],
  'timings':          ['t', 'enable timings mode (default: false)', 'boolean', 'false']
});

cli.main(function (cliArgs, cliOptions) {
  var options = convert_options(cliOptions);
  cliArgs.forEach(function (file) {
    var data = convert_file(file, options);
    output_result(data, file, cliOptions);
  });
});


