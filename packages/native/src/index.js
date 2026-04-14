import { createRequire } from 'node:module'
import { load, loadFile as _loadFile } from './load.js'
import { LoggerManager, MemoryLogger, NullLogger } from './logging.js'
import { SafeMode } from './constants.js'
import { Timings } from './timings.js'
import { Extensions } from './extensions.js'
import { Converter } from './converter.js'
import { Block } from './block.js'
import Html5Converter from './converter/html5.js'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

class Asciidoctor {
  /**
   * Get the version of Asciidoctor.js.
   *
   * @returns {string} - the version of Asciidoctor.js
   */
  getVersion () {
    return packageJson.version
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

  /**
   * Parse the AsciiDoc source input into a Document.
   *
   * @param {string|string[]} input - the AsciiDoc source as a String or String Array
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<Document>} - the parsed Document
   */
  async load (input, options = {}) {
    return load(input, options)
  }

  /**
   * Parse the AsciiDoc source input and convert it to the specified backend format.
   *
   * @param {string|string[]} input - the AsciiDoc source as a String or String Array
   * @param {Object} [options={}] - a plain object of options to control processing
   * @returns {Promise<string>} - the converted output as a String
   */
  async convert (input, options = {}) {
    const doc = await load(input, options)
    return doc.convert()
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
}

export default function () {
  return new Asciidoctor()
}
