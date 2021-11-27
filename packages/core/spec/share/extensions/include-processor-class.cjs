module.exports = function (Opal) {
  const includeProcessor = Opal.const_get_qualified(
    Opal.const_get_qualified(
      Opal.const_get_relative(Opal, 'Asciidoctor'),
      'Extensions'
    ),
    'IncludeProcessor'
  )

  const scope = Opal.klass(null, includeProcessor, 'LoremIncludeProcessor', function () {})

  Opal.def(scope, '$process', function (doc, reader, target, attrs) {
    return reader.$push_include('Lorem ipsum', target, target, 1, attrs)
  })

  return scope
}
