// ESM conversion of path_resolver.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby's File::ALT_SEPARATOR / File::SEPARATOR / Dir.pwd → process.cwd() on Node.js.
//   - Ruby's Pathname#relative_path_from → manual relative-path computation.
//   - Ruby's require 'pathname' is not needed; logic is inlined.
//   - The Opal / JRuby conditional root? overloads are omitted (Node.js only).
//   - Logging mixin is applied via applyLogging() after class definition.

import { applyLogging } from './logging.js'
import { UriSniffRx }   from './rx.js'

const DOT            = '.'
const DOT_DOT        = '..'
const DOT_SLASH      = './'
const SLASH          = '/'
const BACKSLASH      = '\\'
const DOUBLE_SLASH   = '//'
const URI_CLASSLOADER = 'uri:classloader:'
const WINDOWS_ROOT_RX = /^(?:[a-zA-Z]:)?[\\/]/

// Public: Handles all operations for resolving, cleaning and joining paths.
export class PathResolver {
  // Public: Construct a new PathResolver.
  //
  // fileSeparator - The String file separator (default: '/' or '\\' on Windows).
  // workingDir    - The String working directory (default: process.cwd()).
  constructor (fileSeparator = null, workingDir = null) {
    this.fileSeparator = fileSeparator ?? _platformSeparator()
    if (workingDir) {
      this.workingDir = this.root(workingDir) ? this.posixify(workingDir) : _expandPath(workingDir)
    } else {
      this.workingDir = typeof process !== 'undefined' ? process.cwd() : '/'
    }
    this._partitionPathSys = {}
    this._partitionPathWeb = {}
  }

  // Public: Check whether the specified path is an absolute path.
  //
  // Returns Boolean.
  absolutePath (path) {
    return path.startsWith(SLASH) ||
      (this.fileSeparator === BACKSLASH && WINDOWS_ROOT_RX.test(path)) ||
      UriSniffRx.test(path)
  }

  // Public: Check if the specified path is an absolute root path.
  //
  // Returns Boolean.
  root (path) {
    return this.absolutePath(path)
  }

  // Public: Determine if the path is a UNC (root) path.
  //
  // Returns Boolean.
  unc (path) {
    return path.startsWith(DOUBLE_SLASH)
  }

  // Public: Determine if the path is an absolute (root) web path.
  //
  // Returns Boolean.
  webRoot (path) {
    return path.startsWith(SLASH)
  }

  // Public: Determine whether path descends from base.
  //
  // Returns Integer offset if path descends from base, false otherwise.
  descendsFrom (path, base) {
    if (base === path) return 0
    if (base === SLASH) return path.startsWith(SLASH) ? 1 : false
    return path.startsWith(base + SLASH) ? base.length + 1 : false
  }

  // Public: Calculate the relative path to this absolute path from the specified base directory.
  //
  // Returns a String relative path, or the original path if it cannot be made relative.
  relativePath (path, base) {
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

  // Public: Normalize path by converting backslashes to forward slashes.
  //
  // Returns the posixified String path.
  posixify (path) {
    if (!path) return ''
    return this.fileSeparator === BACKSLASH && path.includes(BACKSLASH)
      ? path.replace(/\\/g, SLASH)
      : path
  }

  // Alias
  posixfy (path) { return this.posixify(path) }

  // Public: Expand the path by resolving parent references (..) and removing self references (.).
  //
  // Returns the expanded String path.
  expandPath (path) {
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

  // Public: Partition the path into segments and a root prefix.
  //
  // path - the String path to partition
  // web  - Boolean: treat as web path (optional, default: false)
  //
  // Returns a 2-item Array [segments, root] where root may be null.
  partitionPath (path, web = false) {
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
          ? extracted[1]  // URL scheme, e.g. 'http://'
          : posixPath.slice(0, posixPath.indexOf(SLASH) + 1)  // Windows drive, e.g. 'C:/'
      }
    } else if (posixPath.startsWith(DOT_SLASH)) {
      root = DOT_SLASH
    }

    let relative = root ? posixPath.slice(root.length) : posixPath
    let segments = relative.split(SLASH).filter(s => s !== DOT && s !== '')
    // Re-add non-empty-string DOT segments removal is as above; preserve empty for UNC
    segments = relative.split(SLASH).filter(s => s !== DOT)
    // Remove any empty segments (trailing slash artifacts) except retain intent
    segments = segments.filter(s => s !== '')

    const result = [segments, root]
    cache[path] = result
    return result
  }

