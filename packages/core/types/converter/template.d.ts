export class TemplateConverter extends ConverterBase {
    static _caches: {
        scans: {};
        templates: {};
    };
    static TemplateEngine: {
        registry: {};
        register(names: any, adapter: any): void;
    };
    static clearCaches(): void;
    /** Alias for clearCaches() — matches the Ruby/core API name. */
    static clearCache(): void;
    /** Return the class-level cache object. */
    static getCache(): {
        scans: {};
        templates: {};
    };
    /**
     * Async factory — create and fully initialize a TemplateConverter.
     * @param {string} backend
     * @param {string|string[]} templateDirs
     * @param {Object} [opts={}]
     * @returns {Promise<TemplateConverter>}
     */
    static create(backend: string, templateDirs: string | string[], opts?: any): Promise<TemplateConverter>;
    /**
     * Construct a new TemplateConverter (synchronous setup only).
     * Prefer TemplateConverter.create() which also runs the async _scan() step.
     * @param {string} backend - the backend name (e.g. 'html5')
     * @param {string|string[]} templateDirs - paths to scan for templates
     * @param {Object} [opts={}]
     * @param {string} [opts.template_engine] - engine name restriction (e.g. 'nunjucks')
     * @param {Object} [opts.template_engine_options] - per-engine option objects
     * @param {boolean|Object} [opts.template_cache] - true → class-level cache, Object → supplied cache
     */
    constructor(backend: string, templateDirs: string | string[], opts?: {
        template_engine?: string;
        template_engine_options?: any;
        template_cache?: boolean | any;
    });
    _templates: {};
    templateDirs: string[];
    engine: string;
    engineOptions: any;
    caches: any;
    /**
     * Convert an AbstractNode to the backend format using the named template.
     *
     * Note: convert() is async because getContent() / applySubs() in the core package
     * is async throughout. We pre-resolve content here and expose it synchronously to
     * template engines (which are all synchronous) via a Proxy wrapper.
     * @param {object} node - the AbstractNode to convert
     * @param {string|null} [templateName=null] - the template name to use (default: node.nodeName)
     * @param {object|null} [opts=null] - optional plain object passed as locals to the template
     * @returns {Promise<string>}
     */
    convert(node: object, templateName?: string | null, opts?: object | null): Promise<string>;
    /**
     * Retrieve a shallow copy of the templates map.
     * @returns {Object} plain object keyed by template name
     */
    get templates(): any;
    /**
     * Method alias for the templates getter — matches the core/Ruby API.
     * @returns {Object} plain object keyed by template name
     */
    getTemplates(): any;
    /**
     * Register a template with this converter (and optionally the template cache).
     * @param {string} name - the template name
     * @param {{ render: Function, file: string }} template - the template object
     * @returns {{ render: Function, file: string }} the template object
     */
    register(name: string, template: {
        render: Function;
        file: string;
    }): {
        render: Function;
        file: string;
    };
}
export default TemplateConverter;
import { ConverterBase } from '../converter.js';
