/* global Opal, fromHash, toHash, initializeClass */
// Extensions API

/**
 * @private
 */
const toBlock = function (block) {
  // arity is a mandatory field
  block.$$arity = block.length
  return block
}

const registerExtension = function (registry, type, processor, name) {
  if (typeof processor === 'object' || processor.$$is_class) {
    // processor is an instance or a class
    return registry['$' + type](processor, name)
  } else {
    // processor is a function/lambda
    return Opal.send(registry, type, name && [name], toBlock(processor))
  }
}

/**
 * @namespace
 * @description
 * Extensions provide a way to participate in the parsing and converting
 * phases of the AsciiDoc processor or extend the AsciiDoc syntax.
 *
 * The various extensions participate in AsciiDoc processing as follows:
 *
 * 1. After the source lines are normalized, {{@link Extensions/Preprocessor}}s modify or replace
 *    the source lines before parsing begins. {{@link Extensions/IncludeProcessor}}s are used to
 *    process include directives for targets which they claim to handle.
 * 2. The Parser parses the block-level content into an abstract syntax tree.
 *    Custom blocks and block macros are processed by associated {{@link Extensions/BlockProcessor}}s
 *    and {{@link Extensions/BlockMacroProcessor}}s, respectively.
 * 3. {{@link Extensions/TreeProcessor}}s are run on the abstract syntax tree.
 * 4. Conversion of the document begins, at which point inline markup is processed
 *    and converted. Custom inline macros are processed by associated {InlineMacroProcessor}s.
 * 5. {{@link Extensions/Postprocessor}}s modify or replace the converted document.
 * 6. The output is written to the output stream.
 *
 * Extensions may be registered globally using the {Extensions.register} method
 * or added to a custom {Registry} instance and passed as an option to a single
 * Asciidoctor processor.
 *
 * @example
 * asciidoctor.Extensions.register(function () {
 *   this.block(function () {
 *     const self = this
 *     self.named('shout')
 *     self.onContext('paragraph')
 *     self.process(function (parent, reader) {
 *       const lines = reader.getLines().map(function (l) { return l.toUpperCase(); })
 *       return self.createBlock(parent, 'paragraph', lines)
 *     })
 *   })
 * })
 */
const Extensions = Opal.const_get_qualified(Opal.Asciidoctor, 'Extensions')

// Alias
Opal.Asciidoctor.Extensions = Extensions

/**
 * Create a new {@link Extensions/Registry}.
 * @param {string} name
 * @param {function} block
 * @memberof Extensions
 * @returns {Extensions/Registry} - returns a {@link Extensions/Registry}
 */
Extensions.create = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'create', null, toBlock(name))
  } else if (typeof block === 'function') {
    return Opal.send(this, 'create', [name], toBlock(block))
  } else {
    return this.$create()
  }
}

/**
 * @memberof Extensions
 */
Extensions.register = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'register', null, toBlock(name))
  } else {
    return Opal.send(this, 'register', [name], toBlock(block))
  }
}

/**
 * Get statically-registered extension groups.
 * @memberof Extensions
 */
Extensions.getGroups = function () {
  return fromHash(this.$groups())
}

/**
 * Unregister all statically-registered extension groups.
 * @memberof Extensions
 */
Extensions.unregisterAll = function () {
  this.$unregister_all()
}

/**
 * Unregister the specified statically-registered extension groups.
 *
 * NOTE Opal cannot delete an entry from a Hash that is indexed by symbol, so
 * we have to resort to using low-level operations in this method.
 *
 * @memberof Extensions
 */
Extensions.unregister = function () {
  const names = Array.prototype.concat.apply([], arguments)
  const groups = this.$groups()
  const groupNameIdx = {}
  let i = 0
  const groupSymbolNames = groups.$$keys
  for (; i < groupSymbolNames.length; i++) {
    const groupSymbolName = groupSymbolNames[i]
    groupNameIdx[groupSymbolName.toString()] = groupSymbolName
  }
  for (let j = 0; j < names.length; j++) {
    const groupStringName = names[j]
    if (groupStringName in groupNameIdx) Opal.hash_delete(groups, groupNameIdx[groupStringName])
  }
}

