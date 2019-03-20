module.exports = function (registry) {
  registry.block(function () {
    var self = this
    self.named('shout')
    self.onContext('paragraph')
    self.process(function (parent, reader) {
      var lines = reader.getLines().map(function (l) { return l.toUpperCase() })
      return self.createBlock(parent, 'paragraph', lines)
    })
  })
}
