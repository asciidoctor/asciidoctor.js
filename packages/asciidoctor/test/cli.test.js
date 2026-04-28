import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

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