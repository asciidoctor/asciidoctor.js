'use strict'
const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')

// This is a maintenance branch: the packages are published under the "latest-2" dist-tag
// so they do not steal the "latest" tag from the current release line.
const DIST_TAG = 'latest-2'

// Returns true if this exact version is already on the registry, so that
// re-running a release whose publish step partially succeeded does not fail.
const isPublished = (pkg) => {
  try {
    return childProcess.execFileSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'version'], { encoding: 'utf8' }).trim() === pkg.version
  } catch (e) {
    return false
  }
}

const publish = (directory) => {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
  if (isPublished(pkg)) {
    console.log(`${pkg.name}@${pkg.version} is already published, skipping`)
  } else if (process.env.DRY_RUN) {
    console.log(`${pkg.name}@${pkg.version}`)
  } else {
    childProcess.execFileSync('npm', ['publish', '--provenance', '--access', 'public', '--tag', DIST_TAG], { cwd: directory, stdio: 'inherit' })
  }
}

try {
  if (process.env.DRY_RUN) {
    console.warn('Dry run! To publish the release, run the command again without DRY_RUN environment variable')
  }
  const projectRootDirectory = path.join(__dirname, '..')
  // copy packages/core/types/index.d.ts to packages/asciidoctor/types/index.d.ts
  fs.copyFileSync(`${projectRootDirectory}/packages/core/types/index.d.ts`, `${projectRootDirectory}/packages/asciidoctor/types/index.d.ts`)
  publish(path.join(projectRootDirectory, 'packages', 'core'))
  publish(path.join(projectRootDirectory, 'packages', 'asciidoctor'))
} catch (e) {
  console.log('Unable to publish the packages', e)
  process.exit(1)
}
