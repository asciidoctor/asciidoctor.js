// ESM conversion of document.rb
//
// Ruby-to-JavaScript notes:
//   - Document extends AbstractBlock with super(self, 'document').
//   - Ruby Struct → plain class with named properties.
//   - Ruby `parse unless @parsed` → synchronous call since JS parse is synchronous.
//   - Extensions / SyntaxHighlighter are optional and loaded lazily.
//   - File.write / process.env / Time.now have Node.js equivalents.
//   - Mutex / thread-safety not applicable in single-threaded JS.
//   - `instance_variable_get :@attribute_overrides` → direct property access.

import { AbstractBlock } from './abstract_block.js'
import { Section } from './section.js'
import { Inline } from './inline.js'
import { Callouts } from './callouts.js'
import { PathResolver } from './path_resolver.js'
import { Compliance } from './compliance.js'
import { extname, nextval } from './helpers.js'
import {
  SafeMode,
  DEFAULT_ATTRIBUTES,
  DEFAULT_BACKEND,
  DEFAULT_DOCTYPE,
  BACKEND_ALIASES,
  DEFAULT_PAGE_WIDTHS,
  FLEXIBLE_ATTRIBUTES,
  USER_HOME,
} from './constants.js'
import { Converter, CustomFactory, deriveBackendTraits } from './converter.js'
import { XmlSanitizeRx, AttributeEntryPassMacroRx } from './rx.js'
import { LF } from './constants.js'
import { applyLogging } from './logging.js'
import { SyntaxHighlighter } from './syntax_highlighter.js'
/** @import { Reader } from './reader.js' */

// ── Helper structs ────────────────────────────────────────────────────────────

export class ImageReference {
  constructor(target, imagesdir) {
    this.target = target
    this.imagesdir = imagesdir
  }

  /**
   * @returns {string} the target image path or URI.
   */
  getTarget() {
    return this.target
  }

  /**
   * @returns {string} the images directory.
   */
  getImagesDirectory() {
    return this.imagesdir
  }

  toString() {
    return this.target
  }
}

export class Footnote {
  constructor(index, id, text) {
    this.index = index
    this.id = id ?? null
    this.text = text
  }

  /**
   * @returns {number} the index of this footnote.
   */
  getIndex() {
    return this.index
  }

  /**
   * @returns {string|null} the id of this footnote, or null if not set.
   */
  getId() {
    return this.id
  }

  /**
   * @returns {string} the text of this footnote.
   */
  getText() {
    return this.text
  }
}

export class AttributeEntry {
  constructor(name, value, negate = null) {
    this.name = name
    this.value = value
    this.negate = negate == null ? value == null : negate
  }

  saveTo(blockAttributes) {
    ;(blockAttributes.attribute_entries ??= []).push(this)
    return this
  }
}

/**
 * Parsed and stores a partitioned title (title & subtitle).
 */
export class DocumentTitle {
  constructor(val, opts = {}) {
    this._sanitized = !!(opts.sanitize && val.includes('<'))
    if (this._sanitized) {
      val = val.replace(XmlSanitizeRx, '').replace(/ {2,}/g, ' ').trim()
    }
    const sep = opts.separator ?? ':'
    const sepStr = sep ? `${sep} ` : null
    if (!sepStr || !val.includes(sepStr)) {
      this.main = val
      this.subtitle = null
    } else {
      const idx = val.lastIndexOf(sepStr)
      this.main = val.slice(0, idx)
      this.subtitle = val.slice(idx + sepStr.length)
    }
    this.combined = val
  }

  get title() {
    return this.main
  }

  isSanitized() {
    return this._sanitized
  }
  hasSubtitle() {
    return this.subtitle != null
  }
  getMain() {
    return this.main
  }
  getCombined() {
    return this.combined
  }
  getSubtitle() {
    return this.subtitle
  }
  toString() {
    return this.combined
  }
}

/**
 * Represents an Author parsed from document attributes.
 */
export class Author {
  constructor(name, firstname, middlename, lastname, initials, email) {
    this.name = name
    this.firstname = firstname
    this.middlename = middlename
    this.lastname = lastname
    this.initials = initials
    this.email = email
  }

  getName() {
    return this.name
  }
  getFirstName() {
    return this.firstname
  }
  getMiddleName() {
    return this.middlename
  }
  getLastName() {
    return this.lastname
  }
  getInitials() {
    return this.initials
  }
  getEmail() {
    return this.email
  }
}

export class RevisionInfo {
  constructor(number, date, remark) {
    this._number = number ?? null
    this._date = date ?? null
    this._remark = remark ?? null
  }

  isEmpty() {
    return !this._number && !this._date && !this._remark
  }
  getNumber() {
    return this._number
  }
  getDate() {
    return this._date
  }
  getRemark() {
    return this._remark
  }
}

// ── Document ──────────────────────────────────────────────────────────────────

export class Document extends AbstractBlock {
  /** @internal */
  _converter
  /** @internal */
  _maxAttributeValueSize
  /** @internal */
  _docinfoProcessorExtensions
  /** @internal */
  _attributesModified
  /** @internal */
  _counters
  /** @internal */
  _headerAttributes
  /** @internal */
  _reftexts
  /** @internal */
  _parsed
  /** @internal */
  _inputMtime
  /** @internal */
  _parentDoctype
  /** @internal */
  _initializeExtensions
  /** @internal */
  _timings
  /** @internal */
  _attributeOverrides
  /** @type {Reader} */
  reader
  /** @type {string} */
  doctype
  /** @type {string} */
  baseDir
  /** @type {string} */
  backend
  /** @type {number} */
  safe
  /** @type {boolean} */
  compatMode
  /** Override AbstractNode's getter so Document can own its converter directly. */
  get converter() {
    return this._converter
  }
  set converter(v) {
    this._converter = v
  }

