export default function (registry) {
  registry.inlineMacro('emoticon', function () {
    const self = this
    self.process(function (parent, target) {
      let text
      if (target === 'grin') {
        text = ':D'
      } else if (target === 'wink') {
        text = ';)'
      } else {
        text = ':)'
      }
      return self.createInline(parent, 'quoted', text, { type: 'strong' })
    })
  })
}