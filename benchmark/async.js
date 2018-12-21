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
    result.push(asciidoctor.convert(input, { safe: 'safe' }))
  }
  console.log(result.length)
  console.timeEnd('convert')

})()
