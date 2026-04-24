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
    static create(backend: any, templateDirs: any, opts?: {}): Promise<TemplateConverter>;
    constructor(backend: any, templateDirs: any, opts?: {});
    _templates: {};
    templateDirs: any[];
    engine: any;
    engineOptions: any;
    caches: any;
    get templates(): {};
    getTemplates(): {};
    register(name: any, template: any): any;
    _scan(): Promise<void>;
    _scanDir(templateDir: any, fileExtFilter: any, templateCache?: any): Promise<{
        'helpers.js': {
            file: any;
            ctx: any;
        };
    }>;
    _nodeRequire(moduleName: any): any;
}
export default TemplateConverter;
import { ConverterBase } from '../converter.js';
