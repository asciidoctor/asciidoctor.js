// ESM conversion of converter/docbook5.rb
// Translated from the Ruby Asciidoctor::Converter::DocBook5Converter.
// Translation notes:
//   - Ruby symbols (:compound) → strings ('compound')
//   - Ruby predicate methods (title?, attr?, option?, has_role?, blocks?) → hasTitle(), hasAttr(), hasOption(), hasRole(), hasBlocks()
//   - Ruby `node.image_uri` → `await node.imageUri()`; `node.icon_uri` → `await node.iconUri()`
//   - common_attributes(id, role, reftext) kept as private _commonAttributes(id, role, reftext)
//   - blockquote_tag uses a content callback instead of Ruby block
//   - Ruby LF constant → '\n'
//   - document.nested? → doc.isNested(); doc.noheader → doc.isNoheader(); doc.notitle → doc.isNotitle()

import { ConverterBase } from '../converter.js'
import { XmlSanitizeRx } from '../rx.js'

const LF = '\n'

// default represents variablelist
const DLIST_TAGS = {
  qanda: {
    list: 'qandaset',
    entry: 'qandaentry',
    label: 'question',
    term: 'simpara',
    item: 'answer',
  },
  glossary: {
    list: null,
    entry: 'glossentry',
    term: 'glossterm',
    item: 'glossdef',
  },
}
const DLIST_TAGS_DEFAULT = {
  list: 'variablelist',
  entry: 'varlistentry',
  term: 'term',
  item: 'listitem',
}

const QUOTE_TAGS = {
  monospaced: ['<literal>', '</literal>'],
  emphasis: ['<emphasis>', '</emphasis>', true],
  strong: ['<emphasis role="strong">', '</emphasis>', true],
  double: ['<quote role="double">', '</quote>', true],
  single: ['<quote role="single">', '</quote>', true],
  mark: ['<emphasis role="marked">', '</emphasis>'],
  superscript: ['<superscript>', '</superscript>'],
  subscript: ['<subscript>', '</subscript>'],
}
const QUOTE_TAGS_DEFAULT = ['', '', true]

const MANPAGE_SECTION_TAGS = {
  section: 'refsection',
  synopsis: 'refsynopsisdiv',
}
const TABLE_PI_NAMES = ['dbhtml', 'dbfo', 'dblatex']

const CopyrightRx = /^(.+?)(?: ((?:\d{4}-)?\d{4}))?$/

export class DocBook5Converter extends ConverterBase {
  constructor(backend, opts = {}) {
    super(backend, opts)
  }

  async convert_document(node) {
    const result = ['<?xml version="1.0" encoding="UTF-8"?>']
    if (node.hasAttr('toc')) {
      result.push(
        node.hasAttr('toclevels')
          ? `<?asciidoc-toc maxdepth="${node.attr('toclevels')}"?>`
          : '<?asciidoc-toc?>'
      )
    }
    if (node.hasAttr('sectnums')) {
      result.push(
        node.hasAttr('sectnumlevels')
          ? `<?asciidoc-numbered maxdepth="${node.attr('sectnumlevels')}"?>`
          : '<?asciidoc-numbered?>'
      )
    }
    const langAttribute = node.hasAttr('nolang')
      ? ''
      : ` xml:lang="${node.attr('lang', 'en')}"`
    let rootTagName = node.doctype
    let manpage = false
    if (rootTagName === 'manpage') {
      manpage = true
      rootTagName = 'article'
    }
    const rootTagIdx = result.length
    const id = node.id
    const abstract = this._findRootAbstract(node)
    if (!node.isNoheader())
      result.push(await this._documentInfoTag(node, abstract))
    if (manpage) {
      result.push('<refentry>')
      result.push('<refmeta>')
      if (node.hasAttr('mantitle'))
        result.push(
          `<refentrytitle>${await node.applyReftextSubs(node.attr('mantitle'))}</refentrytitle>`
        )
      if (node.hasAttr('manvolnum'))
        result.push(`<manvolnum>${node.attr('manvolnum')}</manvolnum>`)
      result.push(
        `<refmiscinfo class="source">${node.attr('mansource', '&#160;')}</refmiscinfo>`
      )
      result.push(
        `<refmiscinfo class="manual">${node.attr('manmanual', '&#160;')}</refmiscinfo>`
      )
      result.push('</refmeta>')
      result.push('<refnamediv>')
      if (node.hasAttr('mannames')) {
        for (const n of node.attr('mannames'))
          result.push(`<refname>${n}</refname>`)
      }
      if (node.hasAttr('manpurpose'))
        result.push(`<refpurpose>${node.attr('manpurpose')}</refpurpose>`)
      result.push('</refnamediv>')
    }
    const headerDocinfo = await node.docinfo('header')
    if (headerDocinfo) result.push(headerDocinfo)
    const extractedAbstract = abstract
      ? this._extractAbstract(node, abstract)
      : null
    if (node.hasBlocks()) {
      const blockResults = []
      for (const b of node.blocks) blockResults.push(await b.convert())
      result.push(blockResults.filter((s) => s != null).join(LF))
    }
    if (extractedAbstract) this._restoreAbstract(extractedAbstract)
    const footerDocinfo = await node.docinfo('footer')
    if (footerDocinfo) result.push(footerDocinfo)
    if (manpage) result.push('</refentry>')
    // defer adding root tag in case document ID is auto-generated on demand
    const nodeId = id ?? node.id ?? this._rootDocId
    result.splice(
      rootTagIdx,
      0,
      `<${rootTagName} xmlns="http://docbook.org/ns/docbook" xmlns:xl="http://www.w3.org/1999/xlink" version="5.0"${langAttribute}${this._commonAttributes(nodeId)}>`
    )
    result.push(`</${rootTagName}>`)
    return result.join(LF)
  }

