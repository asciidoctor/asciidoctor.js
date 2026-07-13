// ESM port of converter/semantic_html5.rb (upstream feature/html-converter-next branch)
//
// A built-in converter that generates HTML 5 output that maximizes the use of
// semantic constructs (registered for the 'semantic-html5' backend).
//
// Ruby-to-JavaScript notes:
//   - Date._parse(revdate) → _parseRevdate() (lightweight month-name/ISO parser
//     that extracts year/month/day parts the same way the fixtures expect)
//   - in_context 'author' → this._convertContext array (same push/pop protocol)
//   - node.attr? → node.hasAttribute(), node.option? → node.hasOption()
//   - node.title? → node.hasTitle(), node.header? → node.hasHeader()
//   - node.notitle / node.noheader → node.isNotitle() / node.isNoheader()
//   - doctitle partition: true → node.doctitle({ partition: true, sanitize: true })
//   - node.sub_replacements / node.sub_macros → node.subReplacements() / await node.subMacros()
//   - syntax_hl.format returns the full markup, so it is not re-wrapped in <pre>
//     (fixes an upstream WIP oversight)

import { ConverterBase } from '../converter.js'
import { LF } from '../constants.js'

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

// ── SemanticHtml5Converter ────────────────────────────────────────────────────

export default class SemanticHtml5Converter extends ConverterBase {
  /**
   * Create a new SemanticHtml5Converter instance.
   * @param {string} [backend='semantic-html5']
   * @param {Object} [opts={}]
   * @returns {SemanticHtml5Converter}
   */
  static create(backend = 'semantic-html5', opts = {}) {
    return new this(backend, opts)
  }

  constructor(backend, opts = {}) {
    super(backend, opts)
    const syntax = opts.htmlsyntax === 'xml' ? 'xml' : 'html'
    this.initBackendTraits({
      basebackend: 'html',
      filetype: 'html',
      htmlsyntax: syntax,
      outfilesuffix: '.html',
      supportsTemplates: true,
    })
  }

  async convert_embedded(node) {
    const result = []
    const header = await this._generateHeader(node)
    if (header) result.push(header)
    result.push(await node.content())
    return result.join(LF)
  }

  async convert_section(node) {
    const docAttrs = node.document.attributes
    let title
    let sectionNumbering
    if (node.caption) {
      title = node.captionedTitle()
    } else if ((sectionNumbering = this._generateSectionNumbering(node))) {
      title = `${sectionNumbering} ${node.title}`
    } else {
      title = node.title
    }
    const id = node.id
    if (docAttrs.sectlinks != null) {
      title = `<a class="link" href="#${id}">${title}</a>`
    }
    if (docAttrs.sectanchors != null) {
      if (docAttrs.sectanchors === 'after') {
        title = `${title}<a class="anchor" href="#${id}"></a>`
      } else {
        title = `<a class="anchor" href="#${id}"></a>${title}`
      }
    }
    const attributes = this._commonHtmlAttributes(id, node.role)
    const level = node.level
    const result = []
    result.push(`<section${attributes}>`)
    result.push(`<h${level + 1}>${title}</h${level + 1}>`)
    if (node.hasBlocks()) result.push(await node.content())
    result.push('</section>')
    return result.join(LF)
  }

  async convert_paragraph(node) {
    const attributes = this._commonHtmlAttributes(node.id, node.role)
    if (node.hasTitle()) {
      return `<p${attributes}>
<strong class="title">${node.title}</strong>
${await node.content()}
</p>`
    }
    return `<p${attributes}>
${await node.content()}
</p>`
  }

