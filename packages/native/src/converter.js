// ESM conversion of converter.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby module Converter → exported plain object + classes.
//   - Ruby's `include Converter` mixin → JS class extends ConverterBase or implements the interface manually.
//   - BackendTraits Ruby module → plain mixin object applied via applyBackendTraits().
//   - DefaultFactory's thread-safe synchronization → not needed in single-threaded JS.
//   - TemplateConverter / CompositeConverter autoloaded → imported lazily via dynamic import() stubs.
//   - Converter.derive_backend_traits exposed as static function.
//   - DEFAULT_EXTENSIONS / TrailingDigitsRx imported from constants/rx.

import { applyLogging }      from './logging.js'
import { DEFAULT_EXTENSIONS } from './constants.js'
import { TrailingDigitsRx }   from './rx.js'

// ── BackendTraits mixin ───────────────────────────────────────────────────────
// Apply to a converter instance to give it basebackend/filetype/htmlsyntax helpers.

export function applyBackendTraits (instance) {
  instance._backendTraits = null

  instance.basebackend = function (value = null) {
    if (value) return (this._backendTraits ??= {})[`basebackend`] = value
    return this._getBackendTraits().basebackend
  }
  instance.filetype = function (value = null) {
    if (value) return (this._getBackendTraits()).filetype = value
    return this._getBackendTraits().filetype
  }
  instance.htmlsyntax = function (value = null) {
    if (value) return (this._getBackendTraits()).htmlsyntax = value
    return this._getBackendTraits().htmlsyntax
  }
  instance.outfilesuffix = function (value = null) {
    if (value) return (this._getBackendTraits()).outfilesuffix = value
    return this._getBackendTraits().outfilesuffix
  }
  instance.supportsTemplates = function (value = true) {
    this._getBackendTraits().supportsTemplates = value
  }
  instance.supportsTemplates.call = (value = true) => instance.supportsTemplates(value)
  instance.hasSupportsTemplates = function () {
    return !!this._getBackendTraits().supportsTemplates
  }
  instance.initBackendTraits = function (value = null) {
    this._backendTraits = value ?? {}
  }
  instance._getBackendTraits = function (basebackend = null) {
    return (this._backendTraits ??= deriveBackendTraits(this.backend, basebackend))
  }
  instance.backendInfo = instance._getBackendTraits
}

// ── Converter.derive_backend_traits ──────────────────────────────────────────

export function deriveBackendTraits (backend, basebackend = null) {
  if (!backend) return {}
  const base = basebackend ?? backend.replace(TrailingDigitsRx, '')
  let outfilesuffix = DEFAULT_EXTENSIONS[base]
  let filetype
  if (outfilesuffix) {
    filetype = outfilesuffix.slice(1)
  } else {
    filetype     = base
    outfilesuffix = `.${filetype}`
  }
  const traits = { basebackend: base, filetype, outfilesuffix }
  if (filetype === 'html') traits.htmlsyntax = 'html'
  return traits
}

// ── CustomFactory ─────────────────────────────────────────────────────────────

export class CustomFactory {
  constructor (seedRegistry = null) {
    this._registry = {}
    this._catchAll = null
    if (seedRegistry) {
      const star = seedRegistry['*']
      delete seedRegistry['*']
      if (star) this._catchAll = star
      Object.assign(this._registry, seedRegistry)
    }
  }

  // Public: Register a converter class for one or more backend names.
  register (converter, ...backends) {
    for (const backend of backends) {
      if (backend === '*') this._catchAll = converter
      else this._registry[backend] = converter
    }
  }

  // Public: Retrieve the converter class registered for the given backend.
  for (backend) {
    return this._registry[backend] ?? this._catchAll ?? null
  }

  // Public: Create a new converter instance for the given backend (synchronous).
  // Requires the converter class to already be registered; does not support template dirs.
  createSync (backend, opts = {}) {
    let converter = this.for(backend)
    if (!converter) return null
    if (typeof converter === 'function' && converter.prototype) converter = new converter(backend, opts)
    return converter
  }

  // Public: Create a new converter instance for the given backend.
  async create (backend, opts = {}) {
    let converter = this.for(backend)
    if (converter) {
      if (typeof converter === 'function' && converter.prototype) {
        converter = new converter(backend, opts)
      }
      const templateDirs = opts.template_dirs
      if (templateDirs && typeof converter.hasSupportsTemplates === 'function' && converter.hasSupportsTemplates()) {
        const { CompositeConverter } = await import('./converter/composite.js')
        const { TemplateConverter }  = await import('./converter/template.js')
        return new CompositeConverter(backend, new TemplateConverter(backend, templateDirs, opts), converter, { backendTraitsSource: converter })
      }
      return converter
    }
    const templateDirs = opts.template_dirs
    if (templateDirs) {
      const delegateBackend = opts.delegate_backend
      if (delegateBackend) {
        let delegateConverter = this.for(delegateBackend)
        if (delegateConverter) {
          if (typeof delegateConverter === 'function' && delegateConverter.prototype) {
            delegateConverter = new delegateConverter(delegateBackend, opts)
          }
          const { CompositeConverter } = await import('./converter/composite.js')
          const { TemplateConverter }  = await import('./converter/template.js')
          return new CompositeConverter(backend, new TemplateConverter(backend, templateDirs, opts), delegateConverter, { backendTraitsSource: delegateConverter })
        }
      }
      const { TemplateConverter } = await import('./converter/template.js')
      return new TemplateConverter(backend, templateDirs, opts)
    }
    return null
  }