  async convert_embedded(node) {
    // NOTE in DocBook 5, the root abstract must be in the info tag and is thus not part of the body
    let abstract = null
    if (this.backend === 'docbook5') {
      abstract = this._findRootAbstract(node)
      if (abstract) this._extractAbstract(node, abstract)
    }
    const blockParts = []
    for (const b of node.blocks) blockParts.push(await b.convert())
    const result = blockParts.filter((s) => s != null).join(LF)
    if (abstract) this._restoreAbstract(abstract)
    return result
  }

  async convert_section(node) {
    let tagName = node.sectname
    if (node.document.doctype === 'manpage') {
      tagName = MANPAGE_SECTION_TAGS[tagName] ?? tagName
    }
    const titleEl =
      node.special && (node.hasOption('notitle') || node.hasOption('untitled'))
        ? ''
        : `<title>${node.title}</title>\n`
    return `<${tagName}${this._commonAttributes(node.id, node.role, node.reftext)}>\n${titleEl}${await node.content()}\n</${tagName}>`
  }

  async convert_admonition(node) {
    const tagName = node.attr('name')
    return `<${tagName}${this._commonAttributes(node.id, node.role, node.reftext)}>\n${this._titleTag(node)}${await this._encloseContent(node)}\n</${tagName}>`
  }

  async convert_audio(_node) {
    return ''
  }

  async convert_colist(node) {
    const result = []
    result.push(
      `<calloutlist${this._commonAttributes(node.id, node.role, node.reftext)}>`
    )
    if (node.hasTitle()) result.push(`<title>${node.title}</title>`)
    for (const item of node.items) {
      result.push(`<callout arearefs="${item.attr('coids')}">`)
      result.push(`<para>${item.text}</para>`)
      if (item.hasBlocks()) result.push(await item.content())
      result.push('</callout>')
    }
    result.push('</calloutlist>')
    return result.join(LF)
  }

  async convert_dlist(node) {
    const result = []
    if (node.style === 'horizontal') {
      const tagName = node.hasTitle() ? 'table' : 'informaltable'
      result.push(
        `<${tagName}${this._commonAttributes(node.id, node.role, node.reftext)} tabstyle="horizontal" frame="none" colsep="0" rowsep="0">`
      )
      result.push(`${this._titleTag(node)}<tgroup cols="2">`)
      result.push(`<colspec colwidth="${node.attr('labelwidth', 15)}*"/>`)
      result.push(`<colspec colwidth="${node.attr('itemwidth', 85)}*"/>`)
      result.push('<tbody valign="top">')
      for (const [terms, dd] of node.items) {
        result.push('<row>\n<entry>')
        for (const dt of terms) result.push(`<simpara>${dt.text}</simpara>`)
        result.push('</entry>\n<entry>')
        if (dd) {
          if (dd.hasText()) result.push(`<simpara>${dd.text}</simpara>`)
          if (dd.hasBlocks()) result.push(await dd.content())
        }
        result.push('</entry>\n</row>')
      }
      result.push(`</tbody>\n</tgroup>\n</${tagName}>`)
    } else {
      const tags = DLIST_TAGS[node.style] ?? DLIST_TAGS_DEFAULT
      const {
        list: listTag,
        entry: entryTag,
        label: labelTag,
        term: termTag,
        item: itemTag,
      } = tags
      if (listTag) {
        result.push(
          `<${listTag}${this._commonAttributes(node.id, node.role, node.reftext)}>`
        )
        if (node.hasTitle()) result.push(`<title>${node.title}</title>`)
      }
      for (const [terms, dd] of node.items) {
        result.push(`<${entryTag}>`)
        if (labelTag) result.push(`<${labelTag}>`)
        for (const dt of terms)
          result.push(`<${termTag}>${dt.text}</${termTag}>`)
        if (labelTag) result.push(`</${labelTag}>`)
        result.push(`<${itemTag}>`)
        if (dd) {
          if (dd.hasText()) result.push(`<simpara>${dd.text}</simpara>`)
          if (dd.hasBlocks()) result.push(await dd.content())
        }
        result.push(`</${itemTag}>`)
        result.push(`</${entryTag}>`)
      }
      if (listTag) result.push(`</${listTag}>`)
    }
    return result.join(LF)
  }

