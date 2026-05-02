export default function (registry) {
  registry.block(function () {
    this.named('chart')
    this.positionalAttributes(['size', 'width', 'height'])
    this.onContext('literal')
    this.parseContentAs('raw')
    this.process((parent, reader, attrs) => {
      const lines = reader.getLines()
      const labels = lines[0].split(',')
      lines.shift()
      const data = lines.map((line) => line.split(','))
      const series = data.map(
        (value, index) => `data-chart-series-${index}="${value.join(',')}"`
      )
      const html = `<div class="chart" data-chart-labels="${labels.join(',')}" ${series.join(' ')}></div>`
      return this.createBlock(parent, 'pass', html, attrs, {})
    })
  })
}
