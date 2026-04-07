// ESM conversion of table.rb
//
// Ruby-to-JavaScript notes:
//   - Table::Rows#[] (alias for send) → explicit bySection/head/foot/body access.
//   - Table::Cell references Document, PreprocessorReader, Parser — these are
//     imported lazily (dynamic import) to avoid circular dependency issues.
//   - String#squeeze(ch) → replaceAll(ch+ch, ch) loop (only used for '"').
//   - Number#truncate(precision) → Math.trunc(n * 10^p) / 10^p.
//   - :asciidoc / :literal / :header symbols → strings 'asciidoc', 'literal', 'header'.

import { AbstractBlock }                   from './abstract_block.js'
import { AbstractNode }                    from './abstract_node.js'
import { Inline }                          from './inline.js'
import { applyLogging }                    from './logging.js'
import { LF }                              from './constants.js'
import { BlankLineRx, LeadingInlineAnchorRx } from './rx.js'
import { BASIC_SUBS, NORMAL_SUBS }         from './substitutors.js'

// Helper: truncate a float to `precision` decimal places (like Ruby's Float#truncate).
function truncate (value, precision) {
  const factor = Math.pow(10, precision)
  return Math.trunc(value * factor) / factor
}

// Helper: collapse consecutive identical characters (like Ruby's String#squeeze(q)).
function squeezeChar (str, ch) {
  const double = ch + ch
  while (str.includes(double)) str = str.replaceAll(double, ch)
  return str
}

const DEFAULT_PRECISION = 4

// ── Table ─────────────────────────────────────────────────────────────────────

export class Table extends AbstractBlock {
  constructor (parent, attributes) {
    super(parent, 'table')
    this.rows    = new Table.Rows()
    this.columns = []
    this.hasHeaderOption = false

    // Resolve tablepcwidth from 'width' attribute
    let pcwidthIntval = 100
    const pcwidth = attributes['width']
    if (pcwidth != null) {
      let v = parseInt(pcwidth, 10)
      if (isNaN(v)) v = 0
      if (v > 100 || v < 1) {
        if (!(v === 0 && (pcwidth === '0' || pcwidth === '0%'))) v = 100
      }
      pcwidthIntval = v
    }
    this.attributes['tablepcwidth'] = pcwidthIntval

    const pagewidthAttr = this.document.attributes['pagewidth']
    if (pagewidthAttr != null) {
      const abswidthVal = truncate((pcwidthIntval / 100.0) * parseFloat(pagewidthAttr), DEFAULT_PRECISION)
      this.attributes['tableabswidth'] = abswidthVal === Math.trunc(abswidthVal) ? Math.trunc(abswidthVal) : abswidthVal
    }

    if (attributes['rotate-option']) this.attributes['orientation'] = 'landscape'
  }

  // Internal: Returns the header option state if the row being processed is the header row, otherwise false.
  headerRow () {
    const val = this.hasHeaderOption
    return (val && this.rows.body.length === 0) ? val : false
  }

  // Internal: Create Column objects from the column spec array.
  createColumns (colspecs) {
    const cols = []
    let autowidthCols = null
    let widthBase = 0
    for (const colspec of colspecs) {
      const colwidth = colspec['width']
      cols.push(new Table.Column(this, cols.length, colspec))
      if (colwidth < 0) {
        (autowidthCols ??= []).push(cols[cols.length - 1])
      } else {
        widthBase += colwidth
      }
    }
    this.columns = cols
    const numCols = cols.length
    if (numCols > 0) {
      this.attributes['colcount'] = numCols
      const effectiveWidthBase = (widthBase > 0 || autowidthCols) ? widthBase : null
      this.assignColumnWidths(effectiveWidthBase, autowidthCols)
    }
  }

