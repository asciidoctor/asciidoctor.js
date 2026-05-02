// ESM conversion of table.rb
//
// Ruby-to-JavaScript notes:
//   - Table::Rows#[] (alias for send) → explicit bySection/head/foot/body access.
//   - Table::Cell references Document, PreprocessorReader, Parser — these are
//     imported lazily (dynamic import) to avoid circular dependency issues.
//   - String#squeeze(ch) → replaceAll(ch+ch, ch) loop (only used for '"').
//   - Number#truncate(precision) → Math.trunc(n * 10^p) / 10^p.
//   - :asciidoc / :literal / :header symbols → strings 'asciidoc', 'literal', 'header'.

import { AbstractBlock } from './abstract_block.js'
import { AbstractNode } from './abstract_node.js'
import { Inline } from './inline.js'
import { applyLogging } from './logging.js'
import { LF, ATTR_REF_HEAD, BASIC_SUBS, NORMAL_SUBS } from './constants.js'
import { BlankLineRx, LeadingInlineAnchorRx } from './rx.js'

/**
 * Truncate a float to `precision` decimal places (like Ruby's Float#truncate).
 * @param {number} value
 * @param {number} precision
 * @returns {number}
 * @internal
 */
function truncate(value, precision) {
  const factor = 10 ** precision
  return Math.trunc(value * factor) / factor
}

/**
 * Collapse consecutive identical characters (like Ruby's String#squeeze(q)).
 * @param {string} str
 * @param {string} ch
 * @returns {string}
 * @internal
 */
function squeezeChar(str, ch) {
  const double = ch + ch
  while (str.includes(double)) str = str.replaceAll(double, ch)
  return str
}

const DEFAULT_PRECISION = 4

// ── Table ─────────────────────────────────────────────────────────────────────

export class Table extends AbstractBlock {
  constructor(parent, attributes) {
    super(parent, 'table')
    this.rows = new Table.Rows()
    this.columns = []
    this.hasHeaderOption = false

    // Resolve tablepcwidth from 'width' attribute
    let pcwidthIntval = 100
    const pcwidth = attributes.width
    if (pcwidth != null) {
      let v = parseInt(pcwidth, 10)
      if (Number.isNaN(v)) v = 0
      if (v > 100 || v < 1) {
        if (!(v === 0 && (pcwidth === '0' || pcwidth === '0%'))) v = 100
      }
      pcwidthIntval = v
    }
    this.attributes.tablepcwidth = pcwidthIntval

    const pagewidthAttr = this.document.attributes.pagewidth
    if (pagewidthAttr != null) {
      const abswidthVal = truncate(
        (pcwidthIntval / 100.0) * parseFloat(pagewidthAttr),
        DEFAULT_PRECISION
      )
      this.attributes.tableabswidth =
        abswidthVal === Math.trunc(abswidthVal)
          ? Math.trunc(abswidthVal)
          : abswidthVal
    }

    if ('rotate-option' in attributes) this.attributes.orientation = 'landscape'
  }

  /**
   * Returns the header option state if the row being processed is the header row, otherwise false.
   * @returns {boolean|string}
   * @internal
   */
  headerRow() {
    const val = this.hasHeaderOption
    return val && this.rows.body.length === 0 ? val : false
  }

  /**
   * Create Column objects from the column test array.
   * @param {Object[]} colspecs
   * @internal
   */
  createColumns(colspecs) {
    const cols = []
    let autowidthCols = null
    let widthBase = 0
    for (const colspec of colspecs) {
      const colwidth = colspec.width
      cols.push(new Table.Column(this, cols.length, colspec))
      if (colwidth < 0) {
        ;(autowidthCols ??= []).push(cols[cols.length - 1])
      } else {
        widthBase += colwidth
      }
    }
    this.columns = cols
    const numCols = cols.length
    if (numCols > 0) {
      this.attributes.colcount = numCols
      const effectiveWidthBase =
        widthBase > 0 || autowidthCols ? widthBase : null
      this.assignColumnWidths(effectiveWidthBase, autowidthCols)
    }
  }

