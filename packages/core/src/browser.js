import packageJson from '../package.json' with { type: 'json' }
import { load as _load } from './load.js'
import { convert } from './convert.js'
import {
  Document,
  DocumentTitle,
  Author,
  ImageReference,
  RevisionInfo,
} from './document.js'
import { Logger, LoggerManager, MemoryLogger, NullLogger } from './logging.js'
import { SafeMode } from './constants.js'
import { Timings } from './timings.js'
import { AbstractNode } from './abstract_node.js'
import { AbstractBlock } from './abstract_block.js'
import {
  Registry,
  ProcessorExtension,
  Preprocessor,
  TreeProcessor,
  Postprocessor,
  IncludeProcessor,
  DocinfoProcessor,
  BlockProcessor,
  InlineMacroProcessor,
  BlockMacroProcessor,
  Extensions,
} from './extensions.js'
import {
  Converter,
  DefaultFactory as DefaultConverterFactory,
} from './converter.js'
import { Inline } from './inline.js'
import { Block } from './block.js'
import { List, ListItem } from './list.js'
import { Section } from './section.js'
import { Cursor, Reader } from './reader.js'
import Html5Converter from './converter/html5.js'
import {
  SyntaxHighlighter,
  SyntaxHighlighterBase,
  DefaultFactory as DefaultSyntaxHighlighterFactory,
} from './syntax_highlighter.js'

const ASCIIDOCTOR_CORE_VERSION = '2.0.26'

/**
 * Get the version of Asciidoctor.js.
 *
 * @returns {string} - the version of Asciidoctor.js
 */
export function getVersion() {
  return packageJson.version
}

/**
 * Get Asciidoctor core version number.
 *
 * @returns {string} - the version of Asciidoctor core (Ruby)
 */
export function getCoreVersion() {
  return ASCIIDOCTOR_CORE_VERSION
}

/**
 * Parse the AsciiDoc source input into a Document.
 *
 * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<Document>} - the parsed Document
 */
export async function load(input, options = {}) {
  return _load(input, options)
}

export { convert }

export {
  Document,
  DocumentTitle,
  Author,
  ImageReference,
  RevisionInfo,
  Logger,
  AbstractNode,
  AbstractBlock,
  Inline,
  Block,
  List,
  ListItem,
  Section,
  Reader,
  SyntaxHighlighterBase,
  LoggerManager,
  MemoryLogger,
  NullLogger,
  SafeMode,
  Timings,
  Registry,
  ProcessorExtension,
  Preprocessor,
  TreeProcessor,
  Postprocessor,
  IncludeProcessor,
  DocinfoProcessor,
  BlockProcessor,
  InlineMacroProcessor,
  BlockMacroProcessor,
  Extensions,
  Cursor,
  Converter as ConverterFactory,
  DefaultConverterFactory,
  DefaultSyntaxHighlighterFactory,
  Html5Converter,
  SyntaxHighlighter,
}