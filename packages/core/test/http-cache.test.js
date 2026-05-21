import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  HttpCache,
  MemoryHttpCache,
  HttpCacheManager,
  fetchUri,
} from '../src/http_cache.js'

// ── Mock fetch helpers ────────────────────────────────────────────────────────

function makeMockFetch(responses) {
  let callCount = 0
  const mock = async (uri) => {
    callCount++
    const preset = responses[uri]
    if (!preset)
      return new Response('Not Found', { status: 404, statusText: 'Not Found' })
    return new Response(preset.body, {
      status: preset.status ?? 200,
      headers: preset.headers ?? { 'content-type': 'text/plain' },
    })
  }
  mock.getCallCount = () => callCount
  return mock
}

async function withMockFetch(mock, fn) {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await fn()
  } finally {
    globalThis.fetch = original
  }
}

// ── HttpCache (base class) ────────────────────────────────────────────────────

describe('HttpCache', () => {
  test('read() delegates directly to fetch', async () => {
    const mock = makeMockFetch({ 'http://example.com/a': { body: 'hello' } })
    const cache = new HttpCache()
    const response = await withMockFetch(mock, () =>
      cache.read('http://example.com/a')
    )
    assert.equal(await response.text(), 'hello')
    assert.equal(mock.getCallCount(), 1)
  })
})

// ── MemoryHttpCache ───────────────────────────────────────────────────────────

describe('MemoryHttpCache', () => {
  test('fetches from network on first call', async () => {
    const mock = makeMockFetch({ 'http://example.com/a': { body: 'hello' } })
    const cache = new MemoryHttpCache()
    const response = await withMockFetch(mock, () =>
      cache.read('http://example.com/a')
    )
    assert.equal(await response.text(), 'hello')
    assert.equal(mock.getCallCount(), 1)
  })

  test('returns cached response on second call without hitting network', async () => {
    const mock = makeMockFetch({ 'http://example.com/b': { body: 'cached' } })
    const cache = new MemoryHttpCache()
    await withMockFetch(mock, () => cache.read('http://example.com/b'))
    const r2 = await withMockFetch(mock, () =>
      cache.read('http://example.com/b')
    )
    assert.equal(await r2.text(), 'cached')
    assert.equal(mock.getCallCount(), 1, 'fetch should be called only once')
  })

  test('does not cache non-ok responses (404)', async () => {
    const mock = makeMockFetch({
      'http://example.com/c': { body: 'Not Found', status: 404 },
    })
    const cache = new MemoryHttpCache()
    await withMockFetch(mock, () => cache.read('http://example.com/c'))
    await withMockFetch(mock, () => cache.read('http://example.com/c'))
    assert.equal(mock.getCallCount(), 2, 'non-ok responses must not be cached')
  })

  test('cached response carries the original content-type header', async () => {
    const mock = makeMockFetch({
      'http://example.com/img': {
        body: '\x89PNG',
        headers: { 'content-type': 'image/png' },
      },
    })
    const cache = new MemoryHttpCache()
    await withMockFetch(mock, () => cache.read('http://example.com/img'))
    const r2 = await withMockFetch(mock, () =>
      cache.read('http://example.com/img')
    )
    assert.equal(r2.headers.get('content-type'), 'image/png')
    assert.equal(mock.getCallCount(), 1)
  })

  test('each cached response body can be consumed independently', async () => {
    const mock = makeMockFetch({ 'http://example.com/d': { body: 'body' } })
    const cache = new MemoryHttpCache()
    await withMockFetch(mock, () => cache.read('http://example.com/d'))
    const r2 = await withMockFetch(mock, () =>
      cache.read('http://example.com/d')
    )
    const r3 = await withMockFetch(mock, () =>
      cache.read('http://example.com/d')
    )
    assert.equal(await r2.text(), 'body')
    assert.equal(await r3.text(), 'body')
  })

  test('caches different URIs independently', async () => {
    const mock = makeMockFetch({
      'http://example.com/x': { body: 'x' },
      'http://example.com/y': { body: 'y' },
    })
    const cache = new MemoryHttpCache()
    await withMockFetch(mock, () => cache.read('http://example.com/x'))
    await withMockFetch(mock, () => cache.read('http://example.com/y'))
    const rx2 = await withMockFetch(mock, () =>
      cache.read('http://example.com/x')
    )
    const ry2 = await withMockFetch(mock, () =>
      cache.read('http://example.com/y')
    )
    assert.equal(await rx2.text(), 'x')
    assert.equal(await ry2.text(), 'y')
    assert.equal(mock.getCallCount(), 2, 'each URI fetched only once')
  })
})

