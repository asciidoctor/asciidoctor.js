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
//   - Config option keys (contentModel, positionalAttrs, defaultAttrs) use
//     camelCase, matching normal JS style. The legacy snake_case Ruby-style
//     keys (content_model, positional_attrs, pos_attrs, default_attrs) are
//     still accepted when a user declares a static config object directly,
//     for backward compatibility — see normalizeLegacyConfigAliases().
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

// Type-only imports for JSDoc
/**
 * @typedef {import('./document.js').Document} Document
 * @typedef {import('./abstract_block.js').AbstractBlock} AbstractBlock
 * @typedef {import('./reader.js').PreprocessorReader} PreprocessorReader
 */

// ── DSL interface types ───────────────────────────────────────────────────────

/**
 * DSL interface for configuring a {@link Processor} instance.
 * Applied to a processor instance via `Object.assign(instance, DslMixin)`.
 *
 * The `process` property behaves as a setter when called with a single Function
 * argument (stores the process block), or as a passthrough caller otherwise.
 *
 * @typedef {object} ProcessorDslInterface
 * @property {(key: string, value: unknown) => void} option - Set a config option.
 * @property {(fn: (...args: unknown[]) => unknown) => void} process - Register the process function.
 * @property {() => boolean} processBlockGiven - Returns true if a process function has been registered.
 */

/**
 * DSL interface for document processors (Preprocessor, TreeProcessor, Postprocessor, DocinfoProcessor).
 *
 * @typedef {ProcessorDslInterface & { prefer(): void; prepend(): void }} DocumentProcessorDslInterface
 */

/**
 * DSL interface for preprocessors.
 *
 * @typedef {Omit<DocumentProcessorDslInterface, 'process'> & {
 *   process(fn: (this: PreprocessorDslInterface, document: Document, reader: PreprocessorReader) => Reader | void): void;
 * }} PreprocessorDslInterface
 */

/**
 * DSL interface for tree processors.
 *
 * @typedef {Omit<DocumentProcessorDslInterface, 'process'> & {
 *   process(fn: (this: TreeProcessorDslInterface, document: Document) => Document | void): void;
 * }} TreeProcessorDslInterface
 */

/**
 * DSL interface for postprocessors.
 *
 * @typedef {Omit<DocumentProcessorDslInterface, 'process'> & {
 *   process(fn: (this: PostprocessorDslInterface, document: Document, output: string) => string): void;
 * }} PostprocessorDslInterface
 */

/**
 * DSL interface for syntax processors (BlockProcessor, BlockMacroProcessor, InlineMacroProcessor).
 *
 * @typedef {ProcessorDslInterface & {
 *   named(value: string): void;
 *   contentModel(value: string): void;
 *   parseContentAs(value: string): void;
 *   positionalAttributes(...value: string[]): void;
 *   namePositionalAttributes(...value: string[]): void;
 *   positionalAttrs(...value: string[]): void;
 *   defaultAttributes(value: Record<string, string>): void;
 *   defaultAttrs(value: Record<string, string>): void;
 *   resolveAttributes(...args: unknown[]): void;
 *   resolvesAttributes(...args: unknown[]): void;
 * }} SyntaxProcessorDslInterface
 */

/**
 * DSL interface for include processors.
 *
 * @typedef {Omit<DocumentProcessorDslInterface, 'process'> & {
 *   handles(fn: (target: string) => boolean): void;
 *   handles(fn: (doc: Document, target: string) => boolean): void;
 *   process(fn: (this: IncludeProcessorDslInterface, document: Document, reader: PreprocessorReader, target: string, attributes: Record<string, string>) => void): void;
 * }} IncludeProcessorDslInterface
 */

/**
 * DSL interface for docinfo processors.
 *
 * @typedef {Omit<DocumentProcessorDslInterface, 'process'> & {
 *   atLocation(value: string): void;
 *   process(fn: (this: DocinfoProcessorDslInterface, document: Document) => string): void;
 * }} DocinfoProcessorDslInterface
 */

/**
 * DSL interface for block processors.
 *
 * The `process` callback is bound to the processor instance, so `this` inside it
 * (and inside the registration function) exposes the `createBlock` helpers.
 *
 * @typedef {Omit<SyntaxProcessorDslInterface, 'process'> & {
 *   contexts(...value: (string | string[])[]): void;
 *   onContexts(...value: (string | string[])[]): void;
 *   onContext(...value: (string | string[])[]): void;
 *   bindTo(...value: (string | string[])[]): void;
 *   createBlock(parent: AbstractBlock, context: string, source?: string | string[] | null, attrs?: object, opts?: object): Block;
 *   process(fn: (this: BlockProcessorDslInterface, parent: AbstractBlock, reader: Reader, attributes: Record<string, unknown>) => AbstractBlock | void): void;
 * }} BlockProcessorDslInterface
 */

/**
 * DSL interface for macro processors (block and inline macros).
 *
 * @typedef {SyntaxProcessorDslInterface} MacroProcessorDslInterface
 */

/**
 * DSL interface for block macro processors.
 *
 * The `process` callback is bound to the processor instance, so `this` inside it
 * (and inside the registration function) exposes the `createBlock` helpers.
 *
 * @typedef {Omit<MacroProcessorDslInterface, 'process'> & {
 *   createBlock(parent: AbstractBlock, context: string, source?: string | string[] | null, attrs?: object, opts?: object): Block;
 *   process(fn: (this: BlockMacroProcessorDslInterface, parent: AbstractBlock, target: string, attributes: Record<string, unknown>) => AbstractBlock | void): void;
 * }} BlockMacroProcessorDslInterface
 */

/**
 * DSL interface for inline macro processors.
 *
 * The `process` callback is bound to the processor instance, so `this` inside it
 * (and inside the registration function) exposes the `createInline` helper.
 *
 * @typedef {Omit<MacroProcessorDslInterface, 'process'> & {
 *   format(value: string): void;
 *   matchFormat(value: string): void;
 *   usingFormat(value: string): void;
 *   match(value: RegExp): void;
 *   createInline(parent: AbstractBlock, context: string, text: string, opts?: object): Inline;
 *   process(fn: (this: InlineMacroProcessorDslInterface, parent: AbstractBlock, target: string, attributes: Record<string, unknown>) => Inline | void): void;
 * }} InlineMacroProcessorDslInterface
 */

// ── DSL Mixins ────────────────────────────────────────────────────────────────

/**
 * @internal Builder DSL mixin for configuring a Processor instance.
 * Applied to a processor instance via Object.assign(instance, DslMixin).
 *
 * The process() method has dual behaviour (mirrors Ruby's block / no-block):
 *   - Called with a single Function argument → stores it as the process block.
 *   - Called with non-Function arguments   → invokes the stored process block.
 *
 * The `this` context inside a stored process function is bound to the processor
 * instance at definition time.
 */
export const ProcessorDsl = {
  option(key, value) {
    this.config[key] = value
  },

  process(...args) {
    if (args.length === 1 && typeof args[0] === 'function') {
      this._processBlock = args[0].bind(this)
    } else if (this._processBlock !== undefined) {
      return this._processBlock(...args)
    } else {
      throw new Error(
        `${this.constructor.name} #process method called before being registered`
      )
    }
  },

  processBlockGiven() {
    return this._processBlock !== undefined
  },
}

export const DocumentProcessorDsl = {
  ...ProcessorDsl,

  prefer() {
    this.option('position', '>>')
  },

  /** Alias for {@link prefer}. */
  prepend() {
    this.prefer()
  },
}

