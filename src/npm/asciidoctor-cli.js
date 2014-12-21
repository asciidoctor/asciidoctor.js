#!/usr/bin/env node
var cli = require('cli').enable('status');
var fs = require('fs');
var path = require('path');
var asciidoctor = require('../../dist/npm/asciidoctor-core.js')();
var opal = asciidoctor.Opal;
var processor = asciidoctor.Asciidoctor(true);

var convert_file = function (file, cliOpts) {
  var backend = cliOpts['backend'];
  var doctype = cliOpts['doctype'];
  var outFile = cliOpts['out-file'];
  cli.debug('backend ' + backend);
  cli.debug('doctype ' + doctype);
  cli.debug('out-file ' + outFile);
  var options = opal.hash2(
    ['backend', 'doctype', 'attributes'],
    { backend: backend, doctype: doctype, attributes: ['showtitle']});
  cli.debug('convert file ' + file);
  var data = fs.readFileSync(file, 'utf8');
  var html = processor.$convert(data, options);

  if (outFile == '') {
    console.log(html);
  } else {
    if (outFile == null) {
      var extname = path.extname(file);
      if (backend == 'docbook45' || backend == 'docbook5') {
        var outputExtname = '.xml';
      } else {
        var outputExtname = '.html';
      }
      var outputFile = path.dirname(file) + path.sep + path.basename(file, extname) + outputExtname;
    } else {
      var outputFile = outFile;
    }
    cli.debug('write result in ' + outputFile);
    fs.writeFileSync(outputFile, html);
    cli.ok(file + ' converted to ' + backend + ' in ' + outputFile);
  }
};

cli.parse({
    'backend':    ['b', 'set output format backend (default: html5)', 'string', 'html5'],
    'doctype':    ['d', 'document type to use when converting document: [article, book, manpage, inline] (default: article)', 'string', 'article'],
    'out-file':   ['o', 'output file (default: based on path of input file); use \'\' to output to STDOUT', 'file']
});
cli.main(function(args, options) {
    args.forEach(function(file) {
      convert_file(file, options);
    });
});


