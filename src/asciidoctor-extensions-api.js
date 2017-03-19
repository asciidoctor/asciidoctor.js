// Extensions API

var createBlock = function (block) {
  var result = block;
  // arity is a mandatory field
  result.$$arity = 0;
  return result;
};
 
var Extensions = Opal.Asciidoctor.$$scope.Extensions;

Extensions.register = function (name, block) {
  if (typeof name === 'function' && typeof block === 'undefined') {
    Opal.send(Extensions, 'register', null, createBlock(name));
  } else {
    Opal.send(Extensions, 'register', [name], createBlock(block));
  }
};

Extensions.Processor.$$proto.createBlock = function (parent, context, source, attrs, opts) {
  return this.$create_block(parent, context, source, toHash(attrs), toHash(opts));
};

Opal.Asciidoctor.Block.$$proto.render = function () {
  return this.$render();
};

Extensions.Registry.$$proto.inlineMacro = function (name, block) {
  var opalBlock = block;
  opalBlock.$$arity = 0;
  return Opal.send(this, 'inline_macro', [name], opalBlock);
};

Extensions.InlineMacroProcessor.$$proto.process = function (block) {
  return Opal.send(this, 'process', null, block);
};
