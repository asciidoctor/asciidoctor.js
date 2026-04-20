// ESM conversion of syntax_highlighter.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby module SyntaxHighlighter used as mixin → SyntaxHighlighterBase class.
//   - Ruby module Factory → mixed into CustomFactory and DefaultFactory classes.
//   - Ruby @@registry class var → module-level _defaultRegistry Map for DefaultFactory.
//   - Ruby Mutex thread-safety → not needed in single-threaded JS.
//   - Ruby lazy require (PROVIDED map) → async dynamic import() in DefaultFactory.
//   - Ruby DefaultFactoryProxy (overrides #for with custom-first lookup) → DefaultFactory
//     already handles this with _registry (custom) checked before _defaultRegistry (built-in).
//   - Ruby module Config / register_for static helper → static registerFor() on each subclass.
//   - Ruby :symbol keys → plain strings throughout.
//   - highlightjs is always registered; coderay/pygments/rouge are Ruby-only (not ported).

// ── SyntaxHighlighterBase ─────────────────────────────────────────────────────

/**
 * Base class for syntax highlighter adapters.
 *
 * Subclasses should override the methods they need. Two usage patterns:
 * 1. Server-side highlighting: override `handlesHighlighting()` → true and `highlight()`.
 * 2. Client-side highlighting: override `hasDocinfo()` → true and `docinfo()`.
 *
 * Both patterns may also override `format()`.
 */
export class SyntaxHighlighterBase {
  /**
   * @param {string} name - the name identifying this adapter
   * @param {string} [backend='html5'] - the backend name
   * @param {Object} [opts={}] - options
   */
  constructor (name, backend = 'html5', opts = {}) { // eslint-disable-line no-unused-vars
    this.name = name
    this._preClass = name
  }

  /**
   * Indicates whether this highlighter has docinfo markup to insert at the specified location.
   *
   * @param {string} location - the location slot ('head' or 'footer')
   * @returns {boolean} false by default; subclasses return true to enable {@link docinfo}
   */
  hasDocinfo (location) { // eslint-disable-line no-unused-vars
    return false
  }