export const SyntaxProcessorDsl = {
  ...ProcessorDsl,

  named(value) {
    // When applied to a processor instance, set the name directly.
    // When applied to a class (via static enableDsl), store in config.
    if (this instanceof Processor) {
      this.name = value
    } else {
      this.option('name', value)
    }
  },

  contentModel(value) {
    this.option('contentModel', value)
  },

  /** Alias for {@link contentModel}. */
  parseContentAs(value) {
    this.option('contentModel', value)
  },

  positionalAttributes(...value) {
    this.option('positionalAttrs', value.flat().map(String))
  },

  /** Alias for {@link positionalAttributes}. */
  namePositionalAttributes(...value) {
    this.option('positionalAttrs', value.flat().map(String))
  },

  positionalAttrs(...value) {
    this.option('positionalAttrs', value.flat().map(String))
  },

  defaultAttributes(value) {
    this.option('defaultAttrs', value)
  },

  /** @deprecated Alias for {@link defaultAttributes}. */
  defaultAttrs(value) {
    this.option('defaultAttrs', value)
  },

  /**
   * Resolve and register positional attribute names and default values.
   *
   * Accepts any of:
   *   resolveAttributes()             → positionalAttrs: [], defaultAttrs: {}
   *   resolveAttributes('foo', 'bar') → positional maps (Array-style)
   *   resolveAttributes({...})        → positional maps (Object-style)
   *
   * Array-style tokens understand positional-index notation (e.g. '1:name',
   * '@:name') and default-value notation (e.g. 'name=value', '1:name=value').
   *
   * @param {...*} args - Positional attribute specifications.
   */
  resolveAttributes(...args) {
    // Normalise: if 0 or 1 argument given, unwrap into a single value.
    if (args.length <= 1) {
      const first = args.length === 0 ? true : args[0]
      if (typeof first === 'string' || typeof first === 'symbol') {
        args = [first]
      } else {
        args = first // true, Array, or plain Object
      }
    }

    if (args === true) {
      this.option('positionalAttrs', [])
      this.option('defaultAttrs', {})
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
      this.option(
        'positionalAttrs',
        names.filter((n) => n != null)
      )
      this.option('defaultAttrs', defaults)
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
      this.option(
        'positionalAttrs',
        names.filter((n) => n != null)
      )
      this.option('defaultAttrs', defaults)
    } else {
      throw new Error(`unsupported attributes specification for macro: ${args}`)
    }
  },

  /** @deprecated Alias for {@link resolveAttributes}. */
  resolvesAttributes(...args) {
    this.resolveAttributes(...args)
  },
}

export const IncludeProcessorDsl = {
  ...DocumentProcessorDsl,

  /**
   * @overload
   * @param {(target: string) => boolean} fn - Predicate that receives only the include target.
   * @returns {void}
   */
  /**
   * @overload
   * @param {(doc: Document, target: string) => boolean} fn - Predicate that receives the document and the include target.
   * @returns {void}
   */
  /**
   * @overload
   * @param {Document} doc - The document being parsed.
   * @param {string} target - The include target.
   * @returns {boolean}
   */
  /**
   * Register a function that decides whether this include processor handles a given target,
   * or invoke the registered handler.
   *
   * **Setter form** — register a predicate. The callback may accept either just the target
   * string (arity 1) or both the document and the target string (arity 2).
   *
   * **Invoker form** — call the registered predicate with `(doc, target)` and return its
   * result, or return `true` if no predicate has been registered.
   *
   * @param {...*} args
   * @returns {boolean | void}
   */
  handles(...args) {
    if (args.length === 1 && typeof args[0] === 'function') {
      const fn = args[0]
      // Normalise arity-1 handle blocks to accept (doc, target)
      this._handlesBlock =
        fn.length === 1 ? (_doc, target) => fn(target) : fn.bind(this)
    } else if (this._handlesBlock !== undefined) {
      return this._handlesBlock(args[0], args[1])
    } else {
      return true
    }
  },
}

export const DocinfoProcessorDsl = {
  ...DocumentProcessorDsl,

  atLocation(value) {
    this.option('location', value)
  },
}

export const BlockProcessorDsl = {
  ...SyntaxProcessorDsl,

  contexts(...value) {
    this.option('contexts', new Set(value.flat()))
  },

  // aliases
  onContexts(...value) {
    this.contexts(...value)
  },
  onContext(...value) {
    this.contexts(...value)
  },
  bindTo(...value) {
    this.contexts(...value)
  },
}

export const MacroProcessorDsl = {
  ...SyntaxProcessorDsl,

  /**
   * Override: passing a falsy value sets contentModel to 'text' instead of
   * configuring positional attributes.
   *
   * @param {...*} args - Positional attribute specifications.
   */
  resolveAttributes(...args) {
    if (args.length === 1 && !args[0]) {
      this.option('contentModel', 'text')
    } else {
      SyntaxProcessorDsl.resolveAttributes.call(this, ...args)
      this.option('contentModel', 'attributes')
    }
  },

  /** @deprecated Alias for {@link resolveAttributes}. */
  resolvesAttributes(...args) {
    this.resolveAttributes(...args)
  },
}

export const InlineMacroProcessorDsl = {
  ...MacroProcessorDsl,

  format(value) {
    this.option('format', value)
  },

  /** Alias for {@link format}. */
  matchFormat(value) {
    this.option('format', value)
  },
  /** @deprecated Alias for {@link format}. */
  usingFormat(value) {
    this.option('format', value)
  },

  match(value) {
    this.option('regexp', value)
  },
}

// ── Processor ────────────────────────────────────────────────────────────────

/**
 * Legacy Ruby-style snake_case config keys, mapped to the camelCase keys
 * actually read by the parser/substitutor. Only consulted when a processor
 * is declared with a raw static config object (e.g. `static config = {
 * content_model: 'attributes' }`) that bypasses the DSL setters, which
 * already write camelCase directly.
 */
const LEGACY_CONFIG_ALIASES = {
  content_model: 'contentModel',
  positional_attrs: 'positionalAttrs',
  pos_attrs: 'positionalAttrs',
  default_attrs: 'defaultAttrs',
}

/** @internal Fill in camelCase config keys from their legacy snake_case alias. */
function normalizeLegacyConfigAliases(config) {
  for (const [legacyKey, key] of Object.entries(LEGACY_CONFIG_ALIASES)) {
    if (config[key] === undefined && config[legacyKey] !== undefined) {
      config[key] = config[legacyKey]
    }
  }
  return config
}

/**
 * Abstract base class for document and syntax processors.
 *
 * Provides a class-level config map (via static config / static option) and a
 * set of convenience factory methods for creating AST nodes.
 */
export class Processor {
  /**
   * Get the static configuration map for this processor class.
   * Uses hasOwnProperty to avoid inheriting a parent class's config object
   * through the prototype chain when a subclass first accesses config.
   *
   * @returns {object}
   */
  static get config() {
    if (!Object.hasOwn(this, '_config')) this._config = {}
    return this._config
  }

  /**
   * Replace the static configuration map for this processor class, e.g.
   * `ShoutBlock.config = { name: 'shout', contentModel: 'simple' }`.
   *
   * @param {object} value
   */
  static set config(value) {
    this._config = value
  }

  /**
   * Set a default option value for all instances of this processor class.
   *
   * @param {string} key - The option key.
   * @param {*} value - The option value.
   */
  static option(key, value) {
    this.config[key] = value
  }

  /**
   * Mix the DSL object for this processor class into its prototype.
   */
  static enableDsl() {
    const DSL = this.DSL
    if (DSL) Object.assign(this.prototype, DSL)
  }
  /** Alias for {@link enableDsl}. */
  static useDsl() {
    this.enableDsl()
  }

  constructor(config = {}) {
    this.config = normalizeLegacyConfigAliases({
      ...this.constructor.config,
      ...config,
    })
  }

  updateConfig(config) {
    Object.assign(this.config, config)
    normalizeLegacyConfigAliases(this.config)
  }

  process(..._args) {
    throw new Error(
      `${this.constructor.name} subclass must implement the process method`
    )
  }

  /**
   * Create a Section node in the same manner as the parser.
   *
   * @param {Section|Document} parent - The parent Section or Document of this new Section.
   * @param {string} title - The String title of the new Section.
   * @param {object} attrs - A plain object of attributes to control how the section is built.
   *   Use the style attribute to set the name of a special section (e.g. appendix).
   *   Use the id attribute to assign an explicit ID, or set it to false to
   *   disable automatic ID generation (when sectids document attribute is set).
   * @param {object} [opts={}] - An optional plain object of options:
   *   - level {number} - The Integer level to assign; defaults to parent.level + 1.
   *   - numbered {boolean} - Flag to force numbering.
   * @returns {Section} a Section node with all properties properly initialized.
   */
  createSection(parent, title, attrs, opts = {}) {
    const doc = parent.document
    const doctype = doc.doctype
    const book = doctype === 'book'
    const level = opts.level ?? parent.level + 1

    let sectname,
      special = false
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
      sectname = level === 0 ? 'part' : level > 1 ? 'section' : 'chapter'
    } else if (doctype === 'manpage' && title.toLowerCase() === 'synopsis') {
      sectname = 'synopsis'
      special = true
    } else {
      sectname = 'section'
    }

