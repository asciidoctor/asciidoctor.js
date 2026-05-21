// Unit tests for PathResolver — focusing on Windows UNC path handling.
//
// UNC paths arrive as '\\server\share\...' on Windows; posixify() converts
// them to '//server/share/...' which is the internal canonical form.
// These tests are platform-independent: they instantiate PathResolver with an
// explicit fileSeparator and workingDir so they produce the same result on
// macOS, Linux, and Windows.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isAbsolute } from 'node:path'

import { PathResolver } from '../src/path_resolver.js'
import { MemoryLogger, withLogger } from '../src/logging.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

// POSIX resolver with a fixed workingDir (avoids process.cwd() non-determinism).
const posix = () => new PathResolver('/', '/work')

// Windows-mode resolver: fileSeparator='\\', workingDir = UNC share.
const win = (wd = '//server/share') => new PathResolver('\\', wd)

// Capture PathResolver warnings without touching the global logger.
async function capturingWarns(fn) {
  const logger = MemoryLogger.create()
  await withLogger(logger, () => fn(new PathResolver('/', '/work'), logger))
  return logger.messages
}

// ── unc() ─────────────────────────────────────────────────────────────────────

describe('PathResolver#unc()', () => {
  test('detects posixified UNC root', () => {
    assert.ok(posix().unc('//server/share'))
  })

  test('detects posixified UNC path with subdirectory', () => {
    assert.ok(posix().unc('//server/share/docs/file.adoc'))
  })

  test('returns false for single-slash absolute path', () => {
    assert.equal(posix().unc('/server/share'), false)
  })

  test('returns false for Windows drive path', () => {
    assert.equal(posix().unc('C:/docs'), false)
  })

  test('returns false for relative path', () => {
    assert.equal(posix().unc('server/share'), false)
  })
})

// ── absolutePath() ────────────────────────────────────────────────────────────

describe('PathResolver#absolutePath()', () => {
  test('posixified UNC path is absolute', () => {
    assert.ok(posix().absolutePath('//server/share'))
  })

  test('posixified UNC path with subdirectory is absolute', () => {
    assert.ok(posix().absolutePath('//server/share/docs/file.adoc'))
  })

  test('single-slash absolute path is absolute', () => {
    assert.ok(posix().absolutePath('/absolute/path'))
  })

  test('relative path is not absolute', () => {
    assert.equal(posix().absolutePath('relative/path'), false)
  })

  test('Windows-mode: raw backslash UNC path is absolute', () => {
    assert.ok(win().absolutePath('\\\\server\\share'))
  })

  test('Windows-mode: raw backslash drive path is absolute', () => {
    assert.ok(win().absolutePath('C:\\docs'))
  })

  test('Windows-mode: forward-slash drive path is absolute', () => {
    assert.ok(win().absolutePath('C:/docs'))
  })

  test('POSIX-mode: raw backslash UNC path is NOT absolute (treated as relative)', () => {
    assert.equal(posix().absolutePath('\\\\server\\share'), false)
  })
})

// ── posixify() ────────────────────────────────────────────────────────────────

describe('PathResolver#posixify()', () => {
  test('converts Windows backslash UNC to forward-slash UNC', () => {
    assert.equal(
      win().posixify('\\\\server\\share\\docs'),
      '//server/share/docs'
    )
  })

  test('converts Windows backslash UNC file path', () => {
    assert.equal(
      win().posixify('\\\\server\\share\\docs\\file.adoc'),
      '//server/share/docs/file.adoc'
    )
  })

  test('leaves posixified path unchanged in POSIX mode', () => {
    assert.equal(posix().posixify('//server/share/docs'), '//server/share/docs')
  })

  test('returns empty string for empty input', () => {
    assert.equal(posix().posixify(''), '')
  })
})

// ── partitionPath() ───────────────────────────────────────────────────────────

describe('PathResolver#partitionPath()', () => {
  test('UNC path: root is "//" and segments exclude server from root', () => {
    const [segments, root] = posix().partitionPath(
      '//server/share/docs/file.adoc'
    )
    assert.equal(root, '//')
    assert.deepEqual(segments, ['server', 'share', 'docs', 'file.adoc'])
  })

  test('UNC path with only server and share', () => {
    const [segments, root] = posix().partitionPath('//server/share')
    assert.equal(root, '//')
    assert.deepEqual(segments, ['server', 'share'])
  })

  test('Unix absolute path: root is "/"', () => {
    const [segments, root] = posix().partitionPath('/absolute/path')
    assert.equal(root, '/')
    assert.deepEqual(segments, ['absolute', 'path'])
  })

  test('relative path: root is null', () => {
    const [segments, root] = posix().partitionPath('relative/path')
    assert.equal(root, null)
    assert.deepEqual(segments, ['relative', 'path'])
  })

  test('Windows-mode: raw backslash UNC is posixified before partition', () => {
    const [segments, root] = win().partitionPath('\\\\server\\share\\docs')
    assert.equal(root, '//')
    assert.deepEqual(segments, ['server', 'share', 'docs'])
  })
})

