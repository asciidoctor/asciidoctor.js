// ESM conversion of substitutors.rb
// This module is intended to be mixed into Section and Block via Object.assign(Target.prototype, Substitutors)

import {
  LF,
  ATTR_REF_HEAD,
  HARD_LINE_BREAK,
  INTRINSIC_ATTRIBUTES,
  REPLACEMENTS,
  ReplaceableTextRx,
  QUOTE_SUBS,
  InlinePassMacroRx,
  InlinePassRx,
  InlineStemMacroRx,
  STEM_TYPE_ALIASES,
  InlineKbdBtnMacroRx,
  InlineMenuMacroRx,
  InlineMenuRx,
  InlineImageMacroRx,
  InlineIndextermMacroRx,
  InlineLinkRx,
  UriSniffRx,
  InlineLinkMacroRx,
  InlineEmailRx,
  InlineBiblioAnchorRx,
  InlineAnchorRx,
  InlineXrefMacroRx,
  InlineFootnoteMacroRx,
  HardLineBreakRx,
  CalloutSourceRxMap,
  CalloutSourceRx,
  CalloutExtractRxMap,
  CalloutExtractRx,
  SubModifierSniffRx,
  ASCIIDOC_EXTENSIONS,
  AttributeReferenceRx,
} from './constants.js'
import { Compliance } from './compliance.js'
import { Parser } from './parser.js'
import { asyncReplace, basename, encodeUriComponent, isExtname } from './helpers.js'
import { Inline } from './inline.js'
import { AttributeList } from './attribute_list.js'
import { Document } from './document.js'

// ── Module-level constants ────────────────────────────────────────────────────

const SPECIAL_CHARS_RX = /[<&>]/g
const SPECIAL_CHARS_TR = { '>': '&gt;', '<': '&lt;', '&': '&amp;' }

