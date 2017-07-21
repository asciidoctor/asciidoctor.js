var log = require('bestikk-log');
var Builder = require('./builder.js');
var builder = new Builder();

var args = process.argv.slice(2);
var releaseVersion = args[0];

if (typeof releaseVersion === 'undefined') {
  log.error('Release version is undefined, please specify a version `npm run release 1.0.0`');
  log.info('You can also specify one of the following: patch, minor, major, prepatch, preminor, premajor or prerelease `npm run release patch`');
  process.exit(9);
}

builder.release(releaseVersion);
