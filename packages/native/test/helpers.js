// Shared test helpers for blocks tests
// Ported from Ruby Minitest assertion helpers used in blocks_test.rb

import assert from 'node:assert/strict'

/**
 * Decode a Unicode character by code point.
 * Ruby: decode_char 8212  →  JS: decodeChar(8212)
 */
export function decodeChar (code) {
  return String.fromCodePoint(code)
}

/**
 * Count occurrences of a CSS selector in an HTML string.
 * Ruby: assert_css '.foo', html, N
 *
 * NOTE: This is a basic regex/string-based implementation. For full CSS
 * selector support a proper DOM parser (e.g. node-html-parser) should
 * be wired in later.
 */
export function countCss (html, selector) {
  const s = selector.trim()

  // Split on combinators: child (>) and descendant (space), keeping segments
  const segments = s.split(/\s*>\s*|\s+/).filter(Boolean)

  if (segments.length === 1) {
    return countSimpleSelector(html, segments[0])
  }

  // For multi-segment selectors, find all ranges matching the first segment
  // then recursively count within those substrings.
  const [head, ...tail] = segments
  const ranges = findTagRanges(html, head)
  let total = 0
  for (const substr of ranges) {
    total += countCss(substr, tail.join(' '))
  }
  return total
}

/**
 * Find the inner HTML of all elements matching a simple selector.
 * Returns an array of HTML substrings (content between opening and closing tag).
 */
function findTagRanges (html, selector) {
  const results = []
  // Determine which tag to look for (default to any tag for class/id selectors)
  let tagPattern
  if (selector.startsWith('.') || selector.startsWith('#')) {
    tagPattern = '[a-zA-Z][a-zA-Z0-9]*'
  } else {
    const m = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/)
    tagPattern = m ? esc(m[1]) : '[a-zA-Z][a-zA-Z0-9]*'
  }
  const openRe = new RegExp(`<(${tagPattern})([^>]*)>`, 'gi')
  let match
  while ((match = openRe.exec(html)) !== null) {
    const [fullOpen, tag, attrs] = match
    // Check if this opening tag matches the selector
    if (!matchesSimpleSelector(attrs, selector)) continue
    // Find the matching closing tag (simple depth counter)
    let depth = 1
    let pos = openRe.lastIndex
    const closeRe = new RegExp(`</?${esc(tag)}[\\s>]`, 'gi')
    closeRe.lastIndex = pos
    let closeMatch
    while (depth > 0 && (closeMatch = closeRe.exec(html)) !== null) {
      if (closeMatch[0].startsWith('</')) depth--
      else depth++
    }
    const end = closeMatch ? closeMatch.index : html.length
    results.push(html.slice(openRe.lastIndex, end))
  }
  return results
}

