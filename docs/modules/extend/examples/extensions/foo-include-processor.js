module.exports = function (registry) {
  registry.includeProcessor(function () {
    var self = this
    self.handles(function (target) {
      return target.endsWith('.foo')
    })
    self.process(function (doc, reader, target, attrs) {
      var content = ['foo']
      return reader.pushInclude(content, target, target, 1, attrs)
    })
  })
}
