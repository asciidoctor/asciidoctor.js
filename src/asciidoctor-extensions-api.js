// Extensions API

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
 * 1. After the source lines are normalized, {Preprocessor}s modify or replace
 *    the source lines before parsing begins. {{@link Extensions/IncludeProcessor}}s are used to
 *    process include directives for targets which they claim to handle.
 * 2. The Parser parses the block-level content into an abstract syntax tree.
 *    Custom blocks and block macros are processed by associated {{@link Extensions/BlockProcessor}}s
 *    and {BlockMacroProcessor}s, respectively.
 * 3. {Treeprocessor}s are run on the abstract syntax tree.
 * 4. Conversion of the document begins, at which point inline markup is processed
 *    and converted. Custom inline macros are processed by associated {InlineMacroProcessor}s.
 * 5. {Postprocessor}s modify or replace the converted document.
 * 6. The output is written to the output stream.
 *
 * Extensions may be registered globally using the {Extensions.register} method
 * or added to a custom {Registry} instance and passed as an option to a single
 * Asciidoctor processor.
 *
 * @example
 * Opal.Asciidoctor.$$scope.Extensions.register(function () {
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
var Extensions = Opal.Asciidoctor.$$scope.Extensions;

/**
 * @memberof Extensions
 */
Extensions.create = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'build_registry', null, toBlock(name));
  } else {
    return Opal.send(this, 'build_registry', [name], toBlock(block));
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
 * @namespace
 * @module Extensions/BlockProcessor
 */
var BlockProcessor = Extensions.BlockProcessor;

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.$$proto.named = function (name) {
  return this.$named(name);
};

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
var BlockMacroProcessor = Extensions.BlockMacroProcessor;

/**
 * @memberof Extensions/BlockMacroProcessor
 */
BlockMacroProcessor.$$proto.named = function (name) {
  return this.$named(name);
};

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
