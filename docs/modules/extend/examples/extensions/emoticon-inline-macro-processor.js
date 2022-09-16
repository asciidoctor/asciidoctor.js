module.exports = function (registry) {
  registry.inlineMacro('emoticon', function () {
    var self = this
    self.process(function (parent, target) {
      var text
      if (target === 'grin') {
        text = ':D'
      } else if (target === 'wink') {
        text = ';)'
      } else {
        text = ':)'
      }
      return self.createInline(parent, 'quoted', text, { 'type': 'strong' })
    })
  })
}
