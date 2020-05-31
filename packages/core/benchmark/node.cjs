const fs = require('fs')
const stats = require('./stats.cjs')

const verbose = process.env.VERBOSE
const include = process.env.INCLUDE
const runs = process.env.RUNS || 4

const start = new Date().getTime()
const Asciidoctor = require('../asciidoctor-node.cjs')
console.log(`Load scripts: ${((new Date().getTime() - start) / 1000.0)}s`)

const baseDir = __dirname
const options = {
  safe: 'safe',
  base_dir: baseDir,
  doctype: 'article',
  header_footer: true,
  attributes: 'linkcss copycss! toc! numbered! icons! compat-mode'
}
const asciidoctor = Asciidoctor({ runtime: { platform: 'node' } })

let content
if (include) {
  content = 'include::userguide.adoc[]'
} else {
  content = fs.readFileSync(`${baseDir}/userguide.adoc`, 'utf-8')
}
let html
const durations = []
for (let i = 1; i <= runs; i++) {
  const start = new Date().getTime()
  html = asciidoctor.convert(content, options)
  const duration = new Date().getTime() - start
  durations.push(duration)
  console.log(`Run #${i}: ${(duration / 1000.0)}s`)
}

stats.log(durations)

if (verbose) {
  console.log(html)
}