    // Re-derive level if style forced it (appendix/abstract style override)
    const effectiveLevel =
      style && book && style === 'abstract'
        ? 1
        : style && special && level === 0
          ? 1
          : level

    const sect = new Section(parent, effectiveLevel)
    sect.title = title
    sect.sectname = sectname

    if (special) {
      sect.special = true
      if ('numbered' in opts ? opts.numbered : style === 'appendix') {
        sect.numbered = true
      } else if (!('numbered' in opts) && doc.hasAttribute('sectnums', 'all')) {
        sect.numbered = book && effectiveLevel === 1 ? 'chapter' : true
      }
    } else if (effectiveLevel > 0) {
      if ('numbered' in opts ? opts.numbered : doc.hasAttribute('sectnums')) {
        sect.numbered = sect.special ? !!parent.numbered : true
      }
    } else if (
      'numbered' in opts ? opts.numbered : book && doc.hasAttribute('partnums')
    ) {
      sect.numbered = true
    }

    if (attrs.id === false) {
      delete attrs.id
    } else {
      sect.id = attrs.id =
        attrs.id ||
        (doc.hasAttribute('sectids')
          ? Section.generateId(sect.title, doc)
          : null)
    }
    sect.updateAttributes(attrs)
    return sect
  }

  /**
   * Create a generic block node and link it to the specified parent.
   *
   * @param {Block|Section} parent - The parent node.
   * @param {string} context - The block context (e.g. 'paragraph', 'listing').
   * @param {string|string[]|null} source - The source content.
   * @param {object} attrs - A plain object of attributes.
   * @param {object} [opts={}] - An optional plain object of options.
   * @returns {Block} a Block node with all properties properly initialized.
   */
  createBlock(parent, context, source, attrs, opts = {}) {
    return new Block(parent, context, { source, attributes: attrs, ...opts })
  }

  /**
   * Create a list node and link it to the specified parent.
   *
   * @param {Block|Section|Document} parent - The parent of this new list.
   * @param {string} context - The list context ('ulist', 'olist', 'colist', 'dlist').
   * @param {object|null} [attrs=null] - A plain object of attributes to set on this list block.
   * @returns {List} a List node with all properties properly initialized.
   */
  createList(parent, context, attrs = null) {
    const list = new List(parent, context)
    if (attrs) list.updateAttributes(attrs)
    return list
  }

  /**
   * Create a list item node and link it to the specified parent.
   *
   * @param {List} parent - The parent List of this new list item.
   * @param {string|null} [text=null] - The text of the list item.
   * @returns {ListItem} a ListItem node with all properties properly initialized.
   */
  createListItem(parent, text = null) {
    return new ListItem(parent, text)
  }

  /**
   * Create an image block node and link it to the specified parent.
   *
   * @param {Block|Section|Document} parent - The parent of this new image block.
   * @param {object} attrs - A plain object of attributes to control how the image block is built.
   *   The target attribute sets the image source; alt sets the alt text.
   * @param {object} [opts={}] - An optional plain object of options.
   * @returns {Block} a Block node with all properties properly initialized.
   */
  createImageBlock(parent, attrs, opts = {}) {
    const target = attrs.target
    if (!target)
      throw new Error(
        'Unable to create an image block, target attribute is required'
      )
    if (!attrs.alt)
      attrs.alt = attrs['default-alt'] = basename(target, true).replace(
        /[_-]/g,
        ' '
      )
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

  /**
   * Create an inline node and bind it to the specified parent.
   *
   * @param {Block} parent - The parent Block of this new inline node.
   * @param {string} context - The context of the inline node ('quoted', 'anchor', etc.).
   * @param {string} text - The text of the inline node.
   * @param {object} [opts={}] - An optional plain object of options:
   *   - type {string} - The subtype of the inline node context.
   *   - attributes {object} - Attributes to set on the inline node.
   * @returns {Inline} an Inline node with all properties properly initialized.
   */
  createInline(parent, context, text, opts = {}) {
    const options = context === 'quoted' ? { type: 'unquoted', ...opts } : opts
    return new Inline(parent, context, text, options)
  }

  /**
   * Parse blocks in the content and attach them to the parent.
   *
   * @param {Block|Section} parent - The parent node.
   * @param {string[]|Reader} content - Lines or a Reader.
   * @param {object|null} [attributes=null] - Attributes to pass to the parser.
   * @returns {Promise<Block|Section>} the parent node into which the blocks are parsed.
   */
  async parseContent(parent, content, attributes = null) {
    const reader = content instanceof Reader ? content : new Reader(content)
    await Parser.parseBlocks(reader, parent, attributes)
    return parent
  }

  /**
   * Parse the attrlist String into a plain object of attributes.
   *
   * @param {Block|Section} block - The current block (used for applying subs).
   * @param {string} attrlist - The list of attributes as a String.
   * @param {object} [opts={}] - An optional plain object of options:
   *   - positional_attributes {string[]} - Array of attribute names to map positional args to.
   *   - sub_attributes {boolean} - Enables attribute substitution on attrlist.
   * @returns {Promise<object>} a plain object of parsed attributes.
   */
  async parseAttributes(block, attrlist, opts = {}) {
    if (!attrlist || attrlist.length === 0) return {}
    if (opts.sub_attributes && attrlist.includes(ATTR_REF_HEAD)) {
      attrlist = block.subAttributes(attrlist)
    }
    return new AttributeList(attrlist).parse(opts.positional_attributes || [])
  }

  /** Shorthand for {@link createBlock} with context 'paragraph'. */
  createParagraph(parent, ...rest) {
    return this.createBlock(parent, 'paragraph', ...rest)
  }

  /** Shorthand for {@link createBlock} with context 'open'. */
  createOpenBlock(parent, ...rest) {
    return this.createBlock(parent, 'open', ...rest)
  }

  /** Shorthand for {@link createBlock} with context 'example'. */
  createExampleBlock(parent, ...rest) {
    return this.createBlock(parent, 'example', ...rest)
  }

  /** Shorthand for {@link createBlock} with context 'pass'. */
  createPassBlock(parent, ...rest) {
    return this.createBlock(parent, 'pass', ...rest)
  }

  /** Shorthand for {@link createBlock} with context 'listing'. */
  createListingBlock(parent, ...rest) {
    return this.createBlock(parent, 'listing', ...rest)
  }

  /** Shorthand for {@link createBlock} with context 'literal'. */
  createLiteralBlock(parent, ...rest) {
    return this.createBlock(parent, 'literal', ...rest)
  }

  /** Shorthand for {@link createInline} with context 'anchor'. */
  createAnchor(parent, ...rest) {
    return this.createInline(parent, 'anchor', ...rest)
  }

  /** Shorthand for {@link createInline} with context 'quoted'. */
  createInlinePass(parent, ...rest) {
    return this.createInline(parent, 'quoted', ...rest)
  }
}

// ── Document processors ───────────────────────────────────────────────────────

/**
 * Preprocessors are run after the source text is split into lines and
 * normalised, but before parsing begins.
 *
 * Asciidoctor passes the document and the document's Reader to the process
 * method of the Preprocessor instance. The Preprocessor can modify the Reader
 * as necessary and either return the same Reader (or falsy) or a substitute Reader.
 *
 * Implementations must extend Preprocessor and override {@link process}.
 *
 * @example
 * class CommentStripPreprocessor extends Preprocessor {
 *   process(document, reader) {
 *     const lines = reader.getLines().filter((l) => !l.startsWith('//'))
 *     reader.pushInclude(lines, null, null, 1, {})
 *     return reader
 *   }
 * }
 * // Register:
 * Extensions.register(function () { this.preprocessor(CommentStripPreprocessor) })
 */
