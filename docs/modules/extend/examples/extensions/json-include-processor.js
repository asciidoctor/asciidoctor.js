export function register(registry) {
  registry.includeProcessor(function () {
    this.handles(target => target.startsWith('https://') && target.endsWith('.json'))
    this.process(async function (doc, reader, target, attrs) {
      const response = await fetch(target)
      const data = await response.json()
      const lines = attrs.as === 'attributes'
        ? Object.entries(data).map(([k, v]) => `:${k}: ${v}`)
        : [JSON.stringify(data, null, 2)]
      return reader.pushInclude(lines, target, target, 1, attrs)
    })
  })
}