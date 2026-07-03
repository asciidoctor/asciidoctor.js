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
 * Build a `<table>` gutter/code layout.
 * @param {string} html - per-line highlighted HTML
 * @param {number} start - first line number
 * @returns {[string, number]} the table markup and the character offset of the first code line
 */
function wrapNumberedTable(html, start) {
  const { lines, trailingNewline } = splitLines(html)
  const gutter = lines.map((_, i) => start + i).join('\n')
  // Keep the trailing newline so a callout on the LAST code line stays clean
  // (its conum is appended before the closing tags, not after them).
  const codeInner = lines.join('\n') + (trailingNewline ? '\n' : '')
  const preamble =
    '<table class="linenotable"><tbody><tr>' +
    `<td class="linenos"><pre class="lineno">${gutter}</pre></td>` +
    '<td class="code"><pre>'
  const suffix = '</pre></td></tr></tbody></table>'
  return [preamble + codeInner + suffix, preamble.length]
}

/**
 * Prepend a line-number span to each line; no line shift.
 * @param {string} html - per-line highlighted HTML
 * @param {number} start - first line number
 * @returns {string}
 */
function wrapNumberedInline(html, start) {
  const { lines, trailingNewline } = splitLines(html)
  const numbered = lines
    .map((line, i) => {
      const ln = `<span class="linenos">${start + i}</span>`
      // For an emphasised line, put the number INSIDE the highlight span so the
      // full-width span isn't pushed to the next line by a preceding number.
      if (line.startsWith('<span class="hljs-ln-highlight">')) {
        return line.replace(
          '<span class="hljs-ln-highlight">',
          `<span class="hljs-ln-highlight">${ln}`
        )
      }
      return `${ln}${line}`
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
   * @param {Object} opts - { highlightLines, numberLines, startLineNumber, ... }
   * @returns {Promise<string|[string, number]>} the highlighted HTML, or a [html, offset] tuple
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

    const start = opts.startLineNumber || 1
    if (opts.numberLines === 'table') {
      // Table mode shifts the code down by the gutter markup, so we return a
      // [html, offset] tuple. restoreCallouts() treats everything before `offset`
      // (a CHARACTER index) as an untouched preamble and starts counting source
      // lines at `offset` — so the offset points at the first character of the
      // first code line and the gutter lives entirely in the preamble.
      return wrapNumberedTable(html, start)
    }
    if (opts.numberLines === 'inline') {
      // Inline mode prepends a line-number span to each line without shifting
      // lines, so no offset is needed — a plain string is fine.
      return wrapNumberedInline(html, start)
    }

    // NOTE: opts.cssMode 'inline' is out of scope — highlight.js only emits
    // class-based markup. The build-mode equivalent is embedding the theme
    // stylesheet in <style> (see readThemeStylesheet).
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
