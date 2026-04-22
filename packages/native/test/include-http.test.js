import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { load } from '../src/load.js'
import { startServer } from './http-server.js'

const convert = async (input, opts = {}) => (await load(input, opts)).convert()

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'http')

function buildRoutes (baseUri) {
  const routes = new Map()
  routes.set('/foo.adoc', { contentType: 'text/plain; charset=utf-8', body: readFileSync(join(FIXTURES_DIR, 'foo.adoc'), 'utf8') })
  routes.set('/include-tag.adoc', { contentType: 'text/plain; charset=utf-8', body: readFileSync(join(FIXTURES_DIR, 'include-tag.adoc'), 'utf8') })
  routes.set('/include-lines.adoc', { contentType: 'text/plain; charset=utf-8', body: readFileSync(join(FIXTURES_DIR, 'include-lines.adoc'), 'utf8') })
  routes.set('/dir/bar.adoc', { contentType: 'text/plain; charset=utf-8', body: readFileSync(join(FIXTURES_DIR, 'dir', 'bar.adoc'), 'utf8') })
  return routes
}

describe('Include http URI', () => {
  let server
  let baseUri

  before(async () => {
    ;({ server, baseUri } = await startServer(buildRoutes()))
  })

  after(() => {
    server.close()
  })

  test('should include file with an absolute http URI', async () => {
    const html = await convert(`include::${baseUri}/foo.adoc[]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(html.includes('Foo'), `Expected "Foo" in:\n${html}`)
  })

  test('should include file with an absolute http URI when base_dir is an absolute http URI', async () => {
    const html = await convert(`include::${baseUri}/foo.adoc[]`, {
      safe: 'safe',
      base_dir: baseUri,
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(html.includes('Foo'), `Expected "Foo" in:\n${html}`)
  })

  test('should include file from a subdirectory via absolute http URI', async () => {
    const html = await convert(`include::${baseUri}/dir/bar.adoc[]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(html.includes('Bar'), `Expected "Bar" in:\n${html}`)
  })

  test('should partially include file via http URI using tag', async () => {
    const htmlA = await convert(`include::${baseUri}/include-tag.adoc[tag=a]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(htmlA.includes('tag-a'), `Expected "tag-a" in:\n${htmlA}`)
    assert.ok(!htmlA.includes('tag-b'), `Expected no "tag-b" in:\n${htmlA}`)

    const htmlB = await convert(`include::${baseUri}/include-tag.adoc[tag=b]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(htmlB.includes('tag-b'), `Expected "tag-b" in:\n${htmlB}`)
    assert.ok(!htmlB.includes('tag-a'), `Expected no "tag-a" in:\n${htmlB}`)
  })

  test('should partially include file via http URI using lines', async () => {
    const html12 = await convert(`include::${baseUri}/include-lines.adoc[lines=1..2]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(html12.includes('First line'), `Expected "First line" in:\n${html12}`)
    assert.ok(html12.includes('Second line'), `Expected "Second line" in:\n${html12}`)
    assert.ok(!html12.includes('Third line'), `Expected no "Third line" in:\n${html12}`)

    const html34 = await convert(`include::${baseUri}/include-lines.adoc[lines=3..4]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(html34.includes('Third line'), `Expected "Third line" in:\n${html34}`)
    assert.ok(html34.includes('Fourth line'), `Expected "Fourth line" in:\n${html34}`)
    assert.ok(!html34.includes('First line'), `Expected no "First line" in:\n${html34}`)
  })

  test('should not include URI when allow-uri-read is not set', async () => {
    const html = await convert(`include::${baseUri}/foo.adoc[]`, {
      safe: 'safe',
    })
    assert.ok(!html.includes('Foo'), `Expected URI content not included when allow-uri-read is disabled:\n${html}`)
  })

  test('should log error when http URI returns 404', async () => {
    const html = await convert(`include::${baseUri}/missing.adoc[]`, {
      safe: 'safe',
      attributes: { 'allow-uri-read': true },
    })
    assert.ok(html.includes('Unresolved directive'), `Expected unresolved directive warning in:\n${html}`)
  })
})