export default function (registry) {
  registry.preprocessor(function () {
    const self = this
    self.process(function (doc, reader) {
      const lines = reader.lines
      for (const line of lines) {
        if (line.match(/^\/\/\s?draft.*/)) {
          doc.setAttribute('status', 'DRAFT')
        }
      }
      return reader
    })
  })
}