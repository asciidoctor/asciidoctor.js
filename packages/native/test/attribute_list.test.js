import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { AttributeList } from '../src/attribute_list.js'

// Helper: creates a minimal document stub for tests that require apply_subs behaviour.
// By default applySubs should not be called (override as needed in individual tests).
function emptyDocument (opts = {}) {
  const attributes = opts.attributes ?? {}
  return {
    attributes,
    applySubs (value) {
      throw new Error('applySubs should not be called')
    },
  }
}

describe('AttributeList', () => {
  test('collect unnamed attribute', async () => {
    const attributes = {}
    const line = 'quote'
    const expected = { 1: 'quote' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute double-quoted', async () => {
    const attributes = {}
    const line = '"quote"'
    const expected = { 1: 'quote' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect empty unnamed attribute double-quoted', async () => {
    const attributes = {}
    const line = '""'
    const expected = { 1: '' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute double-quoted containing escaped quote', async () => {
    const attributes = {}
    const line = '"ba\\"zaar"'
    const expected = { 1: 'ba"zaar' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute single-quoted', async () => {
    const attributes = {}
    const line = "'quote'"
    const expected = { 1: 'quote' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect empty unnamed attribute single-quoted', async () => {
    const attributes = {}
    const line = "''"
    const expected = { 1: '' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect isolated single quote positional attribute', async () => {
    const attributes = {}
    const line = "'"
    const expected = { 1: "'" }
    const doc = emptyDocument()
    await new AttributeList(line, doc).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect isolated single quote attribute value', async () => {
    const attributes = {}
    const line = "name='"
    const expected = { name: "'" }
    const doc = emptyDocument()
    await new AttributeList(line, doc).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect attribute value as is if it has only leading single quote', async () => {
    const attributes = {}
    const line = "name='{val}"
    const expected = { name: "'{val}" }
    const doc = emptyDocument({ attributes: { val: 'val' } })
    await new AttributeList(line, doc).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute single-quoted containing escaped quote', async () => {
    const attributes = {}
    const line = "'ba\\'zaar'"
    const expected = { 1: "ba'zaar" }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute with dangling delimiter', async () => {
    const attributes = {}
    const line = 'quote , '
    const expected = { 1: 'quote', 2: null }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute in second position after empty attribute', async () => {
    const attributes = {}
    const line = ', John Smith'
    const expected = { 1: null, 2: 'John Smith' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attributes', async () => {
    const attributes = {}
    const line = 'first, second one, third'
    const expected = { 1: 'first', 2: 'second one', 3: 'third' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect blank unnamed attributes', async () => {
    const attributes = {}
    const line = 'first,,third,'
    const expected = { 1: 'first', 2: null, 3: 'third', 4: null }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect unnamed attribute enclosed in equal signs', async () => {
    const attributes = {}
    const line = '=foo='
    const expected = { 1: '=foo=' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attribute', async () => {
    const attributes = {}
    const line = 'foo=bar'
    const expected = { foo: 'bar' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attribute double-quoted', async () => {
    const attributes = {}
    const line = 'foo="bar"'
    const expected = { foo: 'bar' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attribute with double-quoted empty value', async () => {
    const attributes = {}
    const line = 'height=100,caption="",link="images/octocat.png"'
    const expected = { height: '100', caption: '', link: 'images/octocat.png' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attribute single-quoted', async () => {
    const attributes = {}
    const line = "foo='bar'"
    const expected = { foo: 'bar' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attribute with single-quoted empty value', async () => {
    const attributes = {}
    const line = "height=100,caption='',link='images/octocat.png'"
    const expected = { height: '100', caption: '', link: 'images/octocat.png' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect single named attribute with empty value', async () => {
    const attributes = {}
    const line = 'foo='
    const expected = { foo: '' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect single named attribute with empty value when followed by other attributes', async () => {
    const attributes = {}
    const line = 'foo=,bar=baz'
    const expected = { foo: '', bar: 'baz' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attributes unquoted', async () => {
    const attributes = {}
    const line = 'first=value, second=two, third=3'
    const expected = { first: 'value', second: 'two', third: '3' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attributes quoted', async () => {
    const attributes = {}
    const line = "first='value', second=\"value two\", third=three"
    const expected = { first: 'value', second: 'value two', third: 'three' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect named attributes quoted containing non-semantic spaces', async () => {
    const attributes = {}
    const line = "     first    =     'value', second     =\"value two\"     , third=       three      "
    const expected = { first: 'value', second: 'value two', third: 'three' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect mixed named and unnamed attributes', async () => {
    const attributes = {}
    const line = 'first, second="value two", third=three, Sherlock Holmes'
    const expected = { 1: 'first', second: 'value two', third: 'three', 4: 'Sherlock Holmes' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect mixed empty named and blank unnamed attributes', async () => {
    const attributes = {}
    const line = 'first,,third=,,fifth=five'
    const expected = { 1: 'first', 2: null, third: '', 4: null, fifth: 'five' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect options attribute', async () => {
    const attributes = {}
    const line = "quote, options='opt1,,opt2 , opt3'"
    const expected = { 1: 'quote', 'opt1-option': '', 'opt2-option': '', 'opt3-option': '' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect opts attribute as options', async () => {
    const attributes = {}
    const line = "quote, opts='opt1,,opt2 , opt3'"
    const expected = { 1: 'quote', 'opt1-option': '', 'opt2-option': '', 'opt3-option': '' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('should ignore options attribute if empty', async () => {
    const attributes = {}
    const line = 'quote, opts='
    const expected = { 1: 'quote' }
    await new AttributeList(line).parseInto(attributes)
    assert.deepEqual(attributes, expected)
  })

  test('collect and rekey unnamed attributes', async () => {
    const attributes = {}
    const line = 'first, second one, third, fourth'
    const expected = { 1: 'first', 2: 'second one', 3: 'third', 4: 'fourth', a: 'first', b: 'second one', c: 'third' }
    await new AttributeList(line).parseInto(attributes, ['a', 'b', 'c'])
    assert.deepEqual(attributes, expected)
  })

  test('should not assign nil to attribute mapped to missing positional attribute', async () => {
    const attributes = {}
    const line = 'alt text,,100'
    const expected = { 1: 'alt text', 2: null, 3: '100', alt: 'alt text', height: '100' }
    await new AttributeList(line).parseInto(attributes, ['alt', 'width', 'height'])
    assert.deepEqual(attributes, expected)
  })

  test('rekey positional attributes', () => {
    const attributes = { 1: 'source', 2: 'java' }
    const expected = { 1: 'source', 2: 'java', style: 'source', language: 'java' }
    AttributeList.rekey(attributes, ['style', 'language', 'linenums'])
    assert.deepEqual(attributes, expected)
  })
})
