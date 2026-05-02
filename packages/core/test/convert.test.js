import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  mkdtemp,
  rm,
  readFile,
  writeFile,
  mkdir,
  readdir,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { convert, convertFile, render, renderFile } from '../src/convert.js'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

async function withTmpDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'asciidoctor-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

// ── convert() – no file I/O ───────────────────────────────────────────────────

test('convert string with to_file:false returns embedded HTML string', async () => {
  const output = await convert('Hello *world*', {
    safe: 'unsafe',
    to_file: false,
  })
  assert.equal(typeof output, 'string')
  assert.ok(output.includes('<strong>world</strong>'))
  assert.ok(
    !output.includes('<!DOCTYPE html>'),
    'embedded output has no doctype'
  )
})

test('convert with to_file:/dev/null returns Document without converting', async () => {
  const doc = await convert('Hello', { safe: 'unsafe', to_file: '/dev/null' })
  assert.equal(typeof doc, 'object')
  assert.equal(doc.constructor.name, 'Document')
})

test('convert with header_footer:true produces full standalone HTML page', async () => {
  const output = await convert('Hello', {
    safe: 'unsafe',
    to_file: false,
    header_footer: true,
  })
  assert.ok(output.includes('<!DOCTYPE html>'))
})

test('convert to writable stream returns Document and calls stream.write()', async () => {
  const chunks = []
  const stream = {
    write(data) {
      chunks.push(data)
    },
  }
  const doc = await convert('Hello *world*', {
    safe: 'unsafe',
    to_file: stream,
  })
  assert.equal(doc.constructor.name, 'Document')
  const html = chunks.join('')
  assert.ok(html.includes('<strong>world</strong>'))
})

// ── convert() – file I/O ──────────────────────────────────────────────────────

describe('convert() writing to file', () => {
  test('to_file path writes HTML file and returns Document', async () => {
    await withTmpDir(async (dir) => {
      const outPath = join(dir, 'output.html')
      const doc = await convert('Hello *world*', {
        safe: 'unsafe',
        to_file: outPath,
      })
      assert.equal(doc.constructor.name, 'Document')
      const html = await readFile(outPath, 'utf8')
      assert.ok(html.includes('<strong>world</strong>'))
    })
  })

  test('to_dir alone writes file named from docname attribute', async () => {
    await withTmpDir(async (dir) => {
      const doc = await convert('Hello', {
        safe: 'unsafe',
        to_dir: dir,
        attributes: 'docname=mytest',
      })
      assert.equal(doc.constructor.name, 'Document')
      const html = await readFile(join(dir, 'mytest.html'), 'utf8')
      assert.ok(html.includes('Hello'))
    })
  })

  test('to_dir + to_file writes to named file in directory', async () => {
    await withTmpDir(async (dir) => {
      const doc = await convert('Hello', {
        safe: 'unsafe',
        to_dir: dir,
        to_file: 'result.html',
      })
      assert.equal(doc.constructor.name, 'Document')
      const html = await readFile(join(dir, 'result.html'), 'utf8')
      assert.ok(html.includes('Hello'))
    })
  })

  test('mkdirs:true creates missing directory and writes file', async () => {
    await withTmpDir(async (dir) => {
      const outDir = join(dir, 'new', 'subdir')
      await convert('Hello', {
        safe: 'unsafe',
        to_dir: outDir,
        to_file: 'output.html',
        mkdirs: true,
      })
      const html = await readFile(join(outDir, 'output.html'), 'utf8')
      assert.ok(html.includes('Hello'))
    })
  })

  test('throws when target directory does not exist and mkdirs is false', async () => {
    await withTmpDir(async (dir) => {
      const outDir = join(dir, 'nonexistent')
      await assert.rejects(
        () =>
          convert('Hello', {
            safe: 'unsafe',
            to_dir: outDir,
            to_file: 'output.html',
          }),
        /target directory does not exist/
      )
    })
  })

  test('file-like input (sibling mode) writes adjacent .html file', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'hello.adoc')
      const content = '= Hello\n\nWorld.'
      await writeFile(inputPath, content, 'utf8')
      const doc = await convert(
        { path: inputPath, read: () => content },
        { safe: 'unsafe' }
      )
      assert.equal(doc.constructor.name, 'Document')
      const html = await readFile(join(dir, 'hello.html'), 'utf8')
      assert.ok(html.includes('World'))
    })
  })

  test('throws when sibling output path equals input path', async () => {
    await withTmpDir(async (dir) => {
      // Input file already has .html extension → output would overwrite it
      const inputPath = join(dir, 'hello.html')
      await writeFile(inputPath, '<p>existing</p>', 'utf8')
      await assert.rejects(
        () =>
          convert({ path: inputPath, read: () => 'Hello' }, { safe: 'unsafe' }),
        /input file and output file cannot be the same/
      )
    })
  })

  test('file-like input + explicit to_file path writes to that path', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'hello.adoc')
      const content = '= Hello\n\nWorld.'
      await writeFile(inputPath, content, 'utf8')
      const outPath = join(dir, 'custom.html')
      const doc = await convert(
        { path: inputPath, read: () => content },
        { safe: 'unsafe', to_file: outPath }
      )
      assert.equal(doc.constructor.name, 'Document')
      const html = await readFile(outPath, 'utf8')
      assert.ok(html.includes('World'))
    })
  })

  test('throws when to_file path equals file-like input path', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'hello.adoc')
      await writeFile(inputPath, '= Hello', 'utf8')
      await assert.rejects(
        () =>
          convert(
            { path: inputPath, read: () => '= Hello' },
            { safe: 'unsafe', to_file: inputPath }
          ),
        /input file and output file cannot be the same/
      )
    })
  })
})

