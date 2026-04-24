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

import { applyLogging } from './logging.js'
import { DEFAULT_EXTENSIONS } from './constants.js'
import { TrailingDigitsRx } from './rx.js'

// ── BackendTraits mixin ───────────────────────────────────────────────────────
// Apply to a converter instance to give it basebackend/filetype/htmlsyntax helpers.

export function applyBackendTraits(instance) {
  instance._backendTraits = null

  instance.basebackend = function (value = null) {
    if (value) return ((this._backendTraits ??= {}).basebackend = value)
    return this._getBackendTraits().basebackend
  }
  instance.filetype = function (value = null) {
    if (value) return (this._getBackendTraits().filetype = value)
    return this._getBackendTraits().filetype
  }
  instance.htmlsyntax = function (value = null) {
    if (value) return (this._getBackendTraits().htmlsyntax = value)
    return this._getBackendTraits().htmlsyntax
  }
  instance.outfilesuffix = function (value = null) {
    if (value) return (this._getBackendTraits().outfilesuffix = value)
    return this._getBackendTraits().outfilesuffix
  }
  instance.supportsTemplates = function (value = true) {
    this._getBackendTraits().supportsTemplates = value
  }
  instance.supportsTemplates.call = (value = true) =>
    instance.supportsTemplates(value)
  instance.hasSupportsTemplates = function () {
    return !!this._getBackendTraits().supportsTemplates
  }
  instance.initBackendTraits = function (value = null) {
    this._backendTraits = value ?? {}
  }
  instance._getBackendTraits = function (basebackend = null) {
    return (this._backendTraits ??= deriveBackendTraits(
      this.backend,
      basebackend
    ))
  }
  instance.backendInfo = instance._getBackendTraits
}

// ── Converter.derive_backend_traits ──────────────────────────────────────────

export function deriveBackendTraits(backend, basebackend = null) {
  if (!backend) return {}
  const base = basebackend ?? backend.replace(TrailingDigitsRx, '')
  let outfilesuffix = DEFAULT_EXTENSIONS[base]
  let filetype
  if (outfilesuffix) {
    filetype = outfilesuffix.slice(1)
  } else {
    filetype = base
    outfilesuffix = `.${filetype}`
  }
  const traits = { basebackend: base, filetype, outfilesuffix }
  if (filetype === 'html') traits.htmlsyntax = 'html'
  return traits
}

// ── normalizeConverter ────────────────────────────────────────────────────────
// Bridge a user-registered converter instance into the interface expected by
// Document._updateBackendAttributes, which requires _getBackendTraits().
//
// Supports three conventions used by user converters:
//   1. converter.backendTraits = { basebackend, outfilesuffix, filetype, htmlsyntax }
//   2. Plain properties: converter.basebackend, converter.outfilesuffix, …
//   3. Already has _getBackendTraits() (e.g. extends ConverterBase) — returned as-is.

export function normalizeConverter(converter, backend) {
  if (!converter || typeof converter._getBackendTraits === 'function')
    return converter

  let traits = null
  if (converter.backendTraits && typeof converter.backendTraits === 'object') {
    traits = { ...converter.backendTraits }
  } else {
    const hasPlain =
      converter.basebackend ||
      converter.outfilesuffix ||
      converter.filetype ||
      converter.htmlsyntax
    if (hasPlain) {
      traits = {}
      if (converter.basebackend) traits.basebackend = converter.basebackend
      if (converter.outfilesuffix)
        traits.outfilesuffix = converter.outfilesuffix
      if (converter.filetype) traits.filetype = converter.filetype
      if (converter.htmlsyntax) traits.htmlsyntax = converter.htmlsyntax
    }
  }

  // Apply the BackendTraits mixin so Document can call the standard accessor methods.
  applyBackendTraits(converter)
  if (traits) converter._backendTraits = traits
  return converter
}

// ── CustomFactory ─────────────────────────────────────────────────────────────

export class CustomFactory {
  constructor(seedRegistry = null) {
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
  // backends may be passed as individual strings or as a single Array.
  register(converter, ...backends) {
    if (backends.length === 1 && Array.isArray(backends[0]))
      backends = backends[0]
    for (const backend of backends) {
      if (backend === '*') this._catchAll = converter
      else this._registry[backend] = converter
    }
  }

  // Public: Retrieve the converter class registered for the given backend.
  // Returns undefined (not null) when no match is found, mirroring the core API.
  for(backend) {
    return this._registry[backend] ?? this._catchAll ?? undefined
  }

  // Public: Create a new converter instance for the given backend (synchronous).
  // Requires the converter class to already be registered; does not support template dirs.
  createSync(backend, opts = {}) {
    let converter = this.for(backend)
    if (!converter) return null
    if (typeof converter === 'function' && converter.prototype)
      converter = new converter(backend, opts)
    return normalizeConverter(converter, backend)
  }

  // Public: Create a new converter instance for the given backend.
  async create(backend, opts = {}) {
    let converter = this.for(backend)
    if (converter) {
      if (typeof converter === 'function' && converter.prototype) {
        converter = new converter(backend, opts)
      }
      const templateDirs = opts.template_dirs
      if (
        templateDirs &&
        typeof converter.hasSupportsTemplates === 'function' &&
        converter.hasSupportsTemplates()
      ) {
        const { CompositeConverter } = await import('./converter/composite.js')
        const { TemplateConverter } = await import('./converter/template.js')
        return new CompositeConverter(
          backend,
          await TemplateConverter.create(backend, templateDirs, opts),
          converter,
          { backendTraitsSource: converter }
        )
      }
      return converter
    }
    const templateDirs = opts.template_dirs
    if (templateDirs) {
      const delegateBackend = opts.delegate_backend
      if (delegateBackend) {
        let delegateConverter = this.for(delegateBackend)
        if (delegateConverter) {
          if (
            typeof delegateConverter === 'function' &&
            delegateConverter.prototype
          ) {
            delegateConverter = new delegateConverter(delegateBackend, opts)
          }
          const { CompositeConverter } = await import(
            './converter/composite.js'
          )
          const { TemplateConverter } = await import('./converter/template.js')
          return new CompositeConverter(
            backend,
            await TemplateConverter.create(backend, templateDirs, opts),
            delegateConverter,
            { backendTraitsSource: delegateConverter }
          )
        }
      }
      const { TemplateConverter } = await import('./converter/template.js')
      return await TemplateConverter.create(backend, templateDirs, opts)
    }
    return null
  }

  // Public: Get the registered converters map. (for testing)
  converters() {
    return { ...this._registry }
  }

  // Public: Unregister all converters.
  unregisterAll() {
    this._registry = {}
    this._catchAll = null
  }
}

// ── DefaultFactory ────────────────────────────────────────────────────────────
// Global registry of built-in + statically registered converters.

// Static per-backend imports allow bundlers (Rollup/Vite) to inline each module.
async function _importBuiltinConverter(backend) {
  if (backend === 'html5') return import('./converter/html5.js')
  if (backend === 'docbook5') return import('./converter/docbook5.js')
  if (backend === 'manpage') return import('./converter/manpage.js')
  return null
}

class DefaultFactory extends CustomFactory {
  constructor() {
    super()
    this._defaultRegistry = {} // separate from CustomFactory._registry (for unregisterAll)
  }

