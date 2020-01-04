/* global Opal */

/**
 * Convert a JSON to an (Opal) Hash.
 * @private
 */
var toHash = function (object) {
  return object && !object.$$is_hash ? Opal.hash2(Object.keys(object), object) : object
}

/**
 * Convert an (Opal) Hash to JSON.
 * @private
 */
var fromHash = function (hash) {
  var object = {}
  var data = hash.$$smap
  for (var key in data) {
    object[key] = data[key]
  }
  return object
}

var fromHashKeys = function (hash) {
  var object = {}
  var data = hash.$$keys
  for (var key in data) {
    object[key.toString()] = data[key].value
  }
  return object
}

/**
 * @private
 */
var prepareOptions = function (options) {
  options = toHash(options)
  if (options) {
    var attrs = options['$[]']('attributes')
    if (attrs && typeof attrs === 'object' && attrs.constructor.name === 'Object') {
      options = options.$dup()
      options['$[]=']('attributes', toHash(attrs))
    }
  }
  return options
}

function initializeClass (superClass, className, functions, defaultFunctions, argProxyFunctions) {
  var scope = Opal.klass(Opal.Object, superClass, className, function () {})
  var postConstructFunction
  var initializeFunction
  var constructorFunction
  var defaultFunctionsOverridden = {}
  for (var functionName in functions) {
    if (functions.hasOwnProperty(functionName)) {
      (function (functionName) {
        var userFunction = functions[functionName]
        if (functionName === 'postConstruct') {
          postConstructFunction = userFunction
        } else if (functionName === 'initialize') {
          initializeFunction = userFunction
        } else if (functionName === 'constructor') {
          constructorFunction = userFunction
        } else {
          if (defaultFunctions && defaultFunctions.hasOwnProperty(functionName)) {
            defaultFunctionsOverridden[functionName] = true
          }
          Opal.def(scope, '$' + functionName, function () {
            var args
            if (argProxyFunctions && argProxyFunctions.hasOwnProperty(functionName)) {
              args = argProxyFunctions[functionName](arguments)
            } else {
              args = arguments
            }
            return userFunction.apply(this, args)
          })
        }
      }(functionName))
    }
  }
  var initialize
  if (typeof constructorFunction === 'function') {
    initialize = function () {
      var args = Array.from(arguments)
      for (var i = 0; i < args.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof args[i] === 'object' && '$$smap' in args[i]) {
          args[i] = fromHash(args[i])
        }
      }
      args.unshift(null)
      var result = new (Function.prototype.bind.apply(constructorFunction, args)) // eslint-disable-line
      Object.assign(this, result)
      if (typeof postConstructFunction === 'function') {
        postConstructFunction.bind(this)()
      }
    }
  } else if (typeof initializeFunction === 'function') {
    initialize = function () {
      var args = Array.from(arguments)
      for (var i = 0; i < args.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof args[i] === 'object' && '$$smap' in args[i]) {
          args[i] = fromHash(args[i])
        }
      }
      initializeFunction.apply(this, args)
      if (typeof postConstructFunction === 'function') {
        postConstructFunction.bind(this)()
      }
    }
  } else {
    initialize = function () {
      Opal.send(this, Opal.find_super_dispatcher(this, 'initialize', initialize))
      if (typeof postConstructFunction === 'function') {
        postConstructFunction.bind(this)()
      }
    }
  }
  Opal.def(scope, '$initialize', initialize)
  Opal.def(scope, 'super', function (func) {
    if (typeof func === 'function') {
      Opal.send(this, Opal.find_super_dispatcher(this, func.name, func))
    } else {
      // Bind the initialize function to super();
      var argumentsList = Array.from(arguments)
      for (var i = 0; i < argumentsList.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof argumentsList[i] === 'object') {
          argumentsList[i] = toHash(argumentsList[i])
        }
      }
      Opal.send(this, Opal.find_super_dispatcher(this, 'initialize', initialize), argumentsList)
    }
  })
  if (defaultFunctions) {
    for (var defaultFunctionName in defaultFunctions) {
      if (defaultFunctions.hasOwnProperty(defaultFunctionName) && !defaultFunctionsOverridden.hasOwnProperty(defaultFunctionName)) {
        (function (defaultFunctionName) {
          var defaultFunction = defaultFunctions[defaultFunctionName]
          Opal.def(scope, '$' + defaultFunctionName, function () {
            return defaultFunction.apply(this, arguments)
          })
        }(defaultFunctionName))
      }
    }
  }
  return scope
}

// Asciidoctor API

/**
 * @namespace
 * @description
 * The main application interface (API) for Asciidoctor.
 * This API provides methods to parse AsciiDoc content and convert it to various output formats using built-in or third-party converters.
 *
 * An AsciiDoc document can be as simple as a single line of content,
 * though it more commonly starts with a document header that declares the document title and document attribute definitions.
 * The document header is then followed by zero or more section titles, optionally nested, to organize the paragraphs, blocks, lists, etc. of the document.
 *
 * By default, the processor converts the AsciiDoc document to HTML 5 using a built-in converter.
 * However, this behavior can be changed by specifying a different backend (e.g., +docbook+).
 * A backend is a keyword for an output format (e.g., DocBook).
 * That keyword, in turn, is used to select a converter, which carries out the request to convert the document to that format.
 *
 * @example
 * asciidoctor.convertFile('document.adoc', { 'safe': 'safe' }) // Convert an AsciiDoc file
 *
 * asciidoctor.convert("I'm using *Asciidoctor* version {asciidoctor-version}.", { 'safe': 'safe' }) // Convert an AsciiDoc string
 *
 * const doc = asciidoctor.loadFile('document.adoc', { 'safe': 'safe' }) // Parse an AsciiDoc file into a document object
 *
 * const doc = asciidoctor.load("= Document Title\n\nfirst paragraph\n\nsecond paragraph", { 'safe': 'safe' }) // Parse an AsciiDoc string into a document object
 */
var Asciidoctor = Opal.Asciidoctor['$$class']

/**
 * Get Asciidoctor core version number.
 *
 * @returns {string} - the version number of Asciidoctor core.
 * @memberof Asciidoctor
 */
Asciidoctor.prototype.getCoreVersion = function () {
  return this.$$const.VERSION
}

/**
 * Get Asciidoctor.js runtime environment information.
 *
 * @returns {Object} - the runtime environment including the ioModule, the platform, the engine and the framework.
 * @memberof Asciidoctor
 */
Asciidoctor.prototype.getRuntime = function () {
  return {
    ioModule: Opal.const_get_qualified('::', 'JAVASCRIPT_IO_MODULE'),
    platform: Opal.const_get_qualified('::', 'JAVASCRIPT_PLATFORM'),
    engine: Opal.const_get_qualified('::', 'JAVASCRIPT_ENGINE'),
    framework: Opal.const_get_qualified('::', 'JAVASCRIPT_FRAMEWORK')
  }
}

/**
 * Parse the AsciiDoc source input into an {@link Document} and convert it to the specified backend format.
 *
 * Accepts input as a Buffer or String.
 *
 * @param {string|Buffer} input - AsciiDoc input as String or Buffer
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {string|Document} - the {@link Document} object if the converted String is written to a file,
 * otherwise the converted String
 * @example
 * var input = '= Hello, AsciiDoc!\n' +
 *   'Guillaume Grossetie <ggrossetie@example.com>\n\n' +
 *   'An introduction to http://asciidoc.org[AsciiDoc].\n\n' +
 *   '== First Section\n\n' +
 *   '* item 1\n' +
 *   '* item 2\n';
 *
 * var html = asciidoctor.convert(input);
 * @memberof Asciidoctor
 */
Asciidoctor.prototype.convert = function (input, options) {
  if (typeof input === 'object' && input.constructor.name === 'Buffer') {
    input = input.toString('utf8')
  }
  var result = this.$convert(input, prepareOptions(options))
  return result === Opal.nil ? '' : result
}

/**
 * Parse the AsciiDoc source input into an {@link Document} and convert it to the specified backend format.
 *
 * @param {string} filename - source filename
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {string|Document} - the {@link Document} object if the converted String is written to a file,
 * otherwise the converted String
 * @example
 * var html = asciidoctor.convertFile('./document.adoc');
 * @memberof Asciidoctor
 */
Asciidoctor.prototype.convertFile = function (filename, options) {
  return this.$convert_file(filename, prepareOptions(options))
}

/**
 * Parse the AsciiDoc source input into an {@link Document}
 *
 * Accepts input as a Buffer or String.
 *
 * @param {string|Buffer} input - AsciiDoc input as String or Buffer
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {Document} - the {@link Document} object
 * @memberof Asciidoctor
 */
Asciidoctor.prototype.load = function (input, options) {
  if (typeof input === 'object' && input.constructor.name === 'Buffer') {
    input = input.toString('utf8')
  }
  return this.$load(input, prepareOptions(options))
}

/**
 * Parse the contents of the AsciiDoc source file into an {@link Document}
 *
 * @param {string} filename - source filename
 * @param {Object} options - a JSON of options to control processing (default: {})
 * @returns {Document} - the {@link Document} object
 * @memberof Asciidoctor
 */
Asciidoctor.prototype.loadFile = function (filename, options) {
  return this.$load_file(filename, prepareOptions(options))
}

// AbstractBlock API

/**
 * @namespace
 * @extends AbstractNode
 */
var AbstractBlock = Opal.Asciidoctor.AbstractBlock

