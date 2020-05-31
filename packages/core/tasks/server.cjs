'use strict'

const httpServer = require('http-server')
const portfinder = require('portfinder')
const log = require('bestikk-log')

const args = process.argv.slice(2)
const port = args[0]

const server = httpServer.createServer({})

const listen = function (port) {
  // Callback triggered when server is successfully listening. Hurray!
  server.listen(port, () => log.info(`Server listening on: http://localhost:${port}`))
}

if (!port) {
  portfinder.basePort = 8080
  portfinder.getPort((err, port) => {
    if (err) {
      throw err
    }
    listen(port)
  })
} else {
  listen(port)
}
