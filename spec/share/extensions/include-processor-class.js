// FIXME: not working anymore, create a class with Opal
module.exports = (function (Opal) {
  var includeProcessor = Opal.const_get_qualified(
    Opal.const_get_qualified(
      Opal.const_get_relative(Opal, 'Asciidoctor'),
      'Extensions'
    ),
    'IncludeProcessor'
  );

  var scope = Opal.klass(null, includeProcessor, 'LoremIncludeProcessor', function () {});

  Opal.def(scope, '$process', function (doc, reader, target, attrs) {
    return reader.$push_include('Lorem ipsum', target, target, 1, attrs);
  });

  return scope;
})(Opal);
