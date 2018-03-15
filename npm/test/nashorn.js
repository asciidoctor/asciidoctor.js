const log = require('bestikk-log');
const nashornModule = require('../module/nashorn');

log.task('Nashorn');
nashornModule.nashornRun('jdk1.8.0');
