export default function ({ node, helpers }) {
  return `<p class="paragraph-mjs-helpers">${helpers.greeting()}:${node.getContent()}</p>`
}