// ── HttpCacheManager ──────────────────────────────────────────────────────────

describe('HttpCacheManager', () => {
  afterEach(() => HttpCacheManager.setCache(null))

  test('getCache() returns null by default', () => {
    assert.equal(HttpCacheManager.getCache(), null)
  })

  test('setCache / getCache round-trip', () => {
    const cache = new MemoryHttpCache()
    HttpCacheManager.setCache(cache)
    assert.equal(HttpCacheManager.getCache(), cache)
  })

  test('setCache(null) clears the registered cache', () => {
    HttpCacheManager.setCache(new MemoryHttpCache())
    HttpCacheManager.setCache(null)
    assert.equal(HttpCacheManager.getCache(), null)
  })

  test('getCacheForDocument creates a MemoryHttpCache when no cache is registered', () => {
    const doc = {}
    assert.ok(
      HttpCacheManager.getCacheForDocument(doc) instanceof MemoryHttpCache
    )
  })

  test('getCacheForDocument returns the same instance for the same document', () => {
    const doc = {}
    const c1 = HttpCacheManager.getCacheForDocument(doc)
    const c2 = HttpCacheManager.getCacheForDocument(doc)
    assert.equal(c1, c2)
  })

  test('getCacheForDocument returns different instances for different documents', () => {
    const doc1 = {}
    const doc2 = {}
    assert.notEqual(
      HttpCacheManager.getCacheForDocument(doc1),
      HttpCacheManager.getCacheForDocument(doc2)
    )
  })

  test('getCacheForDocument returns the registered cache when one is set', () => {
    const registered = new MemoryHttpCache()
    HttpCacheManager.setCache(registered)
    assert.equal(HttpCacheManager.getCacheForDocument({}), registered)
  })
})

// ── fetchUri ──────────────────────────────────────────────────────────────────

describe('fetchUri', () => {
  afterEach(() => HttpCacheManager.setCache(null))

  test('calls fetch directly when cache-uri is not set', async () => {
    const mock = makeMockFetch({ 'http://example.com/x': { body: 'x' } })
    const doc = { hasAttribute: () => false }
    const response = await withMockFetch(mock, () =>
      fetchUri('http://example.com/x', doc)
    )
    assert.equal(await response.text(), 'x')
    assert.equal(mock.getCallCount(), 1)
  })

  test('uses ephemeral cache on second call when cache-uri is set', async () => {
    const mock = makeMockFetch({ 'http://example.com/y': { body: 'y' } })
    const doc = { hasAttribute: (name) => name === 'cache-uri' }
    await withMockFetch(mock, () => fetchUri('http://example.com/y', doc))
    const r2 = await withMockFetch(mock, () =>
      fetchUri('http://example.com/y', doc)
    )
    assert.equal(await r2.text(), 'y')
    assert.equal(
      mock.getCallCount(),
      1,
      'second call must be served from cache'
    )
  })

  test('two different documents do not share ephemeral caches', async () => {
    const mock = makeMockFetch({ 'http://example.com/z': { body: 'z' } })
    const doc1 = { hasAttribute: (name) => name === 'cache-uri' }
    const doc2 = { hasAttribute: (name) => name === 'cache-uri' }
    await withMockFetch(mock, () => fetchUri('http://example.com/z', doc1))
    await withMockFetch(mock, () => fetchUri('http://example.com/z', doc2))
    assert.equal(
      mock.getCallCount(),
      2,
      'different documents must have independent caches'
    )
  })

  test('uses registered process-level cache when cache-uri is set', async () => {
    let readCount = 0
    class SpyCache extends HttpCache {
      async read(uri) {
        readCount++
        return super.read(uri)
      }
    }
    const mock = makeMockFetch({ 'http://example.com/w': { body: 'w' } })
    HttpCacheManager.setCache(new SpyCache())
    const doc = { hasAttribute: (name) => name === 'cache-uri' }
    await withMockFetch(mock, () => fetchUri('http://example.com/w', doc))
    assert.equal(readCount, 1, 'registered cache read() must be called')
  })
})
