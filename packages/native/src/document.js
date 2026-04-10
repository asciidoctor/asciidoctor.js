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

import { AbstractBlock }                   from './abstract_block.js'
import { Section }                         from './section.js'
import { Inline }                          from './inline.js'
import { Callouts }                        from './callouts.js'
import { PathResolver }                    from './path_resolver.js'
import { Compliance }                      from './compliance.js'
import { extname, nextval }               from './helpers.js'
import { SafeMode, DEFAULT_ATTRIBUTES, DEFAULT_BACKEND, DEFAULT_DOCTYPE,
         BACKEND_ALIASES, DEFAULT_PAGE_WIDTHS, FLEXIBLE_ATTRIBUTES,
         USER_HOME }                       from './constants.js'
import { Converter, CustomFactory, deriveBackendTraits } from './converter.js'
import { XmlSanitizeRx, AttributeEntryPassMacroRx }     from './rx.js'
import { LF }                              from './constants.js'
import { applyLogging }                    from './logging.js'
import { SyntaxHighlighter } from "./syntax_highlighter.js";

// ── Helper structs ────────────────────────────────────────────────────────────

export class ImageReference {
  constructor (target, imagesdir) {
    this.target    = target
    this.imagesdir = imagesdir
  }
  toString () { return this.target }
}

export class Footnote {
  constructor (index, id, text) {
    this.index = index
    this.id    = id
    this.text  = text
  }
}

export class AttributeEntry {
  constructor (name, value, negate = null) {
    this.name  = name
    this.value = value
    this.negate = negate == null ? value == null : negate
  }

  saveTo (blockAttributes) {
    (blockAttributes.attribute_entries ??= []).push(this)
    return this
  }
}

// Public: Parsed and stores a partitioned title (title & subtitle).
export class DocumentTitle {
  constructor (val, opts = {}) {
    this._sanitized = !!(opts.sanitize && val.includes('<'))
    if (this._sanitized) {
      val = val.replace(XmlSanitizeRx, '').replace(/  +/g, ' ').trim()
    }
    const sep = opts.separator ?? ':'
    const sepStr = sep ? `${sep} ` : null
    if (!sepStr || !val.includes(sepStr)) {
      this.main     = val
      this.subtitle = null
    } else {
      const idx = val.lastIndexOf(sepStr)
      this.main     = val.slice(0, idx)
      this.subtitle = val.slice(idx + sepStr.length)
    }
    this.combined = val
  }

  get title () { return this.main }

  isSanitized ()  { return this._sanitized }
  hasSubtitle ()  { return this.subtitle != null }
  toString ()     { return this.combined }
}

// Public: Represents an Author parsed from document attributes.
export class Author {
  constructor (name, firstname, middlename, lastname, initials, email) {
    this.name       = name
    this.firstname  = firstname
    this.middlename = middlename
    this.lastname   = lastname
    this.initials   = initials
    this.email      = email
  }
}

// ── Document ──────────────────────────────────────────────────────────────────

export class Document extends AbstractBlock {
  // Override AbstractNode's getter so Document can own its converter directly.
  get converter () { return this._converter }
  set converter (v) { this._converter = v }

