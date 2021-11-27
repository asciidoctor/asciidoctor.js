module.exports = function (registry) {
  registry.docinfoProcessor(function () {
    const self = this
    self.atLocation('footer')
    self.process(function () {
      return 'moar footer'
    })
  })
}
