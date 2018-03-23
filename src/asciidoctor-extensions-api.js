// Extensions API

/**
 * @private
 */
var toBlock = function (block) {
  // arity is a mandatory field
  block.$$arity = block.length;
  return block;
};

var registerExtension = function (registry, type, processor, name) {
  if (typeof processor === 'function') {
    return Opal.send(registry, type, name && [name], toBlock(processor));
  } else {
    return registry['$' + type](processor, name);
  }
};

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
 *       var lines = reader.$lines().map(function (l) { return l.toUpperCase(); });
 *       return self.createBlock(parent, 'paragraph', lines);
 *     });
 *   });
 * });
 */
var Extensions = Opal.const_get_qualified(Opal.Asciidoctor, 'Extensions');

// Alias
Opal.Asciidoctor.Extensions = Extensions;

/**
 * Create a new {@link Extensions/Registry}.
 * @param {string} name
 * @param {function} block
 * @memberof Extensions
 * @returns {Extensions/Registry} - returns a {@link Extensions/Registry}
 */
Extensions.create = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'build_registry', null, toBlock(name));
  } else if (typeof block === 'function') {
    return Opal.send(this, 'build_registry', [name], toBlock(block));
  } else {
    return this.$build_registry();
  }
};

/**
 * @memberof Extensions
 */
Extensions.register = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'register', null, toBlock(name));
  } else {
    return Opal.send(this, 'register', [name], toBlock(block));
  }
};

/**
 * Get statically-registerd extension groups.
 * @memberof Extensions
 */
Extensions.getGroups = function () {
  return fromHash(this.$groups());
};

/**
 * Unregister all statically-registered extension groups.
 * @memberof Extensions
 */
Extensions.unregisterAll = function () {
  this.$unregister_all();
};

/**
 * Unregister the specified statically-registered extension groups.
 *
 * NOTE Opal cannot delete an entry from a Hash that is indexed by symbol, so
 * we have to resort to using low-level operations in this method.
 *
 * @memberof Extensions
 */
Extensions.unregister = function () {
  var names = Array.isArray(arguments[0]) ? arguments[0] : arguments;
  var groups = this.$groups();
  var groupNameIdx = {};
  for (var i = 0, groupSymbolNames = groups.$$keys; i < groupSymbolNames.length; i++) {
    var groupSymbolName = groupSymbolNames[i];
    groupNameIdx[groupSymbolName.toString()] = groupSymbolName;
  }
  for (var j = 0; j < names.length; j++) {
    var groupStringName = names[j];
    if (groupStringName in groupNameIdx) Opal.hash_delete(groups, groupNameIdx[groupStringName]);
  }
};

/**
 * @namespace
 * @module Extensions/Registry
 */
var Registry = Extensions.Registry;

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.getGroups = Extensions.getGroups;

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.unregisterAll = function () {
  this.groups = Opal.hash();
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.unregister = Extensions.unregister;

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.block = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'block', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.inlineMacro = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'inline_macro', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.includeProcessor = function (processor) {
  return registerExtension(this, 'include_processor', processor);
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.blockMacro = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'block_macro', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.treeProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'tree_processor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.postprocessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'postprocessor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.preprocessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'preprocessor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */

Registry.$$proto.docinfoProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'docinfo_processor', processor, name);
};

/**
 * @namespace
 * @module Extensions/Processor
 */
var Processor = Extensions.Processor;

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.process = function (block) {
  return Opal.send(this, 'process', null, toBlock(block));
};

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.named = function (name) {
  return this.$named(name);
};

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.createBlock = function (parent, context, source, attrs, opts) {
  return this.$create_block(parent, context, source, toHash(attrs), toHash(opts));
};

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.createImageBlock = function (parent, attrs, opts) {
  return this.$create_image_block(parent, toHash(attrs), toHash(opts));
};

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.createInline = function (parent, context, text, opts) {
  return this.$create_inline(parent, context, text, toHash(opts));
};

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.parseContent = function (parent, content, attrs) {
  return this.$parse_content(parent, content, attrs);
};

/**
 * @memberof Extensions/Processor
 */
Processor.$$proto.positionalAttributes = function (value) {
  return this.$positional_attrs(value);
};

/**
 * @namespace
 * @module Extensions/BlockProcessor
 */
var BlockProcessor = Extensions.BlockProcessor;

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.$$proto.onContext = function (context) {
  return this.$on_context(context);
};

/**
 * @namespace
 * @module Extensions/BlockMacroProcessor
 */
// eslint-disable-next-line no-unused-vars
var BlockMacroProcessor = Extensions.BlockMacroProcessor;

/**
 * @namespace
 * @module Extensions/IncludeProcessor
 */
var IncludeProcessor = Extensions.IncludeProcessor;

/**
 * @memberof Extensions/IncludeProcessor
 */
IncludeProcessor.$$proto.handles = function (block) {
  return Opal.send(this, 'handles?', null, toBlock(block));
};

/**
 * @namespace
 * @module Extensions/TreeProcessor
 */
// eslint-disable-next-line no-unused-vars
var TreeProcessor = Extensions.TreeProcessor;

/**
 * @namespace
 * @module Extensions/Postprocessor
 */
// eslint-disable-next-line no-unused-vars
var Postprocessor = Extensions.Postprocessor;

/**
 * @namespace
 * @module Extensions/Preprocessor
 */
// eslint-disable-next-line no-unused-vars
var Preprocessor = Extensions.Preprocessor;

/**
 * @namespace
 * @module Extensions/DocinfoProcessor
 */
var DocinfoProcessor = Extensions.DocinfoProcessor;

/**
 * @memberof Extensions/DocinfoProcessor
 */
DocinfoProcessor.$$proto.atLocation = function (value) {
  this.$at_location(value);
};

// Converter API

/**
 * @namespace
 * @module Converter
 */
var Converter = Opal.const_get_qualified(Opal.Asciidoctor, 'Converter');

// Alias
Opal.Asciidoctor.Converter = Converter;

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
Converter.$$proto.convert = function (node, transform, opts) {
  return this.$convert(node, transform, toHash(opts));
};

// The built-in converter doesn't include Converter, so we have to force it
Converter.BuiltIn.$$proto.convert = Converter.$$proto.convert;

// Converter Factory API

/**
 * @namespace
 * @module Converter/Factory
 */
var ConverterFactory = Opal.Asciidoctor.Converter.Factory;

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
  return this.$default(initialize);
};

/**
 * Create an instance of the converter bound to the specified backend.
 *
 * @param {string} backend - look for a converter bound to this keyword.
 * @param {Object} opts - a JSON of options to pass to the converter (default: {})
 * @returns {Converter} - a converter instance for converting nodes in an Asciidoctor AST.
 * @memberof Converter/Factory
 */
ConverterFactory.$$proto.create = function (backend, opts) {
  return this.$create(backend, toHash(opts));
};
