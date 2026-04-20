import { createRequire } from 'node:module'
import { load, loadFile as _loadFile } from './load.js'
import { LoggerManager, MemoryLogger, NullLogger } from './logging.js'
import { SafeMode } from './constants.js'
import { Timings } from './timings.js'
import { Extensions } from './extensions.js'
import { Converter } from './converter.js'
import { Block } from './block.js'
import { Section } from './section.js'
import Html5Converter from './converter/html5.js'
import { SyntaxHighlighter } from './syntax_highlighter.js'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')
const ASCIIDOCTOR_CORE_VERSION = '2.0.26'

class Asciidoctor {
  /**
   * Get the version of Asciidoctor.js.
   *
   * @returns {string} - the version of Asciidoctor.js
   */
  getVersion () {
    return packageJson.version
  }

  /**
   * Get Asciidoctor core version number.
   *
   * @returns {string} - the version of Asciidoctor core (Ruby)
   */
  getCoreVersion () {
    return ASCIIDOCTOR_CORE_VERSION
  }

  get LoggerManager () {
    return LoggerManager
  }

  get MemoryLogger () {
    return MemoryLogger
  }

  get NullLogger () {
    return NullLogger
  }

  get SafeMode () {
    return SafeMode
  }

  get Timings () {
    return Timings
  }

  get Extensions () {
    return Extensions
  }

  get ConverterFactory () {
    return Converter
  }

  get Html5Converter () {
    return Html5Converter
  }

  get Block () {
    return Block
  }

  get Section () {
    return Section
  }

  get SyntaxHighlighter () {
    return SyntaxHighlighter
  }

  /**
   * Parse the AsciiDoc source input into a Document.
   *
   * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<Document>} - the parsed Document
   */
  async load (input, options = {}) {
    return load(input, options)
  }

  /**
   * Parse the AsciiDoc source input and convert it to the specified backend format.
   *
   * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<string>} - the converted output as a String
   */
  async convert (input, options = {}) {
    const doc = await load(input, options)
    return await doc.convert()
  }

  /**
   * Parse the contents of the AsciiDoc source file into a Document.
   *
   * @param {string} filename - the path to the AsciiDoc source file
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<Document>} - the parsed Document
   */
  async loadFile (filename, options = {}) {
    return _loadFile(filename, options)
  }

  /**
   * Parse the contents of the AsciiDoc source file and convert it to the specified backend format.
   *
   * @param {string} filename - the path to the AsciiDoc source file
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<string>} - the converted output as a String
   */
  async convertFile (filename, options = {}) {
    const doc = await _loadFile(filename, options)
    return await doc.convert()
  }
}

export default function () {
  return new Asciidoctor()
}
