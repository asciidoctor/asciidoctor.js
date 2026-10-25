// ESM template: `.js` file in a `"type": "module"` project, default export.
export default function ({ node }) {
  return new Promise(function(resolve) {
    resolve(`<p class="paragraph-promises-esm">${node.getContent()}</p>`)
  })
}

