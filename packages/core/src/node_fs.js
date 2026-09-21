// Node.js filesystem access (lazy, optional) — shared by reader.js and
// abstract_node.js.
//
// No Ruby counterpart: in Ruby `File`/`IO` are always available, whereas this
// package also runs in browsers and WebWorkers where `node:fs` cannot be
// imported at all. The module is therefore imported on first use and its
// absence is reported as "the file does not exist", so callers degrade to
// browser-mode resolution instead of failing.
//
// The two values below are published *together*, once both imports have
// resolved, and every concurrent caller awaits the same initialization: a
// caller must never observe `_fsp` while `_fsConstants` is still undefined, or
// it would read F_OK/R_OK off `undefined`, swallow the resulting TypeError and
// misreport an existing file as missing
// (https://github.com/asciidoctor/asciidoctor.js/issues/1882).

let _fsp // undefined = not tried, null = unavailable, object = available
let _fsConstants // node:fs constants (F_OK, R_OK) — not on node:fs/promises
let _fspInit // in-flight initialization, shared by concurrent callers

/**
 * Lazily import `node:fs/promises`.
 *
 * @returns {Promise<typeof import('node:fs/promises')|null>} a Promise resolving to the
 *   module, or to null outside of Node.js.
 * @internal
 */
export async function requireFs() {
  if (_fsp !== undefined) return _fsp
  _fspInit ??= (async () => {
    try {
      const fsp = await import('node:fs/promises')
      _fsConstants = (await import('node:fs')).constants
      _fsp = fsp
    } catch {
      _fsp = null
    }
  })()
  await _fspInit
  return _fsp
}

/**
 * Whether `node:fs` is loaded and available. Only meaningful once
 * {@link requireFs} has been awaited; returns false before that.
 *
 * @returns {boolean}
 * @internal
 */
export function hasFs() {
  return !!_fsp
}

/**
 * Check whether the file at the given path exists (F_OK).
 *
 * @param {string} path
 * @returns {Promise<boolean>} a Promise resolving to false outside of Node.js.
 * @internal
 */
export async function fileExists(path) {
  const fsp = await requireFs()
  if (!fsp) return false
  try {
    await fsp.access(path, _fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Check whether the file at the given path is readable (R_OK).
 *
 * @param {string} path
 * @returns {Promise<boolean>} a Promise resolving to false outside of Node.js.
 * @internal
 */
export async function isReadable(path) {
  const fsp = await requireFs()
  if (!fsp) return false
  try {
    await fsp.access(path, _fsConstants.R_OK)
    return true
  } catch {
    return false
  }
}