  constructor (data = null, options = {}) {
    // Bootstrap: call super with a temporary placeholder — we'll fix parent ref below.
    // AbstractBlock(parent, context, opts) — we pass `null` and patch afterward.
    super(null, 'document', options)
    // Document is its own parent/document.
    this.parent   = this
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
      this._attributeOverrides = { ...parentDoc._attributeOverrides, ...parentDoc.attributes }
      const attrOverrides = this._attributeOverrides
      delete attrOverrides['compat-mode']
      const parentDoctype = delete attrOverrides['doctype']
      delete attrOverrides['notitle']
      delete attrOverrides['showtitle']
      delete attrOverrides['toc']
      this.attributes['toc-placement'] = (delete attrOverrides['toc-placement']) ?? 'auto'
      delete attrOverrides['toc-position']

      this.safe          = parentDoc.safe
      this.compatMode    = parentDoc.compatMode
      if (this.compatMode) this.attributes['compat-mode'] = ''
      this.outfilesuffix = parentDoc.outfilesuffix
      this.sourcemap     = parentDoc.sourcemap
      this._timings      = null
      this.pathResolver  = parentDoc.pathResolver
      this.converter     = parentDoc.converter
      this.extensions    = parentDoc.extensions
      this.syntaxHighlighter = parentDoc.syntaxHighlighter
      this._initializeExtensions = null

      // For nested: re-use parent's @_parentDoctype
      this._parentDoctype = parentDoctype
    } else {
      // ── Root document setup ───────────────────────────────────────────────
      this.parentDocument = null
      this.catalog = {
        ids: {},         // deprecated
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
        attrOverrides['outfilesuffix'] = extname(options.to_file)
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

      this._inputMtime     = options.input_mtime ?? null
      delete options.input_mtime
      this.compatMode      = 'compat-mode' in attrOverrides
      this.sourcemap       = options.sourcemap ?? false
      this._timings        = options.timings ?? null
      delete options.timings
      this.pathResolver    = new PathResolver()
      this.extensions      = null
      this.syntaxHighlighter = null
      this._initializeExtensions = true  // set to class if available
      this._parentDoctype  = null

      // Normalize :header_footer → :standalone
      if ('header_footer' in options && !('standalone' in options)) {
        options.standalone = options.header_footer
      }
    }

    this._parsed          = false
    this._reftexts        = null
    this.header           = null
    this._headerAttributes = null
    this._counters        = {}
    this._attributesModified = new Set()
    this._docinfoProcessorExtensions = {}
    const standalone      = options.standalone ?? false
    this.options          = Object.freeze({ ...options })

    const attrs = this.attributes

    if (!parentDoc) {
      attrs['attribute-undefined'] = Compliance.attributeUndefined
      attrs['attribute-missing']   = Compliance.attributeMissing
      Object.assign(attrs, DEFAULT_ATTRIBUTES)
    }

    if (standalone) {
      delete (this._attributeOverrides)['embedded']
      attrs['copycss']        = ''
      attrs['iconfont-remote'] = ''
      attrs['stylesheet']     = ''
      attrs['webfonts']       = ''
    } else {
      this._attributeOverrides['embedded'] = ''
      const ao = this._attributeOverrides
      const showtitle = ao['showtitle']
      const notitle   = ao['notitle']
      if ('showtitle' in ao && ['showtitle', 'notitle'].filter(k => k in ao).pop() === 'showtitle') {
        ao['notitle'] = { null: '', false: '@', '@': false }[showtitle]
      } else if ('notitle' in ao) {
        ao['showtitle'] = { null: '', false: '@', '@': false }[notitle]
      } else {
        attrs['notitle'] = ''
      }
    }

    const attrOverrides = this._attributeOverrides
    attrOverrides['asciidoctor']         = ''
    attrOverrides['asciidoctor-version'] = '3.0.0.dev'  // matches Ruby VERSION

    const safeModeName = SafeMode.nameForValue(this.safe)
    attrOverrides['safe-mode-name']              = safeModeName
    attrOverrides[`safe-mode-${safeModeName}`]   = ''
    attrOverrides['safe-mode-level']             = this.safe
    attrOverrides['max-include-depth']           ??= 64
    attrOverrides['allow-uri-read']              ??= null

    // Remap legacy attributes
    if ('numbered' in attrOverrides)  attrOverrides['sectnums']          = delete attrOverrides['numbered']
    if ('hardbreaks' in attrOverrides) attrOverrides['hardbreaks-option'] = delete attrOverrides['hardbreaks']

    // Resolve base_dir
    if (options.base_dir) {
      this.baseDir = attrOverrides['docdir'] = _expandPath(options.base_dir)
    } else if (attrOverrides['docdir']) {
      this.baseDir = attrOverrides['docdir']
    } else {
      this.baseDir = attrOverrides['docdir'] = _cwd()
    }

    if (options.backend)  attrOverrides['backend']  = String(options.backend)
    if (options.doctype)  attrOverrides['doctype']  = String(options.doctype)

    if (this.safe >= SafeMode.SERVER) {
      attrOverrides['copycss']            ??= null
      attrOverrides['source-highlighter'] ??= null
      attrOverrides['backend']            ??= DEFAULT_BACKEND
      if (!parentDoc && 'docfile' in attrOverrides) {
        const docdir = attrOverrides['docdir'] ?? ''
        attrOverrides['docfile'] = attrOverrides['docfile'].slice(docdir.length + 1)
      }
      attrOverrides['docdir']    = ''
      attrOverrides['user-home'] ??= '.'
      if (this.safe >= SafeMode.SECURE) {
        if (!('max-attribute-value-size' in attrOverrides)) {
          attrOverrides['max-attribute-value-size'] = 4096
        }
        attrOverrides['linkcss'] ??= ''
        attrOverrides['icons']   ??= null
      }
    } else {
      attrOverrides['user-home'] ??= USER_HOME
    }

    const sizeAttr = attrOverrides['max-attribute-value-size'] ??= null
    this._maxAttributeValueSize = sizeAttr != null ? Math.abs(parseInt(sizeAttr, 10)) : null

    // Apply attribute overrides — overrides that survive (non-soft) stay in attrOverrides.
    const softKeys = []
    for (const [key, val] of Object.entries(attrOverrides)) {
      if (val != null && val !== false) {
        let effective = val
        let isSoft = false
        if (typeof val === 'string' && val.endsWith('@')) {
          effective = val.slice(0, -1)
          isSoft    = true
        }
        attrs[key] = effective
        if (isSoft) softKeys.push(key)
      } else {
        delete attrs[key]
        if (val === false) softKeys.push(key)  // false = soft-lock delete; null = hard-lock absent (stays in overrides)
      }
    }
    for (const key of softKeys) delete attrOverrides[key]

    if (parentDoc) {
      this.backend = attrs['backend']
      const parentDoctype = this._parentDoctype
      if ((this.doctype = attrs['doctype'] = parentDoctype) !== DEFAULT_DOCTYPE) {
        this._updateDoctypeAttributes(DEFAULT_DOCTYPE)
      }
      // Eagerly parse nested document
      const { Reader } = await_require('./reader.js')
      this.reader = new Reader(data, options.cursor)
      if (this.sourcemap) this.sourceLocation = this.reader.cursor
      const { Parser } = await_require('./parser.js')
      Parser.parse(this.reader, this)
      this._restoreAttributes()
      this._parsed = true
    } else {
      this.backend = null
      let initialBackend = attrs['backend'] || DEFAULT_BACKEND
      if (initialBackend === 'manpage') {
        this.doctype = attrs['doctype'] = attrOverrides['doctype'] = 'manpage'
      } else {
        this.doctype = (attrs['doctype'] ??= DEFAULT_DOCTYPE)
      }
      this._updateBackendAttributes(initialBackend, true)

      attrs['stylesdir'] ??= '.'
      attrs['iconsdir'] ??= `${attrs['imagesdir'] ?? './images'}/icons`

      this._fillDatetimeAttributes(attrs, this._inputMtime)

      // Extensions initialization deferred — handle in parse()
      const { PreprocessorReader, Cursor } = await_require('./reader.js')
      this.reader = new PreprocessorReader(
        this,
        data,
        new Cursor(attrs['docfile'] ?? null, this.baseDir),
        { normalize: true }
      )
      if (this.sourcemap) this.sourceLocation = this.reader.cursor
    }
  }

