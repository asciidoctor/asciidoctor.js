// ── TemplateEngine registry ───────────────────────────────────────────────────
// Allows users to plug in custom template engine adapters.
//
// Adapters must implement:
//   compile(file, name) → { render(ctx) }
//
// Both compile() and render() may return a Promise.
//
// Example:
//   import { TemplateEngine } from '@asciidoctor/core'
//
//   TemplateEngine.register('dot', {
//     compile(file, _name) {
//       const fn = doT.template(fs.readFileSync(file, 'utf8'))
//       return { render: (ctx) => fn(ctx) }
//     }
//   })

/**
 * @typedef {Object} TemplateContext
 * @property {import('./abstract_node.js').AbstractNode} node - the node to convert
 * @property {Record<string, unknown>} opts - the conversion options
 * @property {Record<string, unknown>} helpers - the values exported by the helpers file
 */

/**
 * @typedef {Object} CompiledTemplate
 * @property {(ctx: TemplateContext) => string | PromiseLike<string>} render
 */

/**
 * @typedef {Object} TemplateEngineAdapter
 * @property {(file: string, name: string) => CompiledTemplate | PromiseLike<CompiledTemplate>} compile
 */

/**
 * Registry of custom template engine adapters, keyed by file extension.
 */
export const TemplateEngine = {
  /** @type {Record<string, TemplateEngineAdapter>} */
  registry: {},

  /**
   * Register an adapter for one or more file extensions.
   *
   * @param {string|string[]} names - a file extension or an array of file extensions (without leading dot)
   * @param {TemplateEngineAdapter} adapter - the template engine adapter
   * @returns {void}
   */
  register(names, adapter) {
    const list = Array.isArray(names) ? names : [names]
    for (const name of list) this.registry[name] = adapter
  },
}
