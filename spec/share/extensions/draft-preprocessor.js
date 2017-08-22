module.exports = function (registry) {
  registry.preprocessor(function () {
    var self = this;
    self.process(function (doc, reader) {
      var lines = reader.lines;
      for (var i = 0; i < lines.length; i++) {
        // starts with
        var match = lines[i].match(/\/\/ draft:?(.*)/);
        if (match) {
          var reason = match[1];
          if (reason) {
            lines[i] = 'IMPORTANT: This section is a draft:' + reason;
          } else {
            lines[i] = 'IMPORTANT: This section is a draft';
          }
          doc.setAttribute('status', 'DRAFT');
        }
      }
      return reader;
    });
  });
};
