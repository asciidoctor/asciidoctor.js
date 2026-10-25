// CommonJS template: `.js` file in a `"type": "commonjs"` project.
module.exports = function ({ node }) {
  return new Promise(function(resolve) {
    resolve(`<p class="paragraph-promises-cjs">${node.getContent()}</p>`)
  })
}
