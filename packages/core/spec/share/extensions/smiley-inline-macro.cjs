/* global Opal */
module.exports = () => {
  const Extensions = Opal.Asciidoctor.Extensions
  Extensions.register(function () {
    this.inlineMacro('smiley', function () {
      const self = this
      self.process(function (parent, target) {
        let text
        if (target === 'happy') {
          text = ':D'
        } else if (target === 'wink') {
          text = ';)'
        } else {
          text = ':)'
        }
        return self.createInline(parent, 'quoted', text, { type: 'strong' }).convert()
      })
    })
  })
}
