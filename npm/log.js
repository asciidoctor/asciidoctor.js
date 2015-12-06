module.exports = Log;

function Log() {
  this.colors = require('colors');
}

Log.prototype.transform = function(action, source, destination) {
  console.log(action + ' ' + source.cyan + ' to ' + destination.cyan);
}

Log.prototype.debug = function(message) {
  console.log(' - ' + message.blue);
}

Log.prototype.info = function(message) {
  console.log(message.magenta);
}

Log.prototype.warn = function(message) {
  console.log(message.yellow);
}

Log.prototype.error = function(message) {
  console.log(message.red);
}

Log.prototype.success = function(message) {
  console.log('');
  console.log('>>'.green + ' ' + message);  
}

Log.prototype.title = function(message) {
  console.log('');
  console.log(message.underline);
}

