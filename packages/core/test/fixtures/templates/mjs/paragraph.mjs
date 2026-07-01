// ESM template: `.mjs` file is always an ES module, default export.
export default function ({ node }) {
  return `<p class="paragraph-mjs">${node.getContent()}</p>`
}