// ── joinPath() ────────────────────────────────────────────────────────────────

describe('PathResolver#joinPath()', () => {
  test('roundtrips UNC segments', () => {
    const result = posix().joinPath(
      ['server', 'share', 'docs', 'file.adoc'],
      '//'
    )
    assert.equal(result, '//server/share/docs/file.adoc')
  })

  test('roundtrips UNC server+share only', () => {
    assert.equal(posix().joinPath(['server', 'share'], '//'), '//server/share')
  })

  test('roundtrips Unix absolute path', () => {
    assert.equal(posix().joinPath(['absolute', 'path'], '/'), '/absolute/path')
  })

  test('roundtrips relative path (null root)', () => {
    assert.equal(posix().joinPath(['relative', 'path'], null), 'relative/path')
  })
})

// ── expandPath() ─────────────────────────────────────────────────────────────

describe('PathResolver#expandPath()', () => {
  test('resolves ".." in UNC path', () => {
    assert.equal(
      posix().expandPath('//server/share/../other'),
      '//server/other'
    )
  })

  test('removes "." in UNC path', () => {
    assert.equal(
      posix().expandPath('//server/share/./docs'),
      '//server/share/docs'
    )
  })

  test('resolves multiple ".." in UNC path', () => {
    assert.equal(
      posix().expandPath('//server/share/docs/sub/../../file.adoc'),
      '//server/share/file.adoc'
    )
  })

  test('leaves clean UNC path unchanged', () => {
    assert.equal(
      posix().expandPath('//server/share/docs'),
      '//server/share/docs'
    )
  })
})

// ── descendsFrom() ────────────────────────────────────────────────────────────

describe('PathResolver#descendsFrom()', () => {
  test('path in UNC subdirectory descends from base', () => {
    const offset = posix().descendsFrom(
      '//server/share/docs/file.adoc',
      '//server/share'
    )
    assert.ok(offset > 0, 'expected positive offset')
  })

  test('exact UNC match returns 0', () => {
    assert.equal(posix().descendsFrom('//server/share', '//server/share'), 0)
  })

  test('deeply nested UNC path descends from share', () => {
    const offset = posix().descendsFrom(
      '//server/share/a/b/c.adoc',
      '//server/share/a'
    )
    assert.ok(offset > 0)
  })

  test('path on different UNC server does not descend', () => {
    assert.equal(
      posix().descendsFrom('//other/share/file.adoc', '//server/share'),
      false
    )
  })

  test('path with matching prefix but different directory does not descend', () => {
    // '//server/sharemore' starts with '//server/share' textually but is NOT a subdir.
    assert.equal(
      posix().descendsFrom('//server/sharemore/file.adoc', '//server/share'),
      false
    )
  })

  test('path on same server but different share does not descend', () => {
    assert.equal(
      posix().descendsFrom('//server/other/file.adoc', '//server/share'),
      false
    )
  })
})

// ── relativePath() ────────────────────────────────────────────────────────────

describe('PathResolver#relativePath()', () => {
  test('file directly under UNC base', () => {
    assert.equal(
      posix().relativePath('//server/share/docs/file.adoc', '//server/share'),
      'docs/file.adoc'
    )
  })

  test('file in sibling directory of UNC base', () => {
    assert.equal(
      posix().relativePath('//server/share/file.adoc', '//server/share/docs'),
      '../file.adoc'
    )
  })

  test('file in deeper subdirectory', () => {
    assert.equal(
      posix().relativePath('//server/share/a/b/c.adoc', '//server/share/a'),
      'b/c.adoc'
    )
  })

  test('relative path is returned unchanged', () => {
    assert.equal(
      posix().relativePath('relative/path.adoc', '//server/share'),
      'relative/path.adoc'
    )
  })
})

// ── systemPath() ─────────────────────────────────────────────────────────────

