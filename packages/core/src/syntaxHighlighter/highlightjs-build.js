// Node-only build engine for the highlightjs adapter's build mode.
//
// highlightjs.js imports this module and delegates the build-time colourising to
// it. This is the SERVER implementation (`supported: true`): it works on any
// runtime that provides `node:module` and can load npm packages — Node.js, Deno,
// Bun, etc. We deliberately do NOT sniff the runtime (e.g. `process.versions.node`),
// which would false-negative on Deno and other Node-like runtimes; instead, the
// only "unsupported" path is the browser, handled definitively at build time: the
// browser bundle replaces this module with a stub exporting `{ supported: false }`
// (see rollup.config.js), so highlightjs.js there reverts to client-side
// highlighting (and logs a warning), and the browser bundle never carries the
// highlight.js loading / filesystem code. If the optional dependency is genuinely
// missing on a server runtime, loadHljs() throws a clear, actionable error.
//
//   - `highlight.js` is an OPTIONAL peerDependency, loaded lazily via a runtime
//     require (obtained from `await import('node:module')`, the codebase's
//     browser-safe pattern). A runtime require is opaque to rollup, so highlight.js
//     is never bundled and stays optional; a clear error is thrown if it is missing.
//   - Callouts are handled entirely by the core: extractCallouts() strips the
//     conums BEFORE highlight() runs and restoreCallouts() re-appends them AFTER,
//     line by line. This engine only preserves line integrity (splitSpansPerLine).

// highlight.js is a singleton shared across documents/conversions.
let _hljs
let _nodeRequire

/**
 * Lazily load the optional highlight.js dependency and cache it. A runtime
 * require keeps highlight.js out of the bundle and optional.
 * @returns {Promise<any>} the highlight.js module
 * @throws {Error} with an actionable message when highlight.js is not installed
 */
async function loadHljs() {
  if (_hljs) return _hljs
  const { createRequire } = await import('node:module')
  _nodeRequire = createRequire(import.meta.url)
  let mod
  try {
    mod = _nodeRequire('highlight.js')
  } catch {
    throw new Error(
      "Build-time syntax highlighting (:highlightjs-mode: build) requires the optional 'highlight.js' package, which is not installed. Install it with `npm install highlight.js`."
    )
  }
  _hljs = mod.default ?? mod
  return _hljs
}

/**
 * Re-emit hljs output so every line is a self-contained run of spans.
 *
 * highlight.js may produce a `<span>` that spans several source lines (multiline
 * strings, block comments). The core's restoreCallouts() splits the highlighted
 * HTML on `\n` and appends each conum at the END of its line; if a span were left
 * open across a newline, the conum would land inside it and inherit its colour
 * (e.g. a callout rendered as if it were part of a comment). To avoid that, we
 * close every open span before each newline and reopen them right after.
 *
 * @param {string} html - hljs HTML output
 * @returns {string}
 */
function splitSpansPerLine(html) {
  const stack = []
  let out = ''
  const tokenRx = /(<span\b[^>]*>)|(<\/span>)|([^<]+)/g
  let m
  while ((m = tokenRx.exec(html)) !== null) {
    if (m[1]) {
      stack.push(m[1])
      out += m[1]
    } else if (m[2]) {
      stack.pop()
      out += m[2]
    } else {
      const parts = m[3].split('\n')
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          out += '</span>'.repeat(stack.length) // close open spans
          out += '\n'
          out += stack.join('') // reopen them
        }
        out += parts[i]
      }
    }
  }
  return out
}

/**
 * Split highlighted HTML into per-line entries, tolerating a single trailing
 * newline (extractCallouts appends one when the LAST line carries a callout).
 * @param {string} html
 * @returns {{ lines: string[], trailingNewline: boolean }}
 */
function splitLines(html) {
  const trailingNewline = html.endsWith('\n')
  const body = trailingNewline ? html.slice(0, -1) : html
  return { lines: body.split('\n'), trailingNewline }
}

