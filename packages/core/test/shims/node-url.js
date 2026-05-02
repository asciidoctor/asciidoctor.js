export function fileURLToPath(url) {
  const href = typeof url === 'string' ? url : url.href
  if (href.startsWith('file://')) {
    return href.replace(/^file:\/\//, '')
  }
  // In Vitest browser mode, import.meta.url is an http:// URL whose
  // pathname is the absolute filesystem path served by Vite's dev server
  try {
    return new URL(href).pathname
  } catch {
    return href
  }
}

export function pathToFileURL(path) {
  return new URL('file://' + path)
}
