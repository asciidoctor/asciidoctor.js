module.exports = function (registry) {
  registry.treeProcessor(function () {
    var self = this
    self.process(function (doc) {
      doc.getBlocks()[0] = self.createBlock(doc, 'paragraph', 'GDPR compliant :)')
      return doc
    })
  })
}
