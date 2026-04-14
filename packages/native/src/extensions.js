// ESM conversion of extensions.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby modules used as mixins → plain JS objects applied via Object.assign.
//   - Ruby :symbols used as keys → plain strings throughout.
//   - Ruby ::Set → JavaScript Set.
//   - Ruby defined? @foo → this._foo !== undefined.
//   - Ruby instance_exec(&block) → block.call(instance) or instance method call.
//   - Ruby singleton_class.enable_dsl → Object.assign(instance, kindClass.DSL).
//   - Ruby class << self → static methods.
//   - Ruby Helpers.resolve_class → typeof fn === 'function' check.
//   - Ruby @@class_var (InlineMacroProcessor.rx_cache) → static property.
//   - Config option keys keep snake_case to match the Ruby/parser convention.
//   - String class-name resolution (e.g. preprocessor 'MyClass') is not supported;
//     pass the class constructor or an instance directly.
//   - Parser.parseBlocks / block.subAttributes / block.assignCaption are forward
//     references; they will be resolved when those modules implement the methods.

import { Section } from './section.js'
import { Block } from './block.js'
import { List, ListItem } from './list.js'
import { Inline } from './inline.js'
import { Reader } from './reader.js'
import { Parser } from './parser.js'
import { AttributeList } from './attribute_list.js'
import { basename } from './helpers.js'
import { ATTR_REF_HEAD } from './constants.js'
import { MacroNameRx, CC_ANY } from './rx.js'

// ── DSL Mixins ────────────────────────────────────────────────────────────────

// Internal: Overlays a builder DSL for configuring a Processor instance.
// Applied to a processor instance via Object.assign(instance, DslMixin).
//
// The process() method has dual behaviour (mirrors Ruby's block / no-block):
//   - Called with a single Function argument → stores it as the process block.
//   - Called with non-Function arguments   → invokes the stored process block.
//
// The this context inside a stored process function is bound to the processor
// instance at definition time.
export const ProcessorDsl = {
  option (key, value) {
    this.config[key] = value
  },

  process (...args) {
    if (args.length === 1 && typeof args[0] === 'function') {
      this._processBlock = args[0].bind(this)
    } else if (this._processBlock !== undefined) {
      return this._processBlock(...args)
    } else {
      throw new Error(`${this.constructor.name} #process method called before being registered`)
    }
  },

  processBlockGiven () {
    return this._processBlock !== undefined
  },
}

export const DocumentProcessorDsl = {
  ...ProcessorDsl,

  prefer () {
    this.option('position', '>>')
  },

  // alias: prepend is an alternative name for prefer (matches Ruby DSL)
  prepend () {
    this.prefer()
  },
}

export const SyntaxProcessorDsl = {
  ...ProcessorDsl,

  named (value) {
    // When applied to a processor instance, set the name directly.
    // When applied to a class (via static enableDsl), store in config.
    if (this instanceof Processor) {
      this.name = value
    } else {
      this.option('name', value)
    }
  },

  contentModel (value) {
    this.option('content_model', value)
  },

  // alias: parse_content_as
  parseContentAs (value) {
    this.option('content_model', value)
  },

  positionalAttributes (...value) {
    this.option('positional_attrs', value.flat().map(String))
  },

  // alias: name_positional_attributes / positional_attrs
  namePositionalAttributes (...value) {
    this.option('positional_attrs', value.flat().map(String))
  },

  positionalAttrs (...value) {
    this.option('positional_attrs', value.flat().map(String))
  },

  defaultAttributes (value) {
    this.option('default_attrs', value)
  },

  // alias: default_attrs (deprecated)
  defaultAttrs (value) {
    this.option('default_attrs', value)
  },

  // Public: Resolve and register positional attribute names and default values.
  //
  // Accepts any of:
  //   resolve_attributes()             → positional_attrs: [], default_attrs: {}
  //   resolve_attributes('foo', 'bar') → positional maps (Array-style)
  //   resolve_attributes({...})        → positional maps (Object-style)
  //
  // Array-style tokens understand positional-index notation (e.g. '1:name',
  // '@:name') and default-value notation (e.g. 'name=value', '1:name=value').
  resolveAttributes (...args) {
    // Normalise: if 0 or 1 argument given, unwrap into a single value.
    if (args.length <= 1) {
      const first = args.length === 0 ? true : args[0]
      if (typeof first === 'string' || typeof first === 'symbol') {
        args = [first]
      } else {
        args = first  // true, Array, or plain Object
      }
    }

    if (args === true) {
      this.option('positional_attrs', [])
      this.option('default_attrs', {})
    } else if (Array.isArray(args)) {
      const names = []
      const defaults = {}
      for (let arg of args) {
        arg = String(arg)
        if (arg.includes('=')) {
          const eqIdx = arg.indexOf('=')
          let name = arg.slice(0, eqIdx)
          const value = arg.slice(eqIdx + 1)
          if (name.includes(':')) {
            const colonIdx = name.indexOf(':')
            const idxStr = name.slice(0, colonIdx)
            name = name.slice(colonIdx + 1)
            const idx = idxStr === '@' ? names.length : parseInt(idxStr, 10)
            names[idx] = name
          }
          defaults[name] = value
        } else if (arg.includes(':')) {
          const colonIdx = arg.indexOf(':')
          const idxStr = arg.slice(0, colonIdx)
          const name = arg.slice(colonIdx + 1)
          const idx = idxStr === '@' ? names.length : parseInt(idxStr, 10)
          names[idx] = name
        } else {
          names.push(arg)
        }
      }
      this.option('positional_attrs', names.filter(n => n != null))
      this.option('default_attrs', defaults)
    } else if (typeof args === 'object' && args !== null) {
      const names = []
      const defaults = {}
      for (const [key, val] of Object.entries(args)) {
        let name = String(key)
        if (name.includes(':')) {
          const colonIdx = name.indexOf(':')
          const idxStr = name.slice(0, colonIdx)
          name = name.slice(colonIdx + 1)
          const idx = idxStr === '@' ? names.length : parseInt(idxStr, 10)
          names[idx] = name
        }
        if (val) defaults[name] = val
      }
      this.option('positional_attrs', names.filter(n => n != null))
      this.option('default_attrs', defaults)
    } else {
      throw new Error(`unsupported attributes specification for macro: ${args}`)
    }
  },

  // alias: resolves_attributes (deprecated)
  resolvesAttributes (...args) {
    this.resolveAttributes(...args)
  },
}

