// ESM conversion of inline.rb

import { AbstractNode } from './abstract_node.js'

// Public: Represents an inline element in an AsciiDoc document.
export class Inline extends AbstractNode {
  // text   - The String text of this inline element (optional).
  // opts   - A plain object of options:
  //          id     - The String id of this inline element.
  //          type   - The Symbol/String type qualifier (e.g. 'ref', 'bibref').
  //          target - The String target (e.g. a URI).
  constructor (parent, context, text = null, opts = {}) {
    super(parent, context, opts)
    this.nodeName = `inline_${context}`
    this.text = text
    this.id = opts.id ?? null
    this.type = opts.type ?? null
    this.target = opts.target ?? null
  }

  isBlock ()  { return false }
  isInline () { return true }

  // Public: Convert this inline element using the document's converter.
  //
  // Returns the String result.
  convert () { return this.converter.convert(this) }

  // Deprecated: Use convert() instead.
  render () { return this.convert() }

  // Public: Get the converted content (alias for text).
  content () { return this.text }

  // Public: Get the alt text for this inline image.
  //
  // Returns the String value of the alt attribute, or ''.
  alt () { return this.attr('alt') || '' }

  // Public: Check whether this inline node has reftext.
  //
  // For :ref and :bibref nodes the text acts as the reftext.
  //
  // Returns a Boolean.
  hasReftext () {
    return !!(this.text && (this.type === 'ref' || this.type === 'bibref'))
  }

  // Public: Get the reftext for this inline node with substitutions applied.
  //
  // Returns the String reftext, or null.
  get reftext () {
    const val = this.text
    return val != null ? this.applyReftextSubs(val) : null
  }

  // Public: Generate xreftext for this inline node.
  //
  // Returns the String reftext, or null.
  xreftext (_xrefstyle = null) { return this.reftext }
}
