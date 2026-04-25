// Browser-specific include path resolution for PreprocessorReader.
//
// This module implements the logic described in docs/modules/spec/pages/browser-include-spec.adoc
// and mirrors packages/core/lib/asciidoctor/js/asciidoctor_ext/browser/reader.rb.
//
// This logic is specific to Asciidoctor.js and has no equivalent in the upstream Ruby asciidoctor
// implementation. It handles the case where the document is loaded in a browser environment
// (XMLHttpRequest / Fetch IO module) where paths can be file:// or http(s):// URIs.
//
// The key behavioural differences from the standard file-system resolver:
//   - Relative targets are resolved by string concatenation against a URI context dir,
//     not via OS path normalisation.
//   - Absolute paths (e.g. /foo/bar) are rewritten to file:///foo/bar.
//   - All resolved includes are fetched via the Fetch API (targetType 'uri').
//
// Public API
// ----------
// resolveBrowserIncludePath(reader, target, attrlist)
//   reader   - a PreprocessorReader instance (provides _document, includeStack, _dir,
//              replaceNextLine)
//   target   - the raw include target string
//   attrlist - the raw attribute list string (used for error-message link construction)
//
//   Returns [incPath, relpath] on success, where:
//     incPath  - the absolute URI to fetch
//     relpath  - the path relative to the document base dir (used for include tracking)
//   Returns true/false when the include directive line has already been consumed/replaced
//   (mirrors the Boolean return convention used by _resolveIncludePath in reader.js).

import { isUriish } from '../helpers.js'

/**
 * Build the `link:...[...]` replacement text for a disallowed include.
 * @param {object} reader
 * @param {string} target
 * @param {string|null} attrlist
 * @returns {string}
 * @internal
 */
function _linkReplacement(reader, target, attrlist) {
  const doc = reader._document
  const lt = target.includes(' ') ? `pass:c[${target}]` : target
  const la = doc.hasAttr('compat-mode')
    ? (attrlist ?? '')
    : `role=include${attrlist ? `,${attrlist}` : ''}`
  return `link:${lt}[${la}]`
}

/**
 * Resolve an include path in a browser (URI-based) environment.
 *
 * Implements the rules from the browser-include-spec, in the same order:
 *
 * Top-level include (includeStack is empty):
 * 1. target starts with file:// → inc_path = relpath = target
 * 2. target is a URI → must descend from baseDir or allow-uri-read; else → link
 * 3. target is an absolute OS path → prepend file:// (or file:///)
 * 4. baseDir == '.' → inc_path = relpath = target  (resolved by XMLHttpRequest/fetch)
 * 5. baseDir starts with file:// OR baseDir is not a URI → inc_path = baseDir/target; relpath = target
 * 6. baseDir is an absolute URL → inc_path = baseDir/target; relpath = target
 *
 * Nested include (includeStack is non-empty):
 * Rules 1–3 same as top-level.
 * 4. parentDir == '.' → inc_path = relpath = target
 * 5. parentDir starts with file:// OR parentDir is not a URI
 *      → inc_path = parentDir/target
 *      → relpath = inc_path if baseDir=='.' or inc_path not under baseDir, else path difference
 * 6. parentDir is an absolute URL
 *      → must descend from baseDir or allow-uri-read; else → link
 *      → inc_path = parentDir/target
 *      → relpath = path difference if parentDir descends from baseDir, else target
 * @param {object} reader - a PreprocessorReader instance
 * @param {string} target - the raw include target string
 * @param {string|null} attrlist - the raw attribute list string
 * @returns {[string, string]|boolean} [incPath, relpath] on success, or boolean when the line was consumed.
 */
export function resolveBrowserIncludePath(reader, target, attrlist) {
  const doc = reader._document
  const pathResolver = doc.pathResolver
  // Normalise backslashes (Ruby: PathResolver.new('\\').posixify target)
  const pTarget = target.replace(/\\/g, '/')
  const baseDir = doc.baseDir
  const topLevel = reader.includeStack.length === 0
  const ctxDir = topLevel ? baseDir : reader._dir

  let incPath, relpath

  // ── Rule 1: target starts with file:// ────────────────────────────────────
  if (pTarget.startsWith('file://')) {
    incPath = relpath = pTarget

    // ── Rule 2: target is an absolute URL (http:// / https:// / …) ───────────
  } else if (isUriish(pTarget)) {
    const descends = pathResolver.descendsFrom(pTarget, baseDir)
    if (descends === false && !doc.attr('allow-uri-read')) {
      return reader.replaceNextLine(_linkReplacement(reader, target, attrlist))
    }
    incPath = relpath = pTarget

    // ── Rule 3: target is an absolute OS path ─────────────────────────────────
  } else if (pathResolver.absolutePath(pTarget)) {
    incPath = relpath = `file://${pTarget.startsWith('/') ? '' : '/'}${pTarget}`

    // ── Rule 4: context dir is '.' ────────────────────────────────────────────
    // Relative path resolved by fetch relative to window.location / request origin.
  } else if (ctxDir === '.') {
    incPath = relpath = pTarget

    // ── Rule 5: context dir is file:// OR a non-URI (regular OS path) ─────────
  } else if (ctxDir.startsWith('file://') || !isUriish(ctxDir)) {
    incPath = `${ctxDir}/${pTarget}`
    if (topLevel) {
      relpath = pTarget
    } else {
      const offset = pathResolver.descendsFrom(incPath, baseDir)
      if (baseDir === '.' || offset === false) {
        relpath = incPath
      } else {
        relpath = incPath.slice(offset)
      }
    }

    // ── Rule 6: context dir is an absolute URL ────────────────────────────────
  } else if (topLevel) {
    incPath = `${ctxDir}/${(relpath = pTarget)}`
  } else {
    // Nested include: context dir is an absolute URL.
    const ctxDescends = pathResolver.descendsFrom(ctxDir, baseDir)
    if (ctxDescends !== false || doc.attr('allow-uri-read')) {
      incPath = `${ctxDir}/${pTarget}`
      relpath = ctxDescends !== false ? incPath.slice(ctxDescends) : pTarget
    } else {
      return reader.replaceNextLine(_linkReplacement(reader, target, attrlist))
    }
  }

  return [incPath, relpath]
}
