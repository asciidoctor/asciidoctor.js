export default function (registry) {
  registry.blockMacro(function () {
    this.named('gist')
    this.process(function (parent, target, attrs) {
      const file = attrs.file ? `?file=${attrs.file}` : ''
      const html = `<script src="https://gist.github.com/${target}.js${file}"></script>`
      return this.createBlock(parent, 'pass', html)
    })
  })
}