function matchesSimpleSelector (attrs, selector) {
  if (selector.startsWith('#')) {
    const id = esc(selector.slice(1))
    return new RegExp(`\\bid="${id}"`).test(attrs)
  }
  if (selector.startsWith('.')) {
    const classes = (selector.match(/\.([^.#[: ]+)/g) ?? []).map((c) => c.slice(1))
    return classes.every((c) => new RegExp(`\\b${esc(c)}\\b`).test(attrs.match(/class="([^"]*)"/)?.[1] ?? ''))
  }
  // tag[attr="val"], tag.class, tag#id, tag
  const classParts = (selector.match(/\.([^.#[: ]+)/g) ?? []).map((c) => c.slice(1))
  const idPart = (selector.match(/#([^.#[: ]+)/) ?? [])[1]
  const attrPairs = [...selector.matchAll(/\[([^\]=]+)="([^"]*)"\]/g)]
  const classStr = attrs.match(/class="([^"]*)"/)?.[1] ?? ''
  if (!classParts.every((c) => new RegExp(`\\b${esc(c)}\\b`).test(classStr))) return false
  if (idPart && !new RegExp(`\\bid="${esc(idPart)}"`).test(attrs)) return false
  if (!attrPairs.every(([, attr, val]) => new RegExp(`${esc(attr)}="${esc(val)}"`).test(attrs))) return false
  return true
}

function esc (s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countSimpleSelector (html, selector) {
  // #id
  if (selector.startsWith('#')) {
    const id = esc(selector.slice(1))
    return (html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length
  }

  // .class (possibly multiple classes, e.g. .foo.bar)
  if (selector.startsWith('.')) {
    const classes = selector.match(/\.([^.#[: ]+)/g).map((c) => c.slice(1))
    let count = null
    for (const cls of classes) {
      const re = new RegExp(`class="[^"]*\\b${esc(cls)}\\b[^"]*"`, 'g')
      const n = (html.match(re) ?? []).length
      count = count === null ? n : Math.min(count, n)
    }
    return count ?? 0
  }

  // tag[attr="value"] — e.g. a[href="..."]
  const attrSel = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)(\[[^\]]+\])+(.*)$/)
  if (attrSel) {
    const tag = attrSel[1]
    // collect all [attr="value"] pairs
    const attrPairs = [...selector.matchAll(/\[([^\]=]+)="([^"]*)"\]/g)]
    const tagMatches = [...html.matchAll(new RegExp(`<${tag}([^>]*)>`, 'gi'))]
    let count = 0
    for (const [, attrs] of tagMatches) {
      const ok = attrPairs.every(([, attr, val]) => new RegExp(`${esc(attr)}="${esc(val)}"`).test(attrs))
      if (ok) count++
    }
    return count
  }

  // tag, tag.class, tag#id, tag#id.class, tag.class1.class2, etc.
  const m = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)([.#].+)?$/)
  if (m) {
    const [, tag, rest] = m
    if (!rest) {
      return (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length
    }
    const tagMatches = [...html.matchAll(new RegExp(`<${tag}([^>]*)>`, 'gi'))]
    let count = 0
    const classParts = (rest.match(/\.([^.#[: ]+)/g) ?? []).map((c) => c.slice(1))
    const idPart = (rest.match(/#([^.#[: ]+)/) ?? [])[1]
    for (const [, attrs] of tagMatches) {
      const classOk = classParts.every((c) => new RegExp(`\\b${esc(c)}\\b`).test(attrs))
      const idOk = idPart ? new RegExp(`\\bid="${esc(idPart)}"`).test(attrs) : true
      if (classOk && idOk) count++
    }
    return count
  }

  return 0
}

/**
 * Assert that exactly `expected` elements match `selector` in `html`.
 * Ruby: assert_css '.foo', html, 1
 */
export function assertCss (html, selector, expected) {
  const actual = countCss(html, selector)
  assert.equal(
    actual,
    expected,
    `Expected ${expected} element(s) matching CSS "${selector}" but found ${actual}.\nHTML:\n${html}`
  )
}

/**
 * Count occurrences of a very basic XPath expression in an HTML string.
 *
 * NOTE: Only a tiny subset of XPath is supported here (enough for the ported
 * tests). A full XPath engine should be plugged in for production use.
 */
export function countXpath (html, xpath) {
  // Delegate to a simple attribute/text-content counter.
  // This will need a proper XPath engine in a follow-up.
  // For now, try to detect common patterns and fall back to 0.

  // //*[@class="foo"] — count class attribute occurrences
  const classAttrMatch = xpath.match(/@class="([^"]+)"/)
  if (classAttrMatch) {
    const cls = classAttrMatch[1]
    return (html.match(new RegExp(`class="${cls}"`, 'g')) ?? []).length
  }

  // //tag — count opening tags
  const tagOnlyMatch = xpath.match(/\/\/([a-zA-Z][a-zA-Z0-9]*)$/)
  if (tagOnlyMatch) {
    const tag = tagOnlyMatch[1]
    return (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length
  }

  // Fallback: return 0 (will cause test to fail intentionally)
  return 0
}

/**
 * Assert that exactly `expected` nodes match `xpath` in `html`.
 * Ruby: assert_xpath '//p', html, 2
 */
export function assertXpath (html, xpath, expected) {
  const actual = countXpath(html, xpath)
  assert.equal(
    actual,
    expected,
    `Expected ${expected} node(s) matching XPath "${xpath}" but found ${actual}.\nHTML:\n${html}`
  )
}

/**
 * Assert that a logger contains a message with the given severity and text.
 * Ruby: assert_message @logger, :WARN, 'text', Hash
 */
export function assertMessage (logger, severity, text) {
  const sev = severity.toUpperCase()
  const found = logger.messages.some((m) => {
    if (m.severity.toUpperCase() !== sev) return false
    const msgText = typeof m.message === 'string' ? m.message : String(m.message)
    return msgText.includes(text)
  })
  assert.ok(found, `Expected ${sev} message containing "${text}" but got: ${JSON.stringify(logger.messages)}`)
}