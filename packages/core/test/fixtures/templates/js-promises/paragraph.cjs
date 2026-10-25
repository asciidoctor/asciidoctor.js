module.exports = function ({ node, opts }) {
  return new Promise(function(resolve) {
    resolve(`<p class="paragraph-promises-js">${node.getContent()}</p>`)
  })
}
