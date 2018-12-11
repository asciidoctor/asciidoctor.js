/* global Asciidoctor */
const fs = require('fs')
const util = require('util')
const stats = require('./stats.js')

const log = async event => {
  const args = []
  for (let i = 0; i < event.args().length; ++i) {
    args.push(await event.args()[i].jsonValue())
  }
  let message
  if (args && args.length > 0) {
    if (args.length === 1) {
      message = args[0]
    } else {
      message = util.format(args[0], ...args.slice(1))
    }
  } else {
    message = ''
  }
  const type = event.type()
  let logger
  if (type === 'warning') {
    // eslint-disable-next-line no-console
    logger = console.warn
  } else {
    // eslint-disable-next-line no-console
    logger = console[type]
  }
  logger.call(this, message)
}

const run = async (puppeteer) => {
  const verbose = process.env.VERBOSE
  const include = process.env.INCLUDE
  const runs = process.env.RUNS || 4
  const browser = await puppeteer.launch({
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--single-process',
      '--disable-web-security',
      '--allow-file-access-from-files']
  })
  try {
    const page = await browser.newPage()
    page.on('console', log)
    const start = new Date().getTime()
    await page.addScriptTag({ path: './build/asciidoctor-browser.js' })
    console.log(`Load scripts: ${((new Date().getTime() - start) / 1000.0)}s`)
    const data = fs.readFileSync(`${__dirname}/userguide.adoc`, 'utf-8')
    const environment = { verbose, include, runs, baseDir: `file://${__dirname}` }
    const result = await page.evaluate(async (data, environment) => {
      const options = {
        safe: 'safe',
        base_dir: environment.baseDir,
        doctype: 'article',
        header_footer: true,
        attributes: 'linkcss copycss! toc! numbered! icons! compat-mode'
      }
      const asciidoctor = Asciidoctor()
      let content
      if (environment.include) {
        content = 'include::' + environment.baseDir + '/userguide.adoc[]'
      } else {
        content = data
      }
      let html
      const result = []
      for (var i = 1; i <= environment.runs; i++) {
        const start = new Date().getTime()
        html = asciidoctor.convert(content, options)
        const duration = new Date().getTime() - start
        result.push({ id: i, duration: duration, html: html })
      }
      return result
    }, data, environment)
    if (verbose) {
      console.log(result[0].html)
    }
    result.forEach(run => console.log(`Run #${run.id}: ${(run.duration / 1000.0)}s`))
    const durations = result.map(v => v.duration)
    stats.log(durations)
  } finally {
    await browser.close()
  }
}

module.exports = {
  run: run
}
