// Type-level tests for the TemplateEngine registry exported from the package
// entry point: an adapter can compile and render synchronously or return a
// Promise.

import { TemplateEngine } from '../../types/index.js'

TemplateEngine.register('sync', {
  compile(_file: string, _name: string) {
    return { render: ({ node }) => `<p>${node.getId()}</p>` }
  },
})

TemplateEngine.register(['async', 'tpl'], {
  async compile(_file: string, _name: string) {
    return { render: async ({ helpers }) => String(helpers.title) }
  },
})

// @ts-expect-error render must return a string or a Promise of a string
TemplateEngine.register('invalid', { compile: () => ({ render: () => 42 }) })
