export function register(registry) {
  registry.preprocessor(function () {
    this.process(function (doc, reader) {
      const isDraft = reader.lines.some(l => /^\/\/\s*draft:/i.test(l))
      if (isDraft) {
        doc.setAttribute('status', 'DRAFT')
        reader.lines.unshift('WARNING: This document is a draft and may change without notice.', '')
      }
      return reader
    })
  })
}