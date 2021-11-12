'use strict'

const BuilderModule = require('./module/builder.js')

;(async () => {
  try {
    await new BuilderModule().build()
  } catch (err) {
    console.error(err.toString())
    process.exit(1)
  }
})()
