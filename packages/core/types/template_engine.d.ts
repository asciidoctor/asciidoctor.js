/**
 * Registry of custom template engine adapters, keyed by file extension.
 */
export namespace TemplateEngine {
    /** @type {Record<string, TemplateEngineAdapter>} */
    let registry: Record<string, TemplateEngineAdapter>;
    /**
     * Register an adapter for one or more file extensions.
     *
     * @param {string|string[]} names - a file extension or an array of file extensions (without leading dot)
     * @param {TemplateEngineAdapter} adapter - the template engine adapter
     * @returns {void}
     */
    function register(names: string | string[], adapter: TemplateEngineAdapter): void;
}
export type TemplateContext = {
    /**
     * - the node to convert
     */
    node: import("./abstract_node.js").AbstractNode;
    /**
     * - the conversion options
     */
    opts: Record<string, unknown>;
    /**
     * - the values exported by the helpers file
     */
    helpers: Record<string, unknown>;
};
export type CompiledTemplate = {
    render: (ctx: TemplateContext) => string | PromiseLike<string>;
};
export type TemplateEngineAdapter = {
    compile: (file: string, name: string) => CompiledTemplate | PromiseLike<CompiledTemplate>;
};