/**
 * Append a block to this block's list of child blocks.
 *
 * @returns {AbstractBlock} - the parent block to which this block was appended.
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.append = function (block) {
  this.$append(block)
  return this
}

/**
 * Get the String title of this Block with title substitions applied
 *
 * The following substitutions are applied to block and section titles:
 *
 * <code>specialcharacters</code>, <code>quotes</code>, <code>replacements</code>, <code>macros</code>, <code>attributes</code> and <code>post_replacements</code>
 *
 * @returns {string} - the converted String title for this Block, or undefined if the title is not set.
 * @example
 * block.title // "Foo 3^ # {two-colons} Bar(1)"
 * block.getTitle(); // "Foo 3^ # :: Bar(1)"
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getTitle = function () {
  var title = this.$title()
  return title === Opal.nil ? undefined : title
}

/**
 * Set the String block title.
 *
 * @param {string} title - The block title
 * @returns {string} - the new String title assigned to this Block.
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.setTitle = function (title) {
  return this['$title='](title)
}

/**
 * Convenience method that returns the interpreted title of the Block
 * with the caption prepended.
 * Concatenates the value of this Block's caption instance variable and the
 * return value of this Block's title method. No space is added between the
 * two values. If the Block does not have a caption, the interpreted title is
 * returned.
 *
 * @returns {string} - the converted String title prefixed with the caption, or just the converted String title if no caption is set
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getCaptionedTitle = function () {
  return this.$captioned_title()
}

/**
 * Get the style (block type qualifier) for this block.
 *
 * @returns {string} - the style for this block
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getStyle = function () {
  var style = this.style
  return style === Opal.nil ? undefined : style
}

/**
 * Set the style for this block.
 *
 * @param {string} style - Style
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.setStyle = function (style) {
  this.style = style
}

/**
 * Get the location in the AsciiDoc source where this block begins.
 *
 * @returns {string} - the style for this block
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getSourceLocation = function () {
  var sourceLocation = this.source_location
  if (sourceLocation === Opal.nil) {
    return undefined
  }
  sourceLocation['getFile'] = function () {
    var file = this.file
    return file === Opal.nil ? undefined : file
  }
  sourceLocation['getDirectory'] = function () {
    var dir = this.dir
    return dir === Opal.nil ? undefined : dir
  }
  sourceLocation['getPath'] = function () {
    var path = this.path
    return path === Opal.nil ? undefined : path
  }
  sourceLocation['getLineNumber'] = function () {
    var lineno = this.lineno
    return lineno === Opal.nil ? undefined : lineno
  }
  return sourceLocation
}

/**
 * Get the caption for this block.
 *
 * @returns {string} - the caption for this block
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getCaption = function () {
  return this.$caption()
}

/**
 * Set the caption for this block.
 *
 * @param {string} caption - Caption
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.setCaption = function (caption) {
  this.caption = caption
}

/**
 * Get the level of this section or the section level in which this block resides.
 *
 * @returns {number} - the level (Integer) of this section
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getLevel = function () {
  var level = this.level
  return level === Opal.nil ? undefined : level
}

/**
 * Get the substitution keywords to be applied to the contents of this block.
 *
 * @returns {Array<string>} - the list of {string} substitution keywords associated with this block.
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getSubstitutions = function () {
  return this.subs
}

/**
 * Check whether a given substitution keyword is present in the substitutions for this block.
 *
 * @returns {boolean} - whether the substitution is present on this block.
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.hasSubstitution = function (substitution) {
  return this['$sub?'](substitution)
}

/**
 * Remove the specified substitution keyword from the list of substitutions for this block.
 *
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.removeSubstitution = function (substitution) {
  this.$remove_sub(substitution)
}

/**
 * Checks if the {@link AbstractBlock} contains any child blocks.
 *
 * @returns {boolean} - whether the {@link AbstractBlock} has child blocks.
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.hasBlocks = function () {
  return this.blocks.length > 0
}

/**
 * Get the list of {@link AbstractBlock} sub-blocks for this block.
 *
 * @returns {Array<AbstractBlock>} - a list of {@link AbstractBlock} sub-blocks
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getBlocks = function () {
  return this.blocks
}

/**
 * Get the converted result of the child blocks by converting the children appropriate to content model that this block supports.
 *
 * @returns {string} - the converted result of the child blocks
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getContent = function () {
  return this.$content()
}

/**
 * Get the converted content for this block.
 * If the block has child blocks, the content method should cause them to be converted
 * and returned as content that can be included in the parent block's template.
 *
 * @returns {string} - the converted String content for this block
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.convert = function () {
  return this.$convert()
}

/**
 * Query for all descendant block-level nodes in the document tree
 * that match the specified selector (context, style, id, and/or role).
 * If a function block is given, it's used as an additional filter.
 * If no selector or function block is supplied, all block-level nodes in the tree are returned.
 * @param {Object} [selector]
 * @param {function} [block]
 * @example
 * doc.findBy({'context': 'section'});
 * // => { level: 0, title: "Hello, AsciiDoc!", blocks: 0 }
 * // => { level: 1, title: "First Section", blocks: 1 }
 *
 * doc.findBy({'context': 'section'}, function (section) { return section.getLevel() === 1; });
 * // => { level: 1, title: "First Section", blocks: 1 }
 *
 * doc.findBy({'context': 'listing', 'style': 'source'});
 * // => { context: :listing, content_model: :verbatim, style: "source", lines: 1 }
 *
 * @returns {Array<AbstractBlock>} - a list of block-level nodes that match the filter or an empty list if no matches are found
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.findBy = function (selector, block) {
  if (typeof block === 'undefined' && typeof selector === 'function') {
    return Opal.send(this, 'find_by', null, selector)
  } else if (typeof block === 'function') {
    return Opal.send(this, 'find_by', [toHash(selector)], block)
  } else {
    return this.$find_by(toHash(selector))
  }
}

/**
 * Get the source line number where this block started.
 * @returns {number} - the source line number where this block started
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getLineNumber = function () {
  var lineno = this.$lineno()
  return lineno === Opal.nil ? undefined : lineno
}

/**
 * Check whether this block has any child Section objects.
 * Only applies to Document and Section instances.
 * @returns {boolean} - true if this block has child Section objects, otherwise false
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.hasSections = function () {
  return this['$sections?']()
}

/**
 * Get the Array of child Section objects.
 * Only applies to Document and Section instances.
 * @memberof AbstractBlock
 * @returns {Array<Section>} - an {Array} of {@link Section} objects
 */
AbstractBlock.prototype.getSections = function () {
  return this.$sections()
}

/**
 * Get the numeral of this block (if section, relative to parent, otherwise absolute).
 * Only assigned to section if automatic section numbering is enabled.
 * Only assigned to formal block (block with title) if corresponding caption attribute is present.
 * If the section is an appendix, the numeral is a letter (starting with A).
 * @returns {string} - the numeral
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.getNumeral = function () {
  return this.$numeral()
}

/**
 * Set the numeral of this block.
 * @param {string} value - The numeral value
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.setNumeral = function (value) {
  this['$numeral='](value)
}

/**
 * A convenience method that checks whether the title of this block is defined.
 *
 * @returns {boolean} - a {boolean} indicating whether this block has a title.
 * @memberof AbstractBlock
 */
AbstractBlock.prototype.hasTitle = function () {
  return this['$title?']()
}

// Section API

/**
 * @description
 * Methods for managing sections of AsciiDoc content in a document.
 *
 * @example
 * <pre>
 *   section = asciidoctor.Section.create()
 *   section.setTitle('Section 1')
 *   section.setId('sect1')
 *   section.getBlocks().length // 0
 *   section.getId() // "sect1"
 *   section.append(newBlock)
 *   section.getBlocks().length // 1
 * </pre>
 * @namespace
 * @extends AbstractBlock
 */
var Section = Opal.Asciidoctor.Section

/**
 * Create a {Section} object.
 * @param {AbstractBlock} [parent] - The parent AbstractBlock. If set, must be a Document or Section object (default: undefined)
 * @param {number} [level] - The Integer level of this section (default: 1 more than parent level or 1 if parent not defined)
 * @param {boolean} [numbered] - A Boolean indicating whether numbering is enabled for this Section (default: false)
 * @param {Object} [opts] - An optional JSON of options (default: {})
 * @returns {Section} - a new {Section} object
 * @memberof Section
 */
Section.create = function (parent, level, numbered, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return this.$new(parent, level, numbered, toHash(opts))
}

/**
 * Set the level of this section or the section level in which this block resides.
 * @param {number} level - Level (Integer)
 * @memberof AbstractBlock
 */
Section.prototype.setLevel = function (level) {
  this.level = level
}

/**
 * Get the 0-based index order of this section within the parent block.
 * @returns {number}
 * @memberof Section
 */
Section.prototype.getIndex = function () {
  return this.index
}

/**
 * Set the 0-based index order of this section within the parent block.
 * @param {string} index - The index order of this section
 * @memberof Section
 */
Section.prototype.setIndex = function (index) {
  this.index = index
}

/**
 * Get the section name of this section.
 * @returns {string|undefined}
 * @memberof Section
 */
Section.prototype.getSectionName = function () {
  var sectname = this.sectname
  return sectname === Opal.nil ? undefined : sectname
}

/**
 * Set the section name of this section.
 * @param {string} value - The section name
 * @memberof Section
 */
Section.prototype.setSectionName = function (value) {
  this.sectname = value
}

/**
 * Get the flag to indicate whether this is a special section or a child of one.
 * @returns {boolean}
 * @memberof Section
 */
Section.prototype.isSpecial = function () {
  return this.special
}

/**
 * Set the flag to indicate whether this is a special section or a child of one.
 * @param {boolean} value - A flag to indicated if this is a special section
 * @memberof Section
 */
Section.prototype.setSpecial = function (value) {
  this.special = value
}

