// ESM conversion of parser.rb
//
// Ruby-to-JavaScript notes:
//   - All methods are static on the Parser class (Ruby class methods).
//   - Ruby Struct BlockMatchData → plain object { context, masq, tip, terminator }.
//   - Ruby's regex captures ($1, $2, …) → JS match array m[1], m[2], …
//   - Ruby .nil_or_empty? → !val (or val == null || val === '')
//   - Ruby .to_i → parseInt(val, 10) (returns 0 for nil/non-numeric)
//   - ListContinuationMarker module → Symbol used for identity checks.
//   - Logging mixin applied via applyLogging().

import { applyLogging } from './logging.js'
import { Block } from './block.js'
import { Section } from './section.js'
import { List, ListItem } from './list.js'
import { Table } from './table.js'
import { Inline } from './inline.js'
import { AttributeList } from './attribute_list.js'
import { AttributeEntry, _deps } from './document.js'
import { Compliance } from './compliance.js'
import { basename, intToRoman, romanToInt } from './helpers.js'
import {
  ADMONITION_STYLES,
  ADMONITION_STYLE_HEADS,
  PARAGRAPH_STYLES,
  VERBATIM_STYLES,
  DELIMITED_BLOCKS,
  DELIMITED_BLOCK_HEADS,
  DELIMITED_BLOCK_TAILS,
  SETEXT_SECTION_LEVELS,
  LAYOUT_BREAK_CHARS,
  HYBRID_LAYOUT_BREAK_CHARS,
  MARKDOWN_THEMATIC_BREAK_CHARS,
  NESTABLE_LIST_CONTEXTS,
  ORDERED_LIST_STYLES,
  CAPTION_ATTRIBUTE_NAMES,
  STEM_TYPE_ALIASES,
  ATTR_REF_HEAD,
  LIST_CONTINUATION,
  LINE_CONTINUATION,
  LINE_CONTINUATION_LEGACY,
  LF,
} from './constants.js'
import {
  BlockAnchorRx,
  BlockAttributeLineRx,
  BlockAttributeListRx,
  BlockTitleRx,
  AtxSectionTitleRx,
  ExtAtxSectionTitleRx,
  SetextSectionTitleRx,
  SectionLevelStyleRx,
  InlineSectionAnchorRx,
  InlineAnchorScanRx,
  ManpageTitleVolnumRx,
  ManpageNamePurposeRx,
  AnyListRx,
  UnorderedListRx,
  OrderedListRx,
  DescriptionListRx,
  DescriptionListSiblingRx,
  CalloutListRx,
  CalloutScanRx,
  InlineBiblioAnchorRx,
  AdmonitionParagraphRx,
  BlockMediaMacroRx,
  BlockTocMacroRx,
  CustomBlockMacroRx,
  ColumnSpecRx,
  CellSpecStartRx,
  CellSpecEndRx,
  AuthorInfoLineRx,
  AuthorDelimiterRx,
  RevisionInfoLineRx,
  AttributeEntryRx,
  MarkdownThematicBreakRx,
  ExtLayoutBreakRx,
  LiteralParagraphRx,
  InvalidAttributeNameCharsRx,
  ListRxMap,
  OrderedListMarkerRxMap,
  LeadingInlineAnchorRx,
  XmlSanitizeRx,
  AttributeEntryPassMacroRx,
} from './rx.js'

// ── List continuation identity marker ────────────────────────────────────────
// Used to distinguish list continuation placeholders from regular strings.
const LIST_CONTINUATION_SYM = Symbol('ListContinuation')

function isListContinuation(v) {
  return v != null && v[LIST_CONTINUATION_SYM] === true
}

function makeListContinuationPlaceholder() {
  const s = new String('') // eslint-disable-line no-new-wrappers
  s[LIST_CONTINUATION_SYM] = true
  return s
}

function makeListContinuationString() {
  const s = new String(LIST_CONTINUATION) // eslint-disable-line no-new-wrappers
  s[LIST_CONTINUATION_SYM] = true
  return s
}

const ListContinuationPlaceholder = makeListContinuationPlaceholder()
const ListContinuationString = makeListContinuationString()

// Author attribute keys
const AuthorKeys = new Set([
  'author',
  'authorinitials',
  'firstname',
  'middlename',
  'lastname',
  'email',
])

// Cell alignment and style maps
const TableCellHorzAlignments = { '<': 'left', '>': 'right', '^': 'center' }
const TableCellVertAlignments = { '<': 'top', '>': 'bottom', '^': 'middle' }
const TableCellStyles = {
  d: 'none',
  s: 'strong',
  e: 'emphasis',
  m: 'monospaced',
  h: 'header',
  l: 'literal',
  a: 'asciidoc',
}

// ── Parser ────────────────────────────────────────────────────────────────────

export class Parser {
  // Prevent instantiation
  constructor() {
    throw new Error('Parser cannot be instantiated')
  }

  /**
   * Parse AsciiDoc source from reader into document.
   * @param {Reader} reader
   * @param {Document} document
   * @param {{header_only?: boolean}} [options={}]
   * @returns {Promise<Document>}
   */
  static async parse(reader, document, options = {}) {
    const headerOnly = options.header_only ?? false
    let blockAttributes = await Parser.parseDocumentHeader(
      reader,
      document,
      headerOnly
    )

    if (!headerOnly) {
      while (await reader.hasMoreLines()) {
        const [newSection, attrs] = await Parser.nextSection(
          reader,
          document,
          blockAttributes
        )
        blockAttributes = attrs
        if (newSection) {
          document.assignNumeral(newSection)
          document.blocks.push(newSection)
        }
      }
    }
    return document
  }

  /**
   * Parse the document header.
   * @param {Reader} reader
   * @param {Document} document
   * @param {boolean} [headerOnly=false]
   * @returns {Promise<Object>} Block attributes after the header.
   */
  static async parseDocumentHeader(reader, document, headerOnly = false) {
    let blockAttrs =
      (await reader.skipBlankLines()) != null
        ? await Parser.parseBlockMetadataLines(reader, document)
        : {}
    const docAttrs = document.attributes

    const implicitDoctitle = await Parser.isNextLineDoctitle(
      reader,
      blockAttrs,
      docAttrs.leveloffset
    )
    if (implicitDoctitle && (blockAttrs.title || blockAttrs.style)) {
      docAttrs.authorcount = 0
      return document.finalizeHeader(blockAttrs, false)
    }

    let doctitleAttrVal = null
    const existingDoctitle = docAttrs.doctitle
    if (existingDoctitle && existingDoctitle !== '') {
      document.title = doctitleAttrVal = existingDoctitle
    }

    if (implicitDoctitle) {
      const sourceLocation = document.sourcemap ? reader.cursor : null
      const [_sectId, , l0SectionTitle, , atx] = await Parser.parseSectionTitle(
        reader,
        document
      )
      let finalSectTitle = l0SectionTitle

      if (doctitleAttrVal) {
        finalSectTitle = null
      } else {
        document.title = finalSectTitle
        let sanitized = document.subSpecialchars(finalSectTitle)
        if (sanitized.includes(ATTR_REF_HEAD)) {
          sanitized = document.subAttributes(sanitized, {
            attribute_missing: 'skip',
          })
        }
        docAttrs.doctitle = doctitleAttrVal = sanitized
      }

      if (sourceLocation && document.header) {
        document.header.sourceLocation = sourceLocation
      }

      if (!atx && !document.isAttributeLocked('compat-mode')) {
        docAttrs['compat-mode'] = ''
      }
      if (
        blockAttrs.separator &&
        !document.isAttributeLocked('title-separator')
      ) {
        docAttrs['title-separator'] = blockAttrs.separator
      }
      const docId = blockAttrs.id
      if (docId) {
        document.id = docId
      }
      if (blockAttrs.role) docAttrs.role = blockAttrs.role
      if (blockAttrs.reftext) docAttrs.reftext = blockAttrs.reftext
      blockAttrs = {}

      const modifiedAttrs = document._attributesModified
      modifiedAttrs.delete('doctitle')
      await Parser.parseHeaderMetadata(reader, document, null)

      if (modifiedAttrs.has('doctitle')) {
        const val = docAttrs.doctitle
        if (!val || val === '' || val === doctitleAttrVal) {
          docAttrs.doctitle = doctitleAttrVal
        } else {
          document.title = val
        }
      } else if (!finalSectTitle) {
        modifiedAttrs.add('doctitle')
      }

      if (docId) document.register('refs', [docId, document])
    } else if (docAttrs.author) {
      const authorMeta = Parser.processAuthors(docAttrs.author, true, false)
      if (docAttrs.authorinitials) delete authorMeta.authorinitials
      Object.assign(docAttrs, authorMeta)
    } else if (docAttrs.authors) {
      const authorMeta = Parser.processAuthors(docAttrs.authors, true)
      Object.assign(docAttrs, authorMeta)
    } else {
      docAttrs.authorcount = 0
    }

    if (document.doctype === 'manpage') {
      await Parser.parseManpageHeader(reader, document, blockAttrs, headerOnly)
    }

    return document.finalizeHeader(blockAttrs)
  }

  /**
   * Parse manpage header.
   * @param {Reader} reader
   * @param {Document} document
   * @param {Object} blockAttributes
   * @param {boolean} [headerOnly=false]
   * @returns {Promise<void>}
   */
  static async parseManpageHeader(
    reader,
    document,
    blockAttributes,
    headerOnly = false
  ) {
    const docAttrs = document.attributes
    const doctitle = docAttrs.doctitle || ''
    const m = doctitle.match(ManpageTitleVolnumRx)
    let manvolnum
    if (m) {
      manvolnum = docAttrs.manvolnum = m[2]
      let mantitle = m[1]
      if (mantitle.includes(ATTR_REF_HEAD))
        mantitle = document.subAttributes(mantitle)
      docAttrs.mantitle = mantitle.toLowerCase()
    } else {
      Parser.logger.error(
        Parser.messageWithContext('non-conforming manpage title', {
          source_location: reader.cursorAtLine(1),
        })
      )
      docAttrs.mantitle = doctitle || docAttrs.docname || 'command'
      manvolnum = docAttrs.manvolnum = '1'
    }

    const manname = docAttrs.manname
    if (manname && docAttrs.manpurpose) {
      docAttrs['manname-title'] ??= 'Name'
      docAttrs.mannames = [manname]
      if (document.backend === 'manpage') {
        docAttrs.docname = manname
        docAttrs.outfilesuffix = `.${manvolnum}`
      }
    } else if (headerOnly) {
      // done
    } else {
      await reader.skipBlankLines()
      reader.save()
      Object.assign(
        blockAttributes,
        await Parser.parseBlockMetadataLines(reader, document)
      )
      const nameSectionLevel = await Parser.isNextLineSection(reader, {})
      if (nameSectionLevel !== null && nameSectionLevel !== undefined) {
        if (nameSectionLevel === 1) {
          const nameSection = await Parser.initializeSection(
            reader,
            document,
            {}
          )
          const buffer = (
            await reader.readLinesUntil({
              break_on_blank_lines: true,
              skip_line_comments: true,
            })
          )
            .map((l) => l.trimStart())
            .join(' ')
          const nm = buffer.match(ManpageNamePurposeRx)
          let errorMsg = null
          if (nm) {
            let mname = nm[1]
            if (mname.includes(ATTR_REF_HEAD))
              mname = document.subAttributes(mname)
            let mannames
            if (mname.includes(',')) {
              mannames = mname.split(',').map((n) => n.trimStart())
              mname = mannames[0]
            } else {
              mannames = [mname]
            }
            let manpurpose = nm[2]
            if (manpurpose.includes(ATTR_REF_HEAD))
              manpurpose = document.subAttributes(manpurpose)
            docAttrs['manname-title'] ??= nameSection.title
            if (nameSection.id) docAttrs['manname-id'] = nameSection.id
            docAttrs.manname = mname
            docAttrs.mannames = mannames
            docAttrs.manpurpose = manpurpose
            if (document.backend === 'manpage') {
              docAttrs.docname = mname
              docAttrs.outfilesuffix = `.${manvolnum}`
            }
          } else {
            errorMsg = 'non-conforming name section body'
          }
          if (errorMsg) {
            reader.restoreSave()
            Parser.logger.error(
              Parser.messageWithContext(errorMsg, {
                source_location: reader.cursor,
              })
            )
            const mn = docAttrs.docname || 'command'
            docAttrs.manname = mn
            docAttrs.mannames = [mn]
            if (document.backend === 'manpage') {
              docAttrs.docname = mn
              docAttrs.outfilesuffix = `.${manvolnum}`
            }
          } else {
            reader.discardSave()
          }
        } else {
          reader.restoreSave()
          Parser.logger.error(
            Parser.messageWithContext('name section must be at level 1', {
              source_location: reader.cursor,
            })
          )
        }
      } else {
        reader.restoreSave()
        Parser.logger.error(
          Parser.messageWithContext('name section expected', {
            source_location: reader.cursor,
          })
        )
        const mn = docAttrs.docname || 'command'
        docAttrs.manname = mn
        docAttrs.mannames = [mn]
        if (document.backend === 'manpage') {
          docAttrs.docname = mn
          docAttrs.outfilesuffix = `.${manvolnum}`
        }
      }
    }
  }