export const IncludeProcessorDsl = {
  ...DocumentProcessorDsl,

  handles (...args) {
    if (args.length === 1 && typeof args[0] === 'function') {
      const fn = args[0]
      // Normalise arity-1 handle blocks to accept (doc, target)
      this._handlesBlock = fn.length === 1 ? (_doc, target) => fn(target) : fn.bind(this)
    } else if (this._handlesBlock !== undefined) {
      return this._handlesBlock(args[0], args[1])
    } else {
      return true
    }
  },
}

export const DocinfoProcessorDsl = {
  ...DocumentProcessorDsl,

  atLocation (value) {
    this.option('location', value)
  },
}

export const BlockProcessorDsl = {
  ...SyntaxProcessorDsl,

  contexts (...value) {
    this.option('contexts', new Set(value.flat()))
  },

  // aliases
  onContexts (...value) { this.contexts(...value) },
  onContext (...value)   { this.contexts(...value) },
  bindTo (...value)      { this.contexts(...value) },
}

export const MacroProcessorDsl = {
  ...SyntaxProcessorDsl,

  // Override: passing a falsy value sets content_model to :text instead of
  // configuring positional attributes.
  resolveAttributes (...args) {
    if (args.length === 1 && !args[0]) {
      this.option('content_model', 'text')
    } else {
      SyntaxProcessorDsl.resolveAttributes.call(this, ...args)
      this.option('content_model', 'attributes')
    }
  },

  resolvesAttributes (...args) {
    this.resolveAttributes(...args)
  },
}

export const InlineMacroProcessorDsl = {
  ...MacroProcessorDsl,

  format (value) {
    this.option('format', value)
  },

  // alias: match_format
  matchFormat (value) { this.option('format', value) },
  // alias: using_format (deprecated)
  usingFormat (value)  { this.option('format', value) },

  match (value) {
    this.option('regexp', value)
  },
}

// ── Processor ────────────────────────────────────────────────────────────────

// Public: An abstract base class for document and syntax processors.
//
// Provides a class-level config map (via static config / static option) and a
// set of convenience factory methods for creating AST nodes.
export class Processor {
  // Public: Get the static configuration map for this processor class.
  // Uses hasOwnProperty to avoid inheriting a parent class's config object
  // through the prototype chain when a subclass first accesses config.
  static get config () {
    if (!Object.prototype.hasOwnProperty.call(this, '_config')) this._config = {}
    return this._config
  }

  // Public: Set a default option value for all instances of this processor class.
  static option (key, value) { this.config[key] = value }

  // Public: Mix the DSL object for this processor class into its prototype.
  static enableDsl () {
    const DSL = this.DSL
    if (DSL) Object.assign(this.prototype, DSL)
  }
  static useDsl () { this.enableDsl() }

  // Public: Get the configuration Object for this processor instance.
  // config

  constructor (config = {}) {
    this.config = { ...this.constructor.config, ...config }
  }

  updateConfig (config) {
    Object.assign(this.config, config)
  }

  process (..._args) {
    throw new Error(`${this.constructor.name} subclass must implement the process method`)
  }