  async convert_listing(node) {
    const caption = node.caption
      ? `<span class="label">${node.caption}</span> `
      : ''
    const title = node.hasTitle()
      ? `<figcaption>${caption}${node.title}</figcaption>\n`
      : ''
    const attributes = this._commonHtmlAttributes(node.id, node.role, 'listing')
    const nowrap =
      node.hasOption('nowrap') || !node.document.hasAttribute('prewrap')
    let content
    if (node.style === 'source') {
      const lang = node.getAttribute('language')
      const syntaxHl = node.document.syntaxHighlighter
      if (syntaxHl) {
        let opts
        if (syntaxHl.handlesHighlighting()) {
          const docAttrs = node.document.attributes
          opts = {
            css_mode: docAttrs[`${syntaxHl.name}-css`] || 'class',
            style: docAttrs[`${syntaxHl.name}-style`],
          }
        } else {
          opts = {}
        }
        opts.nowrap = nowrap
        return `<figure${attributes}>
${title}${await syntaxHl.format(node, lang, opts)}
</figure>`
      }
      content = `<code${lang ? ` data-lang="${lang}"` : ''}>${(await node.content()) || ''}</code>`
    } else {
      content = (await node.content()) || ''
    }
    return `<figure${attributes}>
${title}<pre${nowrap ? ' class="nowrap"' : ''}>${content}</pre>
</figure>`
  }

  async convert_thematic_break(_node) {
    return '<hr>'
  }

  async convert_image(node) {
    const roles = []
    if (node.role) roles.push(node.role)
    if (node.hasAttribute('align'))
      roles.push(`text-${node.getAttribute('align')}`)
    if (node.hasAttribute('float')) roles.push(node.getAttribute('float'))
    const role = roles.join(' ')
    const attributes = this._commonHtmlAttributes(node.id, role || null)
    const size = `${
      node.hasAttribute('width') ? ` width="${node.getAttribute('width')}"` : ''
    }${node.hasAttribute('height') ? ` height="${node.getAttribute('height')}"` : ''}`
    const target = node.getAttribute('target')
    const src = await node.imageUri(target)
    const linkStart = node.hasAttribute('link')
      ? `<a href="${node.getAttribute('link')}">`
      : ''
    const linkEnd = node.hasAttribute('link') ? '</a>' : ''

    if (node.hasTitle()) {
      return `<figure${attributes}>
${linkStart}<img src="${src}" alt="${this._encodeAttributeValue(node.alt())}"${size} />${linkEnd}
<figcaption>${node.captionedTitle()}</figcaption>
</figure>`
    }
    return `${linkStart}<img src="${src}" alt="${this._encodeAttributeValue(node.alt())}"${attributes}${size} />${linkEnd}`
  }

  async convert_inline_image(node) {
    const roles = []
    if (node.role) roles.push(node.role)
    if (node.hasAttribute('align'))
      roles.push(`text-${node.getAttribute('align')}`)
    if (node.hasAttribute('float')) roles.push(node.getAttribute('float'))
    const role = roles.join(' ')
    const attributes = this._commonHtmlAttributes(node.id, role || null)
    const size = `${
      node.hasAttribute('width') ? ` width="${node.getAttribute('width')}"` : ''
    }${node.hasAttribute('height') ? ` height="${node.getAttribute('height')}"` : ''}`
    const src = await node.imageUri(node.target)
    const title = node.hasAttribute('title')
      ? ` title="${node.getAttribute('title')}"`
      : ''
    return `<img src="${src}" alt="${this._encodeAttributeValue(node.alt)}"${title}${attributes}${size} />`
  }

  async convert_inline_anchor(node) {
    switch (node.type) {
      case 'link': {
        const attrs = node.id ? [` id="${node.id}"`] : []
        if (node.role) attrs.push(` class="${node.role}"`)
        if (node.hasAttribute('title'))
          attrs.push(` title="${node.getAttribute('title')}"`)
        return `<a href="${node.target}"${this._appendLinkConstraintAttrs(node, attrs).join('')}>${node.text}</a>`
      }
      default:
        this.logger.warn(`unknown anchor type: ${node.type}`)
        return null
    }
  }

  async convert_inline_kbd(node) {
    const keys = node.getAttribute('keys')
    if (keys.length === 1) {
      return `<kbd>${keys[0]}</kbd>`
    }
    return `<span class="keyseq"><kbd>${keys.join('</kbd>+<kbd>')}</kbd></span>`
  }

