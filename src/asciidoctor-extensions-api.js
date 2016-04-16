// Extensions API

var Extensions = Opal.Asciidoctor.$$scope.Extensions;

Extensions.register = function (block, name) {
  Opal.block_send(Opal.Asciidoctor.Extensions, 'register', block, name);
};

Extensions.Registry.$$proto.inlineMacro = function (block, name) {
  return Opal.block_send(this, 'inline_macro', block, name);
};

Extensions.InlineMacroProcessor.$$proto.process = function (block) {
  return Opal.block_send(this, 'process', block);
};
