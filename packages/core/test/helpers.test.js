// Ported from helpers_test.rb

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { basename, extname, isExtname, rootname } from '../src/helpers.js'
import { ImageDataUriRx } from '../src/rx.js'

describe('Helpers', () => {
  describe('URIs and Paths', () => {
    test('rootname should return file name without extension', () => {
      assert.equal(rootname('main.adoc'), 'main')
      assert.equal(rootname('docs/main.adoc'), 'docs/main')
    })

    test('rootname should return file name if it has no extension', () => {
      assert.equal(rootname('main'), 'main')
      assert.equal(rootname('docs/main'), 'docs/main')
    })

    test('rootname should return file name if it ends in dot', () => {
      assert.equal(rootname('main.'), 'main.')
      assert.equal(rootname('docs/main.'), 'docs/main.')
    })

    test('rootname should ignore dot not in last segment', () => {
      assert.equal(rootname('include.d/main'), 'include.d/main')
      assert.equal(rootname('include.d/main.adoc'), 'include.d/main')
    })

    test('basename should return last file segment', () => {
      assert.equal(basename('main.adoc'), 'main.adoc')
      assert.equal(basename('docs/main.adoc'), 'main.adoc')
    })

    test('basename should drop extname if requested', () => {
      assert.equal(basename('main.adoc', true), 'main')
      assert.equal(basename('main.', true), 'main.')
      assert.equal(basename('main.adoc', '.adoc'), 'main')
    })

    test('isExtname should return whether path contains an extname', () => {
      assert.ok(isExtname('document.adoc'))
      assert.ok(isExtname('path/to/document.adoc'))
      assert.ok(!isExtname('basename'))
      assert.ok(!isExtname('include.d/basename'))
      assert.ok(!isExtname('path.'))
    })

    test('extname should return file extension', () => {
      assert.equal(extname('document.adoc'), '.adoc')
      assert.equal(extname('path/to/document.adoc'), '.adoc')
      assert.equal(extname('basename'), '')
      assert.equal(extname('include.d/basename'), '')
      assert.equal(extname('path.'), '')
      assert.equal(extname('basename', null), null)
    })
  })

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
