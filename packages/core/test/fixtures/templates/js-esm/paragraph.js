// ESM template: `.js` file in a `"type": "module"` project, default export.
export default function ({ node }) {
  return `<p class="paragraph-js-esm">${node.getContent()}</p>`
}