  constructor(data = null, options = {}) {
    // Bootstrap: call super with a temporary placeholder — we'll fix parent ref below.
    // AbstractBlock(parent, context, opts) — we pass `null` and patch afterward.
    super(null, 'document', options)
    // Document is its own parent/document (write _parent directly to avoid shadowing the accessor).
    /** @internal */
    this._parent = this
    /** @internal */
    this.document = this

    const parentDoc = options.parent ?? null
    delete options.parent

    // ── Nested document setup ─────────────────────────────────────────────────
    if (parentDoc) {
      this.parentDocument = parentDoc
      options.base_dir ??= parentDoc.baseDir
      if (parentDoc.options.catalog_assets) options.catalog_assets = true
      if (parentDoc.options.to_dir) options.to_dir = parentDoc.options.to_dir

      this.catalog = { ...parentDoc.catalog, footnotes: [] }

      // Clone parent's attribute overrides merged with parent attributes
      this._attributeOverrides = {
        ...parentDoc._attributeOverrides,
        ...parentDoc.attributes,
      }
      const attrOverrides = this._attributeOverrides
      delete attrOverrides['compat-mode']
      const parentDoctype = attrOverrides.doctype
      delete attrOverrides.doctype
      delete attrOverrides.notitle
      delete attrOverrides.showtitle
      delete attrOverrides.toc
      this.attributes['toc-placement'] =
        attrOverrides['toc-placement'] ?? 'auto'
      delete attrOverrides['toc-placement']
      delete attrOverrides['toc-position']

      this.safe = parentDoc.safe
      this.compatMode = parentDoc.compatMode
      if (this.compatMode) this.attributes['compat-mode'] = ''
      this.outfilesuffix = parentDoc.outfilesuffix
      this.sourcemap = parentDoc.sourcemap
      this._timings = null
      this.pathResolver = parentDoc.pathResolver
      this.converter = parentDoc.converter
      this.extensions = parentDoc.extensions
      this.syntaxHighlighter = parentDoc.syntaxHighlighter
      this._initializeExtensions = null

      // For nested: re-use parent's @_parentDoctype
      this._parentDoctype = parentDoctype
    } else {
      // ── Root document setup ───────────────────────────────────────────────
      this.parentDocument = null
      this.catalog = {
        ids: {}, // deprecated
        refs: {},
        footnotes: [],
        links: [],
        images: [],
        callouts: new Callouts(),
        includes: {},
      }

      // Process attribute overrides from options
      this._attributeOverrides = {}
      const attrOverrides = this._attributeOverrides
      for (let [key, val] of Object.entries(options.attributes ?? {})) {
        if (key.endsWith('@')) {
          if (key.startsWith('!')) {
            key = key.slice(1, -1)
            val = false
          } else if (key.endsWith('!@')) {
            key = key.slice(0, -2)
            val = false
          } else {
            key = key.slice(0, -1)
            val = `${val}@`
          }
        } else if (key.startsWith('!')) {
          key = key.slice(1)
          val = val === '@' ? false : null
        } else if (key.endsWith('!')) {
          key = key.slice(0, -1)
          val = val === '@' ? false : null
        }
        attrOverrides[key.toLowerCase()] = val
      }

      if (typeof options.to_file === 'string') {
        attrOverrides.outfilesuffix = extname(options.to_file)
      }

      // Resolve safe mode
      const safeMode = options.safe
      if (!safeMode) {
        this.safe = SafeMode.SECURE
      } else if (typeof safeMode === 'number') {
        this.safe = safeMode
      } else {
        this.safe = SafeMode.valueForName(safeMode) ?? SafeMode.SECURE
      }

      this._inputMtime = options.input_mtime ?? null
      delete options.input_mtime
      this.compatMode = 'compat-mode' in attrOverrides
      this.sourcemap = options.sourcemap ?? false
      this._timings = options.timings ?? null
      delete options.timings
      this.pathResolver = new PathResolver()
      this.extensions = options.extension_registry ?? null
      // If no explicit registry but global extension groups are registered, activate them.
      if (!this.extensions) {
        const extsMod = await_require('./extensions.js')
        if (extsMod.Extensions) {
          const globalGroups = extsMod.Extensions.groups()
          if (Object.keys(globalGroups).length > 0) {
            this.extensions = new extsMod.Registry()
            this.extensions.activate(this)
          }
        }
      }
      this.syntaxHighlighter = null
      this._initializeExtensions = true // set to class if available
      this._parentDoctype = null

      // Normalize :header_footer → :standalone
      if ('header_footer' in options && !('standalone' in options)) {
        options.standalone = options.header_footer
      }
    }

    this._parsed = false
    this._reftexts = null
    this.header = null
    this._headerAttributes = null
    this._counters = {}
    this._attributesModified = new Set()
    this._docinfoProcessorExtensions = {}
    const standalone = options.standalone ?? false
    this.options = Object.freeze({ ...options })

    const attrs = this.attributes

    if (!parentDoc) {
      attrs['attribute-undefined'] = Compliance.attributeUndefined
      attrs['attribute-missing'] = Compliance.attributeMissing
      Object.assign(attrs, DEFAULT_ATTRIBUTES)
    }

    if (standalone) {
      delete this._attributeOverrides.embedded
      attrs.copycss = ''
      attrs['iconfont-remote'] = ''
      attrs.stylesheet = ''
      attrs.webfonts = ''
    } else {
      this._attributeOverrides.embedded = ''
      const ao = this._attributeOverrides
      const showtitle = ao.showtitle
      const notitle = ao.notitle
      if (
        'showtitle' in ao &&
        ['showtitle', 'notitle'].filter((k) => k in ao).pop() === 'showtitle'
      ) {
        ao.notitle = { null: '', false: '@', '@': false }[showtitle]
      } else if ('notitle' in ao) {
        ao.showtitle = { null: '', false: '@', '@': false }[notitle]
      } else {
        attrs.notitle = ''
      }
    }

    const attrOverrides = this._attributeOverrides
    attrOverrides.asciidoctor = ''
    attrOverrides['asciidoctor-version'] = '3.0.0.dev' // matches Ruby VERSION

    const safeModeName = SafeMode.nameForValue(this.safe)
    attrOverrides['safe-mode-name'] = safeModeName
    attrOverrides[`safe-mode-${safeModeName}`] = ''
    attrOverrides['safe-mode-level'] = this.safe
    attrOverrides['max-include-depth'] ??= 64
    attrOverrides['allow-uri-read'] ??= null

    // Remap legacy attributes
    if ('numbered' in attrOverrides) {
      const _v = attrOverrides.numbered
      delete attrOverrides.numbered
      attrOverrides.sectnums = _v
    }
    if ('hardbreaks' in attrOverrides) {
      const _v = attrOverrides.hardbreaks
      delete attrOverrides.hardbreaks
      attrOverrides['hardbreaks-option'] = _v
    }

    // Resolve base_dir
    if (options.base_dir) {
      this.baseDir = attrOverrides.docdir = _expandPath(options.base_dir)
    } else if (attrOverrides.docdir) {
      this.baseDir = attrOverrides.docdir
    } else {
      this.baseDir = attrOverrides.docdir = _cwd()
    }

    if (options.backend) attrOverrides.backend = String(options.backend)
    if (options.doctype) attrOverrides.doctype = String(options.doctype)

    if (this.safe >= SafeMode.SERVER) {
      attrOverrides.copycss ??= null
      attrOverrides['source-highlighter'] ??= null
      attrOverrides.backend ??= DEFAULT_BACKEND
      if (!parentDoc && 'docfile' in attrOverrides) {
        const docdir = attrOverrides.docdir ?? ''
        attrOverrides.docfile = attrOverrides.docfile.slice(docdir.length + 1)
      }
      attrOverrides.docdir = ''
      attrOverrides['user-home'] ??= '.'
      if (this.safe >= SafeMode.SECURE) {
        if (!('max-attribute-value-size' in attrOverrides)) {
          attrOverrides['max-attribute-value-size'] = 4096
        }
        attrOverrides.linkcss ??= ''
        attrOverrides.icons ??= null
      }
    } else {
      attrOverrides['user-home'] ??= USER_HOME
    }

    const sizeAttr = (attrOverrides['max-attribute-value-size'] ??= null)
    this._maxAttributeValueSize =
      sizeAttr != null ? Math.abs(parseInt(sizeAttr, 10)) : null

    // Apply attribute overrides — overrides that survive (non-soft) stay in attrOverrides.
    const softKeys = []
    for (const [key, val] of Object.entries(attrOverrides)) {
      if (val != null && val !== false) {
        let effective = val
        let isSoft = false
        if (typeof val === 'string' && val.endsWith('@')) {
          effective = val.slice(0, -1)
          isSoft = true
        }
        attrs[key] = effective
        if (isSoft) softKeys.push(key)
      } else {
        delete attrs[key]
        if (val === false) softKeys.push(key) // false = soft-lock delete; null = hard-lock absent (stays in overrides)
      }
    }
    for (const key of softKeys) delete attrOverrides[key]

    if (parentDoc) {
      this.backend = attrs.backend
      const parentDoctype = this._parentDoctype
      if ((this.doctype = attrs.doctype = parentDoctype) !== DEFAULT_DOCTYPE) {
        this._updateDoctypeAttributes(DEFAULT_DOCTYPE)
      }
      // Set up reader only — parsing is deferred to Document.create() / doc.parse().
      const { PreprocessorReader } = await_require('./reader.js')
      this.reader = new PreprocessorReader(this, data, options.cursor)
      if (this.sourcemap) this.sourceLocation = this.reader.cursor
    } else {
      this.backend = null
      const initialBackend = attrs.backend || DEFAULT_BACKEND
      if (initialBackend === 'manpage') {
        this.doctype = attrs.doctype = attrOverrides.doctype = 'manpage'
      } else {
        this.doctype = attrs.doctype ??= DEFAULT_DOCTYPE
      }
      this._updateBackendAttributes(initialBackend, true)

      attrs.stylesdir ??= '.'
      attrs.iconsdir ??= `${attrs.imagesdir ?? './images'}/icons`

      this._fillDatetimeAttributes(attrs, this._inputMtime)

      // Extensions initialization deferred — handle in parse()
      const { PreprocessorReader, Cursor } = await_require('./reader.js')
      this.reader = new PreprocessorReader(
        this,
        data,
        new Cursor(attrs.docfile ?? null, this.baseDir),
        { normalize: true }
      )
      if (this.sourcemap) this.sourceLocation = this.reader.cursor
    }
  }

  /** Alias catalog as references (backwards compat). */
  get references() {
    return this.catalog
  }

