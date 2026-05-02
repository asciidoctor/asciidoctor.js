// Tests for browser-specific include path resolution.
//
// Covers the rules described in docs/modules/test/pages/browser-include-test.adoc
// and implemented in src/browser/reader.js.
//
// These tests use a mock fetch to avoid real network requests.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { resolveBrowserIncludePath } from '../src/browser/reader.js'
import { PathResolver } from '../src/path_resolver.js'

// ── Minimal test doubles ──────────────────────────────────────────────────────

function makeDoc({
  baseDir = '.',
  allowUriRead = false,
  compatMode = false,
} = {}) {
  const pathResolver = new PathResolver()
  return {
    baseDir,
    pathResolver,
    getAttribute: (name) => {
      if (name === 'allow-uri-read') return allowUriRead ? true : null
      return null
    },
    hasAttribute: (name) => {
      if (name === 'compat-mode') return compatMode
      return false
    },
  }
}

function makeReader({ doc, dir = doc.baseDir, includeStack = [] } = {}) {
  const replaced = []
  return {
    _document: doc,
    _dir: dir,
    includeStack,
    replaceNextLine(text) {
      replaced.push(text)
      return true
    },
    _replaced: replaced,
  }
}

// ── Top-level includes ────────────────────────────────────────────────────────

describe('resolveBrowserIncludePath – top-level include', () => {
  test('target starts with file:// → inc_path = relpath = target', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(
      reader,
      'file:///home/user/doc.adoc',
      null
    )
    assert.deepEqual(result, [
      'file:///home/user/doc.adoc',
      'file:///home/user/doc.adoc',
    ])
  })

  test('target is http URL descending from baseDir → inc_path = relpath = target', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(
      reader,
      'http://example.com/docs/chapter.adoc',
      null
    )
    assert.deepEqual(result, [
      'http://example.com/docs/chapter.adoc',
      'http://example.com/docs/chapter.adoc',
    ])
  })

  test('target is http URL NOT descending from baseDir, no allow-uri-read → link replacement', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(
      reader,
      'http://other.com/file.adoc',
      'opts'
    )
    assert.equal(result, true)
    assert.equal(reader._replaced.length, 1)
    assert.match(reader._replaced[0], /^link:/)
  })

  test('target is http URL NOT descending from baseDir, allow-uri-read → allowed', () => {
    const doc = makeDoc({
      baseDir: 'http://example.com/docs',
      allowUriRead: true,
    })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(
      reader,
      'http://other.com/file.adoc',
      null
    )
    assert.deepEqual(result, [
      'http://other.com/file.adoc',
      'http://other.com/file.adoc',
    ])
  })

  test('target is absolute POSIX path → prepend file://', () => {
    const doc = makeDoc({ baseDir: 'http://example.com' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(
      reader,
      '/home/user/doc.adoc',
      null
    )
    assert.deepEqual(result, [
      'file:///home/user/doc.adoc',
      'file:///home/user/doc.adoc',
    ])
  })

  test('baseDir is . → inc_path = relpath = target', () => {
    const doc = makeDoc({ baseDir: '.' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(reader, 'chapter.adoc', null)
    assert.deepEqual(result, ['chapter.adoc', 'chapter.adoc'])
  })

  test('baseDir starts with file://, relative target → inc_path = baseDir/target, relpath = target', () => {
    const doc = makeDoc({ baseDir: 'file:///home/user/docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(reader, 'chapter.adoc', null)
    assert.deepEqual(result, [
      'file:///home/user/docs/chapter.adoc',
      'chapter.adoc',
    ])
  })

  test('baseDir is relative (non-URI), relative target → inc_path = baseDir/target, relpath = target', () => {
    const doc = makeDoc({ baseDir: 'docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(reader, 'chapter.adoc', null)
    assert.deepEqual(result, ['docs/chapter.adoc', 'chapter.adoc'])
  })

  test('baseDir is http URL, relative target → inc_path = baseDir/target, relpath = target', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(reader, 'chapter.adoc', null)
    assert.deepEqual(result, [
      'http://example.com/docs/chapter.adoc',
      'chapter.adoc',
    ])
  })

  test('target contains backslash → normalised to forward slash', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    const result = resolveBrowserIncludePath(reader, 'sub\\chapter.adoc', null)
    // pTarget = 'sub/chapter.adoc' → top-level http baseDir → relpath = pTarget = 'sub/chapter.adoc'
    assert.deepEqual(result, [
      'http://example.com/docs/sub/chapter.adoc',
      'sub/chapter.adoc',
    ])
  })
})

// ── Nested includes ───────────────────────────────────────────────────────────

describe('resolveBrowserIncludePath – nested include', () => {
  test('target starts with file:// → inc_path = relpath = target regardless of parentDir', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({
      doc,
      dir: 'http://example.com/docs/sub',
      includeStack: [1],
    })
    const result = resolveBrowserIncludePath(reader, 'file:///abs.adoc', null)
    assert.deepEqual(result, ['file:///abs.adoc', 'file:///abs.adoc'])
  })

  test('parentDir is . → inc_path = relpath = target', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc, dir: '.', includeStack: [1] })
    const result = resolveBrowserIncludePath(reader, 'nested.adoc', null)
    assert.deepEqual(result, ['nested.adoc', 'nested.adoc'])
  })

  test('parentDir starts with file://, inc_path descends from baseDir → relpath is path difference', () => {
    const doc = makeDoc({ baseDir: 'file:///home/user/docs' })
    const reader = makeReader({
      doc,
      dir: 'file:///home/user/docs/sub',
      includeStack: [1],
    })
    const result = resolveBrowserIncludePath(reader, 'nested.adoc', null)
    assert.deepEqual(result, [
      'file:///home/user/docs/sub/nested.adoc',
      'sub/nested.adoc',
    ])
  })

  test('parentDir starts with file://, baseDir is . → relpath = inc_path', () => {
    const doc = makeDoc({ baseDir: '.' })
    const reader = makeReader({
      doc,
      dir: 'file:///home/user/docs/sub',
      includeStack: [1],
    })
    const result = resolveBrowserIncludePath(reader, 'nested.adoc', null)
    assert.deepEqual(result, [
      'file:///home/user/docs/sub/nested.adoc',
      'file:///home/user/docs/sub/nested.adoc',
    ])
  })

  test('parentDir is http URL descending from baseDir → relpath is path difference', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({
      doc,
      dir: 'http://example.com/docs/sub',
      includeStack: [1],
    })
    const result = resolveBrowserIncludePath(reader, 'nested.adoc', null)
    assert.deepEqual(result, [
      'http://example.com/docs/sub/nested.adoc',
      'sub/nested.adoc',
    ])
  })

  test('parentDir is http URL NOT descending from baseDir, no allow-uri-read → link replacement', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({
      doc,
      dir: 'http://other.com/external',
      includeStack: [1],
    })
    const result = resolveBrowserIncludePath(reader, 'nested.adoc', null)
    assert.equal(result, true)
    assert.equal(reader._replaced.length, 1)
    assert.match(reader._replaced[0], /^link:/)
  })

  test('parentDir is http URL NOT descending from baseDir, allow-uri-read → relpath = target', () => {
    const doc = makeDoc({
      baseDir: 'http://example.com/docs',
      allowUriRead: true,
    })
    const reader = makeReader({
      doc,
      dir: 'http://other.com/external',
      includeStack: [1],
    })
    const result = resolveBrowserIncludePath(reader, 'nested.adoc', null)
    assert.deepEqual(result, [
      'http://other.com/external/nested.adoc',
      'nested.adoc',
    ])
  })
})

// ── Link replacement format ───────────────────────────────────────────────────

describe('resolveBrowserIncludePath – link replacement', () => {
  test('link includes role=include when compat-mode not set', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    resolveBrowserIncludePath(reader, 'http://other.com/file.adoc', 'opts')
    assert.equal(
      reader._replaced[0],
      'link:http://other.com/file.adoc[role=include,opts]'
    )
  })

  test('link omits role=include when compat-mode is set', () => {
    const doc = makeDoc({
      baseDir: 'http://example.com/docs',
      compatMode: true,
    })
    const reader = makeReader({ doc })
    resolveBrowserIncludePath(reader, 'http://other.com/file.adoc', 'opts')
    assert.equal(reader._replaced[0], 'link:http://other.com/file.adoc[opts]')
  })

  test('target with spaces is wrapped in pass:c[]', () => {
    const doc = makeDoc({ baseDir: 'http://example.com/docs' })
    const reader = makeReader({ doc })
    resolveBrowserIncludePath(reader, 'http://other.com/my file.adoc', null)
    assert.match(reader._replaced[0], /^link:pass:c\[/)
  })
})
