// ESM port of converter/html5.rb
//
// Ruby-to-JavaScript notes:
//   - @xml_mode / @void_element_slash → this._xmlMode / this._voidSlash
//   - Ruby symbol keys in QUOTE_TAGS → plain string keys
//   - node.attr?  → node.hasAttribute()
//   - node.option? → node.hasOption()
//   - node.title? → node.hasTitle()
//   - node.sections? → node.hasSections()
//   - node.blocks? → node.hasBlocks()
//   - node.footnotes? → node.hasFootnotes()
//   - node.noheader/notitle/nofooter → node.isNoheader()/isNotitle()/isNofooter()
//   - node.sections → node.sections() (method)
//   - await node.content() → await node.content() (method on Block/Document)
//   - alias convert_pass content_only → convert_pass delegates to this.contentOnly()
//   - Stylesheets.instance.primary_stylesheet_data → Stylesheets.instance.primaryStylesheetData() (camelCase, async)
//   - read_svg_contents uses readContents (supports local and remote URIs via allow-uri-read)

import { ConverterBase } from '../converter.js'
import { AbstractNode } from '../abstract_node.js'
import {
  LF,
  SafeMode,
  DEFAULT_STYLESHEET_KEYS,
  DEFAULT_STYLESHEET_NAME,
  FONT_AWESOME_VERSION,
  MATHJAX_VERSION,
  BLOCK_MATH_DELIMITERS,
  INLINE_MATH_DELIMITERS,
} from '../constants.js'
import { XmlSanitizeRx } from '../rx.js'
import { extname, isUriish } from '../helpers.js'
import { Stylesheets } from '../stylesheets.js'

// ── Local regex constants ─────────────────────────────────────────────────────