  /**
   * Return the next section from the reader.
   * @param {Reader} reader
   * @param {Document|Section} parent
   * @param {Object} [attributes={}]
   * @returns {Promise<[Section|null, Object]>} Tuple of the new section (or null) and orphaned attributes.
   */
  static async nextSection(reader, parent, attributes = {}) {
    let preamble = null,
      intro = null,
      part = false

    const parentIsDocument = parent.context === 'document'
    let section, currentLevel, expectedNextLevel, expectedNextLevelAlt
    let book, document

    if (
      parentIsDocument &&
      parent.blocks.length === 0 &&
      (parent.hasHeader() ||
        ('invalid-header' in attributes &&
          !!attributes['invalid-header'] &&
          delete attributes['invalid-header'] !== undefined) ||
        typeof (await Parser.isNextLineSection(reader, attributes)) !==
          'number')
    ) {
      // We are at the start of document processing
      document = parent
      book = document.doctype === 'book'
      if (parent.hasHeader() || (book && attributes[1] !== 'abstract')) {
        preamble = intro = new Block(parent, 'preamble', {
          content_model: 'compound',
        })
        if (book && parent.hasAttr('preface-title')) {
          preamble.title = parent.attr('preface-title')
        }
        parent.blocks.push(preamble)
      }
      section = parent
      currentLevel = 0
      if ('fragment' in parent.attributes) {
        expectedNextLevel = -1
      } else if (book) {
        expectedNextLevel = 1
        expectedNextLevelAlt = 0
      } else {
        expectedNextLevel = 1
      }
    } else {
      document = parent.document
      book = document.doctype === 'book'
      section = await Parser.initializeSection(reader, parent, attributes)
      const title = attributes.title
      attributes = title ? { title } : {}
      currentLevel = section.level
      expectedNextLevel = currentLevel + 1
      if (currentLevel === 0) {
        part = book
      } else if (currentLevel === 1 && section.special) {
        const sn = section.sectname
        if (sn !== 'appendix' && sn !== 'preface' && sn !== 'abstract') {
          expectedNextLevel = null
        }
      }
    }

    await reader.skipBlankLines()

    while (await reader.hasMoreLines()) {
      await Parser.parseBlockMetadataLines(reader, document, attributes)
      let nextLevel = await Parser.isNextLineSection(reader, attributes)

      if (
        nextLevel !== null &&
        nextLevel !== undefined &&
        nextLevel !== false
      ) {
        const leveloffset = document.attr('leveloffset')
        if (leveloffset) {
          nextLevel += parseInt(leveloffset, 10)
          if (nextLevel < 0) nextLevel = 0
        }

        if (nextLevel > currentLevel) {
          if (expectedNextLevel != null) {
            if (
              nextLevel !== expectedNextLevel &&
              !(
                expectedNextLevelAlt != null &&
                nextLevel === expectedNextLevelAlt
              ) &&
              expectedNextLevel >= 0
            ) {
              const expectedCondition =
                expectedNextLevelAlt != null
                  ? `expected levels ${expectedNextLevelAlt} or ${expectedNextLevel}`
                  : `expected level ${expectedNextLevel}`
              Parser.logger.warn(
                Parser.messageWithContext(
                  `section title out of sequence: ${expectedCondition}, got level ${nextLevel}`,
                  { source_location: reader.cursor }
                )
              )
            }
          } else {
            Parser.logger.error(
              Parser.messageWithContext(
                `${section.sectname} sections do not support nested sections`,
                { source_location: reader.cursor }
              )
            )
          }
          const [newSection, attrs] = await Parser.nextSection(
            reader,
            section,
            attributes
          )
          attributes = attrs
          section.assignNumeral(newSection)
          section.blocks.push(newSection)
        } else if (nextLevel === 0 && section === document) {
          if (!book) {
            Parser.logger.error(
              Parser.messageWithContext(
                'level 0 sections can only be used when doctype is book',
                { source_location: reader.cursor }
              )
            )
          }
          const [newSection, attrs] = await Parser.nextSection(
            reader,
            section,
            attributes
          )
          attributes = attrs
          section.assignNumeral(newSection)
          section.blocks.push(newSection)
        } else {
          break
        }
      } else {
        const blockCursor = reader.cursor
        const newBlock = await Parser.nextBlock(
          reader,
          intro ?? section,
          attributes,
          { parse_metadata: false }
        )
        if (newBlock) {
          if (part) {
            if (!section.hasBlocks()) {
              if (newBlock.style !== 'partintro') {
                if (newBlock.style === 'open' && newBlock.context === 'open') {
                  newBlock.style = 'partintro'
                } else {
                  newBlock.parent = intro = new Block(section, 'open', {
                    content_model: 'compound',
                  })
                  intro.style = 'partintro'
                  section.blocks.push(intro)
                }
              } else if (newBlock.contentModel === 'simple') {
                newBlock.contentModel = 'compound'
                newBlock.append(
                  new Block(newBlock, 'paragraph', {
                    source: newBlock.lines,
                    subs: newBlock.subs,
                  })
                )
                newBlock.lines.length = 0
                newBlock.subs.length = 0
              }
            } else if (section.blocks.length === 1) {
              const firstBlock = section.blocks[0]
              if (!intro && firstBlock.contentModel === 'compound') {
                Parser.logger.error(
                  Parser.messageWithContext(
                    'illegal block content outside of partintro block',
                    { source_location: blockCursor }
                  )
                )
              } else if (firstBlock.contentModel !== 'compound') {
                newBlock.parent = intro = new Block(section, 'open', {
                  content_model: 'compound',
                })
                if (firstBlock.style === (intro.style = 'partintro')) {
                  firstBlock.context = 'paragraph'
                  firstBlock.style = null
                }
                section.blocks.shift()
                intro.append(firstBlock)
                section.blocks.push(intro)
              }
            }
          }
          ;(intro ?? section).blocks.push(newBlock)
          for (const key of Object.keys(attributes)) delete attributes[key]
        }
      }

      if ((await reader.skipBlankLines()) == null) break
    }

    if (part) {
      if (
        !section.hasBlocks() ||
        section.blocks[section.blocks.length - 1].context !== 'section'
      ) {
        Parser.logger.error(
          Parser.messageWithContext(
            'invalid part, must have at least one section (e.g., chapter, appendix, etc.)',
            { source_location: reader.cursor }
          )
        )
      }
    } else if (preamble) {
      if (preamble.hasBlocks()) {
        if (
          book ||
          document.blocks[1] ||
          !Compliance.unwrapStandalonePreamble
        ) {
          if (document.sourcemap)
            preamble.sourceLocation = preamble.blocks[0].sourceLocation
        } else {
          document.blocks.shift()
          while (preamble.blocks.length > 0) {
            document.append(preamble.blocks.shift())
          }
        }
      } else {
        document.blocks.shift()
      }
    }

    return [section === parent ? null : section, { ...attributes }]
  }

