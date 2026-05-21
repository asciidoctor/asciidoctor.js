// HTTP cache system for URI fetching.
//
// Provides a pluggable caching layer for all HTTP(S) fetches performed during
// document conversion (includes, images, readContents). Mirrors the behaviour
// of Ruby's open-uri/cached mechanism activated by the `cache-uri` attribute.
//
// When `cache-uri` is set on the document:
//   - If a cache has been registered via HttpCacheManager.setCache(), it is used.
//   - Otherwise an ephemeral MemoryHttpCache is created for the duration of the
//     conversion (keyed by Document instance via a WeakMap, GC'd with the doc).
//
// To implement a custom cache, extend HttpCache and override read(uri).

/**
 * Base HTTP cache class.
 *
 * The default implementation delegates directly to fetch() with no caching.
 * Subclasses override read() to add caching behaviour.
 */
export class HttpCache {
  /**
   * Fetch content from a URI, optionally from a cache.
   * @param {string} uri
   * @returns {Promise<Response>}
   */
  async read(uri) {
    return fetch(uri)
  }
}

/**
 * In-memory HTTP cache.
 *
 * Stores successful responses as ArrayBuffers keyed by URI. On a cache hit
 * a synthetic Response is reconstructed from the stored data without touching
 * the network. Non-OK responses (4xx, 5xx) are never cached.
 *
 * Safe as an ephemeral per-conversion cache or as a longer-lived process-level
 * cache when registered via HttpCacheManager.setCache().
 */
export class MemoryHttpCache extends HttpCache {
  /** @type {Map<string, {buffer: ArrayBuffer, status: number, statusText: string, headers: Record<string,string>}>} */
  #cache = new Map()

  async read(uri) {
    const entry = this.#cache.get(uri)
    if (entry) {
      return new Response(entry.buffer.slice(0), {
        status: entry.status,
        statusText: entry.statusText,
        headers: entry.headers,
      })
    }
    const response = await fetch(uri)
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const headers = Object.fromEntries(response.headers.entries())
      this.#cache.set(uri, {
        buffer,
        status: response.status,
        statusText: response.statusText,
        headers,
      })
      return new Response(buffer.slice(0), {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
    return response
  }
}

/** @type {WeakMap<object, MemoryHttpCache>} */
const _ephemeralCaches = new WeakMap()

/**
 * Singleton manager for the HTTP cache.
 *
 * Register a process-level cache:
 *   HttpCacheManager.setCache(new MemoryHttpCache())
 *   HttpCacheManager.setCache(new MyFileSystemCache('./cache'))
 *   HttpCacheManager.setCache(null)  // revert to default ephemeral behaviour
 *
 * When no cache is registered and `cache-uri` is set, an ephemeral
 * MemoryHttpCache is created per Document instance.
 */
export const HttpCacheManager = {
  /** @type {HttpCache|null} */
  _cache: null,

  /**
   * Register a cache to use for all conversions.
   * Pass null to unregister and revert to the ephemeral default.
   * @param {HttpCache|null} cache
   */
  setCache(cache) {
    this._cache = cache
  },

  /**
   * Return the registered process-level cache, or null if none is registered.
   * @returns {HttpCache|null}
   */
  getCache() {
    return this._cache
  },

  /**
   * Return the cache to use for a specific document conversion.
   *
   * Returns the registered cache if one exists; otherwise creates (or reuses)
   * an ephemeral MemoryHttpCache scoped to the document's lifetime via a WeakMap.
   * @param {object} doc - the current Document instance
   * @returns {HttpCache}
   */
  getCacheForDocument(doc) {
    if (this._cache) return this._cache
    let cache = _ephemeralCaches.get(doc)
    if (!cache) {
      cache = new MemoryHttpCache()
      _ephemeralCaches.set(doc, cache)
    }
    return cache
  },
}

/**
 * Fetch a URI, routing through the HTTP cache when `cache-uri` is set on the document.
 * @param {string} uri
 * @param {object} doc - the current Document instance
 * @returns {Promise<Response>}
 */
export function fetchUri(uri, doc) {
  if (doc.hasAttribute('cache-uri')) {
    return HttpCacheManager.getCacheForDocument(doc).read(uri)
  }
  return fetch(uri)
}