  async convert_example(node) {
    const commonAttrs = this._commonAttributes(node.id, node.role, node.reftext)
    if (node.hasTitle()) {
      return `<example${commonAttrs}>\n<title>${node.title}</title>\n${await this._encloseContent(node)}\n</example>`
    }
    return `<informalexample${commonAttrs}>\n${await this._encloseContent(node)}\n</informalexample>`
  }

  async convert_floating_title(node) {
    return `<bridgehead${this._commonAttributes(node.id, node.role, node.reftext)} renderas="sect${node.level}">${node.title}</bridgehead>`
  }

  async convert_image(node) {
    const alignAttribute = node.hasAttr('align')
      ? ` align="${node.attr('align')}"`
      : ''
    const mediaobject = `<mediaobject>\n<imageobject>\n<imagedata fileref="${await node.imageUri(node.attr('target'))}"${this._imageSizeAttributes(node.attributes)}${alignAttribute}/>\n</imageobject>\n<textobject><phrase>${node.alt()}</phrase></textobject>\n</mediaobject>`
    const commonAttrs = this._commonAttributes(node.id, node.role, node.reftext)
    if (node.hasTitle()) {
      return `<figure${commonAttrs}>\n<title>${node.title}</title>\n${mediaobject}\n</figure>`
    }
    return `<informalfigure${commonAttrs}>\n${mediaobject}\n</informalfigure>`
  }

  async convert_listing(node) {
    const informal = !node.hasTitle()
    const commonAttrs = this._commonAttributes(node.id, node.role, node.reftext)
    let wrappedContent
    if (node.style === 'source') {
      const attrs = node.attributes
      let numberingAttrs
      if (node.hasOption('linenums')) {
        numberingAttrs =
          'start' in attrs
            ? ` linenumbering="numbered" startinglinenumber="${parseInt(attrs.start, 10)}"`
            : ' linenumbering="numbered"'
      } else {
        numberingAttrs = ' linenumbering="unnumbered"'
      }
      if ('language' in attrs) {
        wrappedContent = `<programlisting${informal ? commonAttrs : ''} language="${attrs.language}"${numberingAttrs}>${await node.content()}</programlisting>`
      } else {
        wrappedContent = `<screen${informal ? commonAttrs : ''}${numberingAttrs}>${await node.content()}</screen>`
      }
    } else {
      wrappedContent = `<screen${informal ? commonAttrs : ''}>${await node.content()}</screen>`
    }
    if (informal) return wrappedContent
    return `<formalpara${commonAttrs}>\n<title>${node.title}</title>\n<para>\n${wrappedContent}\n</para>\n</formalpara>`
  }

  async convert_literal(node) {
    const commonAttrs = this._commonAttributes(node.id, node.role, node.reftext)
    if (node.hasTitle()) {
      return `<formalpara${commonAttrs}>\n<title>${node.title}</title>\n<para>\n<literallayout class="monospaced">${await node.content()}</literallayout>\n</para>\n</formalpara>`
    }
    return `<literallayout${commonAttrs} class="monospaced">${await node.content()}</literallayout>`
  }

  async convert_pass(node) {
    return await node.content()
  }

  async convert_stem(node) {
    let equation
    const idx = node.subs ? node.subs.indexOf('specialcharacters') : -1
    if (idx !== -1) {
      node.subs.splice(idx, 1)
      equation = await node.content()
      node.subs.splice(idx, 0, 'specialcharacters')
    } else {
      equation = await node.content()
    }
    let equationData
    if (node.style === 'asciimath') {
      // NOTE: No AsciiMath-to-MathML conversion available in JS; use CDATA fallback
      equationData = `<mathphrase><![CDATA[${equation}]]></mathphrase>`
    } else {
      // unhandled math (latexmath); pass source to alt and required mathphrase — dblatex will process alt as LaTeX math
      equationData = `<alt><![CDATA[${equation}]]></alt>\n<mathphrase><![CDATA[${equation}]]></mathphrase>`
    }
    const commonAttrs = this._commonAttributes(node.id, node.role, node.reftext)
    if (node.hasTitle()) {
      return `<equation${commonAttrs}>\n<title>${node.title}</title>\n${equationData}\n</equation>`
    }
    return `<informalequation${commonAttrs}>\n${equationData}\n</informalequation>`
  }

