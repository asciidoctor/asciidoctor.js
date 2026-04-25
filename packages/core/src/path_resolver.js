// ESM conversion of path_resolver.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby's File::ALT_SEPARATOR / File::SEPARATOR / Dir.pwd → process.cwd() on Node.js.
//   - Ruby's Pathname#relative_path_from → manual relative-path computation.
//   - Ruby's require 'pathname' is not needed; logic is inlined.
//   - The Opal / JRuby conditional root? overloads are omitted (Node.js only).
//   - Logging mixin is applied via applyLogging() after class definition.

import { applyLogging } from './logging.js'
import { UriSniffRx } from './rx.js'

const DOT = '.'
const DOT_DOT = '..'
const DOT_SLASH = './'
const SLASH = '/'
const BACKSLASH = '\\'
const DOUBLE_SLASH = '//'
const URI_CLASSLOADER = 'uri:classloader:'
const WINDOWS_ROOT_RX = /^(?:[a-zA-Z]:)?[\\/]/

/** Handles all operations for resolving, cleaning and joining paths. */
export class PathResolver {
  /**
   * Construct a new PathResolver.
   * @param {string|null} fileSeparator - The file separator (default: '/' or '\\' on Windows).
   * @param {string|null} workingDir - The working directory (default: process.cwd()).
   */
  constructor(fileSeparator = null, workingDir = null) {
    this.fileSeparator = fileSeparator ?? _platformSeparator()
    if (workingDir) {
      this.workingDir = this.root(workingDir)
        ? this.posixify(workingDir)
        : _expandPath(workingDir)
    } else {
      this.workingDir = typeof process !== 'undefined' ? process.cwd() : '/'
    }
    this._partitionPathSys = {}
    this._partitionPathWeb = {}
  }

  /**
   * Check whether the specified path is an absolute path.
   * @param {string} path
   * @returns {boolean}
   */
  absolutePath(path) {
    return (
      path.startsWith(SLASH) ||
      (this.fileSeparator === BACKSLASH && WINDOWS_ROOT_RX.test(path)) ||
      UriSniffRx.test(path)
    )
  }

  /**
   * Check if the specified path is an absolute root path.
   * @param {string} path
   * @returns {boolean}
   */
  root(path) {
    return this.absolutePath(path)
  }

  /**
   * Determine if the path is a UNC (root) path.
   * @param {string} path
   * @returns {boolean}
   */
  unc(path) {
    return path.startsWith(DOUBLE_SLASH)
  }

  /**
   * Determine if the path is an absolute (root) web path.
   * @param {string} path
   * @returns {boolean}
   */
  webRoot(path) {
    return path.startsWith(SLASH)
  }

  /**
   * Determine whether path descends from base.
   * @param {string} path
   * @param {string} base
   * @returns {number|false} Offset if path descends from base, false otherwise.
   */
  descendsFrom(path, base) {
    if (base === path) return 0
    if (base === SLASH) return path.startsWith(SLASH) ? 1 : false
    return path.startsWith(base + SLASH) ? base.length + 1 : false
  }

  /**
   * Calculate the relative path to this absolute path from the specified base directory.
   * @param {string} path
   * @param {string} base
   * @returns {string} Relative path, or the original path if it cannot be made relative.
   */
  relativePath(path, base) {
    if (this.root(path)) {
      const posixBase = this.posixify(base)
      const offset = this.descendsFrom(path, posixBase)
      if (offset !== false) return path.slice(offset)
      try {
        return _computeRelativePath(path, posixBase)
      } catch {
        return path
      }
    }
    return path
  }

  /**
   * Normalize path by converting backslashes to forward slashes.
   * @param {string} path
   * @returns {string} The posixified path.
   */
  posixify(path) {
    if (!path) return ''
    return this.fileSeparator === BACKSLASH && path.includes(BACKSLASH)
      ? path.replace(/\\/g, SLASH)
      : path
  }

  /**
   * @param {string} path
   * @returns {string}
   */
  posixfy(path) {
    return this.posixify(path)
  }

  /**
   * Expand the path by resolving parent references (..) and removing self references (.).
   * @param {string} path
   * @returns {string} The expanded path.
   */
  expandPath(path) {
    const [pathSegments, pathRoot] = this.partitionPath(path)
    if (path.includes(DOT_DOT)) {
      const resolved = []
      for (const seg of pathSegments) {
        seg === DOT_DOT ? resolved.pop() : resolved.push(seg)
      }
      return this.joinPath(resolved, pathRoot)
    }
    return this.joinPath(pathSegments, pathRoot)
  }

