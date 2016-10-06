var httpServer = require('http-server');
var portfinder = require('portfinder');
var log = require('bestikk-log');

var args = process.argv.slice(2);
var port = args[0];

var server = httpServer.createServer({});

var listen = function(port) {
  server.listen(port, function(){
    // Callback triggered when server is successfully listening. Hurray!
    log.info('Server listening on: http://localhost:' + port);
  });
}

if (!port) {
  portfinder.basePort = 8080;
  portfinder.getPort(function (err, port) {
    if (err) { throw err; }
    listen(port);
  });
} else {
  listen(port);
}
