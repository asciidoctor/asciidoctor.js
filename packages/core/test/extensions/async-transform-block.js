// Simulates using an async library (e.g. a code formatter, a markdown converter, etc.)
async function titleCase(text) {
  return text.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function (registry) {
  registry.block(function () {
    this.named('titlecase')
    this.onContext('paragraph')
    this.process(async function (parent, reader) {
      const lines = await Promise.all(reader.getLines().map(titleCase))
      return this.createBlock(parent, 'paragraph', lines)
    })
  })
}