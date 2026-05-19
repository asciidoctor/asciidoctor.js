export default function (registry) {
  registry.block(function () {
    this.named('callout')
    this.onContext('paragraph')
    this.process(function (parent, reader, attrs) {
      const type = attrs.type || 'note'
      const lines = reader.getLines()
      const html = `<aside class="callout callout-${type}">${lines.join('\n')}</aside>`
      return this.createBlock(parent, 'pass', html)
    })
  })
}