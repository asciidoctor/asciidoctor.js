const log = require('bestikk-log');
const Builder = require('./builder.js');
const builder = new Builder();

log.task('examples');
builder.examples();