  async convert_olist(node) {
    const result = []
    const numAttribute = node.style ? ` numeration="${node.style}"` : ''
    const startAttribute = node.hasAttr('start')
      ? ` startingnumber="${node.attr('start')}"`
      : ''
    result.push(
      `<orderedlist${this._commonAttributes(node.id, node.role, node.reftext)}${numAttribute}${startAttribute}>`
    )
    if (node.hasTitle()) result.push(`<title>${node.title}</title>`)
    for (const item of node.items) {
      result.push(`<listitem${this._commonAttributes(item.id, item.role)}>`)
      result.push(`<simpara>${item.text}</simpara>`)
      if (item.hasBlocks()) result.push(await item.content())
      result.push('</listitem>')
    }
    result.push('</orderedlist>')
    return result.join(LF)
  }

  async convert_open(node) {
    const id = node.id
    const role = node.role
    const reftext = node.reftext
    switch (node.style) {
      case 'abstract': {
        if (node.parent === node.document && node.document.doctype === 'book') {
          this.logger.warn(
            'abstract block cannot be used in a document without a doctitle when doctype is book. Excluding block content.'
          )
          return ''
        }
        let res = `<abstract>\n${this._titleTag(node)}${await this._encloseContent(node)}\n</abstract>`
        const parent = node.parent
        if (
          this.backend === 'docbook5' &&
          !node.hasOption('root') &&
          (parent.context === 'open'
            ? parent.style === 'partintro'
            : parent.context === 'section' &&
              parent.sectname === 'partintro') &&
          parent.blocks[0] === node
        ) {
          res = `<info>\n${res}\n</info>`
        }
        return res
      }
      case 'partintro': {
        if (
          node.level === 0 &&
          node.parent.context === 'section' &&
          node.document.doctype === 'book'
        ) {
          return `<partintro${this._commonAttributes(id, role, reftext)}>\n${this._titleTag(node)}${await this._encloseContent(node)}\n</partintro>`
        }
        this.logger.error(
          'partintro block can only be used when doctype is book and must be a child of a book part. Excluding block content.'
        )
        return ''
      }
      default: {
        if (node.hasTitle()) {
          const contentSpacer = node.contentModel === 'compound' ? LF : ''
          return `<formalpara${this._commonAttributes(id, role, reftext)}>\n<title>${node.title}</title>\n<para>${contentSpacer}${await node.content()}${contentSpacer}</para>\n</formalpara>`
        } else if (id || role) {
          if (node.contentModel === 'compound') {
            return `<para${this._commonAttributes(id, role, reftext)}>\n${await node.content()}\n</para>`
          }
          return `<simpara${this._commonAttributes(id, role, reftext)}>${await node.content()}</simpara>`
        }
        return await this._encloseContent(node)
      }
    }
  }

  async convert_page_break(_node) {
    return '<simpara><?asciidoc-pagebreak?></simpara>'
  }

  async convert_paragraph(node) {
    const commonAttrs = this._commonAttributes(node.id, node.role, node.reftext)
    if (node.hasTitle()) {
      return `<formalpara${commonAttrs}>\n<title>${node.title}</title>\n<para>${await node.content()}</para>\n</formalpara>`
    }
    return `<simpara${commonAttrs}>${await node.content()}</simpara>`
  }

  async convert_preamble(node) {
    if (node.document.doctype === 'book') {
      return `<preface${this._commonAttributes(node.id, node.role, node.reftext)}>\n${this._titleTag(node, false)}${await node.content()}\n</preface>`
    }
    return await node.content()
  }

  async convert_quote(node) {
    return await this._blockquoteTag(
      node,
      node.hasRole('epigraph') ? 'epigraph' : null,
      async () => await this._encloseContent(node)
    )
  }

  async convert_thematic_break(_node) {
    return '<simpara><?asciidoc-hr?></simpara>'
  }

  async convert_sidebar(node) {
    return `<sidebar${this._commonAttributes(node.id, node.role, node.reftext)}>\n${this._titleTag(node)}${await this._encloseContent(node)}\n</sidebar>`
  }

