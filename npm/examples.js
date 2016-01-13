var Log = require('./log.js');
var Builder = require('./builder.js');
var builder = new Builder();
var log = new Log();

log.title('examples');
builder.examples();
