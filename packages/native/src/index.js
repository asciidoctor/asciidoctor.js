import { load } from './load.js'

class Asciidoctor {
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