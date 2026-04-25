module.exports = function ({ node, opts }) {
  return `<p class="paragraph-js">${node.getContent()}</p>`
}
