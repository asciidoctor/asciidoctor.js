// Minimal DocBook 5 converter stub.
// A full implementation is not yet ported; this stub exists so that documents
// targeting the 'docbook5' backend can be loaded and their attributes inspected
// without a "module not found" error.

import { ConverterBase } from '../converter.js'

export class DocBook5Converter extends ConverterBase {
  constructor (backend, opts = {}) {
    super(backend, opts)
  }

  convert (node, transform = null) {
    const t = transform ?? node.context
    const fn = `convert_${t}`
    if (typeof this[fn] === 'function') return this[fn](node)
    return ''
  }

  convert_document (node) {
    const content = node.content()
    return `<?xml version="1.0" encoding="UTF-8"?>\n<article xmlns="http://docbook.org/ns/docbook" version="5.0">\n${content}\n</article>\n`
  }

  convert_section (node) {
    const id = node.id ? ` xml:id="${node.id}"` : ''
    return `<section${id}>\n<title>${node.title}</title>\n${node.content()}\n</section>`
  }

  convert_paragraph (node) {
    return `<para>${node.content()}</para>`
  }

  convert_embedded (node) {
    return node.content()
  }
}

export default DocBook5Converter