/**
 * Get the state of the numbered attribute at this section (need to preserve for creating TOC).
 * @returns {boolean}
 * @memberof Section
 */
Section.prototype.isNumbered = function () {
  return this.numbered
}

/**
 * Get the caption for this section (only relevant for appendices).
 * @returns {string}
 * @memberof Section
 */
Section.prototype.getCaption = function () {
  var value = this.caption
  return value === Opal.nil ? undefined : value
}

/**
 * Get the name of the Section (title)
 * @returns {string}
 * @see {@link AbstractBlock#getTitle}
 * @memberof Section
 */
Section.prototype.getName = function () {
  return this.getTitle()
}

/**
 * @description
 * Methods for managing AsciiDoc content blocks.
 *
 * @example
 * block = Asciidoctor::Block.new(parent, :paragraph, source: '_This_ is a <test>')
 * block.content
 * => "<em>This</em> is a &lt;test&gt;"
 *
 * @namespace
 * @extends AbstractBlock
 */
var Block = Opal.Asciidoctor.Block

/**
 * Create a {Block} object.
 * @param {AbstractBlock} parent - The parent {AbstractBlock} with a compound content model to which this {Block} will be appended.
 * @param {string} context - The context name for the type of content (e.g., "paragraph").
 * @param {Object} [opts] - a JSON of options to customize block initialization: (default: {})
 * @param {string} opts.content_model - indicates whether blocks can be nested in this {Block} ("compound"),
 * otherwise how the lines should be processed ("simple", "verbatim", "raw", "empty"). (default: "simple")
 * @param {Object} opts.attributes - a JSON of attributes (key/value pairs) to assign to this {Block}. (default: {})
 * @param {string|Array<string>} opts.source - a String or {Array} of raw source for this {Block}. (default: undefined)
 *
 * IMPORTANT: If you don't specify the `subs` option, you must explicitly call the `commit_subs` method to resolve and assign the substitutions
 * to this block (which are resolved from the `subs` attribute, if specified, or the default substitutions based on this block's context).
 * If you want to use the default subs for a block, pass the option `subs: "default"`.
 * You can override the default subs using the `default_subs` option.
 *
 * @returns {Block} - a new {Block} object
 * @memberof Block
 */
Block.create = function (parent, context, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return this.$new(parent, context, toHash(opts))
}

/**
 * Get the source of this block.
 * @returns {string} - the String source of this block.
 * @memberof Block
 */
Block.prototype.getSource = function () {
  return this.$source()
}

/**
 * Get the source lines of this block.
 * @returns {Array<string>} - the String {Array} of source lines for this block.
 * @memberof Block
 */
Block.prototype.getSourceLines = function () {
  return this.lines
}

// AbstractNode API

/**
 * @namespace
 * @description
 * An abstract base class that provides state and methods for managing a node of AsciiDoc content.
 * The state and methods on this class are common to all content segments in an AsciiDoc document.
 */
var AbstractNode = Opal.Asciidoctor.AbstractNode

/**
 * Apply the specified substitutions to the text.
 * If no substitutions are specified, the following substitutions are applied:
 * <code>specialcharacters</code>, <code>quotes</code>, <code>attributes</code>, <code>replacements</code>, <code>macros</code>, and <code>post_replacements</code>.
 *
 * @param {string|Array<string>} text - The String or String Array of text to process; must not be undefined.
 * @param {Array<string>} [subs] - The substitutions to perform; must be an Array or undefined.
 * @memberof AbstractNode
 */
AbstractNode.prototype.applySubstitutions = function (text, subs) {
  return this.$apply_subs(text, subs)
}

/**
 * @returns {string} - the String name of this node
 * @memberof AbstractNode
 */
AbstractNode.prototype.getNodeName = function () {
  return this.node_name
}

/**
 * @returns {Object} - the JSON of attributes for this node
 * @memberof AbstractNode
 */
AbstractNode.prototype.getAttributes = function () {
  return fromHash(this.attributes)
}

/**
 * Get the value of the specified attribute.
 * If the attribute is not found on this node, fallback_name is set, and this node is not the Document node, get the value of the specified attribute from the Document node.
 *
 * Look for the specified attribute in the attributes on this node and return the value of the attribute, if found.
 * Otherwise, if fallback_name is set (default: same as name) and this node is not the Document node, look for that attribute on the Document node and return its value, if found.
 * Otherwise, return the default value (default: undefined).
 *
 * @param {string} name - The String of the attribute to resolve.
 * @param {*} [defaultValue] - The {Object} value to return if the attribute is not found (default: undefined).
 * @param {string} [fallbackName] - The String of the attribute to resolve on the Document if the attribute is not found on this node (default: same as name).
 *
 * @returns {*} - the {Object} value (typically a String) of the attribute or defaultValue if the attribute is not found.
 * @memberof AbstractNode
 */
AbstractNode.prototype.getAttribute = function (name, defaultValue, fallbackName) {
  var value = this.$attr(name, defaultValue, fallbackName)
  return value === Opal.nil ? undefined : value
}

/**
 * Check whether the specified attribute is present on this node.
 *
 * @param {string} name - The String of the attribute to resolve.
 * @returns {boolean} - true if the attribute is present, otherwise false
 * @memberof AbstractNode
 */
AbstractNode.prototype.hasAttribute = function (name) {
  return name in this.attributes.$$smap
}

/**
 * Check if the specified attribute is defined using the same logic as {AbstractNode#getAttribute}, optionally performing acomparison with the expected value if specified.
 *
 * Look for the specified attribute in the attributes on this node.
 * If not found, fallback_name is specified (default: same as name), and this node is not the Document node, look for that attribute on the Document node.
 * In either case, if the attribute is found, and the comparison value is truthy, return whether the two values match.
 * Otherwise, return whether the attribute was found.
 *
 * @param {string} name - The String name of the attribute to resolve.
 * @param {*} [expectedValue] - The expected Object value of the attribute (default: undefined).
 * @param {string} fallbackName - The String of the attribute to resolve on the Document if the attribute is not found on this node (default: same as name).
 *
 * @returns {boolean} - a Boolean indicating whether the attribute exists and, if a truthy comparison value is specified, whether the value of the attribute matches the comparison value.
 * @memberof AbstractNode
 */
AbstractNode.prototype.isAttribute = function (name, expectedValue, fallbackName) {
  var result = this['$attr?'](name, expectedValue, fallbackName)
  return result === Opal.nil ? false : result
}

/**
 * Assign the value to the attribute name for the current node.
 *
 * @param {string} name - The String attribute name to assign
 * @param {*} value - The Object value to assign to the attribute (default: '')
 * @param {boolean} overwrite - A Boolean indicating whether to assign the attribute if currently present in the attributes JSON (default: true)
 *
 * @returns {boolean} - a Boolean indicating whether the assignment was performed
 * @memberof AbstractNode
 */
AbstractNode.prototype.setAttribute = function (name, value, overwrite) {
  if (typeof overwrite === 'undefined') overwrite = true
  return this.$set_attr(name, value, overwrite)
}

/**
 * Remove the attribute from the current node.
 * @param {string} name - The String attribute name to remove
 * @returns {string} - the previous {string} value, or undefined if the attribute was not present.
 * @memberof AbstractNode
 */
AbstractNode.prototype.removeAttribute = function (name) {
  var value = this.$remove_attr(name)
  return value === Opal.nil ? undefined : value
}

/**
 * Get the {@link Document} to which this node belongs.
 *
 * @returns {Document} - the {@link Document} object to which this node belongs.
 * @memberof AbstractNode
 */
AbstractNode.prototype.getDocument = function () {
  return this.document
}

/**
 * Get the {@link AbstractNode} to which this node is attached.
 *
 * @memberof AbstractNode
 * @returns {AbstractNode} - the {@link AbstractNode} object to which this node is attached,
 * or undefined if this node has no parent.
 */
AbstractNode.prototype.getParent = function () {
  var parent = this.parent
  return parent === Opal.nil ? undefined : parent
}

/**
 * @returns {boolean} - true if this {AbstractNode} is an instance of {Inline}
 * @memberof AbstractNode
 */
AbstractNode.prototype.isInline = function () {
  return this['$inline?']()
}

/**
 * @returns {boolean} - true if this {AbstractNode} is an instance of {Block}
 * @memberof AbstractNode
 */
AbstractNode.prototype.isBlock = function () {
  return this['$block?']()
}

/**
 * Checks if the role attribute is set on this node and, if an expected value is given, whether the space-separated role matches that value.
 *
 * @param {string} expectedValue - The expected String value of the role (optional, default: undefined)
 *
 * @returns {boolean} - a Boolean indicating whether the role attribute is set on this node and, if an expected value is given, whether the space-separated role matches that value.
 * @memberof AbstractNode
 */
AbstractNode.prototype.isRole = function (expectedValue) {
  return this['$role?'](expectedValue)
}

/**
 * Retrieves the space-separated String role for this node.
 *
 * @returns {string} - the role as a space-separated String.
 * @memberof AbstractNode
 */
AbstractNode.prototype.getRole = function () {
  return this.$role()
}

/**
 * Checks if the specified role is present in the list of roles for this node.
 *
 * @param {string} name - The String name of the role to find.
 *
 * @returns {boolean} - a Boolean indicating whether this node has the specified role.
 * @memberof AbstractNode
 */
AbstractNode.prototype.hasRole = function (name) {
  return this['$has_role?'](name)
}

/**
 * Retrieves the String role names for this node as an Array.
 *
 * @returns {Array<string>} - the role names as a String {Array}, which is empty if the role attribute is absent on this node.
 * @memberof AbstractNode
 */
AbstractNode.prototype.getRoles = function () {
  return this.$roles()
}

