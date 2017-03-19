var Extensions = Opal.Asciidoctor.$$scope.Extensions;

Extensions.register(function () {
  this.inlineMacro('smiley', function () {
    var inlineMacro = this;
    inlineMacro.process(function (parent, target) {
      var text;
      if (target == 'happy') {
        text = ':D';
      } else if (target == 'wink') {
        text = ';)';
      } else {
        text = ':)';
      }
      return inlineMacro.createBlock(parent, 'literal', text).render();
    }); 
  });
});
