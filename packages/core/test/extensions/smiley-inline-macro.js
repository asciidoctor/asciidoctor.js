export default function (registry) {
  registry.inlineMacro('smiley', function () {
    this.process((parent, target) => {
      let text
      if (target === 'happy') {
        text = ':D'
      } else if (target === 'wink') {
        text = ';)'
      } else {
        text = ':)'
      }
      return this.createInline(parent, 'quoted', text, {
        type: 'strong',
      }).convert()
    })
  })
}
