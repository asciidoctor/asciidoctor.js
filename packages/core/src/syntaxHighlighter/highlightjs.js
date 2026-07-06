// ESM conversion of syntax_highlighter/highlightjs.rb (plus a native build mode)
//
// Ruby-to-JavaScript notes:
//   - Ruby class SyntaxHighlighter::HighlightJsAdapter → HighlightJsAdapter extends SyntaxHighlighterBase.
//   - register_for 'highlightjs', 'highlight.js' → handled by the parent SyntaxHighlighter factory.
//   - HIGHLIGHT_JS_VERSION constant imported from constants.js.
//   - Ruby doc.getAttribute(name, default) → doc.getAttribute(name) with fallback using ?? operator.
//   - Ruby doc.attr? 'name' → doc.hasAttribute('name').
//   - Ruby string interpolation / multiline heredocs → template literals.
//   - Ruby :head / :footer symbols → plain strings 'head' / 'footer'.
//
// Build mode (a JavaScript-only extension, no Ruby counterpart):
//   Setting `:highlightjs-mode: build` makes this adapter colourise source blocks
//   at conversion time using the highlight.js library (via ./highlightjs-build.js),
//   instead of shipping the hljs runtime for the browser to colourise. Without the
//   attribute the adapter behaves exactly as before (client-side), so the default
//   registration stays backward compatible and no extra setup is required.
//
//   The Node-only build work lives in ./highlightjs-build.js (composition), so this
//   module stays browser-safe. In the browser build that module is stubbed with
//   `{ supported: false }` (see rollup.config.js); this adapter then warns once and
//   falls back to client-side highlighting.
//
//   highlight() and docinfo() are async (the core awaits them), which lets build
//   mode load the optional dependency and read the theme stylesheet on demand.

import { SyntaxHighlighterBase } from '../syntax_highlighter.js'
import { HIGHLIGHT_JS_VERSION } from '../constants.js'
import { buildEngine } from './highlightjs-build.js'

// Styling for the build-mode markup that highlight.js themes (and the default
// AsciiDoc stylesheet's pygments-scoped rules) do not cover: the line-number grid
// and the emphasised-line wrapper. Numbered source is a two-column CSS grid — an
// auto-sized gutter of CSS-counter numbers and the code — with no <table> and no
// emitted number text. Whether a long line wraps or scrolls horizontally follows
// the block's standard `nowrap` option (the core adds a `nowrap` class to the
// <pre>). Injected in build mode alongside the theme so the output is self-contained.
const BUILD_HELPER_CSS = `pre.highlightjs{overflow-x:auto}
/* non-numbered emphasis: a full-width highlighted line */
pre.highlightjs .hljs-ln-highlight{display:inline-block;width:100%;background-color:rgba(255,229,100,.28)}
/* line numbers: a two-column grid (auto-sized gutter | code). The number is a CSS
   counter on the gutter cell, so it is never selected/copied and the column sizes
   itself to the widest number. The gutter cell stretches to the row height, so its
   separator spans a wrapped line; the emphasis lives in the code column only, so it
   never covers the number and its background fills the column width */
pre.highlightjs code.linenums{display:grid;grid-template-columns:auto 1fr}
pre.highlightjs .ln{counter-increment:line;grid-column:1;text-align:right;padding:0 .8ch;border-right:1px solid;opacity:.3;-webkit-user-select:none;user-select:none}
pre.highlightjs .ln::before{content:counter(line)}
pre.highlightjs .line{grid-column:2;padding-left:.8ch}
pre.highlightjs .line.hljs-ln-highlight{background-color:rgba(255,229,100,.28)}
/* nowrap blocks: the code column grows to its content so the whole grid (numbers
   included) scrolls horizontally instead of wrapping */
pre.highlightjs.nowrap code.linenums{grid-template-columns:auto max-content}`

