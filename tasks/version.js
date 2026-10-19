'use strict'
// Version automation for the release workflow.
//
// Usage:
//   node tasks/version.js <version>   Set the version of both packages and keep them in sync:
//                                     @asciidoctor/core version, asciidoctor version and its
//                                     @asciidoctor/core dependency.
//
// This is a maintenance branch: only 2.2.x versions can be released from it.

const fs = require('fs')
const path = require('path')

const projectRootDirectory = path.join(__dirname, '..')

const VERSION_RX = /^2\.2\.(0|[1-9][0-9]*)$/

const updatePackageJson = (pkgPath, updater) => {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  updater(pkg)
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2).concat('\n'))
}

if (require.main === module) {
  const [version] = process.argv.slice(2)
  if (!version) {
    console.error('Usage: node tasks/version.js <version>')
    process.exit(9)
  }
  if (!VERSION_RX.test(version)) {
    console.error(`Invalid version: ${version}, only 2.2.x versions (e.g. 2.2.10) can be released from this branch`)
    process.exit(1)
  }
  updatePackageJson(path.join(projectRootDirectory, 'packages', 'core', 'package.json'), (pkg) => {
    pkg.version = version
  })
  updatePackageJson(path.join(projectRootDirectory, 'packages', 'asciidoctor', 'package.json'), (pkg) => {
    pkg.version = version
    pkg.dependencies['@asciidoctor/core'] = version
  })
}

module.exports = {
  VERSION_RX
}