describe('PathResolver#systemPath()', () => {
  test('resolves relative target from UNC start (no jail)', () => {
    const result = posix().systemPath('file.adoc', '//server/share/docs', null)
    assert.equal(result, '//server/share/docs/file.adoc')
  })

  test('resolves relative target from UNC start within UNC jail', () => {
    const result = posix().systemPath(
      'file.adoc',
      '//server/share/docs',
      '//server/share'
    )
    assert.equal(result, '//server/share/docs/file.adoc')
  })

  test('resolves subdirectory target within UNC jail', () => {
    const result = posix().systemPath(
      'sub/file.adoc',
      '//server/share/docs',
      '//server/share'
    )
    assert.equal(result, '//server/share/docs/sub/file.adoc')
  })

  test('resolves ".." that stays within UNC jail', () => {
    const result = posix().systemPath(
      '../file.adoc',
      '//server/share/docs',
      '//server/share'
    )
    assert.equal(result, '//server/share/file.adoc')
  })

  test('resolves ".." to jail root', () => {
    const result = posix().systemPath(
      '..',
      '//server/share/docs',
      '//server/share'
    )
    assert.equal(result, '//server/share')
  })

  test('resolves absolute UNC target already inside jail', () => {
    const result = posix().systemPath(
      '//server/share/docs/file.adoc',
      null,
      '//server/share'
    )
    assert.equal(result, '//server/share/docs/file.adoc')
  })

  test('recover=true: ".." escaping jail logs a warning and recovers', async () => {
    const messages = await capturingWarns((pr) => {
      pr.systemPath(
        '../../outside.adoc',
        '//server/share/docs',
        '//server/share',
        { recover: true }
      )
    })
    const warns = messages.filter((m) => m.severity === 'WARN')
    assert.ok(warns.length > 0, 'expected a WARN about ancestor escape')
  })

  test('recover=true: absolute UNC outside jail logs a warning and recovers', async () => {
    const messages = await capturingWarns((pr) => {
      pr.systemPath('//other/share/escape.adoc', null, '//server/share', {
        recover: true,
      })
    })
    const warns = messages.filter((m) => m.severity === 'WARN')
    assert.ok(warns.length > 0, 'expected a WARN about target outside jail')
  })

  test('recover=false: ".." escaping jail throws SecurityError', () => {
    assert.throws(
      () =>
        posix().systemPath(
          '../../outside.adoc',
          '//server/share/docs',
          '//server/share',
          {
            recover: false,
          }
        ),
      (err) => err.name === 'SecurityError'
    )
  })

  test('recover=false: absolute UNC outside jail throws SecurityError', () => {
    assert.throws(
      () =>
        posix().systemPath(
          '//other/share/escape.adoc',
          null,
          '//server/share',
          {
            recover: false,
          }
        ),
      (err) => err.name === 'SecurityError'
    )
  })

  test('Windows-mode: raw backslash UNC target is resolved correctly', () => {
    const result = win('//server/share').systemPath(
      '\\\\server\\share\\docs\\file.adoc',
      null,
      '\\\\server\\share'
    )
    assert.equal(result, '//server/share/docs/file.adoc')
  })

  test('Windows-mode: relative target from Windows backslash start', () => {
    const result = win('//server/share').systemPath(
      'file.adoc',
      '\\\\server\\share\\docs',
      '\\\\server\\share'
    )
    assert.equal(result, '//server/share/docs/file.adoc')
  })
})

// ── _expandPath (relative workingDir) ─────────────────────────────────────────

// process.cwd() is Node.js-only; _expandPath is a no-op in the browser.
const describeNode = import.meta.url.startsWith('http')
  ? describe.skip
  : describe

describeNode('PathResolver constructor — relative workingDir', () => {
  test('relative workingDir is resolved to an absolute path ending with the segment', () => {
    const pr = new PathResolver('/', 'subdir')
    assert.ok(isAbsolute(pr.workingDir), 'workingDir must be absolute')
    assert.ok(
      pr.workingDir.endsWith('/subdir'),
      `expected to end with /subdir, got: ${pr.workingDir}`
    )
  })

  test('relative workingDir with ".." is expanded — no ".." left, ends with resolved segment', () => {
    const pr = new PathResolver('/', 'subdir/../other')
    assert.ok(isAbsolute(pr.workingDir), 'workingDir must be absolute')
    assert.ok(
      !pr.workingDir.includes('..'),
      `expected no ".." in: ${pr.workingDir}`
    )
    assert.ok(
      pr.workingDir.endsWith('/other'),
      `expected to end with /other, got: ${pr.workingDir}`
    )
  })
})