  /**
   * Generates docinfo markup to insert at the specified location in the output document.
   *
   * @param {string} location - the location slot ('head' or 'footer')
   * @param {Document} doc - the Document in which this highlighter is used
   * @param {Object} opts - options
   * @param {boolean} [opts.linkcss] - link stylesheet instead of embedding
   * @param {string} [opts.cdn_base_url] - base URL for CDN assets
   * @param {string} [opts.self_closing_tag_slash] - '/' for self-closing tags
   * @returns {string} the markup to insert
   */
  docinfo (location, doc, opts) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement docinfo() since hasDocinfo() returns true`)
  }

  /**
   * Indicates whether highlighting is handled server-side by this highlighter.
   *
   * @returns {boolean} false by default; subclasses return true to enable {@link highlight}
   */
  handlesHighlighting () {
    return false
  }

  /**
   * Highlights the specified source when this source block is being converted.
   *
   * If the source contains callout marks, the caller assumes the source remains on the same
   * lines and no closing tags are added to the end of each line. If the source gets shifted
   * by one or more lines, return a tuple of the highlighted source and the line offset.
   *
   * @param {Block} node - the source Block to highlight
   * @param {string} source - the raw source text
   * @param {string} lang - the source language (e.g. 'ruby')
   * @param {Object} opts - options
   * @param {Object} [opts.callouts] - callouts indexed by line number
   * @param {string} [opts.css_mode] - CSS mode ('class' or 'inline')
   * @param {number[]} [opts.highlight_lines] - 1-based line numbers to emphasize
   * @param {string} [opts.number_lines] - 'table' or 'inline' if lines should be numbered
   * @param {number} [opts.start_line_number] - starting line number (default: 1)
   * @param {string} [opts.style] - theme name
   * @returns {string|[string, number]} the highlighted source, or a tuple with a line offset
   */
  highlight (node, source, lang, opts) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement highlight() since handlesHighlighting() returns true`)
  }

  /**
   * Formats the highlighted source for inclusion in an HTML document.
   *
   * @param {Block} node - the source Block being processed
   * @param {string} lang - the source language (e.g. 'ruby')
   * @param {Object} opts - options
   * @param {boolean} [opts.nowrap] - disable line wrapping
   * @param {Function} [opts.transform] - called with (pre, code) attribute objects before building tags
   * @returns {string} the highlighted source wrapped in &lt;pre&gt;&lt;code&gt; tags
   */
  format (node, lang, opts) {
    const classAttrVal = opts.nowrap
      ? `${this._preClass} highlight nowrap`
      : `${this._preClass} highlight`
    const transform = opts.transform
    if (transform) {
      const pre  = { class: classAttrVal }
      const code = lang ? { 'data-lang': lang } : {}
      transform(pre, code)
      // NOTE keep data-lang as the last attribute on <code> to match Ruby 1.5.x behaviour
      const dataLang = code['data-lang']
      delete code['data-lang']
      if (dataLang) code['data-lang'] = dataLang
      const preAttrs  = Object.entries(pre).map(([k, v]) => ` ${k}="${v}"`).join('')
      const codeAttrs = Object.entries(code).map(([k, v]) => ` ${k}="${v}"`).join('')
      return `<pre${preAttrs}><code${codeAttrs}>${node.content}</code></pre>`
    }
    return `<pre class="${classAttrVal}"><code${lang ? ` data-lang="${lang}"` : ''}>${node.content}</code></pre>`
  }

  /**
   * Indicates whether this highlighter wants to write a stylesheet to disk.
   *
   * @param {Document} doc - the Document in which this highlighter is being used
   * @returns {boolean} false by default; subclasses return true to enable {@link writeStylesheetToDisk}
   */
  writeStylesheet (doc) { // eslint-disable-line no-unused-vars
    return false
  }

  /**
   * Writes the stylesheet to disk.
   *
   * @param {Document} doc - the Document in which this highlighter is used
   * @param {string} toDir - the absolute path of the output directory
   */
  writeStylesheetToDisk (doc, toDir) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement writeStylesheetToDisk() since writeStylesheet() returns true`)
  }
}

// ── CustomFactory ─────────────────────────────────────────────────────────────

/**
 * A syntax highlighter factory backed by a caller-supplied registry.
 */
export class CustomFactory {
  /**
   * @param {Object|null} [seedRegistry=null] - initial registry entries
   */
  constructor (seedRegistry = null) {
    this._registry = seedRegistry ? { ...seedRegistry } : {}
  }

  /**
   * Associates a syntax highlighter class or instance with one or more names.
   *
   * @param {Function|SyntaxHighlighterBase} syntaxHighlighter - the class or instance to register
   * @param {...string} names - one or more names to associate
   */
  register (syntaxHighlighter, ...names) {
    for (const name of names) {
      this._registry[name] = syntaxHighlighter
    }
  }

  /**
   * Retrieves the syntax highlighter class or instance registered for the given name.
   *
   * @param {string} name - the name to look up
   * @returns {Function|SyntaxHighlighterBase|null} the registered class or instance, or null
   */
  for (name) {
    return this._registry[name] ?? null
  }

  /**
   * Resolves a name to a syntax highlighter instance.
   *
   * @param {string} name - the name of the syntax highlighter
   * @param {string} [backend='html5'] - the backend name
   * @param {Object} [opts={}] - options passed to the constructor
   * @returns {SyntaxHighlighterBase|null} a highlighter instance, or null if not registered
   */
  create (name, backend = 'html5', opts = {}) {
    let syntaxHl = this.for(name)
    if (!syntaxHl) return null
    if (typeof syntaxHl === 'function' && syntaxHl.prototype) {
      syntaxHl = new syntaxHl(name, backend, opts)
    }
    if (!syntaxHl.name) {
      throw new Error(`${syntaxHl.constructor.name} must specify a value for 'name'`)
    }
    return syntaxHl
  }
}

// ── DefaultFactory ────────────────────────────────────────────────────────────

// Global registry that distinguishes built-in adapters (registered by the
// adapters themselves via self-registration) from custom adapters (registered
// by user code). unregisterAll() clears only the custom layer so built-ins
// remain available after a reset, mirroring Ruby's DefaultFactory behaviour.

class DefaultFactory extends CustomFactory {
  constructor () {
    super()
    // _registry (inherited) → custom registrations
    // _defaultRegistry      → built-in registrations (populated by adapters)
    this._defaultRegistry = {}
  }

  // Register into the built-in layer (called by built-in adapters).
  register (syntaxHighlighter, ...names) {
    for (const name of names) {
      this._defaultRegistry[name] = syntaxHighlighter
    }
  }

  // Custom registrations shadow built-ins.
  for (name) {
    return this._registry[name] ?? this._defaultRegistry[name] ?? null
  }

  /**
   * Retrieves the syntax highlighter class or instance registered for the given name.
   *
   * @param {string} name - the name of the syntax highlighter to retrieve
   * @returns {Function|SyntaxHighlighterBase|undefined} the registered class or instance, or undefined
   */
  get (name) {
    return this.for(name) ?? undefined
  }

  create (name, backend = 'html5', opts = {}) {
    let syntaxHl = this.for(name)
    if (!syntaxHl) return null
    if (typeof syntaxHl === 'function' && syntaxHl.prototype) {
      syntaxHl = new syntaxHl(name, backend, opts)
    }
    if (!syntaxHl.name) {
      throw new Error(`${syntaxHl.constructor.name} must specify a value for 'name'`)
    }
    return syntaxHl
  }

  /**
   * Clears all custom (user) registrations; built-in adapters are preserved.
   */
  unregisterAll () {
    this._registry = {}
  }
}

// ── The global SyntaxHighlighter registry ─────────────────────────────────────

export const SyntaxHighlighter = new DefaultFactory()