  // Public: Join segments with posix separator, prepending root if provided.
  //
  // Returns the joined String path.
  joinPath (segments, root = null) {
    return root ? `${root}${segments.join(SLASH)}` : segments.join(SLASH)
  }

  // Public: Securely resolve a system path.
  //
  // target - the String target path
  // start  - the String start path (default: null)
  // jail   - the String jail path (default: null)
  // opts   - options: recover (Boolean, default: true), target_name (String)
  //
  // Returns an absolute posix String path.
  systemPath (target, start = null, jail = null, opts = {}) {
    const recover    = opts.recover !== false
    const targetName = opts.targetName ?? opts.target_name ?? 'path'

    if (jail) {
      if (!this.root(jail)) throw new Error(`Jail is not an absolute path: ${jail}`)
      jail = this.posixify(jail)
    }

    let targetSegments
    if (target) {
      if (this.root(target)) {
        const targetPath = this.expandPath(target)
        if (jail && this.descendsFrom(targetPath, jail) === false) {
          if (!recover) throw new SecurityError(`${targetName} ${target} is outside of jail: ${jail} (disallowed in safe mode)`)
          this.logger.warn(`${targetName} is outside of jail; recovering automatically`)
          const [ts]          = this.partitionPath(targetPath)
          const [js, jr]      = this.partitionPath(jail)
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
    if (jail && (recheck = this.descendsFrom(start, jail) === false) && this.fileSeparator === BACKSLASH) {
      const [ss, sr] = this.partitionPath(start)
      const [js, jr] = this.partitionPath(jail)
      if (sr !== jr) {
        if (!recover) throw new SecurityError(`start path for ${targetName} ${start} refers to location outside jail root: ${jail} (disallowed in safe mode)`)
        this.logger.warn(`start path for ${targetName} is outside of jail root; recovering automatically`)
        startSegments = js
        jailRoot      = jr
        recheck       = false
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
                this.logger.warn(`${targetName} has illegal reference to ancestor of jail; recovering automatically`)
                warned = true
              }
            } else {
              throw new SecurityError(`${targetName} ${target} refers to location outside jail: ${jail} (disallowed in safe mode)`)
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
        this.logger.warn(`${targetName} is outside of jail; recovering automatically`)
        let jailSegments
        ;[jailSegments] = this.partitionPath(jail)
        return this.joinPath(jailSegments.concat(targetSegments), jailRoot)
      } else {
        throw new SecurityError(`${targetName} ${target} is outside of jail: ${jail} (disallowed in safe mode)`)
      }
    }

    return this.joinPath(resolvedSegments, jailRoot)
  }

  // Public: Resolve a web path from the target and start paths.
  //
  // target - the String target path
  // start  - the String start (parent) path (default: null)
  //
  // Returns a String path with parent references resolved and self references removed.
  webPath (target, start = null) {
    target = this.posixify(target)
    start  = this.posixify(start)

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
    if (resolvedPath.includes(' ')) resolvedPath = resolvedPath.replace(/ /g, '%20')

    return uriPrefix ? `${uriPrefix}${resolvedPath}` : resolvedPath
  }

  // Internal: Extract the URI prefix from a string if it is a URI.
  //
  // Returns [string_without_prefix, prefix] Array if URI, or the original string.
  _extractUriPrefix (str) {
    if (str.includes(':')) {
      const m = str.match(UriSniffRx)
      if (m) return [str.slice(m[0].length), m[0]]
    }
    return str
  }
}

applyLogging(PathResolver.prototype)

// ── Helpers ───────────────────────────────────────────────────────────────────

function _platformSeparator () {
  if (typeof process !== 'undefined' && process.platform === 'win32') return '\\'
  return '/'
}

// Minimal expand_path for Node.js (absolute → posix string).
function _expandPath (p) {
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

// Compute relative path from `base` to `target` (both absolute POSIX strings).
function _computeRelativePath (target, base) {
  const targetParts = target.split('/').filter(Boolean)
  const baseParts   = base.split('/').filter(Boolean)
  let common = 0
  while (common < targetParts.length && common < baseParts.length && targetParts[common] === baseParts[common]) {
    common++
  }
  const up   = baseParts.length - common
  const down = targetParts.slice(common)
  return [...Array(up).fill('..'), ...down].join('/') || '.'
}

// Simple SecurityError class (Ruby raises SecurityError).
class SecurityError extends Error {
  constructor (msg) {
    super(msg)
    this.name = 'SecurityError'
  }
}
