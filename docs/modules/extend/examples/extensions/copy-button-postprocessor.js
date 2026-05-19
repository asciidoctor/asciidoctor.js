export default function (registry) {
  registry.postprocessor(function () {
    this.process(function (doc, output) {
      return output
        .replace(/(<pre[^>]*>)/g, '<div class="code-wrapper"><button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)">Copy</button>$1')
        .replace(/<\/pre>/g, '</pre></div>')
    })
  })
}