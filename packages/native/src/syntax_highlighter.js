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

// Public: Base class for syntax highlighter adapters.
//
// Subclasses should override the methods they need. Two usage patterns:
//   1. Server-side highlighting: override highlight?() → true and highlight().
//   2. Client-side highlighting: override docinfo?() → true and docinfo().
// Both patterns may also override format().

export class SyntaxHighlighterBase {
  // Public: Construct a syntax highlighter adapter instance.
  //
  // name    - The String name identifying this adapter.
  // backend - The String backend name (default: 'html5').
  // opts    - A plain Object of options (default: {}).
  constructor (name, backend = 'html5', opts = {}) {
    this.name = name
    this._preClass = name
  }

  // Public: Indicates whether this highlighter has docinfo markup to insert.
  //
  // location - The String location slot ('head' or 'footer').
  //
  // Returns false by default; subclasses return true to enable docinfo().
  docinfoFor (location) { // eslint-disable-line no-unused-vars
    return false
  }

  // Public: Generates docinfo markup for the specified location.
  //
  // location - The String location slot ('head' or 'footer').
  // doc      - The Document in which this highlighter is used.
  // opts     - A plain Object of options:
  //            linkcss              - Boolean; link stylesheet instead of embedding.
  //            cdn_base_url         - String base URL for CDN assets.
  //            self_closing_tag_slash - String '/' for self-closing tags.
  //
  // Returns the String markup to insert.
  docinfo (location, doc, opts) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement docinfo() since docinfoFor() returns true`)
  }

  // Public: Indicates whether highlighting is handled server-side.
  //
  // Returns false by default; subclasses return true to enable highlight().
  highlight () {
    return false
  }

  // Public: Highlights the specified source.
  //
  // node   - The source Block to highlight.
  // source - The raw source String.
  // lang   - The source language String (e.g. 'ruby').
  // opts   - A plain Object of options:
  //          callouts        - Object of callouts indexed by line number.
  //          css_mode        - String CSS mode ('class' or 'inline').
  //          highlight_lines - Array of 1-based Integer line numbers to emphasize.
  //          number_lines    - String ('table' or 'inline') if lines should be numbered.
  //          start_line_number - Integer starting line number (default: 1).
  //          style           - String theme name.
  //
  // Returns the highlighted source String, or a [String, Integer] tuple when the
  // source was shifted by one or more lines.
  highlightSource (node, source, lang, opts) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement highlightSource() since highlight() returns true`)
  }

  // Public: Format the highlighted source for inclusion in an HTML document.
  //
  // node - The source Block being processed.
  // lang - The source language String (e.g. 'ruby').
  // opts - A plain Object of options:
  //        nowrap    - Boolean; disable line wrapping.
  //        transform - Function(pre, code) called to mutate attribute objects before
  //                    building the HTML tags.
  //
  // Returns the highlighted source String wrapped in <pre><code> tags.
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

  // Public: Indicates whether this highlighter wants to write a stylesheet to disk.
  //
  // doc - The Document in which this highlighter is being used.
  //
  // Returns false by default.
  writeStylesheet (doc) { // eslint-disable-line no-unused-vars
    return false
  }

  // Public: Writes the stylesheet to disk.
  //
  // doc   - The Document in which this highlighter is used.
  // toDir - The absolute String path of the output directory.
  //
  // Returns nothing.
  writeStylesheetToDisk (doc, toDir) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement writeStylesheetToDisk() since writeStylesheet() returns true`)
  }
}

// ── CustomFactory ─────────────────────────────────────────────────────────────

// Public: A syntax highlighter factory backed by a caller-supplied registry.

export class CustomFactory {
  constructor (seedRegistry = null) {
    this._registry = seedRegistry ? { ...seedRegistry } : {}
  }

  // Public: Associates a syntax highlighter class or instance with one or more names.
  //
  // syntaxHighlighter - The class (constructor) or instance to register.
  // names             - One or more String names.
  register (syntaxHighlighter, ...names) {
    for (const name of names) {
      this._registry[name] = syntaxHighlighter
    }
  }

  // Public: Retrieves the syntax highlighter registered for the given name.
  //
  // name - The String name to look up.
  //
  // Returns the class or instance, or null if not found.
  for (name) {
    return this._registry[name] ?? null
  }

  // Public: Resolves a name to a syntax highlighter instance.
  //
  // name    - The String name of the syntax highlighter.
  // backend - The String backend name (default: 'html5').
  // opts    - A plain Object of options (default: {}).
  //
  // Returns a SyntaxHighlighterBase instance, or null if not registered.
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

  // Public: Clear custom (user) registrations; built-ins are preserved.
  unregisterAll () {
    this._registry = {}
  }
}

// ── The global SyntaxHighlighter registry ─────────────────────────────────────

export const SyntaxHighlighter = new DefaultFactory()