  /**
   * Parse and return the next Block at the Reader's current location.
   * @param {Reader} reader
   * @param {AbstractBlock} parent
   * @param {Object} [attributes={}]
   * @param {Object} [options={}]
   * @returns {Promise<Block|null>}
   */
  static async nextBlock(reader, parent, attributes = {}, options = {}) {
    const skipped = await reader.skipBlankLines()
    if (skipped == null) return null

    let textOnly = options.text_only ?? null
    if (textOnly && skipped > 0) {
      delete options.text_only
      textOnly = null
    }

    const document = parent.document
    const parseMetadata = options.parse_metadata !== false

    if (parseMetadata) {
      while (
        await Parser.parseBlockMetadataLine(
          reader,
          document,
          attributes,
          options
        )
      ) {
        await reader.readLine()
        if ((await reader.skipBlankLines()) == null) return null
      }
    }

    const extensions = document.extensions
    const blockExtensions = extensions?.hasBlocks?.()
    const blockMacroExtensions = extensions?.hasBlockMacros?.()

    reader.mark()
    const thisLine = await reader.readLine()
    if (thisLine === undefined) return null
    const docAttrs = document.attributes
    const style = attributes[1] ?? null
    let block = null,
      blockContext = null,
      cloakedContext = null,
      terminator = null

    const delimitedBlock = Parser.isDelimitedBlock(thisLine, true)
    if (delimitedBlock) {
      blockContext = cloakedContext = delimitedBlock.context
      terminator = delimitedBlock.terminator
      if (style) {
        if (style !== blockContext) {
          if (delimitedBlock.masq.has(style)) {
            blockContext = style
          } else if (
            delimitedBlock.masq.has('admonition') &&
            ADMONITION_STYLES.has(style)
          ) {
            blockContext = 'admonition'
          } else if (
            blockExtensions &&
            extensions.registeredForBlock(style, blockContext)
          ) {
            blockContext = style
          } else {
            // unknown style; revert to block context
            if (Parser.logger.isDebug())
              Parser.logger.debug(
                Parser.messageWithContext(
                  `unknown style for ${blockContext} block: ${style}`,
                  { source_location: reader.cursor }
                )
              )
          }
        }
      } else {
        attributes.style = blockContext
      }
    }

    if (!delimitedBlock) {
      // Processed once (break used for flow control)
      do {
        // Verbatim style shortcut
        if (
          style &&
          Compliance.strictVerbatimParagraphs &&
          VERBATIM_STYLES.has(style)
        ) {
          blockContext = style
          cloakedContext = 'paragraph'
          reader.unshiftLine(thisLine)
          break
        }

        let indented, ch0
        const mdSyntax = Compliance.markdownSyntax

        if (thisLine.startsWith(' ')) {
          indented = true
          ch0 = ' '
          if (mdSyntax) {
            const stripped = thisLine.trimStart()
            const firstChar = stripped[0]
            if (
              MARKDOWN_THEMATIC_BREAK_CHARS[firstChar] &&
              MarkdownThematicBreakRx.test(thisLine)
            ) {
              block = new Block(parent, 'thematic_break', {
                content_model: 'empty',
              })
              break
            }
          }
        } else if (thisLine.startsWith('\t')) {
          indented = true
          ch0 = '\t'
        } else {
          indented = false
          ch0 = thisLine[0]
          const layoutBreakChars = mdSyntax
            ? HYBRID_LAYOUT_BREAK_CHARS
            : LAYOUT_BREAK_CHARS

          if (!textOnly && layoutBreakChars[ch0]) {
            const ll = thisLine.length
            if (
              mdSyntax
                ? ExtLayoutBreakRx.test(thisLine)
                : _uniform(thisLine, ch0, ll) && ll > 2
            ) {
              block = new Block(parent, layoutBreakChars[ch0], {
                content_model: 'empty',
              })
              break
            }
          }

          if (thisLine.endsWith(']') && thisLine.includes('::')) {
            // Block macro check
            if (
              ch0 === 'i' ||
              thisLine.startsWith('video:') ||
              thisLine.startsWith('audio:')
            ) {
              const mm = thisLine.match(BlockMediaMacroRx)
              if (mm) {
                const [, blkCtxStr, target0, blkAttrsStr] = mm
                const blkCtx = blkCtxStr
                block = new Block(parent, blkCtx, { content_model: 'empty' })
                let target = target0
                if (blkAttrsStr) {
                  let posattrs = []
                  if (blkCtx === 'video')
                    posattrs = ['poster', 'width', 'height']
                  else if (blkCtx === 'image')
                    posattrs = ['alt', 'width', 'height']
                  await block.parseAttributes(blkAttrsStr, posattrs, {
                    sub_input: true,
                    into: attributes,
                  })
                }
                delete attributes.style
                if (target.includes(ATTR_REF_HEAD)) {
                  const expanded = block.subAttributes(target, {
                    returnDropSentinel: true,
                  })
                  if (expanded === null) {
                    // A missing attribute triggered drop-line; blank attributes (e.g. {blank})
                    // that resolve to '' are kept (expanded !== null for those).
                    for (const k of Object.keys(attributes))
                      delete attributes[k]
                    return null
                  }
                  target = expanded
                }
                if (blkCtx === 'image') {
                  document.register('images', target)
                  attributes.imagesdir ??= docAttrs.imagesdir
                  attributes.alt ??=
                    style ??
                    (attributes['default-alt'] = basename(target, true).replace(
                      /[_-]/g,
                      ' '
                    ))
                  let scaledwidth = attributes.scaledwidth
                  if (scaledwidth) {
                    delete attributes.scaledwidth
                    if (!scaledwidth.match(/\D/)) scaledwidth += '%'
                    attributes.scaledwidth = scaledwidth
                  }
                  if (attributes.title) {
                    block.title = attributes.title
                    delete attributes.title
                    block.assignCaption(attributes.caption, 'figure')
                    delete attributes.caption
                  }
                }
                attributes.target = target
                break
              }
            }

            if (ch0 === 't' && thisLine.startsWith('toc:')) {
              const tocm = thisLine.match(BlockTocMacroRx)
              if (tocm) {
                block = new Block(parent, 'toc', { content_model: 'empty' })
                if (tocm[1])
                  await block.parseAttributes(tocm[1], [], {
                    sub_input: true,
                    into: attributes,
                  })
                break
              }
            }

            if (blockMacroExtensions) {
              const cbm = thisLine.match(CustomBlockMacroRx)
              if (cbm) {
                const extension = extensions.registeredForBlockMacro(cbm[1])
                if (extension) {
                  let target = cbm[2]
                  const content = cbm[3]
                  if (target.includes(ATTR_REF_HEAD)) {
                    const expanded = parent.subAttributes(target, {
                      returnDropSentinel: true,
                    })
                    if (expanded === null) {
                      for (const k of Object.keys(attributes))
                        delete attributes[k]
                      return null
                    }
                    target = expanded
                  }
                  const extConfig = extension.config
                  if (extConfig.content_model === 'attributes') {
                    if (content)
                      await document.parseAttributes(
                        content,
                        extConfig.positional_attrs ?? extConfig.pos_attrs ?? [],
                        { sub_input: true, into: attributes }
                      )
                  } else {
                    attributes.text = content ?? ''
                  }
                  if (extConfig.default_attrs) {
                    for (const [k, v] of Object.entries(
                      extConfig.default_attrs
                    )) {
                      attributes[k] ??= v
                    }
                  }
                  const result = await extension.processMethod(
                    parent,
                    target,
                    attributes
                  )
                  if (result && result !== parent) {
                    Object.assign(attributes, result.attributes)
                    block = result
                    break
                  }
                  for (const k of Object.keys(attributes)) delete attributes[k]
                  return null
                }
              }
            }
          }
        }

        if (!indented && (ch0 ?? thisLine[0]) === '<') {
          const clm = thisLine.match(CalloutListRx)
          if (clm) {
            reader.unshiftLine(thisLine)
            block = await Parser.parseCalloutList(
              reader,
              clm,
              parent,
              document.callouts
            )
            attributes.style = 'arabic'
            break
          }
        }

        if (UnorderedListRx.test(thisLine)) {
          reader.unshiftLine(thisLine)
          if (
            !style &&
            parent instanceof Section &&
            parent.sectname === 'bibliography'
          ) {
            attributes.style = 'bibliography'
          }
          block = await Parser.parseList(
            reader,
            'ulist',
            parent,
            style ?? attributes.style ?? null
          )
          break
        }

        if (OrderedListRx.test(thisLine)) {
          reader.unshiftLine(thisLine)
          const start = 'start' in attributes ? attributes.start : null
          delete attributes.start
          block = await Parser.parseList(reader, 'olist', parent, style, {
            start,
          })
          if (block.style) attributes.style = block.style
          break
        }

        if (thisLine.includes('::') || thisLine.includes(';;')) {
          const dlm = thisLine.match(DescriptionListRx)
          if (dlm) {
            reader.unshiftLine(thisLine)
            block = await Parser.parseDescriptionList(reader, dlm, parent)
            break
          }
        }

        if (
          (style === 'float' || style === 'discrete') &&
          (Compliance.underlineStyleSectionTitles
            ? Parser.isSectionTitle(thisLine, await reader.peekLine()) != null
            : !indented && Parser.atxSectionTitle(thisLine) != null)
        ) {
          reader.unshiftLine(thisLine)
          const [floatId, floatReftext, blockTitle, floatLevel] =
            await Parser.parseSectionTitle(reader, document, attributes.id)
          if (floatReftext) attributes.reftext = floatReftext
          block = new Block(parent, 'floating_title', {
            content_model: 'empty',
          })
          block.title = blockTitle
          delete attributes.title
          // Force title resolution while in scope to capture current attribute values (Ruby: parser.rb ~line 939)
          if (blockTitle.includes(ATTR_REF_HEAD)) await block.precomputeTitle()
          if (floatId) {
            block.id = floatId
          } else if ('sectids' in docAttrs) {
            await block.precomputeTitle()
            block.id = Section.generateId(block.title, document)
          }
          block.level = floatLevel
          break
        }

        if (style && style !== 'normal') {
          if (PARAGRAPH_STYLES.has(style)) {
            blockContext = style
            cloakedContext = 'paragraph'
            reader.unshiftLine(thisLine)
            break
          }
          if (ADMONITION_STYLES.has(style)) {
            blockContext = 'admonition'
            cloakedContext = 'paragraph'
            reader.unshiftLine(thisLine)
            break
          }
          if (
            blockExtensions &&
            extensions.registeredForBlock(style, 'paragraph')
          ) {
            blockContext = style
            cloakedContext = 'paragraph'
            reader.unshiftLine(thisLine)
            break
          }
          // unknown style; fall through
          if (style && Parser.logger.isDebug())
            Parser.logger.debug(
              Parser.messageWithContext(
                `unknown style for paragraph: ${style}`,
                { source_location: reader.cursor }
              )
            )
        }

        reader.unshiftLine(thisLine)

        if (indented && !style) {
          const contentAdjacent = skipped === 0 ? options.list_type : null
          const lines = await Parser.readParagraphLines(
            reader,
            contentAdjacent,
            { skip_line_comments: !!textOnly }
          )
          Parser.adjustIndentation(lines)
          if (textOnly || contentAdjacent === 'dlist') {
            block = new Block(parent, 'paragraph', {
              content_model: 'simple',
              source: lines,
              attributes,
            })
          } else {
            block = new Block(parent, 'literal', {
              content_model: 'verbatim',
              source: lines,
              attributes,
            })
          }
        } else {
          const lines = await Parser.readParagraphLines(
            reader,
            skipped === 0 && options.list_type,
            { skip_line_comments: true }
          )
          if (textOnly) {
            if (indented && style === 'normal') Parser.adjustIndentation(lines)
            block = new Block(parent, 'paragraph', {
              content_model: 'simple',
              source: lines,
              attributes,
            })
          } else if (
            ADMONITION_STYLE_HEADS.has(ch0) &&
            thisLine.includes(':')
          ) {
            const am = thisLine.match(AdmonitionParagraphRx)
            if (am) {
              lines[0] = thisLine.slice(am[0].length)
              const admName = am[1].toLowerCase()
              attributes.name = admName
              attributes.style = am[1]
              attributes.textlabel =
                attributes.caption ?? docAttrs[`${admName}-caption`]
              delete attributes.caption
              block = new Block(parent, 'admonition', {
                content_model: 'simple',
                source: lines,
                attributes,
              })
            } else {
              if (indented && style === 'normal')
                Parser.adjustIndentation(lines)
              block = new Block(parent, 'paragraph', {
                content_model: 'simple',
                source: lines,
                attributes,
              })
            }
          } else if (mdSyntax && ch0 === '>' && thisLine.startsWith('> ')) {
            const mapped = lines.map((line) => {
              if (line === '>') return line.slice(1)
              if (line.startsWith('> ')) return line.slice(2)
              return line
            })
            let creditLine = null
            if (mapped[mapped.length - 1]?.startsWith('-- ')) {
              creditLine = mapped.pop().slice(3)
              while (mapped.length > 0 && mapped[mapped.length - 1] === '')
                mapped.pop()
            }
            attributes.style = 'quote'
            const { Reader: Rdr } = _requireReader()
            block = await Parser.buildBlock(
              'quote',
              'compound',
              false,
              parent,
              new Rdr(mapped),
              attributes
            )
            if (creditLine) {
              const subsApplied = await block.applySubs(creditLine, [
                'specialcharacters',
                'quotes',
                'attributes',
                'replacements',
                'macros',
                'post_replacements',
              ])
              const commaIdx = subsApplied.indexOf(', ')
              const attribution =
                commaIdx !== -1 ? subsApplied.slice(0, commaIdx) : subsApplied
              const citetitle =
                commaIdx !== -1 ? subsApplied.slice(commaIdx + 2) : null
              if (attribution) attributes.attribution = attribution
              if (citetitle) attributes.citetitle = citetitle
            }
          } else if (
            ch0 === '"' &&
            lines.length > 1 &&
            lines[lines.length - 1].startsWith('-- ') &&
            lines[lines.length - 2].endsWith('"')
          ) {
            lines[0] = thisLine.slice(1)
            const cred = lines.pop().slice(3)
            while (lines.length > 0 && lines[lines.length - 1] === '')
              lines.pop()
            lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1)
            attributes.style = 'quote'
            block = new Block(parent, 'quote', {
              content_model: 'simple',
              source: lines,
              attributes,
            })
            const subsApplied = await block.applySubs(cred, [
              'specialcharacters',
              'quotes',
              'attributes',
              'replacements',
              'macros',
              'post_replacements',
            ])
            const commaIdx = subsApplied.indexOf(', ')
            const attribution =
              commaIdx !== -1 ? subsApplied.slice(0, commaIdx) : subsApplied
            const citetitle =
              commaIdx !== -1 ? subsApplied.slice(commaIdx + 2) : null
            if (attribution) attributes.attribution = attribution
            if (citetitle) attributes.citetitle = citetitle
          } else {
            if (indented && style === 'normal') Parser.adjustIndentation(lines)
            block = new Block(parent, 'paragraph', {
              content_model: 'simple',
              source: lines,
              attributes,
            })
          }
          Parser.catalogInlineAnchors(lines.join(LF), block, document, reader)
        }
      } while (false) // eslint-disable-line no-constant-condition
    }

