'use strict'
const path = require('path')
const fs = require('fs')
const log = require('bestikk-log')
const pacote = require('pacote') // see: http://npm.im/pacote
const { publish: npmPublish } = require('libnpmpublish')

const publish = async (directory) => {
    if (process.env.DRY_RUN) {
      const pkg = require(path.join(directory, 'package.json'))
      console.log(`${pkg.name}@${pkg.version}`)
    } else {
      const manifest = await pacote.manifest(directory)
      const tarData = await pacote.tarball(directory)
      return npmPublish(manifest, tarData, { token: process.env.NPM_AUTH_TOKEN, access: 'public' })
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
