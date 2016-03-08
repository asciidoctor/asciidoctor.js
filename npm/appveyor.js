var async = require('async');
var Log = require('./log.js');
var Builder = require('./builder.js');
var builder = new Builder();
var log = new Log();

log.title('Appveyor');
builder.build();

if (process.env.APPVEYOR_SCHEDULED_BUILD) {
  async.series([
    function (callback) {
      builder.jdk8EA(callback);
    },
    function (callback) {
      builder.jdk9EA(callback);
    }]
  );
}
