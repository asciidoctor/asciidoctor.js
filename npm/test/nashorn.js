const log = require('bestikk-log');
const Builder = require('../builder.js');
const builder = new Builder();

log.task('Nashorn');
builder.nashornRun('jdk1.8.0');
