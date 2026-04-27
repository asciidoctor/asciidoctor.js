export default function (registry) {
  registry.docinfoProcessor(function () {
    const self = this
    self.atLocation('footer')
    self.process(function () {
      return 'Made with <3'
    })
  })
}