  // Internal: Assign percentage (and absolute) widths to all columns.
  assignColumnWidths (widthBase = null, autowidthCols = null) {
    const precision = DEFAULT_PRECISION
    let totalWidth  = 0
    let colPcwidth  = 0

    if (widthBase != null) {
      if (autowidthCols) {
        let autowidth
        if (widthBase > 100) {
          autowidth = 0
          this.logger.warn(`total column width must not exceed 100% when using autowidth columns; got ${widthBase}%`)
        } else {
          autowidth = truncate((100.0 - widthBase) / autowidthCols.length, precision)
          if (Math.trunc(autowidth) === autowidth) autowidth = Math.trunc(autowidth)
          widthBase = 100
        }
        const autowAttrs = { width: autowidth, 'autowidth-option': '' }
        for (const col of autowidthCols) col.updateAttributes(autowAttrs)
      }
      for (const col of this.columns) {
        totalWidth += (colPcwidth = col.assignWidth(null, widthBase, precision))
      }
    } else {
      colPcwidth = truncate(100.0 / this.columns.length, precision)
      if (Math.trunc(colPcwidth) === colPcwidth) colPcwidth = Math.trunc(colPcwidth)
      for (const col of this.columns) {
        totalWidth += col.assignWidth(colPcwidth, null, precision)
      }
    }

    // Donate balance to the last column (half-up rounding)
    if (totalWidth !== 100) {
      const balance = +((100 - totalWidth + colPcwidth).toFixed(precision))
      this.columns[this.columns.length - 1].assignWidth(balance, null, precision)
    }
  }

  // Internal: Partition rows into header, footer, and body.
  partitionHeaderFooter (attrs) {
    const body         = this.rows.body
    let numBodyRows    = this.attributes['rowcount'] = body.length

    if (numBodyRows > 0) {
      if (this.hasHeaderOption === true) {
        this.rows.head = [body.shift().map(cell => cell.reinitialize(true))]
        numBodyRows--
      } else if (this.hasHeaderOption === null) {
        this.hasHeaderOption = false
        body.unshift(body.shift().map(cell => cell.reinitialize(false)))
      }
    }

    if (numBodyRows > 0 && ('footer-option' in attrs)) {
      this.rows.foot = [body.pop()]
    }
  }
}

// ── Table.Rows ────────────────────────────────────────────────────────────────

Table.Rows = class Rows {
  constructor (head = [], foot = [], body = []) {
    this.head = head
    this.foot = foot
    this.body = body
  }

  // Public: Retrieve the rows grouped by section as a nested Array.
  bySection () {
    return [['head', this.head], ['body', this.body], ['foot', this.foot]]
  }

  toObject () {
    return { head: this.head, body: this.body, foot: this.foot }
  }
}

// ── Table.Column ──────────────────────────────────────────────────────────────

Table.Column = class Column extends AbstractNode {
  constructor (table, index, attributes = {}) {
    super(table, 'table_column')
    this.style = attributes['style'] ?? null
    attributes['colnumber'] = index + 1
    if (!('width' in attributes)) attributes['width'] = 1
    if (!('halign' in attributes)) attributes['halign'] = 'left'
    if (!('valign' in attributes)) attributes['valign'] = 'top'
    this.updateAttributes(attributes)
  }

  // Alias for parent (always a Table).
  get table () { return this.parent }

  // Internal: Calculate and assign the widths for this column.
  //
  // Returns the resolved colpcwidth value.
  assignWidth (colPcwidth, widthBase, precision) {
    if (widthBase != null) {
      colPcwidth = truncate(parseFloat(this.attributes['width']) * 100.0 / widthBase, precision)
      if (Math.trunc(colPcwidth) === colPcwidth) colPcwidth = Math.trunc(colPcwidth)
    }
    const tableAbswidth = this.parent.attributes['tableabswidth']
    if (tableAbswidth != null) {
      const colAbswidth = truncate((colPcwidth / 100.0) * tableAbswidth, precision)
      this.attributes['colabswidth'] = colAbswidth === Math.trunc(colAbswidth) ? Math.trunc(colAbswidth) : colAbswidth
    }
    this.attributes['colpcwidth'] = colPcwidth
    return colPcwidth
  }

  isBlock ()  { return false }
  isInline () { return false }
}

// ── Table.Cell ────────────────────────────────────────────────────────────────

