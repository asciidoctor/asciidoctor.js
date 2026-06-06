import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { Options, Invoker } from '../lib/cli.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI = join(__dirname, '..', 'bin', 'asciidoctor')

function cli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', ...opts })
}

describe('CLI smoke tests', () => {
  test('--version prints version info', () => {
    const result = cli(['--version'])
    assert.equal(result.status, 0)
    assert.match(result.stdout, /Asciidoctor\.js/)
    assert.match(result.stdout, /CLI version/)
  })

  test('-V prints version info', () => {
    const result = cli(['-V'])
    assert.equal(result.status, 0)
    assert.match(result.stdout, /Asciidoctor\.js/)
  })

  test('--help prints usage', () => {
    const result = cli(['--help'])
    assert.equal(result.status, 0)
    assert.match(result.stderr, /asciidoctor \[options\.\.\.\] files\.\.\./)
    assert.match(result.stderr, /--backend/)
  })

  test('no arguments prints usage', () => {
    const result = cli([])
    assert.equal(result.status, 0)
    assert.match(result.stderr, /asciidoctor \[options\.\.\.\] files\.\.\./)
  })

  test('convert stdin to stdout', () => {
    const result = cli(['-'], { input: '= Hello World\n\nA paragraph.' })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /<h1>Hello World<\/h1>/)
    assert.match(result.stdout, /<p>A paragraph\.<\/p>/)
  })

  test('--embedded converts without document structure', () => {
    const result = cli(['-e', '-'], { input: '= Hello\n\nA paragraph.' })
    assert.equal(result.status, 0)
    assert.doesNotMatch(result.stdout, /<!DOCTYPE html>/)
    assert.match(result.stdout, /<p>A paragraph\.<\/p>/)
  })

  test('convert file to stdout with -o -', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'asciidoctor-test-'))
    try {
      const inputFile = join(tmpDir, 'input.adoc')
      writeFileSync(inputFile, '= Hello World\n\nA paragraph.')
      const result = cli(['-o', '-', inputFile])
      assert.equal(result.status, 0)
      assert.match(result.stdout, /<h1>Hello World<\/h1>/)
      assert.match(result.stdout, /<p>A paragraph\.<\/p>/)
    } finally {
      rmSync(tmpDir, { recursive: true })
    }
  })

  test('convert file to output directory', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'asciidoctor-test-'))
    try {
      const inputFile = join(tmpDir, 'input.adoc')
      writeFileSync(inputFile, '= Hello World\n\nA paragraph.')
      const result = cli(['-D', tmpDir, inputFile])
      assert.equal(result.status, 0)
      const output = readFileSync(join(tmpDir, 'input.html'), 'utf8')
      assert.match(output, /<h1>Hello World<\/h1>/)
    } finally {
      rmSync(tmpDir, { recursive: true })
    }
  })

  test('--backend docbook5 produces DocBook output', () => {
    const result = cli(['-b', 'docbook5', '-'], { input: '= Hello\n\nA paragraph.' })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /<article/)
    assert.match(result.stdout, /xmlns="http:\/\/docbook\.org\/ns\/docbook"/)
  })

  test('-a sets a document attribute', () => {
    const result = cli(['-a', 'myattr=myvalue', '-e', '-'], { input: '{myattr}' })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /myvalue/)
  })
})

const POSTPROCESSOR_EXTENSION = join(__dirname, 'fixtures', 'postprocessor-extension.js')
const POSTPROCESSOR_EXTENSION_CJS = join(__dirname, 'fixtures', 'postprocessor-extension.cjs')
const NO_REGISTER_EXTENSION = join(__dirname, 'fixtures', 'no-register-extension.js')

