export default function (registry) {
  registry.includeProcessor(function () {
    this.handles((target) => target.endsWith('.foo'))
    this.process((doc, reader, target, attrs) => {
      const content = ['foo', 'foo']
      return reader.pushInclude(content, target, target, 1, attrs)
    })
  })
}