  /** @returns {boolean} True if this is a nested (child) document. */
  nested() {
    return !!this.parentDocument
  }

  /**
   * Factory — create and fully parse a Document asynchronously.
   * @param {string|string[]|null} data - The AsciiDoc source.
   * @param {Object} [options={}] - Processing options.
   * @returns {Promise<Document>} The parsed Document.
   */
  static async create(data, options = {}) {
    const doc = new Document(data, options)
    await doc.parse()
    return doc
  }

  /**
   * Parse the AsciiDoc source and populate the document AST.
   *
   * This method is idempotent — repeated calls are no-ops once parsing is done.
   * You rarely need to call it directly: prefer {@link Document.create} (factory) or
   * the top-level {@link load} / {@link loadFile} functions, which call `parse()` for you.
   *
   * Call `parse()` explicitly only when you constructed `new Document(...)` by hand and
   * need to defer the work, or when you want to supply a replacement `data` source.
   *
   * @param {string|string[]|null} [data=null] - Optional replacement source lines.
   *   When provided, replaces the data that was given to the constructor.
   * @returns {Promise<Document>} This Document instance (allows chaining).
   *
   * @example
   * const doc = new Document('= Hello', {})
   * await doc.parse()
   * console.log(doc.getTitle()) // → 'Hello'
   */
  async parse(data = null) {
    if (this._parsed) return this

    if (data) {
      const { PreprocessorReader, Cursor } = await_require('./reader.js')
      this.reader = new PreprocessorReader(
        this,
        data,
        new Cursor(this.attributes.docfile ?? null, this.baseDir),
        { normalize: true }
      )
      if (this.sourcemap) this.sourceLocation = this.reader.cursor
    }

    if (!this.parentDocument && this.extensions?.hasPreprocessors?.()) {
      for (const ext of this.extensions.preprocessors()) {
        this.reader = ext.processMethod(this, this.reader) ?? this.reader
      }
    }

    const { Parser } = await_require('./parser.js')
    await Parser.parse(this.reader, this, {
      header_only: this.options.parse_header_only,
    })
    this.restoreAttributes()

    if (!this.parentDocument && this.extensions?.hasTreeProcessors?.()) {
      for (const ext of this.extensions.treeProcessors()) {
        const result = ext.processMethod(this)
        if (result instanceof Document && result !== this) {
          return result
        }
      }
    }

    // Pre-compute all async text values (titles, list item text, cell text, reftexts)
    // so that synchronous getters work correctly during conversion.
    await this._resolveAllTexts(this)
    // Reset the footnote counter so that body-content footnotes (processed during conversion)
    // start numbering from 1, reproducing Ruby's "out of sequence" quirk: title footnotes are
    // numbered during parsing via apply_title_subs, then the counter restarts for body content.
    delete this.attributes['footnote-number']
    delete this._counters['footnote-number']
    // Pre-compute reftext for all registered inline anchor nodes.
    for (const ref of Object.values(this.catalog.refs)) {
      if (ref && typeof ref.precomputeReftext === 'function') {
        await ref.precomputeReftext()
      }
    }
    // Build the reftext→id lookup map so that resolveId() is synchronous.
    await this._buildReftextsMap()

    this._parsed = true
    return this
  }

  /**
   * Return whether the document has been fully parsed.
   * @returns {boolean}
   */
  isParsed() {
    return this._parsed
  }

  /**
   * Get the named counter and advance it by one step.
   *
   * Counters are document-scoped sequences used for automatic numbering (figures,
   * tables, custom labels, …). Each call increments the sequence and returns the
   * new value. Numeric counters increment by 1; alphabetic counters advance through
   * the alphabet (`'a'` → `'b'` → … → `'z'`).
   *
   * When the counter does not yet exist:
   * - If `seed` is a number (or a string that parses as an integer), the counter starts at `seed`.
   * - If `seed` is a letter (`'a'`–`'z'`), the counter starts at that letter.
   * - If `seed` is `null` (default), the counter starts at `1`.
   *
   * @param {string} name - Counter name (document-scoped key).
   * @param {string|number|null} [seed=null] - Starting value for new counters.
   * @returns {string|number} The new counter value after incrementing.
   *
   * @example <caption>Numeric counter (auto-starts at 1)</caption>
   * doc.counter('figure-number')   // → 1
   * doc.counter('figure-number')   // → 2
   *
   * @example <caption>Alphabetic counter</caption>
   * doc.counter('appendix-number', 'A')  // → 'A'
   * doc.counter('appendix-number', 'A')  // → 'B'
   *
   * @example <caption>Numeric counter with custom start</caption>
   * doc.counter('example-number', 5)   // → 5
   * doc.counter('example-number', 5)   // → 6
   */
  counter(name, seed = null) {
    if (this.parentDocument) return this.parentDocument.counter(name, seed)
    const isLocked = this.isAttributeLocked(name)
    let currVal = this._counters[name]
    let nextVal
    if (
      (isLocked && currVal != null) ||
      ((currVal = this.attributes[name]) != null && currVal !== '')
    ) {
      nextVal = this._counters[name] = nextval(currVal)
    } else if (seed != null) {
      nextVal = this._counters[name] =
        String(seed) === String(parseInt(seed, 10)) ? parseInt(seed, 10) : seed
    } else {
      nextVal = this._counters[name] = 1
    }
    if (!isLocked) this.attributes[name] = nextVal
    return nextVal
  }

  /**
   * Increment the specified counter and store it in the block's attributes.
   * @param {string} counterName
   * @param {Object} block
   * @returns {string|number} The new counter value.
   */
  incrementAndStoreCounter(counterName, block) {
    return new AttributeEntry(counterName, this.counter(counterName)).saveTo(
      block.attributes
    ).value
  }

  /** @deprecated Use incrementAndStoreCounter instead. */
  counterIncrement(counterName, block) {
    return this.incrementAndStoreCounter(counterName, block)
  }

  /**
   * Register a reference in the document catalog.
   * @param {string} type - Catalog type ('ids', 'refs', 'footnotes', 'links', 'images', 'callouts').
   * @param {*} value - The value to register.
   */
  register(type, value) {
    switch (type) {
      case 'ids': {
        // deprecated
        const id = value[0]
        const ref = new Inline(this, 'anchor', value[1], { type: 'ref', id })
        this.catalog.refs[id] ??= ref
        // Keep _reftexts in sync if the map was already built (post-parse registration).
        if (this._reftexts && value[1]) this._reftexts[value[1]] ??= id
        return ref
      }
      case 'refs': {
        const id = value[0]
        if (id in this.catalog.refs) return false
        this.catalog.refs[id] = value[1]
        return true
      }
      case 'footnotes':
        this.catalog.footnotes.push(value)
        return
      default:
        if (this.options.catalog_assets) {
          const entry =
            type === 'images'
              ? new ImageReference(value, this.attributes.imagesdir)
              : value
          this.catalog[type]?.push(entry)
        }
    }
  }

  /**
   * Find the first registered reference matching the given reftext.
   * @param {string} text - The reftext to look up.
   * @returns {string|null} The matching ID, or null.
   */
  resolveId(text) {
    if (this._reftexts) return this._reftexts[text] ?? null
    // Fallback: scan refs synchronously (for documents not parsed via parse()).
    for (const [id, ref] of Object.entries(this.catalog.refs)) {
      const xreftext = ref.reftext ?? null
      if (xreftext === text) return id
    }
    return null
  }

  /**
   * @private
   * @internal
   * Build the reftext→id lookup map. Called at end of parse().
   */
  async _buildReftextsMap() {
    this._reftexts = {}
    for (const [id, ref] of Object.entries(this.catalog.refs)) {
      const xreftext = ref.xreftext ? await ref.xreftext() : null
      if (xreftext != null) this._reftexts[xreftext] ??= id
    }
  }

  /** @returns {boolean} True if this document has child Section objects. */
  hasSections() {
    return this._nextSectionIndex > 0
  }

  isMultipart() {
    if (this.doctype !== 'book') return undefined
    return this.blocks.some((b) => {
      if (b.context !== 'section') return false
      if (b.level === 0) return true
      if (!b.special) return false // break in Ruby → but some() handles this
      return false
    })
  }