// ── convertFile() ─────────────────────────────────────────────────────────────

describe('convertFile()', () => {
  test('reads file and returns embedded HTML string with to_file:false', async () => {
    const output = await convertFile(join(FIXTURES_DIR, 'sample.adoc'), {
      safe: 'unsafe',
      to_file: false,
    })
    assert.equal(typeof output, 'string')
    assert.ok(output.includes('Preamble paragraph'))
    assert.ok(
      !output.includes('<!DOCTYPE html>'),
      'embedded output has no doctype'
    )
  })

  test('reads file and writes adjacent .html file', async () => {
    await withTmpDir(async (dir) => {
      const src = await readFile(join(FIXTURES_DIR, 'sample.adoc'), 'utf8')
      const inputPath = join(dir, 'sample.adoc')
      await writeFile(inputPath, src, 'utf8')
      const doc = await convertFile(inputPath, { safe: 'unsafe' })
      assert.equal(doc.constructor.name, 'Document')
      const html = await readFile(join(dir, 'sample.html'), 'utf8')
      assert.ok(html.includes('Document Title'))
    })
  })
})

// ── deprecated aliases ────────────────────────────────────────────────────────

test('render is an alias for convert', async () => {
  const output = await render('Hello', { safe: 'unsafe', to_file: false })
  assert.equal(typeof output, 'string')
  assert.ok(output.includes('Hello'))
})

test('renderFile is an alias for convertFile', async () => {
  const output = await renderFile(join(FIXTURES_DIR, 'sample.adoc'), {
    safe: 'unsafe',
    to_file: false,
  })
  assert.equal(typeof output, 'string')
  assert.ok(output.includes('Preamble paragraph'))
})

// ── linkcss + copycss stylesheet copying ─────────────────────────────────────

