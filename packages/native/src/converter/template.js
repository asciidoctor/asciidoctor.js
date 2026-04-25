// ESM conversion of converter/template.rb
//
// Ruby-to-JavaScript notes:
//   - Tilt template engine (haml/slim/erb) → replaced by nunjucks/handlebars/ejs/pug/js/cjs.
//     Reference: packages/core/lib/asciidoctor/js/asciidoctor_ext/node/template.rb
//   - Static @caches → TemplateConverter._caches (class-level static property).
//   - Ruby Dir.glob(pattern) → readdirSync(dir) filtered by extension.
//   - Ruby File.directory?/File.file? → fsp.stat().isDirectory()/isFile() (async).
//   - Ruby File.basename / File.expand_path → node:path basename / resolve.
//   - PathResolver.system_path → pathResolver.systemPath().
//   - template.render(node, opts) → template.render({node, opts, helpers}).
//   - Helpers loaded from helpers.js/helpers.cjs; can export configure(enginesContext).
//   - Custom engines registered via TemplateConverter.TemplateEngine.register(ext, adapter).
//   - Thread safety / Mutex → not needed (single-threaded JS).
//   - load_eruby / eRuby support → not applicable in JS environment.
//   - require_library → _nodeRequire() with a user-friendly IOError on missing module.
//   - Constructor is sync; use TemplateConverter.create() factory for async _scan().

import { ConverterBase } from '../converter.js'
import { PathResolver } from '../path_resolver.js'
import { createRequire } from 'node:module'
import { promises as fsp } from 'node:fs'
import path from 'node:path'

const _require = createRequire(import.meta.url)

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
const TemplateEngine = {
  registry: {},
  register(names, adapter) {
    const list = Array.isArray(names) ? names : [names]
    for (const name of list) this.registry[name] = adapter
  },
}

export class TemplateConverter extends ConverterBase {
  // Class-level scan + template caches (shared across instances when template_cache: true).
  static _caches = { scans: {}, templates: {} }

  // Expose the TemplateEngine registry on the class for external registration.
  static TemplateEngine = TemplateEngine

  static clearCaches() {
    TemplateConverter._caches.scans = {}
    TemplateConverter._caches.templates = {}
  }

  /** Alias for clearCaches() — matches the Ruby/core API name. */
  static clearCache() {
    TemplateConverter.clearCaches()
  }

  /** Return the class-level cache object. */
  static getCache() {
    return TemplateConverter._caches
  }

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
  constructor(backend, templateDirs, opts = {}) {
    super(backend, opts)
    this._templates = {}
    this.templateDirs = Array.isArray(templateDirs)
      ? templateDirs
      : [templateDirs]
    this.engine = opts.template_engine ?? null
    this.engineOptions = opts.template_engine_options ?? {}

    if (opts.template_cache === true) {
      this.caches = TemplateConverter._caches
    } else if (opts.template_cache && typeof opts.template_cache === 'object') {
      this.caches = opts.template_cache
    } else {
      this.caches = {} // empty object effectively disables caching
    }
  }

  /**
   * Async factory — create and fully initialize a TemplateConverter.
   * @param {string} backend
   * @param {string|string[]} templateDirs
   * @param {Object} [opts={}]
   * @returns {Promise<TemplateConverter>}
   */
  static async create(backend, templateDirs, opts = {}) {
    const converter = new TemplateConverter(backend, templateDirs, opts)
    await converter._scan()
    return converter
  }

  /**
   * Convert an AbstractNode to the backend format using the named template.
   *
   * Note: convert() is async because getContent() / applySubs() in the native package
   * is async throughout. We pre-resolve content here and expose it synchronously to
   * template engines (which are all synchronous) via a Proxy wrapper.
   * @param {object} node - the AbstractNode to convert
   * @param {string|null} [templateName=null] - the template name to use (default: node.nodeName)
   * @param {object|null} [opts=null] - optional plain object passed as locals to the template
   * @returns {Promise<string>}
   */
  async convert(node, templateName = null, opts = null) {
    const name = templateName ?? node.nodeName
    const template = this._templates[name]
    if (!template)
      throw new Error(
        `Could not find a custom template to handle transform: ${name}`
      )

    const helpersEntry = this._templates['helpers.js']
    const helpers = helpersEntry ? helpersEntry.ctx : undefined

    // Pre-resolve async content so synchronous template engines receive a plain string.
    const content =
      typeof node.getContent === 'function'
        ? await node.getContent()
        : undefined

    // Pre-resolve list items when the node exposes getItems().
    let resolvedItems = null
    if (typeof node.getItems === 'function') {
      const rawItems = node.getItems()
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        resolvedItems = await Promise.all(
          rawItems.map(async (item) => {
            const itemContent =
              typeof item.getContent === 'function'
                ? await item.getContent()
                : undefined
            return _makeContentProxy(item, itemContent)
          })
        )
      } else {
        resolvedItems = rawItems ?? []
      }
    }