/**
 * Move whatever the core appended after a line's wrapper span (the callout guard
 * and one or more conums) back INSIDE that span. In numbered output the conum
 * would otherwise land after the `.line` grid cell — a stray grid item that would
 * shift every following cell; in non-numbered emphasis it would fall outside the
 * full-width highlight span. The core appends the conum after the outermost
 * closing tag, so we hoist the trailing conum tail before that tag. Lines without
 * a matching wrapper (or without a conum) are untouched.
 * @param {string} content
 * @returns {string}
 */
function moveConumsIntoLineWrapper(content) {
  return content
    .split('\n')
    .map((line) => {
      // numbered grid: conum sits after the `.line` code cell's closing tag
      let m = line.match(/^(.*<span class="line[ "].*)<\/span>(.+)$/)
      if (m?.[2].includes('class="conum"')) return `${m[1]}${m[2]}</span>`
      // non-numbered emphasis: conum sits after the highlight span
      if (!line.includes('hljs-ln-highlight')) return line
      m = line.match(/^(.*<span class="hljs-ln-highlight">.*)<\/span>(.+)$/)
      if (m?.[2].includes('class="conum"')) return `${m[1]}${m[2]}</span>`
      return line
    })
    .join('\n')
}

export class HighlightJsAdapter extends SyntaxHighlighterBase {
  constructor(...args) {
    super(...args)
    this.name = 'highlightjs'
    this._preClass = 'highlightjs'
    // opts is the third constructor argument; the factory passes { document }.
    /** @internal */
    this._document = args[2]?.document ?? null
  }

  /**
   * True when the document opted into build-time highlighting AND the current
   * environment supports it. When build mode is requested but unsupported (the
   * browser), warn once and fall back to client-side highlighting.
   * @internal
   */
  _buildMode() {
    if (this._document?.getAttribute('highlightjs-mode') !== 'build')
      return false
    if (!buildEngine.supported) {
      if (!this._warnedBuildUnsupported) {
        /** @internal */
        this._warnedBuildUnsupported = true
        this._document?.logger?.warn(
          'highlightjs-mode=build is not supported in this environment (it requires a server runtime); falling back to client-side highlighting'
        )
      }
      return false
    }
    return true
  }

  /** Colourise server-side only when build mode is active. */
  handlesHighlighting() {
    return this._buildMode()
  }

  /**
   * Colourise the (already callout-free) source with highlight.js (build mode).
   *
   * @param {Object} node - the source Block being highlighted
   * @param {string} source - source WITHOUT callout marks (the core strips them first)
   * @param {string} lang - the source language, or null
   * @param {Object} opts - { callouts, highlightLines, numberLines, startLineNumber }
   * @returns {Promise<string>} the highlighted HTML
   */
  async highlight(node, source, lang, opts) {
    return buildEngine.highlight(source, lang, opts)
  }

  /**
   * Wrap the source block in `<pre><code>` with highlight.js CSS classes.
   *
   * Adds `language-<lang>` and `hljs` to the `<code>` class attribute, and strips
   * the `highlight` class from `<pre>` when the `nohighlight-option` attribute is set.
   * In build mode with line numbers, marks the `<code>` as the numbering grid
   * (`linenums` class) and seeds the CSS line counter from the `start=` attribute.
   * @param {object} node - the source Block being processed
   * @param {string|null} lang - the source language string, or falsy if none
   * @param {object} opts - options passed to the base format()
   * @returns {Promise<string>}
   */
  async format(node, lang, opts) {
    const numbered = this._buildMode() && node.hasOption('linenums')
    const transform = (pre, code) => {
      if (node.hasAttribute('nohighlight-option')) {
        pre.class = pre.class.replace(' highlight', '')
      }
      code.class = `language-${lang || 'none'} hljs${numbered ? ' linenums' : ''}`
      if (numbered) {
        // seed the CSS counter so the first `.ln` cell shows `start` (default 1)
        const start = parseInt(node.getAttribute('start', 1), 10) || 1
        code.style = `counter-reset:line ${start - 1}`
      }
    }
    // In build mode, pull any trailing callouts inside the line/emphasis wrapper.
    const transformContent = this._buildMode()
      ? moveConumsIntoLineWrapper
      : undefined
    return super.format(node, lang, { ...opts, transform, transformContent })
  }

