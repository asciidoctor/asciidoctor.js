import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { Callouts } from '../src/callouts.js'

describe('Callouts', () => {
  test('register should add a callout and return its id', () => {
    const callouts = new Callouts()
    const id = callouts.register(1)
    assert.equal(id, 'CO1-1')
    assert.equal(callouts.getCurrentList().length, 1)
    assert.equal(callouts.getCurrentList()[0].ordinal, 1)
    assert.equal(callouts.getCurrentList()[0].id, 'CO1-1')
  })

  test('register should increment the callout index for each registration', () => {
    const callouts = new Callouts()
    const id1 = callouts.register(1)
    const id2 = callouts.register(2)
    const id3 = callouts.register(3)
    assert.equal(id1, 'CO1-1')
    assert.equal(id2, 'CO1-2')
    assert.equal(id3, 'CO1-3')
  })

  test('getCalloutIds should return space-separated ids for a given list item ordinal', () => {
    const callouts = new Callouts()
    callouts.register(1)
    callouts.register(2)
    callouts.register(1)
    assert.equal(callouts.getCalloutIds(1), 'CO1-1 CO1-3')
    assert.equal(callouts.getCalloutIds(2), 'CO1-2')
    assert.equal(callouts.getCalloutIds(3), '')
  })

  test('nextList should advance to a new empty list', () => {
    const callouts = new Callouts()
    callouts.register(1)
    assert.equal(callouts.getListIndex(), 1)
    callouts.nextList()
    assert.equal(callouts.getListIndex(), 2)
    assert.deepEqual(callouts.getCurrentList(), [])
    assert.equal(callouts.getLists().length, 2)
  })

  test('readNextId should return ids in registration order', () => {
    const callouts = new Callouts()
    callouts.register(1)
    callouts.register(2)
    callouts.register(3)
    callouts.rewind()
    assert.equal(callouts.readNextId(), 'CO1-1')
    assert.equal(callouts.readNextId(), 'CO1-2')
    assert.equal(callouts.readNextId(), 'CO1-3')
  })

  test('readNextId should return null when past the end of the list', () => {
    const callouts = new Callouts()
    callouts.register(1)
    callouts.rewind()
    callouts.readNextId()
    assert.equal(callouts.readNextId(), null)
  })

  test('rewind should reset list pointer to the first list', () => {
    const callouts = new Callouts()
    callouts.register(1)
    callouts.nextList()
    callouts.register(1)
    assert.equal(callouts.getListIndex(), 2)
    callouts.rewind()
    assert.equal(callouts.getListIndex(), 1)
    assert.equal(callouts.getCurrentList().length, 1)
  })

  test('convert should populate the callouts', async () => {
    const doc = await load(`
[source,javascript]
----
import { load } from '@asciidoctor/core' // <1>
const doc = await load('hello') // <2>

await doc.convert() // <3>
----
<1> import the load function
<2> load the document
<3> convert the document`, { safe: 'safe', catalog_assets: true })
    await doc.convert()
    const callouts = doc.getCallouts()
    assert.equal(callouts.getLists()[0].length, 3)
    assert.equal(callouts.getLists()[0][0].ordinal, 1)
    assert.equal(callouts.getLists()[0][0].id, 'CO1-1')
    assert.deepEqual(callouts.getLists()[1], [])
    assert.equal(callouts.getListIndex(), 2)
    assert.equal(callouts.getCalloutIds(1), '')
    assert.deepEqual(callouts.getCurrentList(), [])
  })
})