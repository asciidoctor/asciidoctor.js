// ESM conversion of block.rb

import { AbstractBlock } from './abstract_block.js'
import { prepareSourceString } from './helpers.js'
import { LF } from './constants.js'

// Maps block context strings to their default content model.
// Any context not listed defaults to 'simple'.
export const DEFAULT_CONTENT_MODEL = new Proxy(
  {
    audio:          'empty',
    image:          'empty',
    listing:        'verbatim',
    literal:        'verbatim',
    stem:           'raw',
    open:           'compound',
    page_break:     'empty',
    pass:           'raw',
    thematic_break: 'empty',
    video:          'empty',
  },
  { get: (target, key) => Object.prototype.hasOwnProperty.call(target, key) ? target[key] : 'simple' }
)

// Public: Methods for managing AsciiDoc content blocks.
export class Block extends AbstractBlock {
  // Public: Get/Set the original Array of source lines for this block.
  // lines

  // Public: Initialize an Asciidoctor::Block object.
  //
  // parent  - The parent AbstractBlock.
  // context - The String context name (e.g. 'paragraph', 'listing').
  // opts    - A plain object of options:
  //           content_model - 'compound', 'simple', 'verbatim', 'raw', 'empty'
  //                           (default: looked up from DEFAULT_CONTENT_MODEL)
  //           attributes    - Hash of attributes to merge in.
  //           source        - String or Array of raw source lines.
  //           subs          - :default | Array | String | null
  //           default_subs  - override for default subs (used with subs: :default)
  constructor (parent, context, opts = {}) {
    super(parent, context, opts)
    this.contentModel = opts.content_model ?? DEFAULT_CONTENT_MODEL[context]

    if ('subs' in opts) {
      const subs = opts.subs
      if (subs) {
        if (subs === 'default') {
          // subs attribute is honored; falls back to opts.default_subs then built-in defaults
          this._defaultSubs = opts.default_subs ?? null
        } else if (Array.isArray(subs)) {
          // subs attribute is not honored; use provided array directly
          this._defaultSubs = [...subs]
          delete this.attributes.subs
        } else {
          // e.g. subs: 'normal' — subs attribute is not honored
          this._defaultSubs = null
          this.attributes.subs = String(subs)
        }
        // Resolve subs eagerly when subs option is specified
        this.commitSubs()
      } else {
        // subs: null/undefined — prevent subs from being resolved
        this._defaultSubs = []
        delete this.attributes.subs
      }
    } else {
      // Defer subs resolution; subs attribute will be honored later
      this._defaultSubs = null
    }

    const rawSource = opts.source
    if (!rawSource && rawSource !== 0) {
      this.lines = []
    } else if (typeof rawSource === 'string') {
      this.lines = prepareSourceString(rawSource)
    } else {
      this.lines = [...rawSource]
    }
  }

  // Public: Alias for context — consistent with AsciiDoc terminology.
  get blockname () { return this.context }

  // Public: Get the converted result appropriate to this block's content model.
  //
  // Returns the String result.
  content () {
    switch (this.contentModel) {
      case 'compound':
        return super.content()
      case 'simple':
        return this.applySubs(this.lines.join(LF), this._subs)
      case 'verbatim':
      case 'raw': {
        const result = this.applySubs(this.lines, this._subs)
        if (result.length < 2) return result[0] ?? ''
        while (result.length > 0 && result[0].trimEnd() === '') result.shift()
        while (result.length > 0 && result[result.length - 1].trimEnd() === '') result.pop()
        return result.join(LF)
      }
      default:
        if (this.contentModel !== 'empty') {
          this.logger.warn(`unknown content model '${this.contentModel}' for block: ${this}`)
        }
        return null
    }
  }

  // Public: Returns the preprocessed source of this block as a single String.
  source () {
    return this.lines.join(LF)
  }

  toString () {
    const contentSummary = this.contentModel === 'compound'
      ? `blocks: ${this.blocks.length}`
      : `lines: ${this.lines.length}`
    return `#<Block {context: '${this.context}', content_model: '${this.contentModel}', style: ${JSON.stringify(this.style ?? null)}, ${contentSummary}}>`
  }
}
