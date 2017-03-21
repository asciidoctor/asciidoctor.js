Opal.Asciidoctor.$$scope.Extensions.register(function () {
  this.block(function () {
    var self = this;
    self.named('shout');
    self.onContext('paragraph');
    self.process(function (parent, reader) {
      var lines = reader.$lines().map(function (l) { return l.toUpperCase(); });
      return self.createBlock(parent, 'paragraph', lines);
    });
  });
});
