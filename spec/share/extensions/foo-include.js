/* global Opal */
module.exports = () => {
  Opal.Asciidoctor.Extensions.register(function () {
    this.includeProcessor(function () {
      const self = this
      self.handles(function (target) {
        return target.endsWith('.foo')
      })
      self.process(function (doc, reader, target, attrs) {
        const content = ['foo', 'foo']
        return reader.pushInclude(content, target, target, 1, attrs)
      })
    })
  })
}
