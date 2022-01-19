/* eslint-env node, es6 */
const path = require('path')
const puppeteer = require('puppeteer')

// puppeteer options
const opts = {
  headless: true,
  timeout: 30000, // 30 seconds
  args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-web-security']
}

const log = async (msg) => {
  const args = []
  for (let i = 0; i < msg.args().length; ++i) {
    args.push(await msg.args()[i].jsonValue())
  }
  if (args.length === 0) {
    args.push(msg.text())
  }
  const type = msg.type()
  let log
  if (type === 'warning') {
    log = console.warn
  } else {
    log = console[msg.type()]
  }
  log.apply(this, args)
  return args
}

;(async function () {
  try {
    const browser = await puppeteer.launch(opts)
    const page = await browser.newPage()
    await page.exposeFunction('mochaOpts', () => ({ reporter: 'spec' }))
    let exitCode = -1
    page.on('console', async (msg) => {
      const args = await log(msg)
      if (args[0] && typeof args[0] === 'string') {
        if (args[0] === '%d failures') {
          exitCode = parseInt(args[1])
        } else if (args[0] === '  %d passing (%s)') {
          exitCode = 0
        } else if (args[0].startsWith('Unable to start the browser tests suite:')) {
          exitCode = 1
        }
      }
    })
    await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle2' })
    await browser.close()
    if (exitCode === -1) {
      console.error('No test were run!')
      process.exit(1)
    }
    process.exit(exitCode)
  } catch (err) {
    console.error('Unable to run tests using Puppeteer', err)
    process.exit(1)
  }
})().catch((err) => {
  console.error('Unable to launch Chrome with Puppeteer', err)
  process.exit(1)
})
