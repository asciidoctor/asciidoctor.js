/* global Opal, fromHash, toHash, initializeClass */
// Extensions API

/**
 * @private
 */
var toBlock = function (block) {
  // arity is a mandatory field
  block.$$arity = block.length
  return block
}

var registerExtension = function (registry, type, processor, name) {
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
 * Opal.Asciidoctor.Extensions.register(function () {
 *   this.block(function () {
 *     var self = this;
 *     self.named('shout');
 *     self.onContext('paragraph');
 *     self.process(function (parent, reader) {
 *       var lines = reader.getLines().map(function (l) { return l.toUpperCase(); });
 *       return self.createBlock(parent, 'paragraph', lines);
 *     });
 *   });
 * });
 */
var Extensions = Opal.const_get_qualified(Opal.Asciidoctor, 'Extensions')

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
 * Get statically-registerd extension groups.
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
  var names = Array.prototype.concat.apply([], arguments)
  var groups = this.$groups()
  var groupNameIdx = {}
  for (var i = 0, groupSymbolNames = groups.$$keys; i < groupSymbolNames.length; i++) {
    var groupSymbolName = groupSymbolNames[i]
    groupNameIdx[groupSymbolName.toString()] = groupSymbolName
  }
  for (var j = 0; j < names.length; j++) {
    var groupStringName = names[j]
    if (groupStringName in groupNameIdx) Opal.hash_delete(groups, groupNameIdx[groupStringName])
  }
}

/**
 * @namespace
 * @module Extensions/Registry
 */