const DropAnchorRx = /<(?:a\b[^>]*|\/a)>/g
const LeadingAnchorsRx = /^(?:<a id="[^"]+"><\/a>)+/
const StemBreakRx = / *\\\n(?:\\?\n)*|\n\n+/g
// NOTE In JavaScript ^ matches start of string when the m flag is not set (same as Opal)
const SvgPreambleRx = /^[\s\S]*?(?=<svg[\s>])/
const SvgStartTagRx = /^<svg(?:\s[^>]*)?>/
const DimensionAttributeRx = /\s(?:width|height|style)=(["'])[\s\S]*?\1/g

// ── Quote tag table ───────────────────────────────────────────────────────────

const QUOTE_TAGS = {
  monospaced: ['<code>', '</code>', true],
  emphasis: ['<em>', '</em>', true],
  strong: ['<strong>', '</strong>', true],
  double: ['&#8220;', '&#8221;'],
  single: ['&#8216;', '&#8217;'],
  mark: ['<mark>', '</mark>', true],
  superscript: ['<sup>', '</sup>', true],
  subscript: ['<sub>', '</sub>', true],
  asciimath: ['\\$', '\\$'],
  latexmath: ['\\(', '\\)'],
}
const DEFAULT_QUOTE_TAG = ['', '']

// ── Html5Converter ────────────────────────────────────────────────────────────

export default class Html5Converter extends ConverterBase {
  /**
   * Create a new Html5Converter instance.
   * @param {string} [backend='html5']
   * @param {Object} [opts={}]
   * @returns {Html5Converter}
   */
  static create(backend = 'html5', opts = {}) {
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
    const br = `<br${slash}>`
    let assetUriScheme = node.getAttribute('asset-uri-scheme', 'https')
    if (assetUriScheme) assetUriScheme = `${assetUriScheme}:`
    const cdnBaseUrl = `${assetUriScheme}//cdnjs.cloudflare.com/ajax/libs`
    const linkcss = node.hasAttribute('linkcss')
    const maxWidthAttr = node.hasAttribute('max-width')
      ? ` style="max-width: ${node.getAttribute('max-width')};"`
      : ''
    const result = ['<!DOCTYPE html>']
    const langAttribute = node.hasAttribute('nolang')
      ? ''
      : ` lang="${node.getAttribute('lang', 'en')}"`
    result.push(
      `<html${this._xmlMode ? ' xmlns="http://www.w3.org/1999/xhtml"' : ''}${langAttribute}>`
    )
    result.push(`<head>
<meta charset="${node.getAttribute('encoding', 'UTF-8')}"${slash}>
<meta http-equiv="X-UA-Compatible" content="IE=edge"${slash}>
<meta name="viewport" content="width=device-width, initial-scale=1.0"${slash}>`)
    let reproducible
    if (!(reproducible = node.hasAttribute('reproducible'))) {
      result.push(
        `<meta name="generator" content="Asciidoctor ${node.getAttribute('asciidoctor-version')}"${slash}>`
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
        if (iconExt) {
          iconType =
            iconExt === '.ico' ? 'image/x-icon' : `image/${iconExt.slice(1)}`
        } else {
          iconType = 'image/x-icon'
        }
      }
      result.push(
        `<link rel="icon" type="${iconType}" href="${iconHref}"${slash}>`
      )
    }
    result.push(
      `<title>${node.doctitle({ sanitize: true, use_fallback: true })}</title>`
    )

    // Access raw attribute value; '' means "use default stylesheet"
    const stylesheetRawVal =
      'stylesheet' in node.attributes ? node.attributes.stylesheet : null
    if (DEFAULT_STYLESHEET_KEYS.has(stylesheetRawVal)) {
      if (node.hasAttribute('webfonts')) {
        const webfonts = node.attributes.webfonts ?? ''
        const fontFamily =
          webfonts ||
          'Open+Sans:300,300italic,400,400italic,600,600italic%7CNoto+Serif:400,400italic,700,700italic%7CNoto+Sans+Mono:400,700'
        result.push(
          `<link rel="stylesheet" href="${assetUriScheme}//fonts.googleapis.com/css?family=${fontFamily}"${slash}>`
        )
      }
      if (linkcss) {
        result.push(
          `<link rel="stylesheet" href="${node.normalizeWebPath(DEFAULT_STYLESHEET_NAME, node.getAttribute('stylesdir'), false)}"${slash}>`
        )
      } else {
        result.push(
          `<style>\n${await Stylesheets.instance.primaryStylesheetData()}\n</style>`
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
    const sectioned = node.hasSections()
    let classes
    if (
      sectioned &&
      node.hasAttribute('toc-class') &&
      node.hasAttribute('toc') &&
      node.hasAttribute('toc-placement', 'auto')
    ) {
      classes = [
        node.doctype,
        node.getAttribute('toc-class'),
        `toc-${node.getAttribute('toc-position', 'header')}`,
      ]
    } else {
      classes = [node.doctype]
    }
    if (node.role) classes.push(node.role)
    result.push(`<body${idAttr} class="${classes.join(' ')}">`)

    const headerDocinfo = await node.docinfo('header')
    if (headerDocinfo) result.push(headerDocinfo)

    if (!node.isNoheader()) {
      result.push(`<div id="header"${maxWidthAttr}>`)
      if (node.doctype === 'manpage') {
        result.push(`<h1>${node.doctitle()} Manual Page</h1>`)
        if (
          sectioned &&
          node.hasAttribute('toc') &&
          node.hasAttribute('toc-placement', 'auto')
        ) {
          result.push(`<div id="toc" class="${node.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${node.getAttribute('toc-title')}</div>
${await node.converter.convert(node, 'outline')}
</div>`)
        }
        if (node.hasAttribute('manpurpose'))
          result.push(this._generateMannameSection(node))
      } else {
        if (node.hasHeader()) {
          if (!node.isNotitle()) result.push(`<h1>${node.header.title}</h1>`)
          const details = []
          let idx = 1
          for (const author of node.authors()) {
            details.push(
              `<span id="author${idx > 1 ? idx : ''}" class="author">${node.subReplacements(author.name)}</span>${br}`
            )
            if (author.email) {
              details.push(
                `<span id="email${idx > 1 ? idx : ''}" class="email">${await node.subMacros(author.email)}</span>${br}`
              )
            }
            idx++
          }
          if (node.hasAttribute('revnumber')) {
            const versionLabel = (
              node.getAttribute('version-label') || ''
            ).toLowerCase()
            details.push(
              `<span id="revnumber">${versionLabel} ${node.getAttribute('revnumber')}${node.hasAttribute('revdate') ? ',' : ''}</span>`
            )
          }
          if (node.hasAttribute('revdate')) {
            details.push(
              `<span id="revdate">${node.getAttribute('revdate')}</span>`
            )
          }
          if (node.hasAttribute('revremark')) {
            details.push(
              `${br}<span id="revremark">${node.getAttribute('revremark')}</span>`
            )
          }
          if (details.length > 0) {
            result.push('<div class="details">')
            result.push(...details)
            result.push('</div>')
          }
        }
        if (
          sectioned &&
          node.hasAttribute('toc') &&
          node.hasAttribute('toc-placement', 'auto')
        ) {
          result.push(`<div id="toc" class="${node.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${node.getAttribute('toc-title')}</div>
${await node.converter.convert(node, 'outline')}
</div>`)
        }
      }
      result.push('</div>')
    }

    result.push(`<div id="content"${maxWidthAttr}>
${await node.content()}
</div>`)

    if (node.hasFootnotes() && !node.hasAttribute('nofootnotes')) {
      result.push(`<div id="footnotes"${maxWidthAttr}>
<hr${slash}>`)
      for (const footnote of node.footnotes) {
        result.push(`<div class="footnote" id="_footnotedef_${footnote.index}">
<a href="#_footnoteref_${footnote.index}">${footnote.index}</a>. ${footnote.text}
</div>`)
      }
      result.push('</div>')
    }

    if (!node.isNofooter()) {
      result.push(`<div id="footer"${maxWidthAttr}>`)
      result.push('<div id="footer-text">')
      if (node.hasAttribute('revnumber')) {
        result.push(
          `${node.getAttribute('version-label')} ${node.getAttribute('revnumber')}${br}`
        )
      }
      if (node.hasAttribute('last-update-label') && !reproducible) {
        result.push(
          `${node.getAttribute('last-update-label')} ${node.getAttribute('docdatetime')}`
        )
      }
      result.push('</div>')
      result.push('</div>')
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
      // IMPORTANT inspect calls on delimiter arrays are intentional for JavaScript compat (emulates JSON.stringify)
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
    if ((node = data.script.parentNode) && (node = node.parentNode) && node.classList.contains("stemblock")) {
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
    if (node.doctype === 'manpage') {
      if (!node.isNotitle()) {
        const idAttr = node.id ? ` id="${node.id}"` : ''
        result.push(`<h1${idAttr}>${node.doctitle()} Manual Page</h1>`)
      }
      if (node.hasAttribute('manpurpose'))
        result.push(this._generateMannameSection(node))
    } else if (node.hasHeader() && !node.isNotitle()) {
      const idAttr = node.id ? ` id="${node.id}"` : ''
      result.push(`<h1${idAttr}>${node.header.title}</h1>`)
    }

    if (node.hasSections() && node.hasAttribute('toc')) {
      const tocP = node.getAttribute('toc-placement')
      if (tocP !== 'macro' && tocP !== 'preamble') {
        result.push(`<div id="toc" class="toc">
<div id="toctitle">${node.getAttribute('toc-title')}</div>
${await node.converter.convert(node, 'outline')}
</div>`)
      }
    }

    result.push(await node.content())

    if (node.hasFootnotes() && !node.hasAttribute('nofootnotes')) {
      result.push(`<div id="footnotes">
<hr${this._voidSlash}>`)
      for (const footnote of node.footnotes) {
        result.push(`<div class="footnote" id="_footnotedef_${footnote.index}">
<a href="#_footnoteref_${footnote.index}">${footnote.index}</a>. ${footnote.text}
</div>`)
      }
      result.push('</div>')
    }

    return result.join(LF)
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

    const result = [`<ul class="sectlevel${sectlevel}">`]
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

      const otag =
        slevel === sectlevel ? '<li>' : `<li class="sectlevel${slevel}">`
      if (slevel < stoclevels) {
        const childTocLevel = await this.convert_outline(section, {
          toclevels: stoclevels,
          sectnumlevels,
        })
        if (childTocLevel) {
          result.push(`${otag}<a href="#${section.id}">${stitle}</a>`)
          result.push(childTocLevel)
          result.push('</li>')
          continue
        }
      }
      result.push(`${otag}<a href="#${section.id}">${stitle}</a></li>`)
    }
    result.push('</ul>')
    return result.join(LF)
  }

  async convert_section(node) {
    const docAttrs = node.document.attributes
    const level = node.level
    let title
    if (node.caption) {
      title = node.captionedTitle()
    } else if (
      node.numbered &&
      level <= parseInt(docAttrs.sectnumlevels || 3, 10)
    ) {
      if (level < 2 && node.document.doctype === 'book') {
        const sectname = node.sectname
        if (sectname === 'chapter') {
          const signifier = docAttrs['chapter-signifier']
          title = `${signifier ? `${signifier} ` : ''}${node.sectnum()} ${node.title}`
        } else if (sectname === 'part') {
          const signifier = docAttrs['part-signifier']
          title = `${signifier ? `${signifier} ` : ''}${node.sectnum(null, ':')} ${node.title}`
        } else {
          title = `${node.sectnum()} ${node.title}`
        }
      } else {
        title = `${node.sectnum()} ${node.title}`
      }
    } else {
      title = node.title
    }

    let idAttr = ''
    if (node.id) {
      const id = node.id
      idAttr = ` id="${id}"`
      if ('sectlinks' in docAttrs) {
        let m
        if (title.startsWith('<a ') && (m = title.match(LeadingAnchorsRx))) {
          title = `${m[0]}<a class="link" href="#${id}">${title.slice(m[0].length)}</a>`
        } else {
          title = `<a class="link" href="#${id}">${title}</a>`
        }
      }
      if ('sectanchors' in docAttrs) {
        if (docAttrs.sectanchors === 'after') {
          title = `${title}<a class="anchor" href="#${id}"></a>`
        } else {
          title = `<a class="anchor" href="#${id}"></a>${title}`
        }
      }
    }

    const role = node.role
    if (level === 0) {
      return `<h1${idAttr} class="sect0${role ? ` ${role}` : ''}">${title}</h1>
${await node.content()}`
    }
    return `<div class="sect${level}${role ? ` ${role}` : ''}">
<h${level + 1}${idAttr}>${title}</h${level + 1}>
${
  level === 1
    ? `<div class="sectionbody">
${await node.content()}
</div>`
    : await node.content()
}
</div>`
  }

  async convert_admonition(node) {
    const idAttr = node.id ? ` id="${node.id}"` : ''
    const name = node.getAttribute('name')
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.title}</div>\n`
      : ''
    let label
    if (node.document.hasAttribute('icons')) {
      if (
        node.document.hasAttribute('icons', 'font') &&
        !node.hasAttribute('icon')
      ) {
        label = `<i class="fa icon-${name}" title="${node.getAttribute('textlabel')}"></i>`
      } else {
        label = `<img src="${await node.iconUri(name)}" alt="${node.getAttribute('textlabel')}"${this._voidSlash}>`
      }
    } else {
      label = `<div class="title">${node.getAttribute('textlabel')}</div>`
    }
    return `<div${idAttr} class="admonitionblock ${name}${node.role ? ` ${node.role}` : ''}">
<table>
<tr>
<td class="icon">
${label}
</td>
<td class="content">
${titleElement}${await node.content()}
</td>
</tr>
</table>
</div>`
  }

  async convert_audio(node) {
    const xml = this._xmlMode
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = ['audioblock', node.role].filter(Boolean)
    const classAttribute = ` class="${classes.join(' ')}"`
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.title}</div>\n`
      : ''
    const startT = node.getAttribute('start')
    const endT = node.getAttribute('end')
    const timeAnchor =
      startT || endT ? `#t=${startT || ''}${endT ? `,${endT}` : ''}` : ''
    return `<div${idAttribute}${classAttribute}>
${titleElement}<div class="content">
<audio src="${node.mediaUri(node.getAttribute('target'))}${timeAnchor}"${node.hasOption('autoplay') ? this._appendBooleanAttr('autoplay', xml) : ''}${node.hasOption('nocontrols') ? '' : this._appendBooleanAttr('controls', xml)}${node.hasOption('loop') ? this._appendBooleanAttr('loop', xml) : ''}>
Your browser does not support the audio tag.
</audio>
</div>
</div>`
  }

  async convert_colist(node) {
    const result = []
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = ['colist', node.style, node.role].filter(Boolean)
    const classAttribute = ` class="${classes.join(' ')}"`

    result.push(`<div${idAttribute}${classAttribute}>`)
    if (node.hasTitle()) result.push(`<div class="title">${node.title}</div>`)

    if (node.document.hasAttribute('icons')) {
      result.push('<table>')
      const fontIcons = node.document.hasAttribute('icons', 'font')
      let num = 0
      for (const item of node.getItems()) {
        num++
        let numLabel
        if (fontIcons) {
          numLabel = `<i class="conum" data-value="${num}"></i><b>${num}</b>`
        } else {
          numLabel = `<img src="${await node.iconUri(`callouts/${num}`)}" alt="${num}"${this._voidSlash}>`
        }
        result.push(`<tr>
<td>${numLabel}</td>
<td>${item.getText()}${item.hasBlocks() ? LF + (await item.content()) : ''}</td>
</tr>`)
      }
      result.push('</table>')
    } else {
      result.push('<ol>')
      for (const item of node.getItems()) {
        result.push(`<li>
<p>${item.getText()}</p>${item.hasBlocks() ? LF + (await item.content()) : ''}
</li>`)
      }
      result.push('</ol>')
    }

    result.push('</div>')
    return result.join(LF)
  }

  async convert_dlist(node) {
    const result = []
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    let classes
    switch (node.style) {
      case 'qanda':
        classes = ['qlist', 'qanda', node.role]
        break
      case 'horizontal':
        classes = ['hdlist', node.role]
        break
      default:
        classes = ['dlist', node.style, node.role]
    }
    const classAttribute = ` class="${classes.filter(Boolean).join(' ')}"`

    result.push(`<div${idAttribute}${classAttribute}>`)
    if (node.hasTitle()) result.push(`<div class="title">${node.title}</div>`)

    switch (node.style) {
      case 'qanda':
        result.push('<ol>')
        for (const [terms, dd] of node.getItems()) {
          result.push('<li>')
          for (const dt of terms) {
            result.push(`<p><em>${dt.getText()}</em></p>`)
          }
          if (dd) {
            if (dd.hasText()) result.push(`<p>${dd.getText()}</p>`)
            if (dd.hasBlocks()) result.push(await dd.content())
          }
          result.push('</li>')
        }
        result.push('</ol>')
        break
      case 'horizontal': {
        const slash = this._voidSlash
        result.push('<table>')
        if (node.hasAttribute('labelwidth') || node.hasAttribute('itemwidth')) {
          result.push('<colgroup>')
          const labelWidthAttr = node.hasAttribute('labelwidth')
            ? ` width="${node.getAttribute('labelwidth').replace(/%$/, '')}%"`
            : ''
          result.push(`<col${labelWidthAttr}${slash}>`)
          const itemWidthAttr = node.hasAttribute('itemwidth')
            ? ` width="${node.getAttribute('itemwidth').replace(/%$/, '')}%"`
            : ''
          result.push(`<col${itemWidthAttr}${slash}>`)
          result.push('</colgroup>')
        }
        for (const [terms, dd] of node.getItems()) {
          result.push('<tr>')
          result.push(
            `<td class="hdlist1${node.hasOption('strong') ? ' strong' : ''}">`
          )
          let firstTerm = true
          for (const dt of terms) {
            if (!firstTerm) result.push(`<br${slash}>`)
            result.push(dt.getText())
            firstTerm = false
          }
          result.push('</td>')
          result.push('<td class="hdlist2">')
          if (dd) {
            if (dd.hasText()) result.push(`<p>${dd.getText()}</p>`)
            if (dd.hasBlocks()) result.push(await dd.content())
          }
          result.push('</td>')
          result.push('</tr>')
        }
        result.push('</table>')
        break
      }
      default: {
        result.push('<dl>')
        const dtStyleAttribute = node.style ? '' : ' class="hdlist1"'
        for (const [terms, dd] of node.getItems()) {
          for (const dt of terms) {
            result.push(`<dt${dtStyleAttribute}>${dt.getText()}</dt>`)
          }
          if (!dd) continue
          result.push('<dd>')
          if (dd.hasText()) result.push(`<p>${dd.getText()}</p>`)
          if (dd.hasBlocks()) result.push(await dd.content())
          result.push('</dd>')
        }
        result.push('</dl>')
      }
    }

    result.push('</div>')
    return result.join(LF)
  }

  async convert_example(node) {
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    if (node.hasOption('collapsible')) {
      const classAttribute = node.role ? ` class="${node.role}"` : ''
      const summaryElement = node.hasTitle()
        ? `<summary class="title">${node.title}</summary>`
        : '<summary class="title">Details</summary>'
      return `<details${idAttribute}${classAttribute}${node.hasOption('open') ? ' open' : ''}>
${summaryElement}
<div class="content">
${await node.content()}
</div>
</details>`
    }
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.captionedTitle()}</div>\n`
      : ''
    const role = node.role
    return `<div${idAttribute} class="exampleblock${role ? ` ${role}` : ''}">
${titleElement}<div class="content">
${await node.content()}
</div>
</div>`
  }

  async convert_floating_title(node) {
    const tagName = `h${node.level + 1}`
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = [node.style, node.role].filter(Boolean)
    return `<${tagName}${idAttribute} class="${classes.join(' ')}">${node.title}</${tagName}>`
  }

  async convert_image(node) {
    const target = node.getAttribute('target')
    const widthAttr = node.hasAttribute('width')
      ? ` width="${node.getAttribute('width')}"`
      : ''
    const heightAttr = node.hasAttribute('height')
      ? ` height="${node.getAttribute('height')}"`
      : ''
    const slash = this._voidSlash
    let img, src
    if (
      (node.hasAttribute('format', 'svg') || target.includes('.svg')) &&
      node.document.safe < SafeMode.SECURE
    ) {
      if (node.hasOption('inline')) {
        img =
          (await this.readSvgContents(node, target)) ||
          `<span class="alt">${node.getAlt()}</span>`
      } else if (
        node.hasOption('interactive') &&
        node.document.safe >= SafeMode.SERVER
      ) {
        const fallback = node.hasAttribute('fallback')
          ? `<img src="${await node.imageUri(node.getAttribute('fallback'))}" alt="${this._encodeAttrValue(node.getAlt())}"${widthAttr}${heightAttr}${slash}>`
          : `<span class="alt">${node.getAlt()}</span>`
        src = await node.imageUri(target)
        img = `<object type="image/svg+xml" data="${src}"${widthAttr}${heightAttr}>${fallback}</object>`
      } else {
        src = await node.imageUri(target)
        img = `<img src="${src}" alt="${this._encodeAttrValue(node.getAlt())}"${widthAttr}${heightAttr}${slash}>`
      }
    } else {
      src = await node.imageUri(target)
      img = `<img src="${src}" alt="${this._encodeAttrValue(node.getAlt())}"${widthAttr}${heightAttr}${slash}>`
    }

    if (node.hasAttribute('link')) {
      let hrefAttrVal = node.getAttribute('link')
      if (hrefAttrVal === 'self') hrefAttrVal = src
      if (hrefAttrVal) {
        img = `<a class="image" href="${hrefAttrVal}"${this._appendLinkConstraintAttrs(node).join('')}>${img}</a>`
      }
    }

    const idAttr = node.id ? ` id="${node.id}"` : ''
    const classes = ['imageblock']
    if (node.hasAttribute('float')) classes.push(node.getAttribute('float'))
    if (node.hasAttribute('align'))
      classes.push(`text-${node.getAttribute('align')}`)
    if (node.role) classes.push(node.role)
    const classAttr = ` class="${classes.join(' ')}"`
    const titleEl = node.hasTitle()
      ? `\n<div class="title">${node.captionedTitle()}</div>`
      : ''
    return `<div${idAttr}${classAttr}>
<div class="content">
${img}
</div>${titleEl}
</div>`
  }

  async convert_listing(node) {
    const nowrap =
      node.hasOption('nowrap') || !node.document.hasAttribute('prewrap')
    let preOpen, preClose, syntaxHl, lang, opts
    if (node.style === 'source') {
      lang = node.getAttribute('language')
      syntaxHl = node.document.syntaxHighlighter
      if (syntaxHl) {
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
      } else {
        preOpen = `<pre class="highlight${nowrap ? ' nowrap' : ''}"><code${lang ? ` class="language-${lang}" data-lang="${lang}"` : ''}>`
        preClose = '</code></pre>'
      }
    } else {
      preOpen = `<pre${nowrap ? ' class="nowrap"' : ''}>`
      preClose = '</pre>'
    }
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.captionedTitle()}</div>\n`
      : ''
    const role = node.role
    const inner = syntaxHl
      ? await syntaxHl.format(node, lang, opts)
      : `${preOpen}${await node.content()}${preClose}`
    return `<div${idAttribute} class="listingblock${role ? ` ${role}` : ''}">
${titleElement}<div class="content">
${inner}
</div>
</div>`
  }

  async convert_literal(node) {
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.title}</div>\n`
      : ''
    const nowrap =
      !node.document.hasAttribute('prewrap') || node.hasOption('nowrap')
    const role = node.role
    return `<div${idAttribute} class="literalblock${role ? ` ${role}` : ''}">
${titleElement}<div class="content">
<pre${nowrap ? ' class="nowrap"' : ''}>${await node.content()}</pre>
</div>
</div>`
  }

  async convert_stem(node) {
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.title}</div>\n`
      : ''
    const style = node.style
    const [open, close] = BLOCK_MATH_DELIMITERS[style] ?? ['', '']
    let equation = await node.content()
    if (equation) {
      if (style === 'asciimath' && equation.includes(LF)) {
        const br = `${LF}<br${this._voidSlash}>`
        equation = equation.replace(StemBreakRx, (match) => {
          const newlineCount = (match.match(/\n/g) || []).length
          return `${close}${br.repeat(newlineCount - 1)}${LF}${open}`
        })
      }
      if (!equation.startsWith(open) || !equation.endsWith(close)) {
        equation = `${open}${equation}${close}`
      }
    } else {
      equation = ''
    }
    const role = node.role
    return `<div${idAttribute} class="stemblock${role ? ` ${role}` : ''}">
${titleElement}<div class="content">
${equation}
</div>
</div>`
  }

  async convert_olist(node) {
    const result = []
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = ['olist', node.style, node.role].filter(Boolean)
    const classAttribute = ` class="${classes.join(' ')}"`

    result.push(`<div${idAttribute}${classAttribute}>`)
    if (node.hasTitle()) result.push(`<div class="title">${node.title}</div>`)

    const keyword = node.listMarkerKeyword()
    const typeAttribute = keyword ? ` type="${keyword}"` : ''
    const startAttribute = node.hasAttribute('start')
      ? ` start="${node.getAttribute('start')}"`
      : ''
    const reversedAttribute = node.hasOption('reversed')
      ? this._appendBooleanAttr('reversed', this._xmlMode)
      : ''
    result.push(
      `<ol class="${node.style}"${typeAttribute}${startAttribute}${reversedAttribute}>`
    )

    for (const item of node.getItems()) {
      if (item.id) {
        result.push(
          `<li id="${item.id}"${item.role ? ` class="${item.role}"` : ''}>`
        )
      } else if (item.role) {
        result.push(`<li class="${item.role}">`)
      } else {
        result.push('<li>')
      }
      result.push(`<p>${item.getText()}</p>`)
      if (item.hasBlocks()) result.push(await item.content())
      result.push('</li>')
    }

    result.push('</ol>')
    result.push('</div>')
    return result.join(LF)
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
      const idAttr = node.id ? ` id="${node.id}"` : ''
      const titleEl = node.hasTitle()
        ? `<div class="title">${node.title}</div>\n`
        : ''
      const role = node.role
      return `<div${idAttr} class="quoteblock abstract${role ? ` ${role}` : ''}">
${titleEl}<blockquote>
${await node.content()}
</blockquote>
</div>`
    }
    if (
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
    const idAttr = node.id ? ` id="${node.id}"` : ''
    const titleEl = node.hasTitle()
      ? `<div class="title">${node.title}</div>\n`
      : ''
    const role = node.role
    return `<div${idAttr} class="openblock${style && style !== 'open' ? ` ${style}` : ''}${role ? ` ${role}` : ''}">
${titleEl}<div class="content">
${await node.content()}
</div>
</div>`
  }

  async convert_page_break(_node) {
    return '<div class="page-break"></div>'
  }

  async convert_paragraph(node) {
    let attributes
    if (node.role) {
      attributes = `${node.id ? ` id="${node.id}"` : ''} class="paragraph ${node.role}"`
    } else if (node.id) {
      attributes = ` id="${node.id}" class="paragraph"`
    } else {
      attributes = ' class="paragraph"'
    }
    if (node.hasTitle()) {
      return `<div${attributes}>
<div class="title">${node.title}</div>
<p>${await node.content()}</p>
</div>`
    }
    return `<div${attributes}>
<p>${await node.content()}</p>
</div>`
  }

  // alias convert_pass → content_only
  async convert_pass(node) {
    return this.contentOnly(node)
  }

  async convert_preamble(node) {
    let toc = ''
    const doc = node.document
    if (
      doc.hasAttribute('toc-placement', 'preamble') &&
      doc.hasSections() &&
      doc.hasAttribute('toc')
    ) {
      toc = `
<div id="toc" class="${doc.getAttribute('toc-class', 'toc')}">
<div id="toctitle">${doc.getAttribute('toc-title')}</div>
${await doc.converter.convert(doc, 'outline')}
</div>`
    }
    return `<div id="preamble">
<div class="sectionbody">
${await node.content()}
</div>${toc}
</div>`
  }

  async convert_quote(node) {
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = ['quoteblock', node.role].filter(Boolean)
    const classAttribute = ` class="${classes.join(' ')}"`
    const titleElement = node.hasTitle()
      ? `\n<div class="title">${node.title}</div>`
      : ''
    const attribution = node.hasAttribute('attribution')
      ? node.getAttribute('attribution')
      : null
    const citetitle = node.hasAttribute('citetitle')
      ? node.getAttribute('citetitle')
      : null
    let attributionElement = ''
    if (attribution || citetitle) {
      const citeElement = citetitle ? `<cite>${citetitle}</cite>` : ''
      const attributionText = attribution
        ? `&#8212; ${attribution}${citetitle ? `<br${this._voidSlash}>\n` : ''}`
        : ''
      attributionElement = `\n<div class="attribution">\n${attributionText}${citeElement}\n</div>`
    }
    return `<div${idAttribute}${classAttribute}>${titleElement}
<blockquote>
${await node.content()}
</blockquote>${attributionElement}
</div>`
  }

  async convert_thematic_break(node) {
    const classAttribute = node.role ? ` class="${node.role}"` : ''
    return `<hr${classAttribute}${this._voidSlash}>`
  }

  async convert_sidebar(node) {
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const titleElement = node.hasTitle()
      ? `<div class="title">${node.title}</div>\n`
      : ''
    const role = node.role
    return `<div${idAttribute} class="sidebarblock${role ? ` ${role}` : ''}">
<div class="content">
${titleElement}${await node.content()}
</div>
</div>`
  }

  async convert_table(node) {
    const result = []
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    let frame = node.getAttribute('frame', 'all', 'table-frame')
    if (frame === 'topbot') frame = 'ends'
    const classes = [
      'tableblock',
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
        widthAttribute = ` width="${tablewidth}%"`
      }
    }
    if (node.hasAttribute('float')) classes.push(node.getAttribute('float'))
    if (node.role) classes.push(node.role)
    const classAttribute = ` class="${classes.join(' ')}"`

    result.push(`<table${idAttribute}${classAttribute}${widthAttribute}>`)
    if (node.hasTitle())
      result.push(`<caption class="title">${node.captionedTitle()}</caption>`)

    if (node.getAttribute('rowcount') > 0) {
      const slash = this._voidSlash
      result.push('<colgroup>')
      if (autowidth) {
        for (let i = 0; i < node.columns.length; i++)
          result.push(`<col${slash}>`)
      } else {
        for (const col of node.columns) {
          result.push(
            col.hasOption('autowidth')
              ? `<col${slash}>`
              : `<col width="${col.getAttribute('colpcwidth')}%"${slash}>`
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
                  cellContent = `<div class="content">${await cell.content()}</div>`
                  break
                case 'literal':
                  cellContent = `<div class="literal"><pre>${cell.text}</pre></div>`
                  break
                default: {
                  const parts = await cell.content()
                  cellContent =
                    parts.length === 0
                      ? ''
                      : `<p class="tableblock">${parts.join('</p>\n<p class="tableblock">')}</p>`
                }
              }
            }
            const cellTagName =
              tsec === 'head' || cell.style === 'header' ? 'th' : 'td'
            const cellClassAttr = ` class="tableblock halign-${cell.getAttribute('halign')} valign-${cell.getAttribute('valign')}"`
            const cellColspanAttr = cell.colspan
              ? ` colspan="${cell.colspan}"`
              : ''
            const cellRowspanAttr = cell.rowspan
              ? ` rowspan="${cell.rowspan}"`
              : ''
            // Use the per-cell captured cellbgcolor (set by {set:cellbgcolor:...} in cell text
            // during precomputeText). Fall back to the current document attribute if not captured.
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
    let idAttr, titleIdAttr
    if (node.id) {
      idAttr = ` id="${node.id}"`
      titleIdAttr = ` id="${node.id}title"`
    } else {
      idAttr = ' id="toc"'
      titleIdAttr = ' id="toctitle"'
    }
    const title = node.hasTitle() ? node.title : doc.getAttribute('toc-title')
    const levels = node.hasAttribute('levels')
      ? parseInt(node.getAttribute('levels'), 10)
      : null
    const role = node.hasRoleAttribute()
      ? node.role
      : doc.getAttribute('toc-class', 'toc')
    return `<div${idAttr} class="${role}">
<div${titleIdAttr} class="title">${title}</div>
${await doc.converter.convert(doc, 'outline', levels != null ? { toclevels: levels } : {})}
</div>`
  }

  async convert_ulist(node) {
    const result = []
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const divClasses = ['ulist', node.style, node.role].filter(Boolean)
    let markerChecked = ''
    let markerUnchecked = ''
    let ulClassAttribute
    const checklist = node.hasOption('checklist')
    if (checklist) {
      divClasses.splice(1, 0, 'checklist')
      ulClassAttribute = ' class="checklist"'
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
    } else {
      ulClassAttribute = node.style ? ` class="${node.style}"` : ''
    }
    result.push(`<div${idAttribute} class="${divClasses.join(' ')}">`)
    if (node.hasTitle()) result.push(`<div class="title">${node.title}</div>`)
    result.push(`<ul${ulClassAttribute}>`)

    for (const item of node.getItems()) {
      if (item.id) {
        result.push(
          `<li id="${item.id}"${item.role ? ` class="${item.role}"` : ''}>`
        )
      } else if (item.role) {
        result.push(`<li class="${item.role}">`)
      } else {
        result.push('<li>')
      }
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
    result.push('</div>')
    return result.join(LF)
  }

  async convert_verse(node) {
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = ['verseblock', node.role].filter(Boolean)
    const classAttribute = ` class="${classes.join(' ')}"`
    const titleElement = node.hasTitle()
      ? `\n<div class="title">${node.title}</div>`
      : ''
    const attribution = node.hasAttribute('attribution')
      ? node.getAttribute('attribution')
      : null
    const citetitle = node.hasAttribute('citetitle')
      ? node.getAttribute('citetitle')
      : null
    let attributionElement = ''
    if (attribution || citetitle) {
      const citeElement = citetitle ? `<cite>${citetitle}</cite>` : ''
      const attributionText = attribution
        ? `&#8212; ${attribution}${citetitle ? `<br${this._voidSlash}>\n` : ''}`
        : ''
      attributionElement = `\n<div class="attribution">\n${attributionText}${citeElement}\n</div>`
    }
    return `<div${idAttribute}${classAttribute}>${titleElement}
<pre class="content">${await node.content()}</pre>${attributionElement}
</div>`
  }

  async convert_video(node) {
    const xml = this._xmlMode
    const idAttribute = node.id ? ` id="${node.id}"` : ''
    const classes = ['videoblock']
    if (node.hasAttribute('float')) classes.push(node.getAttribute('float'))
    if (node.hasAttribute('align'))
      classes.push(`text-${node.getAttribute('align')}`)
    if (node.role) classes.push(node.role)
    const classAttribute = ` class="${classes.join(' ')}"`
    const titleElement = node.hasTitle()
      ? `\n<div class="title">${node.title}</div>`
      : ''
    const widthAttribute = node.hasAttribute('width')
      ? ` width="${node.getAttribute('width')}"`
      : ''
    const heightAttribute = node.hasAttribute('height')
      ? ` height="${node.getAttribute('height')}"`
      : ''

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
        return `<div${idAttribute}${classAttribute}>${titleElement}
<div class="content">
<iframe${widthAttribute}${heightAttribute} src="${assetUriScheme}//player.vimeo.com/video/${target}${hashParam}${autoplayParam}${loopParam}${mutedParam}${startAnchor}" frameborder="0"${node.hasOption('nofullscreen') ? '' : this._appendBooleanAttr('allowfullscreen', xml)}></iframe>
</div>
</div>`
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
          fsAttribute = this._appendBooleanAttr('allowfullscreen', xml)
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
          let playlist
          const videoParts = target.split(',')
          target = videoParts[0]
          playlist =
            videoParts.length > 1 ? videoParts.slice(1).join(',') : null
          playlist ||= node.getAttribute('playlist')
          if (playlist) {
            listParam = `&amp;playlist=${target},${playlist}`
          } else {
            listParam = hasLoopParam ? `&amp;playlist=${target}` : ''
          }
        }
        return `<div${idAttribute}${classAttribute}>${titleElement}
<div class="content">
<iframe${widthAttribute}${heightAttribute} src="${assetUriScheme}//www.youtube.com/embed/${target}?rel=${relParamVal}${startParam}${endParam}${autoplayParam}${loopParam}${muteParam}${controlsParam}${listParam}${fsParam}${modestParam}${themeParam}${hlParam}" frameborder="0"${fsAttribute}></iframe>
</div>
</div>`
      }
      case 'wistia': {
        let assetUriScheme = node.document.getAttribute(
          'asset-uri-scheme',
          'https'
        )
        if (assetUriScheme) assetUriScheme = `${assetUriScheme}:`
        const delimiter = ['?']
        const startAnchor = node.hasAttribute('start')
          ? `${delimiter.pop() || '&amp;'}time=${node.getAttribute('start')}`
          : ''
        const endVideoBehaviorParam = node.hasOption('loop')
          ? `${delimiter.pop() || '&amp;'}endVideoBehavior=loop`
          : node.hasOption('reset')
            ? `${delimiter.pop() || '&amp;'}endVideoBehavior=reset`
            : ''
        const target = node.getAttribute('target')
        const autoplayParam = node.hasOption('autoplay')
          ? `${delimiter.pop() || '&amp;'}autoPlay=true`
          : ''
        const mutedParam = node.hasOption('muted')
          ? `${delimiter.pop() || '&amp;'}muted=true`
          : ''
        return `<div${idAttribute}${classAttribute}>${titleElement}
<div class="content">
<iframe${widthAttribute}${heightAttribute} src="${assetUriScheme}//fast.wistia.com/embed/iframe/${target}${startAnchor}${autoplayParam}${endVideoBehaviorParam}${mutedParam}" frameborder="0"${node.hasOption('nofullscreen') ? '' : this._appendBooleanAttr('allowfullscreen', xml)} class="wistia_embed" name="wistia_embed"></iframe>
</div>
</div>`
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
        return `<div${idAttribute}${classAttribute}>${titleElement}
<div class="content">
<video src="${node.mediaUri(node.getAttribute('target'))}${timeAnchor}"${widthAttribute}${heightAttribute}${posterAttribute}${node.hasOption('autoplay') ? this._appendBooleanAttr('autoplay', xml) : ''}${node.hasOption('muted') ? this._appendBooleanAttr('muted', xml) : ''}${node.hasOption('nocontrols') ? '' : this._appendBooleanAttr('controls', xml)}${node.hasOption('loop') ? this._appendBooleanAttr('loop', xml) : ''}${preloadAttribute}>
Your browser does not support the video tag.
</video>
</div>
</div>`
      }
    }
  }

  async convert_inline_anchor(node) {
    switch (node.type) {
      case 'xref': {
        let attrs, text
        if (node.attributes.path) {
          attrs = this._appendLinkConstraintAttrs(
            node,
            node.role ? [` class="${node.role}"`] : []
          ).join('')
          text = node.text || node.attributes.path
        } else {
          attrs = node.role ? ` class="${node.role}"` : ''
          if (!(text = node.text)) {
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
      case 'link': {
        const attrs = node.id ? [` id="${node.id}"`] : []
        if (node.role) attrs.push(` class="${node.role}"`)
        if (node.hasAttribute('title'))
          attrs.push(` title="${node.getAttribute('title')}"`)
        return `<a href="${node.target}"${this._appendLinkConstraintAttrs(node, attrs).join('')}>${node.text ?? ''}</a>`
      }
      case 'bibref':
        return `<a id="${node.id}"></a>[${node.reftext || node.id}]`
      default:
        this.logger.warn(`unknown anchor type: ${node.type}`)
        return null
    }
  }

  async convert_inline_break(node) {
    return `${node.text}<br${this._voidSlash}>`
  }

  async convert_inline_button(node) {
    return `<b class="button">${node.text}</b>`
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
      return `&lt;!--<b class="conum">(${node.text})</b>--&gt;`
    }
    return `${guard ?? ''}<b class="conum">(${node.text})</b>`
  }

  async convert_inline_footnote(node) {
    const index = node.getAttribute('index')
    if (index) {
      if (node.type === 'xref') {
        return `<sup class="footnoteref">[<a class="footnote" href="#_footnotedef_${index}" title="View footnote.">${index}</a>]</sup>`
      }
      const idAttr = node.id ? ` id="_footnote_${node.id}"` : ''
      return `<sup class="footnote"${idAttr}>[<a id="_footnoteref_${index}" class="footnote" href="#_footnotedef_${index}" title="View footnote.">${index}</a>]</sup>`
    }
    if (node.type === 'xref') {
      return `<sup class="footnoteref red" title="Unresolved footnote reference.">[${node.text}]</sup>`
    }
    return null
  }

  async convert_inline_image(node) {
    const target = node.target
    const type = node.type || 'image'
    let img, src
    if (type === 'icon') {
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
        const titleAttr = node.hasAttribute('title')
          ? ` title="${node.getAttribute('title')}"`
          : ''
        img = `<i class="${iClassAttrVal}"${titleAttr}></i>`
      } else if (icons != null) {
        let attrs = node.hasAttribute('width')
          ? ` width="${node.getAttribute('width')}"`
          : ''
        if (node.hasAttribute('height'))
          attrs += ` height="${node.getAttribute('height')}"`
        if (node.hasAttribute('title'))
          attrs += ` title="${node.getAttribute('title')}"`
        img = `<img src="${await node.iconUri(target)}" alt="${this._encodeAttrValue(node.getAlt())}"${attrs}${this._voidSlash}>`
      } else {
        img = `[${node.getAlt()}&#93;`
      }
    } else {
      let attrs = node.hasAttribute('width')
        ? ` width="${node.getAttribute('width')}"`
        : ''
      if (node.hasAttribute('height'))
        attrs += ` height="${node.getAttribute('height')}"`
      if (node.hasAttribute('title'))
        attrs += ` title="${node.getAttribute('title')}"`
      if (
        (node.hasAttribute('format', 'svg') || target.includes('.svg')) &&
        node.document.safe < SafeMode.SECURE
      ) {
        if (node.hasOption('inline')) {
          img =
            (await this.readSvgContents(node, target)) ||
            `<span class="alt">${node.getAlt()}</span>`
        } else if (
          node.hasOption('interactive') &&
          node.document.safe >= SafeMode.SERVER
        ) {
          const fallback = node.hasAttribute('fallback')
            ? `<img src="${await node.imageUri(node.getAttribute('fallback'))}" alt="${this._encodeAttrValue(node.getAlt())}"${attrs}${this._voidSlash}>`
            : `<span class="alt">${node.getAlt()}</span>`
          src = await node.imageUri(target)
          img = `<object type="image/svg+xml" data="${src}"${attrs}>${fallback}</object>`
        } else {
          src = await node.imageUri(target)
          img = `<img src="${src}" alt="${this._encodeAttrValue(node.getAlt())}"${attrs}${this._voidSlash}>`
        }
      } else {
        src = await node.imageUri(target)
        img = `<img src="${src}" alt="${this._encodeAttrValue(node.getAlt())}"${attrs}${this._voidSlash}>`
      }
    }

    if (node.hasAttribute('link')) {
      let hrefAttrVal = node.getAttribute('link')
      if (hrefAttrVal === 'self') hrefAttrVal = src
      if (hrefAttrVal) {
        img = `<a class="image" href="${hrefAttrVal}"${this._appendLinkConstraintAttrs(node).join('')}>${img}</a>`
      }
    }

    const idAttr = node.id ? ` id="${node.id}"` : ''
    let classAttrVal = type
    const role = node.role
    if (role) {
      classAttrVal = node.hasAttribute('float')
        ? `${classAttrVal} ${node.getAttribute('float')} ${role}`
        : `${classAttrVal} ${role}`
    } else if (node.hasAttribute('float')) {
      classAttrVal = `${classAttrVal} ${node.getAttribute('float')}`
    }
    return `<span${idAttr} class="${classAttrVal}">${img}</span>`
  }

  async convert_inline_indexterm(node) {
    return node.type === 'visible' ? node.text : ''
  }

  async convert_inline_kbd(node) {
    const keys = node.getAttribute('keys')
    if (keys.length === 1) {
      return `<kbd>${keys[0]}</kbd>`
    }
    return `<span class="keyseq"><kbd>${keys.join('</kbd>+<kbd>')}</kbd></span>`
  }

  async convert_inline_menu(node) {
    const caret = node.document.hasAttribute('icons', 'font')
      ? '&#160;<i class="fa fa-angle-right caret"></i> '
      : '&#160;<b class="caret">&#8250;</b> '
    const submenuJoiner = `</b>${caret}<b class="submenu">`
    const menu = node.getAttribute('menu')
    const submenus = node.getAttribute('submenus')
    if (!submenus || submenus.length === 0) {
      const menuitem = node.getAttribute('menuitem')
      if (menuitem) {
        return `<span class="menuseq"><b class="menu">${menu}</b>${caret}<b class="menuitem">${menuitem}</b></span>`
      }
      return `<b class="menuref">${menu}</b>`
    }
    return `<span class="menuseq"><b class="menu">${menu}</b>${caret}<b class="submenu">${submenus.join(submenuJoiner)}</b>${caret}<b class="menuitem">${node.getAttribute('menuitem')}</b></span>`
  }

  async convert_inline_quoted(node) {
    const [open, close, tag] = QUOTE_TAGS[node.type] ?? DEFAULT_QUOTE_TAG
    if (node.id) {
      const classAttr = node.role ? ` class="${node.role}"` : ''
      if (tag) {
        return `${open.slice(0, -1)} id="${node.id}"${classAttr}>${node.text}${close}`
      }
      return `<span id="${node.id}"${classAttr}>${open}${node.text}${close}</span>`
    }
    if (node.role) {
      if (tag) {
        return `${open.slice(0, -1)} class="${node.role}">${node.text}${close}`
      }
      return `<span class="${node.role}">${open}${node.text}${close}</span>`
    }
    return `${open}${node.text}${close}`
  }

  // NOTE expose readSvgContents for Bespoke converter
  async readSvgContents(node, target) {
    const imagesdir = node.document.getAttribute('imagesdir')
    let resolvedPath
    let svg
    if (isUriish(target) || (imagesdir && isUriish(imagesdir))) {
      svg = await node.readContents(target, {
        start: imagesdir,
        normalize: true,
        warnOnFailure: true,
        label: 'SVG',
      })
      resolvedPath = target
    } else {
      resolvedPath = node.normalizeSystemPath(target, imagesdir, null, {
        targetName: 'image',
      })
      svg = await node.readAsset(resolvedPath, {
        normalize: true,
        warnOnFailure: true,
        label: 'SVG',
      })
    }
    if (svg == null) return null // file not found/readable; warning already emitted
    if (!svg) {
      node.logger.warn(`contents of SVG is empty: ${resolvedPath}`)
      return null
    }
    if (!svg.startsWith('<svg')) svg = svg.replace(SvgPreambleRx, '')
    // Fix incomplete SVG start tag (missing closing >) by inserting > before the first child element.
    // This handles cases like: <svg width="500"\n<circle .../> where the > is missing.
    svg = svg.replace(
      /^(<svg\b[^<>]*?)(\s*<[^/!])/s,
      (_, pre, rest) => `${pre.trimEnd()}>${rest}`
    )
    let oldStartTag = null
    let newStartTag = null
    let startTagMatch = null
    for (const dim of ['width', 'height']) {
      if (!node.hasAttribute(dim)) continue
      if (!newStartTag) {
        if (startTagMatch === null)
          startTagMatch = svg.match(SvgStartTagRx) || false
        if (!startTagMatch) continue
        oldStartTag = startTagMatch[0]
        newStartTag = oldStartTag.replace(
          new RegExp(DimensionAttributeRx.source, 'g'),
          ''
        )
      }
      newStartTag = `${newStartTag.slice(0, -1)} ${dim}="${node.getAttribute(dim)}">`
    }
    if (newStartTag) svg = `${newStartTag}${svg.slice(oldStartTag.length)}`
    return svg
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * @internal
   * @private
   */
  _appendBooleanAttr(name, xml) {
    return xml ? ` ${name}="${name}"` : ` ${name}`
  }

  /**
   * @internal
   * @private
   */
  _appendLinkConstraintAttrs(node, attrs = []) {
    const rel = node.hasOption('nofollow') ? 'nofollow' : null
    const window = node.attributes.window
    if (window) {
      attrs.push(` target="${window}"`)
      if (window === '_blank' || node.hasOption('noopener')) {
        attrs.push(rel ? ` rel="${rel} noopener"` : ' rel="noopener"')
      }
    } else if (rel) {
      attrs.push(` rel="${rel}"`)
    }
    return attrs
  }

  /**
   * @internal
   * @private
   */
  _encodeAttrValue(val) {
    return val.includes('"') ? val.replace(/"/g, '&quot;') : val
  }

  /**
   * @internal
   * @private
   */
  _generateMannameSection(node) {
    let mannameTitle = node.getAttribute('manname-title', 'Name')
    const sections = node.sections()
    if (sections.length > 0) {
      const nextSectionTitle = sections[0].title
      if (nextSectionTitle === nextSectionTitle.toUpperCase()) {
        mannameTitle = mannameTitle.toUpperCase()
      }
    }
    const mannameId = node.getAttribute('manname-id')
    const mannameIdAttr = mannameId ? ` id="${mannameId}"` : ''
    return `<h2${mannameIdAttr}>${mannameTitle}</h2>
<div class="sectionbody">
<p>${node.getAttribute('mannames').join(', ')} - ${node.getAttribute('manpurpose')}</p>
</div>`
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

Html5Converter.registerFor('html5')
