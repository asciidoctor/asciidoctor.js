module.exports = function (registry) {
  registry.preprocessor(function () {
    const self = this
    self.process(function (doc, reader) {
      const lines = reader.lines
      for (let i = 0; i < lines.length; i++) {
        // starts with
        const match = lines[i].match(/\/\/ draft:?(.*)/)
        if (match) {
          const reason = match[1]
          if (reason) {
            lines[i] = 'IMPORTANT: This section is a draft:' + reason
          } else {
            lines[i] = 'IMPORTANT: This section is a draft'
          }
          doc.setAttribute('status', 'DRAFT')
        }
      }
      return reader
    })
  })
}