  async convert_inline_quoted(node) {
    let attributes = this._commonHtmlAttributes(node.id, node.role)
    switch (node.type) {
      case 'strong':
        return `<strong${attributes}>${node.text}</strong>`
      case 'emphasis':
        return `<em${attributes}>${node.text}</em>`
      case 'monospaced':
        return `<code${attributes}>${node.text}</code>`
      case 'mark':
        return `<mark${attributes}>${node.text}</mark>`
      case 'superscript':
        return `<sup${attributes}>${node.text}</sup>`
      case 'subscript':
        return `<sub${attributes}>${node.text}</sub>`
      case 'single':
        attributes = this._commonHtmlAttributes(
          node.id,
          node.role,
          'singlequote'
        )
        return `<span${attributes}>&#8216;${node.text}&#8217;</span>`
      case 'double':
        attributes = this._commonHtmlAttributes(
          node.id,
          node.role,
          'doublequote'
        )
        return `<span${attributes}>&#8220;${node.text}&#8221;</span>`
      default:
        return `<span${attributes}>${node.text}</span>`
    }
  }

  async convert_inline_break(node) {
    return `${node.text}<br>`
  }

  async convert_inline_button(node) {
    return `<span class="button">${node.text}</span>`
  }

  async convert_inline_menu(node) {
    const caret = '&#160;<b class="caret">&#8250;</b> '
    const submenuJoiner = `</b>${caret}<b class="submenu">`
    const menu = node.getAttribute('menu')
    const submenus = node.getAttribute('submenus')
    if (submenus.length === 0) {
      const menuitem = node.getAttribute('menuitem')
      if (menuitem) {
        return `<span class="menuseq"><b class="menu">${menu}</b>${caret}<b class="menuitem">${menuitem}</b></span>`
      }
      return `<span class="menuseq"><b class="menu">${menu}</b></span>`
    }
    return `<span class="menuseq"><b class="menu">${menu}</b>${caret}<b class="submenu">${submenus.join(submenuJoiner)}</b>${caret}<b class="menuitem">${node.getAttribute('menuitem')}</b></span>`
  }

  // ── Header generation ───────────────────────────────────────────────────────

  _generateSectionNumbering(node) {
    const level = node.level
    const docAttrs = node.document.attributes

    if (!(node.numbered && level <= parseInt(docAttrs.sectnumlevels || 3, 10)))
      return null

    if (level < 2 && node.document.doctype === 'book') {
      let signifier
      switch (node.sectname) {
        case 'chapter':
          signifier = docAttrs['chapter-signifier']
          return `${signifier ? `${signifier} ` : ''}<span class="sectnum">${node.sectnum()}</span>`
        case 'part':
          signifier = docAttrs['part-signifier']
          return `${signifier ? `${signifier} ` : ''}<span class="sectnum">${node.sectnum(null, ':')}</span>`
        default:
          return `<span class="sectnum">${node.sectnum()}</span>`
      }
    }
    return `<span class="sectnum">${node.sectnum()}</span>`
  }

  async _generateHeader(node) {
    if (!(node.hasHeader() && !node.isNoheader())) return null

    const result = ['<header>']
    const doctitle = this._generateDocumentTitle(node)
    if (doctitle) result.push(doctitle)
    const authors = await this._generateAuthors(node)
    if (authors) result.push(authors)
    const revision = this._generateRevision(node)
    if (revision) result.push(revision)
    result.push('</header>')
    return result.join(LF)
  }

  _generateDocumentTitle(node) {
    if (node.isNotitle()) return null

    const doctitle = node.doctitle({ partition: true, sanitize: true })
    const attributes = this._commonHtmlAttributes(node.id, node.role)
    return `<h1${attributes}>${doctitle.main}${doctitle.hasSubtitle() ? ` <small class="subtitle">${doctitle.subtitle}</small>` : ''}</h1>`
  }