  /**
   * Partition the path into segments and a root prefix.
   * @param {string} path - The path to partition.
   * @param {boolean} [web=false] - Treat as web path.
   * @returns {[string[], string|null]} A 2-item array [segments, root] where root may be null.
   */
  partitionPath(path, web = false) {
    const cache = web ? this._partitionPathWeb : this._partitionPathSys
    if (cache[path]) return cache[path]

    const posixPath = this.posixify(path)
    let root = null

    if (web) {
      if (this.webRoot(posixPath)) {
        root = SLASH
      } else if (posixPath.startsWith(DOT_SLASH)) {
        root = DOT_SLASH
      }
    } else if (this.root(posixPath)) {
      if (this.unc(posixPath)) {
        root = DOUBLE_SLASH
      } else if (posixPath.startsWith(SLASH)) {
        root = SLASH
      } else if (posixPath.startsWith(URI_CLASSLOADER)) {
        root = URI_CLASSLOADER
      } else {
        const extracted = this._extractUriPrefix(posixPath)
        root = Array.isArray(extracted)
          ? extracted[1] // URL scheme, e.g. 'http://'
          : posixPath.slice(0, posixPath.indexOf(SLASH) + 1) // Windows drive, e.g. 'C:/'
      }
    } else if (posixPath.startsWith(DOT_SLASH)) {
      root = DOT_SLASH
    }

    const relative = root ? posixPath.slice(root.length) : posixPath
    let segments = relative.split(SLASH).filter((s) => s !== DOT && s !== '')
    // Re-add non-empty-string DOT segments removal is as above; preserve empty for UNC
    segments = relative.split(SLASH).filter((s) => s !== DOT)
    // Remove any empty segments (trailing slash artifacts) except retain intent
    segments = segments.filter((s) => s !== '')

    const result = [segments, root]
    cache[path] = result
    return result
  }

  /**
   * Join segments with posix separator, prepending root if provided.
   * @param {string[]} segments
   * @param {string|null} [root=null]
   * @returns {string} The joined path.
   */
  joinPath(segments, root = null) {
    return root ? `${root}${segments.join(SLASH)}` : segments.join(SLASH)
  }

  /**
   * Securely resolve a system path.
   * @param {string} target - The target path.
   * @param {string|null} [start=null] - The start path.
   * @param {string|null} [jail=null] - The jail path.
   * @param {Object} [opts={}] - Options.
   * @param {boolean} [opts.recover=true] - Recover from jail escapes instead of throwing.
   * @param {string} [opts.targetName='path'] - Name used in error messages.
   * @returns {string} An absolute posix path.
   */
  systemPath(target, start = null, jail = null, opts = {}) {
    const recover = opts.recover !== false
    const targetName = opts.targetName ?? opts.target_name ?? 'path'

    if (jail) {
      if (!this.root(jail))
        throw new Error(`Jail is not an absolute path: ${jail}`)
      jail = this.posixify(jail)
    }

    let targetSegments
    if (target) {
      if (this.root(target)) {
        const targetPath = this.expandPath(target)
        if (jail && this.descendsFrom(targetPath, jail) === false) {
          if (!recover)
            throw new SecurityError(
              `${targetName} ${target} is outside of jail: ${jail} (disallowed in safe mode)`
            )
          this.logger.warn(
            `${targetName} is outside of jail; recovering automatically`
          )
          const [ts] = this.partitionPath(targetPath)
          const [js, jr] = this.partitionPath(jail)
          return this.joinPath(js.concat(ts), jr)
        }
        return targetPath
      }
      ;[targetSegments] = this.partitionPath(target)
    } else {
      targetSegments = []
    }

    let startSegments, jailRoot, recheck

    if (targetSegments.length === 0) {
      if (!start) {
        return jail ?? this.workingDir
      } else if (this.root(start)) {
        if (!jail) return this.expandPath(start)
        start = this.posixify(start)
      } else {
        ;[targetSegments] = this.partitionPath(start)
        start = jail ?? this.workingDir
      }
    } else if (!start) {
      start = jail ?? this.workingDir
    } else if (this.root(start)) {
      if (jail) start = this.posixify(start)
    } else {
      start = `${(jail ?? this.workingDir).replace(/\/$/, '')}/${start}`
    }

    // Check if start is within jail
    if (
      jail &&
      (recheck = this.descendsFrom(start, jail) === false) &&
      this.fileSeparator === BACKSLASH
    ) {
      const [ss, sr] = this.partitionPath(start)
      const [js, jr] = this.partitionPath(jail)
      if (sr !== jr) {
        if (!recover)
          throw new SecurityError(
            `start path for ${targetName} ${start} refers to location outside jail root: ${jail} (disallowed in safe mode)`
          )
        this.logger.warn(
          `start path for ${targetName} is outside of jail root; recovering automatically`
        )
        startSegments = js
        jailRoot = jr
        recheck = false
      } else {
        ;[startSegments, jailRoot] = [ss, sr]
      }
    } else {
      ;[startSegments, jailRoot] = this.partitionPath(start)
    }

    let resolvedSegments = startSegments.concat(targetSegments)

    if (resolvedSegments.includes(DOT_DOT)) {
      const unresolved = resolvedSegments
      resolvedSegments = []

      if (jail) {
        let jailSegments
        ;[jailSegments] = this.partitionPath(jail)
        let warned = false
        for (const seg of unresolved) {
          if (seg === DOT_DOT) {
            if (resolvedSegments.length > jailSegments.length) {
              resolvedSegments.pop()
            } else if (recover) {
              if (!warned) {
                this.logger.warn(
                  `${targetName} has illegal reference to ancestor of jail; recovering automatically`
                )
                warned = true
              }
            } else {
              throw new SecurityError(
                `${targetName} ${target} refers to location outside jail: ${jail} (disallowed in safe mode)`
              )
            }
          } else {
            resolvedSegments.push(seg)
          }
        }
      } else {
        for (const seg of unresolved) {
          seg === DOT_DOT ? resolvedSegments.pop() : resolvedSegments.push(seg)
        }
      }
    }

    if (recheck) {
      const targetPath = this.joinPath(resolvedSegments, jailRoot)
      if (this.descendsFrom(targetPath, jail) !== false) {
        return targetPath
      } else if (recover) {
        this.logger.warn(
          `${targetName} is outside of jail; recovering automatically`
        )
        const [jailSegments] = this.partitionPath(jail)
        return this.joinPath(jailSegments.concat(targetSegments), jailRoot)
      } else {
        throw new SecurityError(
          `${targetName} ${target} is outside of jail: ${jail} (disallowed in safe mode)`
        )
      }
    }

    return this.joinPath(resolvedSegments, jailRoot)
  }

