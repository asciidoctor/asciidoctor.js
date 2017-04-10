// Extensions API

var toBlock = function (block) {
  // arity is a mandatory field
  block.$$arity = block.length;
  return block;
};

/** @namespace */
var Extensions = Opal.Asciidoctor.$$scope.Extensions;

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
 * @module Extensions/Processor/BlockProcessor
 */
var BlockProcessor = Processor.BlockProcessor;

/**
 * @memberof Extensions/Processor/BlockProcessor
 */
BlockProcessor.$$proto.named = function (name) {
  return this.$named(name);
};

/**
 * @memberof Extensions/Processor/BlockProcessor
 */
BlockProcessor.$$proto.onContext = function (context) {
  return this.$on_context(context);
};
