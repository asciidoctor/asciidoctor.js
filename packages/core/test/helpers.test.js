// Ported from helpers_test.rb

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { ImageDataUriRx } from '../src/rx.js'

describe('Helpers', () => {
  describe('API', () => {
    test('ImageDataUriRx should recognize an empty data URI', () => {
      assert.match('data:image/png;base64,', ImageDataUriRx)
    })

    test('ImageDataUriRx should recognize a valid data URI', () => {
      assert.match(
        'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=',
        ImageDataUriRx
      )
    })

    test('ImageDataUriRx should not recognize an invalid data URI', () => {
      assert.doesNotMatch('data:image/ppm;base64,yadayadayada', ImageDataUriRx)
    })
  })
})
