// ESM conversion of converter/manpage.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby module constants (WHITESPACE, ESC, …) → module-level const
//   - Ruby symbol keys (:preserve, :normalize, :collapse) → plain strings
//   - node.attr?  → node.hasAttr()
//   - node.title? → node.hasTitle()
//   - node.blocks? → node.hasBlocks()
//   - node.footnotes? → node.hasFootnotes()
//   - node.noheader → node.isNoheader()
//   - node.authors → node.authors() (method call)
//   - node.footnotes → node.footnotes (getter)
//   - await node.content() → await node.content() (method call)
//   - node.text → node.text (property/getter)
//   - node.captioned_title → node.captionedTitle()
//   - node.content_model == :compound → node.contentModel === 'compound'
//   - node.rows.to_h.each { |tsec, rows| } → for (const [tsec, rows] of node.rows.bySection())
//   - node.media_uri target → node.mediaUri(target)
//   - AbstractNode === ref → ref instanceof AbstractNode
//   - node.context === :section → node.context === 'section'
//   - node.document.catalog[:refs] → node.document.catalog.refs
//   - Ruby gsub blocks with $1, $2 → replace callbacks with (m, $1, $2, ...)
//   - Ruby str.tr_s(WHITESPACE, ' ') → str.replace(/[\n\t ]+/g, ' ')
//   - Ruby str.rstrip → str.trimEnd()
//   - Ruby str.lstrip → str.trimStart()
//   - self.write_alternate_pages → static writeAlternatePages; uses lazy node:fs import
//   - (^)? capture of zero-width anchor: Ruby empty string is truthy, JS empty string is falsy
//     → use ($1 !== undefined) instead of ($1) in preserve-whitespace handler

import { ConverterBase } from '../converter.js'
import { AbstractNode } from '../abstract_node.js'
import { LF, TAB, BLOCK_MATH_DELIMITERS } from '../constants.js'
import { InvalidSectionIdCharsRx } from '../rx.js'

// ── Module-level constants ────────────────────────────────────────────────────

const _WHITESPACE = `${LF}${TAB} ` // "\n\t "
const ET = ' '.repeat(8) // expand tab to 8 spaces
const ESC = '\u001b' // troff leader marker
const ESC_BS = `${ESC}\\` // escaped backslash (troff formatting sequence)
const ESC_FS = `${ESC}.` // escaped full stop (troff macro)

// ── Module-level regular expressions ─────────────────────────────────────────

// Matches a literal backslash at string start (^\\) OR an optionally ESC-prefixed backslash
// Replacement rule: if ESC-prefixed ($1 set) → keep as-is; otherwise → \\(rs
const LiteralBackslashRx = /^\\|(\u001b)?\\/g

// Matches a leading period on any line (troff macro indicator)
const LeadingPeriodRx = /^\./gm

// Matches a full escaped URL/MTO macro line (possibly prefixed by orphaned \c line)
const EscapedMacroRx =
  /^(?:\u001b\\c\n)?\u001b\.((?:URL|MTO) ".*?" ".*?" )( |[^\s]*)(.*?)(?: *\u001b\\c)?$/gm

// Matches malformed escaped macros (orphaned \c followed by ESC macro without newline)
const MalformedEscapedMacroRx = /(\u001b\\c) (\u001b\.(?:URL|MTO) )/g

// Matches mock XML boundary markers used to avoid artificial word-breaks
const MockMacroRx = /<\/?([\u001b]\\[^>]+)>/g

// HTML entity references for em-dash and ellipsis
const EmDashCharRefRx = /&#8212;(?:&#8203;)?/g
const EllipsisCharRefRx = /&#8230;(?:&#8203;)?/g

// Whitespace normalisation: optional blanks around a newline → single newline
const WrappedIndentRx = /[ \t]*\n[ \t]*/g

// Detects any XML/entity markup in a string (used by uppercase_pcdata)
const XMLMarkupRx = /&#?[a-z\d]+;|</