describe('--extension option', () => {
  test('--extension loads and registers the extension', () => {
    const result = cli(['--extension', POSTPROCESSOR_EXTENSION, '-'], {
      input: '= Hello\n\nParagraph.',
    })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /<!-- postprocessor-extension -->/)
  })

  test('--require does not call the register export', () => {
    const result = cli(['--require', POSTPROCESSOR_EXTENSION, '-'], {
      input: '= Hello\n\nParagraph.',
    })
    assert.equal(result.status, 0)
    assert.doesNotMatch(result.stdout, /<!-- postprocessor-extension -->/)
  })

  test('--extension applies to all input files', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'asciidoctor-test-'))
    try {
      const fileA = join(tmpDir, 'a.adoc')
      const fileB = join(tmpDir, 'b.adoc')
      writeFileSync(fileA, '= Doc A\n\nFirst.')
      writeFileSync(fileB, '= Doc B\n\nSecond.')
      const result = cli(['--extension', POSTPROCESSOR_EXTENSION, '-D', tmpDir, fileA, fileB])
      assert.equal(result.status, 0)
      assert.match(readFileSync(join(tmpDir, 'a.html'), 'utf8'), /<!-- postprocessor-extension -->/)
      assert.match(readFileSync(join(tmpDir, 'b.html'), 'utf8'), /<!-- postprocessor-extension -->/)
    } finally {
      rmSync(tmpDir, { recursive: true })
    }
  })

  test('--extension works with a CommonJS extension (module.exports.register)', () => {
    const result = cli(['--extension', POSTPROCESSOR_EXTENSION_CJS, '-'], {
      input: '= Hello\n\nParagraph.',
    })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /<!-- cjs-postprocessor-extension -->/)
  })

  test('--extension can be repeated to load multiple extensions', () => {
    const result = cli(
      ['--extension', POSTPROCESSOR_EXTENSION, '--extension', POSTPROCESSOR_EXTENSION, '-'],
      { input: '= Hello\n\nParagraph.' }
    )
    assert.equal(result.status, 0)
    assert.match(result.stdout, /<!-- postprocessor-extension -->/)
  })

  test('--extension logs a warning when the extension does not export a register function', () => {
    const result = cli(['--extension', NO_REGISTER_EXTENSION, '-'], {
      input: '= Hello\n\nParagraph.',
    })
    assert.equal(result.status, 0)
    assert.match(result.stderr, /does not export a register function/)
  })
})

const EXTENDED_CLI = join(__dirname, 'fixtures', 'extended-cli.js')

function extendedCli(args, opts = {}) {
  return spawnSync(process.execPath, [EXTENDED_CLI, ...args], { encoding: 'utf8', ...opts })
}

describe('CLI extensibility', () => {
  describe('Options', () => {
    test('addOption registers a custom boolean option', () => {
      const opts = new Options()
      opts.addOption('watch', { type: 'boolean', short: 'w', describe: 'watch for changes' })
      opts.parse(['node', 'asciidoctor', '-w', 'file.adoc'])
      assert.equal(opts.values.watch, true)
      assert.deepEqual(opts.positionals, ['file.adoc'])
    })

    test('addOption registers a custom string option', () => {
      const opts = new Options()
      opts.addOption('theme', { type: 'string', describe: 'PDF theme', metavar: '<theme>' })
      opts.parse(['node', 'asciidoctor', '--theme', 'dark', 'file.adoc'])
      assert.equal(opts.values.theme, 'dark')
    })

    test('addOption returns this for chaining', () => {
      const opts = new Options()
      const ret = opts.addOption('watch', { type: 'boolean' })
      assert.equal(ret, opts)
    })

    test('buildHelpText includes standard options', () => {
      const help = new Options().buildHelpText()
      assert.match(help, /--backend/)
      assert.match(help, /--require/)
    })

    test('buildHelpText includes custom option', () => {
      const opts = new Options()
      opts.addOption('watch', { type: 'boolean', short: 'w', describe: 'watch for changes' })
      const help = opts.buildHelpText()
      assert.match(help, /-w, --watch/)
      assert.match(help, /watch for changes/)
    })
  })

  describe('Invoker', () => {
    test('version() can be overridden', () => {
      class MyInvoker extends Invoker {
        version() { return `My Tool using ${super.version()}` }
      }
      const inv = new MyInvoker(new Options().parse(['node', 'asciidoctor']))
      assert.match(inv.version(), /^My Tool using/)
      assert.match(inv.version(), /Asciidoctor\.js/)
    })

    test('subclass --version uses overridden version()', () => {
      const result = extendedCli(['--version'])
      assert.equal(result.status, 0)
      assert.match(result.stdout, /^Extended CLI using/)
      assert.match(result.stdout, /Asciidoctor\.js/)
    })

    test('subclass --help includes custom options', () => {
      const result = extendedCli(['--help'])
      assert.equal(result.status, 0)
      assert.match(result.stderr, /--custom-flag/)
      assert.match(result.stderr, /a custom flag/)
      assert.match(result.stderr, /--theme/)
      assert.match(result.stderr, /PDF theme name/)
    })

    test('subclass convertFiles() receives custom option values', () => {
      const result = extendedCli(['-F', '--theme', 'dark', 'doc.adoc'])
      assert.equal(result.status, 0)
      assert.match(result.stdout, /extended:doc\.adoc:custom-flag=true:theme=dark/)
    })

    test('subclass convertFiles() works without custom flags', () => {
      const result = extendedCli(['doc.adoc'])
      assert.equal(result.status, 0)
      assert.match(result.stdout.trim(), /extended:doc\.adoc:custom-flag=false:theme=$/)
    })
  })
})