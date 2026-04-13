import { ConverterBase } from '../converter.js'

export default class TemplateConverter extends ConverterBase {
  constructor(backend, templateDirs, opts = {}) {
    super(backend, opts)
    this.templateDirs = templateDirs
    this.engine = opts['template_engine']
    this.engineOptions = opts['template_engine_options'] || {}
    if ('template_cache' in opts) {
      if (opts['template_cache'] === 'true') {
        this.caches = {
          scans: {},
          templates: {}
        }
      } else if (typeof opts['template_cache'] === 'object') {
        this.caches = opts.template_cache
      } else {
        this.caches = {} // the empty Object effectively disables caching
      }
    }
    this._scan()
  }

  /**
   * Scans the template directories specified in the constructor for templates,
   * loads the templates and stores them in an object that is accessible via the {TemplateConverter#templates} getter.
   * @private
   * @returns void
   */
  _scan() {

  }
}
