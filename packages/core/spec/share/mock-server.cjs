'use strict'

const fs = require('fs')
const ospath = require('path')
const childProcess = require('child_process')

class MockServer {
  constructor (listener) {
    // we need to use "fork" to spawn a new Node.js process otherwise we will create a deadlock.
    this.childProcess = childProcess.fork(ospath.join(__dirname, 'bin', 'mock-server.cjs'))
    this.childProcess.on('message', (msg) => {
      if (msg.event === 'started') {
        // auto-configure
        this.childProcess.send({
          event: 'configure',
          data: {
            method: 'GET',
            path: '/foo.adoc',
            reply: {
              status: 200,
              headers: { 'content-type': 'text/plain' },
              body: 'Foo'
            }
          }
        })
        this.childProcess.send({
          event: 'configure',
          data: {
            method: 'GET',
            path: '/include-lines.adoc',
            reply: {
              status: 200,
              headers: { 'content-type': 'text/plain' },
              body: `First line
Second line
Third line
Fourth line
`
            }
          }
        })
        this.childProcess.send({
          event: 'configure',
          data: {
            method: 'GET',
            path: '/dir/bar.adoc',
            reply: {
              status: 200,
              headers: { 'content-type': 'text/plain' },
              body: 'Bar'
            }
          }
        })
        this.childProcess.send({
          event: 'configure',
          data: {
            method: 'GET',
            path: '/include-tag.adoc',
            reply: {
              status: 200,
              headers: { 'content-type': 'text/plain' },
              body: `// tag::a[]
tag-a
// end::a[]
// tag::b[]
tag-b
// end::b[]
`
            }
          }
        })
        this.childProcess.send({
          event: 'configure',
          data: {
            method: 'GET',
            path: '/dir/1.0.0/release.adoc',
            reply: {
              status: 200,
              headers: { 'content-type': 'text/plain' },
              body: `= Release note

- Emojis
- JavaScript client
- New Dashboard
`
            }
          }
        })
        this.childProcess.send({
          event: 'configure',
          data: {
            method: 'GET',
            path: '/cat.png',
            reply: {
              status: 200,
              headers: { 'content-type': 'image/png' },
              body: fs.readFileSync(ospath.join(__dirname, '..', 'fixtures', 'images', 'cat.png'), 'binary')
            }
          }
        })
      }
    })
    if (listener) {
      this.childProcess.on('message', listener)
    }
  }

  async close () {
    return new Promise((resolve, reject) => {
      this.childProcess.on('message', (msg) => {
        if (msg.event === 'exiting') {
          resolve()
        }
      })
      this.childProcess.send({ event: 'exit' })
    })
  }

  registerFiles (files) {
    for (const file of files) {
      const webPath = file.webPath
      const path = file.path
      this.childProcess.send({
        event: 'configure',
        data: {
          method: 'GET',
          path: webPath,
          reply: {
            status: 200,
            headers: { 'content-type': file.mimetype },
            body: fs.readFileSync(path, file.mimetype === 'image/png' || file.mimetype === 'image/jpg' ? 'binary' : 'utf8')
          }
        }
      })
    }
  }
}

module.exports = MockServer