  /**
   * Resolve a web path from the target and start paths.
   * @param {string} target - The target path.
   * @param {string|null} [start=null] - The start (parent) path.
   * @returns {string} Path with parent references resolved and self references removed.
   */
  webPath(target, start = null) {
    target = this.posixify(target)
    start = this.posixify(start)

    let uriPrefix = null
    if (start && !this.webRoot(target)) {
      const combined = `${start}${start.endsWith(SLASH) ? '' : SLASH}${target}`
      const extracted = this._extractUriPrefix(combined)
      if (Array.isArray(extracted)) {
        ;[target, uriPrefix] = extracted
      } else {
        target = extracted
      }
    }

    const [targetSegments, targetRoot] = this.partitionPath(target, true)
    const resolved = []
    for (const seg of targetSegments) {
      if (seg === DOT_DOT) {
        if (resolved.length === 0) {
          if (!targetRoot || targetRoot === DOT_SLASH) resolved.push(seg)
        } else if (resolved[resolved.length - 1] === DOT_DOT) {
          resolved.push(seg)
        } else {
          resolved.pop()
        }
      } else {
        resolved.push(seg)
      }
    }

    let resolvedPath = this.joinPath(resolved, targetRoot)
    if (resolvedPath.includes(' '))
      resolvedPath = resolvedPath.replace(/ /g, '%20')

    return uriPrefix ? `${uriPrefix}${resolvedPath}` : resolvedPath
  }

  /**
   * Extract the URI prefix from a string if it is a URI.
   * @param {string} str
   * @returns {[string, string]|string} [string_without_prefix, prefix] if URI, or the original string.
   * @internal
   */
  _extractUriPrefix(str) {
    if (str.includes(':')) {
      const m = str.match(UriSniffRx)
      if (m) return [str.slice(m[0].length), m[0]]
    }
    return str
  }
}

applyLogging(PathResolver.prototype)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * @returns {string}
 * @internal
 */
function _platformSeparator() {
  if (typeof process !== 'undefined' && process.platform === 'win32')
    return '\\'
  return '/'
}

/**
 * @param {string} p
 * @returns {string}
 * @internal
 */
function _expandPath(p) {
  if (typeof process !== 'undefined') {
    // Lazy import to avoid top-level await
    try {
      // eslint-disable-next-line n/no-sync
      const path = require('node:path')
      return path.resolve(p).replace(/\\/g, '/')
    } catch {}
  }
  return p
}

/**
 * @param {string} target
 * @param {string} base
 * @returns {string}
 * @internal
 */
function _computeRelativePath(target, base) {
  const targetParts = target.split('/').filter(Boolean)
  const baseParts = base.split('/').filter(Boolean)
  let common = 0
  while (
    common < targetParts.length &&
    common < baseParts.length &&
    targetParts[common] === baseParts[common]
  ) {
    common++
  }
  const up = baseParts.length - common
  const down = targetParts.slice(common)
  return [...Array(up).fill('..'), ...down].join('/') || '.'
}

// Simple SecurityError class (Ruby raises SecurityError).
class SecurityError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'SecurityError'
  }
}