  // Public: Creates a new Section node.
  //
  // Creates a Section node in the same manner as the parser.
  //
  // parent - The parent Section (or Document) of this new Section.
  // title  - The String title of the new Section.
  // attrs  - A plain object of attributes to control how the section is built.
  //          Use the style attribute to set the name of a special section (e.g. appendix).
  //          Use the id attribute to assign an explicit ID, or set it to false to
  //          disable automatic ID generation (when sectids document attribute is set).
  // opts   - An optional plain object of options (default: {}):
  //          level    - The Integer level to assign; defaults to parent.level + 1.
  //          numbered - Boolean flag to force numbering.
  //
  // Returns a Section node with all properties properly initialized.
  createSection (parent, title, attrs, opts = {}) {
    const doc = parent.document
    const doctype = doc.doctype
    const book = doctype === 'book'
    const level = opts.level ?? (parent.level + 1)

    let sectname, special = false
    const style = attrs.style
    if (style) {
      delete attrs.style
      if (book && style === 'abstract') {
        sectname = 'chapter'
        // level intentionally set to 1 (overrides local const)
        Object.defineProperty(opts, '_level', { value: 1 })
      } else {
        sectname = style
        special = true
        if (level === 0) {
          // promote to level 1
        }
      }
    } else if (book) {
      sectname = level === 0 ? 'part' : (level > 1 ? 'section' : 'chapter')
    } else if (doctype === 'manpage' && title.toLowerCase() === 'synopsis') {
      sectname = 'synopsis'
      special = true
    } else {
      sectname = 'section'
    }

    // Re-derive level if style forced it (appendix/abstract style override)
    const effectiveLevel = (style && book && style === 'abstract') ? 1
      : (style && special && level === 0) ? 1
      : level

    const sect = new Section(parent, effectiveLevel)
    sect.title = title
    sect.sectname = sectname

    if (special) {
      sect.special = true
      if ('numbered' in opts ? opts.numbered : style === 'appendix') {
        sect.numbered = true
      } else if (!('numbered' in opts) && doc.hasAttr('sectnums', 'all')) {
        sect.numbered = (book && effectiveLevel === 1) ? 'chapter' : true
      }
    } else if (effectiveLevel > 0) {
      if ('numbered' in opts ? opts.numbered : doc.hasAttr('sectnums')) {
        sect.numbered = sect.special ? !!(parent.numbered) : true
      }
    } else if ('numbered' in opts ? opts.numbered : (book && doc.hasAttr('partnums'))) {
      sect.numbered = true
    }

    if (attrs.id === false) {
      delete attrs.id
    } else {
      sect.id = attrs.id = attrs.id
        || (doc.hasAttr('sectids') ? Section.generateId(sect.title, doc) : null)
    }
    sect.updateAttributes(attrs)
    return sect
  }

  createBlock (parent, context, source, attrs, opts = {}) {
    return new Block(parent, context, { source, attributes: attrs, ...opts })
  }

  // Public: Creates a list node and links it to the specified parent.
  //
  // parent  - The parent Block (Block, Section, or Document) of this new list.
  // context - The list context ('ulist', 'olist', 'colist', 'dlist').
  // attrs   - A plain object of attributes to set on this list block.
  //
  // Returns a List node with all properties properly initialized.
  createList (parent, context, attrs = null) {
    const list = new List(parent, context)
    if (attrs) list.updateAttributes(attrs)
    return list
  }

  // Public: Creates a list item node and links it to the specified parent.
  //
  // parent - The parent List of this new list item block.
  // text   - The text of the list item.
  //
  // Returns a ListItem node with all properties properly initialized.
  createListItem (parent, text = null) {
    return new ListItem(parent, text)
  }

  // Public: Creates an image block node and links it to the specified parent.
  //
  // parent - The parent Block (Block, Section, or Document) of this new image block.
  // attrs  - A plain object of attributes to control how the image block is built.
  //          The target attribute sets the image source; alt sets the alt text.
  // opts   - An optional plain object of options (default: {}).
  //
  // Returns a Block node with all properties properly initialized.
  createImageBlock (parent, attrs, opts = {}) {
    const target = attrs.target
    if (!target) throw new Error('Unable to create an image block, target attribute is required')
    if (!attrs.alt) attrs.alt = attrs['default-alt'] = basename(target, true).replace(/[_-]/g, ' ')
    const title = 'title' in attrs ? attrs.title : null
    if (title !== null) delete attrs.title
    const block = this.createBlock(parent, 'image', null, attrs, opts)
    if (title) {
      block.title = title
      const caption = attrs.caption
      delete attrs.caption
      block.assignCaption(caption, 'figure')
    }
    return block
  }

  // Public: Creates an inline node and binds it to the specified parent.
  //
  // parent  - The parent Block of this new inline node.
  // context - The context of the inline node ('quoted', 'anchor', etc.).
  // text    - The text of the inline node.
  // opts    - An optional plain object of options (default: {}):
  //           type       - The subtype of the inline node context.
  //           attributes - Attributes to set on the inline node.
  //
  // Returns an Inline node with all properties properly initialized.
  createInline (parent, context, text, opts = {}) {
    const options = context === 'quoted' ? { type: 'unquoted', ...opts } : opts
    return new Inline(parent, context, text, options)
  }

  // Public: Parses blocks in the content and attaches them to the parent.
  //
  // Returns the parent node into which the blocks are parsed.
  parseContent (parent, content, attributes = null) {
    const reader = content instanceof Reader ? content : new Reader(content)
    Parser.parseBlocks(reader, parent, attributes)
    return parent
  }

  // Public: Parses the attrlist String into a plain object of attributes.
  //
  // block    - The current AbstractBlock (used for applying subs).
  // attrlist - The list of attributes as a String.
  // opts     - An optional plain object of options:
  //            positional_attributes - Array of attribute names to map positional args to.
  //            sub_attributes        - Enables attribute substitution on attrlist.
  //
  // Returns a plain object of parsed attributes.
  parseAttributes (block, attrlist, opts = {}) {
    if (!attrlist || attrlist.length === 0) return {}
    if (opts.sub_attributes && attrlist.includes(ATTR_REF_HEAD)) {
      attrlist = block.subAttributes(attrlist)
    }
    return new AttributeList(attrlist).parse(opts.positional_attributes || [])
  }

