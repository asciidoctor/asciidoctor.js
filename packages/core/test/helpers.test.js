// Ported from helpers_test.rb

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { isDataUri } from '../src/helpers.js'

describe('Helpers', () => {
  describe('API', () => {
    test('isDataUri should recognize an empty data URI', () => {
      assert.ok(isDataUri('data:image/png;base64,'))
    })

    test('isDataUri should recognize a valid data URI', () => {
      assert.ok(
        isDataUri(
          'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
        )
      )
    })

    test('isDataUri should not recognize an invalid data URI', () => {
      assert.ok(!isDataUri('data:image/ppm;base64,yadayadayada'))
    })
  })
})