// Detects if text is a possible candidate for the quotes substitution.
const QUOTED_TEXT_SNIFF_RX = {
  false: /[*_`#^~]/,
  true: /[*'_+#^~]/,
}

const BASIC_SUBS = Object.freeze(['specialcharacters'])
const HEADER_SUBS = Object.freeze(['specialcharacters', 'attributes'])
const NO_SUBS = Object.freeze([])
const NORMAL_SUBS = Object.freeze(['specialcharacters', 'quotes', 'attributes', 'replacements', 'macros', 'post_replacements'])
const REFTEXT_SUBS = Object.freeze(['specialcharacters', 'quotes', 'replacements'])
const VERBATIM_SUBS = Object.freeze(['specialcharacters', 'callouts'])

const SUB_GROUPS = {
  none: NO_SUBS,
  normal: NORMAL_SUBS,
  verbatim: VERBATIM_SUBS,
  specialchars: BASIC_SUBS,
}

const SUB_HINTS = {
  a: 'attributes',
  m: 'macros',
  n: 'normal',
  p: 'post_replacements',
  q: 'quotes',
  r: 'replacements',
  c: 'specialcharacters',
  v: 'verbatim',
}

const SUB_OPTIONS = {
  block: [...Object.keys(SUB_GROUPS), ...NORMAL_SUBS, 'callouts'],
  inline: [...Object.keys(SUB_GROUPS), ...NORMAL_SUBS],
}

// control characters used as placeholders
const CAN = '\u0018'
const DEL = '\u007f'

// SPA, start of guarded protected area (\u0096)
const PASS_START = '\u0096'

// EPA, end of guarded protected area (\u0097)
const PASS_END = '\u0097'

// match passthrough slot
const PASS_SLOT_RX = new RegExp(`${PASS_START}(\\d+)${PASS_END}`, 'g')

// fix passthrough slot after syntax highlighting
const HIGHLIGHTED_PASS_SLOT_RX = new RegExp(
  `<span\\b[^>]*>${PASS_START}</span>[^\\d]*(\\d+)[^\\d]*<span\\b[^>]*>${PASS_END}</span>`,
  'g'
)

const RS = '\\'
const R_SB = ']'
const ESC_R_SB = '\\]'
const PLUS = '+'

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Ruby `str.slice(start, length)` → JS `str.substr(start, length)`.
 * Provided here for readability in complex gsub callbacks.
 */
function rslice(str, start, len) {
  return str.substr(start, len)
}

/**
 * Ruby `str.partition(delim)` → `[before, delim, after]` (first occurrence).
 * Returns `[str, '', '']` when delim is not found.
 */
function partition(str, delim) {
  const idx = str.indexOf(delim)
  if (idx === -1) return [str, '', '']
  return [str.slice(0, idx), delim, str.slice(idx + delim.length)]
}

/**
 * Array union (Ruby `arr | other`).
 */
function arrayUnion(a, b) {
  const set = new Set(a)
  for (const v of b) set.add(v)
  return [...set]
}

/**
 * Array intersection (Ruby `arr & other`): elements of a that appear in b, deduplicated,
 * preserving the order from a with first occurrence winning.
 */
function arrayIntersect(a, b) {
  const allowed = new Set(b)
  const seen = new Set()
  return a.filter((v) => {
    if (!allowed.has(v) || seen.has(v)) return false
    seen.add(v)
    return true
  })
}

/**
 * Array difference (Ruby `arr - other`).
 */
function arrayDiff(a, b) {
  const set = new Set(b)
  return a.filter((v) => !set.has(v))
}

/**
 * Make a regex global if it isn't already.
 */
function globalRx(rx) {
  return rx.global ? rx : new RegExp(rx.source, rx.flags + 'g')
}

// ── Substitutors mixin ────────────────────────────────────────────────────────

export const Substitutors = {
  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Apply the specified substitutions to the text.
   *
   * @param {string|string[]} text - The text to process; must not be null.
   * @param {string[]} [subs=NORMAL_SUBS] - The substitutions to perform.
   * @returns {string|string[]} Text with substitutions applied.
   */
  async applySubs(text, subs = NORMAL_SUBS) {
    const isEmpty = Array.isArray(text) ? text.length === 0 : text.length === 0
    if (isEmpty || !subs || subs.length === 0) return text

    const isMultiline = Array.isArray(text)
    if (isMultiline) {
      text = text.length > 1 ? text.join(LF) : text[0]
    }

    let passthrus
    let clearPassthrus = false

    if (subs.includes('macros')) {
      text = this.extractPassthroughs(text)
      if (this.passthroughs.length > 0) {
        passthrus = this.passthroughs
        // placeholders can move around; only clear in the outermost substitution call
        if (!this.passthroughsLocked) {
          this.passthroughsLocked = true
          clearPassthrus = true
        }
      }
    }

    for (const type of subs) {
      switch (type) {
        case 'specialcharacters':
          text = this.subSpecialchars(text)
          break
        case 'quotes':
          text = await this.subQuotes(text)
          break
        case 'attributes':
          if (text.includes(ATTR_REF_HEAD)) text = this.subAttributes(text)
          break
        case 'replacements':
          text = this.subReplacements(text)
          break
        case 'macros':
          text = await this.subMacros(text)
          break
        case 'highlight':
          text = await this.highlightSource(text, subs.includes('callouts'))
          break
        case 'callouts':
          if (!subs.includes('highlight')) text = await this.subCallouts(text)
          break
        case 'post_replacements':
          text = await this.subPostReplacements(text)
          break
        default:
          this.logger.warn(`unknown substitution type ${type}`)
      }
    }

    if (passthrus) {
      text = await this.restorePassthroughs(text)
      if (clearPassthrus) {
        passthrus.length = 0
        this.passthroughsLocked = null
      }
    }

    return isMultiline ? text.split(LF) : text
  },

  /** Apply normal substitutions (alias for applySubs with default args). */
  async applyNormalSubs(text) {
    return this.applySubs(text, NORMAL_SUBS)
  },

  /** Apply substitutions for header metadata and attribute assignments.
   * Header subs are 'specialcharacters' + 'attributes', both of which are
   * purely synchronous operations — so this method is intentionally sync
   * to allow it to be called from synchronous contexts such as setAttribute()
   * and the {set:...} directive inside subAttributes(). */
  applyHeaderSubs(text) {
    return this.subAttributes(this.subSpecialchars(text))
  },

  /** Apply substitutions for titles (alias for applySubs). */
  async applyTitleSubs(text, subs = NORMAL_SUBS) {
    return this.applySubs(text, subs)
  },

  /** Apply substitutions for reftext. */
  async applyReftextSubs(text) {
    return this.applySubs(text, REFTEXT_SUBS)
  },

  /**
   * Substitute special characters (encode XML entities).
   *
   * @param {string} text
   * @returns {string}
   */
  subSpecialchars(text) {
    if (text.includes('>') || text.includes('&') || text.includes('<')) {
      return text.replace(SPECIAL_CHARS_RX, (ch) => SPECIAL_CHARS_TR[ch])
    }
    return text
  },

  /** Alias for subSpecialchars. */
  subSpecialcharacters(text) {
    return this.subSpecialchars(text)
  },

  /**
   * Substitute quoted text (emphasis, strong, monospaced, etc.)
   *
   * @param {string} text
   * @returns {string}
   */
  async subQuotes(text) {
    const compat = this.document.compatMode
    if (QUOTED_TEXT_SNIFF_RX[compat].test(text)) {
      for (const [type, scope, pattern] of QUOTE_SUBS[compat]) {
        text = await asyncReplace(text, globalRx(pattern), async (...args) => {
          return this.convertQuotedText(args, type, scope)
        })
      }
    }
    return text
  },

  /**
   * Substitute attribute references in the specified text.
   *
   * @param {string} text
   * @param {Object} [opts={}]
   * @returns {string}
   */
  subAttributes(text, opts = {}) {
    const docAttrs = this.document.attributes
    let drop = false
    let dropLine = false
    let dropLineSeverity = null
    let dropEmptyLine = false
    let attributeUndefined = null
    let attributeMissing = null

    text = text.replace(globalRx(AttributeReferenceRx), (match, p1, p2, p3, p4) => {
      // escaped attribute → return unescaped
      if (p1 === RS || p4 === RS) {
        return `{${p2}}`
      }

      if (p3) {
        const args = p2.split(':', 3)
        const directive = args.shift()
        if (directive === 'set') {
          const [, value] = Parser.storeAttribute(args[0], args[1] || '', this.document)
          if (value !== null && value !== undefined ||
              (attributeUndefined ||= (docAttrs['attribute-undefined'] || Compliance.attributeUndefined)) !== 'drop-line') {
            drop = true
            dropEmptyLine = true
            return DEL
          } else {
            drop = true
            dropLine = true
            return CAN
          }
        } else if (directive === 'counter2') {
          this.document.counter(...args)
          drop = true
          dropEmptyLine = true
          return DEL
        } else {
          // 'counter'
          return this.document.counter(...args)
        }
      }

      const key = p2.toLowerCase()
      if (Object.prototype.hasOwnProperty.call(docAttrs, key)) {
        return docAttrs[key]
      }

      const intrinsicValue = INTRINSIC_ATTRIBUTES[key]
      if (intrinsicValue !== undefined) return intrinsicValue

      switch (attributeMissing ||= (opts.attributeMissing || docAttrs['attribute-missing'] || Compliance.attributeMissing)) {
        case 'drop':
          drop = true
          dropEmptyLine = true
          return DEL
        case 'drop-line':
          dropLineSeverity ||= opts.dropLineSeverity || 'info'
          if (dropLineSeverity === 'info') {
            this.logger.info(`dropping line containing reference to missing attribute: ${key}`)
          }
          drop = true
          dropLine = true
          return CAN
        case 'warn':
          this.logger.warn(`skipping reference to missing attribute: ${key}`)
          return match
        default: // 'skip'
          return match
      }
    })

    if (drop) {
      if (dropEmptyLine) {
        const lines = text.replace(new RegExp(`${DEL}+`, 'g'), DEL).split(LF)
        if (dropLine) {
          return lines
            .filter((line) => line !== DEL && line !== CAN && !line.startsWith(CAN) && !line.includes(CAN))
            .join(LF)
            .split(DEL).join('')
        } else {
          return lines
            .filter((line) => line !== DEL)
            .join(LF)
            .split(DEL).join('')
        }
      } else if (text.includes(LF)) {
        return text.split(LF).filter((line) => line !== CAN && !line.startsWith(CAN) && !line.includes(CAN)).join(LF)
      } else {
        // When the caller sets returnDropSentinel, return null to signal that the line was
        // dropped due to a *missing* attribute (as opposed to an attribute that simply has a
        // blank value).  This lets callers distinguish the two cases without changing the
        // general contract of subAttributes for every other call-site.
        return opts.returnDropSentinel ? null : ''
      }
    }

    return text
  },

  /**
   * Substitute replacement characters (copyright, trademark, etc.)
   *
   * @param {string} text
   * @returns {string}
   */
  subReplacements(text) {
    if (ReplaceableTextRx.test(text)) {
      for (const [pattern, replacement, restore] of REPLACEMENTS) {
        text = text.replace(globalRx(pattern), (...args) => {
          return this.doReplacement(args, replacement, restore)
        })
      }
    }
    return text
  },

  /**
   * Substitute inline macros (links, images, etc.)
   *
   * @param {string} text
   * @returns {string}
   */
  async subMacros(text) {
    const foundSquareBracket = text.includes('[')
    const foundColon = text.includes(':')
    const foundMacroish = foundSquareBracket && foundColon
    const foundMacroishShort = foundMacroish && text.includes(':[')
    const doc = this.document
    const docAttrs = doc.attributes

    // Extension inline macros
    const extensions = doc.extensions
    if (extensions && extensions.inlineMacros()) {
      for (const extension of extensions.inlineMacros()) {
        text = await asyncReplace(text, globalRx(extension.instance.regexp), async (...args) => {
          const match = args[0]
          if (match.startsWith(RS)) return match.slice(1)

          const groups = typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null
            ? args[args.length - 1]
            : null
          let target, content
          if (!groups || Object.keys(groups).length === 0) {
            target = args[1]
            content = args[2]
          } else {
            target = groups.target ?? null
            content = groups.content ?? null
          }

          const extConfig = extension.config
          const defaultAttrs = extConfig.defaultAttrs
          const attributes = defaultAttrs ? { ...defaultAttrs } : {}

          if (content !== null && content !== undefined) {
            if (!content) {
              if (extConfig.contentModel !== 'attributes') attributes.text = content
            } else {
              content = this.normalizeText(content, true, true)
              if (extConfig.contentModel === 'attributes') {
                await this.parseAttributes(content, extConfig.positionalAttrs || extConfig.posAttrs || [], { into: attributes })
              } else {
                attributes.text = content
              }
            }
            target = target ?? (extConfig.format === 'short' ? content : null)
          }

          const replacement = extension.processMethod(this, target, attributes)
          if (replacement instanceof Inline) {
            const inlineSubs = replacement.attributes.subs
            if (inlineSubs) {
              const expandedSubs = this.expandSubs(inlineSubs, 'custom inline macro')
              if (expandedSubs) replacement.text = await this.applySubs(replacement.text, expandedSubs)
              delete replacement.attributes.subs
            }
            return replacement.convert()
          } else if (replacement) {
            this.logger.info(`expected substitution value for custom inline macro to be of type Inline; got ${replacement.constructor.name}: ${match}`)
            return replacement
          }
          return ''
        })
      }
    }

    // kbd / btn macros (experimental)
    if (docAttrs.experimental !== undefined) {
      if (foundMacroishShort && (text.includes('kbd:') || text.includes('btn:'))) {
        text = await asyncReplace(text, globalRx(InlineKbdBtnMacroRx), async (match, p1, p2, p3) => {
          if (p1) return match.slice(1)
          if (p2 === 'kbd') {
            let keys = p3.trim()
            if (keys.includes(R_SB)) keys = keys.split(ESC_R_SB).join(R_SB)
            if (keys.length > 1) {
              let delimIdx = keys.indexOf(',', 1)
              const plusIdx = keys.indexOf('+', 1)
              if (delimIdx !== -1 && plusIdx !== -1) delimIdx = Math.min(delimIdx, plusIdx)
              else if (delimIdx === -1) delimIdx = plusIdx

              if (delimIdx !== -1) {
                const delim = keys.charAt(delimIdx)
                if (keys.endsWith(delim)) {
                  keys = keys.slice(0, -1).split(delim).map((k) => k.trim())
                  keys[keys.length - 1] += delim
                } else {
                  keys = keys.split(delim).map((k) => k.trim())
                }
              } else {
                keys = [keys]
              }
            } else {
              keys = [keys]
            }
            return new Inline(this, 'kbd', null, { attributes: { keys } }).convert()
          } else {
            // btn
            return new Inline(this, 'button', this.normalizeText(p3, true, true)).convert()
          }
        })
      }

      if (foundMacroish && text.includes('menu:')) {
        text = await asyncReplace(text, globalRx(InlineMenuMacroRx), async (match, p1, p2) => {
          if (match.startsWith(RS)) return match.slice(1)
          const menu = p1
          let submenus, menuitem
          if (p2) {
            let items = p2.includes(R_SB) ? p2.split(ESC_R_SB).join(R_SB) : p2
            let delim = null
            if (items.includes('&gt;')) delim = '&gt;'
            else if (items.includes(',')) delim = ','
            if (delim) {
              const parts = items.split(delim).map((item) => item.trim())
              menuitem = parts.pop()
              submenus = parts
            } else {
              submenus = []
              menuitem = items.trimEnd()
            }
          } else {
            submenus = []
            menuitem = null
          }
          return new Inline(this, 'menu', null, { attributes: { menu, submenus, menuitem } }).convert()
        })
      }

      if (text.includes('"') && text.includes('&gt;')) {
        text = await asyncReplace(text, globalRx(InlineMenuRx), async (match, p1) => {
          if (match.startsWith(RS)) return match.slice(1)
          const parts = p1.split('&gt;').map((item) => item.trim())
          const menu = parts.shift()
          const menuitem = parts.pop() ?? null
          const submenus = parts
          return new Inline(this, 'menu', null, { attributes: { menu, submenus, menuitem } }).convert()
        })
      }
    }

    // image / icon macros
    if (foundMacroish && (text.includes('image:') || text.includes('icon:'))) {
      text = await asyncReplace(text, globalRx(InlineImageMacroRx), async (match, p1, p2) => {
        if (match.startsWith(RS)) return match.slice(1)
        let type, posattrs
        if (match.startsWith('icon:')) {
          type = 'icon'
          posattrs = ['size']
        } else {
          type = 'image'
          posattrs = ['alt', 'width', 'height']
        }
        const target = p1
        const attrs = await this.parseAttributes(p2, posattrs, { unescapeInput: true })
        let id
        if (type !== 'icon') {
          id = attrs.id
          doc.register('images', target)
          attrs.imagesdir = attrs.imagesdir ?? docAttrs.imagesdir
        }
        attrs.alt = attrs.alt ?? (attrs['default-alt'] = basename(target, true).replace(/[_-]/g, ' '))
        return new Inline(this, 'image', null, { type, target, id, attributes: attrs }).convert()
      })
    }

    // index terms
    if ((text.includes('((') && text.includes('))')) || (foundMacroishShort && text.includes('dexterm'))) {
      text = await asyncReplace(text, globalRx(InlineIndextermMacroRx), async (match, p1, p2, p3) => {
        switch (p1) {
          case 'indexterm': {
            if (match.startsWith(RS)) return match.slice(1)
            let attrlist = this.normalizeText(p2, true, true)
            let attrs
            if (attrlist.includes('=')) {
              const parsed = await new AttributeList(attrlist, this).parse()
              const primary = parsed[1]
              if (primary) {
                const terms = [primary]
                const secondary = parsed[2]
                if (secondary) {
                  terms.push(secondary)
                  const tertiary = parsed[3]
                  if (tertiary) terms.push(tertiary)
                }
                attrs = { ...parsed, terms }
                if (attrs['see-also']) {
                  const seeAlso = attrs['see-also']
                  attrs['see-also'] = seeAlso.includes(',') ? seeAlso.split(',').map((s) => s.trimStart()) : [seeAlso]
                }
              } else {
                attrs = { terms: attrlist }
              }
            } else {
              attrs = { terms: this.splitSimpleCsv(attrlist) }
            }
            return new Inline(this, 'indexterm', null, { attributes: attrs }).convert()
          }
          case 'indexterm2': {
            if (match.startsWith(RS)) return match.slice(1)
            let term = this.normalizeText(p2, true, true)
            let attrs = null
            if (term.includes('=')) {
              const parsed = await new AttributeList(term, this).parse()
              term = parsed[1] || term
              if (parsed[1]) {
                attrs = parsed
                if (attrs['see-also']) {
                  attrs['see-also'] = attrs['see-also'].includes(',')
                    ? attrs['see-also'].split(',').map((s) => s.trimStart())
                    : [attrs['see-also']]
                }
              } else {
                attrs = null
              }
            }
            return new Inline(this, 'indexterm', term, { attributes: attrs, type: 'visible' }).convert()
          }
          default: {
            let enclText = p3
            let visible = true, before = null, after = null
            if (match.startsWith(RS)) {
              if (enclText.startsWith('(') && enclText.endsWith(')')) {
                enclText = enclText.slice(1, -1)
                visible = true
                before = '('
                after = ')'
              } else {
                return match.slice(1)
              }
            } else {
              if (enclText.startsWith('(')) {
                if (enclText.endsWith(')')) {
                  enclText = enclText.slice(1, -1)
                  visible = false
                } else {
                  enclText = enclText.slice(1)
                  before = '('
                  after = ''
                }
              } else if (enclText.endsWith(')')) {
                enclText = enclText.slice(0, -1)
                before = ''
                after = ')'
              }
            }
            let subbed_term
            if (visible) {
              let term = this.normalizeText(enclText, true)
              let attrs = null
              if (term.includes(';&')) {
                if (term.includes(' &gt;&gt; ')) {
                  const [t, , see] = partition(term, ' &gt;&gt; ')
                  term = t
                  attrs = { see }
                } else if (term.includes(' &amp;&gt; ')) {
                  const parts = term.split(' &amp;&gt; ')
                  term = parts.shift()
                  attrs = { 'see-also': parts }
                }
              }
              subbed_term = await new Inline(this, 'indexterm', term, { attributes: attrs, type: 'visible' }).convert()
            } else {
              const attrs = {}
              let terms = this.normalizeText(enclText, true)
              if (terms.includes(';&')) {
                if (terms.includes(' &gt;&gt; ')) {
                  const [t, , see] = partition(terms, ' &gt;&gt; ')
                  terms = t
                  attrs.see = see
                } else if (terms.includes(' &amp;&gt; ')) {
                  const parts = terms.split(' &amp;&gt; ')
                  terms = parts.shift()
                  attrs['see-also'] = parts
                }
              }
              attrs.terms = this.splitSimpleCsv(terms)
              subbed_term = await new Inline(this, 'indexterm', null, { attributes: attrs }).convert()
            }
            return before !== null ? `${before}${subbed_term}${after}` : subbed_term
          }
        }
      })
    }

    // inline URLs
    if (foundColon && text.includes('://')) {
      text = await asyncReplace(text, globalRx(InlineLinkRx), async (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        if (p2 && p5 == null) {
          if (p1.startsWith(RS)) return match.slice(1)
          if (p3.startsWith(RS)) return p1 + match.slice(p1.length + 1)
          if (!p6) return match
          const target = p3 + p6
          doc.register('links', target)
          const linkText = docAttrs['hide-uri-scheme'] !== undefined ? target.replace(UriSniffRx, '') : target
          return new Inline(this, 'anchor', linkText, { type: 'link', target, attributes: { role: 'bare' } }).convert()
        } else {
          if (p3.startsWith(RS)) return p1 + match.slice(p1.length + 1)
          let prefix = p1
          let target = p3 + (p4 || p7 || '')
          let suffix = ''

          if (p5 != null) {
            if (prefix === 'link:') prefix = ''
            const rawLinkText = p5
            var link_text = rawLinkText || null
          } else {
            switch (prefix) {
              case 'link:':
              case '"':
              case "'":
                return match
            }
            switch (p8) {
              case ';':
                target = target.slice(0, -1)
                if (target.endsWith(')')) {
                  target = target.slice(0, -1)
                  suffix = ');'
                } else {
                  suffix = ';'
                }
                if (target === p3) return match
                break
              case ':':
                target = target.slice(0, -1)
                if (target.endsWith(')')) {
                  target = target.slice(0, -1)
                  suffix = '):'
                } else {
                  suffix = ':'
                }
                if (target === p3) return match
                break
            }
            var link_text = null
          }

          const linkOpts = { type: 'link' }
          let attrs = null
          let bare = false

          if (link_text !== null) {
            let newLinkText = link_text.includes(R_SB) ? link_text.split(ESC_R_SB).join(R_SB) : link_text
            link_text = newLinkText

            if (!doc.compatMode && link_text.includes('=')) {
              const [extractedText, extractedAttrs] = await this.extractAttributesFromText(link_text, '')
              link_text = extractedText
              newLinkText = extractedText
              attrs = extractedAttrs
              linkOpts.id = attrs?.id
            }

            if (link_text.endsWith('^')) {
              newLinkText = link_text = link_text.slice(0, -1)
              if (attrs) {
                attrs.window = attrs.window ?? '_blank'
              } else {
                attrs = { window: '_blank' }
              }
            }

            if (newLinkText !== null && newLinkText !== undefined && newLinkText === '') {
              link_text = docAttrs['hide-uri-scheme'] !== undefined ? target.replace(UriSniffRx, '') : target
              bare = true
            }
          } else {
            link_text = docAttrs['hide-uri-scheme'] !== undefined ? target.replace(UriSniffRx, '') : target
            bare = true
          }

          if (bare) {
            if (attrs) {
              attrs.role = ('role' in (attrs || {})) ? `bare ${attrs.role}` : 'bare'
            } else {
              attrs = { role: 'bare' }
            }
          }

          linkOpts.target = target
          doc.register('links', target)
          if (attrs) linkOpts.attributes = attrs
          return `${prefix}${await new Inline(this, 'anchor', link_text, linkOpts).convert()}${suffix}`
        }
      })
    }

    // link: and mailto: macros
    if (foundMacroish && (text.includes('link:') || text.includes('ilto:'))) {
      text = await asyncReplace(text, globalRx(InlineLinkMacroRx), async (match, p1, p2, p3) => {
        if (match.startsWith(RS)) return match.slice(1)
        let target, mailtoText
        if (p1) {
          mailtoText = p2
          target = 'mailto:' + mailtoText
        } else {
          target = p2
        }

        let attrs = null
        const linkOpts = { type: 'link' }
        let linkText = p3

        if (linkText) {
          linkText = linkText.includes(R_SB) ? linkText.split(ESC_R_SB).join(R_SB) : linkText
          if (p1) {
            if (!doc.compatMode && linkText.includes(',')) {
              const [extractedText, extractedAttrs] = await this.extractAttributesFromText(linkText, '')
              linkText = extractedText
              attrs = extractedAttrs
              linkOpts.id = attrs?.id
              if (attrs?.[2]) {
                if (attrs[3]) {
                  target = `${target}?subject=${encodeUriComponent(attrs[2])}&amp;body=${encodeUriComponent(attrs[3])}`
                } else {
                  target = `${target}?subject=${encodeUriComponent(attrs[2])}`
                }
              }
            }
          } else if (!doc.compatMode && linkText.includes('=')) {
            const [extractedText, extractedAttrs] = await this.extractAttributesFromText(linkText, '')
            linkText = extractedText
            attrs = extractedAttrs
            linkOpts.id = attrs?.id
          }

          if (linkText.endsWith('^')) {
            linkText = linkText.slice(0, -1)
            if (attrs) {
              attrs.window = attrs.window ?? '_blank'
            } else {
              attrs = { window: '_blank' }
            }
          }
        }

        if (!linkText) {
          if (p1) {
            linkText = mailtoText
          } else {
            if (docAttrs['hide-uri-scheme'] !== undefined) {
              linkText = target.replace(UriSniffRx, '') || target
            } else {
              linkText = target
            }
            if (attrs) {
              attrs.role = ('role' in attrs) ? `bare ${attrs.role}` : 'bare'
            } else {
              attrs = { role: 'bare' }
            }
          }
        }

        linkOpts.target = target
        doc.register('links', target)
        if (attrs) linkOpts.attributes = attrs
        return new Inline(this, 'anchor', linkText, linkOpts).convert()
      })
    }

    // bare email addresses
    if (text.includes('@')) {
      text = await asyncReplace(text, globalRx(InlineEmailRx), async (match, p1) => {
        if (p1) return p1 === RS ? match.slice(1) : match
        const address = match
        const target = 'mailto:' + address
        doc.register('links', target)
        return new Inline(this, 'anchor', address, { type: 'link', target }).convert()
      })
    }

    // bibliography anchor
    if (foundSquareBracket && this.context === 'list_item' && this.parent.style === 'bibliography') {
      text = await asyncReplace(text, InlineBiblioAnchorRx, async (match, p1, p2) => {
        return new Inline(this, 'anchor', p2, { type: 'bibref', id: p1 }).convert()
      })
    }

    // inline anchors
    if ((foundSquareBracket && text.includes('[[')) || (foundMacroish && text.includes('or:'))) {
      text = await asyncReplace(text, globalRx(InlineAnchorRx), async (match, p1, p2, p3, p4, p5) => {
        if (p1) return match.slice(1)
        let id, reftext
        if (p2) {
          id = p2
          reftext = p3
        } else {
          id = p4
          reftext = p5 ? (p5.includes(R_SB) ? p5.split(ESC_R_SB).join(R_SB) : p5) : null
        }
        return new Inline(this, 'anchor', reftext, { type: 'ref', id }).convert()
      })
    }

    // xref macros
    if ((text.includes('&') && text.includes(';&l')) || (foundMacroish && text.includes('xref:'))) {
      text = await asyncReplace(text, globalRx(InlineXrefMacroRx), async (match, p1, p2, p3) => {
        if (match.startsWith(RS)) return match.slice(1)
        const attrs = {}
        let refid, linkText, macro, path, fragment, target, src2src

        if (p1) {
          refid = p1
          if (refid.includes(',')) {
            const commaIdx = refid.indexOf(',')
            const rawLinkText = refid.slice(commaIdx + 1).trimStart()
            refid = refid.slice(0, commaIdx)
            linkText = rawLinkText || null
          }
        } else {
          macro = true
          refid = p2
          if (p3) {
            linkText = p3.includes(R_SB) ? p3.split(ESC_R_SB).join(R_SB) : p3
            if (!doc.compatMode && linkText.includes('=')) {
              const [extractedText, extractedAttrs] = await this.extractAttributesFromText(linkText)
              linkText = extractedText
              Object.assign(attrs, extractedAttrs)
            }
          }
        }

        if (doc.compatMode) {
          fragment = refid
        } else {
          const hashIdx = refid.indexOf('#')
          if (hashIdx !== -1 && (hashIdx === 0 || refid[hashIdx - 1] !== '&')) {
            if (hashIdx > 0) {
              const fragmentLen = refid.length - 1 - hashIdx
              if (fragmentLen > 0) {
                path = refid.slice(0, hashIdx)
                fragment = refid.slice(hashIdx + 1)
              } else {
                path = refid.slice(0, -1)
              }
              if (macro) {
                if (path.endsWith('.adoc')) {
                  src2src = path = path.slice(0, -5)
                } else if (!isExtname(path)) {
                  src2src = path
                }
              } else if (Object.keys(ASCIIDOC_EXTENSIONS).some((ext) => path.endsWith(ext))) {
                src2src = path = path.slice(0, path.lastIndexOf('.'))
              } else {
                src2src = path
              }
            } else {
              target = refid
              fragment = refid.slice(1)
            }
          } else if (macro) {
            if (refid.endsWith('.adoc')) {
              src2src = path = refid.slice(0, -5)
            } else if (isExtname(refid)) {
              path = refid
            } else {
              fragment = refid
            }
          } else {
            fragment = refid
          }
        }

        if (target) {
          // handles: #id
          refid = fragment
          if (this.logger.isInfo?.() && !doc.catalog.refs[refid]) {
            this.logger.info(`possible invalid reference: ${refid}`)
          }
        } else if (path) {
          if (src2src && (doc.attributes.docname === path || doc.catalog.includes[path])) {
            if (fragment) {
              refid = fragment
              path = null
              target = `#${fragment}`
              if (this.logger.isInfo?.() && !doc.catalog.refs[refid]) {
                this.logger.info(`possible invalid reference: ${refid}`)
              }
            } else {
              refid = null
              path = null
              target = '#'
            }
          } else {
            const relfileprefix = doc.attributes.relfileprefix || ''
            const relfilesuffix = src2src
              ? (doc.attributes.relfilesuffix ?? doc.outfilesuffix)
              : ''
            const resolvedPath = `${relfileprefix}${path}${relfilesuffix}`
            refid = path
            path = resolvedPath
            if (fragment) {
              refid = `${refid}#${fragment}`
              target = `${path}#${fragment}`
            } else {
              target = path
            }
          }
        } else if (doc.compatMode || !Compliance.naturalXrefs) {
          refid = fragment
          target = `#${fragment}`
          if (this.logger.isInfo?.() && !doc.catalog.refs[refid]) {
            this.logger.info(`possible invalid reference: ${refid}`)
          }
        } else if (doc.catalog.refs[fragment]) {
          refid = fragment
          target = `#${fragment}`
        } else if ((fragment.includes(' ') || fragment.toLowerCase() !== fragment) && (refid = await doc.resolveId(fragment))) {
          fragment = refid
          target = `#${refid}`
        } else {
          refid = fragment
          target = `#${fragment}`
          if (this.logger.isInfo?.()) this.logger.info(`possible invalid reference: ${refid}`)
        }

        if (path != null) attrs.path = path
        if (fragment != null) attrs.fragment = fragment
        attrs.refid = refid
        return new Inline(this, 'anchor', linkText, { type: 'xref', target, attributes: attrs }).convert()
      })
    }

    // footnote macros
    if (foundMacroish && text.includes('tnote')) {
      text = await asyncReplace(text, globalRx(InlineFootnoteMacroRx), async (match, p1, p2, p3) => {
        if (match.startsWith(RS)) return match.slice(1)

        let id, content, type, target
        if (p1) {
          // footnoteref
          if (p3) {
            const commaIdx = p3.indexOf(',')
            if (commaIdx >= 0) {
              id = p3.slice(0, commaIdx)
              content = p3.slice(commaIdx + 1)
            } else {
              // reference only (no text), e.g. footnoteref:[id]
              id = p3
            }
            if (!doc.compatMode) {
              this.logger.warn(`found deprecated footnoteref macro: ${match}; use footnote macro with target instead`)
            }
          } else {
            return match
          }
        } else {
          id = p2
          content = p3
        }

        let index
        if (id) {
          const footnote = doc.footnotes.find((f) => f.id === id)
          if (footnote) {
            index = footnote.index
            content = footnote.text
            type = 'xref'
            target = id
            id = null
          } else if (content) {
            content = await this.restorePassthroughs(this.normalizeText(content, true, true))
            index = doc.counter('footnote-number')
            doc.register('footnotes', new Document.Footnote(index, id, content))
            type = 'ref'
            target = null
          } else {
            this.logger.warn(`invalid footnote reference: ${id}`)
            type = 'xref'
            target = id
            content = id
            id = null
          }
        } else if (content) {
          content = await this.restorePassthroughs(this.normalizeText(content, true, true))
          index = doc.counter('footnote-number')
          doc.register('footnotes', new Document.Footnote(index, id, content))
          type = null
          target = null
        } else {
          return match
        }

        return new Inline(this, 'footnote', content, {
          attributes: { index },
          id,
          target,
          type,
        }).convert()
      })
    }

    return text
  },

  /**
   * Substitute post replacements (hard line breaks).
   *
   * @param {string} text
   * @returns {string}
   */
  async subPostReplacements(text) {
    if ('hardbreaks-option' in this.attributes || 'hardbreaks-option' in this.document.attributes) {
      const lines = text.split(LF)
      if (lines.length < 2) return text
      const last = lines.pop()
      const converted = await Promise.all(lines.map((line) =>
        new Inline(
          this,
          'break',
          line.endsWith(HARD_LINE_BREAK) ? line.slice(0, -2) : line,
          { type: 'line' }
        ).convert()
      ))
      return [...converted, last].join(LF)
    } else if (text.includes(PLUS) && text.includes(HARD_LINE_BREAK)) {
      return asyncReplace(text, globalRx(HardLineBreakRx), async (match, p1) => {
        return new Inline(this, 'break', p1, { type: 'line' }).convert()
      })
    }
    return text
  },

  /**
   * Apply verbatim substitutions on source.
   *
   * @param {string} source
   * @param {boolean} processCallouts
   * @returns {string}
   */
  async subSource(source, processCallouts) {
    return processCallouts
      ? await this.subCallouts(this.subSpecialchars(source))
      : this.subSpecialchars(source)
  },

  /**
   * Substitute callout source references.
   *
   * @param {string} text
   * @returns {string}
   */
  async subCallouts(text) {
    const calloutRx = this.hasAttr('line-comment')
      ? CalloutSourceRxMap[this.attr('line-comment')]
      : CalloutSourceRx
    let autonum = 0
    return asyncReplace(text, globalRx(calloutRx), async (match, p1, p2, p3, p4) => {
      if (p2) {
        return match.replace(RS, '')
      }
      const guard = p1 || (p3 === '--' ? ['<!--', '-->'] : null)
      const numeral = p4 === '.' ? String(++autonum) : p4
      return new Inline(this, 'callout', numeral, {
        id: this.document.callouts.readNextId(),
        attributes: { guard },
      }).convert()
    })
  },

  /**
   * Highlight (colorize) the source code using a syntax highlighter.
   *
   * @param {string} source
   * @param {boolean} processCallouts
   * @returns {string}
   */
  async highlightSource(source, processCallouts) {
    const syntaxHl = this.document.syntaxHighlighter
    if (!syntaxHl || !syntaxHl.highlight()) {
      return this.subSource(source, processCallouts)
    }

    let calloutMarks
    if (processCallouts) {
      ;[source, calloutMarks] = this.extractCallouts(source)
    }

    const docAttrs = this.document.attributes
    const syntaxHlName = syntaxHl.name
    let linenumsMode = null
    let startLineNumber = null
    if (this.hasOption('linenums')) {
      linenumsMode = (docAttrs[`${syntaxHlName}-linenums-mode`] || 'table')
      startLineNumber = parseInt(this.getAttribute('start', 1), 10)
      if (startLineNumber < 1) startLineNumber = 1
    }

    let highlightLines = null
    if (this.hasAttr('highlight')) {
      highlightLines = this.resolveLinesToHighlight(source, this.getAttribute('highlight'), startLineNumber)
    }

    const [highlighted, sourceOffset] = syntaxHl.highlight(this, source, this.getAttribute('language'), {
      callouts: calloutMarks,
      cssMode: (docAttrs[`${syntaxHlName}-css`] || 'class'),
      highlightLines,
      numberLines: linenumsMode,
      startLineNumber,
      style: docAttrs[`${syntaxHlName}-style`],
    })

    let result = highlighted
    if (this.passthroughs.length > 0) {
      result = result.replace(globalRx(HIGHLIGHTED_PASS_SLOT_RX), `${PASS_START}$1${PASS_END}`)
    }

    if (!calloutMarks || Object.keys(calloutMarks).length === 0) {
      return result
    }
    return await this.restoreCallouts(result, calloutMarks, sourceOffset)
  },

  /**
   * Resolve line numbers to highlight from a spec string.
   *
   * @param {string} source
   * @param {string} spec   - e.g. "1-5, !2, 10" or "1..5;!2;10"
   * @param {number|null} [start=null]
   * @returns {number[]}
   */
  resolveLinesToHighlight(source, spec, start = null) {
    let lines = []
    if (spec.includes(' ')) spec = spec.split(' ').join('')
    const entries = spec.includes(',') ? spec.split(',') : spec.split(';')

    for (let entry of entries) {
      let negate = false
      if (entry.startsWith('!')) {
        entry = entry.slice(1)
        negate = true
      }
      const delim = entry.includes('..') ? '..' : (entry.includes('-') ? '-' : null)
      if (delim) {
        const [fromStr, , toStr] = partition(entry, delim)
        const from = parseInt(fromStr, 10)
        let to = (!toStr || (to = parseInt(toStr, 10)) < 0) ? (source.split(LF).length + 1) : to
        if (typeof to === 'string') to = parseInt(to, 10)
        const range = Array.from({ length: to - from + 1 }, (_, i) => from + i)
        if (negate) {
          lines = arrayDiff(lines, range)
        } else {
          lines = arrayUnion(lines, range)
        }
      } else if (negate) {
        const val = parseInt(entry, 10)
        lines = lines.filter((l) => l !== val)
      } else {
        const line = parseInt(entry, 10)
        if (!lines.includes(line)) lines.push(line)
      }
    }

    if (start) {
      const shift = start - 1
      if (shift !== 0) lines = lines.map((l) => l - shift)
    }

    return lines.sort((a, b) => a - b)
  },

  /**
   * Extract passthrough text for reinsertion after processing.
   *
   * @param {string} text
   * @returns {string} Text with passthrough regions replaced by placeholders.
   */
  extractPassthroughs(text) {
    const compatMode = this.document.compatMode
    const passthrus = this.passthroughs

    if (text.includes('++') || text.includes('$$') || text.includes('ss:')) {
      text = text.replace(globalRx(InlinePassMacroRx), (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        const boundary = p4 // $$, ++, or +++
        if (boundary) {
          // skip ++ in compat mode
          if (compatMode && boundary === '++') {
            const prefix = p2 ? `${p1}[${p2}]${p3}` : `${p1}${p3}`
            return `${prefix}++${this.extractPassthroughs(p5)}++`
          }

          let attributes, oldBehavior, preceding
          if (p2) {
            const attrlist = p2
            const escapeCount = p3.length
            if (escapeCount > 0) {
              return `${p1}[${attrlist}]${RS.repeat(escapeCount - 1)}${boundary}${p5}${boundary}`
            } else if (p1 === RS) {
              preceding = `[${attrlist}]`
            } else if (boundary === '++') {
              if (attrlist === 'x-') {
                oldBehavior = true
                attributes = {}
              } else if (attrlist.endsWith(' x-')) {
                oldBehavior = true
                attributes = this.parseQuotedTextAttributes(attrlist.slice(0, -3))
              } else {
                attributes = this.parseQuotedTextAttributes(attrlist)
              }
            } else {
              attributes = this.parseQuotedTextAttributes(attrlist)
            }
          } else {
            const escapeCount = p3.length
            if (escapeCount > 0) {
              return `${RS.repeat(escapeCount - 1)}${boundary}${p5}${boundary}`
            }
          }

          const subs = boundary === '+++' ? [] : [...BASIC_SUBS]
          let passthruKey
          if (attributes) {
            if (oldBehavior) {
              passthrus[passthruKey = passthrus.length] = { text: p5, subs: NORMAL_SUBS, type: 'monospaced', attributes }
            } else {
              passthrus[passthruKey = passthrus.length] = { text: p5, subs, type: 'unquoted', attributes }
            }
          } else {
            passthrus[passthruKey = passthrus.length] = { text: p5, subs }
          }
          return `${preceding || ''}${PASS_START}${passthruKey}${PASS_END}`
        } else {
          // pass:[]
          if (p6 === RS) return match.slice(1)
          let passthruKey
          if (p7) {
            passthrus[passthruKey = passthrus.length] = {
              text: this.normalizeText(p8, null, true),
              subs: this.resolvePassSubs(p7),
            }
          } else {
            passthrus[passthruKey = passthrus.length] = { text: this.normalizeText(p8, null, true) }
          }
          return `${PASS_START}${passthruKey}${PASS_END}`
        }
      })
    }

    const [passInlineChar1, passInlineChar2, passInlineRx] = InlinePassRx[compatMode]

    if (text.includes(passInlineChar1) || (passInlineChar2 && text.includes(passInlineChar2))) {
      text = text.replace(globalRx(passInlineRx), (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
        const preceding = p1
        const attrlist = p4 || p3
        const escaped = !!p5
        const quotedText = p6
        const formatMark = p7
        const content = p8

        let oldBehavior, oldBehaviorForced, attributes

        if (compatMode) {
          oldBehavior = true
        } else if (attrlist && (attrlist === 'x-' || attrlist.endsWith(' x-'))) {
          oldBehavior = true
          oldBehaviorForced = true
        }

        if (attrlist) {
          if (escaped) {
            return `${preceding}[${attrlist}]${quotedText.slice(1)}`
          } else if (preceding === RS) {
            if (oldBehaviorForced && formatMark === '`') {
              return `${preceding}[${attrlist}]${quotedText}`
            }
            if (compatMode && formatMark === '`') {
              // escaped role in compat-mode: role becomes literal text, backtick span still processed as monospaced
              let passthruKey
              passthrus[passthruKey = passthrus.length] = { text: content, subs: BASIC_SUBS, type: 'monospaced' }
              return `[${attrlist}]${PASS_START}${passthruKey}${PASS_END}`
            }
            return `[${attrlist}]${quotedText}`  // preceding replaced by attrlist form
          } else if (oldBehaviorForced) {
            attributes = attrlist === 'x-' ? {} : this.parseQuotedTextAttributes(attrlist.slice(0, -3))
          } else {
            attributes = this.parseQuotedTextAttributes(attrlist)
          }
        } else if (escaped) {
          return `${preceding}${quotedText.slice(1)}`
        } else if (compatMode && preceding === RS) {
          return quotedText
        }

        let passthruKey
        if (compatMode) {
          passthrus[passthruKey = passthrus.length] = { text: content, subs: BASIC_SUBS, attributes, type: 'monospaced' }
        } else if (attributes) {
          if (oldBehavior) {
            const subs = formatMark === '`' ? BASIC_SUBS : NORMAL_SUBS
            passthrus[passthruKey = passthrus.length] = { text: content, subs, attributes, type: 'monospaced' }
          } else {
            passthrus[passthruKey = passthrus.length] = { text: content, subs: BASIC_SUBS, attributes, type: 'unquoted' }
          }
        } else {
          passthrus[passthruKey = passthrus.length] = { text: content, subs: BASIC_SUBS }
        }

        return `${preceding || ''}${PASS_START}${passthruKey}${PASS_END}`
      })
    }

    // stem macros (in a subsequent step to allow escaping by the former)
    if (text.includes(':') && (text.includes('stem:') || text.includes('math:'))) {
      text = text.replace(globalRx(InlineStemMacroRx), (match, p1, p2, p3) => {
        if (match.startsWith(RS)) return match.slice(1)
        let type = p1
        if (type === 'stem') {
          type = STEM_TYPE_ALIASES[this.document.attributes.stem]
        }
        let content = this.normalizeText(p3, null, true)
        if (type === 'latexmath' && content.startsWith('$') && content.endsWith('$')) {
          content = content.slice(1, -1)
        }
        const subs = p2
          ? this.resolvePassSubs(p2, 'stem macro')
          : (this.document.basebackend('html') ? BASIC_SUBS : null)
        const passthruKey = passthrus.length
        passthrus[passthruKey] = { text: content, subs, type }
        return `${PASS_START}${passthruKey}${PASS_END}`
      })
    }

    return text
  },

  /**
   * Restore passthrough text by reinserting into placeholder positions.
   *
   * @param {string} text
   * @returns {string}
   */
  async restorePassthroughs(text) {
    if (!text.includes(PASS_START)) return text
    const passthrus = this.passthroughs
    return asyncReplace(text, globalRx(PASS_SLOT_RX), async (match, p1) => {
      const pass = passthrus[parseInt(p1, 10)]
      if (pass) {
        let subbedText = await this.applySubs(pass.text, pass.subs)
        const type = pass.type
        if (type) {
          const attributes = pass.attributes
          const id = attributes?.id
          subbedText = await new Inline(this, 'quoted', subbedText, { type, id, attributes }).convert()
        }
        return subbedText.includes(PASS_START) ? this.restorePassthroughs(subbedText) : subbedText
      } else {
        this.logger.error(`unresolved passthrough detected: ${text}`)
        return '??pass??'
      }
    })
  },

  /**
   * Resolve the list of comma-delimited subs against the possible options.
   *
   * @param {string} subs
   * @param {'block'|'inline'} [type='block']
   * @param {string[]|null} [defaults=null]
   * @param {string|null} [subject=null]
   * @returns {string[]|undefined}
   */
  resolveSubs(subs, type = 'block', defaults = null, subject = null) {
    if (!subs || subs.length === 0) return undefined
    let candidates = null
    if (subs.includes(' ')) subs = subs.split(' ').join('')
    const modifiersPresent = SubModifierSniffRx.test(subs)

    for (let key of subs.split(',')) {
      let modifierOperation = null
      if (modifiersPresent) {
        const first = key.charAt(0)
        if (first === '+') {
          modifierOperation = 'append'
          key = key.slice(1)
        } else if (first === '-') {
          modifierOperation = 'remove'
          key = key.slice(1)
        } else if (key.endsWith('+')) {
          modifierOperation = 'prepend'
          key = key.slice(0, -1)
        }
      }

      let resolvedKeys
      if (type === 'inline' && (key === 'verbatim' || key === 'v')) {
        resolvedKeys = BASIC_SUBS
      } else if (key in SUB_GROUPS) {
        resolvedKeys = SUB_GROUPS[key]
      } else if (type === 'inline' && key.length === 1 && key in SUB_HINTS) {
        const resolvedKey = SUB_HINTS[key]
        resolvedKeys = SUB_GROUPS[resolvedKey] || [resolvedKey]
      } else {
        resolvedKeys = [key]
      }

      if (modifierOperation) {
        candidates = candidates ?? (defaults ? [...defaults] : [])
        switch (modifierOperation) {
          case 'append':
            candidates = [...candidates, ...resolvedKeys]
            break
          case 'prepend':
            candidates = [...resolvedKeys, ...candidates]
            break
          case 'remove':
            candidates = arrayDiff(candidates, resolvedKeys)
            break
        }
      } else {
        candidates = candidates ?? []
        candidates = [...candidates, ...resolvedKeys]
      }
    }

    if (!candidates) return undefined

    // weed out invalid options and remove duplicates (order preserved; first occurrence wins)
    const resolved = arrayIntersect(candidates, SUB_OPTIONS[type])
    const invalid = arrayDiff(candidates, resolved)
    if (invalid.length > 0) {
      this.logger.warn(
        `invalid substitution type${invalid.length > 1 ? 's' : ''}${subject ? ' for ' : ''}${subject || ''}: ${invalid.join(', ')}`
      )
    }
    return resolved
  },

  /** Call resolveSubs for the 'block' type. */
  resolveBlockSubs(subs, defaults, subject) {
    return this.resolveSubs(subs, 'block', defaults, subject)
  },

  /** Call resolveSubs for the 'inline' type with subject set as passthrough macro. */
  resolvePassSubs(subs, subject = 'passthrough macro') {
    return this.resolveSubs(subs, 'inline', null, subject)
  },

  /**
   * Expand all groups in the subs list and return.
   *
   * @param {string|string[]} subs
   * @param {string|null} [subject=null]
   * @returns {string[]|null}
   */
  expandSubs(subs, subject = null) {
    if (typeof subs === 'string') {
      // subs is a single key name
      if (subs === 'none') return null
      return SUB_GROUPS[subs] || [subs]
    } else if (Array.isArray(subs)) {
      const expandedSubs = []
      for (const key of subs) {
        if (key !== 'none') {
          const subGroup = SUB_GROUPS[key]
          if (subGroup) {
            expandedSubs.push(...subGroup)
          } else {
            expandedSubs.push(key)
          }
        }
      }
      return expandedSubs.length === 0 ? null : expandedSubs
    } else {
      return this.resolveSubs(subs, 'inline', null, subject)
    }
  },

  /**
   * Commit the requested substitutions to this block.
   * Looks for an attribute named "subs". If present, resolves substitutions.
   */
  commitSubs() {
    let defaultSubs = this.defaultSubs
    if (!defaultSubs) {
      switch (this.contentModel) {
        case 'simple':
          defaultSubs = NORMAL_SUBS
          break
        case 'verbatim':
          defaultSubs = this.context === 'verse' ? NORMAL_SUBS : VERBATIM_SUBS
          break
        case 'raw':
          defaultSubs = this.context === 'stem' ? BASIC_SUBS : NO_SUBS
          break
        default:
          return this.subs
      }
    }

    const customSubs = this.attributes.subs
    if (customSubs) {
      this.subs = this.resolveBlockSubs(customSubs, defaultSubs, this.context) || []
    } else {
      this.subs = [...defaultSubs]
    }

    if (
      this.context === 'listing' &&
      this.style === 'source' &&
      this.document.syntaxHighlighter?.highlight()
    ) {
      const idx = this.subs.indexOf('specialcharacters')
      if (idx !== -1) this.subs[idx] = 'highlight'
    }

    return null
  },

  /**
   * Parse attributes in name or name=value format from a comma-separated String.
   *
   * @param {string} attrlist
   * @param {string[]} [posattrs=[]]
   * @param {Object} [opts={}]
   * @returns {Object}
   */
  async parseAttributes(attrlist, posattrs = [], opts = {}) {
    if (!attrlist || attrlist.length === 0) return {}
    if (opts.unescapeInput) attrlist = this.normalizeText(attrlist, true, true)
    if ((opts.subInput || opts.sub_input) && attrlist.includes(ATTR_REF_HEAD)) {
      attrlist = this.document.subAttributes(attrlist)
    }
    const block = (opts.subResult || opts.sub_result) ? this : null
    const al = new AttributeList(attrlist, block)
    if (opts.into) {
      return al.parseInto(opts.into, posattrs)
    }
    return al.parse(posattrs)
  },

  // ── Private methods ────────────────────────────────────────────────────────

  async extractAttributesFromText(text, defaultText = null) {
    const attrlist = text.includes(LF) ? text.split(LF).join(' ') : text
    const attrs = await new AttributeList(attrlist, this).parse()
    const resolvedText = attrs[1]
    if (resolvedText != null) {
      if (resolvedText === attrlist) {
        Object.keys(attrs).forEach((k) => delete attrs[k])
        return [text, attrs]
      }
      return [resolvedText, attrs]
    }
    return [defaultText, attrs]
  },

  extractCallouts(source) {
    const calloutMarks = {}
    let autonum = 0
    let lineno = 0
    let lastLineno = null
    const calloutRx = this.hasAttr('line-comment')
      ? CalloutExtractRxMap[this.attr('line-comment')]
      : CalloutExtractRx

    const lines = source.split(LF).map((line) => {
      lineno++
      return line.replace(globalRx(calloutRx), (match, p1, p2, p3, p4) => {
        if (p2) {
          return match.replace(RS, '')
        }
        const guard = p1 || (p3 === '--' ? ['<!--', '-->'] : null)
        const numeral = p4 === '.' ? String(++autonum) : p4
        ;(calloutMarks[lineno] = calloutMarks[lineno] || []).push([guard, numeral])
        lastLineno = lineno
        return ''
      })
    })

    let result = lines.join(LF)
    if (lastLineno !== null) {
      if (lastLineno === lineno) result = `${result}${LF}`
    } else {
      return [result, null]
    }
    return [result, calloutMarks]
  },

  async restoreCallouts(source, calloutMarks, sourceOffset = null) {
    let preamble = ''
    if (sourceOffset !== null) {
      preamble = source.slice(0, sourceOffset)
      source = source.slice(sourceOffset)
    }
    let lineno = 0
    const result = await Promise.all(source.split(LF).map(async (line) => {
      const conums = calloutMarks[++lineno]
      if (conums) {
        delete calloutMarks[lineno]
        if (conums.length === 1) {
          const [guard, numeral] = conums[0]
          return `${line}${await new Inline(this, 'callout', numeral, {
            id: this.document.callouts.readNextId(),
            attributes: { guard },
          }).convert()}`
        } else {
          const converted = await Promise.all(conums.map(([guard, numeral]) =>
            new Inline(this, 'callout', numeral, {
              id: this.document.callouts.readNextId(),
              attributes: { guard },
            }).convert()
          ))
          return `${line}${converted.join(' ')}`
        }
      }
      return line
    }))
    return preamble + result.join(LF)
  },

  async convertQuotedText(args, type, scope) {
    // args: [fullMatch, group1, group2, ...]
    const fullMatch = args[0]
    if (fullMatch.startsWith(RS)) {
      if (scope === 'constrained') {
        const attrs = args[2]
        if (attrs) {
          return `[${attrs}]${await new Inline(this, 'quoted', args[3], { type }).convert()}`
        }
      }
      return fullMatch.slice(1)
    }

    if (scope === 'constrained') {
      const attrlist = args[2]
      let id, attributes
      if (attrlist) {
        attributes = this.parseQuotedTextAttributes(attrlist)
        id = attributes.id
        if (type === 'mark') type = 'unquoted'
      }
      return `${args[1] || ''}${await new Inline(this, 'quoted', args[3], { type, id, attributes }).convert()}`
    } else {
      const attrlist = args[1]
      let id, attributes
      if (attrlist) {
        attributes = this.parseQuotedTextAttributes(attrlist)
        id = attributes.id
        if (type === 'mark') type = 'unquoted'
      }
      return new Inline(this, 'quoted', args[2], { type, id, attributes }).convert()
    }
  },

  doReplacement(match, replacement, restore) {
    const captured = match[0]
    if (captured.includes(RS)) {
      return captured.replace(RS, '')
    }
    switch (restore) {
      case 'none':
        return replacement
      case 'bounding':
        return match[1] + replacement + match[2]
      default: // 'leading'
        return match[1] + replacement
    }
  },

  /** Inserts text into a formatted text enclosure (sprintf). */
  subPlaceholder(format, ...args) {
    let i = 0
    return format.replace(/%s/g, () => String(args[i++] ?? ''))
  },

  parseQuotedTextAttributes(str) {
    if (str.includes(ATTR_REF_HEAD)) str = this.subAttributes(str)
    // for compliance, only consider first positional attribute
    if (str.includes(',')) str = str.slice(0, str.indexOf(','))
    str = str.trim()
    if (!str) return {}
    if ((str.startsWith('.') || str.startsWith('#')) && Compliance.shorthandPropertySyntax) {
      const [before, , after] = partition(str, '#')
      const attrs = {}
      if (!after) {
        if (before.length > 1) attrs.role = before.slice(1).split('.').join(' ').trimStart()
      } else {
        const [id, , roles] = partition(after, '.')
        if (id) attrs.id = id
        if (!roles) {
          if (before.length > 1) attrs.role = before.slice(1).split('.').join(' ').trimStart()
        } else if (before.length > 1) {
          attrs.role = (before + '.' + roles).slice(1).split('.').join(' ').trimStart()
        } else {
          attrs.role = roles.split('.').join(' ')
        }
      }
      return attrs
    }
    return { role: str }
  },

  normalizeText(text, normalizeWhitespace = null, unescapeClosingSquareBrackets = null) {
    if (text && text.length > 0) {
      if (normalizeWhitespace) text = text.trim().split(LF).join(' ')
      if (unescapeClosingSquareBrackets && text.includes(R_SB)) {
        text = text.split(ESC_R_SB).join(R_SB)
      }
    }
    return text
  },

  splitSimpleCsv(str) {
    if (!str || str.length === 0) return []
    if (str.includes('"')) {
      const values = []
      let accum = ''
      let quoteOpen = false
      for (const c of str) {
        if (c === ',') {
          if (quoteOpen) {
            accum += c
          } else {
            values.push(accum.trim())
            accum = ''
          }
        } else if (c === '"') {
          quoteOpen = !quoteOpen
        } else {
          accum += c
        }
      }
      values.push(accum.trim())
      return values
    }
    return str.split(',').map((item) => item.trim())
  },
}

export {
  BASIC_SUBS,
  HEADER_SUBS,
  NO_SUBS,
  NORMAL_SUBS,
  REFTEXT_SUBS,
  VERBATIM_SUBS,
  SUB_GROUPS,
  SUB_HINTS,
  SUB_OPTIONS,
  CAN,
  DEL,
  PASS_START,
  PASS_END,
  PASS_SLOT_RX,
  HIGHLIGHTED_PASS_SLOT_RX,
  RS,
  R_SB,
  ESC_R_SB,
  PLUS,
  SPECIAL_CHARS_RX,
  SPECIAL_CHARS_TR,
  QUOTED_TEXT_SNIFF_RX,
}

// Apply the Substitutors mixin to AbstractNode so that all nodes (Document,
// Section, Block, etc.) have subSpecialchars, subAttributes, etc. available.
import { AbstractNode } from './abstract_node.js'
Object.assign(AbstractNode.prototype, Substitutors)