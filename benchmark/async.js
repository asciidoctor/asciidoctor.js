const asciidoctor = require('../build/asciidoctor-node.js')()
const runs = process.env.RUNS || 100

const includeBaseDirectory = `${__dirname}/fixtures/includes`
const input = `
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

const fs = require('fs')

;(async () => {
  console.time('convertAsync')
  const resultAsync = []
  for (let i = 0; i < runs; i++) {
    resultAsync.push(await asciidoctor.convertAsync(input, { safe: 'safe' }))
  }
  console.log(resultAsync.length)
  console.timeEnd('convertAsync')

  console.time('convert')
  const result = []
  for (let j = 0; j < runs; j++) {
    const doc = asciidoctor.load(input, { safe: 'safe' })
    result.push(doc.convert({ safe: 'safe' }))
  }
  console.log(result.length)
  console.timeEnd('convert')

  var userManual = fs.readFileSync(`${__dirname}/fixtures/docs/user-manual.adoc`)

  console.time('convertAsync - user manual')
  resultAsync.push(await asciidoctor.convertAsync(userManual, { safe: 'safe', 'base_dir': `${__dirname}/fixtures/docs` }))
  console.timeEnd('convertAsync - user manual')

  console.time('convert - user manual')
  result.push(asciidoctor.convert(userManual, { safe: 'safe', 'base_dir': `${__dirname}/fixtures/docs` }))
  console.timeEnd('convert - user manual')

})()
