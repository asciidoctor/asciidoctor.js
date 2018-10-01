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
  if (typeof processor === 'object' || processor.$$is_class) {
    // processor is an instance or a class
    return registry['$' + type](processor, name);
  } else {
    // processor is a function/lambda
    return Opal.send(registry, type, name && [name], toBlock(processor));
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
 *       var lines = reader.getLines().map(function (l) { return l.toUpperCase(); });
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
  var names = Array.prototype.concat.apply([], arguments);
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
Registry.prototype.getGroups = Extensions.getGroups;

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.unregisterAll = function () {
  this.groups = Opal.hash();
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.unregister = Extensions.unregister;

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.block = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'block', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.inlineMacro = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'inline_macro', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.includeProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'include_processor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.blockMacro = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'block_macro', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.treeProcessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'tree_processor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.postprocessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'postprocessor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */
Registry.prototype.preprocessor = function (name, processor) {
  if (arguments.length === 1) {
    processor = name;
    name = null;
  }
  return registerExtension(this, 'preprocessor', processor, name);
};

/**
 * @memberof Extensions/Registry
 */

Registry.prototype.docinfoProcessor = function (name, processor) {
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
 * The extension will be added to the beginning of the list for that extension type. (default is append).
 * @memberof Extensions/Processor
 */
Processor.prototype.prepend = function () {
  this.$option('position', '>>');
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.process = function (block) {
  var handler = {
    apply: function (target, thisArg, argumentsList) {
      for (var i = 0; i < argumentsList.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof argumentsList[i] === 'object' && '$$smap' in argumentsList[i]) {
          argumentsList[i] = fromHash(argumentsList[i]);
        }
      }
      return target.apply(thisArg, argumentsList);
    }
  };
  var blockProxy = new Proxy(block, handler);
  return Opal.send(this, 'process', null, toBlock(blockProxy));
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.named = function (name) {
  return this.$named(name);
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.createBlock = function (parent, context, source, attrs, opts) {
  return this.$create_block(parent, context, source, toHash(attrs), toHash(opts));
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.createImageBlock = function (parent, attrs, opts) {
  return this.$create_image_block(parent, toHash(attrs), toHash(opts));
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.createInline = function (parent, context, text, opts) {
  if (opts && opts.attributes) {
    opts.attributes = toHash(opts.attributes);
  }
  return this.$create_inline(parent, context, text, toHash(opts));
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.parseContent = function (parent, content, attrs) {
  return this.$parse_content(parent, content, attrs);
};

/**
 * @memberof Extensions/Processor
 */
Processor.prototype.positionalAttributes = function (value) {
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
BlockProcessor.prototype.onContext = function (context) {
  return this.$on_context(context);
};

/**
 * @memberof Extensions/BlockProcessor
 */
BlockProcessor.prototype.onContexts = function () {
  return this.$on_contexts(Array.prototype.slice.call(arguments));
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
IncludeProcessor.prototype.handles = function (block) {
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
DocinfoProcessor.prototype.atLocation = function (value) {
  this.$at_location(value);
};

function initializeProcessorClass (superclassName, className, functions) {
  var superclass = Opal.const_get_qualified(Extensions, superclassName);
  var scope = Opal.klass(Opal.Object, superclass, className, function () {});
  var postConstructFunction;
  var initializeFunction;
  var isHandlesFunctionDefined = false;
  for (var key in functions) {
    if (functions.hasOwnProperty(key)) {
      (function (key) {
        var userFunction = functions[key];
        if (key === 'postConstruct') {
          postConstructFunction = userFunction;
        } else if (key === 'initialize') {
          initializeFunction = userFunction;
        } else {
          if (key === 'handles?') {
            isHandlesFunctionDefined = true;
          }
          Opal.def(scope, '$' + key, function () {
            return userFunction.apply(this, arguments);
          });
        }
      }(key));
    }
  }
  var initialize;
  if (typeof initializeFunction === 'function') {
    initialize = function () {
      initializeFunction.apply(this, arguments);
      if (typeof postConstructFunction === 'function') {
        postConstructFunction.bind(this)();
      }
    };
  } else {
    initialize = function () {
      Opal.send(this, Opal.find_super_dispatcher(this, 'initialize', initialize));
      if (typeof postConstructFunction === 'function') {
        postConstructFunction.bind(this)();
      }
    };
  }
  Opal.def(scope, '$initialize', initialize);
  Opal.def(scope, 'super', function (func) {
    if (typeof func === 'function') {
      Opal.send(this, Opal.find_super_dispatcher(this, func.name, func));
    } else {
      // Bind the initialize function to super();
      const argumentsList =  Array.from(arguments);
      for (let i = 0; i < argumentsList.length; i++) {
        // convert all (Opal) Hash arguments to JSON.
        if (typeof argumentsList[i] === 'object') {
          argumentsList[i] = toHash(argumentsList[i]);
        }
      }
      Opal.send(this, Opal.find_super_dispatcher(this, 'initialize', initialize), argumentsList);
    }
  });
  if (!isHandlesFunctionDefined) {
    Opal.def(scope, '$handles?', function () {
      return true;
    });
  }
  return scope;
}

// Postprocessor

/**
 * Create a postprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createPostprocessor = function (name, functions) {
  return initializeProcessorClass('Postprocessor', name, functions);
};

/**
 * Create and instantiate a postprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newPostprocessor = function (name, functions) {
  return this.createPostprocessor(name, functions).$new();
};

// Preprocessor

/**
 * Create a preprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createPreprocessor = function (name, functions) {
  return initializeProcessorClass('Preprocessor', name, functions);
};

/**
 * Create and instantiate a preprocessor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newPreprocessor = function (name, functions) {
  return this.createPreprocessor(name, functions).$new();
};

// Tree Processor

/**
 * Create a tree processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createTreeProcessor = function (name, functions) {
  return initializeProcessorClass('TreeProcessor', name, functions);
};

/**
 * Create and instantiate a tree processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newTreeProcessor = function (name, functions) {
  return this.createTreeProcessor(name, functions).$new();
};

// Include Processor

/**
 * Create an include processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createIncludeProcessor = function (name, functions) {
  return initializeProcessorClass('IncludeProcessor', name, functions);
};

/**
 * Create and instantiate an include processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newIncludeProcessor = function (name, functions) {
  return this.createIncludeProcessor(name, functions).$new();
};

// Docinfo Processor

/**
 * Create a Docinfo processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createDocinfoProcessor = function (name, functions) {
  return initializeProcessorClass('DocinfoProcessor', name, functions);
};

/**
 * Create and instantiate a Docinfo processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newDocinfoProcessor = function (name, functions) {
  return this.createDocinfoProcessor(name, functions).$new();
};

// Block Processor

/**
 * Create a block processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createBlockProcessor = function (name, functions) {
  return initializeProcessorClass('BlockProcessor', name, functions);
};

/**
 * Create and instantiate a block processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newBlockProcessor = function (name, functions) {
  return this.createBlockProcessor(name, functions).$new();
};

// Inline Macro Processor

/**
 * Create an inline macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createInlineMacroProcessor = function (name, functions) {
  return initializeProcessorClass('InlineMacroProcessor', name, functions);
};

/**
 * Create and instantiate an inline macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newInlineMacroProcessor = function (name, functions) {
  return this.createInlineMacroProcessor(name, functions).$new();
};

// Block Macro Processor

/**
 * Create a block macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.createBlockMacroProcessor = function (name, functions) {
  return initializeProcessorClass('BlockMacroProcessor', name, functions);
};

/**
 * Create and instantiate a block macro processor
 * @description this API is experimental and subject to change
 * @memberof Extensions
 */
Extensions.newBlockMacroProcessor = function (name, functions) {
  return this.createBlockMacroProcessor(name, functions).$new();
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
Converter.prototype.convert = function (node, transform, opts) {
  return this.$convert(node, transform, toHash(opts));
};

// The built-in converter doesn't include Converter, so we have to force it
Converter.BuiltIn.prototype.convert = Converter.prototype.convert;

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
ConverterFactory.prototype.create = function (backend, opts) {
  return this.$create(backend, toHash(opts));
};