export class Preprocessor extends Processor {
  /**
   * @param {Document} document - The document being parsed.
   * @param {PreprocessorReader} reader - The reader positioned at the beginning of the source.
   * @returns {Reader|undefined} The same or a substitute Reader, or undefined to use the original.
   */
  process(document, reader) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }
}
Preprocessor.DSL = DocumentProcessorDsl

/**
 * TreeProcessors are run on the Document after the source has been
 * parsed into an abstract syntax tree (AST).
 *
 * Implementations must extend TreeProcessor and override {@link process}.
 *
 * @example
 * class ShoutTreeProcessor extends TreeProcessor {
 *   process(document) {
 *     for (const block of document.findBy({ context: 'paragraph' })) {
 *       block.source = block.source.toUpperCase()
 *     }
 *   }
 * }
 * Extensions.register(function () { this.treeProcessor(ShoutTreeProcessor) })
 */
export class TreeProcessor extends Processor {
  /**
   * @param {Document} document - The parsed document.
   * @returns {void}
   */
  process(document) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }
}
TreeProcessor.DSL = DocumentProcessorDsl

/** @deprecated Alias for {@link TreeProcessor} kept for backwards compatibility. */
export const Treeprocessor = TreeProcessor

/**
 * Postprocessors are run after the document is converted, but before
 * it is written to the output stream.
 *
 * The `process` method receives the document and the converted output string, and
 * must return the (possibly modified) output string.
 *
 * Implementations must extend Postprocessor and override {@link process}.
 *
 * @example
 * class FooterPostprocessor extends Postprocessor {
 *   process(document, output) {
 *     return output.replace('</body>', '<footer>Generated by Acme</footer></body>')
 *   }
 * }
 * Extensions.register(function () { this.postprocessor(FooterPostprocessor) })
 */
export class Postprocessor extends Processor {
  /**
   * @param {Document} document - The converted document.
   * @param {string} output - The converted output string.
   * @returns {string} The (possibly modified) output string.
   */
  process(document, output) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }
}
Postprocessor.DSL = DocumentProcessorDsl

/**
 * IncludeProcessors handle include::<target>[] directives.
 *
 * Implementations must extend IncludeProcessor.
 */
export class IncludeProcessor extends Processor {
  /**
   * @param {Document} document - The document being parsed.
   * @param {PreprocessorReader} reader - The reader for the including document.
   * @param {string} target - The target of the include directive.
   * @param {Record<string, string>} attributes - The parsed include attributes.
   * @returns {void}
   */
  process(document, reader, target, attributes) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }

  /**
   * Decide whether this include processor handles the given target.
   *
   * Override this method in a subclass. The override may accept either just the
   * target string (Ruby-style, arity 1) or both the document and the target
   * (arity 2) — an arity-1 override is adapted at registration time so the
   * parser can always invoke it as `handles(doc, target)`. The first parameter
   * is therefore typed `Document | string` so both override shapes type-check.
   *
   * @param {Document|string} doc - The document being parsed, or (for a Ruby-style arity-1 override) the include target.
   * @param {string} target - The target of the include directive.
   * @returns {boolean} true if this processor handles the given target.
   */
  handles(doc, target) {
    return true
  }
}
IncludeProcessor.DSL = IncludeProcessorDsl

/**
 * DocinfoProcessors add additional content to the header and/or footer
 * of the generated document.
 *
 * Implementations must extend DocinfoProcessor.
 */
export class DocinfoProcessor extends Processor {
  constructor(config = {}) {
    super(config)
    this.config.location ??= 'head'
  }

  /**
   * @param {Document} document - The document being converted.
   * @returns {string} The docinfo content to inject into the document.
   */
  process(document) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }
}
DocinfoProcessor.DSL = DocinfoProcessorDsl

// ── Syntax processors ─────────────────────────────────────────────────────────

/**
 * BlockProcessors handle delimited blocks and paragraphs with a custom name.
 *
 * The `process(parent, reader, attributes)` method receives:
 * - `parent` {AbstractBlock} — the enclosing block
 * - `reader` {Reader} — positioned at the block content
 * - `attributes` {Object} — parsed block attributes
 *
 * It must return a block node (created with `this.createBlock(...)`, etc.)
 * or call `this.parseContent(parent, reader)` to delegate parsing.
 *
 * Use the static `config` object or the DSL helpers (`contexts()`,
 * `contentModel()`, `resolveAttributes()`, …) to declare the block's behaviour
 * before registering.
 *
 * Implementations must extend BlockProcessor and override {@link process}.
 *
 * @example <caption>Custom delimited block that wraps content in a div</caption>
 * class ShoutBlock extends BlockProcessor {
 *   static config = { name: 'shout', contexts: ['paragraph'], contentModel: 'simple' }
 *   process(parent, reader, attrs) {
 *     const block = this.createBlock(parent, 'paragraph', reader.readLines().join('\n').toUpperCase(), attrs)
 *     return block
 *   }
 * }
 * Extensions.register(function () { this.block(ShoutBlock) })
 * // AsciiDoc usage: [shout]\nHello world
 */
export class BlockProcessor extends Processor {
  constructor(name = null, config = {}) {
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

    this.config.contentModel ??= 'compound'
  }

  /**
   * @param {AbstractBlock} parent - The enclosing block.
   * @param {Reader} reader - The reader positioned at the block content.
   * @param {Record<string, unknown>} attributes - The parsed block attributes.
   * @returns {Block|void} A block node, or void to let the parser handle it.
   */
  process(parent, reader, attributes) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }
}
BlockProcessor.DSL = BlockProcessorDsl

/**
 * Base class shared by BlockMacroProcessor and InlineMacroProcessor.
 */
export class MacroProcessor extends Processor {
  constructor(name = null, config = {}) {
    super(config)
    this.name = name || this.config.name || null
    this.config.contentModel ??= 'attributes'
  }

  /**
   * @param {AbstractBlock} parent - The enclosing block.
   * @param {string} target - The macro target (text between `name:` and `[`).
   * @param {Record<string, unknown>} attributes - The parsed macro attributes.
   * @returns {Block|Inline|void}
   */
  process(parent, target, attributes) {
    throw new Error(
      `${this.constructor.name} must implement the process method`
    )
  }
}

/**
 * BlockMacroProcessors handle block macros with a custom name.
 *
 * The `process(parent, target, attributes)` method receives:
 * - `parent` {AbstractBlock} — the enclosing block
 * - `target` {string} — the macro target (text between `name:` and `[`)
 * - `attributes` {Object} — parsed macro attributes
 *
 * It must return a block node created with one of the `createBlock`,
 * `createImage`, etc. helpers inherited from {@link Processor}.
 *
 * Implementations must extend BlockMacroProcessor and override {@link process}.
 *
 * @example <caption>Block macro that embeds a GitHub Gist</caption>
 * class GistBlockMacro extends BlockMacroProcessor {
 *   process(parent, target, attrs) {
 *     const html = `<script src="https://gist.github.com/${target}.js"></script>`
 *     return this.createBlock(parent, 'pass', html)
 *   }
 * }
 * GistBlockMacro.config = { name: 'gist' }
 * Extensions.register(function () { this.blockMacro(GistBlockMacro) })
 * // AsciiDoc usage: gist::abc123[]
 */
export class BlockMacroProcessor extends MacroProcessor {
  /**
   * Get the name, validating the format.
   * The setter stores without validation to avoid throwing during construction.
   */
  get name() {
    if (this._name != null && !MacroNameRx.test(String(this._name))) {
      throw new Error(`invalid name for block macro: ${this._name}`)
    }
    return this._name
  }

  set name(value) {
    this._name = value
  }

  /**
   * @param {AbstractBlock} parent - The enclosing block.
   * @param {string} target - The macro target.
   * @param {Record<string, unknown>} attributes - The parsed macro attributes.
   * @returns {Block} A block node created with one of the `createBlock` helpers.
   */
  process(parent, target, attributes) {
    return super.process(parent, target, attributes)
  }
}
BlockMacroProcessor.DSL = MacroProcessorDsl