Table.Cell = class Cell extends AbstractBlock {
  static get DOUBLE_LF () { return LF + LF }

  constructor (column, cellText, attributes = {}, opts = {}) {
    super(column, 'table_cell')
    this._cursor         = null
    this._reinitializeArgs = null
    if (this.document.sourcemap && opts.cursor) {
      this.sourceLocation = Object.assign({}, opts.cursor)
    }

    let cellStyle = null
    let inHeaderRow = false
    let asciidoc = false
    let literal  = false
    let normalPsv = false

    if (column) {
      inHeaderRow = column.table.headerRow()
      if (inHeaderRow) {
        if (inHeaderRow === 'implicit') {
          const cs = column.style ?? (attributes && attributes['style'])
          if (cs === 'asciidoc' || cs === 'literal') {
            this._reinitializeArgs = [column, cellText, attributes && { ...attributes }, opts]
          }
          cellStyle = null
        }
        // else: don't set cellStyle from column for header row
      } else {
        cellStyle = column.style ?? null
      }
      // Inherit column attributes
      this.updateAttributes(column.attributes)
    }

    if (attributes != null) {
      if (Object.keys(attributes).length === 0) {
        this.colspan = null
        this.rowspan = null
      } else {
        this.colspan = attributes['colspan'] ? parseInt(attributes['colspan'], 10) : null
        this.rowspan = attributes['rowspan'] ? parseInt(attributes['rowspan'], 10) : null
        delete attributes['colspan']
        delete attributes['rowspan']
        if (!inHeaderRow) cellStyle = attributes['style'] ?? cellStyle
        this.updateAttributes(attributes)
      }

      switch (cellStyle) {
        case 'asciidoc': {
          asciidoc = true
          const innerDocumentCursor = opts.cursor
          cellText = cellText.trimEnd()
          if (cellText.startsWith(LF)) {
            let linesAdvanced = 0
            while (cellText.startsWith(LF)) {
              cellText = cellText.slice(1)
              linesAdvanced++
            }
            if (innerDocumentCursor && typeof innerDocumentCursor.advance === 'function') {
              innerDocumentCursor.advance(linesAdvanced)
            }
          } else {
            cellText = cellText.trimStart()
          }
          break
        }
        case 'literal':
          literal = true
          cellText = cellText.trimEnd()
          while (cellText.startsWith(LF)) cellText = cellText.slice(1)
          break
        default:
          normalPsv = true
          cellText = cellText != null ? cellText.trim() : ''
      }
    } else {
      this.colspan = null
      this.rowspan = null
      if (cellStyle === 'asciidoc') asciidoc = true
    }

    if (asciidoc) {
      const parentDoc = this.document
      const parentDoctitle = parentDoc.attributes['doctitle']
      delete parentDoc.attributes['doctitle']
      const innerDocumentLines = cellText.split(LF, -1)
      // Create and parse the inner document synchronously (Document.parse is synchronous).
      // Access Document via parentDoc.constructor to avoid a circular import.
      const innerDoc = new parentDoc.constructor(innerDocumentLines, {
        safe: parentDoc.safe,
        backend: parentDoc.backend,
        doctype: 'article',
        header_footer: false,
        parent: parentDoc,
      })
      innerDoc.parse()
      if (parentDoctitle) parentDoc.attributes['doctitle'] = parentDoctitle
      this._innerDocument = innerDoc
      this._subs = null
    } else if (literal) {
      this.contentModel = 'verbatim'
      this._subs = [...BASIC_SUBS]
    } else {
      if (normalPsv) {
        if (inHeaderRow) {
          this._cursor = opts.cursor ?? null
        } else {
          this._catalogInlineAnchor(cellText, opts.cursor)
        }
      }
      this.contentModel = 'simple'
      this._subs = [...NORMAL_SUBS]
    }
    this._text   = cellText
    this.style   = cellStyle
  }

  // Alias for parent (always a Column).
  get column () { return this.parent }

  reinitialize (hasHeader) {
    if (hasHeader) {
      this._reinitializeArgs = null
    } else if (this._reinitializeArgs) {
      return new Table.Cell(...this._reinitializeArgs)
    } else {
      this.style = this.attributes['style'] ?? null
    }
    if (this._cursor) this._catalogInlineAnchor()
    return this
  }

  _catalogInlineAnchor (cellText = this._text, cursor = null) {
    if (!cursor) {
      cursor = this._cursor
      this._cursor = null
    }
    if (!cellText.startsWith('[[')) return
    const m = cellText.match(LeadingInlineAnchorRx)
    if (!m) return
    // Parser.catalog_inline_anchor — resolved lazily to avoid circular dep
    this._pendingAnchor = { id: m[1], reftext: m[2] ?? null, node: this, cursor, document: this.document }
  }

  // Public: Get the String text with substitutions applied.
  get text () {
    return this.applySubs(this._text, this._subs)
  }

  set text (val) { this._text = val }

  // Public: Get the content — converted body data.
  get content () {
    if (this.style === 'asciidoc') {
      return this._innerDocument ? this._innerDocument.convert() : ''
    }
    if (this._text.includes(Table.Cell.DOUBLE_LF)) {
      return this.text.split(BlankLineRx).flatMap(para => {
        para = para.trim()
        if (!para) return []
        const cs = this.style
        return [(cs && cs !== 'header')
          ? (new Inline(this.parent, 'quoted', para, { type: cs })).convert()
          : para]
      })
    }
    const subbedText = this.text
    if (!subbedText) return []
    const cs = this.style
    if (cs && cs !== 'header') {
      return [(new Inline(this.parent, 'quoted', subbedText, { type: cs })).convert()]
    }
    return [subbedText]
  }

  lines () { return this._text.split(LF) }
  source () { return this._text }

  get file ()   { return this.sourceLocation?.file ?? null }
  get lineno () { return this.sourceLocation?.lineno ?? null }

  toString () {
    return `${super.toString()} - [text: ${this._text}, colspan: ${this.colspan ?? 1}, rowspan: ${this.rowspan ?? 1}, attributes: ${JSON.stringify(this.attributes)}]`
  }
}

