// ESM port of lib/asciidoctor/stylesheets.rb
//
// Ruby-to-JavaScript notes:
//   - Singleton: Ruby @__instance__ = new → module-level instance exported as Stylesheets.instance
//   - primary_stylesheet_data memoisation: Ruby ||= → the CSS is a static import; no lazy load needed
//   - File.read(...).rstrip → CSS is inlined at build time in src/data/stylesheet-data.js
//   - STYLESHEETS_DIR = File.join(DATA_DIR, 'stylesheets') → not needed; CSS is a JS module
//   - coderay / pygments methods → omitted (SyntaxHighlighter.for not needed here)
//   - semantic stylesheet: JS-only addition — default stylesheet of the
//     semantic-html5 backend (data/asciidoctor-semantic.css)

import defaultStylesheetData from './data/stylesheet-data.js'
import semanticStylesheetData from './data/semantic-stylesheet-data.js'

class StylesheetsClass {
  static DEFAULT_STYLESHEET_NAME = 'asciidoctor.css'
  static SEMANTIC_STYLESHEET_NAME = 'asciidoctor-semantic.css'

  get primaryStylesheetName() {
    return StylesheetsClass.DEFAULT_STYLESHEET_NAME
  }

  async primaryStylesheetData() {
    return defaultStylesheetData
  }

  async embedPrimaryStylesheet() {
    return `<style>\n${defaultStylesheetData}\n</style>`
  }

  async writePrimaryStylesheet(stylesoutdir) {
    return this._writeStylesheet(
      stylesoutdir,
      StylesheetsClass.DEFAULT_STYLESHEET_NAME,
      defaultStylesheetData
    )
  }

  get semanticStylesheetName() {
    return StylesheetsClass.SEMANTIC_STYLESHEET_NAME
  }

  async semanticStylesheetData() {
    return semanticStylesheetData
  }

  async embedSemanticStylesheet() {
    return `<style>\n${semanticStylesheetData}\n</style>`
  }

  async writeSemanticStylesheet(stylesoutdir) {
    return this._writeStylesheet(
      stylesoutdir,
      StylesheetsClass.SEMANTIC_STYLESHEET_NAME,
      semanticStylesheetData
    )
  }

  /**
   * @internal
   * @private
   */
  async _writeStylesheet(stylesoutdir, name, data) {
    try {
      const { writeFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      await writeFile(join(stylesoutdir, name), data, 'utf8')
      return true
    } catch {
      return false
    }
  }
}

export const Stylesheets = {
  instance: new StylesheetsClass(),
}
