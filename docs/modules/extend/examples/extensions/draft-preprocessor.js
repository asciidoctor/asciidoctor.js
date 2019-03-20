module.exports = function (registry) {
  registry.preprocessor(function () {
    var self = this
    self.process(function (doc, reader) {
      var lines = reader.lines
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].match(/^\/\/\s?draft.*/)) {
          doc.setAttribute('status', 'DRAFT')
        }
      }
      return reader
    })
  })
}
