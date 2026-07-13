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
import { AbstractNode } from '../abstract_node.js'
import Html5Converter from './html5.js'
import {
  LF,
  SafeMode,
  DEFAULT_STYLESHEET_KEYS,
  FONT_AWESOME_VERSION,
  MATHJAX_VERSION,
  BLOCK_MATH_DELIMITERS,
  INLINE_MATH_DELIMITERS,
} from '../constants.js'
import { XmlSanitizeRx } from '../rx.js'
import { extname } from '../helpers.js'
import { Stylesheets } from '../stylesheets.js'

// ── Local regex constants ─────────────────────────────────────────────────────

const DropAnchorRx = /<(?:a\b[^>]*|\/a)>/g
const LeadingAnchorsRx = /^(?:<a id="[^"]+"><\/a>)+/
const StemBreakRx = / *\\\n(?:\\?\n)*|\n\n+/g

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
    let syntax
    if (opts.htmlsyntax === 'xml') {
      syntax = 'xml'
      this._xmlMode = true
      this._voidSlash = '/'
    } else {
      syntax = 'html'
      this._xmlMode = false
      this._voidSlash = ''
    }
    this.initBackendTraits({
      basebackend: 'html',
      filetype: 'html',
      htmlsyntax: syntax,
      outfilesuffix: '.html',
      supportsTemplates: true,
    })
  }

  async convert_document(node) {
    const slash = this._voidSlash
    let assetUriScheme = node.getAttribute('asset-uri-scheme', 'https')
    if (assetUriScheme) assetUriScheme = `${assetUriScheme}:`
    const cdnBaseUrl = `${assetUriScheme}//cdnjs.cloudflare.com/ajax/libs`
    const linkcss = node.hasAttribute('linkcss')
    const result = ['<!DOCTYPE html>']
    const langAttribute = node.hasAttribute('nolang')
      ? ''
      : ` lang="${node.getAttribute('lang', 'en')}"`
    result.push(
      `<html${this._xmlMode ? ' xmlns="http://www.w3.org/1999/xhtml"' : ''}${langAttribute}>`
    )
    result.push(`<head>
<meta charset="${node.getAttribute('encoding', 'UTF-8')}"${slash}>
<meta name="viewport" content="width=device-width, initial-scale=1.0"${slash}>`)
    let reproducible
    if (!(reproducible = node.hasAttribute('reproducible'))) {
      result.push(
        `<meta name="generator" content="Asciidoctor.js ${node.getAttribute('asciidoctor-version')}"${slash}>`
      )
    }
    if (node.hasAttribute('app-name')) {
      result.push(
        `<meta name="application-name" content="${node.getAttribute('app-name')}"${slash}>`
      )
    }
    if (node.hasAttribute('description')) {
      result.push(
        `<meta name="description" content="${node.getAttribute('description')}"${slash}>`
      )
    }
    if (node.hasAttribute('keywords')) {
      result.push(
        `<meta name="keywords" content="${node.getAttribute('keywords')}"${slash}>`
      )
    }
    if (node.hasAttribute('authors')) {
      let authors = node.subReplacements(node.getAttribute('authors'))
      if (authors.includes('<')) authors = authors.replace(XmlSanitizeRx, '')
      result.push(`<meta name="author" content="${authors}"${slash}>`)
    }
    if (node.hasAttribute('copyright')) {
      result.push(
        `<meta name="copyright" content="${node.getAttribute('copyright')}"${slash}>`
      )
    }
    if (node.hasAttribute('favicon')) {
      // Access raw attribute value to detect empty string (set without value)
      let iconHref = 'favicon' in node.attributes ? node.attributes.favicon : ''
      let iconType
      if (!iconHref) {
        iconHref = 'favicon.ico'
        iconType = 'image/x-icon'
      } else {
        const iconExt = extname(iconHref, null)
        iconType =
          iconExt && iconExt !== '.ico'
            ? `image/${iconExt.slice(1)}`
            : 'image/x-icon'
      }
      result.push(
        `<link rel="icon" type="${iconType}" href="${iconHref}"${slash}>`
      )
    }
    result.push(
      `<title>${node.doctitle({ sanitize: true, use_fallback: true })}</title>`
    )

    // NOTE the html5 backend's default stylesheet (asciidoctor-default.css)
    // targets that backend's structure and is not compatible with the semantic
    // output; the semantic backend has its own default stylesheet
    // (asciidoctor-semantic.css)
    const stylesheetRawVal =
      'stylesheet' in node.attributes ? node.attributes.stylesheet : null
    if (DEFAULT_STYLESHEET_KEYS.has(stylesheetRawVal)) {
      if (linkcss) {
        result.push(
          `<link rel="stylesheet" href="${node.normalizeWebPath(Stylesheets.instance.semanticStylesheetName, node.getAttribute('stylesdir'), false)}"${slash}>`
        )
      } else {
        result.push(
          `<style>\n${await Stylesheets.instance.semanticStylesheetData()}\n</style>`
        )
      }
    } else if (node.hasAttribute('stylesheet')) {
      if (linkcss) {
        result.push(
          `<link rel="stylesheet" href="${node.normalizeWebPath(node.getAttribute('stylesheet'), node.getAttribute('stylesdir'))}"${slash}>`
        )
      } else {
        const cssPath = node.normalizeSystemPath(
          node.getAttribute('stylesheet'),
          node.getAttribute('stylesdir')
        )
        const cssData =
          (await node.readAsset(cssPath, {
            warnOnFailure: true,
            label: 'stylesheet',
          })) ?? ''
        result.push(`<style>\n${cssData}\n</style>`)
      }
    }

    if (node.hasAttribute('icons', 'font')) {
      if (node.hasAttribute('iconfont-remote')) {
        const cdnUrl =
          node.getAttribute('iconfont-cdn') ??
          `${cdnBaseUrl}/font-awesome/${FONT_AWESOME_VERSION}/css/font-awesome.min.css`
        result.push(`<link rel="stylesheet" href="${cdnUrl}"${slash}>`)
      } else {
        const iconfontStylesheet = `${node.getAttribute('iconfont-name', 'font-awesome')}.css`
        result.push(
          `<link rel="stylesheet" href="${node.normalizeWebPath(iconfontStylesheet, node.getAttribute('stylesdir'), false)}"${slash}>`
        )
      }
    }

    const syntaxHl = node.syntaxHighlighter
    let syntaxHlDocinfoHeadIdx
    if (syntaxHl) {
      syntaxHlDocinfoHeadIdx = result.length
      result.push('') // placeholder; replaced or spliced out below
    }

    const docinfoContent = await node.docinfo()
    if (docinfoContent) result.push(docinfoContent)

    result.push('</head>')

    const idAttr = node.id ? ` id="${node.id}"` : ''
    const classes = [node.doctype]
    if (node.role) classes.push(node.role)
    result.push(`<body${idAttr} class="${classes.join(' ')}">`)

    const headerDocinfo = await node.docinfo('header')
    if (headerDocinfo) result.push(headerDocinfo)

    const header = await this._generateHeader(node)
    if (header) result.push(header)

    result.push('<main>')
    const toc = this._hasAutoToc(node) ? await this._generateToc(node) : null
    if (toc) result.push(toc)
    result.push(await node.content())
    const footnotes = this._generateFootnotes(node)
    if (footnotes) result.push(footnotes)
    result.push('</main>')

    if (!node.isNofooter()) {
      result.push('<footer>')
      if (node.hasAttribute('revnumber')) {
        result.push(
          `<span class="rev-number">${node.getAttribute('version-label')} ${node.getAttribute('revnumber')}</span>`
        )
      }
      if (node.hasAttribute('last-update-label') && !reproducible) {
        result.push(
          `<span class="last-updated">${node.getAttribute('last-update-label')} ${node.getAttribute('docdatetime')}</span>`
        )
      }
      result.push('</footer>')
    }

    // JavaScript (and auxiliary stylesheets) loaded at end of body for performance
    if (syntaxHl) {
      if (syntaxHl.hasDocinfo('head')) {
        result[syntaxHlDocinfoHeadIdx] = syntaxHl.docinfo('head', node, {
          cdn_base_url: cdnBaseUrl,
          linkcss,
          self_closing_tag_slash: slash,
        })
      } else {
        result.splice(syntaxHlDocinfoHeadIdx, 1)
      }
      if (syntaxHl.hasDocinfo('footer')) {
        result.push(
          syntaxHl.docinfo('footer', node, {
            cdn_base_url: cdnBaseUrl,
            linkcss,
            self_closing_tag_slash: slash,
          })
        )
      }
    }

    if (node.hasAttribute('stem')) {
      let eqnumsVal = node.getAttribute('eqnums', 'none')
      if (!eqnumsVal) eqnumsVal = 'AMS'
      const eqnumsOpt = ` equationNumbers: { autoNumber: "${eqnumsVal}" } `
      result.push(`<script type="text/x-mathjax-config">
MathJax.Hub.Config({
  messageStyle: "none",
  tex2jax: {
    inlineMath: [${JSON.stringify(INLINE_MATH_DELIMITERS.latexmath)}],
    displayMath: [${JSON.stringify(BLOCK_MATH_DELIMITERS.latexmath)}],
    ignoreClass: "nostem|nolatexmath"
  },
  asciimath2jax: {
    delimiters: [${JSON.stringify(BLOCK_MATH_DELIMITERS.asciimath)}],
    ignoreClass: "nostem|noasciimath"
  },
  TeX: {${eqnumsOpt}}
})
MathJax.Hub.Register.StartupHook("AsciiMath Jax Ready", function () {
  MathJax.InputJax.AsciiMath.postfilterHooks.Add(function (data, node) {
    if ((node = data.script.parentNode) && (node = node.parentNode) && node.classList.contains("stem")) {
      data.math.root.display = "block"
    }
    return data
  })
})
</script>
<script src="${cdnBaseUrl}/mathjax/${MATHJAX_VERSION}/MathJax.js?config=TeX-MML-AM_CHTML"></script>`)
    }

    const footerDocinfo = await node.docinfo('footer')
    if (footerDocinfo) result.push(footerDocinfo)

    result.push('</body>')
    result.push('</html>')
    return result.join(LF)
  }

  async convert_embedded(node) {
    const result = []
    const header = await this._generateHeader(node)
    if (header) result.push(header)
    if (this._hasAutoToc(node)) {
      const toc = await this._generateToc(node)
      if (toc) result.push(toc)
    }
    result.push(await node.content())
    const footnotes = this._generateFootnotes(node)
    if (footnotes) result.push(footnotes)
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
      // avoid nesting the section link inside a leading inline anchor
      let m
      if (title.startsWith('<a ') && (m = title.match(LeadingAnchorsRx))) {
        title = `${m[0]}<a class="link" href="#${id}">${title.slice(m[0].length)}</a>`
      } else {
        title = `<a class="link" href="#${id}">${title}</a>`
      }
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
${title}<pre${nowrap ? ' class="no-wrap"' : ''}>${content}</pre>
</figure>`
  }

  async convert_thematic_break(node) {
    return `<hr${node.role ? ` class="${node.role}"` : ''}${this._voidSlash}>`
  }

  async convert_page_break(_node) {
    return `<hr class="page-break"${this._voidSlash}>`
  }

  async convert_admonition(node) {
    const name = node.getAttribute('name')
    const attributes = this._commonHtmlAttributes(
      node.id,
      node.role,
      `admonition ${name}`
    )
    const titleElement = node.hasTitle()
      ? `<strong class="title">${node.title}</strong>\n`
      : ''
    // NOTE role="note" (a non-landmark structuring role) demarcates the
    // admonition for assistive technologies without polluting the landmark
    // navigation; see the rationale in devdocs/semantic-html5-converter.adoc
    // and the discussion in https://github.com/whatwg/html/issues/10100
    let label
    if (node.document.hasAttribute('icons')) {
      if (
        node.document.hasAttribute('icons', 'font') &&
        !node.hasAttribute('icon')
      ) {
        label = `<i class="fa icon-${name}" title="${node.getAttribute('textlabel')}"></i>`
      } else {
        label = `<img class="icon" src="${await node.iconUri(name)}" alt="${node.getAttribute('textlabel')}">`
      }
    } else {
      label = `<strong class="label">${node.getAttribute('textlabel')}</strong>`
    }
    return `<aside${attributes} role="note">
${label}
${titleElement}${await node.content()}
</aside>`
  }

  async convert_example(node) {
    if (node.hasOption('collapsible')) {
      const attributes = this._commonHtmlAttributes(node.id, node.role)
      const summary = node.hasTitle() ? node.title : 'Details'
      return `<details${attributes}${node.hasOption('open') ? this._boolAttr('open') : ''}>
<summary>${summary}</summary>
${await node.content()}
</details>`
    }
    const attributes = this._commonHtmlAttributes(node.id, node.role, 'example')
    const titleElement = node.hasTitle()
      ? `<figcaption>${node.captionedTitle()}</figcaption>\n`
      : ''
    return `<figure${attributes}>
${titleElement}${await node.content()}
</figure>`
  }

  async convert_sidebar(node) {
    const attributes = this._commonHtmlAttributes(node.id, node.role, 'sidebar')
    const titleElement = node.hasTitle()
      ? `<strong class="title">${node.title}</strong>\n`
      : ''
    return `<aside${attributes}>
${titleElement}${await node.content()}
</aside>`
  }

  async convert_open(node) {
    const style = node.style
    if (style === 'abstract') {
      if (
        node.getParent() === node.document &&
        node.document.doctype === 'book'
      ) {
        this.logger.warn(
          'abstract block cannot be used in a document without a doctitle when doctype is book. Excluding block content.'
        )
        return ''
      }
    } else if (
      style === 'partintro' &&
      (node.level > 0 ||
        node.getParent().context !== 'section' ||
        node.document.doctype !== 'book')
    ) {
      this.logger.error(
        'partintro block can only be used when doctype is book and must be a child of a book part. Excluding block content.'
      )
      return ''
    }
    const attributes = this._commonHtmlAttributes(
      node.id,
      node.role,
      style && style !== 'open' ? style : null
    )
    const titleElement = node.hasTitle()
      ? `<strong class="title">${node.title}</strong>\n`
      : ''
    return `<div${attributes}>
${titleElement}${await node.content()}
</div>`
  }

  async convert_quote(node) {
    const attribution = this._generateAttribution(node)
    const blockquote = `<blockquote${node.hasTitle() ? '' : this._commonHtmlAttributes(node.id, node.role, 'quote')}>
${await node.content()}${attribution}
</blockquote>`
    if (node.hasTitle()) {
      return `<figure${this._commonHtmlAttributes(node.id, node.role, 'quote')}>
<figcaption>${node.title}</figcaption>
${blockquote}
</figure>`
    }
    return blockquote
  }

  async convert_verse(node) {
    const attribution = this._generateAttribution(node)
    const blockquote = `<blockquote${node.hasTitle() ? '' : this._commonHtmlAttributes(node.id, node.role, 'verse')}>
<pre>${await node.content()}</pre>${attribution}
</blockquote>`
    if (node.hasTitle()) {
      return `<figure${this._commonHtmlAttributes(node.id, node.role, 'verse')}>
<figcaption>${node.title}</figcaption>
${blockquote}
</figure>`
    }
    return blockquote
  }

  async convert_literal(node) {
    const title = node.hasTitle()
      ? `<figcaption>${node.title}</figcaption>\n`
      : ''
    const attributes = this._commonHtmlAttributes(node.id, node.role, 'literal')
    const nowrap =
      !node.document.hasAttribute('prewrap') || node.hasOption('nowrap')
    return `<figure${attributes}>
${title}<pre${nowrap ? ' class="no-wrap"' : ''}>${await node.content()}</pre>
</figure>`
  }

  async convert_stem(node) {
    const title = node.hasTitle()
      ? `<figcaption>${node.title}</figcaption>\n`
      : ''
    const attributes = this._commonHtmlAttributes(node.id, node.role, 'stem')
    const style = node.style
    const [open, close] = BLOCK_MATH_DELIMITERS[style] ?? ['', '']
    let equation = (await node.content()) ?? ''
    if (equation) {
      if (style === 'asciimath' && equation.includes(LF)) {
        const br = `${LF}<br${this._voidSlash}>`
        equation = equation.replace(StemBreakRx, (match) => {
          const newlineCount = (match.match(/\n/g) || []).length
          // Blank lines (\n\n+) produce newlineCount <br>; escaped newlines produce newlineCount - 1.
          const brCount = match[0] === '\n' ? newlineCount : newlineCount - 1
          return `${close}${br.repeat(brCount)}${LF}${open}`
        })
      }
      if (!equation.startsWith(open) || !equation.endsWith(close)) {
        equation = `${open}${equation}${close}`
      }
    }
    return `<figure${attributes}>
${title}${equation}
</figure>`
  }

  async convert_pass(node) {
    return this.contentOnly(node)
  }

  async convert_preamble(node) {
    const doc = node.document
    let toc = ''
    if (
      doc.hasAttribute('toc-placement', 'preamble') &&
      doc.hasSections() &&
      doc.hasAttribute('toc')
    ) {
      toc = `\n${await this._generateToc(doc)}`
    }
    return `${await node.content()}${toc}`
  }

  async convert_floating_title(node) {
    const tagName = `h${node.level + 1}`
    const attributes = this._commonHtmlAttributes(
      node.id,
      node.role,
      node.style
    )
    return `<${tagName}${attributes}>${node.title}</${tagName}>`
  }

  async convert_ulist(node) {
    const result = []
    const checklist = node.hasOption('checklist')
    const style = checklist ? 'checklist' : node.style
    const attributes = node.hasTitle()
      ? this._commonHtmlAttributes(null, null, style)
      : this._commonHtmlAttributes(node.id, node.role, style)
    let markerChecked = ''
    let markerUnchecked = ''
    if (checklist) {
      if (node.hasOption('interactive')) {
        if (this._xmlMode) {
          markerChecked =
            '<input type="checkbox" data-item-complete="1" checked="checked"/> '
          markerUnchecked = '<input type="checkbox" data-item-complete="0"/> '
        } else {
          markerChecked =
            '<input type="checkbox" data-item-complete="1" checked> '
          markerUnchecked = '<input type="checkbox" data-item-complete="0"> '
        }
      } else if (node.document.hasAttribute('icons', 'font')) {
        markerChecked = '<i class="fa fa-check-square-o"></i> '
        markerUnchecked = '<i class="fa fa-square-o"></i> '
      } else {
        markerChecked = '&#10003; '
        markerUnchecked = '&#10063; '
      }
    }
    result.push(`<ul${attributes}>`)
    for (const item of node.getItems()) {
      result.push(`<li${this._commonHtmlAttributes(item.id, item.role)}>`)
      if (checklist && item.hasAttribute('checkbox')) {
        result.push(
          `<p>${item.hasAttribute('checked') ? markerChecked : markerUnchecked}${item.getText()}</p>`
        )
      } else {
        result.push(`<p>${item.getText()}</p>`)
      }
      if (item.hasBlocks()) result.push(await item.content())
      result.push('</li>')
    }
    result.push('</ul>')
    return this._wrapInFigureWithTitle(node, result.join(LF))
  }

  async convert_olist(node) {
    const result = []
    const attributes = node.hasTitle()
      ? this._commonHtmlAttributes(null, null, node.style)
      : this._commonHtmlAttributes(node.id, node.role, node.style)
    const keyword = node.listMarkerKeyword()
    const typeAttribute = keyword ? ` type="${keyword}"` : ''
    const startAttribute = node.hasAttribute('start')
      ? ` start="${node.getAttribute('start')}"`
      : ''
    const reversedAttribute = node.hasOption('reversed')
      ? this._boolAttr('reversed')
      : ''
    result.push(
      `<ol${attributes}${typeAttribute}${startAttribute}${reversedAttribute}>`
    )
    for (const item of node.getItems()) {
      result.push(`<li${this._commonHtmlAttributes(item.id, item.role)}>`)
      result.push(`<p>${item.getText()}</p>`)
      if (item.hasBlocks()) result.push(await item.content())
      result.push('</li>')
    }
    result.push('</ol>')
    return this._wrapInFigureWithTitle(node, result.join(LF))
  }

  async convert_dlist(node) {
    const result = []
    const style = node.style === 'horizontal' ? 'horizontal' : node.style
    const attributes = node.hasTitle()
      ? this._commonHtmlAttributes(null, null, style)
      : this._commonHtmlAttributes(node.id, node.role, style)
    result.push(`<dl${attributes}>`)
    for (const [terms, dd] of node.getItems()) {
      for (const dt of terms) {
        result.push(`<dt>${dt.getText()}</dt>`)
      }
      if (!dd) continue
      result.push('<dd>')
      if (dd.hasText()) result.push(`<p>${dd.getText()}</p>`)
      if (dd.hasBlocks()) result.push(await dd.content())
      result.push('</dd>')
    }
    result.push('</dl>')
    return this._wrapInFigureWithTitle(node, result.join(LF))
  }

  async convert_colist(node) {
    const result = []
    const attributes = node.hasTitle()
      ? this._commonHtmlAttributes(null, null, 'callout-list')
      : this._commonHtmlAttributes(node.id, node.role, 'callout-list')
    result.push(`<ol${attributes}>`)
    const fontIcons = node.document.hasAttribute('icons', 'font')
    const imageIcons = !fontIcons && node.document.hasAttribute('icons')
    let num = 0
    for (const item of node.getItems()) {
      num++
      let marker = ''
      if (fontIcons) {
        marker = `<i class="conum" data-value="${num}"></i> `
      } else if (imageIcons) {
        marker = `<img src="${await node.iconUri(`callouts/${num}`)}" alt="${num}"${this._voidSlash}> `
      }
      result.push(`<li>
<p>${marker}${item.getText()}</p>${item.hasBlocks() ? LF + (await item.content()) : ''}
</li>`)
    }
    result.push('</ol>')
    return this._wrapInFigureWithTitle(node, result.join(LF))
  }

  async convert_table(node) {
    const result = []
    let frame = node.getAttribute('frame', 'all', 'table-frame')
    if (frame === 'topbot') frame = 'ends'
    const classes = [
      `frame-${frame}`,
      `grid-${node.getAttribute('grid', 'all', 'table-grid')}`,
    ]
    const stripes = node.getAttribute('stripes', null, 'table-stripes')
    if (stripes) classes.push(`stripes-${stripes}`)
    let widthAttribute = ''
    const autowidth = node.hasOption('autowidth')
    if (autowidth && !node.hasAttribute('width')) {
      classes.push('fit-content')
    } else {
      const tablewidth = node.getAttribute('tablepcwidth')
      if (Number(tablewidth) === 100) {
        classes.push('stretch')
      } else {
        widthAttribute = ` style="width: ${tablewidth}%;"`
      }
    }
    if (node.hasAttribute('float')) classes.push(node.getAttribute('float'))
    if (node.role) classes.push(node.role)
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    result.push(
      `<table${idAttribute} class="${classes.join(' ')}"${widthAttribute}>`
    )
    if (node.hasTitle())
      result.push(`<caption>${node.captionedTitle()}</caption>`)

    if (node.getAttribute('rowcount') > 0) {
      result.push('<colgroup>')
      if (autowidth) {
        for (let i = 0; i < node.columns.length; i++)
          result.push(`<col${this._voidSlash}>`)
      } else {
        for (const col of node.columns) {
          result.push(
            col.hasOption('autowidth')
              ? `<col${this._voidSlash}>`
              : `<col style="width: ${col.getAttribute('colpcwidth')}%;"${this._voidSlash}>`
          )
        }
      }
      result.push('</colgroup>')

      for (const [tsec, rows] of node.rows.bySection()) {
        if (rows.length === 0) continue
        result.push(`<t${tsec}>`)
        for (const row of rows) {
          result.push('<tr>')
          for (const cell of row) {
            let cellContent
            if (tsec === 'head') {
              cellContent = cell.text
            } else {
              switch (cell.style) {
                case 'asciidoc':
                  cellContent = await cell.content()
                  break
                case 'literal':
                  cellContent = `<pre>${cell.text}</pre>`
                  break
                default: {
                  const parts = await cell.content()
                  cellContent =
                    parts.length === 0
                      ? ''
                      : `<p>${parts.join('</p>\n<p>')}</p>`
                }
              }
            }
            const cellTagName =
              tsec === 'head' || cell.style === 'header' ? 'th' : 'td'
            const cellClasses = []
            const halign = cell.getAttribute('halign')
            if (halign !== 'left') cellClasses.push(`halign-${halign}`)
            const valign = cell.getAttribute('valign')
            if (valign !== 'top') cellClasses.push(`valign-${valign}`)
            const cellClassAttr = cellClasses.length
              ? ` class="${cellClasses.join(' ')}"`
              : ''
            const cellColspanAttr = cell.colspan
              ? ` colspan="${cell.colspan}"`
              : ''
            const cellRowspanAttr = cell.rowspan
              ? ` rowspan="${cell.rowspan}"`
              : ''
            // Use the per-cell captured cellbgcolor (set by {set:cellbgcolor:...}
            // in cell text). Fall back to the current document attribute.
            const cellbgcolor =
              '_cellbgcolor' in cell
                ? cell._cellbgcolor
                : node.document.attributes.cellbgcolor
            const cellStyleAttr = cellbgcolor
              ? ` style="background-color: ${cellbgcolor};"`
              : ''
            result.push(
              `<${cellTagName}${cellClassAttr}${cellColspanAttr}${cellRowspanAttr}${cellStyleAttr}>${cellContent}</${cellTagName}>`
            )
          }
          result.push('</tr>')
        }
        result.push(`</t${tsec}>`)
      }
    }
    result.push('</table>')
    return result.join(LF)
  }

  async convert_toc(node) {
    const doc = node.document
    if (
      !doc.hasAttribute('toc-placement', 'macro') ||
      !doc.hasSections() ||
      !doc.hasAttribute('toc')
    ) {
      return '<!-- toc disabled -->'
    }
    const levels = node.hasAttribute('levels')
      ? parseInt(node.getAttribute('levels'), 10)
      : null
    return this._generateToc(doc, {
      id: node.id,
      title: node.hasTitle() ? node.title : null,
      role: node.hasRoleAttribute() ? node.role : null,
      toclevels: levels,
    })
  }

  async convert_outline(node, opts = {}) {
    if (!node.hasSections()) return null
    const sections = node.sections()
    const parts = node.context === 'document' && node.isMultipart()
    const sectlevel = parts ? 0 : sections[0].level
    const sectnumlevels =
      opts.sectnumlevels ??
      parseInt(node.document.attributes.sectnumlevels || 3, 10)

    let toclevels = opts.toclevels ?? null
    if (toclevels == null) {
      const toclevelAttr = node.document.attributes.toclevels
      if (toclevelAttr) {
        toclevels = parseInt(toclevelAttr, 10)
        if (toclevels < 1 && !parts) toclevels = 1
      } else {
        toclevels = 2
      }
    }

    const result = [`<ol class="sect-level-${sectlevel}">`]
    for (const section of sections) {
      const slevel = section.level
      const stoclevels = section.hasAttribute('toclevels')
        ? parseInt(section.getAttribute('toclevels'), 10)
        : toclevels
      if (slevel > stoclevels) continue

      let stitle
      if (section.caption) {
        stitle = section.captionedTitle()
      } else if (section.numbered && slevel <= sectnumlevels) {
        if (slevel < 2 && node.document.doctype === 'book') {
          const sectname = section.sectname
          if (sectname === 'chapter') {
            const signifier = node.document.attributes['chapter-signifier']
            stitle = `${signifier ? `${signifier} ` : ''}${section.sectnum()} ${section.title}`
          } else if (sectname === 'part') {
            const signifier = node.document.attributes['part-signifier']
            stitle = `${signifier ? `${signifier} ` : ''}${section.sectnum(null, ':')} ${section.title}`
          } else {
            stitle = `${section.sectnum()} ${section.title}`
          }
        } else {
          stitle = `${section.sectnum()} ${section.title}`
        }
      } else {
        stitle = section.title
      }

      if (stitle?.includes('<a')) {
        stitle = stitle.replace(new RegExp(DropAnchorRx.source, 'g'), '')
      }

      if (slevel < stoclevels) {
        const childTocLevel = await this.convert_outline(section, {
          toclevels: stoclevels,
          sectnumlevels,
        })
        if (childTocLevel) {
          result.push(`<li><a href="#${section.id}">${stitle}</a>`)
          result.push(childTocLevel)
          result.push('</li>')
          continue
        }
      }
      result.push(`<li><a href="#${section.id}">${stitle}</a></li>`)
    }
    result.push('</ol>')
    return result.join(LF)
  }

  async convert_video(node) {
    const roles = []
    if (node.role) roles.push(node.role)
    if (node.hasAttribute('align'))
      roles.push(`text-${node.getAttribute('align')}`)
    if (node.hasAttribute('float')) roles.push(node.getAttribute('float'))
    const attributes = node.hasTitle()
      ? ''
      : this._commonHtmlAttributes(node.id, roles.join(' ') || null)
    const widthAttribute = node.hasAttribute('width')
      ? ` width="${node.getAttribute('width')}"`
      : ''
    const heightAttribute = node.hasAttribute('height')
      ? ` height="${node.getAttribute('height')}"`
      : ''
    let element
    switch (node.getAttribute('poster')) {
      case 'vimeo': {
        let assetUriScheme = node.document.getAttribute(
          'asset-uri-scheme',
          'https'
        )
        if (assetUriScheme) assetUriScheme = `${assetUriScheme}:`
        const startAnchor = node.hasAttribute('start')
          ? `#at=${node.getAttribute('start')}`
          : ''
        const delimiter = ['?']
        let [target, hash] = node.getAttribute('target').split('/', 2)
        hash ||= node.getAttribute('hash')
        const hashParam = hash ? `${delimiter.pop() || '&amp;'}h=${hash}` : ''
        const autoplayParam = node.hasOption('autoplay')
          ? `${delimiter.pop() || '&amp;'}autoplay=1`
          : ''
        const loopParam = node.hasOption('loop')
          ? `${delimiter.pop() || '&amp;'}loop=1`
          : ''
        const mutedParam = node.hasOption('muted')
          ? `${delimiter.pop() || '&amp;'}muted=1`
          : ''
        element = `<iframe${attributes}${widthAttribute}${heightAttribute} src="${assetUriScheme}//player.vimeo.com/video/${target}${hashParam}${autoplayParam}${loopParam}${mutedParam}${startAnchor}" frameborder="0"${node.hasOption('nofullscreen') ? '' : this._boolAttr('allowfullscreen')}></iframe>`
        break
      }
      case 'youtube': {
        let assetUriScheme = node.document.getAttribute(
          'asset-uri-scheme',
          'https'
        )
        if (assetUriScheme) assetUriScheme = `${assetUriScheme}:`
        const relParamVal = node.hasOption('related') ? 1 : 0
        const startParam = node.hasAttribute('start')
          ? `&amp;start=${node.getAttribute('start')}`
          : ''
        const endParam = node.hasAttribute('end')
          ? `&amp;end=${node.getAttribute('end')}`
          : ''
        const autoplayParam = node.hasOption('autoplay')
          ? '&amp;autoplay=1'
          : ''
        const hasLoopParam = node.hasOption('loop')
        const loopParam = hasLoopParam ? '&amp;loop=1' : ''
        const muteParam = node.hasOption('muted') ? '&amp;mute=1' : ''
        const controlsParam = node.hasOption('nocontrols')
          ? '&amp;controls=0'
          : ''
        let fsParam, fsAttribute
        if (node.hasOption('nofullscreen')) {
          fsParam = '&amp;fs=0'
          fsAttribute = ''
        } else {
          fsParam = ''
          fsAttribute = this._boolAttr('allowfullscreen')
        }
        const modestParam = node.hasOption('modest')
          ? '&amp;modestbranding=1'
          : ''
        const themeParam = node.hasAttribute('theme')
          ? `&amp;theme=${node.getAttribute('theme')}`
          : ''
        const hlParam = node.hasAttribute('lang')
          ? `&amp;hl=${node.getAttribute('lang')}`
          : ''
        let [target, list] = node.getAttribute('target').split('/', 2)
        list ||= node.getAttribute('list')
        let listParam
        if (list) {
          listParam = `&amp;list=${list}`
        } else {
          const videoParts = target.split(',')
          target = videoParts[0]
          let playlist =
            videoParts.length > 1 ? videoParts.slice(1).join(',') : null
          playlist ||= node.getAttribute('playlist')
          if (playlist) {
            listParam = `&amp;playlist=${target},${playlist}`
          } else {
            listParam = hasLoopParam ? `&amp;playlist=${target}` : ''
          }
        }
        element = `<iframe${attributes}${widthAttribute}${heightAttribute} src="${assetUriScheme}//www.youtube.com/embed/${target}?rel=${relParamVal}${startParam}${endParam}${autoplayParam}${loopParam}${muteParam}${controlsParam}${listParam}${fsParam}${modestParam}${themeParam}${hlParam}" frameborder="0"${fsAttribute}></iframe>`
        break
      }
      default: {
        const posterVal = node.getAttribute('poster')
        const posterAttribute = !posterVal
          ? ''
          : ` poster="${node.mediaUri(posterVal)}"`
        const preloadVal = node.getAttribute('preload')
        const preloadAttribute = !preloadVal ? '' : ` preload="${preloadVal}"`
        const startT = node.getAttribute('start')
        const endT = node.getAttribute('end')
        const timeAnchor =
          startT || endT ? `#t=${startT || ''}${endT ? `,${endT}` : ''}` : ''
        element = `<video${attributes} src="${node.mediaUri(node.getAttribute('target'))}${timeAnchor}"${widthAttribute}${heightAttribute}${posterAttribute}${node.hasOption('autoplay') ? this._boolAttr('autoplay') : ''}${node.hasOption('muted') ? this._boolAttr('muted') : ''}${node.hasOption('nocontrols') ? '' : this._boolAttr('controls')}${node.hasOption('loop') ? this._boolAttr('loop') : ''}${preloadAttribute}>
Your browser does not support the video tag.
</video>`
      }
    }
    if (node.hasTitle()) {
      return `<figure${this._commonHtmlAttributes(node.id, roles.join(' ') || null)}>
${element}
<figcaption>${node.captionedTitle()}</figcaption>
</figure>`
    }
    return element
  }

  async convert_audio(node) {
    const attributes = node.hasTitle()
      ? ''
      : this._commonHtmlAttributes(node.id, node.role)
    const startT = node.getAttribute('start')
    const endT = node.getAttribute('end')
    const timeAnchor =
      startT || endT ? `#t=${startT || ''}${endT ? `,${endT}` : ''}` : ''
    const element = `<audio${attributes} src="${node.mediaUri(node.getAttribute('target'))}${timeAnchor}"${node.hasOption('autoplay') ? this._boolAttr('autoplay') : ''}${node.hasOption('nocontrols') ? '' : this._boolAttr('controls')}${node.hasOption('loop') ? this._boolAttr('loop') : ''}>
Your browser does not support the audio tag.
</audio>`
    if (node.hasTitle()) {
      return `<figure${this._commonHtmlAttributes(node.id, node.role)}>
${element}
<figcaption>${node.captionedTitle()}</figcaption>
</figure>`
    }
    return element
  }

  async convert_image(node) {
    const roles = []
    if (node.role) roles.push(node.role)
    if (node.hasAttribute('align'))
      roles.push(`text-${node.getAttribute('align')}`)
    if (node.hasAttribute('float')) roles.push(node.getAttribute('float'))
    const role = roles.join(' ')
    const attributes = this._commonHtmlAttributes(node.id, role || null)
    const slash = this._voidSlash
    const size = `${
      node.hasAttribute('width') ? ` width="${node.getAttribute('width')}"` : ''
    }${node.hasAttribute('height') ? ` height="${node.getAttribute('height')}"` : ''}`
    const target = node.getAttribute('target')
    // when the image is wrapped in a <figure>, the id/roles go on the figure
    const imgAttrs = node.hasTitle() ? size : `${attributes}${size}`
    let img, src
    if (
      (node.hasAttribute('format', 'svg') ||
        target.includes('.svg') ||
        target.startsWith('data:image/svg+xml')) &&
      node.document.safe < SafeMode.SECURE
    ) {
      if (node.hasOption('inline')) {
        img =
          (await this.readSvgContents(node, target)) ||
          `<span class="alt">${node.alt()}</span>`
      } else if (node.hasOption('interactive')) {
        const fallback = node.hasAttribute('fallback')
          ? `<img src="${await node.imageUri(node.getAttribute('fallback'))}" alt="${this._encodeAttributeValue(node.alt())}"${size}${slash}>`
          : `<span class="alt">${node.alt()}</span>`
        src = await node.imageUri(target)
        img = `<object type="image/svg+xml" data="${src}"${imgAttrs}>${fallback}</object>`
      } else {
        src = await node.imageUri(target)
        img = `<img src="${src}" alt="${this._encodeAttributeValue(node.alt())}"${imgAttrs}${slash}>`
      }
    } else {
      src = await node.imageUri(target)
      img = `<img src="${src}" alt="${this._encodeAttributeValue(node.alt())}"${imgAttrs}${slash}>`
    }

    if (node.hasAttribute('link')) {
      let hrefAttrVal = node.getAttribute('link')
      if (hrefAttrVal === 'self') hrefAttrVal = src
      if (hrefAttrVal) {
        img = `<a href="${hrefAttrVal}"${this._appendLinkConstraintAttrs(node).join('')}>${img}</a>`
      }
    }

    if (node.hasTitle()) {
      return `<figure${attributes}>
${img}
<figcaption>${node.captionedTitle()}</figcaption>
</figure>`
    }
    return img
  }

  async convert_inline_image(node) {
    const roles = []
    if (node.role) roles.push(node.role)
    if (node.hasAttribute('align'))
      roles.push(`text-${node.getAttribute('align')}`)
    if (node.hasAttribute('float')) roles.push(node.getAttribute('float'))
    const role = roles.join(' ')
    const attributes = this._commonHtmlAttributes(node.id, role || null)
    const slash = this._voidSlash
    const size = `${
      node.hasAttribute('width') ? ` width="${node.getAttribute('width')}"` : ''
    }${node.hasAttribute('height') ? ` height="${node.getAttribute('height')}"` : ''}`
    const titleAttr = node.hasAttribute('title')
      ? ` title="${node.getAttribute('title')}"`
      : ''
    const target = node.target
    let img, src
    if ((node.type || 'image') === 'icon') {
      const icons = node.document.getAttribute('icons')
      if (icons === 'font') {
        let iClassAttrVal = `fa fa-${target}`
        if (node.hasAttribute('size'))
          iClassAttrVal += ` fa-${node.getAttribute('size')}`
        if (node.hasAttribute('flip')) {
          iClassAttrVal += ` fa-flip-${node.getAttribute('flip')}`
        } else if (node.hasAttribute('rotate')) {
          iClassAttrVal += ` fa-rotate-${node.getAttribute('rotate')}`
        }
        if (role) iClassAttrVal += ` ${role}`
        img = `<i${node.id ? ` id="${node.id}"` : ''} class="${iClassAttrVal}"${titleAttr}></i>`
      } else if (icons != null) {
        src = await node.iconUri(target)
        img = `<img src="${src}" alt="${this._encodeAttributeValue(node.alt)}"${titleAttr}${attributes}${size}${slash}>`
      } else {
        img = `[${node.alt}&#93;`
      }
    } else if (
      (node.hasAttribute('format', 'svg') ||
        target.includes('.svg') ||
        target.startsWith('data:image/svg+xml')) &&
      node.document.safe < SafeMode.SECURE
    ) {
      if (node.hasOption('inline')) {
        img =
          (await this.readSvgContents(node, target)) ||
          `<span class="alt">${node.alt}</span>`
      } else if (node.hasOption('interactive')) {
        const fallback = node.hasAttribute('fallback')
          ? `<img src="${await node.imageUri(node.getAttribute('fallback'))}" alt="${this._encodeAttributeValue(node.alt)}"${size}${slash}>`
          : `<span class="alt">${node.alt}</span>`
        src = await node.imageUri(target)
        img = `<object type="image/svg+xml" data="${src}"${titleAttr}${attributes}${size}>${fallback}</object>`
      } else {
        src = await node.imageUri(target)
        img = `<img src="${src}" alt="${this._encodeAttributeValue(node.alt)}"${titleAttr}${attributes}${size}${slash}>`
      }
    } else {
      src = await node.imageUri(target)
      img = `<img src="${src}" alt="${this._encodeAttributeValue(node.alt)}"${titleAttr}${attributes}${size}${slash}>`
    }

    if (node.hasAttribute('link')) {
      let hrefAttrVal = node.getAttribute('link')
      if (hrefAttrVal === 'self') hrefAttrVal = src
      if (hrefAttrVal) {
        img = `<a href="${hrefAttrVal}"${this._appendLinkConstraintAttrs(node).join('')}>${img}</a>`
      }
    }
    return img
  }

  async convert_inline_anchor(node) {
    switch (node.type) {
      case 'link': {
        const attrs = node.id ? [` id="${node.id}"`] : []
        if (node.role) attrs.push(` class="${node.role}"`)
        if (node.hasAttribute('title'))
          attrs.push(` title="${node.getAttribute('title')}"`)
        return `<a href="${node.target}"${this._appendLinkConstraintAttrs(node, attrs).join('')}>${node.text ?? ''}</a>`
      }
      case 'xref': {
        const attrs = node.role ? ` class="${node.role}"` : ''
        let text = node.text
        if (!text) {
          if (node.attributes.path) {
            text = node.attributes.path
          } else {
            const refs = (this._refs ??= node.document.catalog.refs)
            const refid = node.attributes.refid
            let top
            const ref =
              refs[refid] ??
              (!refid ? (top = this._getRootDocument(node)) : null)
            if (ref instanceof AbstractNode) {
              const resolvingSet = (this._resolvingXrefs ??= new Set())
              if (!resolvingSet.has(refid)) {
                resolvingSet.add(refid)
                const resolved = await ref.xreftext(
                  node.getAttribute('xrefstyle', null, true)
                )
                resolvingSet.delete(refid)
                if (resolved) {
                  text = resolved.includes('<a')
                    ? resolved.replace(new RegExp(DropAnchorRx.source, 'g'), '')
                    : resolved
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
        }
        return `<a href="${node.target}"${attrs}>${text}</a>`
      }
      case 'ref':
        return `<a id="${node.id}"></a>`
      case 'bibref':
        return `<a id="${node.id}"></a>[${node.reftext || node.id}]`
      default:
        this.logger.warn(`unknown anchor type: ${node.type}`)
        return null
    }
  }

  async convert_inline_callout(node) {
    if (node.document.hasAttribute('icons', 'font')) {
      return `<i class="conum" data-value="${node.text}"></i><b>(${node.text})</b>`
    }
    if (node.document.hasAttribute('icons')) {
      const src = await node.iconUri(`callouts/${node.text}`)
      return `<img src="${src}" alt="${node.text}"${this._voidSlash}>`
    }
    const guard = node.attributes.guard
    if (Array.isArray(guard)) {
      return `&lt;!--<b class="callout-num">(${node.text})</b>--&gt;`
    }
    return `${guard ?? ''}<b class="callout-num">(${node.text})</b>`
  }

  async convert_inline_footnote(node) {
    const index = node.getAttribute('index')
    if (index) {
      if (node.type === 'xref') {
        return `<sup class="footnote-ref"><a class="footnote" href="#_footnotedef_${index}" title="View footnote." role="doc-noteref">${index}</a></sup>`
      }
      const idAttr = node.id ? ` id="_footnote_${node.id}"` : ''
      return `<sup class="footnote-ref"${idAttr}><a id="_footnoteref_${index}" class="footnote" href="#_footnotedef_${index}" title="View footnote." role="doc-noteref">${index}</a></sup>`
    }
    if (node.type === 'xref') {
      return `<sup class="footnote-ref red" title="Unresolved footnote reference.">[${node.text}]</sup>`
    }
    return null
  }

  async convert_inline_indexterm(node) {
    return node.type === 'visible' ? node.text : ''
  }

  async convert_inline_kbd(node) {
    const keys = node.getAttribute('keys')
    if (keys.length === 1) {
      return `<kbd>${keys[0]}</kbd>`
    }
    return `<span class="key-seq"><kbd>${keys.join('</kbd>+<kbd>')}</kbd></span>`
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
          'single-quote'
        )
        return `<span${attributes}>&#8216;${node.text}&#8217;</span>`
      case 'double':
        attributes = this._commonHtmlAttributes(
          node.id,
          node.role,
          'double-quote'
        )
        return `<span${attributes}>&#8220;${node.text}&#8221;</span>`
      case 'asciimath':
      case 'latexmath': {
        const [open, close] = INLINE_MATH_DELIMITERS[node.type]
        return `${open}${node.text}${close}`
      }
      default:
        return `<span${attributes}>${node.text}</span>`
    }
  }

  async convert_inline_break(node) {
    return `${node.text}<br${this._voidSlash}>`
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
        return `<span class="menu-seq"><b class="menu">${menu}</b>${caret}<b class="menu-item">${menuitem}</b></span>`
      }
      return `<span class="menu-seq"><b class="menu">${menu}</b></span>`
    }
    return `<span class="menu-seq"><b class="menu">${menu}</b>${caret}<b class="submenu">${submenus.join(submenuJoiner)}</b>${caret}<b class="menu-item">${node.getAttribute('menuitem')}</b></span>`
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
          return `${signifier ? `${signifier} ` : ''}<span class="sect-num">${node.sectnum()}</span>`
        case 'part':
          signifier = docAttrs['part-signifier']
          return `${signifier ? `${signifier} ` : ''}<span class="sect-num">${node.sectnum(null, ':')}</span>`
        default:
          return `<span class="sect-num">${node.sectnum()}</span>`
      }
    }
    return `<span class="sect-num">${node.sectnum()}</span>`
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
   * Wrap the given markup in a <figure> with the node's title as <figcaption>;
   * the node's id and roles go on the <figure>. Returns the markup unchanged
   * when the node has no title.
   *
   * @internal
   * @private
   */
  _wrapInFigureWithTitle(node, markup) {
    if (!node.hasTitle()) return markup
    return `<figure${this._commonHtmlAttributes(node.id, node.role)}>
<figcaption>${node.title}</figcaption>
${markup}
</figure>`
  }

  /**
   * @internal
   * @private
   */
  _generateAttribution(node) {
    const attribution = node.hasAttribute('attribution')
      ? node.getAttribute('attribution')
      : null
    const citetitle = node.hasAttribute('citetitle')
      ? node.getAttribute('citetitle')
      : null
    if (!attribution && !citetitle) return ''
    const citeElement = citetitle ? `<cite>${citetitle}</cite>` : ''
    const attributionText = attribution
      ? `<span class="attribution">${attribution}</span>${citetitle ? ', ' : ''}`
      : ''
    return `\n<footer>&#8212; ${attributionText}${citeElement}</footer>`
  }

  /**
   * @internal
   * @private
   */
  _hasAutoToc(node) {
    if (!(node.hasSections() && node.hasAttribute('toc'))) return false
    const placement = node.getAttribute('toc-placement')
    return placement !== 'macro' && placement !== 'preamble'
  }

  /**
   * Generate the table of contents as a <nav> containing the section outline.
   *
   * @internal
   * @private
   */
  async _generateToc(doc, opts = {}) {
    const outline = await doc.converter.convert(
      doc,
      'outline',
      opts.toclevels != null ? { toclevels: opts.toclevels } : {}
    )
    if (!outline) return null
    const id = opts.id ?? 'toc'
    const title = opts.title ?? doc.getAttribute('toc-title')
    const role = opts.role ?? doc.getAttribute('toc-class', 'toc')
    return `<nav id="${id}" class="${role}">
<strong class="title" id="${id === 'toc' ? 'toctitle' : `${id}title`}">${title}</strong>
${outline}
</nav>`
  }

  /**
   * Generate the footnotes as a <section> of <ol> endnotes (with doc-endnotes /
   * doc-endnote / doc-backlink ARIA roles).
   *
   * @internal
   * @private
   */
  _generateFootnotes(node) {
    if (!(node.hasFootnotes() && !node.hasAttribute('nofootnotes'))) return null
    const result = [
      '<section class="footnotes" role="doc-endnotes">',
      `<hr${this._voidSlash}>`,
    ]
    result.push('<ol class="footnotes">')
    for (const footnote of node.footnotes) {
      result.push(
        `<li id="_footnotedef_${footnote.index}" role="doc-endnote">${footnote.text} <a class="footnote-backref" href="#_footnoteref_${footnote.index}" role="doc-backlink">&#8617;</a></li>`
      )
    }
    result.push('</ol>')
    result.push('</section>')
    return result.join(LF)
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
   * Render a boolean attribute: bare in HTML syntax, name="name" in XML syntax.
   *
   * @internal
   * @private
   */
  _boolAttr(name) {
    return this._xmlMode ? ` ${name}="${name}"` : ` ${name}`
  }

  /**
   * @internal
   * @private
   */
  _encodeAttributeValue(val) {
    return val.includes('"') ? val.replace(/"/g, '&quot;') : val
  }
}

// Reuse the SVG-embedding machinery from the html5 converter (identical behavior)
SemanticHtml5Converter.prototype.readSvgContents =
  Html5Converter.prototype.readSvgContents
SemanticHtml5Converter.prototype._decodeDataUri =
  Html5Converter.prototype._decodeDataUri

SemanticHtml5Converter.registerFor('semantic-html5')