var Registry = Extensions.Registry

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
    return this['$prefer'](name, processor)
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
  return this['$preprocessors']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/TreeProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getTreeProcessors = function () {
  return this['$tree_processors']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/IncludeProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getIncludeProcessors = function () {
  return this['$include_processors']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/Postprocessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getPostprocessors = function () {
  return this['$postprocessors']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/DocinfoProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @param location - A {string} for selecting docinfo extensions at a given location (head or footer) (default: undefined)
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getDocinfoProcessors = function (location) {
  return this['$docinfo_processors'](location)
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/BlockProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getBlocks = function () {
  return this.block_extensions['$values']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/BlockMacroProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getBlockMacros = function () {
  return this.block_macro_extensions['$values']()
}

/**
 * Retrieves the Extension proxy objects for all the {{@link Extensions/InlineMacroProcessor}} instances stored in this registry.
 *
 * @memberof Extensions/Registry
 * @returns an {array} of Extension proxy objects.
 */
Registry.prototype.getInlineMacros = function () {
  return this['$inline_macros']()
}

/**
 * Get any {{@link Extensions/InlineMacroProcessor}} extensions are registered to handle the specified inline macro name.
 *
 * @param name - the {string} inline macro name
 * @memberof Extensions/Registry
 * @returns the Extension proxy object for the {{@link Extensions/InlineMacroProcessor}} that matches the inline macro name or undefined if no match is found.
 */
Registry.prototype.getInlineMacroFor = function (name) {
  var result = this['$registered_for_inline_macro?'](name)
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
    var ext = this['$find_block_extension'](name)
    return ext === Opal.nil ? undefined : ext
  }
  var result = this['$registered_for_block?'](name, context)
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
  var result = this['$registered_for_block_macro?'](name)
  return result === false ? undefined : result
}

/**
 * @namespace
 * @module Extensions/Processor
 */
var Processor = Extensions.Processor

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
  var handler = {
    apply: function (target, thisArg, argumentsList) {
      for (var i = 0; i < argumentsList.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof argumentsList[i] === 'object' && '$$smap' in argumentsList[i]) {
          argumentsList[i] = fromHash(argumentsList[i])
        }
      }
      return target.apply(thisArg, argumentsList)
    }
  }
  var blockProxy = new Proxy(block, handler)
  return Opal.send(this, 'process', null, toBlock(blockProxy))
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.named = function (name) {
  return this.$named(name)
}

/**
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
 *
 * @memberof Extensions/Processor
 */
Processor.prototype.createList = function (parent, context, attrs) {
  return this.$create_list(parent, context, toHash(attrs))
}

/**
 * Creates a list item node and links it to the specified parent.
 *
 * @param parent - The parent List of this new list item block.
 * @param {string} text - The text of the list item.
 *
 * @memberof Extensions/Processor
 */
Processor.prototype.createListItem = function (parent, text) {
  return this.$create_list_item(parent, text)
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.createImageBlock = function (parent, attrs, opts) {
  return this.$create_image_block(parent, toHash(attrs), toHash(opts))
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.createInline = function (parent, context, text, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes)
  }
  return this.$create_inline(parent, context, text, toHash(opts))
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.parseContent = function (parent, content, attrs) {
  return this.$parse_content(parent, content, attrs)
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.positionalAttributes = function (value) {
  return this.$positional_attrs(value)
}

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.resolvesAttributes = function (args) {
  return this.$resolves_attributes(args)
}

/**
 * @namespace
 * @module Extensions/BlockProcessor
 */
var BlockProcessor = Extensions.BlockProcessor

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.onContext = function (context) {
  return this.$on_context(context)
}

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.onContexts = function () {
  return this.$on_contexts(Array.prototype.slice.call(arguments))
}

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.getName = function () {
  var name = this.name
  return name === Opal.nil ? undefined : name
}

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.parseContentAs = function (value) {
  this.$parse_content_as(value)
}

/**
 * @namespace
 * @module Extensions/BlockMacroProcessor
 */
var BlockMacroProcessor = Extensions.BlockMacroProcessor

/**
 * @memberof Extensions/BlockMacroProcessor
 */
BlockMacroProcessor.prototype.getName = function () {
  var name = this.name
  return name === Opal.nil ? undefined : name
}

/**
 * @memberof Extensions/BlockMacroProcessor
 */
BlockMacroProcessor.prototype.parseContentAs = function (value) {
  this.$parse_content_as(value)
}

/**
 * @namespace
 * @module Extensions/InlineMacroProcessor
 */
var InlineMacroProcessor = Extensions.InlineMacroProcessor

/**
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.getName = function () {
  var name = this.name
  return name === Opal.nil ? undefined : name
}

/**
 * @memberof Extensions/InlineMacroProcessor
 */
InlineMacroProcessor.prototype.parseContentAs = function (value) {
  this.$parse_content_as(value)
}

/**
 * @namespace
 * @module Extensions/IncludeProcessor
 */
var IncludeProcessor = Extensions.IncludeProcessor

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
var TreeProcessor = Extensions.TreeProcessor

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
var Postprocessor = Extensions.Postprocessor

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
var Preprocessor = Extensions.Preprocessor

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
var DocinfoProcessor = Extensions.DocinfoProcessor

/**
 * @memberof Extensions/DocinfoProcessor
 */
DocinfoProcessor.prototype.prefer = function () {
  this.$prefer()
}

/**
 * @memberof Extensions/DocinfoProcessor
 */
DocinfoProcessor.prototype.atLocation = function (value) {
  this.$at_location(value)
}

function initializeProcessorClass (superclassName, className, functions) {
  var superClass = Opal.const_get_qualified(Extensions, superclassName)
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

// Converter API

/**
 * @namespace
 * @module Converter
 */
var Converter = Opal.const_get_qualified(Opal.Asciidoctor, 'Converter')

// Alias
Opal.Asciidoctor.Converter = Converter

/**
 * Convert the specified node.
 *
 * @param {AbstractNode} node - the AbstractNode to convert
 * @param {string} transform - an optional String transform that hints at
 * which transformation should be applied to this node.
 * @param {Object} opts - a JSON of options that provide additional hints about
 * how to convert the node (default: {})
 * @returns the {Object} result of the conversion, typically a {string}.
 * @memberof Converter
 */
Converter.prototype.convert = function (node, transform, opts) {
  return this.$convert(node, transform, toHash(opts))
}

/**
 * Create an instance of the converter bound to the specified backend.
 *
 * @param {string} backend - look for a converter bound to this keyword.
 * @param {Object} opts - a JSON of options to pass to the converter (default: {})
 * @returns {Converter} - a converter instance for converting nodes in an Asciidoctor AST.
 * @memberof Converter/Factory
 */
Converter.create = function (backend, opts) {
  return this.$create(backend, toHash(opts))
}

// Converter Factory API

/**
 * @namespace
 * @module Converter/Factory
 */
var ConverterFactory = Opal.Asciidoctor.Converter.Factory

// Alias
Opal.Asciidoctor.ConverterFactory = ConverterFactory

/**
 * Register a custom converter in the global converter factory to handle conversion to the specified backends.
 * If the backend value is an asterisk, the converter is used to handle any backend that does not have an explicit converter.
 *
 * @param converter - The Converter instance to register
 * @param backends {Array} - A {string} {Array} of backend names that this converter should be registered to handle (optional, default: ['*'])
 * @return {*} - Returns nothing
 * @memberof Converter/Factory
 */
ConverterFactory.register = function (converter, backends) {
  if (typeof converter === 'object' && typeof converter.$convert === 'undefined' && typeof converter.convert === 'function') {
    Opal.def(converter, '$convert', converter.convert)
  }
  if (typeof this.$register === 'function' && this.$register.$$stub !== true) {
    return this.$register(converter, backends) // Converter.Factory.register was removed in Asciidoctor 2.0.0
  }
  var args = [converter].concat(backends)
  return Converter.$register.apply(Converter, args)
}

/**
 * Retrieves the singleton instance of the converter factory.
 *
 * @param {boolean} initialize - instantiate the singleton if it has not yet
 * been instantiated. If this value is false and the singleton has not yet been
 * instantiated, this method returns a fresh instance.
 * @returns {Converter/Factory} an instance of the converter factory.
 * @memberof Converter/Factory
 */
ConverterFactory.getDefault = function (initialize) {
  return this.$default(initialize)
}

/**
 * Create an instance of the converter bound to the specified backend.
 *
 * @param {string} backend - look for a converter bound to this keyword.
 * @param {Object} opts - a JSON of options to pass to the converter (default: {})
 * @returns {Converter} - a converter instance for converting nodes in an Asciidoctor AST.
 * @memberof Converter/Factory
 */
ConverterFactory.prototype.create = function (backend, opts) {
  return this.$create(backend, toHash(opts))
}

// Built-in converter

/**
 * @namespace
 * @module Converter/Html5Converter
 */
var Html5Converter = Opal.Asciidoctor.Converter.Html5Converter

// Alias
Opal.Asciidoctor.Html5Converter = Html5Converter

Html5Converter.create = function () {
  return this.$new()
}

Html5Converter.prototype.convert = function (node, transform, opts) {
  return this.$convert(node, transform, opts)
}
