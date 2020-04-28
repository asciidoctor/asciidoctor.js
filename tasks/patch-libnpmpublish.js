'use strict'

const fs = require('fs')
const { promisify } = require('util')

function patchSource (source) {
  if (source.includes('readmeFilename: ')) return source
  return source.replace(/^ *readme: .+$/m, (match) => `${match},\n${match.replace(/readme/g, 'readmeFilename')}`)
}

;(async () => {
  const sourceFile = require.resolve('libnpmpublish/publish.js')
  await promisify(fs.readFile)(sourceFile, 'utf8')
    .then((source) => promisify(fs.writeFile)(sourceFile, patchSource(source)))
})()
