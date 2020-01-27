'use strict'
const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const { publish: npmPublish } = require('libnpmpublish')
const log = require('bestikk-log')

const publish = async (directory) => {
    const pkgName = childProcess.execSync(`npm pack`, { cwd: directory }).toString('utf-8').trim()
    const pkg = require(path.join(directory, 'package.json'))
    const pkgPath = path.join(directory, pkgName)
    const tarball = fs.createReadStream(pkgPath)
    if (process.env.DRY_RUN) {
      log.debug(`${pkg.name}@${pkg.version} - ${pkgPath}`)
    } else {
      return npmPublish(pkg, tarball, { token: process.env.NPM_AUTH_TOKEN })
    }
  }

;(async () => {
  try {
    if (process.env.DRY_RUN) {
      log.warn('Dry run! To publish the release, run the command again without DRY_RUN environment variable')
    }
    const projectRootDirectory = path.join(__dirname, '..')
    // copy packages/core/types/index.d.ts to packages/asciidoctor/types/index.d.ts
    fs.copyFileSync(`${projectRootDirectory}/packages/core/types/index.d.ts`, `${projectRootDirectory}/packages/asciidoctor/types/index.d.ts`)
    await publish(path.join(projectRootDirectory, 'packages', 'core'))
    await publish(path.join(projectRootDirectory, 'packages', 'asciidoctor'))
  } catch (e) {
    console.log('Unable to publish the packages', e)
    process.exit(1)
  }
})()