  async _generateAuthors(node) {
    const authors = node.authors()
    if (authors.length === 0) return null

    if (authors.length === 1) {
      return `<p class="byline">
${await this._formatAuthor(node, authors[0])}
</p>`
    }
    const result = ['<ul class="byline">']
    for (const author of authors) {
      result.push(`<li>${await this._formatAuthor(node, author)}</li>`)
    }
    result.push('</ul>')
    return result.join(LF)
  }

  _generateRevision(node) {
    if (
      !(
        node.hasAttribute('revnumber') ||
        node.hasAttribute('revdate') ||
        node.hasAttribute('revremark')
      )
    )
      return null

    let revisionDate = ''
    const revdate = node.getAttribute('revdate')
    if (revdate) {
      const dateParts = this._parseRevdate(revdate)
      revisionDate = dateParts.length
        ? `<time datetime="${dateParts.join('-')}">${revdate}</time>`
        : revdate
    }
    return `<table class="revision">
<thead>
<tr>
<th>Version</th>
<th>Date</th>
<th>Remark</th>
</tr>
</thead>
<tbody>
<tr>
<td data-title="${node.getAttribute('version-label') ?? ''}">${node.getAttribute('revnumber') ?? ''}</td>
<td data-title="Date">${revisionDate}</td>
<td data-title="Remark">${node.getAttribute('revremark') ?? ''}</td>
</tr>
</tbody>
</table>`
  }

  async _formatAuthor(node, author) {
    return this._inContext('author', async () => {
      const email = author.email ? ` ${await node.subMacros(author.email)}` : ''
      return `<span class="author">${node.subReplacements(author.name)}${email}</span>`
    })
  }

  async _inContext(name, callback) {
    ;(this._convertContext ??= []).push(name)
    const result = await callback()
    this._convertContext.pop()
    return result
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Extract year/month/day parts from a free-form revision date, mirroring the
   * behavior of Ruby's Date._parse for the formats used in the test fixtures.
   * Returns an array of zero-padded parts (e.g. ['2022', '04', '04'] or
   * ['01', '04']); empty when no date component is recognized.
   *
   * @internal
   * @private
   */
  _parseRevdate(revdate) {
    let m
    // ISO date (2012-07-12)
    if ((m = revdate.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/))) {
      return [m[1], m[2].padStart(2, '0'), m[3].padStart(2, '0')]
    }
    let year = null
    let mon = null
    let mday = null
    if ((m = revdate.match(/\b(\d{4})\b/))) year = m[1]
    const monthRx = new RegExp(`\\b(${MONTH_NAMES.join('|')})\\b`, 'i')
    if ((m = revdate.match(monthRx))) {
      mon = String(MONTH_NAMES.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')
    }
    // a standalone 1-2 digit number (optionally ordinal) is the day of month;
    // \b\d{1,2}\b cannot match inside the 4-digit year
    if ((m = revdate.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/))) {
      mday = m[1].padStart(2, '0')
    }
    const parts = []
    if (year) parts.push(year)
    if (mon) parts.push(mon)
    if (mday) parts.push(mday)
    return parts
  }

  /**
   * @internal
   * @private
   */
  _commonHtmlAttributes(id, role, defaultRole = null) {
    const roles = defaultRole ? [defaultRole] : []
    if (role) roles.push(role)
    return `${id ? ` id="${id}"` : ''}${roles.length ? ` class="${roles.join(' ')}"` : ''}`
  }

  /**
   * @internal
   * @private
   */
  _appendLinkConstraintAttrs(node, attrs = []) {
    const linkTypes = []
    if ((this._convertContext ?? []).at(-1) === 'author')
      linkTypes.push('author')
    if (node.hasOption('nofollow')) linkTypes.push('nofollow')
    const window = node.attributes.window
    if (window) {
      attrs.push(` target="${window}"`)
      if (window === '_blank' || node.hasOption('noopener'))
        linkTypes.push('noopener')
    }
    if (linkTypes.length) attrs.push(` rel="${linkTypes.join(' ')}"`)
    return attrs
  }

  /**
   * @internal
   * @private
   */
  _encodeAttributeValue(val) {
    return val.includes('"') ? val.replace(/"/g, '&quot;') : val
  }
}
