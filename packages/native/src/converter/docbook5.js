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

  convert_image (node) {
    const target = node.attr('target')
    const src = node.imageUri(target)
    let imagedataAttrs = ` fileref="${src}"`
    if (node.hasAttr('align')) imagedataAttrs += ` align="${node.attr('align')}"`
    if (node.hasAttr('scale')) {
      imagedataAttrs += ` scale="${node.attr('scale')}"`
    } else if (node.hasAttr('scaledwidth')) {
      imagedataAttrs += ` width="${node.attr('scaledwidth')}"`
    } else {
      if (node.hasAttr('width')) imagedataAttrs += ` contentwidth="${node.attr('width')}"`
      if (node.hasAttr('height')) imagedataAttrs += ` contentdepth="${node.attr('height')}"`
    }
    const alt = node.alt()
    return `<mediaobject>
<imageobject>
<imagedata${imagedataAttrs}/>
</imageobject>
<textobject><phrase>${alt}</phrase></textobject>
</mediaobject>`
  }

  convert_admonition (node) {
    const name = node.attr('name')
    const titleElement = node.hasTitle() ? `<title>${node.title}</title>\n` : ''
    return `<${name}>\n${titleElement}<simpara>${node.content()}</simpara>\n</${name}>`
  }

  convert_paragraph (node) {
    return `<para>${node.content()}</para>`
  }

  convert_embedded (node) {
    return node.content()
  }
}

export default DocBook5Converter