export default function (registry) {
  registry.postprocessor(function () {
    this.process((doc, output) => output.replace(/foo/g, 'bar'))
  })
}