    const proxyNode = _makeContentProxy(node, content, resolvedItems)
    const result = template.render({ node: proxyNode, opts, helpers })
    return name === 'document' ? result.trim() : result.trimEnd()
  }

  /**
   * Check whether there is a template registered for the given name.
   * @param {string} name
   * @returns {boolean}
   */
  handles(name) {
    return Object.hasOwn(this._templates, name)
  }

  /**
   * Retrieve a shallow copy of the templates map.
   * @returns {Object} plain object keyed by template name
   */
  get templates() {
    return { ...this._templates }
  }

  /**
   * Method alias for the templates getter — matches the core/Ruby API.
   * @returns {Object} plain object keyed by template name
   */
  getTemplates() {
    return { ...this._templates }
  }

  /**
   * Register a template with this converter (and optionally the template cache).
   * @param {string} name - the template name
   * @param {{ render: Function, file: string }} template - the template object
   * @returns {{ render: Function, file: string }} the template object
   */
  register(name, template) {
    if (this.caches.templates && template.file) {
      this.caches.templates[template.file] = template
    }
    this._templates[name] = template
    return template
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * Scan all template directories and populate this._templates.
   * @returns {Promise<void>}
   * @internal
   */
  async _scan() {
    const pathResolver = new PathResolver()
    const backend = this.backend
    const engine = this.engine

    for (let templateDir of this.templateDirs) {
      // Resolve and verify the directory exists.
      templateDir = pathResolver.systemPath(templateDir)
      if (!(await _isDirectory(templateDir))) continue

      // If a specific engine is requested, check for an engine subdirectory.
      let fileExtFilter = null
      if (engine) {
        fileExtFilter = engine
        const engineDir = path.join(templateDir, engine)
        if (await _isDirectory(engineDir)) templateDir = engineDir
      }

      // Check for a backend subdirectory.
      const backendDir = path.join(templateDir, backend)
      if (await _isDirectory(backendDir)) templateDir = backendDir

      const cacheKey = fileExtFilter
        ? `${templateDir}/*.${fileExtFilter}`
        : `${templateDir}/*`

      const scanCache = this.caches.scans
      if (scanCache) {
        const templateCache = this.caches.templates
        let scanned = scanCache[cacheKey]
        if (!scanned) {
          scanned = scanCache[cacheKey] = await this._scanDir(
            templateDir,
            fileExtFilter,
            templateCache
          )
        }
        for (const [name, template] of Object.entries(scanned)) {
          this._templates[name] = template
          if (templateCache && template.file) {
            templateCache[template.file] = template
          }
        }
      } else {
        const scanned = await this._scanDir(
          templateDir,
          fileExtFilter,
          this.caches.templates
        )
        Object.assign(this._templates, scanned)
      }
    }
  }

  /**
   * Scan templateDir for template files and return a map of name → template.
   * @param {string} templateDir - absolute path to the directory to scan
   * @param {string|null} fileExtFilter - extension restriction (without leading dot), or null for all
   * @param {Object|null} [templateCache=null] - cache of file → template, or falsy if no cache
   * @returns {Promise<Object>} plain object { [name]: template }
   * @internal
   */
  async _scanDir(templateDir, fileExtFilter, templateCache = null) {
    const result = {}
    let helpersFile = null
    const enginesCtx = {}

    let entries
    try {
      entries = await fsp.readdir(templateDir)
    } catch {
      return result
    }

    for (const basename of entries) {
      const file = path.join(templateDir, basename)

      // Skip non-files.
      if (!(await _isFile(file))) continue

      // Collect helpers separately; process after all templates.
      if (basename === 'helpers.js' || basename === 'helpers.cjs') {
        helpersFile = file
        continue
      }

      // Require at least one dot (i.e. a recognisable extension).
      const segments = basename.split('.')
      if (segments.length < 2) continue

      // Filter by engine if requested.
      if (fileExtFilter && segments[segments.length - 1] !== fileExtFilter)
        continue

      // Map file stem to transform name.
      let name = segments[0]
      if (name === 'block_ruler') {
        name = 'thematic_break'
      } else if (name.startsWith('block_')) {
        name = name.slice('block_'.length)
      }

      // Return cached template when available.
      if (templateCache?.[file]) {
        result[name] = templateCache[file]
        continue
      }

      const ext = segments[segments.length - 1]
      let template

      if (ext === 'nunjucks' || ext === 'njk') {
        const nunjucks = this._nodeRequire('nunjucks')
        let env
        if (enginesCtx.nunjucks?.environment) {
          env = enginesCtx.nunjucks.environment
        } else {
          const nunjucksOpts = { ...(this.engineOptions.nunjucks ?? {}) }
          delete nunjucksOpts.web // unsupported in Node.js
          env = nunjucks.configure(templateDir, nunjucksOpts)
          enginesCtx.nunjucks = { environment: env }
        }
        const compiled = nunjucks.compile(await fsp.readFile(file, 'utf8'), env)
        template = Object.assign(compiled, { file })
      } else if (ext === 'handlebars' || ext === 'hbs') {
        const handlebars = this._nodeRequire('handlebars')
        const hbsOpts = { ...(this.engineOptions.handlebars ?? {}) }
        let env
        if (enginesCtx.handlebars?.environment) {
          env = enginesCtx.handlebars.environment
        } else {
          env = handlebars.create()
          enginesCtx.handlebars = { environment: env }
        }
        const renderFn = env.compile(await fsp.readFile(file, 'utf8'), hbsOpts)
        template = { render: renderFn, file }
      } else if (ext === 'ejs') {
        const ejs = this._nodeRequire('ejs')
        const ejsOpts = { ...(this.engineOptions.ejs ?? {}), filename: file }
        // Unsupported EJS options in synchronous compile.
        delete ejsOpts.async
        delete ejsOpts.client
        const renderFn = ejs.compile(await fsp.readFile(file, 'utf8'), ejsOpts)
        template = { render: renderFn, file }
      } else if (ext === 'pug') {
        const pug = this._nodeRequire('pug')
        const pugOpts = { ...(this.engineOptions.pug ?? {}), filename: file }
        const renderFn = pug.compileFile(file, pugOpts)
        template = { render: renderFn, file }
      } else if (ext === 'js' || ext === 'cjs') {
        const renderFn = _require(file)
        template = { render: renderFn, file }
      } else {
        // Fall back to custom TemplateEngine registry.
        const adapter = TemplateEngine.registry[ext]
        if (adapter && typeof adapter.compile === 'function') {
          template = Object.assign(adapter.compile(file, name), { file })
        } else {
          continue
        }
      }

      result[name] = template
    }

    // Load helpers if found (or if a helpers.js exists at the top of the dir).
    const fallbackHelpers = path.join(templateDir, 'helpers.js')
    const fallbackHelpersCjs = path.join(templateDir, 'helpers.cjs')
    if (!helpersFile && (await _isFile(fallbackHelpers)))
      helpersFile = fallbackHelpers
    if (!helpersFile && (await _isFile(fallbackHelpersCjs)))
      helpersFile = fallbackHelpersCjs

    if (helpersFile) {
      const ctx = _require(helpersFile)
      if (typeof ctx.configure === 'function') ctx.configure(enginesCtx)
      result['helpers.js'] = { file: helpersFile, ctx }
    }

    return result
  }

  /**
   * Load an optional Node.js module by name.
   * @param {string} moduleName
   * @returns {*} the required module
   * @throws {Error} with a friendly message if the module is not installed
   * @internal
   */
  _nodeRequire(moduleName) {
    try {
      return _require(moduleName)
    } catch {
      throw new Error(
        `Unable to require the module '${moduleName}', please make sure that the module is installed.`
      )
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _isDirectory(p) {
  try {
    return (await fsp.stat(p)).isDirectory()
  } catch {
    return false
  }
}

async function _isFile(p) {
  try {
    return (await fsp.stat(p)).isFile()
  } catch {
    return false
  }
}

// Internal: Wrap an AST node in a Proxy that intercepts getContent() / content
// (and optionally getItems() / items) to return pre-resolved synchronous values.
//
// This lets synchronous template engines (nunjucks, ejs, pug, handlebars, …)
// receive plain strings even though the native applySubs() pipeline is async.
function _makeContentProxy(node, content, resolvedItems = null) {
  return new Proxy(node, {
    get(target, prop) {
      if (prop === 'getContent') return () => content
      if (prop === 'content') return content
      if (resolvedItems !== null && prop === 'getItems')
        return () => resolvedItems
      if (resolvedItems !== null && prop === 'items') return resolvedItems
      const val = Reflect.get(target, prop)
      return typeof val === 'function' ? val.bind(target) : val
    },
  })
}

export default TemplateConverter
