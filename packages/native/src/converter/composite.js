// ESM conversion of converter/composite.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby Hash.new { |h,k| h[k] = find_converter(k) } → Map with lazy population in converterFor().
//   - Ruby respond_to?(:composed) → typeof converter.composed === 'function'.
//   - Ruby raise → throw new Error(…).
//   - backend_traits_source keyword arg → options object { backendTraitsSource }.
//   - init_backend_traits(source.backend_traits) → this.initBackendTraits(source.backendInfo()).

import { applyBackendTraits } from '../converter.js'

// ── CompositeConverter ────────────────────────────────────────────────────────
// Delegates to the first converter in the chain that handles a given transform.

export class CompositeConverter {
  constructor(backend, ...args) {
    // Last argument may be an options object { backendTraitsSource }
    let opts = {}
    if (
      args.length > 0 &&
      args[args.length - 1] !== null &&
      typeof args[args.length - 1] === 'object' &&
      !args[args.length - 1].convert
    ) {
      opts = args.pop()
    }
    this.backend = backend
    this.converters = args
    applyBackendTraits(this)
    for (const converter of this.converters) {
      if (typeof converter.composed === 'function') converter.composed(this)
    }
    if (opts.backendTraitsSource) {
      this.initBackendTraits(opts.backendTraitsSource.backendInfo())
    }
    this._converterCache = new Map()
  }

  // Public: Delegates to the first converter that handles the given transform.
  //
  // node      - the AbstractNode to convert
  // transform - the optional String transform (default: node.nodeName)
  // opts      - optional hints passed to the delegate's convert method
  //
  // Returns the String result from the delegate's convert method.
  convert(node, transform = null, opts = null) {
    const t = transform ?? node.nodeName
    return this.converterFor(t).convert(node, t, opts)
  }

  // Public: Retrieve the converter for the specified transform (cached).
  //
  // Returns the matching Converter object.
  converterFor(transform) {
    if (this._converterCache.has(transform))
      return this._converterCache.get(transform)
    const converter = this._findConverter(transform)
    this._converterCache.set(transform, converter)
    return converter
  }

  // Public: Find the converter for the specified transform.
  // Throws an Error if no converter handles the transform.
  //
  // Returns the matching Converter object.
  _findConverter(transform) {
    for (const candidate of this.converters) {
      if (
        typeof candidate.handles === 'function' &&
        candidate.handles(transform)
      )
        return candidate
    }
    throw new Error(
      `Could not find a converter to handle transform: ${transform}`
    )
  }
}
