'use strict'
const path = require('path')
const fs = require('fs')
const fsp = require('node:fs/promises')
const log = require('bestikk-log')
const semver = require('semver')
const pacote = require('pacote') // see: http://npm.im/pacote
const { publish: npmPublish } = require('libnpmpublish')
const downdoc = require('downdoc')

const publish = async (directory) => {
    const pkg = require(path.join(directory, 'package.json'))
    if (process.env.DRY_RUN) {
      console.log(`${pkg.name}@${pkg.version}`)
    } else {
      const inputReadme = path.join(directory, 'README.adoc')
      const hiddenReadme = path.join(directory, '.README.adoc')
      const outputReadme = path.join(directory, 'README.md')
      await fsp
        .readFile(inputReadme, 'utf8')
        .then((asciidoc) => fsp.writeFile(outputReadme, downdoc(asciidoc) + '\n', 'utf8'))
      await fsp.rename(inputReadme, hiddenReadme)
      const manifest = await pacote.manifest(directory)
      const tarData = await pacote.tarball(directory)
      const tag = semver.prerelease(pkg.version) ? 'testing' : 'latest'
      await npmPublish(manifest, tarData, {
        access: 'public',
        defaultTag: tag,
        forceAuth: {
          token: process.env.NPM_AUTH_TOKEN
        }
      })
      await fsp.rename(hiddenReadme, inputReadme)
      await fsp.unlink(outputReadme)
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