  /**
   * Assign percentage (and absolute) widths to all columns.
   * @param {number|null} [widthBase=null]
   * @param {Table.Column[]|null} [autowidthCols=null]
   * @internal
   */
  assignColumnWidths(widthBase = null, autowidthCols = null) {
    const precision = DEFAULT_PRECISION
    let totalWidth = 0
    let colPcwidth = 0

    if (widthBase != null) {
      if (autowidthCols) {
        let autowidth
        if (widthBase > 100) {
          autowidth = 0
          this.logger.warn(
            `total column width must not exceed 100% when using autowidth columns; got ${widthBase}%`
          )
        } else {
          autowidth = truncate(
            (100.0 - widthBase) / autowidthCols.length,
            precision
          )
          if (Math.trunc(autowidth) === autowidth)
            autowidth = Math.trunc(autowidth)
          widthBase = 100
        }
        const autowAttrs = { width: autowidth, 'autowidth-option': '' }
        for (const col of autowidthCols) col.updateAttributes(autowAttrs)
      }
      for (const col of this.columns) {
        totalWidth += colPcwidth = col.assignWidth(null, widthBase, precision)
      }
    } else {
      colPcwidth = truncate(100.0 / this.columns.length, precision)
      if (Math.trunc(colPcwidth) === colPcwidth)
        colPcwidth = Math.trunc(colPcwidth)
      for (const col of this.columns) {
        totalWidth += col.assignWidth(colPcwidth, null, precision)
      }
    }

    // Donate balance to the last column (half-up rounding)
    if (totalWidth !== 100) {
      const balance = +(100 - totalWidth + colPcwidth).toFixed(precision)
      this.columns[this.columns.length - 1].assignWidth(
        balance,
        null,
        precision
      )
    }
  }

  /**
   * Partition rows into header, footer, and body.
   * @param {Object} attrs
   * @internal
   */
  async partitionHeaderFooter(attrs) {
    const body = this.rows.body
    let numBodyRows = (this.attributes.rowcount = body.length)

    if (numBodyRows > 0) {
      if (this.hasHeaderOption === true) {
        this.rows.head = [
          await Promise.all(
            body.shift().map((cell) => cell.reinitialize(true))
          ),
        ]
        numBodyRows--
      } else if (this.hasHeaderOption === null) {
        this.hasHeaderOption = false
        body.unshift(
          await Promise.all(
            body.shift().map((cell) => cell.reinitialize(false))
          )
        )
      }
    }

    if (numBodyRows > 0 && 'footer-option' in attrs) {
      this.rows.foot = [body.pop()]
    }
  }
}

// ── Table.Rows ────────────────────────────────────────────────────────────────

Table.Rows = class Rows {
  constructor(head = [], foot = [], body = []) {
    this.head = head
    this.foot = foot
    this.body = body
  }

  /**
   * Retrieve the rows grouped by section as a nested Array.
   * @returns {Array<[string, Array]>}
   */
  bySection() {
    return [
      ['head', this.head],
      ['body', this.body],
      ['foot', this.foot],
    ]
  }

  toObject() {
    return { head: this.head, body: this.body, foot: this.foot }
  }
}

// ── Table.Column ──────────────────────────────────────────────────────────────