  hasFootnotes() {
    return this.catalog.footnotes.length > 0
  }
  get footnotes() {
    return this.catalog.footnotes
  }
  get callouts() {
    return this.catalog.callouts
  }

  isNested() {
    return this.parentDocument != null
  }
  isEmbedded() {
    return 'embedded' in this.attributes
  }
  hasExtensions() {
    return this.extensions != null
  }

  source() {
    return this.reader?.source?.() ?? null
  }
  sourceLines() {
    return this.reader?.sourceLines ?? null
  }

  basebackend(base) {
    return this.attributes.basebackend === base
  }

  /** @returns {string|null} The document title. */
  get title() {
    return this.doctitle()
  }
  set title(val) {
    let sect = this.header
    if (!sect) {
      sect = this.header = new Section(this, 0)
      sect.sectname = 'header'
    }
    sect.title = val
  }

  /**
   * Resolve the primary title for the document.
   * @param {Object} [opts={}]
   * @param {boolean} [opts.use_fallback] - Use 'untitled-label' if no title found.
   * @param {boolean|string} [opts.partition] - Return a DocumentTitle instead of a string.
   * @param {boolean} [opts.sanitize] - Strip XML tags from the title.
   * @returns {string|DocumentTitle|null}
   */
  doctitle(opts = {}) {
    let val = this.attributes.title
    if (val == null) {
      const sect = this.firstSection()
      if (sect) {
        val = sect.title
      } else if (opts.use_fallback) {
        val = this.attributes['untitled-label']
      }
      if (val == null) return null
    }
    if (opts.partition) {
      const sep =
        opts.partition === true
          ? this.attributes['title-separator']
          : opts.partition
      return new DocumentTitle(val, { ...opts, separator: sep })
    }
    if (opts.sanitize && val.includes('<')) {
      return val.replace(XmlSanitizeRx, '').replace(/ {2,}/g, ' ').trim()
    }
    return val
  }

  get name() {
    return this.doctitle()
  }

  /**
   * @param {string|null} [_xrefstyle=null]
   * @returns {Promise<string|null>}
   */
  xreftext(_xrefstyle = null) {
    const val = this.reftext
    return val && val.length > 0 ? val : this.title
  }

  get author() {
    return this.attributes.author ?? null
  }
  get revdate() {
    return this.attributes.revdate ?? null
  }

  authors() {
    const attrs = this.attributes
    if (!('author' in attrs)) return []
    const list = [
      new Author(
        attrs.author,
        attrs.firstname,
        attrs.middlename,
        attrs.lastname,
        attrs.authorinitials,
        attrs.email
      ),
    ]
    const numAuthors = parseInt(attrs.authorcount ?? '0', 10)
    for (let idx = 2; idx <= numAuthors; idx++) {
      list.push(
        new Author(
          attrs[`author_${idx}`],
          attrs[`firstname_${idx}`],
          attrs[`middlename_${idx}`],
          attrs[`lastname_${idx}`],
          attrs[`authorinitials_${idx}`],
          attrs[`email_${idx}`]
        )
      )
    }
    return list
  }

  isNotitle() {
    return 'notitle' in this.attributes
  }
  isNoheader() {
    return 'noheader' in this.attributes
  }
  isNofooter() {
    return 'nofooter' in this.attributes
  }

  firstSection() {
    return (
      this.header ?? this.blocks.find((b) => b.context === 'section') ?? null
    )
  }

  hasHeader() {
    return this.header != null
  }

  /**
   * Append a child Block, assigning index if it's a section.
   * @param {Object} block
   * @returns {Object} The appended block.
   */
  append(block) {
    if (block.context === 'section') this.assignNumeral(block)
    return super.append(block)
  }

  /**
   * @private
   * Called by parser after parsing header, before parsing body.
   */
  finalizeHeader(unrootedAttributes, headerValid = true) {
    this._clearPlaybackAttributes(unrootedAttributes)
    this._saveAttributes()
    if (!headerValid) unrootedAttributes['invalid-header'] = true
    return unrootedAttributes
  }

  /**
   * Replay attribute assignments from block attributes.
   * @param {Object} blockAttributes
   */
  playbackAttributes(blockAttributes) {
    if (!('attribute_entries' in blockAttributes)) return
    for (const entry of blockAttributes.attribute_entries) {
      if (entry.negate) {
        delete this.attributes[entry.name]
        if (entry.name === 'compat-mode') this.compatMode = false
      } else {
        this.attributes[entry.name] = entry.value
        if (entry.name === 'compat-mode') this.compatMode = true
      }
    }
  }

  /**
   * Set the specified attribute if not locked, applying attribute value substitutions.
   * @param {string} name
   * @param {string} [value='']
   * @returns {string|null} The substituted value, or `null` if the attribute is locked.
   */
  setAttribute(name, value = '') {
    return this._setAttributeInternal(name, value, false)
  }

  /**
   * Delete the specified attribute if not locked.
   * @param {string} name
   * @returns {boolean} True if deleted, false if locked.
   */
  deleteAttribute(name) {
    if (this.isAttributeLocked(name)) return false
    delete this.attributes[name]
    this._attributesModified.add(name)
    return true
  }

  /**
   * Check if the attribute is locked (set via attribute overrides).
   * @param {string} name
   * @returns {boolean}
   */
  isAttributeLocked(name) {
    return name in this._attributeOverrides
  }

  /** @deprecated Use isAttributeLocked instead. */
  attributeLocked(name) {
    return this.isAttributeLocked(name)
  }

  /**
   * Assign a value to the specified attribute in the document header.
   * @param {string} name
   * @param {string} [value='']
   * @param {boolean} [overwrite=true]
   * @returns {boolean} False if the attribute exists and overwrite is false.
   */
  setHeaderAttribute(name, value = '', overwrite = true) {
    const target = this._headerAttributes ?? this.attributes
    if (!overwrite && name in target) return false
    target[name] = value
    return true
  }

  /**
   * Convert the parsed document to its output format (HTML5 by default).
   *
   * If `parse()` has not been called yet, it is called automatically.
   *
   * @param {Object} [opts={}] - Conversion options.
   * @param {boolean} [opts.standalone] - When `true`, wraps output in a full
   *   document shell (html/head/body). Defaults to the `standalone` option
   *   passed at load time (which itself defaults to `true`).
   * @param {string} [opts.outfile] - Path of the output file; stored as the
   *   `outfile` document attribute during conversion.
   * @param {string} [opts.outdir] - Directory of the output file; stored as the
   *   `outdir` document attribute during conversion.
   * @returns {Promise<string>} The converted output string.
   *
   * @example <caption>Embedded HTML (no html/head/body wrapper)</caption>
   * const doc = await Document.create('= Hello\nWorld', {})
   * const html = await doc.convert({ standalone: false })
   *
   * @example <caption>Full standalone HTML page</caption>
   * const html = await doc.convert({ standalone: true })
   */
  async convert(opts = {}) {
    if (this._timings) this._timings.start('convert')
    await this.parse()
    // Pre-compute AsciiDoc table cell content now that parse is done:
    // callouts are rewound and all refs are registered.
    if (!this.parentDocument) await this._convertAsciiDocCells()
    if (this.safe < SafeMode.SERVER && Object.keys(opts).length > 0) {
      if (!opts.outfile) delete this.attributes.outfile
      else this.attributes.outfile = opts.outfile
      if (!opts.outdir) delete this.attributes.outdir
      else this.attributes.outdir = opts.outdir
    }

    let output
    if (this.doctype === 'inline') {
      const block = this.blocks[0] ?? this.header
      if (block) {
        if (
          block.contentModel === 'compound' ||
          block.contentModel === 'empty'
        ) {
          this.logger.warn(
            'no inline candidate; use the inline doctype to convert a single paragraph, verbatim, or raw block'
          )
        } else {
          output = await block.content()
        }
      }
    } else {
      let transform
      if ('standalone' in opts) {
        transform = opts.standalone ? 'document' : 'embedded'
      } else if ('header_footer' in opts) {
        transform = opts.header_footer ? 'document' : 'embedded'
      } else {
        transform = this.options.standalone ? 'document' : 'embedded'
      }
      output = await this.converter.convert(this, transform)
    }

    if (!this.parentDocument && this.extensions?.hasPostprocessors?.()) {
      for (const ext of this.extensions.postprocessors()) {
        output = ext.processMethod(this, output)
      }
    }

    if (this._timings) this._timings.record('convert')
    return output
  }