  // Public: Alias catalog as references (backwards compat).
  get references () { return this.catalog }

  // Public: Returns true if this is a nested (child) document.
  nested () { return !!this.parentDocument }

  // Public: Parse the AsciiDoc source.
  //
  // data - Optional replacement source data.
  //
  // Returns this Document.
  parse (data = null) {
    if (this._parsed) return this
    const doc = this
    if (data) {
      const { PreprocessorReader, Cursor } = await_require('./reader.js')
      this.reader = new PreprocessorReader(doc, data, new Cursor(this.attributes['docfile'] ?? null, this.baseDir), { normalize: true })
      if (this.sourcemap) this.sourceLocation = this.reader.cursor
    }

    if (!this.parentDocument && this.extensions?.hasPreprocessors?.()) {
      for (const ext of this.extensions.preprocessors()) {
        this.reader = ext.processMethod(doc, this.reader) ?? this.reader
      }
    }

    const { Parser } = await_require('./parser.js')
    Parser.parse(this.reader, doc, { header_only: this.options.parse_header_only })
    this._restoreAttributes()

    if (!this.parentDocument && this.extensions?.hasTreeProcessors?.()) {
      for (const ext of this.extensions.treeProcessors()) {
        const result = ext.processMethod(doc)
        if (result instanceof Document && result !== doc) {
          return result
        }
      }
    }

    this._parsed = true
    return doc
  }

  isParsed () { return this._parsed }

  // Public: Get the named counter and take the next number in the sequence.
  counter (name, seed = null) {
    if (this.parentDocument) return this.parentDocument.counter(name, seed)
    const isLocked = this.isAttributeLocked(name)
    let currVal = this._counters[name]
    let nextVal
    if ((isLocked && currVal != null) || ((currVal = this.attributes[name]) != null && currVal !== '')) {
      nextVal = this._counters[name] = nextval(currVal)
    } else if (seed != null) {
      nextVal = this._counters[name] = (String(seed) === String(parseInt(seed, 10)) ? parseInt(seed, 10) : seed)
    } else {
      nextVal = this._counters[name] = 1
    }
    if (!isLocked) this.attributes[name] = nextVal
    return nextVal
  }

  // Public: Increment the specified counter and store it in the block's attributes.
  incrementAndStoreCounter (counterName, block) {
    return (new AttributeEntry(counterName, this.counter(counterName))).saveTo(block.attributes).value
  }

