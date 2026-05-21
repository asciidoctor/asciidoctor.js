// Integration tests — Windows UNC base_dir propagation through the document pipeline.
//
// Verifies that passing a UNC path as base_dir correctly sets docdir and
// doc.baseDir throughout the pipeline. Tests use posixified '//server/share'
// form (which is what the code internalises) and the raw Windows backslash
// form '\\server\share' (which must be accepted and normalised).

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { SafeMode } from '../src/constants.js'
import { convertStringToEmbedded } from './harness.js'

const INPUT = '= Title\n\nHello.'

// ── docdir and baseDir ────────────────────────────────────────────────────────

describe('UNC base_dir — docdir attribute and doc.baseDir', () => {
  test('posixified UNC base_dir sets docdir correctly', async () => {
    const doc = await load(INPUT, {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
    })
    assert.equal(doc.getAttribute('docdir'), '//server/share/docs')
    assert.equal(doc.baseDir, '//server/share/docs')
  })

  test('UNC base_dir with deeper subdirectory', async () => {
    const doc = await load(INPUT, {
      safe: 'unsafe',
      base_dir: '//server/share/project/docs',
    })
    assert.equal(doc.getAttribute('docdir'), '//server/share/project/docs')
  })

  test('UNC base_dir with ".." is expanded correctly', async () => {
    const doc = await load(INPUT, {
      safe: 'unsafe',
      base_dir: '//server/share/project/../docs',
    })
    assert.equal(doc.getAttribute('docdir'), '//server/share/docs')
  })

  test('Windows backslash UNC base_dir is posixified to "//..."', async () => {
    const doc = await load(INPUT, {
      safe: 'unsafe',
      base_dir: '\\\\server\\share\\docs',
    })
    assert.equal(doc.getAttribute('docdir'), '//server/share/docs')
    assert.equal(doc.baseDir, '//server/share/docs')
  })
})

// ── safe mode interaction ─────────────────────────────────────────────────────

describe('UNC base_dir — safe mode interaction', () => {
  test('SERVER mode clears docdir even with UNC base_dir', async () => {
    const doc = await load(INPUT, {
      safe: SafeMode.SERVER,
      base_dir: '//server/share/docs',
    })
    assert.equal(doc.getAttribute('docdir'), '')
  })

  test('SAFE mode preserves docdir with UNC base_dir', async () => {
    const doc = await load(INPUT, {
      safe: SafeMode.SAFE,
      base_dir: '//server/share/docs',
    })
    assert.equal(doc.getAttribute('docdir'), '//server/share/docs')
  })
})

// ── attribute substitution in document content ────────────────────────────────

describe('UNC base_dir — {docdir} substitution in content', () => {
  test('{docdir} substitution renders the UNC path', async () => {
    const output = await convertStringToEmbedded('{docdir}', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
    })
    assert.ok(
      output.includes('//server/share/docs'),
      `Expected UNC path in output but got: ${output}`
    )
  })

  test('{docdir} is empty in SERVER mode', async () => {
    const output = await convertStringToEmbedded('docdir={docdir}', {
      safe: SafeMode.SERVER,
      base_dir: '//server/share/docs',
    })
    assert.ok(
      output.includes('docdir=') && !output.includes('//server'),
      `Expected empty docdir but got: ${output}`
    )
  })
})