  /** @deprecated Use convert instead. */
  render(opts = {}) {
    return this.convert(opts)
  }

  /**
   * Write converted output to a file path or a writable stream.
   *
   * When `target` is a **string**, the output is written to that file path using
   * `node:fs/promises.writeFile`.
   * When `target` is a **writable stream** (has a `.write()` method), the output
   * is written to the stream in two chunks (content + newline).
   * When the converter itself implements `write()`, that method is called instead.
   *
   * @param {string} output - The converted output string returned by {@link convert}.
   * @param {string|import('stream').Writable} target - File path or writable stream.
   * @returns {Promise<void>}
   *
   * @example <caption>Write to a file</caption>
   * const output = await doc.convert()
   * await doc.write(output, 'out/index.html')
   *
   * @example <caption>Write to a stream</caption>
   * await doc.write(output, process.stdout)
   */
  async write(output, target) {
    if (this._timings) this._timings.start('write')
    if (typeof this.converter.write === 'function') {
      this.converter.write(output, target)
    } else {
      if (target && typeof target.write === 'function') {
        if (output && output.length > 0) {
          target.write(output.replace(/\n$/, ''))
          target.write(LF)
        }
      } else {
        try {
          const { writeFile } = await import('node:fs/promises')
          await writeFile(target, output ?? '', 'utf8')
        } catch {}
      }
      if (
        this.backend === 'manpage' &&
        typeof target === 'string' &&
        typeof this.converter.constructor?.writeAlternatePages === 'function'
      ) {
        this.converter.constructor.writeAlternatePages(
          this.attributes.mannames,
          this.attributes.manvolnum,
          target
        )
      }
    }
    if (this._timings) this._timings.record('write')
  }

  async content() {
    delete this.attributes.title
    return super.content()
  }

  /**
   * Read the docinfo file(s) for inclusion in the document template.
   * @param {string} [location='head'] - 'head' or 'footer'.
   * @param {string|null} [suffix=null] - File suffix override.
   * @returns {Promise<string>} Combined docinfo content.
   */
  async docinfo(location = 'head', suffix = null) {
    let content = null
    if (this.safe < SafeMode.SECURE) {
      const qualifier = location !== 'head' ? `-${location}` : ''
      suffix ??= this.outfilesuffix

      let docinfo = this.attributes.docinfo
      if (!docinfo) {
        if ('docinfo2' in this.attributes) {
          docinfo = ['private', 'shared']
        } else if ('docinfo1' in this.attributes) {
          docinfo = ['shared']
        } else {
          docinfo = docinfo != null ? ['private'] : null
        }
      } else {
        docinfo = docinfo.split(',').map((k) => k.trim())
      }

      if (docinfo) {
        content = []
        const docinfoFile = `docinfo${qualifier}${suffix}`
        const docinfoDir = this.attributes.docinfodir
        const docinfoSubs = this._resolveDocinfoSubs()

        const hasShared =
          docinfo.includes('shared') || docinfo.includes(`shared-${location}`)
        if (hasShared) {
          const path = this.normalizeSystemPath(docinfoFile, docinfoDir)
          const shared = await this.readAsset(path, { normalize: true })
          if (shared) content.push(await this.applySubs(shared, docinfoSubs))
        }

        const docname = this.attributes.docname
        const hasPrivate =
          docname &&
          (docinfo.includes('private') ||
            docinfo.includes(`private-${location}`))
        if (hasPrivate) {
          const path = this.normalizeSystemPath(
            `${docname}-${docinfoFile}`,
            docinfoDir
          )
          const priv = await this.readAsset(path, { normalize: true })
          if (priv) content.push(await this.applySubs(priv, docinfoSubs))
        }
      }
    }

    if (this.extensions && this.hasDocinfoProcessors(location)) {
      const extContent = this._docinfoProcessorExtensions[location]
        .map((ext) => ext.processMethod(this))
        .filter(Boolean)
      return (content ?? []).concat(extContent).join(LF)
    }
    return content ? content.join(LF) : ''
  }

