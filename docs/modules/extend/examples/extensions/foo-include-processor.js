export default function (registry) {
  registry.includeProcessor(function () {
    const self = this
    self.handles(function (target) {
      return target.endsWith('.foo')
    })
    self.process(function (doc, reader, target, attrs) {
      const content = ['foo']
      return reader.pushInclude(content, target, target, 1, attrs)
    })
  })
}