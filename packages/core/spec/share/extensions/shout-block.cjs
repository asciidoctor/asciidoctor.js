/* global Opal */
module.exports = () => {
  Opal.Asciidoctor.Extensions.register(function () {
    this.block(function () {
      const self = this
      self.named('shout')
      self.onContext('paragraph')
      self.process(function (parent, reader) {
        const lines = reader.getLines().map(function (l) { return l.toUpperCase() })
        return self.createBlock(parent, 'paragraph', lines)
      })
    })
  })
}