  /**
   * @param {string} [location='head'] A location for checking docinfo extensions at a given location (head or footer).
   * @returns {boolean} True if docinfo processors are registered for the given location.
   */
  hasDocinfoProcessors(location = 'head') {
    if (location in this._docinfoProcessorExtensions) {
      return this._docinfoProcessorExtensions[location] !== false
    }
    if (this.extensions?.hasDocinfoProcessors?.(location)) {
      const exts = this.extensions.docinfoProcessors(location)
      this._docinfoProcessorExtensions[location] = exts || false
      return !!exts
    }
    this._docinfoProcessorExtensions[location] = false
    return false
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /** @returns {string|null} The document title. */
  getTitle() {
    return this.title
  }

  /** @param {string} val */
  setTitle(val) {
    this.title = val
  }

  /**
   * @deprecated Use {@link getDocumentTitle} instead.
   * @see getDocumentTitle
   */
  getDoctitle(opts = {}) {
    return this.doctitle(opts)
  }

  /**
   * Resolve the primary title for the document.
   *
   * Searches the following locations in order, returning the first non-empty value:
   * - document-level attribute named `title`
   * - header title (the document title)
   * - title of the first section
   * - document-level attribute named `untitled-label` (if `opts.use_fallback` is set)
   *
   * If no value can be resolved, `null` is returned.
   *
   * If `opts.partition` is specified, the value is parsed into a {@link DocumentTitle} object.
   * If `opts.sanitize` is specified, XML elements are removed from the value.
   * @param {Object} [opts={}]
   * @param {boolean} [opts.partition] - Parse the title into a {@link DocumentTitle} with main and subtitle parts.
   * @param {boolean} [opts.sanitize] - Strip XML/HTML elements from the resolved title.
   * @param {boolean} [opts.use_fallback] - Fall back to the `untitled-label` attribute if no title is found.
   * @returns {string|DocumentTitle|null} The resolved title, or null if none found.
   */
  getDocumentTitle(opts = {}) {
    return this.doctitle(opts)
  }

  /** @returns {string} The captioned title. */
  getCaptionedTitle() {
    return this.captionedTitle()
  }

  /** @returns {string} The document type (e.g. 'article', 'book'). */
  getDoctype() {
    return this.doctype
  }

  /** @returns {string} The backend name (e.g. 'html5', 'docbook5'). */
  getBackend() {
    return this.backend
  }

  /**
   * @returns {number} The safe mode level as a numeric value.
   * Corresponds to {@link SafeMode}: unsafe (0), safe (1), server (10), secure (20).
   */
  getSafe() {
    return this.safe
  }

  /**
   * Get the AsciiDoc compatibility mode flag.
   *
   * Enabling this attribute activates the following syntax changes:
   * - single quotes as constrained emphasis formatting marks
   * - single backticks parsed as inline literal, formatted as monospace
   * - single plus parsed as constrained, monospaced inline formatting
   * - double plus parsed as constrained, monospaced inline formatting
   * @returns {boolean} True if compat mode is enabled.
   */
  getCompatMode() {
    return this.compatMode
  }

  /** @returns {boolean} True if sourcemap is enabled. */
  getSourcemap() {
    return this.sourcemap
  }

  /** @param {boolean} val */
  setSourcemap(val) {
    this.sourcemap = val
  }

  /** @returns {string} The output file suffix (e.g. '.html'). */
  getOutfilesuffix() {
    return this.outfilesuffix
  }

  /** @returns {Object} The frozen options object. */
  getOptions() {
    return this.options
  }

  /** @returns {Object} The converter instance. */
  getConverter() {
    return this.converter
  }

  /**
   * Set the converter instance for this document.
   * @param {Object} converter - The converter instance.
   */
  setConverter(converter) {
    this.converter = converter
  }

  /** @returns {string|null} The raw AsciiDoc source. */
  getSource() {
    return this.source()
  }

  /** @returns {string[]|null} The source lines. */
  getSourceLines() {
    return this.sourceLines()
  }

  /** @returns {Object} The preprocessor reader. */
  getReader() {
    return this.reader
  }

  /** @returns {Footnote[]} The registered footnotes. */
  getFootnotes() {
    return this.footnotes
  }

  /** @returns {Object} The callouts registry. */
  getCallouts() {
    return this.callouts
  }

  /** @returns {Object} The asset catalog. */
  getCatalog() {
    return this.catalog
  }

  /** @returns {Object} The counters map. */
  getCounters() {
    return this._counters
  }

  /** @returns {string|null} The first author name. */
  getAuthor() {
    return this.author
  }

  /** @returns {Author[]} All document authors. */
  getAuthors() {
    return this.authors()
  }

  /** @returns {string} The base directory path. */
  getBaseDir() {
    return this.baseDir
  }

  /** @returns {RevisionInfo} The revision information. */
  getRevisionInfo() {
    const attrs = this.attributes
    return new RevisionInfo(
      attrs.revnumber ?? null,
      attrs.revdate ?? null,
      attrs.revremark ?? null
    )
  }

  /** @returns {Object|null} The extensions registry. */
  getExtensions() {
    return this.extensions
  }

  /** @returns {Document|undefined} The parent document, or undefined for root documents. */
  getParentDocument() {
    return this.parentDocument ?? undefined
  }

  /**
   * Get the parent node of this node.
   * Always returns undefined for a root Document (Document is its own internal parent).
   * @returns {undefined}
   */
  getParent() {
    return undefined
  }

  /** @returns {Object|null} The syntax highlighter instance. */
  getSyntaxHighlighter() {
    return this.syntaxHighlighter
  }

  /** @returns {Object} The id→node reference map. */
  getRefs() {
    return this.catalog.refs
  }

  /** @returns {ImageReference[]} The registered image references. */
  getImages() {
    return this.catalog.images
  }

  /** @returns {string[]} The registered links. */
  getLinks() {
    return this.catalog.links
  }

  /** @returns {Object|null} The level-0 Section (document header). */
  getHeader() {
    return this.header
  }

  /** @returns {boolean} True if the basebackend attribute is set. */
  isBasebackend() {
    return !!this.attributes.basebackend
  }

  /** @returns {Object} The asset catalog (alias for getCatalog). */
  getReferences() {
    return this.catalog
  }

  /** @returns {string|undefined} The revision date. */
  getRevisionDate() {
    return this.attributes.revdate ?? undefined
  }

  /** @returns {string|undefined} The revision date (alias for getRevisionDate). */
  getRevdate() {
    return this.attributes.revdate ?? undefined
  }

  /** @returns {string|undefined} The revision number. */
  getRevisionNumber() {
    return this.attributes.revnumber ?? undefined
  }

  /** @returns {string|undefined} The revision remark. */
  getRevisionRemark() {
    return this.attributes.revremark ?? undefined
  }

  /** @returns {boolean} True if any revision info is set. */
  hasRevisionInfo() {
    return !this.getRevisionInfo().isEmpty()
  }

  /** @returns {boolean} True if the notitle attribute is set. */
  getNotitle() {
    return this.isNotitle()
  }

  /** @returns {boolean} True if the noheader attribute is set. */
  getNoheader() {
    return this.isNoheader()
  }

  /** @returns {boolean} True if the nofooter attribute is set. */
  getNofooter() {
    return this.isNofooter()
  }

  /** Restore attributes to their saved header state. */
  restoreAttributes() {
    if (!this.parentDocument) this.catalog.callouts.rewind()
    const toRestore = this._headerAttributes
    if (toRestore) {
      for (const key of Object.keys(this.attributes)) {
        if (!(key in toRestore)) delete this.attributes[key]
      }
      Object.assign(this.attributes, toRestore)
    }
  }

  /**
   * @param {string} [location='head']
   * @param {string} [suffix]
   * @returns {Promise<string>}
   */
  async getDocinfo(location = 'head', suffix = undefined) {
    return this.docinfo(location, suffix)
  }

  /**
   * Delete the specified attribute if not locked.
   * @param {string} name - The attribute name to remove.
   * @returns {string|undefined} The previous value, or undefined if not present or locked.
   */
  removeAttribute(name) {
    const prev = this.attributes[name]
    this.deleteAttribute(name)
    return prev
  }

  toString() {
    return `#<Document {doctype: '${this.doctype}', doctitle: ${JSON.stringify(this.header?.title ?? null)}, blocks: ${this.blocks.length}}>`
  }

  // ── Private methods ─────────────────────────────────────────────────────────

  /**
   * @private
   * @internal
   * Set the specified attribute without applying attribute value substitutions.
   * Used internally by the parser when the value is already resolved.
   * @param {string} name
   * @param {string} [value='']
   * @returns {string|null} The value as-is, or `null` if the attribute is locked.
   */
  _setAttributeRaw(name, value = '') {
    return this._setAttributeInternal(name, value, true)
  }

  /**
   * @private
   * @internal
   */
  _setAttributeInternal(name, value, skipSubs) {
    if (this.isAttributeLocked(name)) return null
    if (!skipSubs && value && value !== '')
      value = this._applyAttributeValueSubs(value)
    if (this._headerAttributes) {
      // Beyond the document header; only update live attributes, not the header snapshot.
      this.attributes[name] = value
    } else {
      switch (name) {
        case 'backend':
          this._updateBackendAttributes(
            value,
            this._attributesModified.delete('htmlsyntax') &&
              value === this.backend
          )
          break
        case 'doctype':
          this._updateDoctypeAttributes(value)
          break
        default:
          this.attributes[name] = value
      }
      this._attributesModified.add(name)
    }
    return value
  }

  /**
   * @private
   * @internal
   * Walk the block tree in document order and pre-compute the content of
   * every AsciiDoc-style table cell. Must be called AFTER parse() has finished so
   * that (a) callouts.rewind() has been called and (b) all cross-references from
   * the main document are already registered in the catalog.
   */
  async _convertAsciiDocCells(block = this) {
    for (const child of block.blocks ?? []) {
      if (child.context === 'table') {
        for (const section of ['head', 'body', 'foot']) {
          for (const row of child.rows[section] ?? []) {
            for (const cell of row) {
              if (
                cell.style === 'asciidoc' &&
                cell._innerDocument &&
                cell._innerContent == null
              ) {
                cell._innerContent = await cell._innerDocument.convert()
              }
            }
          }
        }
      } else {
        await this._convertAsciiDocCells(child)
      }
    }
  }

  /**
   * @private
   * Sync version: applies only synchronous subs (specialcharacters, attributes, replacements).
   * Used by setAttribute() which must remain sync for the {set:...} inline directive path.
   * Async subs (quotes, macros, …) in pass macros are handled by _applyAttributeEntryValueSubs.
   */
  _applyAttributeValueSubs(value) {
    const m = value.match(AttributeEntryPassMacroRx)
    if (m) {
      let result = m[2] ?? ''
      if (m[1]) {
        const subs = this.resolvePassSubs(m[1])
        if (subs) {
          for (const sub of subs) {
            if (sub === 'specialcharacters')
              result = this.subSpecialchars(result)
            else if (sub === 'attributes') result = this.subAttributes(result)
            else if (sub === 'replacements')
              result = this.subReplacements(result)
          }
        }
      }
      return this._maxAttributeValueSize != null
        ? _limitBytesize(result, this._maxAttributeValueSize)
        : result
    }
    const result = this.applyHeaderSubs(value)
    return this._maxAttributeValueSize != null
      ? _limitBytesize(result, this._maxAttributeValueSize)
      : result
  }

  /**
   * @private
   * Async version: applies all subs including async ones (quotes, macros, …).
   * Used by processAttributeEntry() which can await the result.
   */
  async _applyAttributeEntryValueSubs(value) {
    const m = value.match(AttributeEntryPassMacroRx)
    if (m) {
      let result = m[2] ?? ''
      if (m[1]) {
        const subs = this.resolvePassSubs(m[1])
        if (subs) result = await this.applySubs(result, subs)
      }
      return this._maxAttributeValueSize != null
        ? _limitBytesize(result, this._maxAttributeValueSize)
        : result
    }
    const result = this.applyHeaderSubs(value)
    return this._maxAttributeValueSize != null
      ? _limitBytesize(result, this._maxAttributeValueSize)
      : result
  }

  /**
   * @private
   * Resolve the list of substitutions to apply to docinfo files.
   *
   * Resolves subs from the `docinfosubs` document attribute if present,
   * otherwise returns `['attributes']` as the default.
   * @returns {string[]} The list of substitutions to apply.
   */
  _resolveDocinfoSubs() {
    return 'docinfosubs' in this.attributes
      ? this.resolveSubs(this.attributes.docinfosubs, 'block', null, 'docinfo')
      : ['attributes']
  }

  /**
   * @private
   * Walk the block tree and pre-compute all async text values.
   * Handles titles (AbstractBlock), list item text, table cell text, and reftexts.
   */
  async _resolveAllTexts(block) {
    // Skip title pre-computation for blocks with an explicit empty id ([id=]).
    // In Ruby, apply_title_subs is lazy: it is never called during parsing for such
    // blocks because section.title is never accessed.  An explicit empty id is
    // distinguished by block.attributes.id === '' (the AttributeList parser preserves it).
    if (block.attributes?.id !== '') {
      await block.precomputeTitle?.()
    }
    await block.precomputeReftext?.()
    const ctx = block.context
    if (ctx === 'dlist') {
      // dlist.blocks is an array of [[term, ...], item_or_null] pairs.
      for (const [terms, item] of block.blocks ?? []) {
        for (const term of terms ?? []) {
          await term.precomputeText?.()
          await this._resolveAllTexts(term)
        }
        if (item) {
          await item.precomputeText?.()
          await this._resolveAllTexts(item)
        }
      }
    } else if (ctx === 'table') {
      for (const row of [
        ...(block.rows?.head ?? []),
        ...(block.rows?.body ?? []),
        ...(block.rows?.foot ?? []),
      ]) {
        for (const cell of row) {
          await cell.precomputeText?.()
          await cell.precomputeReftext?.()
        }
      }
    } else {
      for (const child of block.blocks ?? []) {
        await child.precomputeText?.()
        await this._resolveAllTexts(child)
      }
    }
  }

  /**
   * @private
   * Create and initialize an instance of the converter for this document.
   * @param {string} backend - The backend name (e.g. 'html5', 'docbook5').
   * @param {string} [delegateBackend] - An optional delegate backend to use when resolving the converter.
   */
  _createConverter(backend, delegateBackend) {
    const opts = this.options
    if (!this.converter && opts._preCreatedConverter) {
      return opts._preCreatedConverter
    }
    const converterOpts = {
      document: this,
      htmlsyntax: this.attributes.htmlsyntax,
    }
    if (opts.template_dirs || opts.template_dir) {
      converterOpts.template_dirs = [].concat(
        opts.template_dirs ?? opts.template_dir
      )
      converterOpts.template_cache = opts.template_cache ?? true
      converterOpts.template_engine = opts.template_engine
      converterOpts.template_engine_options = opts.template_engine_options
      converterOpts.eruby = opts.eruby
      converterOpts.safe = this.safe
      if (delegateBackend) converterOpts.delegate_backend = delegateBackend
    }
    if (opts.converter) {
      return new CustomFactory({ [backend]: opts.converter }).createSync(
        backend,
        converterOpts
      )
    }
    const factory = opts.converter_factory ?? Converter
    return factory.createSync(backend, converterOpts)
  }

  /**
   * Delete any attributes stored for playback
   * @param attributes
   * @private
   * @internal
   */
  _clearPlaybackAttributes(attributes) {
    delete attributes.attribute_entries
  }

  /**
   * Branch the attributes so that the original state can be restored
   * at a future time.
   * @returns the duplicated attributes, which will later be restored
   * @private
   * @internal
   */
  _saveAttributes() {
    const attrs = this.attributes
    if (!('doctitle' in attrs)) {
      const dt = this.doctitle()
      if (dt) attrs.doctitle = dt
    }
    this.id ??= attrs['css-signature'] ?? null

    // Handle toc / toc2
    // NOTE: delete toc/toc2 from attrs first; only re-add specific placement/position attrs
    let tocVal
    if ('toc2' in attrs) {
      delete attrs.toc2
      tocVal = 'left'
    } else if ('toc' in attrs) {
      tocVal = attrs.toc
      delete attrs.toc
    }
    if (tocVal != null) {
      const tocPlacementVal = attrs['toc-placement'] ?? 'macro'
      const tocPositionVal =
        tocPlacementVal && tocPlacementVal !== 'auto'
          ? tocPlacementVal
          : attrs['toc-position']
      if (tocVal !== '' || tocPositionVal) {
        const defaultTocPosition = 'left'
        let defaultTocClass = 'toc2'
        const position = !tocPositionVal
          ? tocVal || defaultTocPosition
          : tocPositionVal
        attrs['toc-placement'] = 'auto'
        switch (position) {
          case 'left':
          case '<':
          case '&lt;':
            attrs['toc-position'] = 'left'
            break
          case 'right':
          case '>':
          case '&gt;':
            attrs['toc-position'] = 'right'
            break
          case 'top':
          case '^':
            attrs['toc-position'] = 'top'
            break
          case 'bottom':
          case 'v':
            attrs['toc-position'] = 'bottom'
            break
          case 'preamble':
          case 'macro':
            attrs['toc-position'] = 'content'
            attrs['toc-placement'] = position
            defaultTocClass = null
            break
          default:
            delete attrs['toc-position']
            defaultTocClass = null
        }
        if (defaultTocClass) attrs['toc-class'] ??= defaultTocClass
      }
      attrs.toc = ''
    }

    const iconsVal = attrs.icons
    if (iconsVal != null && !('icontype' in attrs)) {
      if (iconsVal !== '' && iconsVal !== 'font') {
        attrs.icons = ''
        if (iconsVal !== 'image') attrs.icontype = iconsVal
      }
    }

    this.compatMode = 'compat-mode' in attrs
    if (this.compatMode && 'language' in attrs) {
      attrs['source-language'] = attrs.language
    }

    if (!this.parentDocument) {
      const basebackend = attrs.basebackend
      if (basebackend === 'html') {
        const syntaxHlName = attrs['source-highlighter']
        if (syntaxHlName && !attrs[`${syntaxHlName}-unavailable`]) {
          // SyntaxHighlighter — optional integration, handle gracefully
          try {
            const factory = this.options.syntax_highlighter_factory
            if (factory) {
              this.syntaxHighlighter = factory.create(
                syntaxHlName,
                this.backend,
                { document: this }
              )
            } else {
              this.syntaxHighlighter = SyntaxHighlighter.create(
                syntaxHlName,
                this.backend,
                { document: this }
              )
            }
          } catch {}
        }
      } else if (basebackend === 'docbook') {
        if (
          !this.isAttributeLocked('toc') &&
          !this._attributesModified.has('toc')
        ) {
          attrs.toc = ''
        }
        if (
          !this.isAttributeLocked('sectnums') &&
          !this._attributesModified.has('sectnums')
        ) {
          attrs.sectnums = ''
        }
      }
      this.outfilesuffix = attrs.outfilesuffix ?? null

      for (const name of FLEXIBLE_ATTRIBUTES) {
        const _fv = this._attributeOverrides[name]
        if (name in this._attributeOverrides && _fv != null && _fv !== false) {
          delete this._attributeOverrides[name]
        }
      }
    }

    this._headerAttributes = { ...attrs }
  }

  /**
   * Assign the local and document datetime attributes, which includes localdate, localyear, localtime,
   * localdatetime, docdate, docyear, doctime, and docdatetime. Honor the SOURCE_DATE_EPOCH environment variable, if set.
   * @param attrs
   * @param inputMtime
   * @private
   * @internal
   */
  _fillDatetimeAttributes(attrs, inputMtime) {
    const sourceDateEpoch =
      typeof process !== 'undefined' ? process.env.SOURCE_DATE_EPOCH : null
    const now =
      sourceDateEpoch && sourceDateEpoch !== ''
        ? new Date(parseInt(sourceDateEpoch, 10) * 1000)
        : new Date()

    let localdate = attrs.localdate
    if (localdate) {
      attrs.localyear ??= localdate.length >= 4 ? localdate.slice(0, 4) : null
    } else {
      localdate = attrs.localdate = _formatDate(now)
      attrs.localyear ??= String(now.getFullYear())
    }
    const localtime = (attrs.localtime ??= _formatTime(now))
    attrs.localdatetime ??= `${localdate} ${localtime}`

    const effectiveMtime =
      sourceDateEpoch && sourceDateEpoch !== ''
        ? now
        : inputMtime instanceof Date
          ? inputMtime
          : now

    let docdate = attrs.docdate
    if (docdate) {
      attrs.docyear ??= docdate.length >= 4 ? docdate.slice(0, 4) : null
    } else {
      docdate = attrs.docdate = _formatDate(effectiveMtime)
      attrs.docyear ??= String(effectiveMtime.getFullYear())
    }
    const doctime = (attrs.doctime ??= _formatTime(effectiveMtime))
    attrs.docdatetime ??= `${docdate} ${doctime}`
  }

  /**
   * Update the backend attributes to reflect a change in the active backend.
   *
   * This method also handles updating the related doctype attributes if the
   * doctype attribute is assigned at the time this method is called.
   *
   * @param newBackend
   * @param init
   * @returns {undefined|*} the resolved String backend if updated, nothing otherwise.
   * @private
   * @internal
   */
  _updateBackendAttributes(newBackend, init = false) {
    if (!init && newBackend === this.backend) return undefined
    const currentBackend = this.backend
    const attrs = this.attributes
    const currentBasebackend = attrs.basebackend
    const currentDoctype = this.doctype

    let delegateBackend = null
    let actualBackend = null
    if (newBackend.includes(':')) {
      const parts = newBackend.split(':')
      actualBackend = parts[0]
      newBackend = parts[1]
    }
    if (newBackend.startsWith('xhtml')) {
      attrs.htmlsyntax = 'xml'
      newBackend = newBackend.slice(1)
    } else if (newBackend.startsWith('html')) {
      attrs.htmlsyntax ??= 'html'
    }
    newBackend = BACKEND_ALIASES[newBackend] ?? newBackend
    if (actualBackend) {
      delegateBackend = newBackend
      newBackend = actualBackend
    }

    if (currentDoctype) {
      if (currentBackend) {
        delete attrs[`backend-${currentBackend}`]
        delete attrs[`backend-${currentBackend}-doctype-${currentDoctype}`]
      }
      attrs[`backend-${newBackend}-doctype-${currentDoctype}`] = ''
      attrs[`doctype-${currentDoctype}`] = ''
    } else if (currentBackend) {
      delete attrs[`backend-${currentBackend}`]
    }
    attrs[`backend-${newBackend}`] = ''
    this.backend = attrs.backend = newBackend

    // Create the converter (may be async in some environments; here synchronous)
    const converter = this._createConverter(newBackend, delegateBackend)
    let newBasebackend, newFiletype

    if (converter && typeof converter._getBackendTraits === 'function') {
      newBasebackend = converter.basebackend()
      newFiletype = converter.filetype()
      const htmlsyntax = converter.htmlsyntax()
      if (htmlsyntax) attrs.htmlsyntax ??= htmlsyntax
      if (init) {
        attrs.outfilesuffix ??= converter.outfilesuffix()
      } else if (!this.isAttributeLocked('outfilesuffix')) {
        attrs.outfilesuffix = converter.outfilesuffix()
      }
    } else if (converter) {
      const traits = deriveBackendTraits(newBackend)
      newBasebackend = traits.basebackend
      newFiletype = traits.filetype
      if (init) {
        attrs.outfilesuffix ??= traits.outfilesuffix
      } else if (!this.isAttributeLocked('outfilesuffix')) {
        attrs.outfilesuffix = traits.outfilesuffix
      }
    } else {
      throw new Error(
        `asciidoctor: FAILED: missing converter for backend '${newBackend}'. Processing aborted.`
      )
    }
    this.converter = converter

    const currentFiletype = attrs.filetype
    if (currentFiletype) delete attrs[`filetype-${currentFiletype}`]
    attrs.filetype = newFiletype
    attrs[`filetype-${newFiletype}`] = ''

    const pageWidth = DEFAULT_PAGE_WIDTHS[newBasebackend]
    if (pageWidth) {
      attrs.pagewidth = pageWidth
    } else {
      delete attrs.pagewidth
    }

    if (newBasebackend !== currentBasebackend) {
      if (currentDoctype) {
        if (currentBasebackend) {
          delete attrs[`basebackend-${currentBasebackend}`]
          delete attrs[
            `basebackend-${currentBasebackend}-doctype-${currentDoctype}`
          ]
        }
        attrs[`basebackend-${newBasebackend}-doctype-${currentDoctype}`] = ''
      } else if (currentBasebackend) {
        delete attrs[`basebackend-${currentBasebackend}`]
      }
      attrs[`basebackend-${newBasebackend}`] = ''
      attrs.basebackend = newBasebackend
    }
    return newBackend
  }

  /**
   * Update the doctype and backend attributes to reflect a change in the active doctype.
   *
   * @param newDoctype
   * @returns {undefined|*} the String doctype if updated, nothing otherwise.
   * @private
   * @internal
   */
  _updateDoctypeAttributes(newDoctype) {
    if (!newDoctype || newDoctype === this.doctype) return undefined
    const currentBackend = this.backend
    const attrs = this.attributes
    const currentBasebackend = attrs.basebackend
    const currentDoctype = this.doctype
    if (currentDoctype) {
      delete attrs[`doctype-${currentDoctype}`]
      if (currentBackend) {
        delete attrs[`backend-${currentBackend}-doctype-${currentDoctype}`]
        attrs[`backend-${currentBackend}-doctype-${newDoctype}`] = ''
      }
      if (currentBasebackend) {
        delete attrs[
          `basebackend-${currentBasebackend}-doctype-${currentDoctype}`
        ]
        attrs[`basebackend-${currentBasebackend}-doctype-${newDoctype}`] = ''
      }
    } else {
      if (currentBackend)
        attrs[`backend-${currentBackend}-doctype-${newDoctype}`] = ''
      if (currentBasebackend)
        attrs[`basebackend-${currentBasebackend}-doctype-${newDoctype}`] = ''
    }
    attrs[`doctype-${newDoctype}`] = ''
    this.doctype = attrs.doctype = newDoctype
    return newDoctype
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _expandPath(p) {
  try {
    return require('node:path').resolve(p)
  } catch {
    return p
  }
}

function _cwd() {
  return typeof process !== 'undefined' ? process.cwd() : '/'
}

function _pad2(n) {
  return String(n).padStart(2, '0')
}

function _formatDate(d) {
  return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`
}

function _formatTime(d) {
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hh = _pad2(Math.floor(abs / 60))
  const mm = _pad2(abs % 60)
  return `${_pad2(d.getHours())}:${_pad2(d.getMinutes())}:${_pad2(d.getSeconds())} ${offset === 0 ? 'UTC' : `${sign}${hh}${mm}`}`
}

function _limitBytesize(str, max) {
  const encoded = new TextEncoder().encode(str)
  if (encoded.length <= max) return str
  // Walk back from max to find the last complete UTF-8 character boundary.
  let end = max
  // Back up past continuation bytes (0x80–0xBF).
  while (end > 0 && (encoded[end - 1] & 0xc0) === 0x80) end--
  // If the byte at end-1 is a multibyte start byte, check whether its full
  // sequence fits within max.
  if (end > 0 && (encoded[end - 1] & 0x80) !== 0) {
    const b = encoded[end - 1]
    const charLen = b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1
    if (end - 1 + charLen > max) {
      end-- // sequence extends past max → exclude this start byte
    } else {
      end = max // sequence fits entirely → restore max
    }
  }
  return new TextDecoder().decode(encoded.slice(0, end))
}

applyLogging(Document.prototype)

Document.Footnote = Footnote

// Module cache populated by load.js before constructing a Document.
// Keys are bare filenames ('reader.js', 'parser.js').
export const _deps = {}

// Resolve a relative path (e.g. './reader.js') to a cache key.
function _depKey(path) {
  return path.replace(/^\.\//, '')
}

function await_require(path) {
  return _deps[_depKey(path)] ?? {}
}
