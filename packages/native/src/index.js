/** @import { Document } from './document.js' */
/** @import { Registry, Preprocessor, TreeProcessor, Postprocessor, IncludeProcessor, DocinfoProcessor, BlockProcessor, InlineMacroProcessor, BlockMacroProcessor } from './extensions.js' */

import packageJson from '../package.json' with { type: 'json' }
import { load as _load, loadFile as _loadFile } from './load.js'
import { LoggerManager, MemoryLogger, NullLogger } from './logging.js'
import { SafeMode } from './constants.js'
import { Timings } from './timings.js'
import { Extensions } from './extensions.js'
import { Converter } from './converter.js'
import { Block } from './block.js'
import { Section } from './section.js'
import Html5Converter from './converter/html5.js'
import {
  SyntaxHighlighter,
  SyntaxHighlighterBase,
} from './syntax_highlighter.js'

const ASCIIDOCTOR_CORE_VERSION = '2.0.26'

const asciidoctor = {
  /**
   * Get the version of Asciidoctor.js.
   *
   * @returns {string} - the version of Asciidoctor.js
   */
  getVersion() {
    return packageJson.version
  },

  /**
   * Get Asciidoctor core version number.
   *
   * @returns {string} - the version of Asciidoctor core (Ruby)
   */
  getCoreVersion() {
    return ASCIIDOCTOR_CORE_VERSION
  },

  /** @type {typeof LoggerManager} */
  LoggerManager,

  /** @type {typeof MemoryLogger} */
  MemoryLogger,

  /** @type {typeof NullLogger} */
  NullLogger,

  /** @type {typeof SafeMode} */
  SafeMode,

  /** @type {typeof Timings} */
  Timings,

  /** @type {typeof Extensions} */
  Extensions,

  /** @type {typeof Converter} */
  ConverterFactory: Converter,

  /** @type {typeof Html5Converter} */
  Html5Converter,

  /** @type {typeof Block} */
  Block,

  /** @type {typeof Section} */
  Section,

  /** @type {typeof SyntaxHighlighter} */
  SyntaxHighlighter,

  /**
   * Parse the AsciiDoc source input into a Document.
   *
   * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<Document>} - the parsed Document
   */
  async load(input, options = {}) {
    return _load(input, options)
  },

  /**
   * Parse the AsciiDoc source input and convert it to the specified backend format.
   *
   * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<string>} - the converted output as a String
   */
  async convert(input, options = {}) {
    const doc = await _load(input, options)
    return await doc.convert()
  },

  /**
   * Parse the contents of the AsciiDoc source file into a Document.
   *
   * @param {string} filename - the path to the AsciiDoc source file
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<Document>} - the parsed Document
   */
  async loadFile(filename, options = {}) {
    return _loadFile(filename, options)
  },

  /**
   * Parse the contents of the AsciiDoc source file and convert it to the specified backend format.
   *
   * @param {string} filename - the path to the AsciiDoc source file
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<string>} - the converted output as a String
   */
  async convertFile(filename, options = {}) {
    const doc = await _loadFile(filename, options)
    return await doc.convert()
  },
}

export const {
  getVersion,
  getCoreVersion,
  load,
  convert,
  loadFile,
  convertFile,
} = asciidoctor

export {
  SyntaxHighlighterBase,
  LoggerManager,
  MemoryLogger,
  NullLogger,
  SafeMode,
  Timings,
  Extensions,
  Converter as ConverterFactory,
  Html5Converter,
  Block,
  Section,
  SyntaxHighlighter,
}

export default asciidoctor
