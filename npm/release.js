var Log = require('./log.js');
var Builder = require('./builder.js');
var builder = new Builder();
var log = new Log();

var args = process.argv.slice(2);
var releaseVersion = args[0];

if (typeof releaseVersion === 'undefined') {
  log.error("Release version is undefined, please specify a version 'npm run release 1.0.0'");
  process.exit(9);
}

builder.release(releaseVersion);