/**
 * InlineMacroProcessors handle inline macros with a custom name.
 *
 * The `process(parent, target, attributes)` method receives:
 * - `parent` {AbstractBlock} — the enclosing block
 * - `target` {string} — the macro target (text between `name:` and `[`)
 * - `attributes` {Object} — parsed macro attributes (first positional attr is `attributes[1]`)
 *
 * It must return an {@link Inline} node created with `this.createInline(parent, 'quoted', text, opts)`.
 *
 * By default the macro format is `'long'` (`name:target[attrs]`). Set
 * `config.format = 'short'` for a no-target form (`name:[attrs]`).
 *
 * Implementations must extend InlineMacroProcessor and override {@link process}.
 *
 * @example <caption>Inline macro that generates a keyboard shortcut span</caption>
 * class KbdInlineMacro extends InlineMacroProcessor {
 *   process(parent, target, attrs) {
 *     return this.createInline(parent, 'quoted', target, { type: 'monospaced' })
 *   }
 * }
 * KbdInlineMacro.config = { name: 'kbd', format: 'short' }
 * Extensions.register(function () { this.inlineMacro(KbdInlineMacro) })
 * // AsciiDoc usage: kbd:[Ctrl+C]
 */
export class InlineMacroProcessor extends MacroProcessor {
  static rxCache = new Map()

  /**
   * Look up (and memoize) the regexp for this inline macro processor.
   *
   * @returns {RegExp}
   */
  get regexp() {
    return (this.config.regexp ??= this.resolveRegexp(
      String(this.name),
      this.config.format
    ))
  }

  /**
   * @param {AbstractBlock} parent - The enclosing block.
   * @param {string} target - The macro target.
   * @param {Record<string, unknown>} attributes - The parsed macro attributes.
   * @returns {Inline} An Inline node created with `this.createInline(...)`.
   */
  process(parent, target, attributes) {
    return super.process(parent, target, attributes)
  }

  resolveRegexp(name, format) {
    if (!MacroNameRx.test(name)) {
      throw new Error(`invalid name for inline macro: ${name}`)
    }
    const key = `${name}:${format}`
    if (!InlineMacroProcessor.rxCache.has(key)) {
      const targetPart = format === 'short' ? '(){0}' : '(\\S+?)'
      InlineMacroProcessor.rxCache.set(
        key,
        new RegExp(
          `\\\\?${name}:${targetPart}\\[(|(?:${CC_ANY})*?(?<!\\\\))\\]`
        )
      )
    }
    return InlineMacroProcessor.rxCache.get(key)
  }
}
InlineMacroProcessor.DSL = InlineMacroProcessorDsl

// ── Extension proxy objects ───────────────────────────────────────────────────

/**
 * Proxy that encapsulates the extension kind, config, and instance.
 * This is what gets stored in the extension registry when activated.
 */
export class Extension {
  constructor(kind, instance, config) {
    this.kind = kind
    this.instance = instance
    this.config = config
  }
}

/**
 * Specialisation of Extension that additionally stores a reference
 * to the process method, accommodating both class-based processors and function blocks.
 */
export class ProcessorExtension extends Extension {
  constructor(kind, instance, processMethod = null) {
    super(kind, instance, instance.config)
    this.processMethod =
      processMethod || ((...args) => instance.process(...args))
    /** @internal */
    this._direct = false
  }
}

// ── Group ─────────────────────────────────────────────────────────────────────

/**
 * A Group bundles one or more extension registrations that are re-executed on
 * every document conversion, making the registry safe to reuse.
 *
 * Subclass Group, override {@link Group#activate}, and either call
 * {@link Group.register} to add it globally or pass the subclass to
 * {@link Extensions.create} / {@link Extensions.register}.
 *
 * @example
 * class MyGroup extends Group {
 *   activate (registry) {
 *     registry.preprocessor(MyPreprocessor)
 *   }
 * }
 * MyGroup.register()
 */
export class Group {
  /**
   * Register this Group class globally under the given name.
   *
   * Equivalent to calling `Extensions.register(name, this)`.
   *
   * @param {string|null} [name] - Optional name for the group.
   */
  static register(name = null) {
    Extensions.register(name, this)
  }

  /**
   * Called by {@link Registry#activate} on every document conversion.
   *
   * Override this method to register extensions with the provided registry.
   *
   * @param {Registry} _registry - The registry to register extensions with.
   */
  activate(_registry) {
    throw new Error(
      `${this.constructor.name} must implement the activate method`
    )
  }
}

// ── Registry ──────────────────────────────────────────────────────────────────

/** @internal Maps kind name → document-processor class. */
const DOCUMENT_PROCESSOR_CLASSES = {
  preprocessor: Preprocessor,
  tree_processor: TreeProcessor,
  postprocessor: Postprocessor,
  include_processor: IncludeProcessor,
  docinfo_processor: DocinfoProcessor,
}

/** @internal Maps kind name → syntax-processor class. */
const SYNTAX_PROCESSOR_CLASSES = {
  block: BlockProcessor,
  block_macro: BlockMacroProcessor,
  inline_macro: InlineMacroProcessor,
}

/**
 * The primary entry point into the extension system.
 *
 * Registry holds the extensions which have been registered and activated, has
 * methods for registering or defining a processor and looks up extensions
 * stored in the registry during parsing.
 *
 * A registry can be reused across multiple conversions. Extensions registered
 * via a group block (passed to {@link Extensions.create} or
 * {@link Extensions.register}) are re-executed on every activation. Extensions
 * registered directly on the registry instance (e.g. `registry.preprocessor(fn)`)
 * are preserved across activations.
 *
 * @example
 * const registry = Extensions.create('my-ext', function () {
 *   this.preprocessor(function () { ... })
 * })
 * // registry can be passed to multiple conversions safely
 */
export class Registry {
  constructor(groups = {}) {
    this.groups = groups
    /** @internal */
    this._activating = false
    this._reset()
  }

  /**
   * Activate all global extension Groups and the Groups associated with this registry.
   *
   * @param {Document} document - The Document on which the extensions are to be used.
   * @returns {Registry} this Registry.
   */
  activate(document) {
    if (this.document) this._reset()
    this.document = document
    const extGroups = [
      ...Object.values(Extensions.groups()),
      ...Object.values(this.groups),
    ]
    this._activating = true
    try {
      for (const group of extGroups) {
        if (typeof group === 'function') {
          // Check if it is a class (constructor) with an activate prototype method.
          if (
            group.prototype &&
            typeof group.prototype.activate === 'function'
          ) {
            new group().activate(this)
          } else {
            // Plain function — call in the context of this registry (like instance_exec).
            group.length === 0 ? group.call(this) : group(this)
          }
        } else if (group && typeof group.activate === 'function') {
          group.activate(this)
        }
      }
    } finally {
      this._activating = false
    }
    return this
  }

  /**
   * Register a Preprocessor with the extension registry.
   *
   * The processor may be:
   *   - A Preprocessor subclass (constructor function)
   *   - An instance of a Preprocessor subclass
   *   - A Function that configures the processor via the DSL (block style)
   *
   * @example
   * // class style
   * preprocessor(FrontMatterPreprocessor)
   * // instance style
   * preprocessor(new FrontMatterPreprocessor())
   * // block style
   * preprocessor(function () {
   *   this.process(function (doc, reader) { ... })
   * })
   *
   * @overload
   * @param {typeof Preprocessor} processor - A Preprocessor subclass.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {Preprocessor} processor - An already-constructed Preprocessor instance.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: PreprocessorDslInterface) => void} fn - Registration function bound to the preprocessor DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  preprocessor(...args) {
    return this._addDocumentProcessor('preprocessor', args)
  }

  /**
   * Return the registered Preprocessor extensions, or null if none.
   *
   * @returns {ProcessorExtension[]|null}
   */
  preprocessors() {
    return this._preprocessor_extensions
  }

  /**
   * Check whether any Preprocessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasPreprocessors() {
    return !!this._preprocessor_extensions
  }

  /** @internal Core API compatibility alias for preprocessors(). */
  get preprocessor_extensions() {
    return this._preprocessor_extensions
  }

