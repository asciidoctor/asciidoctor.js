module.exports = function (registry) {
  registry.postprocessor(function () {
    const self = this
    self.process(function (doc, output) {
      return output.replace(/foo/g, 'bar')
    })
  })
}