/**
 * Adds the given role directly to this node.
 *
 * @param {string} name - The name of the role to add
 *
 * @returns {boolean} - a Boolean indicating whether the role was added.
 * @memberof AbstractNode
 */
AbstractNode.prototype.addRole = function (name) {
  return this.$add_role(name)
}

/**
 * Public: Removes the given role directly from this node.
 *
 * @param {string} name - The name of the role to remove
 *
 * @returns {boolean} - a Boolean indicating whether the role was removed.
 * @memberof AbstractNode
 */
AbstractNode.prototype.removeRole = function (name) {
  return this.$remove_role(name)
}

/**
 * A convenience method that checks if the reftext attribute is defined.
 * @returns {boolean} - A Boolean indicating whether the reftext attribute is defined
 * @memberof AbstractNode
 */
AbstractNode.prototype.isReftext = function () {
  return this['$reftext?']()
}

/**
 * A convenience method that returns the value of the reftext attribute with substitutions applied.
 * @returns {string|undefined} - the value of the reftext attribute with substitutions applied.
 * @memberof AbstractNode
 */
AbstractNode.prototype.getReftext = function () {
  var reftext = this.$reftext()
  return reftext === Opal.nil ? undefined : reftext
}

/**
 * @returns {string} - Get the context name for this node
 * @memberof AbstractNode
 */
AbstractNode.prototype.getContext = function () {
  var context = this.context
  // Automatically convert Opal pseudo-symbol to String
  return typeof context === 'string' ? context : context.toString()
}

/**
 * @returns {string} - the String id of this node
 * @memberof AbstractNode
 */
AbstractNode.prototype.getId = function () {
  var id = this.id
  return id === Opal.nil ? undefined : id
}

/**
 * @param {string} id - the String id of this node
 * @memberof AbstractNode
 */
AbstractNode.prototype.setId = function (id) {
  this.id = id
}

/**
 * A convenience method to check if the specified option attribute is enabled on the current node.
 * Check if the option is enabled. This method simply checks to see if the <name>-option attribute is defined on the current node.
 *
 * @param {string} name - the String name of the option
 *
 * @return {boolean} - a Boolean indicating whether the option has been specified
 * @memberof AbstractNode
 */
AbstractNode.prototype.isOption = function (name) {
  return this['$option?'](name)
}

/**
 * Set the specified option on this node.
 * This method sets the specified option on this node by setting the <name>-option attribute.
 *
 * @param {string} name - the String name of the option
 *
 * @memberof AbstractNode
 */
