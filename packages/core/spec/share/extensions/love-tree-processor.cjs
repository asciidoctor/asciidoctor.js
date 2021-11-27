module.exports = function (registry) {
  registry.treeProcessor(function () {
    const self = this
    self.process(function (doc) {
      doc.getBlocks()[0] = self.createBlock(doc, 'paragraph', 'Made with icon:heart[]')
      return doc
    })
  })
}