// ── Table.ParserContext ───────────────────────────────────────────────────────

Table.ParserContext = class ParserContext {
  static get FORMATS () {
    return new Set(['psv', 'csv', 'dsv', 'tsv'])
  }

  static get DELIMITERS () {
    return {
      psv:  ['|',  /\|/],
      csv:  [',',  /,/],
      dsv:  [':',  /:/],
      tsv:  ['\t', /\t/],
      '!sv': ['!', /!/],
    }
  }

  constructor (reader, table, attributes = {}) {
    this._startCursorData = (this._reader = reader).mark()
    this.table    = table
    this.buffer   = ''

    // Determine format
    let xsv
    if ('format' in attributes) {
      xsv = attributes['format']
      if (ParserContext.FORMATS.has(xsv)) {
        if (xsv === 'tsv') {
          this.format = 'csv'
        } else {
          this.format = xsv
          if (xsv === 'psv' && table.document.nested()) xsv = '!sv'
        }
      } else {
        this.logger.error(this.messageWithContext(`illegal table format: ${xsv}`, { source_location: reader.cursorAtPrevLine() }))
        this.format = 'psv'
        xsv = table.document.nested() ? '!sv' : 'psv'
      }
    } else {
      this.format = 'psv'
      xsv = table.document.nested() ? '!sv' : 'psv'
    }

    // Determine delimiter
    const delimiters = ParserContext.DELIMITERS
    if ('separator' in attributes) {
      const sep = attributes['separator']
      if (!sep) {
        ;[this.delimiter, this.delimiterRe] = delimiters[xsv]
      } else if (sep === '\\t') {
        ;[this.delimiter, this.delimiterRe] = delimiters['tsv']
      } else {
        this.delimiter   = sep
        this.delimiterRe = new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      }
    } else {
      ;[this.delimiter, this.delimiterRe] = delimiters[xsv]
    }

    this.colcount       = table.columns.length === 0 ? -1 : table.columns.length
    this._cellspecs     = []
    this._cellOpen      = false
    this._activeRowspans = [0]
    this._columnVisits  = 0
    this._currentRow    = []
    this._linenum       = -1
  }

  startsWith (line) {
    return line.startsWith(this.delimiter)
  }

  matchDelimiter (line) {
    return line.match(this.delimiterRe)
  }

  skipPastDelimiter (pre) {
    this.buffer = `${this.buffer}${pre}${this.delimiter}`
  }

  skipPastEscapedDelimiter (pre) {
    this.buffer = `${this.buffer}${pre.slice(0, -1)}${this.delimiter}`
  }

  bufferHasUnclosedQuotes (append = null, q = '"') {
    let record = (append ? this.buffer + append : this.buffer).trim()
    if (record === q) return true
    if (!record.startsWith(q)) return false
    const qq = q + q
    const trailingQuote = record.endsWith(q)
    if ((trailingQuote && record.endsWith(qq)) || record.startsWith(qq)) {
      record = squeezeChar(record, q)
      return record.startsWith(q) && !record.endsWith(q)
    }
    return !trailingQuote
  }

  takeCellspec () {
    return this._cellspecs.shift() ?? null
  }

  pushCellspec (cellspec = {}) {
    this._cellspecs.push(cellspec ?? {})
  }

  keepCellOpen ()  { this._cellOpen = true }
  markCellClosed () { this._cellOpen = false }
  isCellOpen ()    { return this._cellOpen }
  isCellClosed ()  { return !this._cellOpen }

  closeOpenCell (nextCellspec = {}) {
    this.pushCellspec(nextCellspec)
    if (this.isCellOpen()) this.closeCell(true)
    this._advance()
  }

  closeCell (eol = false) {
    let cellText, cellspec, repeat

    if (this.format === 'psv') {
      cellText      = this.buffer
      this.buffer   = ''
      cellspec      = this.takeCellspec()
      if (cellspec) {
        repeat = cellspec['repeatcol'] ?? 1
        delete cellspec['repeatcol']
      } else {
        this.logger.error(this.messageWithContext('table missing leading separator; recovering automatically', {
          source_location: Object.assign({}, this._startCursorData),
        }))
        cellspec = {}
        repeat   = 1
      }
    } else {
      cellText    = this.buffer.trim()
      this.buffer = ''
      cellspec    = null
      repeat      = 1
      if (this.format === 'csv' && cellText && cellText.includes('"')) {
        const q = '"'
        if (cellText.startsWith(q) && cellText.endsWith(q)) {
          const inner = cellText.slice(1, cellText.length - 1)
          if (inner != null) {
            cellText = squeezeChar(inner.trim(), q)
          } else {
            this.logger.error(this.messageWithContext('unclosed quote in CSV data; setting cell to empty', {
              source_location: this._reader.cursorAtPrevLine(),
            }))
            cellText = ''
          }
        } else {
          cellText = squeezeChar(cellText, '"')
        }
      }
    }

    for (let i = 1; i <= repeat; i++) {
      let column
      if (this.colcount === -1) {
        this.table.columns.push((column = new Table.Column(this.table, this.table.columns.length + i - 1)))
        if (cellspec && 'colspan' in cellspec) {
          const extraCols = parseInt(cellspec['colspan'], 10) - 1
          if (extraCols > 0) {
            const offset = this.table.columns.length
            for (let j = 0; j < extraCols; j++) {
              this.table.columns.push(new Table.Column(this.table, offset + j))
            }
          }
        }
      } else {
        column = this.table.columns[this._currentRow.length] ?? null
      }

      const cursorBeforeMark = this._reader.cursorBeforeMark()
      this._reader.mark()
      const cell = new Table.Cell(column, cellText, cellspec, { cursor: cursorBeforeMark })

      if (cell.rowspan && cell.rowspan !== 1) {
        this._activateRowspan(cell.rowspan, cell.colspan ?? 1)
      }
      this._columnVisits += (cell.colspan ?? 1)
      this._currentRow.push(cell)

      const rowStatus = this._endOfRow()
      if (rowStatus > -1 && (this.colcount !== -1 || this._linenum > 0 || (eol && i === repeat))) {
        rowStatus > 0 ? (
          this.logger.error(this.messageWithContext('dropping cell because it exceeds specified number of columns', { source_location: cursorBeforeMark })),
          this._closeRow(true)
        ) : this._closeRow()
      }
    }
    this._cellOpen = false
  }

  closeTable () {
    if (this._columnVisits === 0) return
    this.logger.error(this.messageWithContext('dropping cells from incomplete row detected end of table', {
      source_location: this._reader.cursorBeforeMark(),
    }))
  }

  // Private

  _closeRow (drop = false) {
    if (!drop) this.table.rows.body.push(this._currentRow)
    if (this.colcount === -1) this.colcount = this._columnVisits
    this._columnVisits = 0
    this._currentRow   = []
    this._activeRowspans.shift()
    this._activeRowspans[0] ??= 0
  }

  _activateRowspan (rowspan, colspan) {
    for (let i = 1; i < rowspan; i++) {
      this._activeRowspans[i] = (this._activeRowspans[i] ?? 0) + colspan
    }
  }

  _endOfRow () {
    if (this.colcount === -1) return 0
    const eff = this._columnVisits + (this._activeRowspans[0] ?? 0)
    if (eff < this.colcount) return -1
    if (eff === this.colcount) return 0
    return 1
  }

  _advance () {
    this._linenum++
  }
}

applyLogging(Table.ParserContext.prototype)
