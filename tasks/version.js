#!/usr/bin/env node
// Version automation for the release workflow.
//
// Usage:
//   node tasks/version.js <version>   Set the version of both packages and keep them in sync:
//                                     @asciidoctor/core version, asciidoctor version and its
//                                     @asciidoctor/core dependency.
//                                     For a stable version, also set the version of the
//                                     documentation component (docs/antora.yml) to <major>.<minor>.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const projectRootDirectory = join(import.meta.dirname, '..')

const updatePackageJson = (pkgPath, updater) => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  updater(pkg)
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2).concat('\n'))
}

const [version] = process.argv.slice(2)
if (!version) {
  console.error('Usage: node tasks/version.js <version>')
  process.exit(9)
}
updatePackageJson(
  join(projectRootDirectory, 'packages', 'core', 'package.json'),
  (pkg) => {
    pkg.version = version
  }
)
updatePackageJson(
  join(projectRootDirectory, 'packages', 'asciidoctor', 'package.json'),
  (pkg) => {
    pkg.version = version
    pkg.dependencies['@asciidoctor/core'] = version
  }
)

// a prerelease (e.g. 4.3.0-alpha.1) keeps documenting the current stable version
const [, minorVersion] = version.match(/^(\d+\.\d+)\.\d+$/) || []
if (minorVersion) {
  const antoraPath = join(projectRootDirectory, 'docs', 'antora.yml')
  const antora = readFileSync(antoraPath, 'utf8')
    .replace(/^version: .*$/m, `version: '${minorVersion}'`)
    .replace(
      /(url-jsdoc: 'https:\/\/asciidoctor\.github\.io\/asciidoctor\.js\/)[^/]+\//,
      `$1${minorVersion}/`
    )
  writeFileSync(antoraPath, antora)
}