  // Convenience factory methods that delegate to createBlock / createInline
  // with a fixed context.
  createParagraph (parent, ...rest)    { return this.createBlock(parent, 'paragraph', ...rest) }
  createOpenBlock (parent, ...rest)    { return this.createBlock(parent, 'open', ...rest) }
  createExampleBlock (parent, ...rest) { return this.createBlock(parent, 'example', ...rest) }
  createPassBlock (parent, ...rest)    { return this.createBlock(parent, 'pass', ...rest) }
  createListingBlock (parent, ...rest) { return this.createBlock(parent, 'listing', ...rest) }
  createLiteralBlock (parent, ...rest) { return this.createBlock(parent, 'literal', ...rest) }
  createAnchor (parent, ...rest)       { return this.createInline(parent, 'anchor', ...rest) }
  createInlinePass (parent, ...rest)   { return this.createInline(parent, 'quoted', ...rest) }
}

// ── Document processors ───────────────────────────────────────────────────────

// Public: Preprocessors are run after the source text is split into lines and
// normalised, but before parsing begins.
//
// Asciidoctor passes the document and the document's Reader to the process
// method of the Preprocessor instance. The Preprocessor can modify the Reader
// as necessary and either return the same Reader (or falsy) or a substitute Reader.
//
// Preprocessor implementations must extend Preprocessor.
export class Preprocessor extends Processor {
  process (_document, _reader) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }
}
Preprocessor.DSL = DocumentProcessorDsl

// Public: TreeProcessors are run on the Document after the source has been
// parsed into an abstract syntax tree (AST).
//
// TreeProcessor implementations must extend TreeProcessor.
export class TreeProcessor extends Processor {
  process (_document) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }
}
TreeProcessor.DSL = DocumentProcessorDsl

// Alias deprecated class name for backwards compatibility.
export const Treeprocessor = TreeProcessor

// Public: Postprocessors are run after the document is converted, but before
// it is written to the output stream.
//
// Postprocessor implementations must extend Postprocessor.
export class Postprocessor extends Processor {
  process (_document, _output) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }
}
Postprocessor.DSL = DocumentProcessorDsl

// Public: IncludeProcessors handle include::<target>[] directives.
//
// IncludeProcessor implementations must extend IncludeProcessor.
export class IncludeProcessor extends Processor {
  process (_document, _reader, _target, _attributes) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }

  handles (_doc, _target) {
    return true
  }
}
IncludeProcessor.DSL = IncludeProcessorDsl

// Public: DocinfoProcessors add additional content to the header and/or footer
// of the generated document.
//
// DocinfoProcessor implementations must extend DocinfoProcessor.
export class DocinfoProcessor extends Processor {
  constructor (config = {}) {
    super(config)
    this.config.location ??= 'head'
  }

  process (_document) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }
}
DocinfoProcessor.DSL = DocinfoProcessorDsl

// ── Syntax processors ─────────────────────────────────────────────────────────

// Public: BlockProcessors handle delimited blocks and paragraphs with a custom name.
//
// BlockProcessor implementations must extend BlockProcessor.
export class BlockProcessor extends Processor {
  // Public: Get/Set the name of the block handled by this processor.
  // name

  constructor (name = null, config = {}) {
    super(config)
    this.name = name || this.config.name || null

    // Normalise contexts config to a Set.
    const ctx = this.config.contexts
    if (ctx == null) {
      this.config.contexts = new Set(['open', 'paragraph'])
    } else if (typeof ctx === 'string') {
      this.config.contexts = new Set([ctx])
    } else if (Array.isArray(ctx)) {
      this.config.contexts = new Set(ctx)
    }

    this.config.content_model ??= 'compound'
  }

  process (_parent, _reader, _attributes) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }
}
BlockProcessor.DSL = BlockProcessorDsl

// Internal: Base class shared by BlockMacroProcessor and InlineMacroProcessor.
export class MacroProcessor extends Processor {
  // Public: Get/Set the name of the macro handled by this processor.
  // name

  constructor (name = null, config = {}) {
    super(config)
    this.name = name || this.config.name || null
    this.config.content_model ??= 'attributes'
  }

  process (_parent, _target, _attributes) {
    throw new Error(`${this.constructor.name} must implement the process method`)
  }
}

// Public: BlockMacroProcessors handle block macros with a custom name.
//
// BlockMacroProcessor implementations must extend BlockMacroProcessor.
export class BlockMacroProcessor extends MacroProcessor {
  // Getter validates the name; setter just stores it so construction never throws.
  get name () {
    if (this._name != null && !MacroNameRx.test(String(this._name))) {
      throw new Error(`invalid name for block macro: ${this._name}`)
    }
    return this._name
  }

  set name (value) {
    this._name = value
  }
}
BlockMacroProcessor.DSL = MacroProcessorDsl

// Public: InlineMacroProcessors handle inline macros with a custom name.
//
// InlineMacroProcessor implementations must extend InlineMacroProcessor.
export class InlineMacroProcessor extends MacroProcessor {
  static rxCache = new Map()

  // Lookup (and memoize) the regexp for this inline macro processor.
  get regexp () {
    return this.config.regexp ??= this.resolveRegexp(String(this.name), this.config.format)
  }