// Splits a string into entity refs / fake-XML spans / monospaced spans / plain text
const PCDATAFilterRx =
  /(&#?[a-z\d]+;|<\u001b\\f\(CR[\s\S]*?<\/\u001b\\fP>|<[^>]+>)|([^&<]+)/g

// ── ManPageConverter ──────────────────────────────────────────────────────────

export default class ManPageConverter extends ConverterBase {
  constructor(backend, opts = {}) {
    super(backend, opts)
    this.initBackendTraits({
      basebackend: 'manpage',
      filetype: 'man',
      outfilesuffix: '.man',
      supportsTemplates: true,
    })
  }

  async convert_document(node) {
    if (!node.hasAttr('mantitle')) {
      throw new Error(
        'asciidoctor: ERROR: doctype must be set to manpage when using manpage backend'
      )
    }
    const mantitle = node.attr('mantitle').replace(InvalidSectionIdCharsRx, '')
    const manvolnum = node.attr('manvolnum', '1')
    const manname = node.attr('manname', mantitle)
    const manmanual = node.attr('manmanual')
    const mansource = node.attr('mansource')
    const docdate = node.hasAttr('reproducible') ? null : node.attr('docdate')

    // NOTE the first line enables the table (tbl) preprocessor, necessary for non-Linux systems
    const result = [
      `'\\" t
.\\"     Title: ${mantitle}
.\\"    Author: ${node.hasAttr('authors') ? node.attr('authors') : '[see the "AUTHOR(S)" section]'}
.\\" Generator: Asciidoctor ${node.attr('asciidoctor-version')}`,
    ]

    if (docdate) result.push(`.\\"      Date: ${docdate}`)

    result.push(`.\\"    Manual: ${manmanual ? manmanual.replace(/[\n\t ]+/g, ' ') : '\\ \\&'}
.\\"    Source: ${mansource ? mansource.replace(/[\n\t ]+/g, ' ') : '\\ \\&'}
.\\"  Language: English
.\\"`)

    // TODO add document-level setting to disable capitalization of manname
    result.push(
      `.TH "${this.manify(manname.toUpperCase())}" "${manvolnum}" "${docdate ?? ''}" "${mansource ? this.manify(mansource) : '\\ \\&'}" "${manmanual ? this.manify(manmanual) : '\\ \\&'}"`
    )

    // define portability settings
    // see http://bugs.debian.org/507673
    // see http://lists.gnu.org/archive/html/groff/2009-02/msg00013.html
    result.push('.ie \\n(.g .ds Aq \\(aq')
    result.push(".el       .ds Aq '")
    // set sentence_space_size to 0 to prevent extra space between sentences separated by a newline
    result.push('.ss \\n[.ss] 0')
    // disable hyphenation
    result.push('.nh')
    // disable justification (adjust text to left margin only)
    result.push('.ad l')
    // define URL macro for portability
    // see http://web.archive.org/web/20060102165607/http://people.debian.org/~branden/talks/wtfm/wtfm.pdf
    //
    // Usage
    //
    // .URL "http://www.debian.org" "Debian" "."
    //
    // * First argument: the URL
    // * Second argument: text to be hyperlinked
    // * Third (optional) argument: text that needs to immediately trail the hyperlink without intervening whitespace
    result.push(`.de URL
\\fI\\\\$2\\fP <\\\\$1>\\\\$3
..
.als MTO URL
.if \\n[.g] \\{\\
.  mso www.tmac
.  am URL
.    ad l
.  .
.  am MTO
.    ad l
.  .`)
    result.push(`.  LINKSTYLE ${node.attr('man-linkstyle', 'blue R < >')}`)
    result.push('.\\}')

    if (!node.isNoheader()) {
      if (node.hasAttr('manpurpose')) {
        const mannames = node.attr('mannames', [manname])
        result.push(`.SH "${(node.attr('manname-title', 'NAME')).toUpperCase()}"
${mannames.map((n) => this.manify(n).replace(/\\-/g, '-')).join(', ')} \\- ${this.manify(node.attr('manpurpose'), { whitespace: 'normalize' })}`)
      }
    }

    result.push(await node.content())

    // QUESTION should NOTES come after AUTHOR(S)?
    this._appendFootnotes(result, node)

    const authors = node.authors()
    if (authors.length > 0) {
      if (authors.length > 1) {
        result.push('.SH "AUTHORS"')
        for (const author of authors) {
          result.push(`.sp\n${author.name}`)
        }
      } else {
        result.push(`.SH "AUTHOR"\n.sp\n${authors[0].name}`)
      }
    }

    return result.join(LF)
  }

  // NOTE embedded doesn't really make sense in the manpage backend
  async convert_embedded(node) {
    const result = [await node.content()]
    this._appendFootnotes(result, node)
    // QUESTION should we add an AUTHOR(S) section?
    return result.join(LF)
  }

  async convert_section(node) {
    let macro, stitle
    if (node.level > 1) {
      macro = 'SS'
      // QUESTION why captioned title? why not when level == 1?
      stitle = node.captionedTitle()
    } else {
      macro = 'SH'
      stitle = this._uppercasePcdata(node.title)
    }
    return `.${macro} "${this.manify(stitle)}"\n${await node.content()}`
  }

  async convert_admonition(node) {
    const titleSuffix = node.hasTitle()
      ? `\\fP: ${this.manify(node.title)}`
      : ''
    return `.if n .sp
.RS 4
.it 1 an-trap
.nr an-no-space-flag 1
.nr an-break-flag 1
.br
.ps +1
.B ${node.attr('textlabel')}${titleSuffix}
.ps -1
.br
${await this._encloseContent(node)}
.sp .5v
.RE`
  }

  async convert_colist(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.title)}\n.br`)
    }
    result.push('.TS\ntab(:);\nr lw(\\n(.lu*75u/100u).')

    let num = 0
    for (const item of node.getItems()) {
      result.push(`\\fB(${++num})\\fP\\h'-2n':T{`)
      result.push(this.manify(item.getText(), { whitespace: 'normalize' }))
      if (item.hasBlocks()) result.push(await item.content())
      result.push('T}')
    }
    result.push('.TE')
    return result.join(LF)
  }

  // TODO implement horizontal (if it makes sense)
  async convert_dlist(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.title)}\n.br`)
    }
    let counter = 0
    for (const [terms, dd] of node.getItems()) {
      counter++
      if (node.style === 'qanda') {
        result.push(
          `.sp\n${counter}. ${this.manify(terms.map((dt) => dt.getText()).join(' '))}\n.RS 4`
        )
      } else {
        result.push(
          `.sp\n${this.manify(terms.map((dt) => dt.getText()).join(', '), { whitespace: 'normalize' })}\n.RS 4`
        )
      }
      if (dd) {
        let hasText = false
        if (dd.hasText()) {
          result.push(this.manify(dd.getText(), { whitespace: 'normalize' }))
          hasText = true
        }
        if (dd.hasBlocks()) {
          let ddContent = await dd.content()
          if (!hasText && ddContent.startsWith('.sp\n')) {
            ddContent = ddContent.slice(4)
          }
          result.push(ddContent)
        }
      }
      result.push('.RE')
    }
    return result.join(LF)
  }

  async convert_example(node) {
    const titleBlock = node.hasTitle()
      ? `.sp\n.B ${this.manify(node.captionedTitle())}\n.br`
      : '.sp'
    return `${titleBlock}\n.RS 4\n${await this._encloseContent(node)}\n.RE`
  }

  async convert_floating_title(node) {
    return `.SS "${this.manify(node.title)}"`
  }

  async convert_image(node) {
    const titleBlock = node.hasTitle()
      ? `.sp\n.B ${this.manify(node.captionedTitle())}\n.br`
      : '.sp'
    return `${titleBlock}\n[${this.manify(node.attr('alt'))}]`
  }

  async convert_listing(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.captionedTitle())}\n.br`)
    }
    result.push(`.sp
