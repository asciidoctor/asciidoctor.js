module.exports = (function (Opal) {
  var scope = Opal.klass(
    Opal.module(null, 'Test'),
    Opal.module(null, 'Asciidoctor').Extensions.IncludeProcessor,
    'LoremIncludeProcessor',
    function () {}
  );

  Opal.defn(scope, '$process', function (doc, reader, target, attrs) {
    return reader.$push_include('Lorem ipsum', target, target, 1, attrs);
  });

  return scope;
})(Opal);
