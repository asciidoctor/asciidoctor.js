'use strict'

const log = require('bestikk-log')
const releaseModule = require('./module/release')

const args = process.argv.slice(2)
const releaseVersion = args[0]

if (!releaseVersion) {
  log.error('Release version is undefined, please specify a version `npm run release 1.0.0`')
  log.info('You can also specify one of the following: patch, minor, major, prepatch, preminor, premajor or prerelease `npm run release patch`')
  process.exit(9)
}

releaseModule.release(releaseVersion)
