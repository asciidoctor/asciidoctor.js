/**
 * Fetch a URI, routing through the HTTP cache when `cache-uri` is set on the document.
 * @param {string} uri
 * @param {object} doc - the current Document instance
 * @returns {Promise<Response>}
 */
export function fetchUri(uri: string, doc: object): Promise<Response>;
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
    read(uri: string): Promise<Response>;
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
    read(uri: any): Promise<any>;
    #private;
}
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
export namespace HttpCacheManager {
    /** @type {HttpCache|null} */
    let _cache: HttpCache | null;
    /**
     * Register a cache to use for all conversions.
     * Pass null to unregister and revert to the ephemeral default.
     * @param {HttpCache|null} cache
     */
    function setCache(cache: HttpCache | null): void;
    /**
     * Return the registered process-level cache, or null if none is registered.
     * @returns {HttpCache|null}
     */
    function getCache(): HttpCache | null;
    /**
     * Return the cache to use for a specific document conversion.
     *
     * Returns the registered cache if one exists; otherwise creates (or reuses)
     * an ephemeral MemoryHttpCache scoped to the document's lifetime via a WeakMap.
     * @param {object} doc - the current Document instance
     * @returns {HttpCache}
     */
    function getCacheForDocument(doc: object): HttpCache;
}
