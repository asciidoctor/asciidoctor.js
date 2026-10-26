module.exports = async function ({ node }) {
  return `<p class="paragraph-promises-js">${node.getContent()}</p>`
}