  async convert_table(node) {
    let hasBody = false
    const result = []
    const pgwideAttribute = node.hasOption('pgwide') ? ' pgwide="1"' : ''
    let frame = node.attr('frame', 'all', 'table-frame')
    if (frame === 'ends') frame = 'topbot'
    const grid = node.attr('grid', null, 'table-grid')
    const tagName = node.hasTitle() ? 'table' : 'informaltable'
    const orientAttr = node.hasAttr(
      'orientation',
      'landscape',
      'table-orientation'
    )
      ? ' orient="land"'
      : ''
    result.push(
      `<${tagName}${this._commonAttributes(node.id, node.role, node.reftext)}${pgwideAttribute} frame="${frame}" rowsep="${['none', 'cols'].includes(grid) ? 0 : 1}" colsep="${['none', 'rows'].includes(grid) ? 0 : 1}"${orientAttr}>`
    )
    if (node.hasOption('unbreakable')) {
      result.push('<?dbfo keep-together="always"?>')
    } else if (node.hasOption('breakable')) {
      result.push('<?dbfo keep-together="auto"?>')
    }
    if (tagName === 'table') result.push(`<title>${node.title}</title>`)
    let colWidthKey
    const width = node.hasAttr('width') ? node.attr('width') : null
    if (width) {
      for (const piName of TABLE_PI_NAMES)
        result.push(`<?${piName} table-width="${width}"?>`)
      colWidthKey = 'colabswidth'
    } else {
      colWidthKey = 'colpcwidth'
    }
    result.push(`<tgroup cols="${node.attr('colcount')}">`)
    for (const col of node.columns) {
      result.push(
        `<colspec colname="col_${col.attr('colnumber')}" colwidth="${col.attr(colWidthKey)}*"/>`
      )
    }
    for (const [tsec, sectionRows] of node.rows.bySection()) {
      if (!sectionRows || sectionRows.length === 0) continue
      if (tsec === 'body') hasBody = true
      result.push(`<t${tsec}>`)
      for (const row of sectionRows) {
        result.push('<row>')
        for (const cell of row) {
          const colspanAttribute = cell.colspan
            ? ` namest="col_${cell.column.attr('colnumber')}" nameend="col_${cell.column.attr('colnumber') + cell.colspan - 1}"`
            : ''
          const rowspanAttribute = cell.rowspan
            ? ` morerows="${cell.rowspan - 1}"`
            : ''
          const entryStart = `<entry align="${cell.attr('halign')}" valign="${cell.attr('valign')}"${colspanAttribute}${rowspanAttribute}>`
          let cellContent
          if (tsec === 'head') {
            cellContent = cell.text
          } else {
            switch (cell.style) {
              case 'asciidoc':
                cellContent = await cell.content()
                break
              case 'literal':
                cellContent = `<literallayout class="monospaced">${cell.text}</literallayout>`
                break
              case 'header': {
                const parts = await cell.content()
                cellContent =
                  parts.length === 0
                    ? ''
                    : `<simpara><emphasis role="strong">${parts.join('</emphasis></simpara><simpara><emphasis role="strong">')}</emphasis></simpara>`
                break
              }
              default: {
                const parts = await cell.content()
                cellContent =
                  parts.length === 0
                    ? ''
                    : `<simpara>${parts.join('</simpara><simpara>')}</simpara>`
              }
            }
          }
          const entryEnd = node.document.hasAttr('cellbgcolor')
            ? `<?dbfo bgcolor="${node.document.attr('cellbgcolor')}"?></entry>`
            : '</entry>'
          result.push(`${entryStart}${cellContent}${entryEnd}`)
        }
        result.push('</row>')
      }
      result.push(`</t${tsec}>`)
    }
    result.push('</tgroup>')
    result.push(`</${tagName}>`)
    if (!hasBody) this.logger.warn('tables must have at least one body row')
    return result.join(LF)
  }

  async convert_toc(_node) {
    return ''
  }

  async convert_ulist(node) {
    const result = []
    if (node.style === 'bibliography') {
      result.push(
        `<bibliodiv${this._commonAttributes(node.id, node.role, node.reftext)}>`
      )
      if (node.hasTitle()) result.push(`<title>${node.title}</title>`)
      for (const item of node.items) {
        result.push('<bibliomixed>')
        result.push(`<bibliomisc>${item.text}</bibliomisc>`)
        if (item.hasBlocks()) result.push(await item.content())
        result.push('</bibliomixed>')
      }
      result.push('</bibliodiv>')
    } else {
      const checklist = node.hasOption('checklist')
      const markType = checklist ? 'none' : node.style
      const markAttribute = markType ? ` mark="${markType}"` : ''
      result.push(
        `<itemizedlist${this._commonAttributes(node.id, node.role, node.reftext)}${markAttribute}>`
      )
      if (node.hasTitle()) result.push(`<title>${node.title}</title>`)
      for (const item of node.items) {
        const textMarker =
          checklist && item.hasAttr('checkbox')
            ? item.hasAttr('checked')
              ? '&#10003; '
              : '&#10063; '
            : ''
        result.push(`<listitem${this._commonAttributes(item.id, item.role)}>`)
        result.push(`<simpara>${textMarker}${item.text}</simpara>`)
        if (item.hasBlocks()) result.push(await item.content())
        result.push('</listitem>')
      }
      result.push('</itemizedlist>')
    }
    return result.join(LF)
  }

