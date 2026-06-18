import { parseHTML } from 'linkedom'

const SHOW_TEXT = 4

/**
 * Restores callout markers into syntax-highlighted HTML using source offsets.
 */
export function injectCallouts(node, callouts, highlighted) {
  if (!callouts || Object.keys(callouts).length === 0) {
    return highlighted
  }

  const { document } = parseHTML(`<html><body>${highlighted}</body></html>`)
  const body = document.body
  const insertions = buildInsertions(node, callouts)

  for (const insertion of insertions) {
    const position = findPosition(body, insertion.offset)
    if (!position) continue
    const fragment = createFragment(document, insertion.html)
    if (position.node.nodeType === 3) {
      insertIntoTextNode(document, position.node, position.offset, fragment)
    } else {
      position.node.append(fragment)
    }
  }
  callouts.length = 0

  return body.innerHTML
}

function buildInsertions(node, callouts) {
  const insertions = []
  const byOffset = new Map()
  for (const [guard, numeral, offset] of callouts) {
    node.document.callouts.readNextId()
    const converted = convertCallout(node, numeral, guard)
    const values = byOffset.get(offset) ?? []
    values.push(converted)
    byOffset.set(offset, values)
  }
  for (const [offset, values] of byOffset) {
    insertions.push({ offset, html: values.join(' ') })
  }
  return insertions.sort((a, b) => b.offset - a.offset)
}

function convertCallout(node, numeral, guard) {
  const doc = node.document
  if (doc.hasAttribute('icons', 'font')) {
    return `<i class="conum" data-value="${numeral}"></i><b>(${numeral})</b>`
  }
  if (doc.hasAttribute('icons')) {
    const iconsdir = doc.getAttribute(
      'iconsdir',
      `${doc.getAttribute('imagesdir', './images')}/icons`
    )
    return `<img src="${iconsdir}/callouts/${numeral}.png" alt="${numeral}">`
  }
  if (Array.isArray(guard)) {
    return `&lt;!--<b class="conum">(${numeral})</b>--&gt;`
  }
  return `${guard ?? ''}<b class="conum">(${numeral})</b>`
}

function findPosition(root, targetOffset) {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    SHOW_TEXT
  )
  let offset = 0
  let lastTextNode = null

  while (walker.nextNode()) {
    const node = walker.currentNode
    lastTextNode = node
    const text = node.data
    const nextOffset = offset + text.length
    if (targetOffset <= nextOffset) {
      return { node, offset: Math.max(targetOffset - offset, 0) }
    }
    offset = nextOffset
  }

  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.data.length }
  }
  return { node: root, offset: root.childNodes.length }
}

function createFragment(document, html) {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.content
}

function insertIntoTextNode(document, node, offset, fragment) {
  const text = node.data
  const parent = node.parentNode
  const next = node.nextSibling
  node.data = text.slice(0, offset)
  parent.insertBefore(fragment, next)
  if (offset < text.length) {
    parent.insertBefore(document.createTextNode(text.slice(offset)), next)
  }
}

export default injectCallouts