  /**
   * Register a TreeProcessor with the extension registry.
   *
   * @overload
   * @param {typeof TreeProcessor} processor - A TreeProcessor subclass.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {TreeProcessor} processor - An already-constructed TreeProcessor instance.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: TreeProcessorDslInterface) => void} fn - Registration function bound to the tree processor DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  treeProcessor(...args) {
    return this._addDocumentProcessor('tree_processor', args)
  }

  /** @deprecated Alias for {@link treeProcessor}. */
  treeprocessor(...args) {
    return this.treeProcessor(...args)
  }

  /** Alias for {@link treeProcessor} (snake_case for prefer() / Registry method dispatch). */
  tree_processor(...args) {
    return this.treeProcessor(...args)
  }

  /**
   * Return the registered TreeProcessor extensions, or null if none.
   *
   * @returns {ProcessorExtension[]|null}
   */
  treeProcessors() {
    return this._tree_processor_extensions
  }

  /**
   * Check whether any TreeProcessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasTreeProcessors() {
    return !!this._tree_processor_extensions
  }

  /** @deprecated Typo alias kept for backward compatibility. Use {@link hasTreeProcessors}. */
  hasTeeProcessors() {
    return !!this._tree_processor_extensions
  }

  /** @deprecated Alias for {@link treeProcessors}. */
  treeprocessors() {
    return this._tree_processor_extensions
  }

  /** @internal Core API compatibility alias for treeProcessors(). */
  get tree_processor_extensions() {
    return this._tree_processor_extensions
  }

  /**
   * Register a Postprocessor with the extension registry.
   *
   * @overload
   * @param {typeof Postprocessor} processor - A Postprocessor subclass.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {Postprocessor} processor - An already-constructed Postprocessor instance.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: PostprocessorDslInterface) => void} fn - Registration function bound to the postprocessor DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  postprocessor(...args) {
    return this._addDocumentProcessor('postprocessor', args)
  }

  /**
   * Return the registered Postprocessor extensions, or null if none.
   *
   * @returns {ProcessorExtension[]|null}
   */
  postprocessors() {
    return this._postprocessor_extensions
  }

  /**
   * Check whether any Postprocessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasPostprocessors() {
    return !!this._postprocessor_extensions
  }

  /** @internal Core API compatibility alias for postprocessors(). */
  get postprocessor_extensions() {
    return this._postprocessor_extensions
  }

  /**
   * Register an IncludeProcessor with the extension registry.
   *
   * @overload
   * @param {typeof IncludeProcessor} processor - An IncludeProcessor subclass.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {IncludeProcessor} processor - An already-constructed IncludeProcessor instance.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: IncludeProcessorDslInterface) => void} fn - Registration function bound to the include processor DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  includeProcessor(...args) {
    return this._addDocumentProcessor('include_processor', args)
  }

  /**
   * Return the registered IncludeProcessor extensions, or null if none.
   *
   * @returns {ProcessorExtension[]|null}
   */
  includeProcessors() {
    return this._include_processor_extensions
  }

  /**
   * Check whether any IncludeProcessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasIncludeProcessors() {
    return !!this._include_processor_extensions
  }

  /** Alias for {@link includeProcessor} (snake_case for prefer() / Registry method dispatch). */
  include_processor(...args) {
    return this.includeProcessor(...args)
  }

  /** @internal Core API compatibility alias for includeProcessors(). */
  get include_processor_extensions() {
    return this._include_processor_extensions
  }

  /**
   * Register a DocinfoProcessor with the extension registry.
   *
   * @overload
   * @param {typeof DocinfoProcessor} processor - A DocinfoProcessor subclass.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {DocinfoProcessor} processor - An already-constructed DocinfoProcessor instance.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: DocinfoProcessorDslInterface) => void} fn - Registration function bound to the docinfo processor DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  docinfoProcessor(...args) {
    return this._addDocumentProcessor('docinfo_processor', args)
  }

  /**
   * Check whether any DocinfoProcessor extensions have been registered.
   *
   * @param {string|null} [location=null] - Optional location ('head' or 'footer') to filter by.
   * @returns {boolean}
   */
  hasDocinfoProcessors(location = null) {
    if (!this._docinfo_processor_extensions) return false
    if (location) {
      return this._docinfo_processor_extensions.some(
        (ext) => ext.config.location === location
      )
    }
    return true
  }

  /**
   * Retrieve Extension proxy objects for DocinfoProcessor instances.
   *
   * @param {string|null} [location=null] - Optional location ('head' or 'footer') to filter by.
   * @returns {ProcessorExtension[]} array of Extension proxy objects.
   */
  docinfoProcessors(location = null) {
    if (!this._docinfo_processor_extensions) return []
    if (location) {
      return this._docinfo_processor_extensions.filter(
        (ext) => ext.config.location === location
      )
    }
    return this._docinfo_processor_extensions
  }

  /** Alias for {@link docinfoProcessor} (snake_case for prefer() / Registry method dispatch). */
  docinfo_processor(...args) {
    return this.docinfoProcessor(...args)
  }

  /** @internal Core API compatibility alias for docinfoProcessors(). */
  get docinfo_processor_extensions() {
    return this._docinfo_processor_extensions
  }

  /**
   * Register a BlockProcessor with the extension registry.
   *
   * @example
   * // class style
   * block(ShoutBlock)
   * // class style with explicit name
   * block(ShoutBlock, 'shout')
   * // block style
   * block(function () {
   *   this.named('shout')
   *   this.process(function (parent, reader, attrs) { ... })
   * })
   * // block style with explicit name
   * block('shout', function () {
   *   this.process(function (parent, reader, attrs) { ... })
   * })
   *
   * @overload
   * @param {typeof BlockProcessor} processor - A BlockProcessor subclass.
   * @param {string} [name] - Optional explicit block name.
   * @returns {ProcessorExtension} an Extension proxy object.
   *
   * @overload
   * @param {BlockProcessor} processor - An already-constructed BlockProcessor instance.
   * @param {string} [name] - Optional explicit block name (overrides the instance's name).
   * @returns {ProcessorExtension} an Extension proxy object.
   *
   * @overload
   * @param {string} name - The block name.
   * @param {(this: BlockProcessorDslInterface) => void} fn - Registration function bound to the block DSL.
   * @returns {ProcessorExtension} an Extension proxy object.
   *
   * @overload
   * @param {(this: BlockProcessorDslInterface) => void} fn - Registration function bound to the block DSL.
   * @returns {ProcessorExtension} an Extension proxy object.
   *
   * @param {...*} args - Class constructor, instance, block function, or name + one of those.
   * @returns {ProcessorExtension} an Extension proxy object.
   */
  block(...args) {
    return this._addSyntaxProcessor('block', args)
  }

  /**
   * Check whether any BlockProcessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasBlocks() {
    return !!this._block_extensions
  }

  /**
   * Retrieve all BlockProcessor Extension proxy objects.
   *
   * @returns {ProcessorExtension[]}
   */
  blocks() {
    return this._block_extensions ? Object.values(this._block_extensions) : []
  }

  /**
   * Check whether a BlockProcessor is registered for the given name and context.
   *
   * @param {string} name - The block name.
   * @param {string} context - The block context.
   * @returns {ProcessorExtension|false} the Extension proxy or false.
   */
  registeredForBlock(name, context) {
    const ext = this._block_extensions?.[String(name)]
    return ext ? ext.config.contexts.has(context) && ext : false
  }

  /**
   * Retrieve the Extension proxy for the BlockProcessor registered with the given name.
   *
   * @param {string} name - The block name.
   * @returns {ProcessorExtension|null}
   */
  findBlockExtension(name) {
    return this._block_extensions?.[String(name)] ?? null
  }

  /**
   * Register a BlockMacroProcessor with the extension registry.
   *
   * @overload
   * @param {typeof BlockMacroProcessor} processor - A BlockMacroProcessor subclass.
   * @param {string} [name] - Optional explicit macro name.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {BlockMacroProcessor} processor - An already-constructed BlockMacroProcessor instance.
   * @param {string} [name] - Optional explicit macro name (overrides the instance's name).
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {string} name - The macro name.
   * @param {(this: BlockMacroProcessorDslInterface) => void} fn - Registration function bound to the block macro DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: BlockMacroProcessorDslInterface) => void} fn - Registration function bound to the block macro DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  blockMacro(...args) {
    return this._addSyntaxProcessor('block_macro', args)
  }

  /** @deprecated Alias for {@link blockMacro}. */
  block_macro(...args) {
    return this.blockMacro(...args)
  }

