// Extensions API

/**
 * @private
 */
var toBlock = function (block) {
  // arity is a mandatory field
  block.$$arity = block.length;
  return block;
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
 * Unregister all statically-registered extension groups.
 * @memberof Extensions
 */
Extensions.unregisterAll = function () {
  this.$unregister_all();
};

/**
 * @namespace
 * @module Extensions/Registry
 */
var Registry = Extensions.Registry;

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.block = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'block', null, toBlock(name));
  } else {
    return Opal.send(this, 'block', [name], toBlock(block));
  }
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.inlineMacro = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'inline_macro', null, toBlock(name));
  } else {
    return Opal.send(this, 'inline_macro', [name], toBlock(block));
  }
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.includeProcessor = function (block) {
  return Opal.send(this, 'include_processor', null, toBlock(block));
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.blockMacro = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'block_macro', null, toBlock(name));
  } else {
    return Opal.send(this, 'block_macro', [name], toBlock(block));
  }
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.treeProcessor = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'treeprocessor', null, toBlock(name));
  } else {
    return Opal.send(this, 'treeprocessor', [name], toBlock(block));
  }
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.postprocessor = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'postprocessor', null, toBlock(name));
  } else {
    return Opal.send(this, 'postprocessor', [name], toBlock(block));
  }
};

/**
 * @memberof Extensions/Registry
 */
Registry.$$proto.preprocessor = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'preprocessor', null, toBlock(name));
  } else {
    return Opal.send(this, 'preprocessor', [name], toBlock(block));
  }
};

/**
 * @memberof Extensions/Registry
 */

Registry.$$proto.docinfoProcessor = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'docinfo_processor', null, toBlock(name));
  } else {
    return Opal.send(this, 'docinfo_processor', [name], toBlock(block));
  }
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
  if (typeof this.$positional_attrs === 'function') {
    return this.$positional_attrs(value);
  }
  // NOTE: for backward compatibility, this function was renamed to positional_attrs in 1.5.6
  return this.$positional_attributes(value);
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
var TreeProcessor;
if (typeof Extensions.TreeProcessor !== 'undefined') {
  TreeProcessor = Extensions.TreeProcessor;
} else {
  // NOTE: for backward compatibility, Treeprocessor was renamed to TreeProcessor in 1.5.6
  TreeProcessor = Extensions.Treeprocessor;
}

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
