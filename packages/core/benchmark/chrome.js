const puppeteer = require('puppeteer')
const fs = require('fs')
const stats = require('./stats.js')

const verbose = process.env.VERBOSE
const include = process.env.INCLUDE
const runs = process.env.RUNS || 4

puppeteer.launch({ args: ['--disable-gpu', '--no-sandbox', '--single-process', '--disable-web-security'] }).then(async browser => {
  const page = await browser.newPage()
  page.on('console', msg => {
    console.log(`${msg._type}: ${msg._text}`)
  })
  const start = new Date().getTime()
  await page.addScriptTag({ path: './build/asciidoctor.js' })
  console.log(`Load scripts: ${((new Date().getTime() - start) / 1000.0)}s`)
  const data = fs.readFileSync(`${__dirname}/userguide.adoc`, 'utf-8')
  await page.exposeFunction('env', () => ({ verbose, include, runs, baseDir: `file://${__dirname}` }))
  const result = await page.evaluate(async (data) => {
    /* global Asciidoctor, env */
    var environment = await env()
    var options = {
      safe: 'safe',
      base_dir: environment.baseDir,
      doctype: 'article',
      header_footer: true,
      attributes: 'linkcss copycss! toc! numbered! icons! compat-mode'
    }
    var asciidoctor = Asciidoctor({ runtime: { ioModule: 'xmlhttprequest' } })
    var content
    if (environment.include) {
      content = 'include::' + environment.baseDir + '/userguide.adoc[]'
    } else {
      content = data
    }
    var html
    var result = []
    for (var i = 1; i <= environment.runs; i++) {
      var start = new Date().getTime()
      html = asciidoctor.convert(content, options)
      var duration = new Date().getTime() - start
      result.push({ id: i, duration: duration, html: html })
    }
    return result
  }, data)
  if (verbose) {
    console.log(result[0].html)
  }
  result.forEach(run => console.log(`Run #${run.id}: ${(run.duration / 1000.0)}s`))
  stats.log(result.map(v => v.duration))
  await browser.close()
})
