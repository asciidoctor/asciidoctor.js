/* global Opal */
module.exports = () => {
  Opal.Asciidoctor.Extensions.register(function () {
    this.block(function () {
      const self = this
      self.named('chart')
      self.positionalAttributes(['size', 'width', 'height'])
      self.onContext('literal')
      self.parseContentAs('raw')
      self.process(function (parent, reader, attrs) {
        const lines = reader.getLines()
        const labels = lines[0].split(',')
        lines.shift()
        const data = lines.map(line => line.split(','))
        const series = data.map((value, index) => `data-chart-series-${index}="${value.join(',')}"`)
        const html = `<div class="chart" data-chart-labels="${labels.join(',')}" ${series.join(' ')}></div>`
        return self.createBlock(parent, 'pass', html, attrs, {})
      })
    })
  })
}
