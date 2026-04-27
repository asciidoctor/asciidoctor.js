// Browser-compatible POSIX path operations

export function dirname (p) {
  if (!p) return '.'
  const i = p.lastIndexOf('/')
  if (i === -1) return '.'
  if (i === 0) return '/'
  return p.slice(0, i)
}

export function basename (p, ext) {
  const parts = p.split('/')
  let base = parts[parts.length - 1] || ''
  if (ext && base.endsWith(ext)) base = base.slice(0, -ext.length)
  return base
}

export function extname (p) {
  const base = basename(p)
  const i = base.lastIndexOf('.')
  return i <= 0 ? '' : base.slice(i)
}

export function join (...parts) {
  return parts.filter(Boolean).join('/')
}

export function resolve (...parts) {
  let p = parts.join('/')
  if (!p.startsWith('/')) p = '/' + p
  return normalize(p)
}

export function normalize (p) {
  const abs = p.startsWith('/')
  const segments = p.split('/').reduce((acc, seg) => {
    if (seg === '..') acc.pop()
    else if (seg !== '.' && seg !== '') acc.push(seg)
    return acc
  }, [])
  const result = segments.join('/')
  return abs ? '/' + result : result || '.'
}

export function isAbsolute (p) {
  return p.startsWith('/')
}

export const sep = '/'
export const delimiter = ':'

const path = { dirname, basename, extname, join, resolve, normalize, isAbsolute, sep, delimiter }
export default path
