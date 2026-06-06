module.exports.register = function (registry) {
  registry.postprocessor(function () {
    this.process(function (doc, output) {
      return output + '<!-- cjs-postprocessor-extension -->'
    })
  })
}