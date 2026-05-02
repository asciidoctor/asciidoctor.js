export default function (registry) {
  registry.block(function () {
    this.named('shout')
    this.onContext('paragraph')
    this.process((parent, reader) => {
      const lines = reader.getLines().map((l) => l.toUpperCase())
      return this.createBlock(parent, 'paragraph', lines)
    })
  })
}