  async convert_verse(node) {
    return await this._blockquoteTag(
      node,
      node.hasRole('epigraph') ? 'epigraph' : null,
      async () => `<literallayout>${await node.content()}</literallayout>`
    )
  }

  async convert_video(_node) {
    return ''
  }

  async convert_inline_anchor(node) {
    switch (node.type) {
      case 'ref':
        return `<anchor${this._commonAttributes(node.id, null, node.reftext || `[${node.id}]`)}/>`
      case 'xref': {
        const path = node.attributes.path
        if (path) {
          return `<link xl:href="${node.target}">${node.text || path}</link>`
        }
        let linkend = node.attributes.refid
        if (!linkend) {
          const rootDoc = this._getRootDocument(node)
          linkend =
            rootDoc.id ??
            (this._rootDocId ??= this._generateDocumentId(rootDoc))
        }
        return node.text
          ? `<link linkend="${linkend}">${node.text}</link>`
          : `<xref linkend="${linkend}"/>`
      }
      case 'link':
        return `<link xl:href="${node.target}">${node.text}</link>`
      case 'bibref': {
        const text = `[${node.reftext || node.id}]`
        return `<anchor${this._commonAttributes(node.id, null, text)}/>${text}`
      }
      default:
        this.logger.warn(`unknown anchor type: ${node.type}`)
        return null
    }
  }

  async convert_inline_break(node) {
    return `${node.text}<?asciidoc-br?>`
  }

  async convert_inline_button(node) {
    return `<guibutton>${node.text}</guibutton>`
  }

  async convert_inline_callout(node) {
    return `<co${this._commonAttributes(node.id)}/>`
  }

  async convert_inline_footnote(node) {
    if (node.type === 'xref') {
      return `<footnoteref linkend="${node.target}"/>`
    }
    return `<footnote${this._commonAttributes(node.id)}><simpara>${node.text}</simpara></footnote>`
  }

  async convert_inline_image(node) {
    const fileref =
      node.type === 'icon'
        ? await node.iconUri(node.target)
        : await node.imageUri(node.target)
    const img = `<inlinemediaobject${this._commonAttributes(node.id, node.role)}>\n<imageobject>\n<imagedata fileref="${fileref}"${this._imageSizeAttributes(node.attributes)}/>\n</imageobject>\n<textobject><phrase>${node.alt()}</phrase></textobject>\n</inlinemediaobject>`
    if (node.type !== 'icon' && node.hasAttr('link')) {
      const linkHref = node.attr('link')
      return `<link xl:href="${linkHref === 'self' ? fileref : linkHref}">${img}</link>`
    }
    return img
  }

  async convert_inline_indexterm(node) {
    let rel = ''
    const see = node.attr('see')
    if (see) {
      rel = `\n<see>${see}</see>`
    } else {
      const seeAlsoList = node.attr('see-also')
      if (seeAlsoList) {
        rel = seeAlsoList.map((s) => `\n<seealso>${s}</seealso>`).join('')
      }
    }
    if (node.type === 'visible') {
      return `<indexterm>\n<primary>${node.text}</primary>${rel}\n</indexterm>${node.text}`
    }
    const terms = node.attr('terms')
    const numterms = terms.length
    const indexPromote = node.document.hasOption('indexterm-promotion')
    if (numterms > 2) {
      return `<indexterm>\n<primary>${terms[0]}</primary><secondary>${terms[1]}</secondary><tertiary>${terms[2]}</tertiary>${rel}\n</indexterm>${indexPromote ? `\n<indexterm>\n<primary>${terms[1]}</primary><secondary>${terms[2]}</secondary>\n</indexterm>\n<indexterm>\n<primary>${terms[2]}</primary>\n</indexterm>` : ''}`
    } else if (numterms > 1) {
      return `<indexterm>\n<primary>${terms[0]}</primary><secondary>${terms[1]}</secondary>${rel}\n</indexterm>${indexPromote ? `\n<indexterm>\n<primary>${terms[1]}</primary>\n</indexterm>` : ''}`
    }
    return `<indexterm>\n<primary>${terms[0]}</primary>${rel}\n</indexterm>`
  }

  async convert_inline_kbd(node) {
    const keys = node.attr('keys')
    if (keys.length === 1) {
      return `<keycap>${keys[0]}</keycap>`
    }
    return `<keycombo><keycap>${keys.join('</keycap><keycap>')}</keycap></keycombo>`
  }

  async convert_inline_menu(node) {
    const menu = node.attr('menu')
    const submenus = node.attr('submenus')
    if (!submenus || submenus.length === 0) {
      const menuitem = node.attr('menuitem')
      if (menuitem) {
        return `<menuchoice><guimenu>${menu}</guimenu> <guimenuitem>${menuitem}</guimenuitem></menuchoice>`
      }
      return `<guimenu>${menu}</guimenu>`
    }
    return `<menuchoice><guimenu>${menu}</guimenu> <guisubmenu>${submenus.join('</guisubmenu> <guisubmenu>')}</guisubmenu> <guimenuitem>${node.attr('menuitem')}</guimenuitem></menuchoice>`
  }

