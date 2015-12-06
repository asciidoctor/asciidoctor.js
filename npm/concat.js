module.exports = concat;

function concat(files, destination) {
  var fs = require('fs');
  var buffers = [];
  for (var i in files) {
    var buffer = fs.readFileSync(files[i]);
    if (i == (files.length - 1)) {
      buffers.push(buffer);
    } else {
      buffers.push(Buffer.concat([buffer, new Buffer('\n')]));
    }
  }
  fs.writeFileSync(destination, Buffer.concat(buffers));
}
