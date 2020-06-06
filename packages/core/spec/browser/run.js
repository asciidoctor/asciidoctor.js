/* eslint-env node, es6 */
const path = require('path')
const puppeteer = require('puppeteer')
const MockServer = require('../share/mock-server.js')

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

let mockServer

const exit = async (exitCode) => {
  if (mockServer) {
    await mockServer.close()
  }
  process.exit(exitCode)
}

;(async function () {
  try {
    const { uri: remoteBaseUri } = await new Promise((resolve, reject) => {
      mockServer = new MockServer((msg) => {
        if (msg.event === 'started') {
          resolve({ uri: `http://localhost:${msg.port}` })
        }
      })
    })
    const browser = await puppeteer.launch(opts)
    const page = await browser.newPage()
    page.exposeFunction('mochaOpts', () => ({ reporter: 'spec' }))
    page.exposeFunction('testOpts', () => ({ remoteBaseUri }))
    page.on('console', async (msg) => {
      const args = await log(msg)
      if (args[0] && typeof args[0] === 'string') {
        if (args[0] === '%d failures') {
          await exit(parseInt(args[1]))
        } else if (args[0].startsWith('Unable to start the browser tests suite:')) {
          await exit(1)
        }
      }
    })
    await page.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle2' })
    browser.close()
    if (mockServer) {
      await mockServer.close()
    }
  } catch (err) {
    console.error('Unable to run tests using Puppeteer', err)
    await exit(1)
  }
})().catch(async (err) => {
  console.error('Unable to launch Chrome with Puppeteer', err)
  await exit(1)
})