  async convert_inline_quoted(node) {
    const type = node.type
    if (type === 'asciimath' || type === 'latexmath') {
      const equation = node.text
      if (type === 'asciimath') {
        return `<inlineequation><mathphrase><![CDATA[${equation}]]></mathphrase></inlineequation>`
      }
      return `<inlineequation><alt><![CDATA[${equation}]]></alt><mathphrase><![CDATA[${equation}]]></mathphrase></inlineequation>`
    }
    const [open, close, supportsPhrase] = QUOTE_TAGS[type] ?? QUOTE_TAGS_DEFAULT
    const text = node.text
    let quotedText
    if (node.role) {
      if (supportsPhrase) {
        quotedText = `${open}<phrase role="${node.role}">${text}</phrase>${close}`
      } else {
        // chop the closing > from open tag to insert role attribute
        quotedText = `${open.slice(0, -1)} role="${node.role}">${text}${close}`
      }
    } else {
      quotedText = `${open}${text}${close}`
    }
    return node.id
      ? `<anchor${this._commonAttributes(node.id)}/>${quotedText}`
      : quotedText
  }

  // Private helpers

  _commonAttributes(id, role = null, reftext = null) {
    let attrs = ''
    if (id) {
      attrs = ` xml:id="${id}"${role ? ` role="${role}"` : ''}`
    } else if (role) {
      attrs = ` role="${role}"`
    }
    if (reftext) {
      let sanitized = reftext
      if (sanitized.includes('<')) {
        sanitized = sanitized.replace(XmlSanitizeRx, '')
        if (sanitized.includes(' '))
          sanitized = sanitized.replace(/ {2,}/g, ' ').trim()
      }
      if (sanitized.includes('"')) sanitized = sanitized.replace(/"/g, '&quot;')
      return `${attrs} xreflabel="${sanitized}"`
    }
    return attrs
  }

  _imageSizeAttributes(attributes) {
    if ('scaledwidth' in attributes) {
      return ` width="${attributes.scaledwidth}"`
    } else if ('scale' in attributes) {
      return ` scale="${attributes.scale}"`
    }
    const widthAttr =
      'width' in attributes ? ` contentwidth="${attributes.width}"` : ''
    const depthAttr =
      'height' in attributes ? ` contentdepth="${attributes.height}"` : ''
    return `${widthAttr}${depthAttr}`
  }

  _authorTag(doc, author) {
    const result = ['<author>', '<personname>']
    if (author.firstname)
      result.push(
        `<firstname>${doc.subReplacements(author.firstname)}</firstname>`
      )
    if (author.middlename)
      result.push(
        `<othername>${doc.subReplacements(author.middlename)}</othername>`
      )
    if (author.lastname)
      result.push(`<surname>${doc.subReplacements(author.lastname)}</surname>`)
    result.push('</personname>')
    if (author.email) result.push(`<email>${author.email}</email>`)
    result.push('</author>')
    return result.join(LF)
  }

  async _documentInfoTag(doc, abstract) {
    const result = ['<info>']
    if (!doc.isNotitle()) {
      const title = doc.doctitle({ partition: true, use_fallback: true })
      if (title?.subtitle) {
        result.push(
          `<title>${title.main}</title>\n<subtitle>${title.subtitle}</subtitle>`
        )
      } else if (title) {
        result.push(`<title>${title}</title>`)
      }
    }
    const date = doc.hasAttr('revdate')
      ? doc.attr('revdate')
      : doc.hasAttr('reproducible')
        ? null
        : doc.attr('docdate')
    if (date) result.push(`<date>${date}</date>`)
    if (doc.hasAttr('copyright')) {
      const m = CopyrightRx.exec(doc.attr('copyright'))
      if (m) {
        result.push('<copyright>')
        result.push(`<holder>${m[1]}</holder>`)
        if (m[2]) result.push(`<year>${m[2]}</year>`)
        result.push('</copyright>')
      }
    }
    if (doc.hasHeader()) {
      const authors = doc.authors()
      if (authors.length > 0) {
        if (authors.length > 1) {
          result.push('<authorgroup>')
          for (const author of authors)
            result.push(this._authorTag(doc, author))
          result.push('</authorgroup>')
        } else {
          const author = authors[0]
          result.push(this._authorTag(doc, author))
          if (author.initials)
            result.push(`<authorinitials>${author.initials}</authorinitials>`)
        }
      }
      if (
        doc.hasAttr('revdate') &&
        (doc.hasAttr('revnumber') || doc.hasAttr('revremark'))
      ) {
        result.push('<revhistory>\n<revision>')
        if (doc.hasAttr('revnumber'))
          result.push(`<revnumber>${doc.attr('revnumber')}</revnumber>`)
        if (doc.hasAttr('revdate'))
          result.push(`<date>${doc.attr('revdate')}</date>`)
        if (doc.hasAttr('authorinitials'))
          result.push(
            `<authorinitials>${doc.attr('authorinitials')}</authorinitials>`
          )
        if (doc.hasAttr('revremark'))
          result.push(`<revremark>${doc.attr('revremark')}</revremark>`)
        result.push('</revision>\n</revhistory>')
      }
      if (doc.hasAttr('front-cover-image') || doc.hasAttr('back-cover-image')) {
        const backCoverTag = await this._coverTag(doc, 'back')
        if (backCoverTag) {
          result.push(await this._coverTag(doc, 'front', true))
          result.push(backCoverTag)
        } else {
          const frontCoverTag = await this._coverTag(doc, 'front')
          if (frontCoverTag) result.push(frontCoverTag)
        }
      }
      if (doc.hasAttr('orgname'))
        result.push(`<orgname>${doc.attr('orgname')}</orgname>`)
      const docinfo = await doc.docinfo()
      if (docinfo) result.push(docinfo)
    }
    if (abstract) {
      abstract.setAttr('root-option', '')
      result.push(await this.convert(abstract, abstract.nodeName))
      abstract.removeAttr('root-option')
    }
    result.push('</info>')
    return result.join(LF)
  }

  _findRootAbstract(doc) {
    if (!doc.hasBlocks()) return null
    let firstBlock = doc.blocks[0]
    if (firstBlock.context === 'preamble') {
      if (!firstBlock.hasBlocks()) return null
      firstBlock = firstBlock.blocks[0]
    } else if (firstBlock.context === 'section') {
      if (firstBlock.sectname === 'abstract') return firstBlock
      if (firstBlock.sectname !== 'preface' || !firstBlock.hasBlocks())
        return null
      firstBlock = firstBlock.blocks[0]
    }
    return firstBlock.style === 'abstract' && firstBlock.context === 'open'
      ? firstBlock
      : null
  }

  _extractAbstract(document, abstract) {
    let parent = abstract.parent
    let toDelete = abstract
    while (parent !== document && parent.blocks.length === 1) {
      toDelete = parent
      parent = parent.parent
    }
    parent.blocks.splice(parent.blocks.indexOf(toDelete), 1)
    return abstract
  }

  _restoreAbstract(abstract) {
    abstract.parent.blocks.unshift(abstract)
  }

  _getRootDocument(node) {
    let doc = node.document
    while (doc.isNested()) doc = doc.parentDocument
    return doc
  }

  _generateDocumentId(doc) {
    return `__${doc.doctype}-root__`
  }

  async _encloseContent(node) {
    return node.contentModel === 'compound'
      ? await node.content()
      : `<simpara>${await node.content()}</simpara>`
  }

  _titleTag(node, optional = true) {
    if (optional && !node.hasTitle()) return ''
    return `<title>${node.title ?? ''}</title>\n`
  }

  async _coverTag(doc, face, usePlaceholder = false) {
    const coverImage = doc.attr(`${face}-cover-image`)
    if (coverImage) {
      let fileref = coverImage
      const sizeAttrs = ''
      // Check if it's an image macro (contains ':')
      if (coverImage.includes(':')) {
        const m = /^image::?(\S|\S.*?\S)\[(.*?)?\]$/.exec(coverImage)
        if (m) {
          fileref = await doc.imageUri(m[1])
          // size attrs parsing omitted for simplicity
        }
      }
      return `<cover role="${face}">\n<mediaobject>\n<imageobject>\n<imagedata fileref="${fileref}"${sizeAttrs}/>\n</imageobject>\n</mediaobject>\n</cover>`
    }
    if (usePlaceholder) return `<cover role="${face}"/>`
    return null
  }

  async _blockquoteTag(node, tagName, contentFn) {
    const tag = tagName || 'blockquote'
    const result = [
      `<${tag}${this._commonAttributes(node.id, node.role, node.reftext)}>`,
    ]
    if (node.hasTitle()) result.push(`<title>${node.title}</title>`)
    if (node.hasAttr('attribution') || node.hasAttr('citetitle')) {
      result.push('<attribution>')
      if (node.hasAttr('attribution')) result.push(node.attr('attribution'))
      if (node.hasAttr('citetitle'))
        result.push(`<citetitle>${node.attr('citetitle')}</citetitle>`)
      result.push('</attribution>')
    }
    result.push(await contentFn())
    result.push(`</${tag}>`)
    return result.join(LF)
  }
}

export default DocBook5Converter
