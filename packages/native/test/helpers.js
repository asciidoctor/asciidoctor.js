// Shared test helpers for blocks tests
// Ported from Ruby Minitest assertion helpers used in blocks_test.rb

import assert from 'node:assert/strict'
import { parse } from 'node-html-parser'
import { DOMParser } from '@xmldom/xmldom'
import { select, useNamespaces } from 'xpath'
import { MemoryLogger, LoggerManager } from '../src/logging.js'

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
 * NOTE: node-html-parser treats <pre> as a raw-text element, so child elements
 * such as <code> inside <pre> are not parsed into the DOM and cannot be
 * matched by CSS selectors. Use assertXpath for any assertion that needs to
 * reach inside a <pre> block (e.g. pre/code or pre//code patterns).
 */
export function countCss (html, selector) {
  // Normalize XML namespace declarations and xml: attribute prefix so that
  // css-select can match DocBook/XML output without namespace support.
  const normalized = html
    .replace(/\s+xmlns(?::\w+)?="[^"]*"/g, '')
    .replace(/\bxml:(\w+)=/g, '$1=')
  const root = parse(`<body>${normalized}</body>`)
  return root.querySelectorAll(selector).length
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
 * Count occurrences of an XPath expression in an HTML string.
 * Ruby: assert_xpath '//p', html, 2
 */
export function countXpath (html, xpath) {
  const trimmed = html.trimStart()
  let xmlSrc
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<?xml')) {
    // Full HTML document: strip DOCTYPE and self-close void elements so that
    // xmldom can parse as XML (no XHTML namespace, so XPath element names work as-is).
    xmlSrc = html
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<(meta|link|br|hr|img|input|area|base|col|embed|param|source|track|wbr)\b((?:[^>"']|"[^"]*"|'[^']*')*?)>/gi, '<$1$2/>')
      .trim()
  } else {
    // Fragment: self-close void elements so xmldom can parse as XML, then wrap in <root>
    // so XML has a single root and XPath can address any number of top-level elements.
    // Absolute XPath paths (starting with / but not //) are rewritten to include the wrapper
    // so that /*[@class="foo"] and (/*[@class="foo"])[1]/... still work.
    xmlSrc = `<root>${html.replace(/<(meta|link|br|hr|img|input|area|base|col|embed|param|source|track|wbr)\b((?:[^>"']|"[^"]*"|'[^']*')*?)>/gi, '<$1$2/>')}</root>`
    xpath = xpath
      .replace(/^\/([^/])/, '/root/$1')
      .replace(/\(\/([^/])/g, '(/root/$1')
  }
  // Strip XML namespace declarations so XPath expressions like //svg match without
  // needing a namespace resolver (elements with xmlns="..." would otherwise be in a
  // named namespace and //svg would not find them).
  xmlSrc = xmlSrc.replace(/\s+xmlns(?::\w+)?="[^"]*"/g, '')
  const doc = new DOMParser({ onError: () => {} }).parseFromString(xmlSrc, 'text/xml')
  // Cast to any to bridge @xmldom/xmldom ↔ xpath type mismatch (compatible at runtime).
  // Use a namespace-aware selector so that xml:id attributes (xml namespace) are resolved.
  const selectFn = useNamespaces({ xml: 'http://www.w3.org/XML/1998/namespace' })
  const nodes = selectFn(xpath, /** @type {any} */ (doc))
  return Array.isArray(nodes) ? nodes.length : (nodes ? 1 : 0)
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

/**
 * Assert that a logger contains exactly the given list of messages (order-independent).
 * Ruby: assert_messages @logger, [[:WARN, 'text'], [:ERROR, 'text2']]
 */
export function assertMessages (logger, expected) {
  assert.equal(
    logger.messages.length,
    expected.length,
    `Expected ${expected.length} message(s) but got ${logger.messages.length}: ${JSON.stringify(logger.messages)}`
  )
  for (const [severity, text] of expected) {
    assertMessage(logger, severity, text)
  }
}

/**
 * Run fn with a fresh MemoryLogger installed, then restore the original logger.
 * Ruby: using_memory_logger { |logger| ... }
 */
export async function usingMemoryLogger (fn) {
  const defaultLogger = LoggerManager.logger
  const logger = new MemoryLogger()
  LoggerManager.logger = logger
  try {
    await fn(logger)
  } finally {
    LoggerManager.logger = defaultLogger
  }
}