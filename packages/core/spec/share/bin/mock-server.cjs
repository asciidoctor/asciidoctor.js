'use strict'

const portfinder = require('portfinder')
const ServerMock = require('mock-http-server')

let server

// ignore "possible EventEmitter memory leak detected" warning message
process.setMaxListeners(0)
process.on('message', (msg) => {
  if (msg.event === 'exit') {
    process.send({ event: 'exiting' })
    process.exit(0)
  } else if (msg.event === 'configure') {
    server.on(msg.data)
  } else if (msg.event === 'resetRequests') {
    server.resetRequests()
    process.send({ event: 'requestsCleared' })
  } else if (msg.event === 'getRequests') {
    process.send({ event: 'requestsReceived', requestsReceived: server.requests() })
  }
})

portfinder.basePort = 3000
portfinder.getPort((err, port) => {
  if (err) {
    throw err
  }
  server = new ServerMock({ host: 'localhost', port: port })
  server.start(() => {
    console.log(`Running at http://localhost:${port}`)
    process.send({ event: 'started', port: port })
  })
})