Table.Column = class Column extends AbstractNode {
  constructor(table, index, attributes = {}) {
    super(table, 'table_column')
    this.style = attributes.style ?? null
    attributes.colnumber = index + 1
    if (!('width' in attributes)) attributes.width = 1
    if (!('halign' in attributes)) attributes.halign = 'left'
    if (!('valign' in attributes)) attributes.valign = 'top'
    this.updateAttributes(attributes)
  }

  /** Alias for parent (always a Table). */
  get table() {
    return this.getParent()
  }

  /**
   * Calculate and assign the widths for this column.
   * @param {number|null} colPcwidth
   * @param {number|null} widthBase
   * @param {number} precision
   * @returns {number} The resolved colpcwidth value.
   * @internal
   */
  assignWidth(colPcwidth, widthBase, precision) {
    if (widthBase != null) {
      colPcwidth = truncate(
        (parseFloat(this.attributes.width) * 100.0) / widthBase,
        precision
      )
      if (Math.trunc(colPcwidth) === colPcwidth)
        colPcwidth = Math.trunc(colPcwidth)
    }
    const tableAbswidth = this.getParent().attributes.tableabswidth
    if (tableAbswidth != null) {
      const colAbswidth = truncate(
        (colPcwidth / 100.0) * tableAbswidth,
        precision
      )
      this.attributes.colabswidth =
        colAbswidth === Math.trunc(colAbswidth)
          ? Math.trunc(colAbswidth)
          : colAbswidth
    }
    this.attributes.colpcwidth = colPcwidth
    return colPcwidth
  }

  isBlock() {
    return false
  }
  isInline() {
    return false
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Get the parent table of this column.
   * @returns {Table}
   */
  getTable() {
    return this.table
  }
}

// ── Table.Cell ────────────────────────────────────────────────────────────────

/** @extends {AbstractBlock<string | string[]>} */
class Cell extends AbstractBlock {
  static get DOUBLE_LF() {
    return LF + LF
  }

  /** @internal */
  _reinitializeArgs

  /** @internal */
  _innerDocSetup

  /** @internal */
  _subs

  /** @internal */
  _text

  /** @internal */
  _cellbgcolor

  /** @internal */
  _convertedText

  constructor(column, cellText, attributes = {}, opts = {}) {
    super(column, 'table_cell')
    this._cursor = null
    this._reinitializeArgs = null
    if (this.document.sourcemap && opts.cursor) {
      this.sourceLocation = Object.assign({}, opts.cursor)
    }

    let cellStyle = null
    let inHeaderRow = false
    let asciidoc = false
    let literal = false
    let normalPsv = false
    let innerDocumentCursor = null

    if (column) {
      inHeaderRow = column.table.headerRow()
      if (inHeaderRow) {
        if (inHeaderRow === 'implicit') {
          const cs = column.style ?? attributes?.style
          if (cs === 'asciidoc' || cs === 'literal') {
            this._reinitializeArgs = [
              column,
              cellText,
              attributes && { ...attributes },
              opts,
            ]
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
        this.colspan = attributes.colspan
          ? parseInt(attributes.colspan, 10)
          : null
        this.rowspan = attributes.rowspan
          ? parseInt(attributes.rowspan, 10)
          : null
        delete attributes.colspan
        delete attributes.rowspan
        if (!inHeaderRow) cellStyle = attributes.style ?? cellStyle
        this.updateAttributes(attributes)
      }

      switch (cellStyle) {
        case 'asciidoc': {
          asciidoc = true
          innerDocumentCursor = opts.cursor
          cellText = cellText.trimEnd()
          if (cellText.startsWith(LF)) {
            let linesAdvanced = 0
            while (cellText.startsWith(LF)) {
              cellText = cellText.slice(1)
              linesAdvanced++
            }
            if (
              innerDocumentCursor &&
              typeof innerDocumentCursor.advance === 'function'
            ) {
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
      // Store the setup data for create() to handle asynchronously.
      this._innerDocSetup = {
        lines: cellText.split(LF, -1),
        parentDoc,
        parentDoctitle: parentDoc.attributes.doctitle,
        options: {
          safe: parentDoc.safe,
          backend: parentDoc.backend,
          header_footer: false,
          parent: parentDoc,
          cursor: innerDocumentCursor,
        },
      }
      delete parentDoc.attributes.doctitle
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
    this._text = cellText
    this.style = cellStyle
  }

  /** Alias for parent (always a Column). */
  get column() {
    return this.getParent()
  }

  /**
   * Factory — create and fully initialize a Cell asynchronously.
   * For AsciiDoc cells, parses the nested document.
   *
   * NOTE: _innerContent is NOT pre-computed here. Document.convert() will call
   * _convertAsciiDocCells() after parse completes (so callouts are rewound and
   * all cross-references from the parent document are already registered).
   * @param {Table.Column} column
   * @param {string} cellText
   * @param {Object} [attributes={}]
   * @param {Object} [opts={}]
   * @returns {Promise<Table.Cell>}
   */
  static async create(column, cellText, attributes = {}, opts = {}) {
    const cell = new Table.Cell(column, cellText, attributes, opts)
    if (cell._innerDocSetup) {
      const { lines, parentDoc, parentDoctitle, options } = cell._innerDocSetup
      cell._innerDocSetup = null
      const innerDoc = await parentDoc.constructor.create(lines, options)
      if (parentDoctitle) parentDoc.attributes.doctitle = parentDoctitle
      cell._innerDocument = innerDoc
    }
    return /** @type {Table.Cell} */ cell
  }

  /** @returns {Promise<Table.Cell>} */
  async reinitialize(hasHeader) {
    if (hasHeader) {
      this._reinitializeArgs = null
    } else if (this._reinitializeArgs) {
      return Table.Cell.create(...this._reinitializeArgs)
    } else {
      this.style = this.attributes.style ?? null
    }
    if (this._cursor) this._catalogInlineAnchor()
    return /** @type {Table.Cell} */ (this)
  }

  _catalogInlineAnchor(cellText = this._text, cursor = null) {
    if (!cursor) {
      cursor = this._cursor
      this._cursor = null
    }
    if (!cellText.startsWith('[[')) return
    const m = cellText.match(LeadingInlineAnchorRx)
    if (!m) return
    const doc = this.document
    let reftext = m[2] ?? null
    if (reftext?.includes(ATTR_REF_HEAD)) reftext = doc.subAttributes(reftext)
    doc.register('refs', [
      m[1],
      new Inline(this, 'anchor', reftext, { type: 'ref', id: m[1] }),
    ])
  }

  /**
   * Get the text with substitutions applied.
   * The result is pre-computed during Document.parse() via precomputeText().
   * Falls back to the raw text if precomputeText() has not been called yet.
   * @returns {string|null}
   */
  get text() {
    return this._convertedText ?? this._text ?? null
  }

  /**
   * Pre-compute the converted text asynchronously.
   * Called during Document.parse() so the synchronous getter works during conversion.
   * @returns {Promise<void>}
   */
  async precomputeText() {
    if (this._subs && this._convertedText == null) {
      this._convertedText = await this.applySubs(this._text, this._subs)
      // Capture the cellbgcolor attribute value as set by {set:cellbgcolor:...} in cell text.
      // Since {set:...} attribute assignments happen during applySubs, and the document attribute
      // is shared state, we must capture it per-cell immediately after text processing.
      this._cellbgcolor = this.document.attributes.cellbgcolor
    }
  }

  set text(val) {
    this._text = val
    this._convertedText = null
  }

  /**
   * Get the content — converted body data.
   * For AsciiDoc cells, returns the pre-computed content (set by Document.convert()).
   * @returns {Promise<string|string[]>}
   */
  async content() {
    if (this.style === 'asciidoc') {
      return this._innerContent ?? ''
    }
    if (this._text.includes(Table.Cell.DOUBLE_LF)) {
      const parts = []
      for (const rawPara of this.text.split(BlankLineRx)) {
        const para = rawPara.trim()
        if (!para) continue
        const cs = this.style
        parts.push(
          cs && cs !== 'header'
            ? await new Inline(this.getParent(), 'quoted', para, {
                type: cs,
              }).convert()
            : para
        )
      }
      return parts
    }
    const subbedText = this.text
    if (!subbedText) return []
    const cs = this.style
    if (cs && cs !== 'header') {
      return [
        await new Inline(this.getParent(), 'quoted', subbedText, {
          type: cs,
        }).convert(),
      ]
    }
    return [subbedText]
  }

  lines() {
    return this._text.split(LF)
  }
  source() {
    return this._text
  }

  get innerDocument() {
    return this._innerDocument ?? null
  }

  get file() {
    return this.sourceLocation?.file ?? null
  }
  get lineno() {
    return this.sourceLocation?.lineno ?? null
  }

  toString() {
    return `${super.toString()} - [text: ${this._text}, colspan: ${this.colspan ?? 1}, rowspan: ${this.rowspan ?? 1}, attributes: ${JSON.stringify(this.attributes)}]`
  }

  // ── JavaScript-style accessors ────────────────────────────────────────────────

  /**
   * Get the text with substitutions applied.
   * @returns {string|null}
   */
  getText() {
    return this.text
  }

  /**
   * Set the raw text of this cell.
   * @param {string|null} val
   */
  setText(val) {
    this.text = val
  }

  /**
   * Get the inner document for AsciiDoc-style cells.
   * @returns {Document|null}
   */
  getInnerDocument() {
    return this.innerDocument
  }

  /**
   * Get the source file where this cell is defined.
   * @returns {string|null}
   */
  getFile() {
    return this.file
  }

  /**
   * Get the source line number where this cell is defined.
   * @returns {number|null}
   */
  getLineNumber() {
    return this.lineno
  }
}
Table.Cell = Cell

// ── Table.ParserContext ───────────────────────────────────────────────────────

Table.ParserContext = class ParserContext {
  static get FORMATS() {
    return new Set(['psv', 'csv', 'dsv', 'tsv'])
  }

  static get DELIMITERS() {
    return {
      psv: ['|', /\|/],
      csv: [',', /,/],
      dsv: [':', /:/],
      tsv: ['\t', /\t/],
      '!sv': ['!', /!/],
    }
  }

  constructor(reader, table, attributes = {}) {
    this._reader = reader
    this._startCursor = reader.cursor
    reader.mark()
    this.table = table
    this.buffer = ''

    // Determine format
    let xsv
    if ('format' in attributes) {
      xsv = attributes.format
      if (ParserContext.FORMATS.has(xsv)) {
        if (xsv === 'tsv') {
          this.format = 'csv'
        } else {
          this.format = xsv
          if (xsv === 'psv' && table.document.nested()) xsv = '!sv'
        }
      } else {
        this.logger.error(
          this.messageWithContext(`illegal table format: ${xsv}`, {
            source_location: reader.cursorAtPrevLine(),
          })
        )
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
      const sep = attributes.separator
      if (!sep) {
        ;[this.delimiter, this.delimiterRe] = delimiters[xsv]
      } else if (sep === '\\t') {
        ;[this.delimiter, this.delimiterRe] = delimiters.tsv
      } else {
        this.delimiter = sep
        this.delimiterRe = new RegExp(
          sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        )
      }
    } else {
      ;[this.delimiter, this.delimiterRe] = delimiters[xsv]
    }

    this.colcount = table.columns.length === 0 ? -1 : table.columns.length
    this._cellspecs = []
    this._cellOpen = false
    this._activeRowspans = [0]
    this._columnVisits = 0
    this._currentRow = []
    this._linenum = -1
  }

  startsWith(line) {
    return line.startsWith(this.delimiter)
  }

  matchDelimiter(line) {
    return line.match(this.delimiterRe)
  }

  skipPastDelimiter(pre) {
    this.buffer = `${this.buffer}${pre}${this.delimiter}`
  }

  skipPastEscapedDelimiter(pre) {
    this.buffer = `${this.buffer}${pre.slice(0, -1)}${this.delimiter}`
  }

  bufferHasUnclosedQuotesInText(text, q = '"') {
    let record = text.trim()
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

  bufferHasUnclosedQuotes(append = null, q = '"') {
    const record = (append ? this.buffer + append : this.buffer).trim()
    if (!record.startsWith(q)) return false
    // Walk the quoted field character by character (RFC 4180)
    let i = 1 // skip the opening quote
    while (i < record.length) {
      if (record[i] === q) {
        if (i + 1 < record.length && record[i + 1] === q) {
          i += 2 // escaped quote ""
        } else {
          return false // closing quote found → field is closed
        }
      } else {
        i++
      }
    }
    return true // closing quote never found
  }

  takeCellspec() {
    return this._cellspecs.shift() ?? null
  }

  pushCellspec(cellspec = {}) {
    this._cellspecs.push(cellspec ?? {})
  }

  keepCellOpen() {
    this._cellOpen = true
  }
  markCellClosed() {
    this._cellOpen = false
  }
  isCellOpen() {
    return this._cellOpen
  }
  isCellClosed() {
    return !this._cellOpen
  }

  async closeOpenCell(nextCellspec = {}) {
    this.pushCellspec(nextCellspec)
    if (this.isCellOpen()) await this.closeCell(true)
    this._advance()
  }

  async closeCell(eol = false) {
    let cellText, cellspec, repeat

    if (this.format === 'psv') {
      cellText = this.buffer
      this.buffer = ''
      cellspec = this.takeCellspec()
      if (cellspec) {
        repeat = cellspec.repeatcol ?? 1
        delete cellspec.repeatcol
      } else {
        this.logger.error(
          this.messageWithContext(
            'table missing leading separator; recovering automatically',
            {
              source_location: this._startCursor,
            }
          )
        )
        cellspec = {}
        repeat = 1
      }
    } else {
      cellText = this.buffer.trim()
      this.buffer = ''
      cellspec = null
      repeat = 1
      if (this.format === 'csv' && cellText && cellText.includes('"')) {
        const q = '"'
        if (cellText.startsWith(q)) {
          if (
            cellText.length > 1 &&
            cellText.endsWith(q) &&
            !this.bufferHasUnclosedQuotesInText(cellText, q)
          ) {
            const inner = cellText.slice(1, cellText.length - 1)
            cellText = squeezeChar(inner.trim(), q)
          } else {
            this.logger.error(
              this.messageWithContext(
                'unclosed quote in CSV data; setting cell to empty',
                {
                  source_location: this._reader.cursorAtPrevLine(),
                }
              )
            )
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
        this.table.columns.push(
          (column = new Table.Column(
            this.table,
            this.table.columns.length + i - 1
          ))
        )
        if (cellspec && 'colspan' in cellspec) {
          const extraCols = parseInt(cellspec.colspan, 10) - 1
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
      const cell = await Table.Cell.create(column, cellText, cellspec, {
        cursor: cursorBeforeMark,
      })

      if (cell.rowspan && cell.rowspan !== 1) {
        this._activateRowspan(cell.rowspan, cell.colspan ?? 1)
      }
      this._columnVisits += cell.colspan ?? 1
      this._currentRow.push(cell)

      const rowStatus = this._endOfRow()
      if (
        rowStatus > -1 &&
        (this.colcount !== -1 || this._linenum > 0 || (eol && i === repeat))
      ) {
        if (rowStatus > 0) {
          this.logger.error(
            this.messageWithContext(
              'dropping cell because it exceeds specified number of columns',
              { source_location: cursorBeforeMark }
            )
          )
          this._closeRow(true)
        } else {
          this._closeRow()
        }
      }
    }
    this._cellOpen = false
  }

  closeTable() {
    if (this._columnVisits === 0) return
    this.logger.error(
      this.messageWithContext(
        'dropping cells from incomplete row detected end of table',
        {
          source_location: this._reader.cursorBeforeMark(),
        }
      )
    )
  }

  /**
   * @param {boolean} [drop=false]
   * @internal
   */
  _closeRow(drop = false) {
    if (!drop) this.table.rows.body.push(this._currentRow)
    if (this.colcount === -1) this.colcount = this._columnVisits
    this._columnVisits = 0
    this._currentRow = []
    this._activeRowspans.shift()
    this._activeRowspans[0] ??= 0
  }

  _activateRowspan(rowspan, colspan) {
    for (let i = 1; i < rowspan; i++) {
      this._activeRowspans[i] = (this._activeRowspans[i] ?? 0) + colspan
    }
  }

  _endOfRow() {
    if (this.colcount === -1) return 0
    const eff = this._columnVisits + (this._activeRowspans[0] ?? 0)
    if (eff < this.colcount) return -1
    if (eff === this.colcount) return 0
    return 1
  }

  _advance() {
    this._linenum++
  }
}

applyLogging(Table.ParserContext.prototype)
