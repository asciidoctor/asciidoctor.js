// CommonJS template: `.js` file in a `"type": "commonjs"` project.
module.exports = function ({ node }) {
  return `<p class="paragraph-js-cjs">${node.getContent()}</p>`
}