  /**
   * Check whether any BlockMacroProcessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasBlockMacros() {
    return !!this._block_macro_extensions
  }

  /**
   * Retrieve all BlockMacroProcessor Extension proxy objects.
   *
   * @returns {ProcessorExtension[]}
   */
  blockMacros() {
    return this._block_macro_extensions
      ? Object.values(this._block_macro_extensions)
      : []
  }

  /**
   * Check whether a BlockMacroProcessor is registered for the given name.
   *
   * @param {string} name - The macro name.
   * @returns {ProcessorExtension|false}
   */
  registeredForBlockMacro(name) {
    return this._block_macro_extensions?.[String(name)] || false
  }

  /**
   * Retrieve the Extension proxy for the BlockMacroProcessor registered with the given name.
   *
   * @param {string} name - The macro name.
   * @returns {ProcessorExtension|null}
   */
  findBlockMacroExtension(name) {
    return this._block_macro_extensions?.[String(name)] ?? null
  }

  /**
   * Register an InlineMacroProcessor with the extension registry.
   *
   * @overload
   * @param {typeof InlineMacroProcessor} processor - An InlineMacroProcessor subclass.
   * @param {string} [name] - Optional explicit macro name.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {InlineMacroProcessor} processor - An already-constructed InlineMacroProcessor instance.
   * @param {string} [name] - Optional explicit macro name (overrides the instance's name).
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {string} name - The macro name.
   * @param {(this: InlineMacroProcessorDslInterface) => void} fn - Registration function bound to the inline macro DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @overload
   * @param {(this: InlineMacroProcessorDslInterface) => void} fn - Registration function bound to the inline macro DSL.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   *
   * @param {...*} args - Class constructor, instance, or block function.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  inlineMacro(...args) {
    return this._addSyntaxProcessor('inline_macro', args)
  }

  /** @deprecated Alias for {@link inlineMacro}. */
  inline_macro(...args) {
    return this.inlineMacro(...args)
  }

  /**
   * Check whether any InlineMacroProcessor extensions have been registered.
   *
   * @returns {boolean}
   */
  hasInlineMacros() {
    return !!this._inline_macro_extensions
  }

  /**
   * Check whether an InlineMacroProcessor is registered for the given name.
   *
   * @param {string} name - The macro name.
   * @returns {ProcessorExtension|false}
   */
  registeredForInlineMacro(name) {
    return this._inline_macro_extensions?.[String(name)] || false
  }

  /**
   * Retrieve the Extension proxy for the InlineMacroProcessor registered with the given name.
   *
   * @param {string} name - The macro name.
   * @returns {ProcessorExtension|null}
   */
  findInlineMacroExtension(name) {
    return this._inline_macro_extensions?.[String(name)] ?? null
  }

  /**
   * Retrieve all InlineMacroProcessor Extension proxy objects.
   *
   * @returns {ProcessorExtension[]}
   */
  inlineMacros() {
    return this._inline_macro_extensions
      ? Object.values(this._inline_macro_extensions)
      : []
  }

  /**
   * Insert the document-processor Extension as the first of its kind in the extension registry.
   *
   * @example
   * registry.prefer('includeProcessor', function () {
   *   this.process(function (document, reader, target, attrs) { ... })
   * })
   *
   * @param {...*} args - A ProcessorExtension, or a method name followed by processor args.
   * @returns {ProcessorExtension} the Extension stored in the registry.
   */
  prefer(...args) {
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

  // ── JavaScript-style accessors ───────────────────────────────────────────────

  /** @returns {object} the plain Object that maps names to groups for this registry. */
  getGroups() {
    return this.groups
  }

  /** Alias for {@link preprocessors}. */
  getPreprocessors() {
    return this.preprocessors()
  }

  /** Alias for {@link treeProcessors}. */
  getTreeProcessors() {
    return this.treeProcessors()
  }

  /** Alias for {@link includeProcessors}. */
  getIncludeProcessors() {
    return this.includeProcessors()
  }

  /** Alias for {@link postprocessors}. */
  getPostprocessors() {
    return this.postprocessors()
  }

  /**
   * Alias for {@link docinfoProcessors}.
   *
   * @param {string|null} [location=null]
   */
  getDocinfoProcessors(location = null) {
    return this.docinfoProcessors(location)
  }

  /** Alias for {@link blocks}. */
  getBlocks() {
    return this.blocks()
  }

  /** Alias for {@link blockMacros}. */
  getBlockMacros() {
    return this.blockMacros()
  }

  /** Alias for {@link inlineMacros}. */
  getInlineMacros() {
    return this.inlineMacros()
  }

  /**
   * Alias for {@link registeredForInlineMacro}.
   *
   * @param {string} name
   */
  getInlineMacroFor(name) {
    return this.registeredForInlineMacro(name)
  }

  /**
   * Alias for {@link registeredForBlock}.
   *
   * @param {string} name
   * @param {string} context
   */
  getBlockFor(name, context) {
    return this.registeredForBlock(name, context)
  }

  /**
   * Alias for {@link registeredForBlockMacro}.
   *
   * @param {string} name
   */
  getBlockMacroFor(name) {
    return this.registeredForBlockMacro(name)
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /** @internal */
  _addDocumentProcessor(kind, args) {
    const kindName = kind.replace(/_/g, ' ')
    const kindClass = DOCUMENT_PROCESSOR_CLASSES[kind]
    if (!this[`_${kind}_extensions`]) this[`_${kind}_extensions`] = []
    const store = this[`_${kind}_extensions`]

    // Detect block style: last argument is a function that is NOT a class constructor.
    // Class constructors (ES6 classes) have a non-writable prototype descriptor;
    // plain functions (used as DSL blocks) have a writable prototype.
    const lastArg = args[args.length - 1]
    const hasBlock =
      args.length > 0 &&
      typeof lastArg === 'function' &&
      !!(
        Object.getOwnPropertyDescriptor(lastArg, 'prototype')?.writable ?? true
      )

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
          throw new Error(
            `Invalid type for ${kindName} extension: ${processorArg}`
          )
        }
        processorInstance = new processorArg(config)
      } else if (processorArg instanceof kindClass) {
        // Style 3: already an instance
        processorArg.updateConfig(config)
        processorInstance = processorArg
      } else {
        throw new Error(
          `Invalid arguments specified for registering ${kindName} extension: ${args}`
        )
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
    extension._direct = !this._activating
    extension.config.position === '>>'
      ? store.unshift(extension)
      : store.push(extension)
    return extension
  }

  /** @internal */
  _addSyntaxProcessor(kind, args) {
    const kindName = kind.replace(/_/g, ' ')
    const kindClass = SYNTAX_PROCESSOR_CLASSES[kind]
    if (!this[`_${kind}_extensions`])
      this[`_${kind}_extensions`] = Object.create(null)
    const store = this[`_${kind}_extensions`]

    // Detect block style (same heuristic as _addDocumentProcessor).
    const lastArg = args[args.length - 1]
    const hasBlock =
      args.length > 0 &&
      typeof lastArg === 'function' &&
      !!(
        Object.getOwnPropertyDescriptor(lastArg, 'prototype')?.writable ?? true
      )

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
        if (!name)
          throw new Error(
            `No name specified for ${kindName} extension: ${processorArg}`
          )
      } else if (processorArg instanceof kindClass) {
        // Style 3: already an instance
        processorArg.updateConfig(config)
        name = nameArg
          ? (processorArg.name = this._asSymbol(nameArg))
          : this._asSymbol(processorArg.name)
        if (!name)
          throw new Error(
            `No name specified for ${kindName} extension: ${processorArg}`
          )
        processorInstance = processorArg
      } else {
        throw new Error(
          `Invalid arguments specified for registering ${kindName} extension: ${args}`
        )
      }
    }

