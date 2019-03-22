const fs = require('fs')
const log = require('bestikk-log')

log.task('Check unsupported features')
const data = fs.readFileSync('build/asciidoctor-browser.js', 'utf8')
const mutableStringPattern = /\['\$(g)?sub!'\]/
if (mutableStringPattern.test(data)) {
  log.error('Mutable String methods are not supported in Opal, please replace sub! and gsub! methods')
  process.exit(1)
}
