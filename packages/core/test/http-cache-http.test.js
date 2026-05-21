import { test, describe, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { MemoryHttpCache, HttpCacheManager } from '../src/http_cache.js'
import { startServer } from './http-server.js'
import { load } from '../src/load.js'

function wrapFetchWithCounter() {
  let callCount = 0
  const original = globalThis.fetch
  globalThis.fetch = async (...args) => {
    callCount++
    return original(...args)
  }
  return {
    getCallCount: () => callCount,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

// ── Integration: cache-uri with include directives ────────────────────────────

describe('cache-uri — include directive integration', () => {
  let server
  let baseUri

  before(async () => {
    const routes = new Map([
      [
        '/snippet.adoc',
        { contentType: 'text/plain; charset=utf-8', body: 'Included content.' },
      ],
    ])
    ;({ server, baseUri } = await startServer(routes))
  })

  after(() => server.close())
  afterEach(() => HttpCacheManager.setCache(null))

  test('same URI included twice: one HTTP request when cache-uri is set', async () => {
    const counter = wrapFetchWithCounter()
    try {
      await load(
        `include::${baseUri}/snippet.adoc[]\ninclude::${baseUri}/snippet.adoc[]`,
        {
          safe: 'safe',
          attributes: { 'allow-uri-read': true, 'cache-uri': '' },
        }
      )
    } finally {
      counter.restore()
    }
    assert.equal(
      counter.getCallCount(),
      1,
      'cache-uri should prevent the second network request'
    )
  })

  test('same URI included twice: two HTTP requests when cache-uri is not set', async () => {
    const counter = wrapFetchWithCounter()
    try {
      await load(
        `include::${baseUri}/snippet.adoc[]\ninclude::${baseUri}/snippet.adoc[]`,
        {
          safe: 'safe',
          attributes: { 'allow-uri-read': true },
        }
      )
    } finally {
      counter.restore()
    }
    assert.equal(
      counter.getCallCount(),
      2,
      'without cache-uri each include must hit the network'
    )
  })

  test('ephemeral cache is not shared across conversions', async () => {
    const counter = wrapFetchWithCounter()
    try {
      await load(`include::${baseUri}/snippet.adoc[]`, {
        safe: 'safe',
        attributes: { 'allow-uri-read': true, 'cache-uri': '' },
      })
      await load(`include::${baseUri}/snippet.adoc[]`, {
        safe: 'safe',
        attributes: { 'allow-uri-read': true, 'cache-uri': '' },
      })
    } finally {
      counter.restore()
    }
    assert.equal(
      counter.getCallCount(),
      2,
      'each conversion gets its own ephemeral cache'
    )
  })

  test('registered process-level cache is shared across conversions', async () => {
    HttpCacheManager.setCache(new MemoryHttpCache())
    const counter = wrapFetchWithCounter()
    try {
      await load(`include::${baseUri}/snippet.adoc[]`, {
        safe: 'safe',
        attributes: { 'allow-uri-read': true, 'cache-uri': '' },
      })
      await load(`include::${baseUri}/snippet.adoc[]`, {
        safe: 'safe',
        attributes: { 'allow-uri-read': true, 'cache-uri': '' },
      })
    } finally {
      counter.restore()
    }
    assert.equal(
      counter.getCallCount(),
      1,
      'process-level cache must serve the second conversion from cache'
    )
  })
})