.if n .RS 4
.nf
.fam C
${this.manify(await node.content(), { whitespace: 'preserve' })}
.fam
.fi
.if n .RE`)
    return result.join(LF)
  }

  async convert_literal(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.title)}\n.br`)
    }
    result.push(`.sp
.if n .RS 4
.nf
.fam C
${this.manify(await node.content(), { whitespace: 'preserve' })}
.fam
.fi
.if n .RE`)
    return result.join(LF)
  }

  async convert_sidebar(node) {
    const titleBlock = node.hasTitle()
      ? `.sp\n.B ${this.manify(node.title)}\n.br`
      : '.sp'
    return `${titleBlock}\n.RS 4\n${await this._encloseContent(node)}\n.RE`
  }

  async convert_olist(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.title)}\n.br`)
    }

    const start = parseInt(node.attr('start', 1), 10)
    let idx = 0
    for (const item of node.getItems()) {
      const numeral = idx + start
      const listText = this.manify(item.getText(), { whitespace: 'normalize' })
      result.push(`.sp
.RS 4
.ie n \\{\\
\\h'-04' ${numeral}.\\h'+01'\\c
.\\}
.el \\{\\
.  sp -1
.  IP " ${numeral}." 4.2
.\\}${listText === '' ? '' : LF + listText}`)
      if (item.hasBlocks()) {
        let itemContent = await item.content()
        if (listText === '' && itemContent.startsWith('.sp\n')) {
          itemContent = itemContent.slice(4)
        }
        result.push(itemContent)
      }
      result.push('.RE')
      idx++
    }
    return result.join(LF)
  }

  async convert_open(node) {
    if (node.style === 'abstract' || node.style === 'partintro') {
      return this._encloseContent(node)
    }
    return await node.content()
  }

  async convert_page_break(_node) {
    return '.bp'
  }

  async convert_paragraph(node) {
    if (node.hasTitle()) {
      return `.sp\n.B ${this.manify(node.title)}\n.br\n${this.manify(await node.content(), { whitespace: 'normalize' })}`
    }
    return `.sp\n${this.manify(await node.content(), { whitespace: 'normalize' })}`
  }

  async convert_pass(node) {
    return this.contentOnly(node)
  }

  async convert_preamble(node) {
    return this.contentOnly(node)
  }

  async convert_quote(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.RS 3\n.B ${this.manify(node.title)}\n.br\n.RE`)
    }
    let attributionLine = node.hasAttr('citetitle')
      ? `${node.attr('citetitle')} `
      : null
    if (node.hasAttr('attribution')) {
      attributionLine = `${attributionLine ?? ''}\\(em ${node.attr('attribution')}`
    } else {
      attributionLine = null
    }
    result.push(
      `.RS 3\n.ll -.6i\n${await this._encloseContent(node)}\n.br\n.RE\n.ll`
    )
    if (attributionLine) {
      result.push(`.RS 5\n.ll -.10i\n${attributionLine}\n.RE\n.ll`)
    }
    return result.join(LF)
  }

  async convert_stem(node) {
    const result = []
    result.push(
      node.hasTitle() ? `.sp\n.B ${this.manify(node.title)}\n.br` : '.sp'
    )
    const style = node.style
    const [open, close] = BLOCK_MATH_DELIMITERS[style] ?? ['', '']
    let equation = await node.content()
    if (equation.startsWith(open) && equation.endsWith(close)) {
      equation = equation.slice(open.length, equation.length - close.length)
    }
    result.push(
      `${this.manify(equation, { whitespace: 'preserve' })} (${style})`
    )
    return result.join(LF)
  }

  // NOTE This handler inserts empty cells to account for colspans and rowspans.
  // In order to support colspans and rowspans properly, that information must
  // be computed up front and consulted when rendering the cell as this information
  // is not available on the cell itself.
  async convert_table(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp
.it 1 an-trap
.nr an-no-space-flag 1
.nr an-break-flag 1
.br
.B ${this.manify(node.captionedTitle())}
`)
    }
    result.push(`.TS\nallbox tab(:);`)

    const rowHeader = []
    const rowText = []
    let rowIndex = 0

    for (const [tsec, rows] of node.rows.bySection()) {
      if (rows.length === 0) continue
      for (const row of rows) {
        rowHeader[rowIndex] = rowHeader[rowIndex] ?? []
        rowText[rowIndex] = rowText[rowIndex] ?? []
        let remainingCells = row.length
        let cellIndex = 0
        for (const cell of row) {
          remainingCells--
          rowHeader[rowIndex][cellIndex] = rowHeader[rowIndex][cellIndex] ?? []
          // add an empty cell as a placeholder if this is a rowspan cell
          if (
            JSON.stringify(rowHeader[rowIndex][cellIndex]) ===
            JSON.stringify(['^t'])
          ) {
            rowText[rowIndex].push(`T{${LF}T}:`)
          }
          rowText[rowIndex].push(`T{${LF}`)
          const cellHalign = (cell.attr('halign', 'left') ?? 'left')[0]
          if (tsec === 'body') {
            if (
              rowHeader[rowIndex].length === 0 ||
              rowHeader[rowIndex][cellIndex].length === 0
            ) {
              rowHeader[rowIndex][cellIndex].push(`${cellHalign}t`)
            } else {
              rowHeader[rowIndex][cellIndex + 1] =
                rowHeader[rowIndex][cellIndex + 1] ?? []
              rowHeader[rowIndex][cellIndex + 1].push(`${cellHalign}t`)
            }
            let cellContent
            if (cell.style === 'asciidoc') {
              cellContent = await cell.content()
            } else if (cell.style === 'literal') {
              cellContent = `.nf${LF}${this.manify(cell.text, { whitespace: 'preserve' })}${LF}.fi`
            } else {
              cellContent = (await cell.content())
                .map((p) => this.manify(p, { whitespace: 'normalize' }))
                .join(`${LF}.sp${LF}`)
            }
            rowText[rowIndex].push(`${cellContent}${LF}`)
          } else {
            // tsec === 'head' || tsec === 'foot'
            if (
              rowHeader[rowIndex].length === 0 ||
              rowHeader[rowIndex][cellIndex].length === 0
            ) {
              rowHeader[rowIndex][cellIndex].push(`${cellHalign}tB`)
            } else {
              rowHeader[rowIndex][cellIndex + 1] =
                rowHeader[rowIndex][cellIndex + 1] ?? []
              rowHeader[rowIndex][cellIndex + 1].push(`${cellHalign}tB`)
            }
            rowText[rowIndex].push(
              `${this.manify(cell.text, { whitespace: 'normalize' })}${LF}`
            )
          }
          if (cell.colspan && cell.colspan > 1) {
            for (let i = 0; i < cell.colspan - 1; i++) {
              if (
                rowHeader[rowIndex].length === 0 ||
                rowHeader[rowIndex][cellIndex].length === 0
              ) {
                rowHeader[rowIndex][cellIndex + i].push('st')
              } else {
                rowHeader[rowIndex][cellIndex + 1 + i] =
                  rowHeader[rowIndex][cellIndex + 1 + i] ?? []
                rowHeader[rowIndex][cellIndex + 1 + i].push('st')
              }
            }
          }
          if (cell.rowspan && cell.rowspan > 1) {
            for (let i = 0; i < cell.rowspan - 1; i++) {
              rowHeader[rowIndex + 1 + i] = rowHeader[rowIndex + 1 + i] ?? []
              if (
                rowHeader[rowIndex + 1 + i].length === 0 ||
                (rowHeader[rowIndex + 1 + i][cellIndex] ?? []).length === 0
              ) {
                rowHeader[rowIndex + 1 + i][cellIndex] =
                  rowHeader[rowIndex + 1 + i][cellIndex] ?? []
                rowHeader[rowIndex + 1 + i][cellIndex].push('^t')
              } else {
                rowHeader[rowIndex + 1 + i][cellIndex + 1] =
                  rowHeader[rowIndex + 1 + i][cellIndex + 1] ?? []
                rowHeader[rowIndex + 1 + i][cellIndex + 1].push('^t')
              }
            }
          }
          if (remainingCells >= 1) {
            rowText[rowIndex].push('T}:')
          } else {
            rowText[rowIndex].push(`T}${LF}`)
          }
          cellIndex++
        }
        rowIndex++
      }
    }

    let rowTextSlice = rowText
    if (node.hasHeaderOption && rowText[0]) {
      result.push(`${LF}${rowHeader[0].join(' ')}.`)
      result.push(`${LF}${rowText[0].join('')}`)
      result.push('.T&')
      rowTextSlice = rowText.slice(1)
    }
    result.push(`${LF}${rowHeader[0].map(() => 'lt').join(' ')}.${LF}`)
    for (const row of rowTextSlice) result.push(row.join(''))
    result.push(`.TE${LF}.sp`)
    return result.join('')
  }

  async convert_thematic_break(_node) {
    return `.sp
.ce
\\l'\\n(.lu*25u/100u\\(ap'`
  }

  async convert_toc(_node) {
    // skip
  }

  async convert_ulist(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.title)}\n.br`)
    }
    for (const item of node.getItems()) {
      const listText = this.manify(item.getText(), { whitespace: 'normalize' })
      result.push(`.sp
.RS 4
.ie n \\{\\
\\h'-04'\\(bu\\h'+03'\\c
.\\}
.el \\{\\
.  sp -1
.  IP \\(bu 2.3
.\\}${listText === '' ? '' : LF + listText}`)
      if (item.hasBlocks()) {
        let itemContent = await item.content()
        if (listText === '' && itemContent.startsWith('.sp\n')) {
          itemContent = itemContent.slice(4)
        }
        result.push(itemContent)
      }
      result.push('.RE')
    }
    return result.join(LF)
  }

  async convert_verse(node) {
    const result = []
    if (node.hasTitle()) {
      result.push(`.sp\n.B ${this.manify(node.title)}\n.br`)
    }
    let attributionLine = node.hasAttr('citetitle')
      ? `${node.attr('citetitle')} `
      : null
    if (node.hasAttr('attribution')) {
      attributionLine = `${attributionLine ?? ''}\\(em ${node.attr('attribution')}`
    } else {
      attributionLine = null
    }
    result.push(
      `.sp\n.nf\n${this.manify(await node.content(), { whitespace: 'preserve' })}\n.fi\n.br`
    )
    if (attributionLine) {
      result.push(`.in +.5i\n.ll -.5i\n${attributionLine}\n.in\n.ll`)
    }
    return result.join(LF)
  }

  async convert_video(node) {
    const startParam = node.hasAttr('start')
      ? `&start=${node.attr('start')}`
      : ''
    const endParam = node.hasAttr('end') ? `&end=${node.attr('end')}` : ''
    const titleBlock = node.hasTitle()
      ? `.sp\n.B ${this.manify(node.title)}\n.br`
      : '.sp'
    return `${titleBlock}\n<${node.mediaUri(node.attr('target'))}${startParam}${endParam}> (video)`
  }

  async convert_inline_anchor(node) {
    const target = node.target
    switch (node.type) {
      case 'link': {
        let macro
        let resolvedTarget = target
        if (target.startsWith('mailto:')) {
          macro = 'MTO'
          resolvedTarget = target.slice(7)
        } else {
          macro = 'URL'
        }
        let text = node.text
        if (text === resolvedTarget) {
          text = ''
        } else {
          text = text.replace(/"/g, `${ESC_BS}(dq`)
        }
        if (macro === 'MTO') {
          resolvedTarget = resolvedTarget.replace('@', `${ESC_BS}(at`)
        }
        return `${ESC_BS}c${LF}${ESC_FS}${macro} "${resolvedTarget}" "${text}" `
      }
      case 'xref': {
        let text = node.text
        if (!text) {
          const refs = (this._refs ??= node.document.catalog.refs)
          const refid = node.attributes.refid
          let top
          const ref =
            refs[refid] ?? (!refid ? (top = this._getRootDocument(node)) : null)
          if (ref instanceof AbstractNode) {
            const resolvingSet = (this._resolvingXrefs ??= new Set())
            if (!resolvingSet.has(refid)) {
              resolvingSet.add(refid)
              const resolved = await ref.xreftext(
                node.attr('xrefstyle', null, true)
              )
              resolvingSet.delete(refid)
              if (resolved) {
                text = resolved
                if (
                  ref.context === 'section' &&
                  ref.level < 2 &&
                  text === ref.title
                ) {
                  text = this._uppercasePcdata(text)
                }
              } else {
                text = top ? '[^top]' : `[${refid}]`
              }
            } else {
              text = top ? '[^top]' : `[${refid}]`
            }
          } else {
            text = `[${refid}]`
          }
        }
        return text
      }
      case 'ref':
      case 'bibref':
        // These are anchor points, which shouldn't be visible
        return ''
      default:
        this.logger.warn(`unknown anchor type: ${node.type}`)
        return null
    }
  }

  async convert_inline_break(node) {
    return `${node.text}${LF}${ESC_FS}br`
  }

  async convert_inline_button(node) {
    return `<${ESC_BS}fB>[${ESC_BS}0${node.text}${ESC_BS}0]</${ESC_BS}fP>`
  }

  async convert_inline_callout(node) {
    return `<${ESC_BS}fB>(${node.text})<${ESC_BS}fP>`
  }

  async convert_inline_footnote(node) {
    const index = node.attr('index')
    if (index) return `[${index}]`
    if (node.type === 'xref') return `[${node.text}]`
    return null
  }

  async convert_inline_image(node) {
    return node.hasAttr('link')
      ? `[${node.attr('alt')}] <${node.attr('link')}>`
      : `[${node.attr('alt')}]`
  }

  async convert_inline_indexterm(node) {
    return node.type === 'visible' ? node.text : ''
  }

  async convert_inline_kbd(node) {
    const keys = node.attr('keys')
    return `<${ESC_BS}f(CR>${keys.length === 1 ? keys[0] : keys.join(`${ESC_BS}0+${ESC_BS}0`)}</${ESC_BS}fP>`
  }

  async convert_inline_menu(node) {
    const caret = `${ESC_BS}0${ESC_BS}(fc${ESC_BS}0`
    const menu = node.attr('menu')
    const submenus = node.attr('submenus')
    if (submenus && submenus.length > 0) {
      const submenuPath = submenus
        .map((item) => `<${ESC_BS}fI>${item}</${ESC_BS}fP>`)
        .join(caret)
      return `<${ESC_BS}fI>${menu}</${ESC_BS}fP>${caret}${submenuPath}${caret}<${ESC_BS}fI>${node.attr('menuitem')}</${ESC_BS}fP>`
    } else if (node.attr('menuitem')) {
      return `<${ESC_BS}fI>${menu}${caret}${node.attr('menuitem')}</${ESC_BS}fP>`
    } else {
      return `<${ESC_BS}fI>${menu}</${ESC_BS}fP>`
    }
  }

  // NOTE use fake XML elements to prevent creating artificial word boundaries
  async convert_inline_quoted(node) {
    switch (node.type) {
      case 'emphasis':
        return `<${ESC_BS}fI>${node.text}</${ESC_BS}fP>`
      case 'strong':
        return `<${ESC_BS}fB>${node.text}</${ESC_BS}fP>`
      case 'monospaced':
        return `<${ESC_BS}f(CR>${node.text}</${ESC_BS}fP>`
      case 'single':
        return `<${ESC_BS}(oq>${node.text}</${ESC_BS}(cq>`
      case 'double':
        return `<${ESC_BS}(lq>${node.text}</${ESC_BS}(rq>`
      default:
        return node.text
    }
  }

  // Class method: write stub man pages for alternate names
  static async writeAlternatePages(mannames, manvolnum, target) {
    if (!mannames || mannames.length <= 1) return
    mannames = mannames.slice(1)
    const manvolext = `.${manvolnum}`
    const { dirname, basename, join } = await import('node:path')
    const { writeFile } = await import('node:fs/promises')
    const dir = dirname(target)
    const base = basename(target)
    for (const manname of mannames) {
      await writeFile(join(dir, `${manname}${manvolext}`), `.so ${base}`)
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /**
   * @internal
   * @private
   */
  _appendFootnotes(result, node) {
    if (!node.hasFootnotes() || node.hasAttr('nofootnotes')) return
    result.push('.SH "NOTES"')
    for (const fn of node.footnotes) {
      result.push(`.IP [${fn.index}]`)
      // NOTE restore newline in escaped macro that gets removed by normalize_text in substitutor
      let text = fn.text
      if (text.includes(`${ESC}\\c ${ESC}.`)) {
        text = this.manify(
          `${text.replace(MalformedEscapedMacroRx, `$1${LF}$2`)} `,
          { whitespace: 'normalize' }
        ).replace(/ $/, '')
      } else {
        text = this.manify(text, { whitespace: 'normalize' })
      }
      result.push(text)
    }
  }

  /**
   * Converts HTML entity references back to their original form, escapes
   * special man characters and strips trailing whitespace.
   *
   * It's crucial that text only ever pass through manify once.
   *
   * @param {string} str - the string to convert
   * @param {Object} [opts={}] - options to control processing
   * @param {'preserve'|'normalize'|'collapse'} [opts.whitespace='collapse'] - how to handle whitespace:
   *   `'preserve'` preserves spaces (only expanding tabs);
   *   `'normalize'` removes spaces around newlines;
   *   `'collapse'` collapses adjacent whitespace to a single space
   * @param {boolean} [opts.append_newline=false] - append a newline to the result
   * @returns {string} the manified string
   */
  manify(str, opts = {}) {
    const whitespace = opts.whitespace ?? 'collapse'
    if (whitespace === 'preserve') {
      // expand tabs, then escape leading indentation (2+ spaces not at line start)
      str = str
        .replace(/\t/g, ET)
        .replace(/ {2,}/g, (m, offset, str) =>
          offset === 0 || str[offset - 1] === '\n' ? m : `${ESC_BS}&${m}`
        )
    } else if (whitespace === 'normalize') {
      str = str.replace(WrappedIndentRx, LF)
    } else {
      // collapse: replace any run of whitespace chars with a single space
      str = str.replace(/[\n\t ]+/g, ' ')
    }

    str = str
      // literal backslash (not a troff escape sequence)
      .replace(LiteralBackslashRx, (m, $1) => ($1 ? m : '\\(rs'))
      // horizontal ellipsis (emulate appearance)
      .replace(EllipsisCharRefRx, '.\\|.\\|.')
      // leading . used in troff for macro call; replace with \&.
      .replace(LeadingPeriodRx, '\\&.')
      // drop orphaned \c escape lines, unescape troff macro, quote adjacent char, isolate macro line
      .replace(EscapedMacroRx, (_m, $1, $2, $3) => {
        const rest = $3.trimStart()
        return rest === ''
          ? `.${$1}"${$2}"`
          : `.${$1}"${$2.trimEnd()}"\n${rest}`
      })
      .replace(/-/g, '\\-')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#43;/g, '+') // plus sign
      .replace(/&#160;/g, '\\~') // non-breaking space
      .replace(/&#169;/g, '\\(co') // copyright sign
      .replace(/&#174;/g, '\\(rg') // registered sign
      .replace(/&#8482;/g, '\\(tm') // trademark sign
      .replace(/&#176;/g, '\\(de') // degree sign
      .replace(/&#8201;/g, ' ') // thin space
      .replace(/&#8211;/g, '\\(en') // en dash
      .replace(EmDashCharRefRx, '\\(em') // em dash
      .replace(/&#8216;/g, '\\(oq') // left single quotation mark
      .replace(/&#8217;/g, '\\(cq') // right single quotation mark
      .replace(/&#8220;/g, '\\(lq') // left double quotation mark
      .replace(/&#8221;/g, '\\(rq') // right double quotation mark
      .replace(/&#8592;/g, '\\(<-') // leftwards arrow
      .replace(/&#8594;/g, '\\(->') // rightwards arrow
      .replace(/&#8656;/g, '\\(lA') // leftwards double arrow
      .replace(/&#8658;/g, '\\(rA') // rightwards double arrow
      .replace(/&#8203;/g, '\\:') // zero width space
      .replace(/&amp;/g, '&') // literal ampersand (must come after other & replacements)
      .replace(/'/g, '\\*(Aq') // apostrophe / neutral single quote
      .replace(MockMacroRx, '$1') // remove mock boundary markers
      .replace(/\u001b\\/g, '\\') // unescape troff backslash (ESC_BS → \)
      .replace(/\u001b\./g, '.') // unescape full stop in troff commands (ESC_FS → .)
      .trimEnd() // strip trailing space

    return opts.append_newline ? `${str}${LF}` : str
  }

  /**
   * @internal
   * @private
   */
  _uppercasePcdata(string) {
    if (!XMLMarkupRx.test(string)) return string.toUpperCase()
    // Reset lastIndex since XMLMarkupRx is stateless (no /g flag) but test() advances for sticky
    return string.replace(PCDATAFilterRx, (_m, $1, $2) =>
      $2 ? $2.toUpperCase() : $1
    )
  }

  /**
   * @internal
   * @private
   */
  async _encloseContent(node) {
    return node.contentModel === 'compound'
      ? await node.content()
      : `.sp\n${this.manify(await node.content(), { whitespace: 'normalize' })}`
  }

  /**
   * @internal
   * @private
   */
  _getRootDocument(node) {
    while ((node = node.document).isNested()) {
      node = node.parentDocument
    }
    return node
  }
}

ManPageConverter.registerFor('manpage')
