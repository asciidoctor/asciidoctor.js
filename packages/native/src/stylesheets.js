// ESM port of lib/asciidoctor/stylesheets.rb
//
// Ruby-to-JavaScript notes:
//   - Singleton: Ruby @__instance__ = new → module-level instance exported as Stylesheets.instance
//   - primary_stylesheet_data memoisation: Ruby ||= → the CSS is a static import; no lazy load needed
//   - File.read(...).rstrip → CSS is inlined at build time in src/data/stylesheet-data.js
//   - STYLESHEETS_DIR = File.join(DATA_DIR, 'stylesheets') → not needed; CSS is a JS module
//   - coderay / pygments methods → omitted (SyntaxHighlighter.for not needed here)

import defaultStylesheetData from './data/stylesheet-data.js'

class StylesheetsClass {
  static DEFAULT_STYLESHEET_NAME = 'asciidoctor.css'

  get primaryStylesheetName () {
    return StylesheetsClass.DEFAULT_STYLESHEET_NAME
  }

  async primaryStylesheetData () {
    return defaultStylesheetData
  }

  async embedPrimaryStylesheet () {
    return `<style>\n${defaultStylesheetData}\n</style>`
  }
}

export const Stylesheets = {
  instance: new StylesheetsClass(),
}