  // Public: Get the registered converters map. (for testing)
  converters () {
    return { ...this._registry }
  }

  // Public: Unregister all converters.
  unregisterAll () {
    this._registry = {}
    this._catchAll = null
  }
}

// ── DefaultFactory ────────────────────────────────────────────────────────────
// Global registry of built-in + statically registered converters.

const _PROVIDED = {
  html5:    './converter/html5.js',
  docbook5: './converter/docbook5.js',
  manpage:  './converter/manpage.js',
}

class DefaultFactory extends CustomFactory {
  constructor () {
    super()
    this._defaultRegistry = {}  // separate from CustomFactory._registry (for unregisterAll)
  }

  register (converter, ...backends) {
    // Registrations go into the global default map
    for (const backend of backends) {
      if (backend === '*') this._catchAll = converter
      else this._defaultRegistry[backend] = converter
    }
  }

  for (backend) {
    // Custom (proxy) entries first, then default registry, then lazy built-in, then catch-all
    return this._registry[backend] ?? this._defaultRegistry[backend] ?? this._catchAll ?? null
  }

  createSync (backend, opts = {}) {
    let converter = this._registry[backend] ?? this._defaultRegistry[backend] ?? this._catchAll
    if (!converter) return null
    if (typeof converter === 'function' && converter.prototype) converter = new converter(backend, opts)
    return converter
  }

  async create (backend, opts = {}) {
    let converter = this._registry[backend] ?? this._defaultRegistry[backend]
    if (!converter && _PROVIDED[backend]) {
      // Lazy-load the built-in converter
      const mod = await import(_PROVIDED[backend])
      converter = mod.default ?? Object.values(mod)[0]
      if (converter) this._defaultRegistry[backend] = converter
    }
    if (!converter) converter = this._catchAll
    if (!converter) {
      const templateDirs = opts.template_dirs
      if (templateDirs) {
        const { TemplateConverter } = await import('./converter/template.js')
        return new TemplateConverter(backend, templateDirs, opts)
      }
      return null
    }
    if (typeof converter === 'function' && converter.prototype) {
      converter = new converter(backend, opts)
    }
    const templateDirs = opts.template_dirs
    if (templateDirs && typeof converter.hasSupportsTemplates === 'function' && converter.hasSupportsTemplates()) {
      const { CompositeConverter } = await import('./converter/composite.js')
      const { TemplateConverter }  = await import('./converter/template.js')
      return new CompositeConverter(backend, new TemplateConverter(backend, templateDirs, opts), converter, { backendTraitsSource: converter })
    }
    return converter
  }

  unregisterAll () {
    // Keep built-in entries; clear only custom and catch-all
    this._registry  = {}
    this._catchAll  = null
  }
}

// ── The global Converter registry ─────────────────────────────────────────────

export const Converter = new DefaultFactory()

// Attach derive_backend_traits as a property for compatibility
Converter.deriveBackendTraits = deriveBackendTraits

// ── Converter.Base ────────────────────────────────────────────────────────────

export class ConverterBase {
  constructor (backend, opts = {}) {
    this.backend = backend
    applyBackendTraits(this)
    applyLogging(this)
  }

  // Public: Convert a node by dispatching to a convert_<transform> method.
  //
  // node      - The AbstractNode to convert.
  // transform - String hint for which method to call (default: node.nodeName).
  // opts      - Optional hints Hash.
  //
  // Returns the String result or null.
  convert (node, transform = null, opts = null) {
    const method = `convert_${transform ?? node.nodeName}`
    if (typeof this[method] === 'function') {
      return opts ? this[method](node, opts) : this[method](node)
    }
    this.logger.warn(`missing convert handler for ${transform ?? node.nodeName} node in ${this.backend} backend (${this.constructor.name})`)
    return null
  }

  // Public: Report whether this converter can handle the given transform.
  handles (transform) {
    return typeof this[`convert_${transform}`] === 'function'
  }

  // Public: Convert using only content (no wrapping).
  contentOnly (node) {
    return node.content
  }

  // Public: Skip conversion.
  skip (_node) {}

  // Class method: Register this converter class with the global registry.
  static registerFor (...backends) {
    Converter.register(this, ...backends.map(String))
  }
}
