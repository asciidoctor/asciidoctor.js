export function register(registry) {
  registry.inlineMacro('npm', function () {
    this.process(function (parent, target, attrs) {
      const version = attrs.version ? `@${attrs.version}` : ''
      const url = `https://www.npmjs.com/package/${target}`
      const text = `${target}${version}`
      return this.createInline(parent, 'anchor', text, { type: 'link', target: url })
    })
  })
}