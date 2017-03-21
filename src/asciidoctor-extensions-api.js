// Extensions API

var toBlock = function (block) {
  // arity is a mandatory field
  block.$$arity = block.length;
  return block;
};
 
var Extensions = Opal.Asciidoctor.$$scope.Extensions;

Extensions.register = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'register', null, toBlock(name));
  } else {
    return Opal.send(this, 'register', [name], toBlock(block));
  }
};

Extensions.Registry.$$proto.block = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'block', null, toBlock(name));
  } else {
    return Opal.send(this, 'block', [name], toBlock(block));
  }
};

Extensions.Registry.$$proto.inlineMacro = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    return Opal.send(this, 'inline_macro', null, toBlock(name));
  } else {
    return Opal.send(this, 'inline_macro', [name], toBlock(block));
  }
};

Extensions.Processor.$$proto.process = function (block) {
  return Opal.send(this, 'process', null, toBlock(block));
};

Extensions.Processor.$$proto.createBlock = function (parent, context, source, attrs, opts) {
  return this.$create_block(parent, context, source, toHash(attrs), toHash(opts));
};

Extensions.Processor.$$proto.createInline = function (parent, context, text, opts) {
  return this.$create_inline(parent, context, text, toHash(opts));
};

Extensions.Processor.$$proto.parseContent = function (parent, content, attrs) {
  return this.$parse_content(parent, content, attrs);
};

Extensions.BlockProcessor.$$proto.named = function (name) {
  return this.$named(name);
};

Extensions.BlockProcessor.$$proto.onContext = function (context) {
  return this.$on_context(context);
};
