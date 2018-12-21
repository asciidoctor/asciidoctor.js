const asciidoctor = require('../build/asciidoctor-node.js')()
const runs = process.env.RUNS || 5

const run = async (label, fn) => {
  console.time(label)
  const resultAsyncPromises = []
  for (let i = 0; i < runs; i++) {
    resultAsyncPromises.push(fn())
  }
  const resultAsync = await Promise.all(resultAsyncPromises)
  console.log(resultAsync.length)
  console.timeEnd(label)
}

const includeBaseDirectory = `${__dirname}/fixtures/includes`
const localIncludeInput = `
include::${includeBaseDirectory}/1.adoc[]
include::${includeBaseDirectory}/2.adoc[]
include::${includeBaseDirectory}/3.adoc[]
include::${includeBaseDirectory}/4.adoc[]
include::${includeBaseDirectory}/5.adoc[]
include::${includeBaseDirectory}/6.adoc[]
include::${includeBaseDirectory}/7.adoc[]
include::${includeBaseDirectory}/8.adoc[]
include::${includeBaseDirectory}/9.adoc[]
include::${includeBaseDirectory}/10.adoc[]
include::${includeBaseDirectory}/11.adoc[]
include::${includeBaseDirectory}/12.adoc[]
include::${includeBaseDirectory}/13.adoc[]
include::${includeBaseDirectory}/14.adoc[]
include::${includeBaseDirectory}/15.adoc[]
include::${includeBaseDirectory}/16.adoc[]
include::${includeBaseDirectory}/17.adoc[]
include::${includeBaseDirectory}/18.adoc[]
include::${includeBaseDirectory}/19.adoc[]
include::${includeBaseDirectory}/20.adoc[]
`

const remoteIncludeInput = `
include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/master/README.adoc[]
include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/master/README.adoc[]
include::https://raw.githubusercontent.com/asciidoctor/asciidoctor.js/master/README.adoc[]
`

;(async () => {
  console.log('warmup...')
  for (let i = 0; i < 100; i++) {
    const doc = asciidoctor.load(localIncludeInput, { safe: 'safe' })
    doc.convert({ safe: 'safe' })
    await asciidoctor.convertAsync(localIncludeInput, { safe: 'safe' })
  }
  await run('(local include) - convert', () => {
    const doc = asciidoctor.load(localIncludeInput, { safe: 'safe' })
    return doc.convert({ safe: 'safe' })
  })
  await run('(local include) - convertAsync', async () => await asciidoctor.convertAsync(localIncludeInput, { safe: 'safe' }))
  await run('(local include) - convertAsync-Promise.all', () => asciidoctor.convertAsync(localIncludeInput, { safe: 'safe' }))

  await run('(remote include) - convert', () => {
    const doc = asciidoctor.load(remoteIncludeInput, { safe: 'safe', attributes: { 'allow-uri-read': true } })
    return doc.convert({ safe: 'safe' })
  })
  await run('(remote include) - convertAsync', async () => await asciidoctor.convertAsync(remoteIncludeInput, { safe: 'safe', attributes: { 'allow-uri-read': true } }))
  await run('(remote include) - convertAsync-Promise.all', () => asciidoctor.convertAsync(remoteIncludeInput, { safe: 'safe', attributes: { 'allow-uri-read': true } }))
})()
