// Regression test — concurrent load()/convert() calls and the lazy `node:fs`
// initializer shared by reader.js (fileExists) and abstract_node.js
// (isReadable), see src/node_fs.js.
//
// https://github.com/asciidoctor/asciidoctor.js/issues/1882: the initializer
// used to publish its `_fsp` handle one microtask ahead of the `_fsConstants`
// it needs. A concurrent call entering that window dereferenced
// `undefined.F_OK` / `undefined.R_OK`, the TypeError was swallowed by the
// caller's catch, and an existing file was reported as missing — rendering
// `Unresolved directive` for an include, or an empty data URI for an image.
//
// The race can only happen on the *first* use of `node:fs` in a module
// instance, so the sweep below must be the first thing this file does — hence a
// single document exercising both call sites at once. The Node.js test runner
// gives each test file its own process, which keeps that true.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from '../src/load.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'fixtures')

// An include (reader.js) and an embedded image (abstract_node.js), so that a
// single cold-start sweep covers both users of the lazy initializer.
const INPUT = ['include::include-file.adoc[]', '', 'image::dot.gif[]'].join(
  '\n'
)

// Spread the start of the jobs across microtask offsets so that some of them
// land inside the window where the initializer has published its first global
// but not yet its second.
const MICROTASK_OFFSETS = 100

async function convertAtOffset(offset) {
  for (let i = 0; i < offset; i++) await Promise.resolve()
  const doc = await load(INPUT, {
    safe: 'safe',
    base_dir: FIXTURES_DIR,
    attributes: { 'data-uri': '' },
  })
  return [offset, await doc.convert()]
}

describe('concurrent load() — lazy node:fs initialization', () => {
  test('resolves every include and embeds every image, at any microtask offset', async () => {
    const results = await Promise.all(
      Array.from({ length: MICROTASK_OFFSETS + 1 }, (_, offset) =>
        convertAtOffset(offset)
      )
    )

    const unresolved = results
      .filter(([, html]) => html.includes('Unresolved directive'))
      .map(([offset]) => offset)
    assert.deepEqual(
      unresolved,
      [],
      `include file not found at microtask offsets: ${unresolved.join(', ')}`
    )

    const notEmbedded = results
      .filter(([, html]) => !html.includes('src="data:image/gif;base64,R0lGOD'))
      .map(([offset]) => offset)
    assert.deepEqual(
      notEmbedded,
      [],
      `image to embed not found or not readable at microtask offsets: ${notEmbedded.join(', ')}`
    )

    for (const [, html] of results) {
      assert.ok(html.includes('first line of included content'))
    }
  })
})