/**
 * @namespace
 * @module Extensions/Registry
 */
const Registry = Extensions.Registry

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.getGroups = Extensions.getGroups

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.unregisterAll = function () {
  this.groups = Opal.hash()
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.unregister = Extensions.unregister

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.prefer = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  if (typeof processor === 'object' || processor.$$is_class) {
    // processor is an instance or a class
    return this.$prefer(name, processor)
  } else {
    // processor is a function/lambda
    return Opal.send(this, 'prefer', name && [name], toBlock(processor))
  }
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.block = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'block', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.inlineMacro = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'inline_macro', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.includeProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'include_processor', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.blockMacro = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'block_macro', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.treeProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'tree_processor', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.postprocessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'postprocessor', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.preprocessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'preprocessor', processor, name)
}

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.docinfoProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name
    name = null
  }
  return registerExtension(this, 'docinfo_processor', processor, name)
}

/**
 * Checks whether any {{@link Extensions/Preprocessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/Preprocessor}} extensions are registered.
 */
Registry.prototype.hasPreprocessors = function () {
  return this['$preprocessors?']()
}

/**
 * Checks whether any {{@link Extensions/TreeProcessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/TreeProcessor}} extensions are registered.
 */
Registry.prototype.hasTreeProcessors = function () {
  return this['$tree_processors?']()
}

/**
 * Checks whether any {{@link Extensions/IncludeProcessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/IncludeProcessor}} extensions are registered.
 */
Registry.prototype.hasIncludeProcessors = function () {
  return this['$include_processors?']()
}

/**
 * Checks whether any {{@link Extensions/Postprocessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/Postprocessor}} extensions are registered.
 */
Registry.prototype.hasPostprocessors = function () {
  return this['$postprocessors?']()
}

/**
 * Checks whether any {{@link Extensions/DocinfoProcessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @param location - A {string} for selecting docinfo extensions at a given location (head or footer) (default: undefined)
 * @returns a {boolean} indicating whether any {{@link Extensions/DocinfoProcessor}} extensions are registered.
 */
Registry.prototype.hasDocinfoProcessors = function (location) {
  return this['$docinfo_processors?'](location)
}

/**
 * Checks whether any {{@link Extensions/BlockProcessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/BlockProcessor}} extensions are registered.
 */
Registry.prototype.hasBlocks = function () {
  return this['$blocks?']()
}

/**
 * Checks whether any {{@link Extensions/BlockMacroProcessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/BlockMacroProcessor}} extensions are registered.
 */
Registry.prototype.hasBlockMacros = function () {
  return this['$block_macros?']()
}

/**
 * Checks whether any {{@link Extensions/InlineMacroProcessor}} extensions have been registered.
 *
 * @memberof Extensions/Registry
 * @returns a {boolean} indicating whether any {{@link Extensions/InlineMacroProcessor}} extensions are registered.
 */
