export function register(registry) {
  registry.postprocessor(function () {
    this.process(function (doc, output) {
      return output + '<!-- postprocessor-extension -->'
    })
  })
}