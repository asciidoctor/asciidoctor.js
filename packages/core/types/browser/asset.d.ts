/**
 * Fetch the text content of a URI.
 *
 * @param {string} uri - The URI to fetch.
 * @returns {Promise<string|null>} the response text, or null on failure.
 */
export function readBrowserAsset(uri: string): Promise<string | null>;
