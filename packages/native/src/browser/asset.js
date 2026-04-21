// Browser-specific asset reading via Fetch API.
//
// In a browser environment the document base directory is resolved as an HTTP URL,
// so "local" assets are served over HTTP rather than from the filesystem.
// This module provides a fetch-based fallback used by readContents when the
// resolved path is an HTTP/HTTPS URI (i.e. docdir was set to a browser URL).

/**
 * Fetch the text content of a URI.
 *
 * @param {string} uri - The URI to fetch.
 * @returns {Promise<string|null>} the response text, or null on failure.
 */
export async function readBrowserAsset (uri) {
  try {
    const response = await fetch(uri)
    if (!response.ok) return null
    return response.text()
  } catch {
    return null
  }
}