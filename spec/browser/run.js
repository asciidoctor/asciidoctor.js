const { createServer } = require('http')
const getPort = require('get-port')
const handler = require('serve-handler')
const util = require('util')
const browser = process.env.PUPPETEER_BROWSER || 'chrome'
const puppeteer = browser === 'firefox' ? require('puppeteer-firefox') : require('puppeteer')

// puppeteer options
const opts = {
  headless: true,
  timeout: 10000,
  args: ['--allow-file-access-from-files', '--no-sandbox']
}

const log = async (event) => {
  const message = await getMessage(event)
  const type = event.type()
  let logger
  if (type === 'warning') {
    logger = console.warn
  } else {
    logger = console[type]
  }
  logger.call(this, message)
  return message
}

const getMessage = async (event) => {
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
  return message
}

const waitWithTimeout = function (ms, promise) {
  let id
  const timeout = new Promise((resolve, reject) => {
    id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`timeout after ${ms}ms.`))
    }, ms)
  })
  return Promise.race([
    promise.then((result) => {
      clearTimeout(id)
      return result
    }),
    timeout
  ])
}

const waitEvent = function (emitter, eventName, predicate = async () => true) {
  return new Promise(resolve => {
    emitter.on(eventName, async function listener (event) {
      if (!await predicate(event)) {
        return
      }
      emitter.removeListener(eventName, listener)
      resolve(event)
    })
  })
};

(async function () {
  try {
    const workingDir = process.cwd()
    const port = await getPort()
    const httpOptions = {
      public: workingDir,
      cleanUrls: false
    }
    const browser = await puppeteer.launch(opts)
    const page = await browser.newPage()
    await new Promise((resolve, reject) => {
      const server = createServer(async (req, res) => {
        return handler(req, res, httpOptions)
      }).listen(port, async () => {
        try {
          browser.on('error', reject)
          server.on('error', reject)
          page.on('error', reject)
          page.on('console', async (event) => {
            const message = await log(event)
            if (message) {
              const failures = message.match(/([0-9]+) failures/)
              if (failures !== null) {
                process.exit(parseInt(failures))
              } else if (message && message.startsWith('Unable to start the browser tests suite:')) {
                process.exit(1)
              }
            }
          })
          let options
          if (browser === 'chrome') {
            options = { waitUntil: 'networkidle2' }
          } else {
            options = {}
          }
          await page.goto(`http://localhost:${port}/spec/browser/index.html?reporter=spec`, options)
          await waitWithTimeout(5000, waitEvent(page, 'console', async (event) => {
            const message = await getMessage(event)
            if (message) {
              return message === '%d failures' || message.startsWith('Unable to start the browser tests suite:') || message.match(/[\s]*[0-9]+ passing.*/) !== null
            }
            return false
          }))
          resolve()
        } catch (error) {
          reject(error)
        } finally {
          await page.close()
          await browser.close()
          server.close()
        }
      })
    })
  } catch (err) {
    console.error('Unable to run tests using Puppeteer', err)
    process.exit(1)
  }
})().catch((err) => {
  console.error(`Unable to launch ${browser} with Puppeteer`, err)
  process.exit(1)
})