  // Deprecated alias
  counterIncrement (counterName, block) { return this.incrementAndStoreCounter(counterName, block) }

  // Public: Register a reference in the document catalog.
  register (type, value) {
    switch (type) {
      case 'ids': { // deprecated
        const id  = value[0]
        const ref = new Inline(this, 'anchor', value[1], { type: 'ref', id })
        this.catalog.refs[id] ??= ref
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
          const entry = type === 'images'
            ? new ImageReference(value, this.attributes['imagesdir'])
            : value
          this.catalog[type]?.push(entry)
        }
    }
  }

  // Public: Find the first registered reference matching the given reftext.
  //
  // Returns the String ID or null.
  resolveId (text) {
    if (this._reftexts) return this._reftexts[text] ?? null
    if (this._parsed) {
      this._reftexts = {}
      for (const [id, ref] of Object.entries(this.catalog.refs)) {
        const xreftext = ref.xreftext?.()
        if (xreftext != null) this._reftexts[xreftext] ??= id
      }
      return this._reftexts[text] ?? null
    }
    // Pre-parsed path — scan without caching
    this._reftexts = {}
    let resolvedId = null
    for (const [id, ref] of Object.entries(this.catalog.refs)) {
      const xreftext = ref.xreftext?.()
      if (xreftext === text) { resolvedId = id; break }
      if (xreftext != null) this._reftexts[xreftext] ??= id
    }
    this._reftexts = null
    return resolvedId
  }

  // Public: Check whether this Document has child Section objects.
  hasSections () { return this._nextSectionIndex > 0 }

  isMultipart () {
    if (this.doctype !== 'book') return undefined
    return this.blocks.some(b => {
      if (b.context !== 'section') return false
      if (b.level === 0) return true
      if (!b.special) return false  // break in Ruby → but some() handles this
      return false
    })
  }

  hasFootnotes () { return this.catalog.footnotes.length > 0 }
  get footnotes () { return this.catalog.footnotes }
  get callouts () { return this.catalog.callouts }

  isNested ()   { return this.parentDocument != null }
  isEmbedded () { return 'embedded' in this.attributes }
  hasExtensions () { return this.extensions != null }

  source ()      { return this.reader?.source?.() ?? null }
  sourceLines () { return this.reader?.sourceLines?.() ?? null }

  basebackend (base) {
    return this.attributes['basebackend'] === base
  }

  // Public: Get the doctitle as a String.
  get title () { return this.doctitle() }
  set title (val) {
    let sect = this.header
    if (!sect) {
      sect = this.header = new Section(this, 0)
      sect.sectname = 'header'
    }
    sect.title = val
  }

