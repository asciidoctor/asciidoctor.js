// ESM conversion of block.rb

import { AbstractBlock } from './abstract_block.js'
import { prepareSourceString } from './helpers.js'
import { LF } from './constants.js'

/**
 * Maps block context strings to their default content model.
 * Any context not listed defaults to 'simple'.
 * @type {Object<string, string>}
 */
export const DEFAULT_CONTENT_MODEL = new Proxy(
  {
    audio: 'empty',
    image: 'empty',
    listing: 'verbatim',
    literal: 'verbatim',
    stem: 'raw',
    open: 'compound',
    page_break: 'empty',
    pass: 'raw',
    thematic_break: 'empty',
    video: 'empty',
  },
  {
    get: (target, key) => (Object.hasOwn(target, key) ? target[key] : 'simple'),
  }
)

/**
 * Methods for managing AsciiDoc content blocks.
 */
export class Block extends AbstractBlock {
  /** @type {string[]} */
  lines
  /** @type {string[]|null} */
  defaultSubs

  /**
   * Factory method — mirrors the core Block.create(parent, context, opts) API.
   * @param {AbstractBlock} parent
   * @param {string} context
   * @param {Object} [opts={}]
   * @returns {Block}
   */
  static create(parent, context, opts = {}) {
    return new Block(parent, context, opts)
  }

  /**
   * Initialize an Asciidoctor::Block object.
   * @param {AbstractBlock} parent - The parent AbstractBlock.
   * @param {string} context - The context name (e.g. 'paragraph', 'listing').
   * @param {Object} [opts={}]
   * @param {'compound'|'simple'|'verbatim'|'raw'|'empty'} [opts.content_model] - Defaults to lookup from DEFAULT_CONTENT_MODEL.
   * @param {Object} [opts.attributes] - Attributes to merge in.
   * @param {string|string[]} [opts.source] - Raw source string or lines.
   * @param {'default'|string[]|string|null} [opts.subs]
   * @param {string[]} [opts.default_subs] - Override for default subs (used with subs: 'default').
   */
  constructor(parent, context, opts = {}) {
    super(parent, context, opts)
    this.contentModel = opts.content_model ?? DEFAULT_CONTENT_MODEL[context]

    if ('subs' in opts) {
      const subs = opts.subs
      if (subs) {
        if (subs === 'default') {
          // subs attribute is honored; falls back to opts.default_subs then built-in defaults
          this.defaultSubs = opts.default_subs ?? null
        } else if (Array.isArray(subs)) {
          // subs attribute is not honored; use provided array directly
          this.defaultSubs = [...subs]
          delete this.attributes.subs
        } else {
          // e.g. subs: 'normal' — subs attribute is not honored
          this.defaultSubs = null
          this.attributes.subs = String(subs)
        }
        // Resolve subs eagerly when subs option is specified
        this.commitSubs()
      } else {
        // subs: null/[] — lock subs as empty; subsequent commitSubs() calls are no-ops
        this.defaultSubs = []
        delete this.attributes.subs
      }
    } else {
      // Defer subs resolution; subs attribute will be honored later
      this.defaultSubs = null
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

  /** @returns {string} Alias for context — consistent with AsciiDoc terminology. */
  get blockname() {
    return this.context
  }

  /**
   * Get the converted result appropriate to this block's content model.
   * @returns {Promise<string|null>}
   */
  async content() {
    switch (this.contentModel) {
      case 'compound':
        return super.content()
      case 'simple':
        return this.applySubs(this.lines.join(LF), this.subs)
      case 'verbatim':
      case 'raw': {
        const result = await this.applySubs(this.lines, this.subs)
        if (result.length < 2) return result[0] ?? ''
        while (result.length > 0 && result[0].trimEnd() === '') result.shift()
        while (result.length > 0 && result[result.length - 1].trimEnd() === '')
          result.pop()
        return result.join(LF)
      }
      default:
        if (this.contentModel !== 'empty') {
          this.logger.warn(
            `unknown content model '${this.contentModel}' for block: ${this}`
          )
        }
        return null
    }
  }

  /** @returns {string[]} The source lines for this block (matches the core API). */
  getSourceLines() {
    return this.lines
  }

  /** @returns {string} The preprocessed source of this block as a single String. */
  get source() {
    return this.lines.join(LF)
  }

  /** @returns {string} The source as a single String (alias for the source getter). */
  getSource() {
    return this.source
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Get the block name (alias for context).
   * @returns {string}
   */
  getBlockName() {
    return this.blockname
  }

  toString() {
    const contentSummary =
      this.contentModel === 'compound'
        ? `blocks: ${this.blocks.length}`
        : `lines: ${this.lines.length}`
    return `#<Block {context: '${this.context}', content_model: '${this.contentModel}', style: ${JSON.stringify(this.style ?? null)}, ${contentSummary}}>`
  }
}