/**
 * Split each line into a two-cell CSS-grid row: an (empty) gutter cell `.ln` and
 * a code cell `.line`. The `<code>` is laid out as a two-column grid (see
 * BUILD_HELPER_CSS); the line numbers are generated with a CSS `counter()` on the
 * `.ln` cells (so they are never selected or copied, and the gutter auto-sizes to
 * the widest number — the `counter-reset` for `start=` is set on the `<code>` in
 * format()). This single layout replaces the old `<table>`/`inline` split:
 * whether a long line wraps (hanging indent) or scrolls horizontally is a CSS
 * concern driven by the block's standard `nowrap` option, not a numbering mode.
 *
 * Because the highlight lives in the code column only, it never covers the number,
 * and the gutter cell stretches to the row height so its separator spans a wrapped
 * line — both for free from the grid. Since the rows are plain `\n`-separated
 * lines, callouts need no `[html, offset]` realignment (the core appends the conum
 * after the row; format() then tucks it inside the `.line` cell).
 *
 * @param {string} html - per-line highlighted HTML
 * @returns {string}
 */
function wrapNumberedRows(html) {
  const { lines, trailingNewline } = splitLines(html)
  const openTag = '<span class="hljs-ln-highlight">'
  const numbered = lines
    .map((line) => {
      // Emphasised lines arrive wrapped in a full-line hljs-ln-highlight span;
      // move that class onto the code cell so the highlight fills the code column
      // (and only the code column — the number is a separate grid cell).
      const emphasised = line.startsWith(openTag) && line.endsWith('</span>')
      const codeClass = emphasised ? 'line hljs-ln-highlight' : 'line'
      const inner = emphasised
        ? line.slice(openTag.length, -'</span>'.length)
        : line
      return `<span class="ln"></span><span class="${codeClass}">${inner}</span>`
    })
    .join('\n')
  return numbered + (trailingNewline ? '\n' : '')
}

export const buildEngine = {
  // Whether build mode can run. True in this server implementation; the browser
  // build swaps in a stub with `supported: false` (see rollup.config.js).
  supported: true,

  /**
   * Colourise the (already callout-free) source with highlight.js.
   * @param {string} source - source WITHOUT callout marks (the core strips them first)
   * @param {string} lang - the source language, or null
   * @param {Object} opts - { highlightLines, numberLines, ... }
   * @returns {Promise<string>} the highlighted HTML
   */
  async highlight(source, lang, opts) {
    const hljs = await loadHljs()
    const language = lang && hljs.getLanguage(lang) ? lang : null
    const { value } = language
      ? hljs.highlight(source, { language, ignoreIllegals: true })
      : hljs.highlightAuto(source)

    // Critical for callouts: keep each line's spans self-contained.
    let html = splitSpansPerLine(value)

    // Emphasise highlighted lines (line-oriented, does not shift line count).
    if (opts.highlightLines?.length) {
      const set = new Set(opts.highlightLines)
      html = html
        .split('\n')
        .map((line, i) =>
          set.has(i + 1)
            ? `<span class="hljs-ln-highlight">${line}</span>`
            : line
        )
        .join('\n')
    }

    // A single numbered layout: per-line grid rows (a plain string the core can
    // split on \n to reattach callouts). The first line number (`start=`) is
    // applied as a `counter-reset` on the <code> in format(); wrap vs. horizontal
    // scroll is a CSS concern driven by the block's `nowrap` option, so the
    // specific `-linenums-mode` value (table/inline) no longer changes anything.
    if (opts.numberLines) return wrapNumberedRows(html)

    return html
  },

  /**
   * Read a highlight.js theme stylesheet from the installed package.
   * @param {string} theme - theme name (e.g. 'github', 'github-dark')
   * @returns {Promise<string|null>} the CSS, or null if it cannot be read
   */
  async readThemeStylesheet(theme) {
    try {
      await loadHljs() // ensures _nodeRequire is available
      const cssPath = _nodeRequire.resolve(
        `highlight.js/styles/${theme}.min.css`
      )
      const { readFile } = await import('node:fs/promises')
      return await readFile(cssPath, { encoding: 'utf8' })
    } catch {
      return null
    }
  },

  /**
   * The installed highlight.js version string, or null if unavailable.
   * @returns {Promise<string|null>}
   */
  async version() {
    try {
      return (await loadHljs()).versionString ?? null
    } catch {
      return null
    }
  },
}