AbstractNode.prototype.setOption = function (name) {
  return this.$set_option(name)
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.getIconUri = function (name) {
  return this.$icon_uri(name)
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.getMediaUri = function (target, assetDirKey) {
  return this.$media_uri(target, assetDirKey)
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.getImageUri = function (targetImage, assetDirKey) {
  return this.$image_uri(targetImage, assetDirKey)
}

/**
 * Get the {Converter} instance being used to convert the current {Document}.
 * @returns {Object}
 * @memberof AbstractNode
 */
AbstractNode.prototype.getConverter = function () {
  return this.$converter()
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.readContents = function (target, options) {
  return this.$read_contents(target, toHash(options))
}

/**
 * Read the contents of the file at the specified path.
 * This method assumes that the path is safe to read.
 * It checks that the file is readable before attempting to read it.
 *
 * @param path - the {string} path from which to read the contents
 * @param {Object} options - a JSON {Object} of options to control processing (default: {})
 * @param {boolean} options.warn_on_failure - a {boolean} that controls whether a warning is issued if the file cannot be read (default: false)
 * @param {boolean} options.normalize - a {boolean} that controls whether the lines are normalized and coerced to UTF-8 (default: false)
 *
 * @returns {string} - the String content of the file at the specified path, or undefined if the file does not exist.
 * @memberof AbstractNode
 */
AbstractNode.prototype.readAsset = function (path, options) {
  var result = this.$read_asset(path, toHash(options))
  return result === Opal.nil ? undefined : result
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.normalizeWebPath = function (target, start, preserveTargetUri) {
  return this.$normalize_web_path(target, start, preserveTargetUri)
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.normalizeSystemPath = function (target, start, jail, options) {
  return this.$normalize_system_path(target, start, jail, toHash(options))
}

/**
 * @memberof AbstractNode
 */
AbstractNode.prototype.normalizeAssetPath = function (assetRef, assetName, autoCorrect) {
  return this.$normalize_asset_path(assetRef, assetName, autoCorrect)
}

// Document API

/**
 * The {@link Document} class represents a parsed AsciiDoc document.
 *
 * Document is the root node of a parsed AsciiDoc document.<br/>
 * It provides an abstract syntax tree (AST) that represents the structure of the AsciiDoc document
 * from which the Document object was parsed.
 *
 * Although the constructor can be used to create an empty document object,
 * more commonly, you'll load the document object from AsciiDoc source
 * using the primary API methods on {@link Asciidoctor}.
 * When using one of these APIs, you almost always want to set the safe mode to 'safe' (or 'unsafe')
 * to enable all of Asciidoctor's features.
 *
 * <pre>
 *   var doc = Asciidoctor.load('= Hello, AsciiDoc!', { 'safe': 'safe' })
 *   // => Asciidoctor::Document { doctype: "article", doctitle: "Hello, AsciiDoc!", blocks: 0 }
 * </pre>
 *
 * Instances of this class can be used to extract information from the document or alter its structure.
 * As such, the Document object is most often used in extensions and by integrations.
 *
 * The most basic usage of the Document object is to retrieve the document's title.
 *
 * <pre>
 *  var source = '= Document Title'
 *  var doc = asciidoctor.load(source, { 'safe': 'safe' })
 *  console.log(doc.getTitle()) // 'Document Title'
 * </pre>
 *
 * You can also use the Document object to access document attributes defined in the header, such as the author and doctype.
 * @namespace
 * @extends AbstractBlock
 */
var Document = Opal.Asciidoctor.Document

/**
 * Returns a JSON {Object} of references captured by the processor.
 *
 * @returns {Object} - a JSON {Object} of {AbstractNode} in the document.
 * @memberof Document
 */
Document.prototype.getRefs = function () {
  return fromHash(this.catalog.$$smap.refs)
}

/**
 * Returns an {Array} of {Document/ImageReference} captured by the processor.
 *
 * @returns {Array<ImageReference>} - an {Array} of {Document/ImageReference} in the document.
 * Will return an empty array if the option "catalog_assets: true" was not defined on the processor.
 * @memberof Document
 */
Document.prototype.getImages = function () {
  return this.catalog.$$smap.images
}

/**
 * Returns an {Array} of links captured by the processor.
 *
 * @returns {Array<string>} - an {Array} of links in the document.
 * Will return an empty array if:
 * - the function was called before the document was converted
 * - the option "catalog_assets: true" was not defined on the processor
 * @memberof Document
 */
Document.prototype.getLinks = function () {
  return this.catalog.$$smap.links
}

/**
 * @returns {boolean} - true if the document has footnotes otherwise false
 * @memberof Document
 */
Document.prototype.hasFootnotes = function () {
  return this['$footnotes?']()
}

/**
 * Returns an {Array} of {Document/Footnote} captured by the processor.
 *
 * @returns {Array<Footnote>} - an {Array} of {Document/Footnote} in the document.
 * Will return an empty array if the function was called before the document was converted.
 * @memberof Document
 */
Document.prototype.getFootnotes = function () {
  return this.$footnotes()
}

/**
 * Returns the level-0 {Section} (i.e. the document title).
 * Only stores the title, not the header attributes.
 *
 * @returns {string} - the level-0 {Section}.
 * @memberof Document
 */
Document.prototype.getHeader = function () {
  return this.header
}

/**
 * @memberof Document
 */
Document.prototype.setAttribute = function (name, value) {
  return this.$set_attribute(name, value)
}

/**

 * @memberof Document
 */
Document.prototype.removeAttribute = function (name) {
  this.attributes.$delete(name)
  this.attribute_overrides.$delete(name)
}

/**
 * Convert the AsciiDoc document using the templates loaded by the Converter.
 * If a "template_dir" is not specified, or a template is missing, the converter will fall back to using the appropriate built-in template.
 *
 * @param {Object} [options] - a JSON of options to control processing (default: {})
 *
 * @returns {string}
 * @memberof Document
 */
Document.prototype.convert = function (options) {
  var result = this.$convert(toHash(options))
  return result === Opal.nil ? '' : result
}

/**
 * Write the output to the specified file.
 *
 * If the converter responds to "write", delegate the work of writing the file to that method.
 * Otherwise, write the output the specified file.
 *
 * @param {string} output
 * @param {string} target
 *
 * @memberof Document
 */
Document.prototype.write = function (output, target) {
  return this.$write(output, target)
}

/**
 * @returns {string} - the full name of the author as a String
 * @memberof Document
 */
Document.prototype.getAuthor = function () {
  return this.$author()
}

/**
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getSource = function () {
  return this.$source()
}

/**
 * @returns {Array<string>}
 * @memberof Document
 */
Document.prototype.getSourceLines = function () {
  return this.$source_lines()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.isNested = function () {
  return this['$nested?']()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.isEmbedded = function () {
  return this['$embedded?']()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.hasExtensions = function () {
  return this['$extensions?']()
}

/**
 * Get the value of the doctype attribute for this document.
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getDoctype = function () {
  return this.doctype
}

/**
 * Get the value of the backend attribute for this document.
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getBackend = function () {
  return this.backend
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.isBasebackend = function (base) {
  return this['$basebackend?'](base)
}

/**
 * Get the title explicitly defined in the document attributes.
 * @returns {string}
 * @see {@link AbstractNode#getAttributes}
 * @memberof Document
 */
Document.prototype.getTitle = function () {
  var title = this.$title()
  return title === Opal.nil ? undefined : title
}

/**
 * Set the title on the document header
 *
 * Set the title of the document header to the specified value.
 * If the header does not exist, it is first created.
 *
 * @param {string} title - the String title to assign as the title of the document header
 *
 * @returns {string} - the new String title assigned to the document header
 * @memberof Document
 */
Document.prototype.setTitle = function (title) {
  return this['$title='](title)
}

/**
 * @returns {Document/Title} - a {@link Document/Title}
 * @memberof Document
 */
Document.prototype.getDocumentTitle = function (options) {
  var doctitle = this.$doctitle(toHash(options))
  return doctitle === Opal.nil ? undefined : doctitle
}

/**
 * @see {@link Document#getDocumentTitle}
 * @memberof Document
 */
Document.prototype.getDoctitle = Document.prototype.getDocumentTitle

/**
 * Get the document catalog JSON object.
 * @returns {Object}
 * @memberof Document
 */
Document.prototype.getCatalog = function () {
  return fromHash(this.catalog)
}

/**
 *
 * @returns {Object}
 * @see Document#getCatalog
 * @memberof Document
 */
Document.prototype.getReferences = Document.prototype.getCatalog

/**
 * Get the document revision date from document header (document attribute <code>revdate</code>).
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getRevisionDate = function () {
  return this.getAttribute('revdate')
}

/**
 * @see Document#getRevisionDate
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getRevdate = function () {
  return this.getRevisionDate()
}

/**
 * Get the document revision number from document header (document attribute <code>revnumber</code>).
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getRevisionNumber = function () {
  return this.getAttribute('revnumber')
}

/**
 * Get the document revision remark from document header (document attribute <code>revremark</code>).
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getRevisionRemark = function () {
  return this.getAttribute('revremark')
}

/**
 *  Assign a value to the specified attribute in the document header.
 *
 *  The assignment will be visible when the header attributes are restored,
 *  typically between processor phases (e.g., between parse and convert).
 *
 * @param {string} name - The {string} attribute name to assign
 * @param {Object} value - The {Object} value to assign to the attribute (default: '')
 * @param {boolean} overwrite - A {boolean} indicating whether to assign the attribute
 * if already present in the attributes Hash (default: true)
 *
 * @returns {boolean} - true if the assignment was performed otherwise false
 * @memberof Document
 */
Document.prototype.setHeaderAttribute = function (name, value, overwrite) {
  if (typeof overwrite === 'undefined') overwrite = true
  if (typeof value === 'undefined') value = ''
  return this.$set_header_attribute(name, value, overwrite)
}

/**
 * Convenience method to retrieve the authors of this document as an {Array} of {Document/Author} objects.
 *
 * This method is backed by the author-related attributes on the document.
 *
 * @returns {Array<Author>} - an {Array} of {Document/Author} objects.
 * @memberof Document
 */
Document.prototype.getAuthors = function () {
  return this.$authors()
}

// Document.Footnote API

/**
 * @namespace
 * @module Document/Footnote
 */
var Footnote = Document.Footnote

/**
 * @returns {number} - the footnote's index
 * @memberof Document/Footnote
 */
Footnote.prototype.getIndex = function () {
  var index = this.$$data.index
  return index === Opal.nil ? undefined : index
}

/**
 * @returns {number} - the footnote's id
 * @memberof Document/Footnote
 */
Footnote.prototype.getId = function () {
  var id = this.$$data.id
  return id === Opal.nil ? undefined : id
}

/**
 * @returns {string} - the footnote's text
 * @memberof Document/Footnote
 */
Footnote.prototype.getText = function () {
  var text = this.$$data.text
  return text === Opal.nil ? undefined : text
}

// Document.ImageReference API

/**
 * @class
 * @module Document/ImageReference
 */
var ImageReference = Document.ImageReference

/**
 * @returns {string} - the image's target
 * @memberof Document/ImageReference
 */
ImageReference.prototype.getTarget = function () {
  return this.$$data.target
}

/**
 * @returns {string} - the image's directory (imagesdir attribute)
 * @memberof Document/ImageReference
 */
ImageReference.prototype.getImagesDirectory = function () {
  var value = this.$$data.imagesdir
  return value === Opal.nil ? undefined : value
}

// Document.Author API

/**
 * The Author class represents information about an author extracted from document attributes.
 * @namespace
 * @module Document/Author
 */
var Author = Document.Author

/**
 * @returns {string} - the author's full name
 * @memberof Document/Author
 */
Author.prototype.getName = function () {
  var name = this.$$data.name
  return name === Opal.nil ? undefined : name
}

/**
 * @returns {string} - the author's first name
 * @memberof Document/Author
 */
Author.prototype.getFirstName = function () {
  var firstName = this.$$data.firstname
  return firstName === Opal.nil ? undefined : firstName
}

/**
 * @returns {string} - the author's middle name (or undefined if the author has no middle name)
 * @memberof Document/Author
 */
Author.prototype.getMiddleName = function () {
  var middleName = this.$$data.middlename
  return middleName === Opal.nil ? undefined : middleName
}

/**
 * @returns {string} - the author's last name
 * @memberof Document/Author
 */
Author.prototype.getLastName = function () {
  var lastName = this.$$data.lastname
  return lastName === Opal.nil ? undefined : lastName
}

/**
 * @returns {string} - the author's initials (by default based on the author's name)
 * @memberof Document/Author
 */
Author.prototype.getInitials = function () {
  var initials = this.$$data.initials
  return initials === Opal.nil ? undefined : initials
}

/**
 * @returns {string} - the author's email
 * @memberof Document/Author
 */
Author.prototype.getEmail = function () {
  var email = this.$$data.email
  return email === Opal.nil ? undefined : email
}

// private constructor
Document.RevisionInfo = function (date, number, remark) {
  this.date = date
  this.number = number
  this.remark = remark
}

/**
 * @class
 * @namespace
 * @module Document/RevisionInfo
 */
var RevisionInfo = Document.RevisionInfo

/**
 * Get the document revision date from document header (document attribute <code>revdate</code>).
 * @returns {string}
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.getDate = function () {
  return this.date
}

/**
 * Get the document revision number from document header (document attribute <code>revnumber</code>).
 * @returns {string}
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.getNumber = function () {
  return this.number
}

/**
 * Get the document revision remark from document header (document attribute <code>revremark</code>).
 * A short summary of changes in this document revision.
 * @returns {string}
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.getRemark = function () {
  return this.remark
}

/**
 * @returns {boolean} - true if the revision info is empty (ie. not defined), otherwise false
 * @memberof Document/RevisionInfo
 */
RevisionInfo.prototype.isEmpty = function () {
  return this.date === undefined && this.number === undefined && this.remark === undefined
}

// SafeMode API

/**
 * @namespace
 */
var SafeMode = Opal.Asciidoctor.SafeMode

/**
 * @param {string} name - the name of the security level
 * @returns {number} - the integer value of the corresponding security level
 */
SafeMode.getValueForName = function (name) {
  return this.$value_for_name(name)
}

/**
 * @param {number} value - the integer value of the security level
 * @returns {string} - the name of the corresponding security level
 */
SafeMode.getNameForValue = function (value) {
  var name = this.$name_for_value(value)
  return name === Opal.nil ? undefined : name
}

/**
 * @returns {Array<string>} - the String {Array} of security levels
 */
SafeMode.getNames = function () {
  return this.$names()
}

/**
 * @returns {Document/RevisionInfo} - a {@link Document/RevisionInfo}
 * @memberof Document
 */
Document.prototype.getRevisionInfo = function () {
  return new Document.RevisionInfo(this.getRevisionDate(), this.getRevisionNumber(), this.getRevisionRemark())
}

/**
 * @returns {boolean} - true if the document contains revision info, otherwise false
 * @memberof Document
 */
Document.prototype.hasRevisionInfo = function () {
  var revisionInfo = this.getRevisionInfo()
  return !revisionInfo.isEmpty()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.getNotitle = function () {
  return this.$notitle()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.getNoheader = function () {
  return this.$noheader()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.getNofooter = function () {
  return this.$nofooter()
}

/**
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.hasHeader = function () {
  return this['$header?']()
}

/**
 * Delete the specified attribute from the document if the name is not locked.
 * If the attribute is locked, false is returned.
 * Otherwise, the attribute is deleted.
 *
 * @param {string} name - the String attribute name
 *
 * @returns {boolean} - true if the attribute was deleted, false if it was not because it's locked
 * @memberof Document
 */
Document.prototype.deleteAttribute = function (name) {
  return this.$delete_attribute(name)
}

/**
 * Determine if the attribute has been locked by being assigned in document options.
 *
 * @param {string} key - The attribute key to check
 *
 * @returns {boolean} - true if the attribute is locked, false otherwise
 * @memberof Document
 */
Document.prototype.isAttributeLocked = function (key) {
  return this['$attribute_locked?'](key)
}

/**
 * Parse the AsciiDoc source stored in the {Reader} into an abstract syntax tree.
 *
 * If the data parameter is not nil, create a new {PreprocessorReader} and assigned it to the reader property of this object.
 * Otherwise, continue with the reader that was created when the {Document} was instantiated.
 * Pass the reader to {Parser.parse} to parse the source data into an abstract syntax tree.
 *
 * If parsing has already been performed, this method returns without performing any processing.
 *
 * @param {string|Array<string>} [data] - The optional replacement AsciiDoc source data as a String or String Array. (default: undefined)
 *
 * @returns {Document} - this {Document}
 * @memberof Document
 */
Document.prototype.parse = function (data) {
  return this.$parse(data)
}

/**
 * @memberof Document
 */
Document.prototype.getDocinfo = function (docinfoLocation, suffix) {
  return this.$docinfo(docinfoLocation, suffix)
}

/**
 * @param {string} [docinfoLocation] - A {string} for checking docinfo extensions at a given location (head or footer) (default: head)
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.hasDocinfoProcessors = function (docinfoLocation) {
  return this['$docinfo_processors?'](docinfoLocation)
}

/**
 * Increment the specified counter and store it in the block's attributes.
 *
 * @param {string} counterName - the String name of the counter attribute
 * @param {Block} block - the {Block} on which to save the counter
 *
 * @returns {number} - the next number in the sequence for the specified counter
 * @memberof Document
 */
Document.prototype.incrementAndStoreCounter = function (counterName, block) {
  return this.$increment_and_store_counter(counterName, block)
}

/**
 * @deprecated Please use {Document#incrementAndStoreCounter} method.
 * @memberof Document
 */
Document.prototype.counterIncrement = Document.prototype.incrementAndStoreCounter

/**
 * Get the named counter and take the next number in the sequence.
 *
 * @param {string} name - the String name of the counter
 * @param {string|number} seed - the initial value as a String or Integer
 *
 * @returns {number} the next number in the sequence for the specified counter
 * @memberof Document
 */
Document.prototype.counter = function (name, seed) {
  return this.$counter(name, seed)
}

/**
 * A read-only integer value indicating the level of security that should be enforced while processing this document.
 * The value must be set in the Document constructor using the "safe" option.
 *
 * A value of 0 (UNSAFE) disables any of the security features enforced by Asciidoctor.
 *
 * A value of 1 (SAFE) closely parallels safe mode in AsciiDoc.
 * In particular, it prevents access to files which reside outside of the parent directory of the source file and disables any macro other than the include directive.
 *
 * A value of 10 (SERVER) disallows the document from setting attributes that would affect the conversion of the document,
 * in addition to all the security features of SafeMode.SAFE.
 * For instance, this level forbids changing the backend or source-highlighter using an attribute defined in the source document header.
 * This is the most fundamental level of security for server deployments (hence the name).
 *
 * A value of 20 (SECURE) disallows the document from attempting to read files from the file system and including the contents of them into the document,
 * in addition to all the security features of SafeMode.SECURE.
 * In particular, it disallows use of the include::[] directive and the embedding of binary content (data uri), stylesheets and JavaScripts referenced by the document.
 * (Asciidoctor and trusted extensions may still be allowed to embed trusted content into the document).
 *
 * Since Asciidoctor is aiming for wide adoption, 20 (SECURE) is the default value and is recommended for server deployments.
 *
 * A value of 100 (PARANOID) is planned to disallow the use of passthrough macros and prevents the document from setting any known attributes,
 * in addition to all the security features of SafeMode.SECURE.
 * Please note that this level is not currently implemented (and therefore not enforced)!
 *
 * @returns {number} - An integer value indicating the level of security
 * @memberof Document
 */
Document.prototype.getSafe = function () {
  return this.safe
}

/**
 * Get the Boolean AsciiDoc compatibility mode.
 * Enabling this attribute activates the following syntax changes:
 *
 *   * single quotes as constrained emphasis formatting marks
 *   * single backticks parsed as inline literal, formatted as monospace
 *   * single plus parsed as constrained, monospaced inline formatting
 *   * double plus parsed as constrained, monospaced inline formatting
 *
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.getCompatMode = function () {
  return this.compat_mode
}

/**
 * Get the Boolean flag that indicates whether source map information should be tracked by the parser.
 * @returns {boolean}
 * @memberof Document
 */
Document.prototype.getSourcemap = function () {
  var sourcemap = this.sourcemap
  return sourcemap === Opal.nil ? false : sourcemap
}

/**
 * Get the JSON of document counters.
 * @returns {Object}
 * @memberof Document
 */
Document.prototype.getCounters = function () {
  return fromHash(this.counters)
}

/**
 * @returns {Object}
 * @memberof Document
 */
Document.prototype.getCallouts = function () {
  return this.$callouts()
}

/**
 * Get the String base directory for converting this document.
 *
 * Defaults to directory of the source file.
 * If the source is a string, defaults to the current directory.
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getBaseDir = function () {
  return this.base_dir
}

/**
 * Get the JSON of resolved options used to initialize this {Document}.
 * @returns {Object}
 * @memberof Document
 */
Document.prototype.getOptions = function () {
  return fromHash(this.options)
}

/**
 * Get the outfilesuffix defined at the end of the header.
 * @returns {string}
 * @memberof Document
 */
Document.prototype.getOutfilesuffix = function () {
  return this.outfilesuffix
}

/**
 * Get a reference to the parent Document of this nested document.
 * @returns {Document|undefined}
 * @memberof Document
 */
Document.prototype.getParentDocument = function () {
  var parentDocument = this.parent_document
  return parentDocument === Opal.nil ? undefined : parentDocument
}

/**
 * Get the {Reader} associated with this document.
 * @returns {Object}
 * @memberof Document
 */
Document.prototype.getReader = function () {
  return this.reader
}

/**
 * Get the {Converter} instance being used to convert the current {Document}.
 * @returns {Object}
 * @memberof Document
 */
Document.prototype.getConverter = function () {
  return this.converter
}

/**
 * Get the activated {Extensions.Registry} associated with this document.
 * @returns {Extensions/Registry}
 * @memberof Document
 */
Document.prototype.getExtensions = function () {
  var extensions = this.extensions
  return extensions === Opal.nil ? undefined : extensions
}

// Document.Title API

/**
 * A partitioned title (i.e., title & subtitle).
 * @namespace
 * @module Document/Title
 */
var Title = Document.Title

/**
 * @returns {string}
 * @memberof Document/Title
 */
Title.prototype.getMain = function () {
  return this.main
}

/**
 * @returns {string}
 * @memberof Document/Title
 */
Title.prototype.getCombined = function () {
  return this.combined
}

/**
 * @returns {string}
 * @memberof Document/Title
 */
Title.prototype.getSubtitle = function () {
  var subtitle = this.subtitle
  return subtitle === Opal.nil ? undefined : subtitle
}

/**
 * @returns {boolean}
 * @memberof Document/Title
 */
Title.prototype.isSanitized = function () {
  var sanitized = this['$sanitized?']()
  return sanitized === Opal.nil ? false : sanitized
}

/**
 * @returns {boolean}
 * @memberof Document/Title
 */
Title.prototype.hasSubtitle = function () {
  return this['$subtitle?']()
}

// Inline API

/**
 * Methods for managing inline elements in AsciiDoc block.
 * @namespace
 * @extends AbstractNode
 */
var Inline = Opal.Asciidoctor.Inline

/**
 * Create a new Inline element.
 * @param {AbstractBlock} parent
 * @param {string} context
 * @param {string|undefined} text
 * @param {Object|undefined} opts
 * @returns {Inline} - a new Inline element
 * @memberof Inline
 */
Inline.create = function (parent, context, text, opts) {
  return this.$new(parent, context, text, toHash(opts))
}

/**
 * Get the converted content for this inline node.
 *
 * @returns {string} - the converted String content for this inline node
 * @memberof Inline
 */
Inline.prototype.convert = function () {
  return this.$convert()
}

/**
 * Get the converted String text of this Inline node, if applicable.
 *
 * @returns {string|undefined} - the converted String text for this Inline node, or undefined if not applicable for this node.
 * @memberof Inline
 */
Inline.prototype.getText = function () {
  var text = this.$text()
  return text === Opal.nil ? undefined : text
}

/**
 * Get the String sub-type (aka qualifier) of this Inline node.
 *
 * This value is used to distinguish different variations of the same node
 * category, such as different types of anchors.
 *
 * @returns {string} - the string sub-type of this Inline node.
 * @memberof Inline
 */
Inline.prototype.getType = function () {
  return this.$type()
}

/**
 * Get the primary String target of this Inline node.
 *
 * @returns {string|undefined} - the string target of this Inline node.
 * @memberof Inline
 */
Inline.prototype.getTarget = function () {
  var target = this.$target()
  return target === Opal.nil ? undefined : target
}

// List API

/**
 * @namespace
 * @extends AbstractBlock
 */
var List = Opal.Asciidoctor.List

/**
 * Checks if the {@link List} contains any child {@link ListItem}.
 *
 * @memberof List
 * @returns {boolean} - whether the {@link List} has child {@link ListItem}.
 */
List.prototype.hasItems = function () {
  return this['$items?']()
}

/**
 * Get the Array of {@link ListItem} nodes for this {@link List}.
 *
 * @returns {Array<ListItem>} - an Array of {@link ListItem} nodes.
 * @memberof List
 */
List.prototype.getItems = function () {
  return this.blocks
}

// ListItem API

/** @namespace */
var ListItem = Opal.Asciidoctor.ListItem

/**
 * Get the converted String text of this {@link ListItem} node.
 *
 * @returns {string} - the converted String text for this {@link ListItem} node.
 * @memberof ListItem
 */
ListItem.prototype.getText = function () {
  return this.$text()
}

/**
 * Set the String source text of this {@link ListItem} node.
 *
 * @returns {string} - the new String text assigned to this {@link ListItem}
 * @memberof ListItem
 */
ListItem.prototype.setText = function (text) {
  return this['$text='](text)
}

/**
 * A convenience method that checks whether the text of this {@link ListItem} is not blank (i.e. not undefined or empty string).
 *
 * @returns {boolean} - whether the text is not blank
 * @memberof ListItem
 */
ListItem.prototype.hasText = function () {
  return this['$text?']()
}

/**
 * Get the {string} used to mark this {@link ListItem}.
 *
 * @returns {string}
 * @memberof ListItem
 */
ListItem.prototype.getMarker = function () {
  return this.marker
}

/**
 * Set the {string} used to mark this {@link ListItem}.
 *
 * @param {string} marker - the {string} used to mark this {@link ListItem}
 * @memberof ListItem
 */
ListItem.prototype.setMarker = function (marker) {
  this.marker = marker
}

/**
 * Get the {@link List} to which this {@link ListItem} is attached.
 *
 * @returns {List} - the {@link List} object to which this {@link ListItem} is attached,
 * or undefined if this node has no parent.
 * @memberof ListItem
 */
ListItem.prototype.getList = function () {
  return this.$list()
}

/**
 * @see {@link ListItem#getList}
 * @memberof ListItem
 */
ListItem.prototype.getParent = ListItem.prototype.getList

// Reader API

/** @namespace */
var Reader = Opal.Asciidoctor.Reader

/**
 * Push source onto the front of the reader and switch the context based on the file, document-relative path and line information given.
 *
 * This method is typically used in an IncludeProcessor to add source read from the target specified.
 *
 * @param {string} data
 * @param {string|undefined} file
 * @param {string|undefined} path
 * @param {number} lineno - The line number
 * @param {Object} attributes - a JSON of attributes
 * @returns {Reader} - this {Reader} object.
 * @memberof Reader
 */
Reader.prototype.pushInclude = function (data, file, path, lineno, attributes) {
  return this.$push_include(data, file, path, lineno, toHash(attributes))
}

/**
 * Get the current location of the reader's cursor, which encapsulates the file, dir, path, and lineno of the file being read.
 *
 * @returns {Cursor}
 * @memberof Reader
 */
Reader.prototype.getCursor = function () {
  return this.$cursor()
}

/**
 * Get the remaining unprocessed lines, without consuming them, as an {Array} of {string}.
 *
 * Lines will not be consumed from the Reader (ie. you will be able to read these lines again).
 *
 * @returns {Array<string>} - the remaining unprocessed lines as an {Array} of {string}.
 * @memberof Reader
 */
Reader.prototype.getLines = function () {
  return this.$lines()
}

/**
 * Get the remaining unprocessed lines, without consuming them, as a {string}.
 *
 * Lines will not be consumed from the Reader (ie. you will be able to read these lines again).
 *
 * @returns {string} - the remaining unprocessed lines as a {string} (joined by linefeed characters).
 * @memberof Reader
 */
Reader.prototype.getString = function () {
  return this.$string()
}

/**
 * Check whether there are any lines left to read.
 * If a previous call to this method resulted in a value of false, immediately returned the cached value.
 * Otherwise, delegate to peekLine to determine if there is a next line available.
 *
 * @returns {boolean} - true if there are more lines, false if there are not.
 * @memberof Reader
 */
Reader.prototype.hasMoreLines = function () {
  return this['$has_more_lines?']()
}

/**
 * Check whether this reader is empty (contains no lines).
 *
 * @returns {boolean} - true if there are no more lines to peek, otherwise false.
 * @memberof Reader
 */
Reader.prototype.isEmpty = function () {
  return this['$empty?']()
}

/**
 * Peek at the next line.
 * Processes the line if not already marked as processed, but does not consume it (ie. you will be able to read this line again).
 *
 * This method will probe the reader for more lines.
 * If there is a next line that has not previously been visited, the line is passed to the Reader#processLine method to be initialized.
 * This call gives sub-classes the opportunity to do preprocessing.
 * If the return value of the Reader#processLine is undefined, the data is assumed to be changed and Reader#peekLine is invoked again to perform further processing.
 *
 * If hasMoreLines is called immediately before peekLine, the direct flag is implicitly true (since the line is flagged as visited).
 *
 * @param {boolean} direct - A {boolean} flag to bypasses the check for more lines and immediately returns the first element of the internal lines {Array}. (default: false)
 * @returns {string} - the next line as a {string} if there are lines remaining.
 * @memberof Reader
 */
Reader.prototype.peekLine = function (direct) {
  direct = direct || false
  var line = this['$peek_line'](direct)
  return line === Opal.nil ? undefined : line
}

/**
 * Consume, preprocess, and return the next line.
 *
 * Line will be consumed from the Reader (ie. you won't be able to read this line again).
 *
 * @returns {string} - the next line as a {string} if data is present.
 * @memberof Reader
 */
Reader.prototype.readLine = function () {
  var line = this['$read_line']()
  return line === Opal.nil ? undefined : line
}

/**
 * Consume, preprocess, and return the remaining lines.
 *
 * This method calls Reader#readLine repeatedly until all lines are consumed and returns the lines as an {Array} of {string}.
 * This method differs from Reader#getLines in that it processes each line in turn, hence triggering any preprocessors implemented in sub-classes.
 *
 * Lines will be consumed from the Reader (ie. you won't be able to read these lines again).
 *
 * @returns {Array<string>} - the lines read as an {Array} of {string}.
 * @memberof Reader
 */
Reader.prototype.readLines = function () {
  return this['$read_lines']()
}

/**
 * Consume, preprocess, and return the remaining lines joined as a {string}.
 *
 * Delegates to Reader#readLines, then joins the result.
 *
 * Lines will be consumed from the Reader (ie. you won't be able to read these lines again).
 *
 * @returns {string} - the lines read joined as a {string}
 * @memberof Reader
 */
Reader.prototype.read = function () {
  return this['$read']()
}

// Cursor API

/** @namespace */
var Cursor = Opal.Asciidoctor.Reader.Cursor

/**
 * Get the file associated to the cursor.
 * @returns {string|undefined}
 * @memberof Cursor
 */
Cursor.prototype.getFile = function () {
  var file = this.file
  return file === Opal.nil ? undefined : file
}

/**
 * Get the directory associated to the cursor.
 * @returns {string|undefined} - the directory associated to the cursor
 * @memberof Cursor
 */
Cursor.prototype.getDirectory = function () {
  var dir = this.dir
  return dir === Opal.nil ? undefined : dir
}

/**
 * Get the path associated to the cursor.
 * @returns {string|undefined} - the path associated to the cursor (or '<stdin>')
 * @memberof Cursor
 */
Cursor.prototype.getPath = function () {
  var path = this.path
  return path === Opal.nil ? undefined : path
}

/**
 * Get the line number of the cursor.
 * @returns {number|undefined} - the line number of the cursor
 * @memberof Cursor
 */
Cursor.prototype.getLineNumber = function () {
  return this.lineno
}

// Logger API (available in Asciidoctor 1.5.7+)

function initializeLoggerFormatterClass (className, functions) {
  var superclass = Opal.const_get_qualified(Opal.Logger, 'Formatter')
  return initializeClass(superclass, className, functions, {}, {
    'call': function (args) {
      for (var i = 0; i < args.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof args[i] === 'object' && '$$smap' in args[i]) {
          args[i] = fromHash(args[i])
        }
      }
      return args
    }
  })
}

function initializeLoggerClass (className, functions) {
  var superClass = Opal.const_get_qualified(Opal.Asciidoctor, 'Logger')
  return initializeClass(superClass, className, functions, {}, {
    'add': function (args) {
      if (args.length >= 2 && typeof args[2] === 'object' && '$$smap' in args[2]) {
        var message = args[2]
        var messageObject = fromHash(message)
        messageObject.getText = function () {
          return this['text']
        }
        messageObject.getSourceLocation = function () {
          return this['source_location']
        }
        messageObject['$inspect'] = function () {
          var sourceLocation = this.getSourceLocation()
          if (sourceLocation) {
            return sourceLocation.getPath() + ': line ' + sourceLocation.getLineNumber() + ': ' + this.getText()
          } else {
            return this.getText()
          }
        }
        args[2] = messageObject
      }
      if (args.length >= 1) {
        args[1] = args[1] === Opal.nil ? undefined : args[1]
      }
      return args
    }
  })
}

/**
 * @namespace
 */
var LoggerManager = Opal.const_get_qualified(Opal.Asciidoctor, 'LoggerManager', true)

// Alias
Opal.Asciidoctor.LoggerManager = LoggerManager

LoggerManager.getLogger = function () {
  return this.$logger()
}

LoggerManager.setLogger = function (logger) {
  this.logger = logger
}

LoggerManager.newLogger = function (name, functions) {
  return initializeLoggerClass(name, functions).$new()
}

LoggerManager.newFormatter = function (name, functions) {
  return initializeLoggerFormatterClass(name, functions).$new()
}

/**
 * @namespace
 */
var LoggerSeverity = Opal.const_get_qualified(Opal.Logger, 'Severity', true)

// Alias
Opal.Asciidoctor.LoggerSeverity = LoggerSeverity

LoggerSeverity.get = function (severity) {
  return LoggerSeverity.$constants()[severity]
}

/**
 * @namespace
 */
var LoggerFormatter = Opal.const_get_qualified(Opal.Logger, 'Formatter', true)

// Alias
Opal.Asciidoctor.LoggerFormatter = LoggerFormatter

LoggerFormatter.prototype.call = function (severity, time, programName, message) {
  return this.$call(LoggerSeverity.get(severity), time, programName, message)
}

/**
 * @namespace
 */
var MemoryLogger = Opal.const_get_qualified(Opal.Asciidoctor, 'MemoryLogger', true)

// Alias
Opal.Asciidoctor.MemoryLogger = MemoryLogger

MemoryLogger.create = function () {
  return this.$new()
}
MemoryLogger.prototype.getMessages = function () {
  var messages = this.messages
  var result = []
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i]
    var messageObject = fromHash(message)
    if (typeof messageObject.message === 'string') {
      messageObject.getText = function () {
        return this.message
      }
    } else {
      // also convert the message attribute
      messageObject.message = fromHash(messageObject.message)
      messageObject.getText = function () {
        return this.message['text']
      }
    }
    messageObject.getSeverity = function () {
      return this.severity.toString()
    }
    messageObject.getSourceLocation = function () {
      return this.message['source_location']
    }
    result.push(messageObject)
  }
  return result
}

var Logging = Opal.const_get_qualified(Opal.Asciidoctor, 'Logging', true)

Opal.Asciidoctor.Logging = Logging

Logging.getLogger = function () {
  return LoggerManager.$logger()
}

Logging.createLogMessage = function (text, context) {
  return Logging.prototype.$message_with_context(text, toHash(context))
}

// alias
Reader.prototype.getLogger = Logging.getLogger
Reader.prototype.createLogMessage = Logging.createLogMessage

AbstractNode.prototype.getLogger = Logging.getLogger
AbstractNode.prototype.createLogMessage = Logging.createLogMessage

/**
 * @namespace
 */
var Logger = Opal.const_get_qualified(Opal.Asciidoctor, 'Logger', true)

// Alias
Opal.Asciidoctor.Logger = Logger

Logger.prototype.getMaxSeverity = function () {
  var result = this.max_severity
  return result === Opal.nil ? undefined : result
}
Logger.prototype.getFormatter = function () {
  return this.formatter
}
Logger.prototype.setFormatter = function (formatter) {
  this.formatter = formatter
}
Logger.prototype.getLevel = function () {
  return this.level
}
Logger.prototype.setLevel = function (level) {
  this.level = level
}
Logger.prototype.getProgramName = function () {
  return this.progname
}
Logger.prototype.setProgramName = function (programName) {
  this.progname = programName
}

var RubyLogger = Opal.const_get_qualified('::', 'Logger')

var log = function (logger, level, message) {
  logger['$' + level](message)
}
RubyLogger.prototype.add = function (severity, message, programName) {
  var severityValue = typeof severity === 'string' ? LoggerSeverity[severity.toUpperCase()] : severity
  this['$add'](severityValue, message, programName)
}
RubyLogger.prototype.log = RubyLogger.prototype.add
RubyLogger.prototype.debug = function (message) {
  log(this, 'debug', message)
}
RubyLogger.prototype.info = function (message) {
  log(this, 'info', message)
}
RubyLogger.prototype.warn = function (message) {
  log(this, 'warn', message)
}
RubyLogger.prototype.error = function (message) {
  log(this, 'error', message)
}
RubyLogger.prototype.fatal = function (message) {
  log(this, 'fatal', message)
}
RubyLogger.prototype.isDebugEnabled = function () {
  return this['$debug?']()
}
RubyLogger.prototype.isInfoEnabled = function () {
  return this['$info?']()
}
RubyLogger.prototype.isWarnEnabled = function () {
  return this['$warn?']()
}
RubyLogger.prototype.isErrorEnabled = function () {
  return this['$error?']()
}
RubyLogger.prototype.isFatalEnabled = function () {
  return this['$fatal?']()
}

/**
 * @namespace
 */
var NullLogger = Opal.const_get_qualified(Opal.Asciidoctor, 'NullLogger', true)

// Alias
Opal.Asciidoctor.NullLogger = NullLogger

NullLogger.create = function () {
  return this.$new()
}
NullLogger.prototype.getMaxSeverity = function () {
  return this.max_severity
}

// Alias
Opal.Asciidoctor.StopIteration = Opal.StopIteration

/**
 * @namespace
 */
var Timings = Opal.const_get_qualified(Opal.Asciidoctor, 'Timings', true)

// Alias
Opal.Asciidoctor.Timings = Timings

Timings.create = function () {
  return this.$new()
}

Timings.prototype.printReport = function (to, subject) {
  var outputFunction
  if (to) {
    if (typeof to['$add'] === 'function') {
      outputFunction = function (message) {
        to['$add'](1, message)
      }
    } else if (typeof to.log === 'function') {
      outputFunction = to.log
    } else if (typeof to.write === 'function') {
      outputFunction = function (message) {
        to.write(message, 'utf-8')
      }
    } else {
      throw new Error('The output should be a Stream (with a write function), an object with a log function or a Ruby Logger (with a add function)')
    }
  } else {
    outputFunction = function (message) {
      Opal.gvars.stdout['$write'](message)
    }
  }
  if (subject) {
    outputFunction('Input file: ' + subject)
  }
  outputFunction(' Time to read and parse source: ' + this.$read_parse().toFixed(2))
  outputFunction(' Time to convert document: ' + this.$convert().toFixed(2))
  outputFunction(' Total time (read, parse and convert): ' + this.$read_parse_convert().toFixed(2))
}

/**
 * @namespace
 * @description
 * This API is experimental and subject to change.
 *
 * A pluggable adapter for integrating a syntax (aka code) highlighter into AsciiDoc processing.
 *
 * There are two types of syntax highlighter adapters. The first performs syntax highlighting during the convert phase.
 * This adapter type must define a "handlesHighlighting" method that returns true.
 * The companion "highlight" method will then be called to handle the "specialcharacters" substitution for source blocks.
 *
 * The second assumes syntax highlighting is performed on the client (e.g., when the HTML document is loaded).
 * This adapter type must define a "hasDocinfo" method that returns true.
 * The companion "docinfo" method will then be called to insert markup into the output document.
 * The docinfo functionality is available to both adapter types.
 *
 * Asciidoctor.js provides several a built-in adapter for highlight.js.
 * Additional adapters can be registered using SyntaxHighlighter.register.
 */
var SyntaxHighlighter = Opal.const_get_qualified(Opal.Asciidoctor, 'SyntaxHighlighter', true)

// Alias
Opal.Asciidoctor.SyntaxHighlighter = SyntaxHighlighter

/**
 * Associates the syntax highlighter class or object with the specified names.
 *
 * @description This API is experimental and subject to change.
 *
 * @param {string|Array} names - A {string} name or an {Array} of {string} names
 * @param functions - A {SyntaxHighlighter} Class or Object instance
 * @memberof SyntaxHighlighter
 */
SyntaxHighlighter.register = function (names, functions) {
  var name = typeof names === 'string' ? names : names[0]
  if (typeof functions === 'function') {
    var classObject = functions
    var prototype = classObject.prototype
    var properties = Object.getOwnPropertyNames(prototype)
    functions = {}
    for (var propertyIdx in properties) {
      var propertyName = properties[propertyIdx]
      functions[propertyName] = prototype[propertyName]
    }
  }
  var scope = initializeClass(SyntaxHighlighterBase, name, functions, {}, {
    'format': function (args) {
      if (args.length >= 2 && typeof args[2] === 'object' && '$$smap' in args[2]) {
        args[2] = fromHash(args[2])
      }
      if (args.length >= 1) {
        args[1] = args[1] === Opal.nil ? undefined : args[1]
      }
      return args
    },
    'highlight': function (args) {
      if (args.length >= 3 && typeof args[3] === 'object' && '$$smap' in args[3]) {
        var opts = args[3]
        opts = fromHash(opts)
        for (var key in opts) {
          var value = opts[key]
          if (key === 'callouts') {
            var callouts = fromHashKeys(value)
            for (var idx in callouts) {
              var callout = callouts[idx]
              for (var i = 0; i < callout.length; i++) {
                var items = callout[i]
                for (var j = 0; j < items.length; j++) {
                  items[j] = items[j] === Opal.nil ? undefined : items[j]
                }
              }
            }
            opts[key] = callouts
          } else {
            opts[key] = value === Opal.nil ? undefined : value
          }
        }
        args[3] = opts
      }
      if (args.length >= 2) {
        args[2] = args[2] === Opal.nil ? undefined : args[2]
      }
      return args
    }
  })
  for (var functionName in functions) {
    if (functions.hasOwnProperty(functionName)) {
      (function (functionName) {
        var userFunction = functions[functionName]
        if (functionName === 'handlesHighlighting') {
          Opal.def(scope, '$highlight?', function () {
            return userFunction.call()
          })
        } else if (functionName === 'hasDocinfo') {
          Opal.def(scope, '$docinfo?', function (location) {
            return userFunction.apply(this, [location])
          })
        }
      }(functionName))
    }
  }
  Opal.def(scope, '$name', function () {
    return name
  })
  SyntaxHighlighter['$register'](scope, names)
  return scope
}

/**
 * Retrieves the syntax highlighter class or object registered for the specified name.
 *
 * @description This API is experimental and subject to change.
 *
 * @param {string} name - The {string} name of the syntax highlighter to retrieve.
 * @returns {SyntaxHighlighter} - the {SyntaxHighlighter} Class or Object instance registered for this name.
 * @memberof SyntaxHighlighter
 */
SyntaxHighlighter.for = function (name) {
  var result = SyntaxHighlighter.$for(name)
  return result === Opal.nil ? undefined : result
}

/**
 * @namespace
 */
var SyntaxHighlighterBase = Opal.const_get_qualified(SyntaxHighlighter, 'Base', true)

// Alias
Opal.Asciidoctor.SyntaxHighlighterBase = SyntaxHighlighterBase

/**
 * Statically register the current class in the registry for the specified names.
 *
 * @description This API is experimental and subject to change.
 *
 * @param {string|Array<string>} names - A {string} name or an {Array} of {string} names
 * @memberof SyntaxHighlighterBase
 */
SyntaxHighlighterBase.prototype.registerFor = function (names) {
  SyntaxHighlighter['$register'](this, names)
}