    store[name] = new ProcessorExtension(kind, processorInstance)
    store[name]._direct = !this._activating
    return store[name]
  }

  /** @internal */
  _reset() {
    // Keep extensions registered directly (outside a group); only clear group-registered ones.
    // Extensions tagged with _direct=true survive across activations.
    const keepArr = (arr) => {
      const kept = arr?.filter((e) => e._direct) ?? []
      return kept.length ? kept : null
    }
    const keepMap = (map) => {
      if (!map) return null
      const kept = Object.create(null)
      for (const [k, v] of Object.entries(map)) if (v._direct) kept[k] = v
      return Object.keys(kept).length ? kept : null
    }
    /** @internal */
    this._preprocessor_extensions = keepArr(this._preprocessor_extensions)
    /** @internal */
    this._tree_processor_extensions = keepArr(this._tree_processor_extensions)
    /** @internal */
    this._postprocessor_extensions = keepArr(this._postprocessor_extensions)
    /** @internal */
    this._include_processor_extensions = keepArr(
      this._include_processor_extensions
    )
    /** @internal */
    this._docinfo_processor_extensions = keepArr(
      this._docinfo_processor_extensions
    )
    /** @internal */
    this._block_extensions = keepMap(this._block_extensions)
    /** @internal */
    this._block_macro_extensions = keepMap(this._block_macro_extensions)
    /** @internal */
    this._inline_macro_extensions = keepMap(this._inline_macro_extensions)
    this.document = null
  }

  /**
   * @internal Normalise an args array to the expected number of values.
   *
   * Pops a trailing plain-object as options (or uses {}), then pads / trims
   * the remaining args to (expect - 1) elements, then appends the options object.
   * If expect === 1, returns just the options object.
   */
  _resolveArgs(args, expect) {
    const last = args[args.length - 1]
    const opts =
      args.length > 0 &&
      last !== null &&
      typeof last === 'object' &&
      !Array.isArray(last) &&
      !(last instanceof Processor)
        ? args.pop()
        : {}

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

  /** @internal */
  _asSymbol(name) {
    return name != null ? String(name) : null
  }
}

// ── Extensions module namespace ───────────────────────────────────────────────

// Module-level state (mirrors Ruby module instance variables @auto_id / @groups).
let _autoId = -1
const _groups = Object.create(null)

/**
 * The primary entry point for registering extensions globally.
 *
 * Mirrors the class-level methods on the Ruby Asciidoctor::Extensions module.
 */
export const Extensions = {
  /** @internal Generate a unique name for an anonymous extension group. */
  generateName() {
    return `extgrp${this.nextAutoId()}`
  },

  /** @internal Increment and return the global auto-id counter. */
  nextAutoId() {
    return ++_autoId
  },

  /**
   * Return the plain Object that maps names to registered groups.
   *
   * @returns {object}
   */
  groups() {
    return _groups
  },

  /**
   * Alias for {@link groups}.
   *
   * @returns {object}
   */
  getGroups() {
    return this.groups()
  },

  /**
   * Create a new Registry, optionally pre-populated with a named block.
   *
   * When a `block` is provided it is stored as a group and re-executed on every
   * activation, making the registry safe to reuse across multiple conversions.
   * Without a `block`, any extensions registered directly on the returned registry
   * (e.g. `registry.preprocessor(fn)`) are stored in transient state that is
   * cleared on every activation — those registrations will be lost from the second
   * conversion onwards. Prefer the block form when the registry may be reused.
   *
   * @param {string|null} [name=null] - Optional name for the group; auto-generated if omitted.
   * @param {Function|null} [block=null] - Optional function to register as the group.
   * @returns {Registry}
   */
  create(name = null, block = null) {
    if (block) {
      return new Registry({ [name || this.generateName()]: block })
    }
    return new Registry()
  },

  /**
   * Register an extension Group that subsequently registers extensions.
   *
   * @example
   * Extensions.register(UmlExtensions)
   * Extensions.register('uml', UmlExtensions)
   * Extensions.register(function () { this.blockMacro('plantuml', PlantUmlBlock) })
   * Extensions.register('uml', function () { this.blockMacro('plantuml', PlantUmlBlock) })
   *
   * @param {...*} args - Optional name followed by a Group class, instance, or function.
   * @returns {Function|object} the registered group.
   */
  register(...args) {
    const argc = args.length
    if (argc === 0) throw new Error('Extension group to register not specified')
    const group = args.pop()
    if (!group) throw new Error('Extension group to register not specified')
    const name = args.pop() ?? this.generateName()
    if (args.length > 0)
      throw new Error(`Wrong number of arguments (${argc} for 1..2)`)
    _groups[String(name)] = group
    return group
  },

  /**
   * Unregister all statically-registered extension groups.
   */
  unregisterAll() {
    for (const key of Object.keys(_groups)) delete _groups[key]
  },

  /**
   * Unregister statically-registered extension groups by name.
   *
   * @param {...string} names - One or more group names to unregister.
   */
  unregister(...names) {
    for (const name of names) delete _groups[String(name)]
  },

  // ── Processor factory helpers (mirrors core API) ─────────────────────────────
  // Each pair: create<Kind>(name?, functions) → class constructor
  //            new<Kind>(name?, functions)    → instance of that class
  // The `name` argument is optional; if omitted the sole argument is `functions`.

  /** @internal Build a subclass of BaseClass with the given prototype functions. */
  _buildProcessorClass(BaseClass, name, functions) {
    if (arguments.length === 2) {
      functions = name
      name = null
    }
    const klass = class extends BaseClass {}
    if (name) Object.defineProperty(klass, 'name', { value: name })
    Object.assign(klass.prototype, functions)
    return klass
  },

  /**
   * Create a Preprocessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof Preprocessor}
   */
  createPreprocessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(Preprocessor, name, functions)
  },

  /**
   * Create and return a new Preprocessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {Preprocessor}
   */
  newPreprocessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createPreprocessor(name, functions))()
  },

  /**
   * Create a TreeProcessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof TreeProcessor}
   */
  createTreeProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(TreeProcessor, name, functions)
  },

  /**
   * Create and return a new TreeProcessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {TreeProcessor}
   */
  newTreeProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createTreeProcessor(name, functions))()
  },

  /**
   * Create a Postprocessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof Postprocessor}
   */
  createPostprocessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(Postprocessor, name, functions)
  },

  /**
   * Create and return a new Postprocessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {Postprocessor}
   */
  newPostprocessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createPostprocessor(name, functions))()
  },

  /**
   * Create an IncludeProcessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof IncludeProcessor}
   */
  createIncludeProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(IncludeProcessor, name, functions)
  },

  /**
   * Create and return a new IncludeProcessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {IncludeProcessor}
   */
  newIncludeProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createIncludeProcessor(name, functions))()
  },

  /**
   * Create a DocinfoProcessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof DocinfoProcessor}
   */
  createDocinfoProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(DocinfoProcessor, name, functions)
  },

  /**
   * Create and return a new DocinfoProcessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {DocinfoProcessor}
   */
  newDocinfoProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createDocinfoProcessor(name, functions))()
  },

  /**
   * Create a BlockProcessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof BlockProcessor}
   */
  createBlockProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(BlockProcessor, name, functions)
  },

  /**
   * Create and return a new BlockProcessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {BlockProcessor}
   */
  newBlockProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createBlockProcessor(name, functions))()
  },

  /**
   * Create an InlineMacroProcessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof InlineMacroProcessor}
   */
  createInlineMacroProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(InlineMacroProcessor, name, functions)
  },

  /**
   * Create and return a new InlineMacroProcessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {InlineMacroProcessor}
   */
  newInlineMacroProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createInlineMacroProcessor(name, functions))()
  },

  /**
   * Create a BlockMacroProcessor subclass with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {typeof BlockMacroProcessor}
   */
  createBlockMacroProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return this._buildProcessorClass(BlockMacroProcessor, name, functions)
  },

  /**
   * Create and return a new BlockMacroProcessor instance with the given prototype functions.
   *
   * @param {string} [name] - Optional class name.
   * @param {object} [functions] - Methods to mix into the prototype.
   * @returns {BlockMacroProcessor}
   */
  newBlockMacroProcessor(name, functions) {
    if (arguments.length === 1) {
      functions = name
      name = null
    }
    return new (this.createBlockMacroProcessor(name, functions))()
  },
}
