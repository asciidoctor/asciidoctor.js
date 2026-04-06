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
    const content = node.content
    return `<?xml version="1.0" encoding="UTF-8"?>\n<article xmlns="http://docbook.org/ns/docbook" version="5.0">\n${content}\n</article>\n`
  }

  convert_section (node) {
    const id = node.id ? ` xml:id="${node.id}"` : ''
    return `<section${id}>\n<title>${node.title}</title>\n${node.content}\n</section>`
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
    return `<${name}>\n${titleElement}<simpara>${node.content}</simpara>\n</${name}>`
  }

  convert_open (node) {
    const commonAttrs = this._commonAttributes(node)
    if (node.contentModel === 'compound') {
      if (node.hasTitle()) {
        return `<formalpara${commonAttrs}>\n<title>${node.title}</title>\n<para>\n${node.content}\n</para>\n</formalpara>`
      }
      return `<para${commonAttrs}>\n${node.content}\n</para>`
    } else if (node.hasTitle()) {
      return `<formalpara${commonAttrs}>\n<title>${node.title}</title>\n<para>${node.content}</para>\n</formalpara>`
    }
    return `<simpara${commonAttrs}>${node.content}</simpara>`
  }

  convert_paragraph (node) {
    const commonAttrs = this._commonAttributes(node)
    if (node.hasTitle()) {
      return `<formalpara${commonAttrs}>\n<title>${node.title}</title>\n<para>${node.content}</para>\n</formalpara>`
    }
    return `<simpara${commonAttrs}>${node.content}</simpara>`
  }

  convert_stem (node) {
    // Temporarily remove specialcharacters sub to get the raw (unescaped) equation source,
    // then restore it — mirrors the Ruby implementation in docbook5.rb.
    let equation
    const idx = node.subs ? node.subs.indexOf('specialcharacters') : -1
    if (idx !== -1) {
      node.subs.splice(idx, 1)
      equation = node.content
      node.subs.splice(idx, 0, 'specialcharacters')
    } else {
      equation = node.content
    }

    let equationData
    if (node.style === 'asciimath') {
      // NOTE: No AsciiMath-to-MathML conversion available in JS; use CDATA fallback
      equationData = `<mathphrase><![CDATA[${equation}]]></mathphrase>`
    } else {
      // unhandled math (latexmath); pass source to alt and mathphrase — dblatex will process alt as LaTeX math
      equationData = `<alt><![CDATA[${equation}]]></alt>\n<mathphrase><![CDATA[${equation}]]></mathphrase>`
    }

    const commonAttrs = this._commonAttributes(node)
    if (node.hasTitle()) {
      return `<equation${commonAttrs}>\n<title>${node.title}</title>\n${equationData}\n</equation>`
    }
    return `<informalequation${commonAttrs}>\n${equationData}\n</informalequation>`
  }

  convert_embedded (node) {
    return node.content
  }

  // Internal: Build common XML attributes string (id, role, xreflabel).
  // Mirrors common_attributes in the Ruby DocBook5 converter.
  _commonAttributes (node) {
    let attrs = ''
    if (node.id) attrs += ` xml:id="${node.id}"`
    if (node.role) attrs += ` role="${node.role}"`
    if (node.reftext) attrs += ` xreflabel="${node.reftext}"`
    return attrs
  }
}

export default DocBook5Converter