function isString (obj) {
  return Object.prototype.toString.call(obj) === '[object String]'
}

/**
 * Helper function to determine, what kind of block
 * the given block is. Must be enhanced, once table is
 * provided as a class in AsciDoctor
 * @param {AbstractBlock} node the node to test
 */
function getBlockType (node) {
  const nodeName = node.getNodeName()
  if (['document', 'section'].includes(nodeName)) {
    return nodeName
  } else if (['olist', 'ulist', 'dlist', 'colist'].includes(nodeName)) {
    return 'list'
  } else {
    return 'block'
  }
}

function getOptions (node) {
  const options = {}
  for (const key in node.getAttributes()) {
    if (key.endsWith('-option')) {
      const last = key.lastIndexOf('-option')
      const name = key.substring(0, last)
      options[name] = true
    }
  }
  return options
}

/**
 * Return the JSON attributes common to all
 * objects
 * @param {AbstractNode} node the node to process
 */
function getCommonNodeInfo (node) {
  return {
    id: node.getId(),
    nodeName: node.getNodeName(),
    roles: node.getRoles(),
    isInline: node.isInline(),
    isBlock: node.isBlock(),
    isDocument: node.getNodeName() === 'document',
    attributes: node.getAttributes(),
    options: getOptions(node),
    role: node.getRoles().length > 0 ? node.getRole() : '',
    isReftext: node.isReftext(),
    reftext: node.getReftext()
  }
}

/**
 * Return the JSON common to all block objects
 * @param {AbstractNode} node the node to process
 */
function getAbstractBlockInfo (node) {
  const ret = getCommonNodeInfo(node)
  ret.title = node.getTitle()
  ret.captionedTitle = node.getCaptionedTitle()
  ret.style = node.getStyle()
  ret.caption = node.getCaption()
  ret.level = node.getLevel()
  ret.hasBlocks = node.hasBlocks()
  if (['document', 'section'].includes(node.getNodeName())) {
    // Fix this if I get an answer for the Issue
    if (node.findBy('content', 'section')) {
      ret.hasSections = true
    } else {
      ret.hasSections = false
    }
  }
  const sectnumsset = node.getDocument().getAttribute('sectnums', false, true)
  if (sectnumsset && node.getNodeName() !== 'document') {
    ret.numeral = getNumeral(node)
  } else {
    ret.numeral = null
  }
  return ret
}

/**
 * Return the JSON representation of the document
 * @param {AbstractNode} node the node to process
 */
function getDocumentInfo (node) {
  const ret = getAbstractBlockInfo(node)
  ret.doctype = node.getDoctype()
  ret.isNested = node.isNested()
  ret.isEmbedded = node.isEmbedded()
  ret.hasExtensions = node.hasExtensions()
  ret.baseDir = node.getBaseDir()
  ret.outfilesuffix = node.getOutfilesuffix()
  ret.hasRevsionInfo = !node.getRevisionInfo().isEmpty()

  const dt = node.getDocumentTitle({ partition: true })
  if (dt) {
    ret.documentTitle = {
      main: dt.getMain(),
      combined: dt.getCombined(),
      subtitle: dt.getSubtitle(),
      isSanitized: dt.isSanitized(),
      hasSubtitle: dt.hasSubtitle()
    }
  }
  const theAuthors = []

  node.getAuthors().forEach((author) => {
    theAuthors.push({
      name: author.getName(),
      firstName: author.getFirstName(),
      middleName: author.getMiddleName(),
      lastName: author.getLastName(),
      initials: author.getInitials(),
      email: author.getEmail()
    })
  })
  ret.authors = theAuthors

  if (!node.getRevisionInfo().isEmpty()) {
    ret.revision = {
      number: node.getRevisionInfo().getNumber() || '',
      date: node.getRevisionInfo().getDate() || '',
      remark: node.getRevisionInfo().getRemark() || '',
      isEmpty: node.getRevisionInfo().isEmpty()
    }
  } else {
    ret.revison = null
  }

  const theFootnotes = []
  node.getFootnotes().forEach((footnote) => {
    theFootnotes.push({
      index: footnote.getIndex(),
      id: footnote.getId(),
      text: footnote.getText()
    })
  })
  ret.footnotes = theFootnotes
  return ret
}

function getNumeral (node) {
  const num = node.getNumeral()
  const ret = isString(num) ? num : null
  return ret
}