  resolveRegexp (name, format) {
    if (!MacroNameRx.test(name)) {
      throw new Error(`invalid name for inline macro: ${name}`)
    }
    const key = `${name}:${format}`
    if (!InlineMacroProcessor.rxCache.has(key)) {
      const targetPart = format === 'short' ? '(){0}' : '(\\S+?)'
      InlineMacroProcessor.rxCache.set(
        key,
        new RegExp(`\\\\?${name}:${targetPart}\\[(|(?:${CC_ANY})*?(?<!\\\\))\\]`)
      )
    }
    return InlineMacroProcessor.rxCache.get(key)
  }
}
InlineMacroProcessor.DSL = InlineMacroProcessorDsl

// ── Extension proxy objects ───────────────────────────────────────────────────

// Public: A proxy that encapsulates the extension kind, config, and instance.
// This is what gets stored in the extension registry when activated.
export class Extension {
  constructor (kind, instance, config) {
    this.kind = kind
    this.instance = instance
    this.config = config
  }
}

// Public: A specialisation of Extension that additionally stores a reference
// to the process method, accommodating both class-based processors and function blocks.
export class ProcessorExtension extends Extension {
  constructor (kind, instance, processMethod = null) {
    super(kind, instance, instance.config)
    this.processMethod = processMethod || ((...args) => instance.process(...args))
  }
}

// ── Group ─────────────────────────────────────────────────────────────────────

// Public: A Group registers one or more extensions with a Registry.
//
// Subclass Group and pass the subclass to Extensions.register(), or call
// the static register() method directly.
export class Group {
  static register (name = null) {
    Extensions.register(name, this)
  }

  activate (_registry) {
    throw new Error(`${this.constructor.name} must implement the activate method`)
  }
}

// ── Registry ──────────────────────────────────────────────────────────────────

// Internal: Maps kind name → document-processor class.
const DOCUMENT_PROCESSOR_CLASSES = {
  preprocessor:       Preprocessor,
  tree_processor:     TreeProcessor,
  postprocessor:      Postprocessor,
  include_processor:  IncludeProcessor,
  docinfo_processor:  DocinfoProcessor,
}

// Internal: Maps kind name → syntax-processor class.
const SYNTAX_PROCESSOR_CLASSES = {
  block:        BlockProcessor,
  block_macro:  BlockMacroProcessor,
  inline_macro: InlineMacroProcessor,
}

// Public: The primary entry point into the extension system.
//
// Registry holds the extensions which have been registered and activated, has
// methods for registering or defining a processor and looks up extensions
// stored in the registry during parsing.
export class Registry {
  // Public: Returns the Document on which extensions in this registry are used.
  // document

  // Public: Returns the plain Object of Group classes, instances, and/or
  // Functions that have been registered with this registry.
  // groups

  constructor (groups = {}) {
    this.groups = groups
    this._reset()
  }

  // Public: Activates all global extension Groups and the Groups associated
  // with this registry.
  //
  // document - The Document on which the extensions are to be used.
  //
  // Returns this Registry.
  activate (document) {
    if (this.document) this._reset()
    this.document = document
    const extGroups = [
      ...Object.values(Extensions.groups()),
      ...Object.values(this.groups),
    ]
    for (const group of extGroups) {
      if (typeof group === 'function') {
        // Check if it is a class (constructor) with an activate prototype method.
        if (group.prototype && typeof group.prototype.activate === 'function') {
          new group().activate(this)
        } else {
          // Plain function — call in the context of this registry (like instance_exec).
          group.length === 0 ? group.call(this) : group(this)
        }
      } else if (group && typeof group.activate === 'function') {
        group.activate(this)
      }
    }
    return this
  }

  // Public: Registers a Preprocessor with the extension registry.
  //
  // The processor may be:
  //   - A Preprocessor subclass (constructor function)
  //   - An instance of a Preprocessor subclass
  //   - A Function that configures the processor via the DSL (block style)
  //
  // Examples
  //
  //   // class style
  //   preprocessor(FrontMatterPreprocessor)
  //
  //   // instance style
  //   preprocessor(new FrontMatterPreprocessor())
  //
  //   // block style
  //   preprocessor(function () {
  //     this.process(function (doc, reader) { ... })
  //   })
  //
  // Returns the Extension stored in the registry that proxies this Preprocessor.
  preprocessor (...args) {
    return this._addDocumentProcessor('preprocessor', args)
  }

  // Public: Checks whether any Preprocessor extensions have been registered.
  preprocessors () { return this._preprocessor_extensions }
  hasPreprocessors () { return !!this._preprocessor_extensions }
  // Core API compatibility: expose extensions as a named property.
  get preprocessor_extensions () { return this._preprocessor_extensions }

  // Public: Registers a TreeProcessor with the extension registry.
  treeProcessor (...args) {
    return this._addDocumentProcessor('tree_processor', args)
  }

  // Aliases (deprecated names + snake_case for prefer() / Registry method dispatch).
  treeprocessor (...args) { return this.treeProcessor(...args) }
  tree_processor (...args) { return this.treeProcessor(...args) }

  treeProcessors () { return this._tree_processor_extensions }
  hasTreeProcessors () { return !!this._tree_processor_extensions }
  // hasTeeProcessors kept for backward compatibility (was a typo).
  hasTeeProcessors () { return !!this._tree_processor_extensions }
  treeprocessors () { return this._tree_processor_extensions }
  // Core API compatibility: expose extensions as a named property.
  get tree_processor_extensions () { return this._tree_processor_extensions }

