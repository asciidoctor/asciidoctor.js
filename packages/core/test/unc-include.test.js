// Integration tests — include directive resolution with Windows UNC base_dir.
//
// Uses a mock IncludeProcessor (Approach A) to intercept include calls and
// verify that path resolution works correctly without needing a real UNC
// filesystem mount.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import { Extensions } from '../src/extensions.js'
import { convertStringToEmbedded } from './harness.js'

// Build a registry with one IncludeProcessor.  `onInclude` is called with
// { target, dir } for each include encountered, then `lines` is pushed as the
// file content.  `fileMap` maps target names to the lines to return.
function makeRegistry(fileMap, captured = []) {
  const registry = Extensions.create()
  registry.includeProcessor(function () {
    this.process(function (doc, reader, target, attrs) {
      const dir = reader._dir
      captured.push({ target, dir })
      const content = fileMap[target] ?? fileMap['*'] ?? ['']
      const file = dir === '.' ? target : `${dir}/${target}`
      reader.pushInclude(content, file, target, 1, attrs)
    })
  })
  return registry
}

// ── reader._dir at include time ───────────────────────────────────────────────

describe('UNC include — reader._dir reflects base_dir', () => {
  test('reader._dir equals UNC base_dir for top-level include', async () => {
    const captured = []
    const registry = makeRegistry(
      { 'chapter.adoc': ['Chapter content.'] },
      captured
    )

    await load('include::chapter.adoc[]', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
      extension_registry: registry,
    })

    assert.equal(captured.length, 1)
    assert.equal(captured[0].target, 'chapter.adoc')
    assert.equal(captured[0].dir, '//server/share/docs')
  })

  test('reader._dir reflects the UNC directory of the including file (nested)', async () => {
    // main.adoc (base_dir //server/share/docs) includes chapter.adoc
    // chapter.adoc includes shared/snippet.adoc
    // → second include must see _dir = //server/share/docs (dir of chapter.adoc)
    const captured = []
    let callCount = 0

    const registry = Extensions.create()
    registry.includeProcessor(function () {
      this.process(function (doc, reader, target, attrs) {
        const dir = reader._dir
        callCount++
        captured.push({ call: callCount, target, dir })

        if (callCount === 1) {
          // Push chapter.adoc content, which itself contains a nested include.
          const file = `${dir}/${target}`
          reader.pushInclude(
            ['include::shared/snippet.adoc[]'],
            file,
            target,
            1,
            attrs
          )
        } else {
          // Nested include: shared/snippet.adoc
          reader.pushInclude(
            ['Snippet content.'],
            `${dir}/${target}`,
            target,
            1,
            attrs
          )
        }
      })
    })

    await load('include::chapter.adoc[]', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
      extension_registry: registry,
    })

    assert.equal(captured.length, 2)
    // First include: from base_dir
    assert.equal(captured[0].target, 'chapter.adoc')
    assert.equal(captured[0].dir, '//server/share/docs')
    // Second include: from the dir of chapter.adoc (same UNC dir)
    assert.equal(captured[1].target, 'shared/snippet.adoc')
    assert.equal(captured[1].dir, '//server/share/docs')
  })
})

// ── UNC file path after pushInclude ──────────────────────────────────────────

describe('UNC include — pushInclude sets a UNC _dir for subsequent includes', () => {
  test('pushing a file under //server/share/sub sets _dir to the UNC subdir', async () => {
    const captured = []
    let callCount = 0

    const registry = Extensions.create()
    registry.includeProcessor(function () {
      this.process(function (doc, reader, target, attrs) {
        callCount++
        captured.push({ call: callCount, dir: reader._dir, target })

        if (callCount === 1) {
          // chapter.adoc lives in //server/share/docs/sub/
          const file = `//server/share/docs/sub/${target}`
          reader.pushInclude(['include::detail.adoc[]'], file, target, 1, attrs)
        } else {
          reader.pushInclude(
            ['Detail.'],
            `${reader._dir}/${target}`,
            target,
            1,
            attrs
          )
        }
      })
    })

    await load('include::chapter.adoc[]', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
      extension_registry: registry,
    })

    // Second call: reader._dir must be the UNC sub-directory of chapter.adoc
    assert.equal(captured[1].dir, '//server/share/docs/sub')
    assert.equal(captured[1].target, 'detail.adoc')
  })
})

// ── Absolute UNC include target ───────────────────────────────────────────────

describe('UNC include — absolute UNC target', () => {
  test('absolute UNC target is passed as-is to the include processor', async () => {
    const captured = []
    const registry = makeRegistry({ '*': ['Shared content.'] }, captured)

    await load('include:://server/share/shared/snippet.adoc[]', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
      extension_registry: registry,
    })

    assert.equal(captured.length, 1)
    assert.equal(captured[0].target, '//server/share/shared/snippet.adoc')
  })
})

// ── Included content appears in document output ───────────────────────────────

describe('UNC include — document output contains included content', () => {
  test('included content from UNC path is present in converted output', async () => {
    const registry = makeRegistry({
      'chapter.adoc': ['== Chapter A', '', 'From the UNC share.'],
    })

    const output = await convertStringToEmbedded('include::chapter.adoc[]', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
      extension_registry: registry,
    })

    assert.ok(output.includes('Chapter A'), `output: ${output}`)
    assert.ok(output.includes('From the UNC share.'), `output: ${output}`)
  })

  test('nested UNC includes compose correctly in output', async () => {
    let callCount = 0
    const registry = Extensions.create()
    registry.includeProcessor(function () {
      this.process(function (doc, reader, target, attrs) {
        callCount++
        if (callCount === 1) {
          const file = `${reader._dir}/${target}`
          reader.pushInclude(
            ['Header from chapter.', '', 'include::footnote.adoc[]'],
            file,
            target,
            1,
            attrs
          )
        } else {
          reader.pushInclude(
            ['Footnote text.'],
            `${reader._dir}/${target}`,
            target,
            1,
            attrs
          )
        }
      })
    })

    const output = await convertStringToEmbedded('include::chapter.adoc[]', {
      safe: 'unsafe',
      base_dir: '//server/share/docs',
      extension_registry: registry,
    })

    assert.ok(output.includes('Header from chapter.'), `output: ${output}`)
    assert.ok(output.includes('Footnote text.'), `output: ${output}`)
  })
})
