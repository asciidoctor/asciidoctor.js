import { createRequire } from 'node:module'
import { load } from './load.js'
import { LoggerManager } from './logging.js'
import { SafeMode } from './constants.js'

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

  get SafeMode () {
    return SafeMode
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
}

export default function () {
  return new Asciidoctor()
}
