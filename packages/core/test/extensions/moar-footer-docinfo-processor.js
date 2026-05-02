export default function (registry) {
  registry.docinfoProcessor(function () {
    this.atLocation('footer')
    this.process(() => 'moar footer')
  })
}
