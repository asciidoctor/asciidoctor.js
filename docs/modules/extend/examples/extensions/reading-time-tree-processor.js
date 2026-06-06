export function register(registry) {
  registry.treeProcessor(function () {
    this.process(function (doc) {
      const words = doc.findBy({ context: 'paragraph' })
        .reduce((total, block) => total + block.getSource().split(/\s+/).length, 0)
      doc.setAttribute('reading-time', `${Math.ceil(words / 200)} min`)
      return doc
    })
  })
}