describe('stylesheet copying (linkcss + copycss)', () => {
  // Helper: file-like input object for a path whose content is already in memory
  const fileInput = (path, content) => ({ path, read: () => content })

  test('default stylesheet (asciidoctor.css) is not written — feature not yet ported', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      // stylesheet='' (default) → falsy → DEFAULT_STYLESHEET_KEYS block is skipped entirely
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: { linkcss: '' },
      })
      const files = await readdir(outDir)
      assert.ok(
        !files.some((f) => f.endsWith('.css')),
        'asciidoctor.css should not be written (not yet ported)'
      )
    })
  })

  test('stylesheet=DEFAULT (truthy key) triggers copyAsciidoctorStylesheet but writes no file', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      // 'DEFAULT' is in DEFAULT_STYLESHEET_KEYS → copyAsciidoctorStylesheet = true (not yet ported)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: { linkcss: '', stylesheet: 'DEFAULT' },
      })
      const files = await readdir(outDir)
      assert.ok(
        !files.some((f) => f.endsWith('.css')),
        'no CSS file written (not yet ported)'
      )
    })
  })

  test('user stylesheet is copied to output directory', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'mystyle.css'), 'body { color: red; }', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: { linkcss: '', stylesheet: 'mystyle.css' },
      })
      const css = await readFile(join(outDir, 'mystyle.css'), 'utf8')
      assert.ok(css.includes('color: red'))
    })
  })

  test('user stylesheet is copied into stylesdir subdirectory', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'mystyle.css'), 'body { color: blue; }', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(join(outDir, 'css'), { recursive: true })
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: {
          linkcss: '',
          stylesheet: 'mystyle.css',
          stylesdir: 'css',
        },
      })
      const css = await readFile(join(outDir, 'css', 'mystyle.css'), 'utf8')
      assert.ok(css.includes('color: blue'))
    })
  })

  test('mkdirs:true creates missing stylesdir before copying stylesheet', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'mystyle.css'), 'body { margin: 0; }', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        mkdirs: true,
        attributes: {
          linkcss: '',
          stylesheet: 'mystyle.css',
          stylesdir: 'styles',
        },
      })
      const css = await readFile(join(outDir, 'styles', 'mystyle.css'), 'utf8')
      assert.ok(css.includes('margin: 0'))
    })
  })

  test('throws when stylesdir does not exist and mkdirs is false', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'mystyle.css'), 'body {}', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await assert.rejects(
        () =>
          convert(fileInput(inputPath, content), {
            safe: 'unsafe',
            to_dir: outDir,
            attributes: {
              linkcss: '',
              stylesheet: 'mystyle.css',
              stylesdir: 'missing-styles',
            },
          }),
        /target stylesheet directory does not exist/
      )
    })
  })

  test('no copy when stylesheet attribute is a URI', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: {
          linkcss: '',
          stylesheet: 'https://example.com/style.css',
        },
      })
      const files = await readdir(outDir)
      assert.ok(
        !files.some((f) => f.endsWith('.css')),
        'URI stylesheet must not be copied'
      )
    })
  })

  test('block skipped entirely when stylesdir is a URI', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'mystyle.css'), 'body {}', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: {
          linkcss: '',
          stylesheet: 'mystyle.css',
          stylesdir: 'https://cdn.example.com/',
        },
      })
      const files = await readdir(outDir)
      assert.ok(
        !files.some((f) => f.endsWith('.css')),
        'URI stylesdir must skip copy entirely'
      )
    })
  })

  test('explicit copycss path is used as stylesheet source', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      const srcCss = join(dir, 'source.css')
      await writeFile(srcCss, 'body { font-size: 14px; }', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        // copycss = explicit path → used as source; stylesheet = destination name
        attributes: { linkcss: '', stylesheet: 'custom.css', copycss: srcCss },
      })
      const css = await readFile(join(outDir, 'custom.css'), 'utf8')
      assert.ok(css.includes('font-size: 14px'))
    })
  })

  test('mkdirs:true creates intermediate stylesheet subdirectory when stylesheet path has subdirs', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'base.css'), 'body { padding: 0; }', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      // stylesheet has a subdirectory component → stylesheetOutdir !== stylesoutdir
      // and that subdirectory does not exist yet → mkdirs must create it
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        mkdirs: true,
        attributes: {
          linkcss: '',
          stylesheet: 'themes/base.css',
          copycss: join(dir, 'base.css'),
        },
      })
      const css = await readFile(join(outDir, 'themes', 'base.css'), 'utf8')
      assert.ok(css.includes('padding: 0'))
    })
  })

  test('throws when stylesheet subdirectory does not exist and mkdirs is false', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      await writeFile(join(dir, 'base.css'), 'body {}', 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      await assert.rejects(
        () =>
          convert(fileInput(inputPath, content), {
            safe: 'unsafe',
            to_dir: outDir,
            attributes: {
              linkcss: '',
              stylesheet: 'themes/base.css',
              copycss: join(dir, 'base.css'),
            },
          }),
        /target stylesheet directory does not exist/
      )
    })
  })

  test('no copy when source and destination stylesheet path are the same (sibling mode)', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      // Pre-existing stylesheet in same dir — sibling output → src == dest → no overwrite
      await writeFile(join(dir, 'mystyle.css'), 'original', 'utf8')
      // No to_dir: output goes adjacent to input (docdir == outdir)
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        attributes: { linkcss: '', stylesheet: 'mystyle.css' },
      })
      const css = await readFile(join(dir, 'mystyle.css'), 'utf8')
      assert.equal(
        css,
        'original',
        'file must not be overwritten when src == dest'
      )
    })
  })

  test('no copy when source stylesheet file does not exist', async () => {
    await withTmpDir(async (dir) => {
      const inputPath = join(dir, 'doc.adoc')
      const content = '= Doc\n\nHello.'
      await writeFile(inputPath, content, 'utf8')
      const outDir = join(dir, 'out')
      await mkdir(outDir)
      // mystyle.css does NOT exist in docdir → readAsset returns null → no file written
      await convert(fileInput(inputPath, content), {
        safe: 'unsafe',
        to_dir: outDir,
        attributes: { linkcss: '', stylesheet: 'mystyle.css' },
      })
      await assert.rejects(readFile(join(outDir, 'mystyle.css'), 'utf8'), {
        code: 'ENOENT',
      })
    })
  })
})
