Opal.Asciidoctor.$$scope.Extensions.register(function () {
  this.includeProcessor(function () {
    var self = this;
    self.handles(function (target) {
      return target.endsWith('.foo');
    });
    self.process(function (doc, reader, target, attrs) {
      var content = ['foo', 'foo'];
      return reader.pushInclude(content, target, target, 1, attrs);
    });
  });
});
