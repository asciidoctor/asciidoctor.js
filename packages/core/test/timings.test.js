import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { Timings, convert } from '../src/index.js'

describe('Timings', () => {
  test('should print timings to an object with a write function', async () => {
    const data = []
    const out = {
      write (chunk) { data.push(chunk) },
    }
    const timings = Timings.create()
    await convert('Hello *world*', { timings })
    timings.printReport(out, 'stdin')
    assert.equal(data.length, 4)
    assert.equal(data[0], 'Input file: stdin\n')
  })

  test('should print timings to console', async () => {
    const defaultLog = console.log
    const data = []
    try {
      console.log = (...args) => { data.push({ arguments: args }) }
      const timings = Timings.create()
      await convert('Hello *world*', { timings })
      timings.printReport(console, 'stdin')
      assert.equal(data.length, 4)
      assert.equal(data[0].arguments[0], 'Input file: stdin')
    } finally {
      console.log = defaultLog
    }
  })

  test('should print timings to an object with a log function', async () => {
    const data = []
    const out = {
      log (message) { data.push(message) },
    }
    const timings = Timings.create()
    await convert('Hello *world*', { timings })
    timings.printReport(out, 'stdin')
    assert.equal(data.length, 4)
    assert.equal(data[0], 'Input file: stdin')
  })

  test('should print timings to the default output (console.log)', async () => {
    const defaultLog = console.log
    const data = []
    try {
      console.log = (...args) => { data.push({ arguments: args }) }
      const timings = Timings.create()
      await convert('Hello *world*', { timings })
      timings.printReport(undefined, 'stdin')
      assert.equal(data.length, 4)
      assert.equal(data[0].arguments[0], 'Input file: stdin')
    } finally {
      console.log = defaultLog
    }
  })
})