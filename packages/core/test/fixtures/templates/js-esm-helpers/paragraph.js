export default function ({ node, helpers }) {
  return `<p class="paragraph-esm-helpers">${helpers.greeting()}:${node.getContent()}</p>`
}