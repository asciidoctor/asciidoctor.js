// ESM conversion of inline.rb

import { AbstractNode } from './abstract_node.js'

/**
 * Represents an inline element in an AsciiDoc document.
 */
export class Inline extends AbstractNode {
  /**
   * @param {AbstractNode} parent
   * @param {string} context
   * @param {string|null} [text=null] - The String text of this inline element.
   * @param {Object} [opts={}] - A plain object of options:
   *   id     - The String id of this inline element.
   *   type   - The String type qualifier (e.g. 'ref', 'bibref').
   *   target - The String target (e.g. a URI).
   */
  constructor(parent, context, text = null, opts = {}) {
    super(parent, context, opts)
    this.nodeName = `inline_${context}`
    this.text = text
    this.id = opts.id ?? null
    this.type = opts.type ?? null
    this.target = opts.target ?? null
  }

  isBlock() {
    return false
  }
  isInline() {
    return true
  }

  /**
   * Convert this inline element using the document's converter.
   * @returns {Promise<string>}
   */
  async convert() {
    return this.converter.convert(this)
  }

  /** @deprecated Use convert() instead. */
  render() {
    return this.convert()
  }

  /**
   * Get the converted content (alias for text).
   * @returns {string|null}
   */
  content() {
    return this.text
  }

  /** Return the text of this inline node. */
  getText() {
    return this.text
  }

  /** Return the type qualifier of this inline node (e.g. 'ref', 'bibref'). */
  getType() {
    return this.type
  }

  /** Return the target (e.g. URI or anchor) of this inline node. */
  getTarget() {
    return this.target
  }

  /**
   * Get the alt text for this inline image.
   * @returns {string} the value of the alt attribute, or ''.
   */
  getAlt() {
    return this.attr('alt') || ''
  }

  /**
   * Check whether this inline node has reftext.
   * For ref and bibref nodes the text acts as the reftext.
   * @returns {boolean}
   */
  hasReftext() {
    return !!(this.text && (this.type === 'ref' || this.type === 'bibref'))
  }

  /**
   * Get the reftext for this inline node with substitutions applied.
   * The result is pre-computed during Document.parse() via precomputeReftext().
   * Falls back to the raw text if precomputeReftext() has not been called yet.
   * @returns {string|null}
   */
  get reftext() {
    if (this._convertedReftext !== undefined) return this._convertedReftext
    return this.text ?? null
  }

  /**
   * @internal
   * Pre-compute the reftext with substitutions applied asynchronously.
   * Called during Document.parse() so the synchronous getter works during conversion.
   * @returns {Promise<void>}
   */
  async precomputeReftext() {
    const val = this.text
    this._convertedReftext =
      val != null ? await this.applyReftextSubs(val) : null
  }

  /**
   * Generate cross-reference text (xreftext) that can be used to refer to this inline node.
   *
   * Uses the explicit reftext for this inline node, if specified, retrieved by calling the
   * reftext method. Otherwise, returns null.
   *
   * @param {string|null} [_xrefstyle=null] - Not currently used.
   * @returns {string|null} the reftext to refer to this inline node, or null if no reftext is defined.
   */
  xreftext(_xrefstyle = null) {
    return this.reftext
  }
}