    // Delimited block or styled paragraph
    if (!block) {
      switch (blockContext) {
        case 'listing':
        case 'source': {
          const lang =
            blockContext !== 'source' && !attributes[1]
              ? (attributes[2] ?? docAttrs['source-language'])
              : null
          if (lang) {
            attributes.style = 'source'
            attributes.language = lang
            AttributeList.rekey(attributes, [null, null, 'linenums'])
          } else if (blockContext === 'source') {
            AttributeList.rekey(attributes, [null, 'language', 'linenums'])
            if ('source-language' in docAttrs && !('language' in attributes)) {
              attributes.language = docAttrs['source-language']
            }
            if (cloakedContext !== 'listing')
              attributes['cloaked-context'] = cloakedContext
          }
          if (
            !('linenums-option' in attributes) &&
            ('linenums' in attributes || 'source-linenums-option' in docAttrs)
          ) {
            attributes['linenums-option'] = ''
          }
          if (!('indent' in attributes) && 'source-indent' in docAttrs) {
            attributes.indent = docAttrs['source-indent']
          }
          block = await Parser.buildBlock(
            'listing',
            'verbatim',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        }
        case 'fenced_code': {
          attributes.style = 'source'
          const ll = thisLine.length
          let language = null
          if (ll > 3) {
            const langPart = thisLine.slice(3)
            const commaIdx = langPart.indexOf(',')
            if (commaIdx >= 0) {
              if (commaIdx > 0) language = langPart.slice(0, commaIdx).trim()
              if (commaIdx < ll - 4) attributes.linenums = ''
            } else {
              language = langPart.trimStart()
            }
          }
          if (!language) {
            if ('source-language' in docAttrs)
              attributes.language = docAttrs['source-language']
          } else {
            attributes.language = language
          }
          attributes['cloaked-context'] = cloakedContext
          if (
            !('linenums-option' in attributes) &&
            ('linenums' in attributes || 'source-linenums-option' in docAttrs)
          ) {
            attributes['linenums-option'] = ''
          }
          if (!('indent' in attributes) && 'source-indent' in docAttrs)
            attributes.indent = docAttrs['source-indent']
          terminator = terminator.slice(0, 3)
          block = await Parser.buildBlock(
            'listing',
            'verbatim',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        }
        case 'table': {
          const blockCursor = reader.cursor
          const { Reader: Rdr } = _requireReader()
          const blockReader = new Rdr(
            await reader.readLinesUntil({
              terminator,
              skip_line_comments: true,
              context: 'table',
              cursor: 'at_mark',
            }),
            blockCursor
          )
          if (!terminator.startsWith('|') && !terminator.startsWith('!')) {
            attributes.format ??= terminator.startsWith(',') ? 'csv' : 'dsv'
          }
          block = await Parser.parseTable(blockReader, parent, attributes)
          break
        }
        case 'sidebar':
          block = await Parser.buildBlock(
            blockContext,
            'compound',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'admonition': {
          const admStyle = attributes.style ?? blockContext
          attributes.name = admStyle.toLowerCase()
          attributes.textlabel =
            (attributes.caption && delete attributes.caption) ??
            docAttrs[`${attributes.name}-caption`]
          block = await Parser.buildBlock(
            blockContext,
            'compound',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        }
        case 'open':
        case 'abstract':
        case 'partintro':
          block = await Parser.buildBlock(
            'open',
            'compound',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'literal':
          block = await Parser.buildBlock(
            blockContext,
            'verbatim',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'example':
          if ('collapsible-option' in attributes) attributes.caption ??= ''
          block = await Parser.buildBlock(
            blockContext,
            'compound',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'quote':
        case 'verse':
          AttributeList.rekey(attributes, [null, 'attribution', 'citetitle'])
          block = await Parser.buildBlock(
            blockContext,
            blockContext === 'verse' ? 'verbatim' : 'compound',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'stem':
        case 'latexmath':
        case 'asciimath':
          if (blockContext === 'stem') {
            attributes.style = STEM_TYPE_ALIASES[attributes[2] ?? docAttrs.stem]
          }
          block = await Parser.buildBlock(
            'stem',
            'raw',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'pass':
          block = await Parser.buildBlock(
            blockContext,
            'raw',
            terminator,
            parent,
            reader,
            attributes
          )
          break
        case 'comment':
          await Parser.buildBlock(
            blockContext,
            'skip',
            terminator,
            parent,
            reader,
            attributes
          )
          for (const k of Object.keys(attributes)) delete attributes[k]
          return null
        default: {
          if (
            !blockExtensions ||
            !extensions.registeredForBlock(blockContext, cloakedContext)
          ) {
            throw new Error(
              `Unsupported block type ${blockContext} at ${reader.cursor}`
            )
          }
          const extension = extensions.registeredForBlock(
            blockContext,
            cloakedContext
          )
          const extConfig = extension.config
          const contentModel = extConfig.content_model
          if (contentModel !== 'skip') {
            const posAttrs = extConfig.positional_attrs ?? extConfig.pos_attrs
            if (posAttrs && posAttrs.length > 0) {
              AttributeList.rekey(attributes, [null, ...posAttrs])
            }
            if (extConfig.default_attrs) {
              for (const [k, v] of Object.entries(extConfig.default_attrs)) {
                attributes[k] ??= v
              }
            }
            attributes['cloaked-context'] = cloakedContext
          }
          block = await Parser.buildBlock(
            blockContext,
            contentModel,
            terminator,
            parent,
            reader,
            attributes,
            { extension }
          )
          if (!block) {
            for (const k of Object.keys(attributes)) delete attributes[k]
            return null
          }
        }
      }
    }

    if (!block) return null

    if (document.sourcemap) block.sourceLocation = reader.cursorAtMark()
    if (attributes.title) {
      const blockTitle = attributes.title
      block.title = blockTitle
      delete attributes.title
      // Force title resolution while in scope to capture current attribute values (Ruby: parser.rb ~line 939)
      if (blockTitle.includes(ATTR_REF_HEAD)) await block.precomputeTitle()
      if (CAPTION_ATTRIBUTE_NAMES[block.context]) {
        block.assignCaption(attributes.caption)
        delete attributes.caption
      }
    }
    block.style = attributes.style ?? null

    const blockId = block.id ?? (block.id = attributes.id ?? null)
    if (blockId) {
      if (!document.register('refs', [blockId, block])) {
        Parser.logger.warn(
          Parser.messageWithContext(
            `id assigned to block already in use: ${blockId}`,
            { source_location: reader.cursorAtMark() }
          )
        )
      }
    }

    if (Object.keys(attributes).length > 0) block.updateAttributes(attributes)
    block.commitSubs()

    if (block.hasSub('callouts')) {
      if (!Parser.catalogCallouts(block.source, document))
        block.removeSub('callouts')
    }

    return block
  }

  /**
   * Build a block from reader lines.
   * @returns {Promise<Block|null>}
   * @internal
   */
  static async buildBlock(
    blockContext,
    contentModel,
    terminator,
    parent,
    reader,
    attributes,
    options = {}
  ) {
    let skipProcessing, parseAsContentModel

    if (contentModel === 'skip') {
      skipProcessing = true
      parseAsContentModel = 'simple'
    } else if (contentModel === 'raw') {
      skipProcessing = false
      parseAsContentModel = 'simple'
    } else {
      skipProcessing = false
      parseAsContentModel = contentModel
    }

    let lines = null,
      blockReader = null

    if (terminator == null) {
      if (parseAsContentModel === 'verbatim') {
        lines = await reader.readLinesUntil({
          break_on_blank_lines: true,
          break_on_list_continuation: true,
        })
      } else {
        if (contentModel === 'compound') contentModel = 'simple'
        lines = await Parser.readParagraphLines(reader, false, {
          skip_line_comments: true,
          skip_processing: skipProcessing,
        })
      }
    } else if (parseAsContentModel !== 'compound') {
      lines = await reader.readLinesUntil({
        terminator,
        skip_processing: skipProcessing,
        context: blockContext,
        cursor: 'at_mark',
      })
    } else if (terminator === false) {
      blockReader = reader
    } else {
      const blockCursor = reader.cursor
      const { Reader: Rdr } = _requireReader()
      blockReader = new Rdr(
        await reader.readLinesUntil({
          terminator,
          skip_processing: skipProcessing,
          context: blockContext,
          cursor: 'at_mark',
        }),
        blockCursor,
        { document: parent.document }
      )
    }

    if (contentModel === 'verbatim') {
      const tabSize = parseInt(
        attributes.tabsize ?? parent.document.attributes.tabsize ?? '0',
        10
      )
      const indent = attributes.indent
      if (indent != null) {
        Parser.adjustIndentation(lines, parseInt(indent, 10), tabSize)
      } else if (tabSize > 0) {
        Parser.adjustIndentation(lines, -1, tabSize)
      }
    } else if (contentModel === 'skip') {
      return null
    }

    let block
    if (options.extension) {
      const extension = options.extension
      delete attributes.style
      const { Reader: Rdr } = _requireReader()
      const result = await extension.processMethod(
        parent,
        blockReader ?? new Rdr(lines),
        { ...attributes }
      )
      if (!result || result === parent) return null
      block = result
      Object.assign(attributes, block.attributes)
      if (
        block.contentModel === 'compound' &&
        block instanceof Block &&
        block.lines.length > 0
      ) {
        contentModel = 'compound'
        blockReader = new Rdr(block.lines)
      }
    } else {
      block = new Block(parent, blockContext, {
        content_model: contentModel,
        source: lines,
        attributes,
      })
    }

    if (contentModel === 'compound')
      await Parser.parseBlocks(blockReader, block)

    return block
  }

  /**
   * Parse blocks from reader until exhausted.
   * @param {Reader} reader
   * @param {AbstractBlock} parent
   * @param {Object|null} [attributes=null]
   * @returns {Promise<void>}
   */
  static async parseBlocks(reader, parent, attributes = null) {
    while (true) {
      const block = await Parser.nextBlock(
        reader,
        parent,
        attributes ? { ...attributes } : {}
      )
      if (block) parent.blocks.push(block)
      if (!(await reader.hasMoreLines())) break
    }
  }

  /**
   * Parse an ordered or unordered list.
   * @returns {Promise<List>}
   * @internal
   */
  static async parseList(reader, listType, parent, style = null, opts = {}) {
    const start = opts.start != null ? parseInt(opts.start, 10) : null
    const listAttrs = start != null && start !== 1 ? { start } : null
    const listBlock = new List(
      parent,
      listType,
      listAttrs ? { attributes: listAttrs } : {}
    )
    const listRx = ListRxMap[listType]

    while (
      (await reader.hasMoreLines()) &&
      listRx.test(await reader.peekLine())
    ) {
      const m = (await reader.peekLine()).match(listRx)
      const listItem = await Parser.parseListItem(
        reader,
        listBlock,
        m,
        m[1],
        style
      )
      if (listItem) listBlock.blocks.push(listItem)
      if ((await reader.skipBlankLines()) == null) break
    }

    return listBlock
  }

  /**
   * Catalog callouts in text.
   * @param {string} text
   * @param {Document} document
   * @returns {boolean} Whether any callouts were found.
   * @internal
   */
  static catalogCallouts(text, document) {
    if (!text.includes('<')) return false
    let found = false
    let autonum = 0
    const rx = new RegExp(CalloutScanRx.source, `${CalloutScanRx.flags}g`)
    let m
    while ((m = rx.exec(text)) !== null) {
      if (!m[0].startsWith('\\')) {
        document.callouts.register(m[2] === '.' ? String(++autonum) : m[2])
      }
      found = true
    }
    return found
  }

  /**
   * Catalog a single inline anchor.
   * @internal
   */
  static catalogInlineAnchor(id, reftext, node, location, doc = node.document) {
    if (reftext?.includes(ATTR_REF_HEAD)) {
      reftext = doc.subAttributes(reftext)
    }
    const cursor = location?.cursor ? location.cursor : location
    if (
      !doc.register('refs', [
        id,
        new Inline(node, 'anchor', reftext, { type: 'ref', id }),
      ])
    ) {
      Parser.logger.warn(
        Parser.messageWithContext(
          `id assigned to anchor already in use: ${id}`,
          { source_location: cursor }
        )
      )
    }
  }

  /**
   * Catalog all inline anchors in text.
   * @internal
   */
  static catalogInlineAnchors(text, block, document, reader) {
    if (!text.includes('[[') && !text.includes('anchor:')) return

    const _rx = new RegExp(
      InlineAnchorScanRx.source,
      'gd' in RegExp.prototype ? 'gdu' : 'gu'
    )
    let m
    // Reset lastIndex for global search
    InlineAnchorScanRx.lastIndex = 0
    const globalRx = new RegExp(InlineAnchorScanRx.source, 'gu')
    while ((m = globalRx.exec(text)) !== null) {
      let id, reftext
      if (m[1]) {
        id = m[1]
        reftext = m[2]
        if (reftext?.includes(ATTR_REF_HEAD)) {
          reftext = document.subAttributes(reftext)
          if (!reftext) continue
        }
      } else {
        id = m[3]
        reftext = m[4]
        if (reftext) {
          if (reftext.includes(']')) reftext = reftext.replace(/\\]/g, ']')
          if (reftext.includes(ATTR_REF_HEAD)) {
            reftext = document.subAttributes(reftext)
            if (!reftext) reftext = null
          }
        }
      }
      if (
        !document.register('refs', [
          id,
          new Inline(block, 'anchor', reftext, { type: 'ref', id }),
        ])
      ) {
        Parser.logger.warn(
          Parser.messageWithContext(
            `id assigned to anchor already in use: ${id}`,
            { source_location: reader.cursorAtMark() }
          )
        )
      }
    }
  }

  /**
   * Catalog a bibliography inline anchor.
   * @internal
   */
  static catalogInlineBiblioAnchor(id, reftext, node, reader) {
    const displayReftext = reftext != null ? `[${reftext}]` : null
    if (
      !node.document.register('refs', [
        id,
        new Inline(node, 'anchor', displayReftext, { type: 'bibref', id }),
      ])
    ) {
      Parser.logger.warn(
        Parser.messageWithContext(
          `id assigned to bibliography anchor already in use: ${id}`,
          { source_location: reader.cursor }
        )
      )
    }
  }

  /**
   * Parse a description list.
   * @returns {Promise<List>}
   * @internal
   */
  static async parseDescriptionList(reader, match, parent) {
    const listBlock = new List(parent, 'dlist')
    const siblingPattern = DescriptionListSiblingRx[match[2]]
    let currentPair = await Parser.parseListItem(
      reader,
      listBlock,
      match,
      siblingPattern
    )
    listBlock.blocks.push(currentPair)

    while (await reader.hasMoreLines()) {
      const pLine = await reader.peekLine()
      const nm = pLine.match(siblingPattern)
      if (!nm) break
      const nextPair = await Parser.parseListItem(
        reader,
        listBlock,
        nm,
        siblingPattern
      )
      if (currentPair[1]) {
        listBlock.blocks.push((currentPair = nextPair))
      } else {
        currentPair[0].push(nextPair[0][0])
        currentPair[1] = nextPair[1]
      }
    }

    return listBlock
  }

  /**
   * Parse a callout list.
   * @returns {Promise<List>}
   * @internal
   */
  static async parseCalloutList(reader, match, parent, callouts) {
    const listBlock = new List(parent, 'colist')
    let nextIndex = 1
    let autonum = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!match) {
        const pLine = await reader.peekLine()
        if (!pLine) break
        const nm = pLine.match(CalloutListRx)
        if (!nm) break
        match = nm
        reader.mark()
      }
      let num = match[1]
      if (num === '.') num = String(++autonum)
      if (num !== String(nextIndex)) {
        Parser.logger.warn(
          Parser.messageWithContext(
            `callout list item index: expected ${nextIndex}, got ${num}`,
            { source_location: reader.cursorAtMark() }
          )
        )
      }
      const listItem = await Parser.parseListItem(
        reader,
        listBlock,
        match,
        '<1>'
      )
      if (listItem) {
        listBlock.blocks.push(listItem)
        const coids = callouts.getCalloutIds(listBlock.blocks.length)
        if (!coids) {
          Parser.logger.warn(
            Parser.messageWithContext(
              `no callout found for <${listBlock.blocks.length}>`,
              { source_location: reader.cursorAtMark() }
            )
          )
        } else {
          listItem.attributes.coids = coids
        }
      }
      nextIndex++
      match = null
    }

    callouts.nextList()
    return listBlock
  }

  /**
   * Parse a list item (ordered, unordered, callout, or description list).
   * @returns {Promise<ListItem|[ListItem[], ListItem|null]>}
   * @internal
   */
  static async parseListItem(
    reader,
    listBlock,
    match,
    siblingTrait,
    style = null
  ) {
    const listType = listBlock.context
    const dlist = listType === 'dlist'
    let listTerm, listItem, hasText, sourcemapAssignmentDeferred

    if (dlist) {
      const termText = match[1]
      listTerm = new ListItem(listBlock, termText)
      if (termText.startsWith('[[')) {
        const am = termText.match(LeadingInlineAnchorRx)
        if (am)
          Parser.catalogInlineAnchor(
            am[1],
            am[2] ?? termText.slice(am[0].length).trimStart(),
            listTerm,
            reader
          )
      }
      const itemText = match[3] ?? null
      hasText = !!itemText
      listItem = new ListItem(listBlock, itemText)
      if (listBlock.document.sourcemap) {
        listTerm.sourceLocation = reader.cursor
        if (hasText) {
          listItem.sourceLocation = listTerm.sourceLocation
        } else {
          sourcemapAssignmentDeferred = true
        }
      }
    } else {
      hasText = true
      const itemText = match[2]
      listItem = new ListItem(listBlock, itemText)
      if (listBlock.document.sourcemap) listItem.sourceLocation = reader.cursor

      if (listType === 'ulist') {
        listItem.marker = siblingTrait
        if (itemText.startsWith('[')) {
          if (style && style === 'bibliography') {
            const bm = itemText.match(InlineBiblioAnchorRx)
            if (bm)
              Parser.catalogInlineBiblioAnchor(bm[1], bm[2], listItem, reader)
          } else if (itemText.startsWith('[[')) {
            const am = itemText.match(LeadingInlineAnchorRx)
            if (am) Parser.catalogInlineAnchor(am[1], am[2], listItem, reader)
          } else if (
            itemText.startsWith('[ ] ') ||
            itemText.startsWith('[x] ') ||
            itemText.startsWith('[*] ')
          ) {
            listBlock.attributes['checklist-option'] = ''
            listItem.attributes.checkbox = ''
            if (!itemText.startsWith('[ ')) listItem.attributes.checked = ''
            listItem.setText(itemText.slice(4))
          }
        }
      } else if (listType === 'olist') {
        const ordinal = listBlock.blocks.length
        const isFirst = ordinal === 0
        let validate = true
        const startAttr = listBlock.attributes.start
        let effectiveOrdinal = ordinal
        if (startAttr != null) {
          effectiveOrdinal += parseInt(startAttr, 10) - 1
        } else if (isFirst) {
          const startNum = Parser.resolveOrderedListStart(siblingTrait)
          if (startNum !== 1) {
            listBlock.attributes.start = startNum
            effectiveOrdinal += startNum - 1
            validate = false
          }
        }
        const [resolvedMarker, implicitStyle] = Parser.resolveOrderedListMarker(
          siblingTrait,
          effectiveOrdinal,
          validate,
          reader
        )
        listItem.marker = resolvedMarker
        if (isFirst && !style) {
          listBlock.style =
            implicitStyle ??
            ORDERED_LIST_STYLES[resolvedMarker.length - 1] ??
            'arabic'
        }
        if (itemText.startsWith('[[')) {
          const am = itemText.match(LeadingInlineAnchorRx)
          if (am) Parser.catalogInlineAnchor(am[1], am[2], listItem, reader)
        }
      } else {
        // colist
        listItem.marker = siblingTrait
        if (itemText.startsWith('[[')) {
          const am = itemText.match(LeadingInlineAnchorRx)
          if (am) Parser.catalogInlineAnchor(am[1], am[2], listItem, reader)
        }
      }
    }

    await reader.readLine()
    const blockCursor = reader.cursor
    const { Reader: Rdr } = _requireReader()
    const listItemLines = await Parser.readLinesForListItem(
      reader,
      listType,
      siblingTrait,
      hasText
    )
    const listItemReader = new Rdr(listItemLines, blockCursor)

    if (await listItemReader.hasMoreLines()) {
      if (sourcemapAssignmentDeferred) listItem.sourceLocation = blockCursor
      const commentLines = await listItemReader.skipLineComments()
      const subsequentLine = await listItemReader.peekLine()
      if (subsequentLine != null) {
        if (commentLines.length > 0) listItemReader.unshiftLines(commentLines)
        let contentAdjacent = false
        if (String(subsequentLine) !== '') {
          contentAdjacent = true
          if (!dlist) hasText = null
        }
        const block = await Parser.nextBlock(
          listItemReader,
          listItem,
          {},
          { text_only: hasText ? null : true, list_type: listType }
        )
        if (block) listItem.blocks.push(block)
        while (await listItemReader.hasMoreLines()) {
          const b = await Parser.nextBlock(
            listItemReader,
            listItem,
            {},
            { list_type: listType }
          )
          if (b) listItem.blocks.push(b)
        }
        if (
          contentAdjacent &&
          listItem.blocks.length > 0 &&
          listItem.blocks[0].context === 'paragraph'
        ) {
          listItem.foldFirst()
        }
      }
    }

    return dlist
      ? [
          [listTerm],
          listItem.hasText() || listItem.blocks.length > 0 ? listItem : null,
        ]
      : listItem
  }

  /**
   * Collect lines belonging to the current list item.
   * @returns {Promise<string[]>}
   * @internal
   */
  static async readLinesForListItem(
    reader,
    listType,
    siblingTrait = null,
    hasText = true
  ) {
    const buffer = []
    let continuation = 'inactive'
    let withinNestedList = false
    let detachedContinuation = null
    const dlist = listType === 'dlist'
    let thisLine = null

    while (await reader.hasMoreLines()) {
      thisLine = await reader.readLine()

      if (Parser.isSiblingListItem(thisLine, listType, siblingTrait)) break

      if (thisLine === LIST_CONTINUATION) thisLine = ListContinuationString

      const prevLine = buffer.length > 0 ? buffer[buffer.length - 1] : null

      if (isListContinuation(prevLine)) {
        if (continuation === 'inactive') {
          continuation = 'active'
          hasText = true
          if (!withinNestedList)
            buffer[buffer.length - 1] = ListContinuationPlaceholder
        }
        if (isListContinuation(thisLine)) {
          if (continuation !== 'frozen') {
            continuation = 'frozen'
            buffer.push(thisLine)
          }
          thisLine = null
          continue
        }
      }

      const delimMatch = Parser.isDelimitedBlock(thisLine, true)
      if (delimMatch) {
        if (continuation !== 'active') break
        buffer.push(thisLine)
        const blockLines = await reader.readLinesUntil({
          terminator: delimMatch.terminator,
          read_last_line: true,
          context: delimMatch.context,
        })
        buffer.push(...blockLines)
        continuation = 'inactive'
      } else if (
        dlist &&
        continuation !== 'active' &&
        thisLine.startsWith('[') &&
        BlockAttributeLineRx.test(thisLine)
      ) {
        const blockAttributeLines = [thisLine]
        let interrupt = false
        while (true) {
          const nextLine = await reader.peekLine()
          if (nextLine == null) break
          if (Parser.isDelimitedBlock(nextLine)) {
            interrupt = true
            break
          }
          if (
            nextLine === '' ||
            (nextLine.startsWith('[') && BlockAttributeLineRx.test(nextLine))
          ) {
            blockAttributeLines.push(await reader.readLine())
          } else if (
            AnyListRx.test(nextLine) &&
            !Parser.isSiblingListItem(nextLine, listType, siblingTrait)
          ) {
            buffer.push(...blockAttributeLines)
            break
          } else {
            interrupt = true
            break
          }
        }
        if (interrupt) {
          thisLine = null
          reader.unshiftLines(blockAttributeLines)
          break
        }
      } else if (continuation === 'active' && thisLine !== '') {
        if (LiteralParagraphRx.test(thisLine)) {
          reader.unshiftLine(thisLine)
          if (dlist) {
            const lns = await reader.readLinesUntil(
              {
                preserve_last_line: true,
                break_on_blank_lines: true,
                break_on_list_continuation: true,
              },
              (line) => Parser.isSiblingListItem(line, listType, siblingTrait)
            )
            buffer.push(...lns)
          } else {
            const lns = await reader.readLinesUntil({
              preserve_last_line: true,
              break_on_blank_lines: true,
              break_on_list_continuation: true,
            })
            buffer.push(...lns)
          }
          continuation = 'inactive'
        } else if (
          (thisLine[0] === '.' && BlockTitleRx.test(thisLine)) ||
          (thisLine[0] === '[' && BlockAttributeLineRx.test(thisLine)) ||
          (thisLine[0] === ':' && AttributeEntryRx.test(thisLine))
        ) {
          buffer.push(thisLine)
        } else {
          if (!withinNestedList) {
            const nestedType = NESTABLE_LIST_CONTEXTS.find((ctx) =>
              ListRxMap[ctx].test(thisLine)
            )
            if (nestedType) {
              withinNestedList = true
              if (
                nestedType === 'dlist' &&
                !thisLine.match(DescriptionListRx)?.[3]
              ) {
                hasText = false
              }
            }
          }
          buffer.push(thisLine)
          continuation = 'inactive'
        }
      } else if (prevLine !== null && prevLine === '') {
        if (thisLine === '') {
          const skippedLine = await reader.skipBlankLines()
          if (skippedLine == null) {
            thisLine = null
            break
          }
          thisLine = await reader.readLine()
          if (thisLine == null) break
          if (Parser.isSiblingListItem(thisLine, listType, siblingTrait)) break
        }
        if (String(thisLine) === LIST_CONTINUATION) {
          detachedContinuation = buffer.length
          buffer.push(ListContinuationString)
        } else if (hasText) {
          if (Parser.isSiblingListItem(thisLine, listType, siblingTrait)) break
          const nestedType = NESTABLE_LIST_CONTEXTS.find((ctx) =>
            ListRxMap[ctx].test(thisLine)
          )
          if (nestedType) {
            buffer.push(thisLine)
            withinNestedList = true
            if (
              nestedType === 'dlist' &&
              !thisLine.match(DescriptionListRx)?.[3]
            )
              hasText = false
          } else if (LiteralParagraphRx.test(thisLine)) {
            reader.unshiftLine(thisLine)
            if (dlist) {
              const lns = await reader.readLinesUntil(
                {
                  preserve_last_line: true,
                  break_on_blank_lines: true,
                  break_on_list_continuation: true,
                },
                (line) => Parser.isSiblingListItem(line, listType, siblingTrait)
              )
              buffer.push(...lns)
            } else {
              const lns = await reader.readLinesUntil({
                preserve_last_line: true,
                break_on_blank_lines: true,
                break_on_list_continuation: true,
              })
              buffer.push(...lns)
            }
          } else {
            break
          }
        } else {
          if (!withinNestedList) buffer.pop()
          buffer.push(thisLine)
          hasText = true
        }
      } else if (isListContinuation(thisLine)) {
        hasText = true
        buffer.push(thisLine)
      } else {
        if (thisLine !== '') {
          hasText = true
          const nestedType = (
            withinNestedList ? ['dlist'] : NESTABLE_LIST_CONTEXTS
          ).find((ctx) => ListRxMap[ctx].test(thisLine))
          if (nestedType) {
            withinNestedList = true
            if (
              nestedType === 'dlist' &&
              !thisLine.match(DescriptionListRx)?.[3]
            )
              hasText = false
          }
        }
        buffer.push(thisLine)
      }
      thisLine = null
    }

    if (thisLine != null) reader.unshiftLine(thisLine)
    if (detachedContinuation != null)
      buffer[detachedContinuation] = ListContinuationPlaceholder

    while (buffer.length > 0) {
      const last = buffer[buffer.length - 1]
      if (isListContinuation(last)) {
        buffer.pop()
        break
      }
      if (last === '') {
        buffer.pop()
      } else {
        break
      }
    }

    return buffer
  }

  /**
   * Initialize a Section from the current reader position.
   * @returns {Promise<Section>}
   * @internal
   */
  static async initializeSection(reader, parent, attributes = {}) {
    const document = parent.document
    const doctype = document.doctype
    const book = doctype === 'book'
    const sourceLocation = document.sourcemap ? reader.cursor : null
    const sectStyle = attributes[1] ?? null

    const [sectId, sectReftext, sectTitle, rawSectLevel, sectAtx] =
      await Parser.parseSectionTitle(reader, document, attributes.id)
    let sectLevel = rawSectLevel

    let sectName,
      sectSpecial = false,
      sectNumbered = false
    if (sectStyle) {
      if (book && sectStyle === 'abstract') {
        sectName = 'chapter'
        // sectLevel already 1 from parseSectionTitle typically
      } else if (
        sectStyle.startsWith('sect') &&
        SectionLevelStyleRx.test(sectStyle)
      ) {
        sectName = 'section'
      } else {
        sectName = sectStyle
        sectSpecial = true
        if (book && sectLevel === 0) sectLevel = 1
        sectNumbered = sectName === 'appendix'
      }
    } else if (book) {
      sectName =
        sectLevel === 0 ? 'part' : sectLevel > 1 ? 'section' : 'chapter'
    } else if (
      doctype === 'manpage' &&
      sectTitle.toLowerCase() === 'synopsis'
    ) {
      sectName = 'synopsis'
      sectSpecial = true
    } else {
      sectName = 'section'
    }

    if (sectReftext) attributes.reftext = sectReftext
    const section = new Section(parent, sectLevel)
    section.id = sectId ?? null
    section.title = sectTitle
    section.sectname = sectName
    section.sourceLocation = sourceLocation

    if (sectSpecial) {
      section.special = true
      if (sectNumbered) {
        section.numbered = true
      } else if (document.attributes.sectnums === 'all') {
        section.numbered = book && sectLevel === 1 ? 'chapter' : true
      }
    } else if ('sectnums' in document.attributes && sectLevel > 0) {
      section.numbered = section.special ? parent.numbered && true : true
    } else if (book && sectLevel === 0 && 'partnums' in document.attributes) {
      section.numbered = true
    }

    let id = section.id
    if (id != null) {
      if (id === '') {
        section.id = id = null
      } else if (sectTitle.includes(ATTR_REF_HEAD)) {
        // Force title resolution while in scope, mirroring Ruby's lazy-memo access
        // (`section.title` triggers `@converted_title ||= apply_title_subs(@title)`).
        // Must happen before _restoreAttributes resets body-scoped attribute values.
        await section.precomputeTitle()
      }
    } else if ('sectids' in document.attributes) {
      // Match Ruby behaviour: section.title returns apply_title_subs(@title) (fully substituted HTML).
      // InvalidSectionIdCharsRx then strips the HTML tags, so inline anchors, icon macros and
      // URL macros are correctly excluded from the generated ID.
      // precomputeTitle() is idempotent (guarded by #convertedTitle == null), so calling it here
      // prevents a second substitution pass in _resolveAllTexts (avoids double-cataloging images,
      // footnotes, etc.).
      await section.precomputeTitle()
      section.id = id = Section.generateId(section.title, document)
    }

    if (id && !document.register('refs', [id, section])) {
      const lineNo = reader.lineno - (sectAtx ? 1 : 2)
      Parser.logger.warn(
        Parser.messageWithContext(
          `id assigned to section already in use: ${id}`,
          { source_location: reader.cursorAtLine(lineNo) }
        )
      )
    }

    section.updateAttributes(attributes)
    await reader.skipBlankLines()

    return section
  }

  /**
   * Check if the next line is a section title.
   * @returns {Promise<number|null>} The section level, or null.
   * @internal
   */
  static async isNextLineSection(reader, attributes) {
    const style = attributes[1]
    if (style && (style === 'discrete' || style === 'float')) return null

    if (Compliance.underlineStyleSectionTitles) {
      const nextLines = await reader.peekLines(2, style && style === 'comment')
      return Parser.isSectionTitle(nextLines[0] ?? '', nextLines[1] ?? null)
    }
    return Parser.atxSectionTitle((await reader.peekLine()) ?? '')
  }

  /**
   * Check if the next line is the document title.
   * @returns {Promise<boolean>}
   * @internal
   */
  static async isNextLineDoctitle(reader, attributes, leveloffset) {
    const sectLevel = await Parser.isNextLineSection(reader, attributes)
    if (sectLevel == null || sectLevel === false) return false
    if (leveloffset) {
      return sectLevel + parseInt(leveloffset, 10) === 0
    }
    return sectLevel === 0
  }

  /**
   * Check if line1 (and optionally line2) form a section title.
   * @param {string} line1
   * @param {string|null} [line2=null]
   * @returns {number|null} The section level, or null.
   */
  static isSectionTitle(line1, line2 = null) {
    const atxLevel = Parser.atxSectionTitle(line1)
    if (atxLevel != null) return atxLevel
    if (!line2) return null
    return Parser.setextSectionTitle(line1, line2)
  }

  /**
   * Check for ATX-style section title.
   * @param {string} line
   * @returns {number|null} The section level, or null.
   * @internal
   */
  static atxSectionTitle(line) {
    const rx = Compliance.markdownSyntax
      ? ExtAtxSectionTitleRx
      : AtxSectionTitleRx
    if (
      !(Compliance.markdownSyntax
        ? line.startsWith('=') || line.startsWith('#')
        : line.startsWith('='))
    )
      return null
    const m = line.match(rx)
    return m ? m[1].length - 1 : null
  }

  /**
   * Check for setext-style section title.
   * @param {string} line1
   * @param {string} line2
   * @returns {number|null} The section level, or null.
   * @internal
   */
  static setextSectionTitle(line1, line2) {
    const ch0 = line2[0]
    const level = SETEXT_SECTION_LEVELS[ch0]
    if (level == null) return null
    if (!_uniform(line2, ch0, line2.length)) return null
    if (!SetextSectionTitleRx.test(line1)) return null
    if (Math.abs(line1.length - line2.length) >= 2) return null
    return level
  }

  /**
   * Parse section title from reader.
   * @param {Reader} reader
   * @param {Document} document
   * @param {string|null} [sectId=null]
   * @returns {Promise<[string|null, string|null, string, number, boolean]>} Tuple of [id, reftext, title, level, atx].
   */
  static async parseSectionTitle(reader, document, sectId = null) {
    let sectReftext = null,
      sectTitle,
      sectLevel,
      atx

    const line1 = await reader.readLine()
    const rx = Compliance.markdownSyntax
      ? ExtAtxSectionTitleRx
      : AtxSectionTitleRx

    if (
      (Compliance.markdownSyntax
        ? line1.startsWith('=') || line1.startsWith('#')
        : line1.startsWith('=')) &&
      rx.test(line1)
    ) {
      const m = line1.match(rx)
      sectLevel = m[1].length - 1
      sectTitle = m[2]
      atx = true
      if (!sectId && sectTitle.endsWith(']]')) {
        const am = sectTitle.match(InlineSectionAnchorRx)
        if (am && !am[1]) {
          // not escaped
          sectTitle = sectTitle.slice(0, sectTitle.length - am[0].length)
          sectId = am[2]
          sectReftext = am[3] ?? null
        }
      }
    } else if (Compliance.underlineStyleSectionTitles) {
      const line2 = await reader.peekLine(true)
      if (line2) {
        const ch0 = line2[0]
        const level = SETEXT_SECTION_LEVELS[ch0]
        if (
          level != null &&
          _uniform(line2, ch0, line2.length) &&
          SetextSectionTitleRx.test(line1) &&
          Math.abs(line1.length - line2.length) < 2
        ) {
          sectLevel = level
          const m = line1.match(SetextSectionTitleRx)
          sectTitle = m ? m[1] : line1
          atx = false
          if (!sectId && sectTitle.endsWith(']]')) {
            const am = sectTitle.match(InlineSectionAnchorRx)
            if (am && !am[1]) {
              sectTitle = sectTitle.slice(0, sectTitle.length - am[0].length)
              sectId = am[2]
              sectReftext = am[3] ?? null
            }
          }
          await reader.readLine()
        }
      }
    }

    if (sectTitle == null) {
      throw new Error(`Unrecognized section at ${reader.cursorAtPrevLine()}`)
    }

    const leveloffset = document.attr('leveloffset')
    if (leveloffset) {
      sectLevel += parseInt(leveloffset, 10)
      if (sectLevel < 0) sectLevel = 0
    }

    return [sectId, sectReftext, sectTitle, sectLevel, atx]
  }

  /**
   * Parse header metadata (author line and revision line).
   * @param {Reader} reader
   * @param {Document|null} [document=null]
   * @param {boolean} [retrieve=true]
   * @returns {Promise<Object|null>}
   */
  static async parseHeaderMetadata(reader, document = null, retrieve = true) {
    const docAttrs = document?.attributes

    await Parser.processAttributeEntries(reader, document)

    let implicitAuthorMetadata = {}
    let authorcount = null
    let implicitAuthor = null
    let implicitAuthorinitials = null
    let implicitAuthors = null

    if ((await reader.hasMoreLines()) && !(await reader.isNextLineEmpty())) {
      const authorLine = await reader.readLine()
      const parsed = Parser.processAuthors(authorLine)
      authorcount = parsed.authorcount
      delete parsed.authorcount
      implicitAuthorMetadata = parsed
      implicitAuthorMetadata.authorcount = authorcount

      if (document && docAttrs) {
        docAttrs.authorcount = authorcount
        if (authorcount > 0) {
          for (const [key, val] of Object.entries(parsed)) {
            if (!(key in docAttrs)) {
              docAttrs[key] = await document.applyHeaderSubs(val)
            }
          }
          implicitAuthor = docAttrs.author
          implicitAuthorinitials = docAttrs.authorinitials
          implicitAuthors = docAttrs.authors
        }
      }

      await Parser.processAttributeEntries(reader, document)

      if ((await reader.hasMoreLines()) && !(await reader.isNextLineEmpty())) {
        const revLine = await reader.readLine()
        const rm = revLine.match(RevisionInfoLineRx)
        if (rm) {
          const revMetadata = {}
          if (rm[1]) revMetadata.revnumber = rm[1].trimEnd()
          if (rm[2]) {
            const component = rm[2].trim()
            if (component !== '') {
              if (!rm[1] && component.startsWith('v')) {
                revMetadata.revnumber = component.slice(1)
              } else {
                revMetadata.revdate = component
              }
            }
          }
          if (rm[3]) revMetadata.revremark = rm[3].trimEnd()
          if (document && docAttrs && Object.keys(revMetadata).length > 0) {
            for (const [key, val] of Object.entries(revMetadata)) {
              if (!(key in docAttrs))
                docAttrs[key] = await document.applyHeaderSubs(val)
            }
          }
          Object.assign(implicitAuthorMetadata, revMetadata)
        } else {
          reader.unshiftLine(revLine)
        }
      }

      await Parser.processAttributeEntries(reader, document)
      await reader.skipBlankLines()
    }

    // Process author attribute entries that override (or stand in for) the implicit author line.
    let authorMetadata = null
    if (document) {
      if ('author' in docAttrs && docAttrs.author !== implicitAuthor) {
        // author attribute was set or overridden; re-parse as names only (no multiple)
        authorMetadata = Parser.processAuthors(docAttrs.author, true, false)
        if (docAttrs.authorinitials !== implicitAuthorinitials) {
          delete authorMetadata.authorinitials
        }
      } else if (
        'authors' in docAttrs &&
        docAttrs.authors !== implicitAuthors
      ) {
        // authors attribute was set or overridden; re-parse as names only (allow multiple)
        authorMetadata = Parser.processAuthors(docAttrs.authors, true)
      } else {
        // check for individual author_N overrides
        const authors = []
        let authorIdx = 1
        let authorKey = 'author_1'
        let explicit = false
        let sparse = false
        while (authorKey in docAttrs) {
          const authorOverride = docAttrs[authorKey]
          if (authorOverride === implicitAuthorMetadata[authorKey]) {
            authors.push(null)
            sparse = true
          } else {
            authors.push(authorOverride)
            explicit = true
          }
          authorKey = `author_${++authorIdx}`
        }
        if (explicit) {
          if (sparse) {
            for (let idx = 0; idx < authors.length; idx++) {
              if (authors[idx] != null) continue
              const nameIdx = idx + 1
              const parts = [
                implicitAuthorMetadata[`firstname_${nameIdx}`],
                implicitAuthorMetadata[`middlename_${nameIdx}`],
                implicitAuthorMetadata[`lastname_${nameIdx}`],
              ]
                .filter(Boolean)
                .map((n) => n.replace(/ /g, '_'))
              authors[idx] = parts.join(' ')
            }
          }
          // process as names only (no multiple — each entry is already a single author)
          authorMetadata = Parser.processAuthors(authors, true, false)
        } else {
          authorMetadata = { authorcount: 0 }
        }
      }

      if (authorMetadata.authorcount === 0) {
        if (authorcount != null) {
          authorMetadata = null
        } else {
          docAttrs.authorcount = 0
        }
      } else {
        Object.assign(docAttrs, authorMetadata)
        if (!('email' in docAttrs) && 'email_1' in docAttrs) {
          docAttrs.email = docAttrs.email_1
        }
      }
    }

    if (!retrieve) return null
    return Object.assign({}, implicitAuthorMetadata, authorMetadata ?? {})
  }

  /**
   * Parse the author line into a metadata object.
   * @returns {Object}
   * @internal
   */
  static processAuthors(authorLine, namesOnly = false, multiple = true) {
    const authorMetadata = {}
    let authorIdx = 0
    const entries =
      multiple && String(authorLine).includes(';')
        ? String(authorLine).split(AuthorDelimiterRx)
        : [].concat(authorLine)

    for (const authorEntry of entries) {
      const entry = String(authorEntry)
      if (entry === '') continue
      authorIdx++

      const keyMap = {}
      if (authorIdx === 1) {
        for (const key of AuthorKeys) keyMap[key] = key
      } else {
        for (const key of AuthorKeys) keyMap[key] = `${key}_${authorIdx}`
      }

      let segments = null
      if (namesOnly) {
        let cleanEntry = entry
        if (entry.includes('<')) {
          authorMetadata[keyMap.author] = entry.replace(/_/g, ' ')
          cleanEntry = entry.replace(new RegExp(XmlSanitizeRx.source, 'g'), '')
        }
        // Ruby: split(nil, 3) — splits on whitespace, keeps remainder in 3rd element.
        // JS split with limit drops the remainder, so we split fully then cap at 3.
        const allParts = cleanEntry.split(/\s+/).filter(Boolean)
        const parts =
          allParts.length > 3
            ? [...allParts.slice(0, 2), allParts.slice(2).join(' ')]
            : allParts
        if (parts.length === 3) {
          const last = parts.pop()
          parts.push(last.replace(/ {2,}/g, ' '))
        }
        segments = parts
      } else {
        const m = entry.match(AuthorInfoLineRx)
        if (m) segments = m.slice(1)
      }

      if (segments) {
        const fname = segments[0].replace(/_/g, ' ')
        authorMetadata[keyMap.firstname] = fname
        authorMetadata[keyMap.authorinitials] = fname[0]
        let author = fname

        if (segments[1]) {
          if (segments[2]) {
            const mname = segments[1].replace(/_/g, ' ')
            const lname = segments[2].replace(/_/g, ' ')
            authorMetadata[keyMap.middlename] = mname
            authorMetadata[keyMap.lastname] = lname
            author = `${fname} ${mname} ${lname}`
            authorMetadata[keyMap.authorinitials] =
              `${fname[0]}${mname[0]}${lname[0]}`
          } else {
            const lname = segments[1].replace(/_/g, ' ')
            authorMetadata[keyMap.lastname] = lname
            author = `${fname} ${lname}`
            authorMetadata[keyMap.authorinitials] = `${fname[0]}${lname[0]}`
          }
        }
        authorMetadata[keyMap.author] ??= author
        if (!namesOnly && segments[3])
          authorMetadata[keyMap.email] = segments[3]
      } else {
        const author = entry.replace(/ {2,}/g, ' ').trim()
        authorMetadata[keyMap.author] = author
        authorMetadata[keyMap.firstname] = author
        authorMetadata[keyMap.authorinitials] = author[0]
      }

      if (authorIdx === 1) {
        authorMetadata.authors = authorMetadata[keyMap.author]
      } else {
        if (authorIdx === 2) {
          for (const key of AuthorKeys) {
            if (key in authorMetadata)
              authorMetadata[`${key}_1`] = authorMetadata[key]
          }
        }
        authorMetadata.authors = `${authorMetadata.authors}, ${authorMetadata[keyMap.author]}`
      }
    }

    authorMetadata.authorcount = authorIdx
    return authorMetadata
  }

  /**
   * Parse block metadata lines.
   * @returns {Promise<Object>} Accumulated attributes.
   * @internal
   */
  static async parseBlockMetadataLines(
    reader,
    document,
    attributes = {},
    options = {}
  ) {
    while (
      await Parser.parseBlockMetadataLine(reader, document, attributes, options)
    ) {
      await reader.readLine()
      if ((await reader.skipBlankLines()) == null) break
    }
    return attributes
  }

  /**
   * Parse the next line if it contains block metadata.
   * @returns {Promise<true|null>} True if the line is metadata, otherwise null.
   * @internal
   */
  static async parseBlockMetadataLine(
    reader,
    document,
    attributes,
    options = {}
  ) {
    const nextLine = await reader.peekLine()
    if (!nextLine) return null

    const textOnly = options.text_only
    const normal =
      !textOnly &&
      (nextLine.startsWith('[') ||
        nextLine.startsWith('.') ||
        nextLine.startsWith('/') ||
        nextLine.startsWith(':'))
    const isAttrOrComment = textOnly
      ? nextLine.startsWith('[') || nextLine.startsWith('/')
      : normal

    if (!isAttrOrComment) return null

    if (nextLine.startsWith('[')) {
      if (nextLine.startsWith('[[')) {
        if (nextLine.endsWith(']]')) {
          const m = nextLine.match(BlockAnchorRx)
          if (m) {
            attributes.id = m[1]
            if (m[2]) {
              const reftext = m[2]
              attributes.reftext = reftext.includes(ATTR_REF_HEAD)
                ? document.subAttributes(reftext)
                : reftext
            }
            return true
          }
        }
      } else if (nextLine.endsWith(']')) {
        const m = nextLine.match(BlockAttributeListRx)
        if (m) {
          const currentStyle = attributes[1]
          const parsed = await document.parseAttributes(m[1], [], {
            sub_input: true,
            sub_result: true,
            into: attributes,
          })
          if (parsed[1]) {
            attributes[1] =
              Parser.parseStyleAttribute(attributes, reader) ?? currentStyle
          }
          return true
        }
      }
    } else if (normal && nextLine.startsWith('.')) {
      const m = nextLine.match(BlockTitleRx)
      if (m) {
        attributes.title = m[1]
        return true
      }
    } else if (!normal || nextLine.startsWith('/')) {
      if (nextLine === '//') return true
      if (
        normal &&
        nextLine.startsWith('//') &&
        _uniform(nextLine, '/', nextLine.length)
      ) {
        if (nextLine.length !== 3) {
          await reader.readLinesUntil({
            terminator: nextLine,
            skip_first_line: true,
            preserve_last_line: true,
            skip_processing: true,
            context: 'comment',
          })
          return true
        }
      } else if (nextLine.startsWith('//') && !nextLine.startsWith('///')) {
        return true
      }
    } else if (normal && nextLine.startsWith(':')) {
      const m = nextLine.match(AttributeEntryRx)
      if (m) {
        await Parser.processAttributeEntry(reader, document, attributes, m)
        return true
      }
    }
    return null
  }

  /**
   * Process consecutive attribute entries.
   * @internal
   */
  static async processAttributeEntries(reader, document, attributes = null) {
    await reader.skipCommentLines()
    while (await Parser.processAttributeEntry(reader, document, attributes)) {
      await reader.readLine()
      await reader.skipCommentLines()
    }
  }

  /**
   * Process a single attribute entry.
   * @returns {Promise<boolean>}
   * @internal
   */
  static async processAttributeEntry(
    reader,
    document,
    attributes = null,
    match = null
  ) {
    if (!match) {
      if (!(await reader.hasMoreLines())) return false
      const pLine = await reader.peekLine()
      const m = pLine ? pLine.match(AttributeEntryRx) : null
      if (!m) return false
      match = m
    }

    let value = match[2] ?? ''
    if (value === '' || value == null) {
      value = ''
    } else if (
      value.endsWith(LINE_CONTINUATION) ||
      value.endsWith(LINE_CONTINUATION_LEGACY)
    ) {
      const conStr = value.slice(-2)
      value = value.slice(0, -2).trimEnd()
      while (await reader.advance()) {
        const nextLine = (await reader.peekLine()) ?? ''
        if (nextLine === '') break
        let next = nextLine.trimStart()
        const keepOpen = next.endsWith(conStr)
        if (keepOpen) next = next.slice(0, -2).trimEnd()
        value = `${value}${value.endsWith(' +') ? LF : ' '}${next}`
        if (!keepOpen) break
      }
    }

    // Pre-process pass macros with full async subs (e.g. quotes) before storeAttribute.
    // The sync _applyAttributeValueSubs inside setAttribute cannot handle async subs.
    if (document && value !== '') {
      const passMatch = value.match(AttributeEntryPassMacroRx)
      if (passMatch) {
        value = await document._applyAttributeEntryValueSubs(value)
        Parser.storeAttribute(match[1], value, document, attributes, {
          skipSubs: true,
        })
        return true
      }
    }

    Parser.storeAttribute(match[1], value, document, attributes)
    return true
  }

  /**
   * Store the attribute in the document.
   * @param {string} name
   * @param {string} value
   * @param {Document|null} [doc=null]
   * @param {Object|null} [attrs=null]
   * @param {Object} [opts={}]
   * @returns {[string, string|null]} Tuple of the resolved name and value.
   */
  static storeAttribute(name, value, doc = null, attrs = null, opts = {}) {
    if (name.endsWith('!')) {
      name = name.slice(0, -1)
      value = null
    } else if (name.startsWith('!')) {
      name = name.slice(1)
      value = null
    }

    name = Parser.sanitizeAttributeName(name)

    if (name === 'numbered') name = 'sectnums'
    else if (name === 'hardbreaks') name = 'hardbreaks-option'
    else if (name === 'showtitle') {
      // Ruby: '' is truthy so `value ? nil : ''` unsets notitle when showtitle is set.
      // In JS, '' is falsy, so we test value !== null instead.
      Parser.storeAttribute('notitle', value !== null ? null : '', doc, attrs)
    }

    if (doc) {
      if (value != null) {
        if (value !== '') {
          if (name === 'leveloffset') {
            const current = parseInt(doc.attr('leveloffset', 0), 10) || 0
            if (value.startsWith('+'))
              value = String(current + parseInt(value.slice(1), 10))
            else if (value.startsWith('-'))
              value = String(current - parseInt(value.slice(1), 10))
          }
        }
        // value === '' means set to empty string (Ruby: '' is truthy → setAttribute path)
        const resolvedValue = doc.setAttribute(name, value, opts.skipSubs)
        if (resolvedValue != null) {
          value = resolvedValue
          if (attrs) new AttributeEntry(name, value).saveTo(attrs)
        }
      } else if (doc.deleteAttribute(name) && attrs) {
        new AttributeEntry(name, value).saveTo(attrs)
      }
    } else if (attrs) {
      new AttributeEntry(name, value).saveTo(attrs)
    }

    return [name, value]
  }

  /**
   * Read paragraph lines.
   * @returns {Promise<string[]>}
   * @internal
   */
  static async readParagraphLines(reader, breakAtList, opts = {}) {
    opts.break_on_blank_lines = true
    opts.break_on_list_continuation = true
    opts.preserve_last_line = true

    // isPlaceholder matches only ListContinuationPlaceholder (empty boxed String), not ListContinuationString ('+').
    // We must not fire on ListContinuationString here because it would be preserved back to the reader,
    // and skipBlankLines would not consume it (String('+') ≠ ''), causing an infinite loop.
    const isPlaceholder = (l) => isListContinuation(l) && String(l) === ''

    let breakCondition = null
    if (breakAtList) {
      breakCondition = Compliance.blockTerminatesParagraph
        ? (l) =>
            isPlaceholder(l) ||
            Parser.isDelimitedBlock(l) ||
            (l.startsWith('[') && BlockAttributeLineRx.test(l)) ||
            AnyListRx.test(l)
        : (l) => isPlaceholder(l) || AnyListRx.test(l)
    } else if (Compliance.blockTerminatesParagraph) {
      breakCondition = (l) =>
        isPlaceholder(l) ||
        (l.startsWith('[') && BlockAttributeLineRx.test(l)) ||
        Parser.isDelimitedBlock(l)
    } else {
      breakCondition = (l) => isPlaceholder(l)
    }

    return await reader.readLinesUntil(opts, breakCondition)
  }

  /**
   * Check if line is the start of a delimited block.
   * @param {string} line
   * @param {boolean} [returnMatchData=false]
   * @returns {{context: string, masq: string[], tip: string, terminator: string}|true|null}
   *   BlockMatchData object if returnMatchData is true, true/null otherwise.
   */
  static isDelimitedBlock(line, returnMatchData = false) {
    let lineLen = line.length
    if (lineLen < 2 || !DELIMITED_BLOCK_HEADS[line.slice(0, 2)]) return null

    let tip, tipLen

    if (lineLen === 2) {
      tip = line
      tipLen = 2
    } else {
      tipLen = lineLen < 5 ? lineLen : 4
      tip = line.slice(0, tipLen)

      // Fenced code special case
      if (Compliance.markdownSyntax && tip.startsWith('`')) {
        if (tipLen === 4) {
          if (tip === '````') return null
          tip = tip.slice(0, 3)
          if (tip !== '```') return null
          // Mirror Ruby: line = tip; line_len = tip_len = 3
          // This ensures the returned terminator is '```', not the full opener line
          // (e.g. '```ruby'), so that readLinesUntil finds the correct closing delimiter.
          line = tip
          lineLen = tipLen = 3
        } else if (tip !== '```') {
          return null
        }
      } else if (tipLen === 3) {
        return null
      }
    }

    const entry = DELIMITED_BLOCKS[tip]
    if (!entry) return null
    const [context, masq] = entry

    const isMatch =
      lineLen === tipLen ||
      (DELIMITED_BLOCK_TAILS[tip] != null &&
        _uniform(line.slice(1), DELIMITED_BLOCK_TAILS[tip], lineLen - 1))
    if (!isMatch) return null

    return returnMatchData ? { context, masq, tip, terminator: line } : true
  }

  /**
   * Resolve the list marker for a list item.
   * @returns {string}
   * @internal
   */
  static resolveListMarker(listType, marker) {
    if (listType === 'ulist') return marker
    if (listType === 'olist') return Parser.resolveOrderedListMarker(marker)[0]
    return '<1>'
  }

  /**
   * Resolve the normalized ordered list marker.
   * @returns {[string]|[string, string]} Tuple of [normalizedMarker] or [normalizedMarker, style].
   * @internal
   */
  static resolveOrderedListMarker(
    marker,
    ordinal = null,
    validate = false,
    reader = null
  ) {
    if (marker.startsWith('.')) return [marker]

    const style = ORDERED_LIST_STYLES.find((s) =>
      OrderedListMarkerRxMap[s].test(marker)
    )
    let normalizedMarker, expected, actual

    switch (style) {
      case 'arabic':
        if (validate) {
          expected = String(ordinal + 1)
          actual = String(parseInt(marker, 10))
        }
        normalizedMarker = '1.'
        break
      case 'loweralpha':
        if (validate) {
          expected = String.fromCharCode(97 + ordinal)
          actual = marker.slice(0, -1)
        }
        normalizedMarker = 'a.'
        break
      case 'upperalpha':
        if (validate) {
          expected = String.fromCharCode(65 + ordinal)
          actual = marker.slice(0, -1)
        }
        normalizedMarker = 'A.'
        break
      case 'lowerroman':
        if (validate) {
          expected = intToRoman(ordinal + 1).toLowerCase()
          actual = marker.slice(0, -1)
        }
        normalizedMarker = 'i)'
        break
      case 'upperroman':
        if (validate) {
          expected = intToRoman(ordinal + 1)
          actual = marker.slice(0, -1)
        }
        normalizedMarker = 'I)'
        break
      default:
        normalizedMarker = marker
    }

    if (ordinal != null) {
      if (validate && expected !== actual) {
        Parser.logger.warn(
          Parser.messageWithContext(
            `list item index: expected ${expected}, got ${actual}`,
            { source_location: reader?.cursor }
          )
        )
      }
      return [normalizedMarker, style]
    }
    return [normalizedMarker]
  }

  /**
   * Resolve the start value for an ordered list.
   * @param {string} marker
   * @returns {number}
   * @internal
   */
  static resolveOrderedListStart(marker) {
    if (marker.startsWith('.')) return 1
    const style = ORDERED_LIST_STYLES.find((s) =>
      OrderedListMarkerRxMap[s].test(marker)
    )
    switch (style) {
      case 'arabic':
        return parseInt(marker, 10)
      case 'loweralpha':
        return marker.slice(0, -1).charCodeAt(0) - 96
      case 'upperalpha':
        return marker.slice(0, -1).charCodeAt(0) - 64
      case 'lowerroman':
        return romanToInt(marker.slice(0, -1).toUpperCase())
      case 'upperroman':
        return romanToInt(marker.slice(0, -1))
      default:
        return 1
    }
  }

  /**
   * Check if this line is a sibling list item.
   * @returns {boolean}
   * @internal
   */
  static isSiblingListItem(line, listType, siblingTrait) {
    if (siblingTrait instanceof RegExp) return siblingTrait.test(line)
    const m = line.match(ListRxMap[listType])
    if (!m) return false
    const resolvedSibling = Parser.resolveListMarker(listType, siblingTrait)
    return resolvedSibling === Parser.resolveListMarker(listType, m[1])
  }

  /**
   * Parse a table.
   * @returns {Promise<Table>}
   * @internal
   */
  static async parseTable(tableReader, parent, attributes) {
    const table = new Table(parent, attributes)

    let explicitColspecs = false
    if ('cols' in attributes) {
      const colspecs = Parser.parseColspecs(attributes.cols)
      if (colspecs.length > 0) {
        table.createColumns(colspecs)
        explicitColspecs = true
      }
    }

    const skipped = (await tableReader.skipBlankLines()) ?? 0
    if ('header-option' in attributes) {
      table.hasHeaderOption = true
    } else if (skipped === 0 && !('noheader-option' in attributes)) {
      table.hasHeaderOption = 'implicit'
    }
    let implicitHeader = table.hasHeaderOption === 'implicit'

    const parserCtx = new Table.ParserContext(tableReader, table, attributes)
    const format = parserCtx.format
    let loopIdx = -1
    let implicitHeaderBoundary = null

    while (true) {
      let line = await tableReader.readLine()
      if (line == null) break

      const beyondFirst = ++loopIdx > 0
      if (beyondFirst && line === '') {
        line = null
        if (implicitHeaderBoundary != null) implicitHeaderBoundary++
      } else if (format === 'psv') {
        if (parserCtx.startsWith(line)) {
          line = line.slice(1)
          await parserCtx.closeOpenCell()
          if (implicitHeaderBoundary != null) implicitHeaderBoundary = null
        } else {
          const [nextCellspec, rest] = Parser.parseCellspec(
            line,
            'start',
            parserCtx.delimiter
          )
          if (nextCellspec != null) {
            await parserCtx.closeOpenCell(nextCellspec)
            if (implicitHeaderBoundary != null) implicitHeaderBoundary = null
          } else if (
            implicitHeaderBoundary != null &&
            implicitHeaderBoundary === loopIdx
          ) {
            table.hasHeaderOption =
              implicitHeader =
              implicitHeaderBoundary =
                null
          }
          line = rest
        }
      }

      if (!beyondFirst) {
        tableReader.mark()
        if (implicitHeader) {
          if (
            (await tableReader.hasMoreLines()) &&
            (await tableReader.peekLine()) === ''
          ) {
            implicitHeaderBoundary = 1
          } else {
            table.hasHeaderOption = implicitHeader = null
          }
        }
      }

      // Inner loop for cell delimiter processing
      while (true) {
        if (line != null) {
          const m = line.match(parserCtx.delimiterRe)
          if (m) {
            const preMatch = line.slice(0, m.index)
            const postMatch = line.slice(m.index + m[0].length)
            if (format === 'csv') {
              if (parserCtx.bufferHasUnclosedQuotes(preMatch)) {
                parserCtx.skipPastDelimiter(preMatch)
                line = postMatch
                if (line === '') break
                continue
              }
              parserCtx.buffer += preMatch
            } else if (format === 'dsv') {
              if (preMatch.endsWith('\\')) {
                parserCtx.skipPastEscapedDelimiter(preMatch)
                if (postMatch === '') {
                  parserCtx.buffer += LF
                  parserCtx.keepCellOpen()
                  break
                }
                line = postMatch
                continue
              }
              parserCtx.buffer += preMatch
            } else {
              if (preMatch.endsWith('\\')) {
                parserCtx.skipPastEscapedDelimiter(preMatch)
                if (postMatch === '') {
                  parserCtx.buffer += LF
                  parserCtx.keepCellOpen()
                  break
                }
                line = postMatch
                continue
              }
              const [nextSpec, cellText] = Parser.parseCellspec(preMatch)
              parserCtx.pushCellspec(nextSpec)
              parserCtx.buffer += cellText
            }
            line = postMatch || null
            await parserCtx.closeCell()
            if (postMatch === '') {
              if (format === 'csv' || format === 'dsv') {
                await parserCtx.closeCell(true)
              } else if (format === 'psv') {
                parserCtx.keepCellOpen()
              }
            }
          } else {
            parserCtx.buffer += line + LF
            if (format === 'csv') {
              if (parserCtx.bufferHasUnclosedQuotes()) {
                if (implicitHeaderBoundary != null && loopIdx === 0) {
                  table.hasHeaderOption =
                    implicitHeader =
                    implicitHeaderBoundary =
                      null
                }
                parserCtx.keepCellOpen()
              } else {
                await parserCtx.closeCell(true)
              }
            } else if (format === 'dsv') {
              await parserCtx.closeCell(true)
            } else {
              parserCtx.keepCellOpen()
            }
            break
          }
        } else {
          // null line = blank line; preserve in buffer so multi-paragraph cells are detected
          if (format === 'psv' && parserCtx.buffer !== '') {
            parserCtx.buffer += LF
            parserCtx.keepCellOpen()
          } else if (format === 'csv' && parserCtx.isCellOpen()) {
            parserCtx.buffer += LF
          }
          break
        }
      }

      if (parserCtx.isCellOpen()) {
        if (!(await tableReader.hasMoreLines())) await parserCtx.closeCell(true)
      } else {
        if ((await tableReader.skipBlankLines()) == null) break
      }
    }

    await parserCtx.closeTable()
    if (
      (table.attributes.colcount ??= table.columns.length) !== 0 &&
      !explicitColspecs
    ) {
      table.assignColumnWidths()
    }
    if (implicitHeader) table.hasHeaderOption = true
    await table.partitionHeaderFooter(attributes)

    return table
  }

  /**
   * Parse column specs.
   * @param {string} records
   * @returns {Object[]}
   * @internal
   */
  static parseColspecs(records) {
    records = records.replace(/ /g, '')
    if (!records) return []
    if (records === String(parseInt(records, 10))) {
      return Array.from({ length: parseInt(records, 10) }, () => ({ width: 1 }))
    }
    const specs = []
    const parts = records.includes(',')
      ? records.split(',')
      : records.split(';')
    for (const record of parts) {
      if (record === '') {
        specs.push({ width: 1 })
      } else {
        const m = record.match(ColumnSpecRx)
        if (!m) continue
        const spec = {}
        if (m[2]) {
          const [colspec, rowspec] = m[2].split('.')
          if (colspec && TableCellHorzAlignments[colspec])
            spec.halign = TableCellHorzAlignments[colspec]
          if (rowspec && TableCellVertAlignments[rowspec])
            spec.valign = TableCellVertAlignments[rowspec]
        }
        spec.width = m[3] ? (m[3] === '~' ? -1 : parseInt(m[3], 10)) : 1
        if (m[4] && TableCellStyles[m[4]]) spec.style = TableCellStyles[m[4]]
        const repeat = m[1] ? parseInt(m[1], 10) : 1
        for (let i = 0; i < repeat; i++) specs.push({ ...spec })
      }
    }
    return specs
  }

  /**
   * Parse cell test from line.
   * @param {string} line
   * @param {'start'|'end'} [pos='end']
   * @param {string|null} [delimiter=null]
   * @returns {[Object|null, string]} Tuple of [test, rest].
   * @internal
   */
  static parseCellspec(line, pos = 'end', delimiter = null) {
    let m,
      rest = ''

    if (pos === 'start') {
      if (!line.includes(delimiter)) return [null, line]
      const delimIdx = line.indexOf(delimiter)
      const specPart = line.slice(0, delimIdx)
      rest = line.slice(delimIdx + delimiter.length)
      m = specPart.match(CellSpecStartRx)
      if (!m) return [null, line]
      if (m[0] === '') return [{}, rest]
      if (specPart.trim() === '') return [null, line]
    } else {
      m = line.match(CellSpecEndRx)
      if (!m) return [{}, line]
      if (m[0].trimStart() === '') return [{}, line.trimEnd()]
      rest = line.slice(0, m.index)
    }

    const spec = {}
    if (m[1]) {
      const [colspec, rowspec] = m[1].split('.')
      const cs = colspec ? parseInt(colspec, 10) : 1
      const rs = rowspec ? parseInt(rowspec, 10) : 1
      if (m[2] === '+') {
        if (cs !== 1) spec.colspan = cs
        if (rs !== 1) spec.rowspan = rs
      } else if (m[2] === '*') {
        if (cs !== 1) spec.repeatcol = cs
      }
    }
    if (m[3]) {
      const [colspec, rowspec] = m[3].split('.')
      if (colspec && TableCellHorzAlignments[colspec])
        spec.halign = TableCellHorzAlignments[colspec]
      if (rowspec && TableCellVertAlignments[rowspec])
        spec.valign = TableCellVertAlignments[rowspec]
    }
    if (m[4] && TableCellStyles[m[4]]) spec.style = TableCellStyles[m[4]]

    return [spec, rest]
  }

  /**
   * Parse the first positional attribute for style, role, id, and options.
   * @param {Object} attributes
   * @param {Reader|null} [reader=null]
   * @returns {string|null} The resolved style value.
   */
  static parseStyleAttribute(attributes, reader = null) {
    const rawStyle = attributes[1]
    if (
      !rawStyle ||
      rawStyle.includes(' ') ||
      !Compliance.shorthandPropertySyntax
    ) {
      return (attributes.style = rawStyle)
    }

    let name = null
    let accum = ''
    const parsed = {}

    for (const c of rawStyle) {
      if (c === '.') {
        Parser._yieldBufferedAttribute(parsed, name, accum, reader)
        accum = ''
        name = 'role'
      } else if (c === '#') {
        Parser._yieldBufferedAttribute(parsed, name, accum, reader)
        accum = ''
        name = 'id'
      } else if (c === '%') {
        Parser._yieldBufferedAttribute(parsed, name, accum, reader)
        accum = ''
        name = 'option'
      } else {
        accum += c
      }
    }

    if (name) {
      Parser._yieldBufferedAttribute(parsed, name, accum, reader)
      if (parsed.style) attributes.style = parsed.style
      if ('id' in parsed) attributes.id = parsed.id
      if ('role' in parsed) {
        const existing = attributes.role
        attributes.role =
          !existing || existing === ''
            ? parsed.role.join(' ')
            : `${existing} ${parsed.role.join(' ')}`
      }
      if ('option' in parsed) {
        for (const opt of parsed.option) attributes[`${opt}-option`] = ''
      }
      return parsed.style ?? null
    }
    return (attributes.style = rawStyle)
  }

  static _yieldBufferedAttribute(attrs, name, value, reader) {
    if (name) {
      if (value === '') {
        const msg = `invalid empty ${name} detected in style attribute`
        if (reader)
          Parser.logger.warn(
            Parser.messageWithContext(msg, {
              source_location: reader.cursorAtPrevLine(),
            })
          )
        else Parser.logger.warn(msg)
      } else if (name === 'id') {
        if ('id' in attrs) {
          const msg = 'multiple ids detected in style attribute'
          if (reader)
            Parser.logger.warn(
              Parser.messageWithContext(msg, {
                source_location: reader.cursorAtPrevLine(),
              })
            )
          else Parser.logger.warn(msg)
        }
        attrs.id = value
      } else {
        ;(attrs[name] ??= []).push(value)
      }
    } else if (value !== '') {
      attrs.style = value
    }
  }

  /**
   * Remove block indentation and optionally expand tabs.
   * @param {string[]} lines - Modified in place.
   * @param {number} [indentSize=0]
   * @param {number} [tabSize=0]
   * @internal
   */
  static adjustIndentation(lines, indentSize = 0, tabSize = 0) {
    if (!lines || lines.length === 0) return

    if (tabSize > 0 && lines.some((l) => l.includes('\t'))) {
      const _tabSpace = ' '.repeat(tabSize)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line === '' || !line.includes('\t')) continue
        let result = ''
        let spacesAdded = 0
        let idx = 0
        for (const c of line) {
          if (c === '\t') {
            const offset = idx + spacesAdded
            const spaces = tabSize - (offset % tabSize) || tabSize
            spacesAdded += spaces - 1
            result += ' '.repeat(spaces)
          } else {
            result += c
          }
          idx++
        }
        lines[i] = result
      }
    }

    if (indentSize < 0) return

    let blockIndent = null
    for (const line of lines) {
      if (String(line) === '') continue
      const lineIndent = line.length - line.trimStart().length
      if (lineIndent === 0) {
        blockIndent = null
        break
      }
      if (blockIndent == null || lineIndent < blockIndent)
        blockIndent = lineIndent
    }

    if (indentSize === 0) {
      if (blockIndent) {
        for (let i = 0; i < lines.length; i++) {
          if (String(lines[i]) !== '' && !isListContinuation(lines[i]))
            lines[i] = lines[i].slice(blockIndent)
        }
      }
    } else {
      const newIndent = ' '.repeat(indentSize)
      for (let i = 0; i < lines.length; i++) {
        if (String(lines[i]) !== '' && !isListContinuation(lines[i])) {
          lines[i] =
            newIndent + (blockIndent ? lines[i].slice(blockIndent) : lines[i])
        }
      }
    }
  }

  /**
   * Check if string is uniform (all same character).
   * @param {string} str
   * @param {string} chr
   * @param {number} len
   * @returns {boolean}
   * @internal
   */
  static uniform(str, chr, len) {
    if (str.length !== len) return false
    for (const c of str) if (c !== chr) return false
    return true
  }

  /**
   * Convert an attribute name to a legal form.
   * @param {string} name
   * @returns {string}
   * @internal
   */
  static sanitizeAttributeName(name) {
    return name
      .replace(new RegExp(InvalidAttributeNameCharsRx.source, 'gu'), '')
      .toLowerCase()
  }
}

// Apply logging mixin to the Parser class itself (static methods use it via singleton)
applyLogging(Parser)

// ── Module-level helpers ──────────────────────────────────────────────────────

function _uniform(str, chr, len) {
  return Parser.uniform(str, chr, len)
}

// Lazy reader resolver to break circular dependency
function _requireReader() {
  return _deps['reader.js'] ?? {}
}