  register(converter, ...backends) {
    // User registrations go into _registry (CustomFactory layer) so that unregisterAll()
    // can remove them without touching the lazy-loaded built-in entries in _defaultRegistry.
    // backends may be passed as individual strings or as a single Array.
    if (backends.length === 1 && Array.isArray(backends[0]))
      backends = backends[0]
    for (const backend of backends) {
      if (backend === '*') this._catchAll = converter
      else this._registry[backend] = converter
    }
  }

  for(backend) {
    // User registrations first (_registry), then lazy-loaded built-ins (_defaultRegistry),
    // then catch-all.  Returns undefined when no match is found, mirroring the core API.
    return (
      this._registry[backend] ??
      this._defaultRegistry[backend] ??
      this._catchAll ??
      undefined
    )
  }

  // Public: Return the combined registry (built-in + user-registered entries).
  getRegistry() {
    return { ...this._defaultRegistry, ...this._registry }
  }

  // Public: Return this factory (mirrors the core ConverterFactory.getDefault() API).
  getDefault() {
    return this
  }

  createSync(backend, opts = {}) {
    let converter =
      this._registry[backend] ??
      this._defaultRegistry[backend] ??
      this._catchAll
    if (!converter) return null
    if (typeof converter === 'function' && converter.prototype)
      converter = new converter(backend, opts)
    return normalizeConverter(converter, backend)
  }

  async create(backend, opts = {}) {
    let converter = this._registry[backend] ?? this._defaultRegistry[backend]
    if (!converter) {
      const mod = await _importBuiltinConverter(backend)
      if (mod) {
        converter = mod.default ?? Object.values(mod)[0]
        if (converter) this._defaultRegistry[backend] = converter
      }
    }
    if (!converter) converter = this._catchAll
    if (!converter) {
      const templateDirs = opts.template_dirs
      if (templateDirs) {
        const { TemplateConverter } = await import('./converter/template.js')
        return await TemplateConverter.create(backend, templateDirs, opts)
      }
      return null
    }
    if (typeof converter === 'function' && converter.prototype) {
      converter = new converter(backend, opts)
    }
    const templateDirs = opts.template_dirs
    if (
      templateDirs &&
      typeof converter.hasSupportsTemplates === 'function' &&
      converter.hasSupportsTemplates()
    ) {
      const { CompositeConverter } = await import('./converter/composite.js')
      const { TemplateConverter } = await import('./converter/template.js')
      return new CompositeConverter(
        backend,
        await TemplateConverter.create(backend, templateDirs, opts),
        converter,
        { backendTraitsSource: converter }
      )
    }
    return converter
  }

  unregisterAll() {
    // Keep built-in entries; clear only custom and catch-all
    this._registry = {}
    this._catchAll = null
  }
}

// ── The global Converter registry ─────────────────────────────────────────────

export const Converter = new DefaultFactory()

// Attach derive_backend_traits as a property for compatibility
Converter.deriveBackendTraits = deriveBackendTraits

// ── Converter.Base ────────────────────────────────────────────────────────────

export class ConverterBase {
  constructor(backend, opts = {}) {
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
  async convert(node, transform = null, opts = null) {
    const method = `convert_${transform ?? node.nodeName}`
    if (typeof this[method] === 'function') {
      return opts ? this[method](node, opts) : this[method](node)
    }
    this.logger.warn(
      `missing convert handler for ${transform ?? node.nodeName} node in ${this.backend} backend (${this.constructor.name})`
    )
    return null
  }

  // Public: Report whether this converter can handle the given transform.
  handles(transform) {
    return typeof this[`convert_${transform}`] === 'function'
  }

  // Public: Convert using only content (no wrapping).
  async contentOnly(node) {
    return node.content()
  }

  // Public: Skip conversion.
  skip(_node) {}

  // Class method: Register this converter class with the global registry.
  static registerFor(...backends) {
    Converter.register(this, ...backends.map(String))
  }
}