  // Public: Registers a Postprocessor with the extension registry.
  postprocessor (...args) {
    return this._addDocumentProcessor('postprocessor', args)
  }

  postprocessors () { return this._postprocessor_extensions }
  hasPostprocessors () { return !!this._postprocessor_extensions }
  // Core API compatibility: expose extensions as a named property.
  get postprocessor_extensions () { return this._postprocessor_extensions }

  // Public: Registers an IncludeProcessor with the extension registry.
  includeProcessor (...args) {
    return this._addDocumentProcessor('include_processor', args)
  }

  includeProcessors () { return this._include_processor_extensions }
  hasIncludeProcessors () { return !!this._include_processor_extensions }
  include_processor (...args) { return this.includeProcessor(...args) }
  // Core API compatibility: expose extensions as a named property.
  get include_processor_extensions () { return this._include_processor_extensions }

  // Public: Registers a DocinfoProcessor with the extension registry.
  docinfoProcessor (...args) {
    return this._addDocumentProcessor('docinfo_processor', args)
  }

  // Public: Checks whether any DocinfoProcessor extensions have been registered.
  //
  // location - Optional String ('head' or 'footer') to filter by location.
  //
  // Returns a Boolean.
  hasDocinfoProcessors (location = null) {
    if (!this._docinfo_processor_extensions) return false
    if (location) {
      return this._docinfo_processor_extensions.some(ext => ext.config.location === location)
    }
    return true
  }

  // Public: Retrieves Extension proxy objects for DocinfoProcessor instances.
  //
  // location - Optional String ('head' or 'footer') to filter by location.
  //
  // Returns an Array of Extension proxy objects.
  docinfoProcessors (location = null) {
    if (!this._docinfo_processor_extensions) return []
    if (location) {
      return this._docinfo_processor_extensions.filter(ext => ext.config.location === location)
    }
    return this._docinfo_processor_extensions
  }

  docinfo_processor (...args) { return this.docinfoProcessor(...args) }
  // Core API compatibility: expose extensions as a named property.
  get docinfo_processor_extensions () { return this._docinfo_processor_extensions }

  // Public: Registers a BlockProcessor with the extension registry.
  //
  // Examples
  //
  //   // class style
  //   block(ShoutBlock)
  //
  //   // class style with explicit name
  //   block(ShoutBlock, 'shout')
  //
  //   // block style
  //   block(function () {
  //     this.named('shout')
  //     this.process(function (parent, reader, attrs) { ... })
  //   })
  //
  //   // block style with explicit name
  //   block('shout', function () {
  //     this.process(function (parent, reader, attrs) { ... })
  //   })
  //
  // Returns an Extension proxy object.
  block (...args) {
    return this._addSyntaxProcessor('block', args)
  }

  // Public: Checks whether any BlockProcessor extensions have been registered.
  hasBlocks () { return !!this._block_extensions }

  // Public: Checks whether a BlockProcessor is registered for the given name and context.
  //
  // Returns the Extension proxy or false.
  registeredForBlock (name, context) {
    const ext = this._block_extensions?.[String(name)]
    return ext ? (ext.config.contexts.has(context) && ext) : false
  }

  // Public: Retrieves the Extension proxy for the BlockProcessor registered with name.
  findBlockExtension (name) {
    return this._block_extensions?.[String(name)] ?? null
  }

  // Public: Registers a BlockMacroProcessor with the extension registry.
  blockMacro (...args) {
    return this._addSyntaxProcessor('block_macro', args)
  }

  // Alias deprecated method name.
  block_macro (...args) { return this.blockMacro(...args) }

  hasBlockMacros () { return !!this._block_macro_extensions }

  // Public: Checks whether a BlockMacroProcessor is registered for the given name.
  registeredForBlockMacro (name) {
    return this._block_macro_extensions?.[String(name)] || false
  }

  findBlockMacroExtension (name) {
    return this._block_macro_extensions?.[String(name)] ?? null
  }

  // Public: Registers an InlineMacroProcessor with the extension registry.
  inlineMacro (...args) {
    return this._addSyntaxProcessor('inline_macro', args)
  }

  // Alias deprecated method name.
  inline_macro (...args) { return this.inlineMacro(...args) }

  hasInlineMacros () { return !!this._inline_macro_extensions }

  // Public: Checks whether an InlineMacroProcessor is registered for the given name.
  registeredForInlineMacro (name) {
    return this._inline_macro_extensions?.[String(name)] || false
  }

  findInlineMacroExtension (name) {
    return this._inline_macro_extensions?.[String(name)] ?? null
  }

  // Public: Retrieves all InlineMacroProcessor Extension proxy objects.
  inlineMacros () {
    return this._inline_macro_extensions ? Object.values(this._inline_macro_extensions) : []
  }