function calcSectionNumber (node, delimiter = '.') {
  let ret = ''

  const num = getNumeral(node)
    ? getNumeral(node)
    : node.getIndex() + 1
  if (node.getLevel() > 0 && node.getParent().getNodeName() === 'section') {
    ret =
      calcSectionNumber(node.getParent(), delimiter) + delimiter + num
  } else {
    ret = num
  }
  return ret
}

/**
 * Return the JSON representation of a Section
 * @param {AbstractNode} node the node to process
 */
function getSectionInfo (node) {
  const ret = getAbstractBlockInfo(node)
  ret.index = node.getIndex()
  ret.sectionName = node.getSectionName()
  ret.isSpecial = node.isSpecial()
  ret.isNumbered = node.isNumbered()
  ret.caption = node.getCaption()
  ret.name = node.getName()
  ret.sectionNumber = calcSectionNumber(node)
  ret.content = node.getContent()
  return ret
}

/**
 * Return the JSON representation of a Block
 * @param {AbstractNode} node the node to process
 */
function getBlockInfo (node) {
  const ret = getAbstractBlockInfo(node)
  ret.source = node.getSource()
  ret.sourceLines = node.getSourceLines()
  ret.content = node.getContent()
  return ret
}

/**
 * Return a JSON representation of the ListNode.
 * If it is a dlist, it is decomposed into special object
 * with the terms and definitions exposed via attributes
 * @param {AbstractNode} node the node to process
 */
function getListInfo (node) {
  const theItems = []
  node.getItems().forEach((item) => {
    if (node.getNodeName() === 'dlist') {
      const theTerms = []
      item[0].forEach((term) => {
        theTerms.push(term.getText())
      })
      const theDescription = {
        ...getCommonNodeInfo(item[1]), ...getAbstractBlockInfo(item[1])
      }
      theDescription.content = item[1].getContent()
      theItems.push({
        terms: theTerms,
        isDescriptionBlock: !isString(item[1].getText()),
        descText: item[1].getText(),
        description: theDescription.isBlock ? theDescription : theDescription.text
      })
    } else {
      const theItem = getAbstractBlockInfo(item)
      theItem.text = item.getText()
      theItem.hasText = item.hasText()
      theItem.marker = item.getMarker()
      theItem.content = item.getContent()
      theItems.push(theItem)
    }
  })
  const ret = getAbstractBlockInfo(node)
  ret.hasItems = node.hasItems()
  ret.items = theItems
  return ret
}

/**
 * Return a JSON representation of a given node
 * @param {AbstractNode} node the node to convert
 */
function toJSON (node) {
  let ret = getCommonNodeInfo(node)
  if (ret.isInline) {
    ret.document = getDocumentInfo(node.getDocument())
    ret.text = node.getText()
    ret.type = node.getType()
    ret.target = node.getTarget()
  } else {
    ret.blockType = getBlockType(node)
    if (ret.blocType === 'document') {
      ret = { ...ret, ...getDocumentInfo(node) }
      ret.content = node.getContent()
    } else {
      ret.document = getDocumentInfo(node.getDocument())
      if (ret.blocType === 'section') {
        ret = { ...ret, ...getSectionInfo(node) }
      } else if (ret.blockType === 'list') {
        ret = { ...ret, ...getListInfo(node) }
      } else {
        ret = { ...ret, ...getBlockInfo(node) }
      }
    }
  }
  return ret
}

/**
 * Return a string with the HTML attribute for the given value.
 * If the value is empty, an empty string is returned
 * @param {string} name the name of the attribute
 * @param {value} value the value of the attribute
 */
function toAttribute (name, value) {
  return value !== undefined && value.length !== 0 ? ` ${name}="${value}"` : ''
}

function configure (options) {
  const handlebars = options.handlebars.environment
  handlebars.registerHelper('concat', function (value1, value2) {
    const val1 = value1 !== undefined ? value1 : ''
    const val2 = value2 !== undefined ? value2 : ''
    let ret = ''
    if (val1 !== '') {
      ret = val1 + ' ' + val2
    } else {
      ret = val2
    }
    return ret.trim()
  })

  handlebars.registerHelper('toJSON', function (node, options) {
    return options.fn(toJSON(node))
  })
  handlebars.registerHelper('idAttribute', function () {
    const ret = this.id !== undefined ? ` id="${this.id}"` : ''
    return new handlebars.SafeString(ret)
  })
  handlebars.registerHelper('toAttribute', function (name, value) {
    return new handlebars.SafeString(toAttribute(name, value))
  })
}

module.exports.toJSON = toJSON
module.exports.toAttribute = toAttribute

module.exports.configure = (options) => {
  configure(options)
}
