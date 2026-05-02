export default function (registry) {
  registry.treeProcessor(function () {
    this.process((doc) => {
      doc.getBlocks()[0] = this.createBlock(
        doc,
        'paragraph',
        'Made with icon:heart[]'
      )
      return doc
    })
  })
}