  // Public: Inserts the document-processor Extension as the first of its kind
  // in the extension registry.
  //
  // Examples
  //
  //   registry.prefer('includeProcessor', function () {
  //     this.process(function (document, reader, target, attrs) { ... })
  //   })
  //
  // Returns the Extension stored in the registry.
  prefer (...args) {
    const arg0 = args.shift()
    let extension
    if (arg0 instanceof ProcessorExtension) {
      extension = arg0
    } else {
      // arg0 is a method name; remaining args include the processor and optional block.
      extension = this[arg0](...args)
    }
    const storeKey = `_${extension.kind}_extensions`
    const store = this[storeKey]
    if (Array.isArray(store)) {
      const idx = store.indexOf(extension)
      if (idx > -1) store.splice(idx, 1)
      store.unshift(extension)
    }
    return extension
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  _addDocumentProcessor (kind, args) {
    const kindName = kind.replace(/_/g, ' ')
    const kindClass = DOCUMENT_PROCESSOR_CLASSES[kind]
    if (!this[`_${kind}_extensions`]) this[`_${kind}_extensions`] = []
    const store = this[`_${kind}_extensions`]

    // Detect block style: last argument is a function that is NOT a class constructor.
    // Class constructors (ES6 classes) have a non-writable prototype descriptor;
    // plain functions (used as DSL blocks) have a writable prototype.
    const lastArg = args[args.length - 1]
    const hasBlock = args.length > 0 && typeof lastArg === 'function'
      && !!(Object.getOwnPropertyDescriptor(lastArg, 'prototype')?.writable ?? true)

    let processorInstance

    if (hasBlock) {
      const block = args.pop()
      const config = this._resolveArgs(args, 1)
      const processor = new kindClass(config)
      Object.assign(processor, kindClass.DSL)
      block.length === 0 ? block.call(processor) : block(processor)
      if (!processor.processBlockGiven()) {
        throw new Error(`No block specified to process ${kindName} extension`)
      }
      processorInstance = processor
    } else {
      const [processorArg, config] = this._resolveArgs(args, 2)
      if (typeof processorArg === 'function') {
        // Style 2: class constructor
        if (!(processorArg.prototype instanceof kindClass)) {
          throw new Error(`Invalid type for ${kindName} extension: ${processorArg}`)
        }
        processorInstance = new processorArg(config)
      } else if (processorArg instanceof kindClass) {
        // Style 3: already an instance
        processorArg.updateConfig(config)
        processorInstance = processorArg
      } else {
        throw new Error(`Invalid arguments specified for registering ${kindName} extension: ${args}`)
      }
    }

    // Apply legacy handles adapter for IncludeProcessors with arity-1 handles method.
    if (kind === 'include_processor') {
      const handlesFn = processorInstance.handles
      if (typeof handlesFn === 'function' && handlesFn.length === 1) {
        const original = handlesFn.bind(processorInstance)
        processorInstance.handles = (_doc, target) => original(target)
      }
    }

    const extension = new ProcessorExtension(kind, processorInstance)
    extension.config.position === '>>' ? store.unshift(extension) : store.push(extension)
    return extension
  }

  _addSyntaxProcessor (kind, args) {
    const kindName = kind.replace(/_/g, ' ')
    const kindClass = SYNTAX_PROCESSOR_CLASSES[kind]
    if (!this[`_${kind}_extensions`]) this[`_${kind}_extensions`] = Object.create(null)
    const store = this[`_${kind}_extensions`]

    // Detect block style (same heuristic as _addDocumentProcessor).
    const lastArg = args[args.length - 1]
    const hasBlock = args.length > 0 && typeof lastArg === 'function'
      && !!(Object.getOwnPropertyDescriptor(lastArg, 'prototype')?.writable ?? true)

    let processorInstance, name

    if (hasBlock) {
      const block = args.pop()
      const [nameArg, config] = this._resolveArgs(args, 2)
      const processor = new kindClass(this._asSymbol(nameArg), config)
      Object.assign(processor, kindClass.DSL)
      block.length === 0 ? block.call(processor) : block(processor)
      name = this._asSymbol(processor.name)
      if (!name) throw new Error(`No name specified for ${kindName} extension`)
      if (!processor.processBlockGiven()) {
        throw new Error(`No block specified to process ${kindName} extension`)
      }
      processorInstance = processor
    } else {
      const [processorArg, nameArg, config] = this._resolveArgs(args, 3)
      if (typeof processorArg === 'function') {
        // Style 2: class constructor
        if (!(processorArg.prototype instanceof kindClass)) {
          throw new Error(
            `Class specified for ${kindName} extension does not inherit from ${kindClass.name}: ${processorArg}`
          )
        }
        processorInstance = new processorArg(this._asSymbol(nameArg), config)
        name = this._asSymbol(processorInstance.name)
        if (!name) throw new Error(`No name specified for ${kindName} extension: ${processorArg}`)
      } else if (processorArg instanceof kindClass) {
        // Style 3: already an instance
        processorArg.updateConfig(config)
        name = nameArg
          ? (processorArg.name = this._asSymbol(nameArg))
          : this._asSymbol(processorArg.name)
        if (!name) throw new Error(`No name specified for ${kindName} extension: ${processorArg}`)
        processorInstance = processorArg
      } else {
        throw new Error(`Invalid arguments specified for registering ${kindName} extension: ${args}`)
      }
    }

    store[name] = new ProcessorExtension(kind, processorInstance)
    return store[name]
  }

  _reset () {
    this._preprocessor_extensions      = null
    this._tree_processor_extensions    = null
    this._postprocessor_extensions     = null
    this._include_processor_extensions = null
    this._docinfo_processor_extensions = null
    this._block_extensions             = null
    this._block_macro_extensions       = null
    this._inline_macro_extensions      = null
    this.document                      = null
  }

  // Internal: Normalise an args array to the expected number of values.
  //
  // Pops a trailing plain-object as options (or uses {}), then pads / trims
  // the remaining args to (expect - 1) elements, then appends the options object.
  // If expect === 1, returns just the options object.
  _resolveArgs (args, expect) {
    const last = args[args.length - 1]
    const opts = (
      args.length > 0
      && last !== null
      && typeof last === 'object'
      && !Array.isArray(last)
      && !(last instanceof Processor)
    ) ? args.pop() : {}

    if (expect === 1) return opts

    const missing = expect - 1 - args.length
    if (missing > 0) {
      for (let i = 0; i < missing; i++) args.push(undefined)
    } else if (missing < 0) {
      args.splice(args.length + missing, -missing)
    }
    args.push(opts)
    return args
  }

  _asSymbol (name) {
    return name != null ? String(name) : null
  }
}

// ── Extensions module namespace ───────────────────────────────────────────────

// Module-level state (mirrors Ruby module instance variables @auto_id / @groups).
let _autoId = -1
const _groups = Object.create(null)

// Public: The primary entry point for registering extensions globally.
//
// Mirrors the class-level methods on the Ruby Asciidoctor::Extensions module.
export const Extensions = {
  // Internal: Generate a unique name for an anonymous extension group.
  generateName () {
    return `extgrp${this.nextAutoId()}`
  },

  nextAutoId () {
    return ++_autoId
  },

  // Public: Returns the plain Object that maps names to registered groups.
  groups () {
    return _groups
  },

  // Public: Creates a new Registry, optionally pre-populated with a named block.
  //
  // name  - Optional String name for the group (default: auto-generated).
  // block - Optional Function to register as the group.
  //
  // Returns a Registry.
  create (name = null, block = null) {
    if (block) {
      return new Registry({ [name || this.generateName()]: block })
    }
    return new Registry()
  },

  // Public: Registers an extension Group that subsequently registers extensions.
  //
  // name  - Optional String or Symbol name under which to register (default: auto-generated).
  // group - A Function (proc-style), a class constructor with an activate() method,
  //         or an instance with an activate() method.
  //
  // Examples
  //
  //   Extensions.register(UmlExtensions)
  //   Extensions.register('uml', UmlExtensions)
  //   Extensions.register(function () { this.blockMacro('plantuml', PlantUmlBlock) })
  //   Extensions.register('uml', function () { this.blockMacro('plantuml', PlantUmlBlock) })
  //
  // Returns the registered group.
  register (...args) {
    const argc = args.length
    if (argc === 0) throw new Error('Extension group to register not specified')
    const group = args.pop()
    if (!group) throw new Error('Extension group to register not specified')
    const name = args.pop() ?? this.generateName()
    if (args.length > 0) throw new Error(`Wrong number of arguments (${argc} for 1..2)`)
    _groups[String(name)] = group
    return group
  },

  // Public: Unregister all statically-registered extension groups.
  unregisterAll () {
    for (const key of Object.keys(_groups)) delete _groups[key]
  },

  // Public: Unregister statically-registered extension groups by name.
  //
  // names - One or more String or Symbol group names to unregister.
  unregister (...names) {
    for (const name of names) delete _groups[String(name)]
  },

  // ── Processor factory helpers (mirrors core API) ─────────────────────────────
  //
  // Each pair: create<Kind>(name?, functions) → class constructor
  //            new<Kind>(name?, functions)    → instance of that class
  //
  // The `name` argument is optional; if omitted the sole argument is `functions`.

  _buildProcessorClass (BaseClass, name, functions) {
    if (arguments.length === 2) { functions = name; name = null }
    const klass = class extends BaseClass {}
    if (name) Object.defineProperty(klass, 'name', { value: name })
    Object.assign(klass.prototype, functions)
    return klass
  },

  createPreprocessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(Preprocessor, name, functions)
  },
  newPreprocessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createPreprocessor(name, functions))()
  },

  createTreeProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(TreeProcessor, name, functions)
  },
  newTreeProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createTreeProcessor(name, functions))()
  },

  createPostprocessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(Postprocessor, name, functions)
  },
  newPostprocessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createPostprocessor(name, functions))()
  },

  createIncludeProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(IncludeProcessor, name, functions)
  },
  newIncludeProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createIncludeProcessor(name, functions))()
  },

  createDocinfoProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(DocinfoProcessor, name, functions)
  },
  newDocinfoProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createDocinfoProcessor(name, functions))()
  },

  createBlockProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(BlockProcessor, name, functions)
  },
  newBlockProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createBlockProcessor(name, functions))()
  },

  createInlineMacroProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(InlineMacroProcessor, name, functions)
  },
  newInlineMacroProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createInlineMacroProcessor(name, functions))()
  },

  createBlockMacroProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return this._buildProcessorClass(BlockMacroProcessor, name, functions)
  },
  newBlockMacroProcessor (name, functions) {
    if (arguments.length === 1) { functions = name; name = null }
    return new (this.createBlockMacroProcessor(name, functions))()
  },
}