  // Public: Resolve the primary title for the document.
  doctitle (opts = {}) {
    let val = this.attributes['title']
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
      const sep = opts.partition === true ? this.attributes['title-separator'] : opts.partition
      return new DocumentTitle(val, { ...opts, separator: sep })
    }
    if (opts.sanitize && val.includes('<')) {
      return val.replace(XmlSanitizeRx, '').replace(/  +/g, ' ').trim()
    }
    return val
  }

  get name () { return this.doctitle() }

  xreftext (_xrefstyle = null) {
    const val = this.reftext
    return (val && val.length > 0) ? val : this.title
  }

  get author ()  { return this.attributes['author'] ?? null }
  get revdate () { return this.attributes['revdate'] ?? null }

  authors () {
    const attrs = this.attributes
    if (!('author' in attrs)) return []
    const list = [new Author(attrs['author'], attrs['firstname'], attrs['middlename'], attrs['lastname'], attrs['authorinitials'], attrs['email'])]
    const numAuthors = parseInt(attrs['authorcount'] ?? '0', 10)
    for (let idx = 2; idx <= numAuthors; idx++) {
      list.push(new Author(attrs[`author_${idx}`], attrs[`firstname_${idx}`], attrs[`middlename_${idx}`], attrs[`lastname_${idx}`], attrs[`authorinitials_${idx}`], attrs[`email_${idx}`]))
    }
    return list
  }

  isNotitle ()  { return 'notitle' in this.attributes }
  isNoheader () { return 'noheader' in this.attributes }
  isNofooter () { return 'nofooter' in this.attributes }

  firstSection () {
    return this.header ?? this.blocks.find(b => b.context === 'section') ?? null
  }

  hasHeader () { return this.header != null }

  // Public: Append a child Block, assigning index if it's a section.
  append (block) {
    if (block.context === 'section') this.assignNumeral(block)
    return super.append(block)
  }

  // Internal: Called by parser after parsing header, before parsing body.
  finalizeHeader (unrootedAttributes, headerValid = true) {
    this._clearPlaybackAttributes(unrootedAttributes)
    this._saveAttributes()
    if (!headerValid) unrootedAttributes['invalid-header'] = true
    return unrootedAttributes
  }

  // Public: Replay attribute assignments from block attributes.
  playbackAttributes (blockAttributes) {
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

  // Public: Restore attributes to the state saved at end of header parse.
  _restoreAttributes () {
    if (!this.parentDocument) this.catalog.callouts.rewind()
    Object.assign(this.attributes, this._headerAttributes ?? {})
  }

  // Public: Set the specified attribute if not locked.
  //
  // Returns the substituted value, or null if locked.
  setAttribute (name, value = '') {
    if (this.isAttributeLocked(name)) return null
    if (value && value !== '') value = this._applyAttributeValueSubs(value)
    if (this._headerAttributes) {
      this._headerAttributes[name] = this.attributes[name] = value
      switch (name) {
        case 'backend':
          this._updateBackendAttributes(value, this._attributesModified.delete('htmlsyntax') && value === this.backend)
          break
        case 'doctype':
          this._updateDoctypeAttributes(value)
          break
      }
    } else {
      switch (name) {
        case 'backend':
          this._updateBackendAttributes(value, this._attributesModified.delete('htmlsyntax') && value === this.backend)
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

  // Public: Delete the specified attribute if not locked.
  //
  // Returns true if deleted, false if locked.
  deleteAttribute (name) {
    if (this.isAttributeLocked(name)) return false
    delete this.attributes[name]
    this._attributesModified.add(name)
    return true
  }

  // Public: Check if the attribute is locked.
  isAttributeLocked (name) {
    return name in this._attributeOverrides
  }

  // Deprecated alias
  attributeLocked (name) { return this.isAttributeLocked(name) }

  // Public: Assign a value to the specified attribute in the document header.
  setHeaderAttribute (name, value = '', overwrite = true) {
    const target = this._headerAttributes ?? this.attributes
    if (!overwrite && (name in target)) return false
    target[name] = value
    return true
  }

  // Public: Convert the AsciiDoc document.
  convert (opts = {}) {
    if (this._timings) this._timings.start('convert')
    this.parse()
    if (this.safe < SafeMode.SERVER && Object.keys(opts).length > 0) {
      if (!opts.outfile) delete this.attributes['outfile']
      else this.attributes['outfile'] = opts.outfile
      if (!opts.outdir) delete this.attributes['outdir']
      else this.attributes['outdir'] = opts.outdir
    }

    let output
    if (this.doctype === 'inline') {
      const block = this.blocks[0] ?? this.header
      if (block) {
        if (block.contentModel === 'compound' || block.contentModel === 'empty') {
          this.logger.warn('no inline candidate; use the inline doctype to convert a single paragraph, verbatim, or raw block')
        } else {
          output = block.content
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
      output = this.converter.convert(this, transform)
    }

    if (!this.parentDocument && this.extensions?.hasPostprocessors?.()) {
      for (const ext of this.extensions.postprocessors()) {
        output = ext.processMethod(this, output)
      }
    }

    if (this._timings) this._timings.record('convert')
    return output
  }

  // Deprecated alias
  render (opts = {}) { return this.convert(opts) }

  // Public: Write output to the specified file or stream.
  write (output, target) {
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
          const fs = require('node:fs')
          fs.writeFileSync(target, output ?? '', 'utf8')
        } catch {}
      }
      if (this.backend === 'manpage' && typeof target === 'string' &&
          typeof this.converter.constructor?.writeAlternatePages === 'function') {
        this.converter.constructor.writeAlternatePages(this.attributes['mannames'], this.attributes['manvolnum'], target)
      }
    }
    if (this._timings) this._timings.record('write')
  }

  get content () {
    delete this.attributes['title']
    return super.content
  }

  // Public: Read the docinfo file(s) for inclusion in the document template.
  docinfo (location = 'head', suffix = null) {
    let content = null
    if (this.safe < SafeMode.SECURE) {
      const qualifier = location !== 'head' ? `-${location}` : ''
      suffix ??= this.outfilesuffix

      let docinfo = this.attributes['docinfo']
      if (!docinfo) {
        if ('docinfo2' in this.attributes) {
          docinfo = ['private', 'shared']
        } else if ('docinfo1' in this.attributes) {
          docinfo = ['shared']
        } else {
          docinfo = docinfo != null ? ['private'] : null
        }
      } else {
        docinfo = docinfo.split(',').map(k => k.trim())
      }

      if (docinfo) {
        content = []
        const docinfoFile = `docinfo${qualifier}${suffix}`
        const docinfoDir  = this.attributes['docinfodir']
        const docinfoSubs = this._resolveDocinfoSubs()

        const hasShared = docinfo.includes('shared') || docinfo.includes(`shared-${location}`)
        if (hasShared) {
          const path = this.normalizeSystemPath(docinfoFile, docinfoDir)
          const shared = this.readAsset(path, { normalize: true })
          if (shared) content.push(this.applySubs(shared, docinfoSubs))
        }

        const docname = this.attributes['docname']
        const hasPrivate = docname && (docinfo.includes('private') || docinfo.includes(`private-${location}`))
        if (hasPrivate) {
          const path = this.normalizeSystemPath(`${docname}-${docinfoFile}`, docinfoDir)
          const priv = this.readAsset(path, { normalize: true })
          if (priv) content.push(this.applySubs(priv, docinfoSubs))
        }
      }
    }

    if (this.extensions && this._docinfoProcessors(location)) {
      const extContent = this._docinfoProcessorExtensions[location].map(ext => ext.processMethod(this)).filter(Boolean)
      return (content ?? []).concat(extContent).join(LF)
    }
    return content ? content.join(LF) : ''
  }

  _docinfoProcessors (location) {
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

  toString () {
    return `#<Document {doctype: '${this.doctype}', doctitle: ${JSON.stringify(this.header?.title ?? null)}, blocks: ${this.blocks.length}}>`
  }

  // ── Private methods ─────────────────────────────────────────────────────────

  _applyAttributeValueSubs (value) {
    let result
    const m = value.match(AttributeEntryPassMacroRx)
    if (m) {
      result = m[2]
      if (m[1]) result = this.applySubs(result, this.resolvePassSubs(m[1]))
    } else {
      result = this.applyHeaderSubs(value)
    }
    return this._maxAttributeValueSize != null ? _limitBytesize(result, this._maxAttributeValueSize) : result
  }

  _resolveDocinfoSubs () {
    return ('docinfosubs' in this.attributes)
      ? this.resolveSubs(this.attributes['docinfosubs'], 'block', null, 'docinfo')
      : ['attributes']
  }

  _createConverter (backend, delegateBackend) {
    const converterOpts = { document: this, htmlsyntax: this.attributes['htmlsyntax'] }
    const opts = this.options
    if (opts.template_dirs || opts.template_dir) {
      converterOpts.template_dirs  = [].concat(opts.template_dirs ?? opts.template_dir)
      converterOpts.template_cache = opts.template_cache ?? true
      converterOpts.template_engine = opts.template_engine
      converterOpts.template_engine_options = opts.template_engine_options
      converterOpts.eruby          = opts.eruby
      converterOpts.safe           = this.safe
      if (delegateBackend) converterOpts.delegate_backend = delegateBackend
    }
    if (opts.converter) {
      return (new CustomFactory({ [backend]: opts.converter })).createSync(backend, converterOpts)
    }
    const factory = opts.converter_factory ?? Converter
    return factory.createSync(backend, converterOpts)
  }

  _clearPlaybackAttributes (attributes) {
    delete attributes.attribute_entries
  }

  _saveAttributes () {
    const attrs = this.attributes
    if (!('doctitle' in attrs)) {
      const dt = this.doctitle()
      if (dt) attrs['doctitle'] = dt
    }
    this.id ??= attrs['css-signature'] ?? null

    // Handle toc / toc2
    // NOTE: delete toc/toc2 from attrs first; only re-add specific placement/position attrs
    let tocVal
    if ('toc2' in attrs) {
      delete attrs['toc2']
      tocVal = 'left'
    } else if ('toc' in attrs) {
      tocVal = attrs['toc']
      delete attrs['toc']
    }
    if (tocVal != null) {
      const tocPlacementVal = attrs['toc-placement'] ?? 'macro'
      const tocPositionVal  = (tocPlacementVal && tocPlacementVal !== 'auto') ? tocPlacementVal : attrs['toc-position']
      if (tocVal !== '' || tocPositionVal) {
        const defaultTocPosition = 'left'
        let defaultTocClass = 'toc2'
        const position = (!tocPositionVal) ? (tocVal || defaultTocPosition) : tocPositionVal
        attrs['toc-placement'] = 'auto'
        switch (position) {
          case 'left': case '<': case '&lt;':   attrs['toc-position'] = 'left';    break
          case 'right': case '>': case '&gt;':  attrs['toc-position'] = 'right';   break
          case 'top': case '^':                 attrs['toc-position'] = 'top';     break
          case 'bottom': case 'v':              attrs['toc-position'] = 'bottom';  break
          case 'preamble': case 'macro':
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
      attrs['toc'] = ''
    }

    const iconsVal = attrs['icons']
    if (iconsVal != null && !('icontype' in attrs)) {
      if (iconsVal !== '' && iconsVal !== 'font') {
        attrs['icons'] = ''
        if (iconsVal !== 'image') attrs['icontype'] = iconsVal
      }
    }

    this.compatMode = 'compat-mode' in attrs
    if (this.compatMode && 'language' in attrs) {
      attrs['source-language'] = attrs['language']
    }

    if (!this.parentDocument) {
      const basebackend = attrs['basebackend']
      if (basebackend === 'html') {
        const syntaxHlName = attrs['source-highlighter']
        if (syntaxHlName && !attrs[`${syntaxHlName}-unavailable`]) {
          // SyntaxHighlighter — optional integration, handle gracefully
          try {
            const factory = this.options.syntax_highlighter_factory
            if (factory) {
              this.syntaxHighlighter = factory.create(syntaxHlName, this.backend, { document: this })
            } else {
              this.syntaxHighlighter = SyntaxHighlighter.create(syntaxHlName, this.backend, { document: this })
            }
          } catch {}
        }
      } else if (basebackend === 'docbook') {
        if (!this.isAttributeLocked('toc') && !this._attributesModified.has('toc')) {
          attrs['toc'] = ''
        }
        if (!this.isAttributeLocked('sectnums') && !this._attributesModified.has('sectnums')) {
          attrs['sectnums'] = ''
        }
      }
      this.outfilesuffix = attrs['outfilesuffix'] ?? null

      for (const name of FLEXIBLE_ATTRIBUTES) {
        if ((name in this._attributeOverrides) && this._attributeOverrides[name]) {
          delete this._attributeOverrides[name]
        }
      }
    }

    this._headerAttributes = { ...attrs }
  }

  _fillDatetimeAttributes (attrs, inputMtime) {
    const sourceDateEpoch = typeof process !== 'undefined'
      ? process.env.SOURCE_DATE_EPOCH
      : null
    const now = (sourceDateEpoch && sourceDateEpoch !== '')
      ? new Date(parseInt(sourceDateEpoch, 10) * 1000)
      : new Date()

    let localdate = attrs['localdate']
    if (localdate) {
      attrs['localyear'] ??= localdate.length >= 4 ? localdate.slice(0, 4) : null
    } else {
      localdate = attrs['localdate'] = _formatDate(now)
      attrs['localyear'] ??= String(now.getFullYear())
    }
    const localtime = (attrs['localtime'] ??= _formatTime(now))
    attrs['localdatetime'] ??= `${localdate} ${localtime}`

    const effectiveMtime = (sourceDateEpoch && sourceDateEpoch !== '')
      ? now
      : (inputMtime instanceof Date ? inputMtime : now)

    let docdate = attrs['docdate']
    if (docdate) {
      attrs['docyear'] ??= docdate.length >= 4 ? docdate.slice(0, 4) : null
    } else {
      docdate = attrs['docdate'] = _formatDate(effectiveMtime)
      attrs['docyear'] ??= String(effectiveMtime.getFullYear())
    }
    const doctime = (attrs['doctime'] ??= _formatTime(effectiveMtime))
    attrs['docdatetime'] ??= `${docdate} ${doctime}`
  }

  _updateBackendAttributes (newBackend, init = false) {
    if (!init && newBackend === this.backend) return undefined
    const currentBackend     = this.backend
    const attrs              = this.attributes
    const currentBasebackend = attrs['basebackend']
    const currentDoctype     = this.doctype

    let delegateBackend = null
    let actualBackend   = null
    if (newBackend.includes(':')) {
      const parts = newBackend.split(':')
      actualBackend = parts[0]
      newBackend    = parts[1]
    }
    if (newBackend.startsWith('xhtml')) {
      attrs['htmlsyntax'] = 'xml'
      newBackend = newBackend.slice(1)
    } else if (newBackend.startsWith('html')) {
      attrs['htmlsyntax'] ??= 'html'
    }
    newBackend = BACKEND_ALIASES[newBackend] ?? newBackend
    if (actualBackend) {
      delegateBackend = newBackend
      newBackend      = actualBackend
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
    this.backend = attrs['backend'] = newBackend

    // Create the converter (may be async in some environments; here synchronous)
    const converter = this._createConverter(newBackend, delegateBackend)
    let newBasebackend, newFiletype

    if (converter && typeof converter._getBackendTraits === 'function') {
      newBasebackend = converter.basebackend()
      newFiletype    = converter.filetype()
      const htmlsyntax = converter.htmlsyntax()
      if (htmlsyntax) attrs['htmlsyntax'] ??= htmlsyntax
      if (init) {
        attrs['outfilesuffix'] ??= converter.outfilesuffix()
      } else if (!this.isAttributeLocked('outfilesuffix')) {
        attrs['outfilesuffix'] = converter.outfilesuffix()
      }
    } else if (converter) {
      const traits  = deriveBackendTraits(newBackend)
      newBasebackend = traits.basebackend
      newFiletype    = traits.filetype
      if (init) {
        attrs['outfilesuffix'] ??= traits.outfilesuffix
      } else if (!this.isAttributeLocked('outfilesuffix')) {
        attrs['outfilesuffix'] = traits.outfilesuffix
      }
    } else {
      throw new Error(`asciidoctor: FAILED: missing converter for backend '${newBackend}'. Processing aborted.`)
    }
    this.converter = converter

    const currentFiletype = attrs['filetype']
    if (currentFiletype) delete attrs[`filetype-${currentFiletype}`]
    attrs['filetype']               = newFiletype
    attrs[`filetype-${newFiletype}`] = ''

    const pageWidth = DEFAULT_PAGE_WIDTHS[newBasebackend]
    if (pageWidth) {
      attrs['pagewidth'] = pageWidth
    } else {
      delete attrs['pagewidth']
    }

    if (newBasebackend !== currentBasebackend) {
      if (currentDoctype) {
        if (currentBasebackend) {
          delete attrs[`basebackend-${currentBasebackend}`]
          delete attrs[`basebackend-${currentBasebackend}-doctype-${currentDoctype}`]
        }
        attrs[`basebackend-${newBasebackend}-doctype-${currentDoctype}`] = ''
      } else if (currentBasebackend) {
        delete attrs[`basebackend-${currentBasebackend}`]
      }
      attrs[`basebackend-${newBasebackend}`] = ''
      attrs['basebackend'] = newBasebackend
    }
    return newBackend
  }

  _updateDoctypeAttributes (newDoctype) {
    if (!newDoctype || newDoctype === this.doctype) return undefined
    const currentBackend     = this.backend
    const attrs              = this.attributes
    const currentBasebackend = attrs['basebackend']
    const currentDoctype     = this.doctype
    if (currentDoctype) {
      delete attrs[`doctype-${currentDoctype}`]
      if (currentBackend) {
        delete attrs[`backend-${currentBackend}-doctype-${currentDoctype}`]
        attrs[`backend-${currentBackend}-doctype-${newDoctype}`] = ''
      }
      if (currentBasebackend) {
        delete attrs[`basebackend-${currentBasebackend}-doctype-${currentDoctype}`]
        attrs[`basebackend-${currentBasebackend}-doctype-${newDoctype}`] = ''
      }
    } else {
      if (currentBackend) attrs[`backend-${currentBackend}-doctype-${newDoctype}`] = ''
      if (currentBasebackend) attrs[`basebackend-${currentBasebackend}-doctype-${newDoctype}`] = ''
    }
    attrs[`doctype-${newDoctype}`] = ''
    this.doctype = attrs['doctype'] = newDoctype
    return newDoctype
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _expandPath (p) {
  try {
    return require('node:path').resolve(p)
  } catch {
    return p
  }
}

function _cwd () {
  return typeof process !== 'undefined' ? process.cwd() : '/'
}

function _pad2 (n) { return String(n).padStart(2, '0') }

function _formatDate (d) {
  return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`
}

function _formatTime (d) {
  const offset = -d.getTimezoneOffset()
  const sign   = offset >= 0 ? '+' : '-'
  const abs    = Math.abs(offset)
  const hh     = _pad2(Math.floor(abs / 60))
  const mm     = _pad2(abs % 60)
  return `${_pad2(d.getHours())}:${_pad2(d.getMinutes())}:${_pad2(d.getSeconds())} ${offset === 0 ? 'UTC' : `${sign}${hh}${mm}`}`
}

function _limitBytesize (str, max) {
  const encoded = new TextEncoder().encode(str)
  if (encoded.length <= max) return str
  // Walk back from max to find the last complete UTF-8 character boundary.
  let end = max
  // Back up past continuation bytes (0x80–0xBF).
  while (end > 0 && (encoded[end - 1] & 0xC0) === 0x80) end--
  // If the byte at end-1 is a multibyte start byte, check whether its full
  // sequence fits within max.
  if (end > 0 && (encoded[end - 1] & 0x80) !== 0) {
    const b = encoded[end - 1]
    const charLen = b >= 0xF0 ? 4 : b >= 0xE0 ? 3 : b >= 0xC0 ? 2 : 1
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
function _depKey (path) { return path.replace(/^\.\//, '') }

function await_require (path) { return _deps[_depKey(path)] ?? {} }