  /**
   * In build mode only the theme stylesheet is needed (no runtime script). In
   * client mode, both the head stylesheet and footer scripts are injected.
   * @param {string} location - 'head' or 'footer'
   * @returns {boolean}
   */
  hasDocinfo(location) {
    if (this._buildMode()) return location === 'head'
    return true
  }

  /**
   * Returns the docinfo markup for the given location.
   *
   * In build mode (head only): the theme stylesheet, embedded in a `<style>` tag
   * by default (read from the installed highlight.js package) or linked from the
   * CDN when `:highlightjs-stylesheet: link` is set. In client mode: the CSS
   * `<link>` (head) or the hljs runtime `<script>` tags (footer).
   *
   * @param {string} location - 'head' or 'footer'
   * @param {object} doc - the Document being converted
   * @param {{ cdn_base_url: string, self_closing_tag_slash: string }} opts
   * @returns {Promise<string>}
   */
  async docinfo(location, doc, opts) {
    if (this._buildMode()) return this._buildDocinfo(location, doc, opts)

    const baseUrl =
      doc.getAttribute('highlightjsdir') ??
      `${opts.cdn_base_url}/highlight.js/${HIGHLIGHT_JS_VERSION}`

    if (location === 'head') {
      const theme = doc.getAttribute('highlightjs-theme') ?? 'github'
      return `<link rel="stylesheet" href="${baseUrl}/styles/${theme}.min.css"${opts.self_closing_tag_slash ?? ''}>`
    }

    // footer
    const langScripts = doc.getAttribute('highlightjs-languages')
      ? doc
          .getAttribute('highlightjs-languages')
          .split(',')
          .map(
            (lang) =>
              `<script src="${baseUrl}/languages/${lang.trimStart()}.min.js"></script>\n`
          )
          .join('')
      : ''

    return `<script src="${baseUrl}/highlight.min.js"></script>
${langScripts}<script>
if (!hljs.initHighlighting.called) {
  hljs.initHighlighting.called = true
  ;[].slice.call(document.querySelectorAll('pre.highlight > code[data-lang]')).forEach(function (el) { hljs.highlightBlock(el) })
}
</script>`
  }

  /**
   * docinfo for build mode: the theme stylesheet, embedded (read from the
   * installed highlight.js package) or linked from the CDN.
   * @param {string} location - 'head'
   * @param {object} doc - the Document being converted
   * @param {{ cdn_base_url: string, self_closing_tag_slash: string }} opts
   * @returns {Promise<string>}
   * @internal
   */
  async _buildDocinfo(location, doc, opts) {
    const theme = doc.getAttribute('highlightjs-theme') ?? 'github'
    const stylesheetMode = doc.getAttribute('highlightjs-stylesheet') ?? 'embed'
    if (stylesheetMode !== 'link') {
      const css = await buildEngine.readThemeStylesheet(theme)
      // embed the theme + the build-markup helper CSS in a single <style>
      if (css) return `<style>\n${css}\n${BUILD_HELPER_CSS}\n</style>`
      // embed requested but the theme could not be read — warn and fall back to a CDN link
      doc?.logger?.warn(
        `highlightjs (build mode): could not read the '${theme}' theme stylesheet from the installed highlight.js package; linking it from the CDN instead (check the highlightjs-theme attribute)`
      )
    }
    const version = (await buildEngine.version()) ?? HIGHLIGHT_JS_VERSION
    const baseUrl =
      doc.getAttribute('highlightjsdir') ??
      `${opts.cdn_base_url}/highlight.js/${version}`
    // link the theme, but still embed the small helper CSS (the CDN theme does
    // not style the line-number gutters or the emphasised-line wrapper)
    return `<link rel="stylesheet" href="${baseUrl}/styles/${theme}.min.css"${opts.self_closing_tag_slash ?? ''}>
<style>\n${BUILD_HELPER_CSS}\n</style>`
  }
}

export default HighlightJsAdapter
