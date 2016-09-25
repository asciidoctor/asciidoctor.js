var log = require('bestikk-log');
var Builder = require('./builder.js');
var builder = new Builder();

log.task('examples');
builder.examples();