Registry.prototype.hasInlineMacros = function () {
  return this['$inline_macros?']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/Preprocessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getPreprocessors = function () {
  return this.$preprocessors()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/TreeProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getTreeProcessors = function () {
  return this.$tree_processors()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/IncludeProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getIncludeProcessors = function () {
  return this.$include_processors()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/Postprocessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getPostprocessors = function () {
  return this.$postprocessors()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/DocinfoProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @param location - A {string} for selecting docinfo extensions at a given location (head or footer) (default: undefined)
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getDocinfoProcessors = function (location) {
  return this.$docinfo_processors(location)
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/BlockProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getBlocks = function () {
  return this.block_extensions.$values()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/BlockMacroProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getBlockMacros = function () {
  return this.block_macro_extensions.$values()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/InlineMacroProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getInlineMacros = function () {
  return this.$inline_macros()
}

/**
 * Get any {{@link Extensions/InlineMacroProcessor}} extensions are registered to handle the specified inline macro name.
 *
 * @param name - the {string} inline macro name
 * @memberof Extensions/Registry
 * @returns the Extension proxy object for the {{@link Extensions/InlineMacroProcessor}} that matches the inline macro name or undefined if no match is found.
 */
Registry.prototype.getInlineMacroFor = function (name) {
  const result = this['$registered_for_inline_macro?'](name)
  return result === false ? undefined : result
}

/**
 * Get any {{@link Extensions/BlockProcessor}} extensions are registered to handle the specified block name appearing on the specified context.
 * @param name - the {string} block name
 * @param context - the context of the block: paragraph, open... (optional)
 * @memberof Extensions/Registry
 * @returns the Extension proxy object for the {{@link Extensions/BlockProcessor}} that matches the block name and context or undefined if no match is found.
 */
Registry.prototype.getBlockFor = function (name, context) {
  if (typeof context === 'undefined') {
    const ext = this.$find_block_extension(name)
    return ext === Opal.nil ? undefined : ext
  }
  const result = this['$registered_for_block?'](name, context)
  return result === false ? undefined : result
}

/**
 * Get any {{@link Extensions/BlockMacroProcessor}} extensions are registered to handle the specified macro name.
 *
 * @param name - the {string} macro name
 * @memberof Extensions/Registry
 * @returns the Extension proxy object for the {{@link Extensions/BlockMacroProcessor}} that matches the macro name or undefined if no match is found.
 */
Registry.prototype.getBlockMacroFor = function (name) {
  const result = this['$registered_for_block_macro?'](name)
  return result === false ? undefined : result
}

/**
 * @namespace
 * @module Extensions/Processor
 */
const Processor = Extensions.Processor

/**
 * The extension will be added to the beginning of the list for that extension type. (default is append).
 * @memberof Extensions/Processor
 * @deprecated Please use the <code>prefer</pre> function on the {@link Extensions/Registry},
 * the {@link Extensions/IncludeProcessor},
 * the {@link Extensions/TreeProcessor},
 * the {@link Extensions/Postprocessor},
 * the {@link Extensions/Preprocessor}
 * or the {@link Extensions/DocinfoProcessor}
 */
Processor.prototype.prepend = function () {
  this.$option('position', '>>')
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.process = function (block) {
  const handler = {
    apply: function (target, thisArg, argumentsList) {
      for (let i = 0; i < argumentsList.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof argumentsList[i] === 'object' && '$$smap' in argumentsList[i]) {
          argumentsList[i] = fromHash(argumentsList[i])
        }
      }
      return target.apply(thisArg, argumentsList)
    }
  }
  const blockProxy = new Proxy(block, handler)
  return Opal.send(this, 'process', null, toBlock(blockProxy))
}

/**
 * @param {string} name
 * @memberof Extensions/Processor
 */
Processor.prototype.named = function (name) {
  return this.$named(name)
}

/**
 * Creates a block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string} context
 * @param {string|Array<string>} source
 * @param {Object|undefined} attrs - A JSON of attributes
 * @param {Object|undefined} opts - A JSON of options
 * @return {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createBlock = function (parent, context, source, attrs, opts) {
  return this.$create_block(parent, context, source, toHash(attrs), toHash(opts))
}

/**
 * Creates a list block node and links it to the specified parent.
 *
 * @param parent - The parent Block (Block, Section, or Document) of this new list block.
 * @param {string} context - The list context (e.g., ulist, olist, colist, dlist)
 * @param {Object} attrs - An object of attributes to set on this list block
 * @returns {List}
 * @memberof Extensions/Processor
 */
Processor.prototype.createList = function (parent, context, attrs) {
  return this.$create_list(parent, context, toHash(attrs))
}

/**
 * Creates a list item node and links it to the specified parent.
 *
 * @param {List} parent - The parent {List} of this new list item block.
 * @param {string} text - The text of the list item.
 * @returns {ListItem}
 * @memberof Extensions/Processor
 */
Processor.prototype.createListItem = function (parent, text) {
  return this.$create_list_item(parent, text)
}

/**
 * Creates an image block node and links it to the specified parent.
 * @param {Block|Section|Document} parent - The parent Block of this new image block.
 * @param {Object} attrs - A JSON of attributes
 * @param {string} attrs.target - the target attribute to set the source of the image.
 * @param {string} attrs.alt - the alt attribute to specify an alternative text for the image.
 * @param {Object} opts - A JSON of options
 * @returns {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createImageBlock = function (parent, attrs, opts) {
  return this.$create_image_block(parent, toHash(attrs), toHash(opts))
}

/**
 * Creates a paragraph block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string|Array<string>} source - The source
 * @param {Object|undefined} attrs - An object of attributes to set on this block
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Block} - a paragraph {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createParagraph = function (parent, source, attrs, opts) {
  return this.$create_paragraph(parent, source, toHash(attrs), toHash(opts))
}

/**
 * Creates an open block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string|Array<string>} source - The source
 * @param {Object|undefined} attrs - An object of attributes to set on this block
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Block} - an open {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createOpenBlock = function (parent, source, attrs, opts) {
  return this.$create_open_block(parent, source, toHash(attrs), toHash(opts))
}

/**
 * Creates an example block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string|Array<string>} source - The source
 * @param {Object|undefined} attrs - An object of attributes to set on this block
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Block} - an example {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createExampleBlock = function (parent, source, attrs, opts) {
  return this.$create_example_block(parent, source, toHash(attrs), toHash(opts))
}

/**
 * Creates a literal block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string|Array<string>} source - The source
 * @param {Object|undefined} attrs - An object of attributes to set on this block
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Block} - a literal {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createPassBlock = function (parent, source, attrs, opts) {
  return this.$create_pass_block(parent, source, toHash(attrs), toHash(opts))
}

/**
 * Creates a listing block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string|Array<string>} source - The source
 * @param {Object|undefined} attrs - An object of attributes to set on this block
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Block} - a listing {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createListingBlock = function (parent, source, attrs, opts) {
  return this.$create_listing_block(parent, source, toHash(attrs), toHash(opts))
}

/**
 * Creates a literal block and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string|Array<string>} source - The source
 * @param {Object|undefined} attrs - An object of attributes to set on this block
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Block} - a literal {Block}
 * @memberof Extensions/Processor
 */
Processor.prototype.createLiteralBlock = function (parent, source, attrs, opts) {
  return this.$create_literal_block(parent, source, toHash(attrs), toHash(opts))
}

/**
 * Creates an inline anchor and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string} text - The text
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Inline} - an {Inline} anchor
 * @memberof Extensions/Processor
 */
Processor.prototype.createAnchor = function (parent, text, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return this.$create_anchor(parent, text, toHash(opts))
}

/**
 * Creates an inline pass and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block (Block, Section, or Document) of this new block.
 * @param {string} text - The text
 * @param {Object|undefined} opts - An object of options to set on this block
 * @returns {Inline} - an {Inline} pass
 * @memberof Extensions/Processor
 */
Processor.prototype.createInlinePass = function (parent, text, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return this.$create_inline_pass(parent, text, toHash(opts))
}

/**
 * Creates an inline node and links it to the specified parent.
 *
 * @param {Block|Section|Document} parent - The parent Block of this new inline node.
 * @param {string} context - The context name
 * @param {string} text - The text
 * @param {Object|undefined} opts - A JSON of options
 * @returns {Inline} - an {Inline} node
 * @memberof Extensions/Processor
 */
Processor.prototype.createInline = function (parent, context, text, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return this.$create_inline(parent, context, text, toHash(opts))
}

/**
 * Parses blocks in the content and attaches the block to the parent.
 * @param {AbstractBlock} parent - the parent block
 * @param {string|Array<string>} content - the content
 * @param {Object|undefined} attrs - an object of attributes
 * @returns {AbstractNode} - The parent node into which the blocks are parsed.
 * @memberof Extensions/Processor
 */
Processor.prototype.parseContent = function (parent, content, attrs) {
  return this.$parse_content(parent, content, toHash(attrs))
}

/**
 *  Parses the attrlist String into a JSON of attributes
 * @param {AbstractBlock} block - the current AbstractBlock or the parent AbstractBlock if there is no current block (used for applying subs)
 * @param {string} attrlist - the list of attributes as a String
 * @param {Object|undefined} opts - an optional JSON of options to control processing:
 * - positional_attributes: an Array of attribute names to map positional arguments to (optional, default: [])
 * - sub_attributes: enables attribute substitution on the attrlist argument (optional, default: false)
 *
 * @returns - a JSON of parsed attributes
 * @memberof Extensions/Processor
 */
Processor.prototype.parseAttributes = function (block, attrlist, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return fromHash(this.$parse_attributes(block, attrlist, toHash(opts)))
}

/**
 * @param {string|Array<string>} value - Name of a positional attribute or an Array of positional attribute names
 * @memberof Extensions/Processor
 */
Processor.prototype.positionalAttributes = function (value) {
  return this.$positional_attrs(value)
}

/**
 * Specify how to resolve attributes.
 *
 * @param {string|Array<string>|Object|boolean} [value] - A specification to resolve attributes.
 * @memberof Extensions/Processor
 */
Processor.prototype.resolveAttributes = function (value) {
  if (typeof value === 'object' && !Array.isArray(value)) {
    return this.$resolves_attributes(toHash(value))
  }
  if (arguments.length > 1) {
    return this.$resolves_attributes(Array.prototype.slice.call(arguments))
  }
  if (typeof value === 'undefined') {
    // Convert to nil otherwise an exception is thrown at:
    // https://github.com/asciidoctor/asciidoctor/blob/0bcb4addc17b307f62975aad203fb556a1bcd8a5/lib/asciidoctor/extensions.rb#L583
    //
    // if args.size == 1 && !args[0]
    //
    // In the above Ruby code, args[0] is undefined and Opal will try to call the function "!" on an undefined object.
    return this.$resolves_attributes(Opal.nil)
  }
  return this.$resolves_attributes(value)
}

/**
 * @deprecated Please use the <code>resolveAttributes</pre> function on the {@link Extensions/Processor}.
 * @memberof Extensions/Processor
 * @see {Processor#resolveAttributes}
 */
Processor.prototype.resolvesAttributes = Processor.prototype.resolveAttributes

/**
 * Get the configuration JSON for this processor instance.
 * @memberof Extensions/Processor
 */
Processor.prototype.getConfig = function () {
  return fromHash(this.config)
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.option = function (key, value) {
  this.$option(key, value)
}

/**
 * @namespace
 * @module Extensions/BlockProcessor
 */
const BlockProcessor = Extensions.BlockProcessor

/**
 * @param {Object} value - a JSON of default values for attributes
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.defaultAttributes = function (value) {
  this.$default_attributes(toHash(value))
}

/**
 * @param {string} context - A context name
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.onContext = function (context) {
  return this.$on_context(context)
}

/**
 * @param {...string} contexts - A list of context names
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.onContexts = function (contexts) {
  return this.$on_contexts(Array.prototype.slice.call(arguments))
}

/**
 * @returns {string}
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.getName = function () {
  const name = this.name
  return name === Opal.nil ? undefined : name
}

/**
 * @param {string} value
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.parseContentAs = function (value) {
  this.$parse_content_as(value)
}

/**
 * @namespace
 * @module Extensions/BlockMacroProcessor
 */
const BlockMacroProcessor = Extensions.BlockMacroProcessor

/**
 * @param {Object} value - a JSON of default values for attributes
 * @memberof Extensions/BlockMacroProcessor
 */
BlockMacroProcessor.prototype.defaultAttributes = function (value) {
  this.$default_attributes(toHash(value))
}

/**
 * @returns {string} - the block macro name
 * @memberof Extensions/BlockMacroProcessor
 */
BlockMacroProcessor.prototype.getName = function () {
  const name = this.name
  return name === Opal.nil ? undefined : name
}

/**
 * @param {string} value
 * @memberof Extensions/BlockMacroProcessor
 */
BlockMacroProcessor.prototype.parseContentAs = function (value) {
  this.$parse_content_as(value)
}

/**
 * @namespace
 * @module Extensions/InlineMacroProcessor
 */
const InlineMacroProcessor = Extensions.InlineMacroProcessor

/**
 * @param {Object} value - a JSON of default values for attributes
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.defaultAttributes = function (value) {
  this.$default_attributes(toHash(value))
}

/**
 * @returns {string} - the inline macro name
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.getName = function () {
  const name = this.name
  return name === Opal.nil ? undefined : name
}

/**
 * @param {string} value
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.parseContentAs = function (value) {
  this.$parse_content_as(value)
}

/**
 * @param {string} value
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.matchFormat = function (value) {
  this.$match_format(value)
}

/**
 * @param {RegExp} value
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.match = function (value) {
  this.$match(value)
}

/**
 * @namespace
 * @module Extensions/IncludeProcessor
 */
const IncludeProcessor = Extensions.IncludeProcessor

/**
 * @memberof Extensions/IncludeProcessor
 */
IncludeProcessor.prototype.handles = function (block) {
  return Opal.send(this, 'handles?', null, toBlock(block))
}

/**
 * @memberof Extensions/IncludeProcessor
 */
IncludeProcessor.prototype.prefer = function () {
  this.$prefer()
}

/**
 * @namespace
 * @module Extensions/TreeProcessor
 */
const TreeProcessor = Extensions.TreeProcessor

/**
 * @memberof Extensions/TreeProcessor
 */
TreeProcessor.prototype.prefer = function () {
  this.$prefer()
}

/**
 * @namespace
 * @module Extensions/Postprocessor
 */
const Postprocessor = Extensions.Postprocessor

/**
 * @memberof Extensions/Postprocessor
 */
Postprocessor.prototype.prefer = function () {
  this.$prefer()
}

/**
 * @namespace
 * @module Extensions/Preprocessor
 */
const Preprocessor = Extensions.Preprocessor

/**
 * @memberof Extensions/Preprocessor
 */
Preprocessor.prototype.prefer = function () {
  this.$prefer()
}

/**
 * @namespace
 * @module Extensions/DocinfoProcessor
 */
const DocinfoProcessor = Extensions.DocinfoProcessor

/**
 * @memberof Extensions/DocinfoProcessor
 */
DocinfoProcessor.prototype.prefer = function () {
  this.$prefer()
}

/**
 * @param {string} value - The docinfo location ("head", "header" or "footer")
 * @memberof Extensions/DocinfoProcessor
 */
DocinfoProcessor.prototype.atLocation = function (value) {
  this.$at_location(value)
}

function initializeProcessorClass (superclassName, className, functions) {
  const superClass = Opal.const_get_qualified(Extensions, superclassName)
  return initializeClass(superClass, className, functions, {
    'handles?': function () {
      return true
    }
  })
}

// Postprocessor

/**
 * Create a postprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createPostprocessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('Postprocessor', name, functions)
}

/**
 * Create and instantiate a postprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newPostprocessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createPostprocessor(name, functions).$new()
}

// Preprocessor

/**
 * Create a preprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createPreprocessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('Preprocessor', name, functions)
}

/**
 * Create and instantiate a preprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newPreprocessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createPreprocessor(name, functions).$new()
}

// Tree Processor

/**
 * Create a tree processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createTreeProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('TreeProcessor', name, functions)
}

/**
 * Create and instantiate a tree processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newTreeProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createTreeProcessor(name, functions).$new()
}

// Include Processor

/**
 * Create an include processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createIncludeProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('IncludeProcessor', name, functions)
}

/**
 * Create and instantiate an include processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newIncludeProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createIncludeProcessor(name, functions).$new()
}

// Docinfo Processor

/**
 * Create a Docinfo processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createDocinfoProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('DocinfoProcessor', name, functions)
}

/**
 * Create and instantiate a Docinfo processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newDocinfoProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createDocinfoProcessor(name, functions).$new()
}

// Block Processor

/**
 * Create a block processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createBlockProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('BlockProcessor', name, functions)
}

/**
 * Create and instantiate a block processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newBlockProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createBlockProcessor(name, functions).$new()
}

// Inline Macro Processor

/**
 * Create an inline macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createInlineMacroProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('InlineMacroProcessor', name, functions)
}

/**
 * Create and instantiate an inline macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newInlineMacroProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createInlineMacroProcessor(name, functions).$new()
}

// Block Macro Processor

/**
 * Create a block macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createBlockMacroProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return initializeProcessorClass('BlockMacroProcessor', name, functions)
}

/**
 * Create and instantiate a block macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newBlockMacroProcessor = function (name, functions) {
  if (arguments.length === 1) {
    functions = name
    name = null
  }
  return this.createBlockMacroProcessor(name, functions).$new()
}
