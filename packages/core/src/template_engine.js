// ── TemplateEngine registry ───────────────────────────────────────────────────
// Allows users to plug in custom template engine adapters.
//
// Adapters must implement:
//   compile(file, name) → { render(ctx) }
//
// Example:
//   TemplateConverter.TemplateEngine.register('dot', {
//     compile(file, _name) {
//       const doT = require('dot')
//       const fn  = doT.template(fs.readFileSync(file, 'utf8'))
//       return { render: (ctx) => fn(ctx) }
//     }
//   })

/**
 * @typedef {Object} Ctx
 * @property {Proxy<AbstractNode>} node
 * @property {Record<string, unknown>} opts
 * @property {Record<string, Function>} helpers
 */

/**
 * @typedef {Object} TemplateRender
 * @property {(ctx: Ctx) => string | PromiseLike<string>} render
 */

/**
 * @typedef {Object} TemplateEngineAdapter
 * @property {(file: string, name: string) => (TemplateRender | PromiseLike<TemplateRender>)} compile
 */

/**
 * @type {{
 *   registry: Record<string, TemplateEngineAdapter>,
 *   register: (names: string|string[], adapter: TemplateEngineAdapter) => void
 * }}
 */
export const TemplateEngine = {
  /** @type {Record<string, TemplateEngineAdapter>} */
  registry: {},

  /**
   * Register one or multiple engine names to the same adapter.
   *
   * @param {string|string[]} names A string name or an array of names
   * @param {TemplateEngineAdapter} adapter The engine adapter implementation
   * @returns {void}
   */
  register(names, adapter) {
    const list = Array.isArray(names) ? names : [names]
    for (const name of list) this.registry[name] = adapter
  },
}
