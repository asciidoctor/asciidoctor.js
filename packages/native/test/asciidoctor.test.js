import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import Asciidoctor from '../src/index.js'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

const asciidoctor = Asciidoctor()

test('should return Asciidoctor.js version', () => {
  assert.equal(asciidoctor.getVersion(), packageJson.version)
})

test('should return default logger', () => {
  const defaultLogger = asciidoctor.LoggerManager.getLogger()
  assert.equal(defaultLogger.getLevel(),2)
  assert.equal(defaultLogger.getProgramName(),'asciidoctor')
})

describe('Safe mode', () => {
  test('should get constants', () => {
    assert.equal(asciidoctor.SafeMode.UNSAFE,0)
    assert.equal(asciidoctor.SafeMode.SAFE,1)
    assert.equal(asciidoctor.SafeMode.SERVER,10)
    assert.equal(asciidoctor.SafeMode.SECURE,20)
  })
  test('should get value for name', () => {
    assert.equal(asciidoctor.SafeMode.getValueForName('secure'),20)
  })
  test('should get name for value', () => {
    assert.equal(asciidoctor.SafeMode.getNameForValue(0),'unsafe')
  })
  test('should get names', () => {
    assert.deepEqual(asciidoctor.SafeMode.getNames(), ['unsafe', 'safe', 'server', 'secure'])
  })
})
