module.exports = function (registry) {
  registry.docinfoProcessor(function () {
    var self = this
    self.atLocation('footer')
    self.process(function () {
      return 'moar footer'
    })
  })
}
