'use strict'

const fs = require('fs')
const path = require('path')
const bfs = require('bestikk-fs')
const log = require('bestikk-log')

const removeBuildDirSync = () => {
  log.debug('remove build directory')
  bfs.removeSync('build')
  bfs.mkdirsSync('build/css')
}

module.exports.clean = (type) => {
  log.task(`clean ${type}`)
  if (type === 'js') {
    log.debug('remove build/*.js files')
    fs.readdirSync('build').forEach(file => {
      if (path.extname(path.basename(file)) === '.js') {
        fs.unlinkSync(path.join('build', file))
      }
    })
  } else if (type === 'core') {
    log.debug('remove build/asciidoctor-core.js files')
    fs.unlinkSync('build/asciidoctor-core.js')
  } else if (type === 'patch') {
    log.debug('remove build/*.js files (except asciidoctor-core.js)')
    fs.readdirSync('build').forEach(file => {
      if (path.extname(path.basename(file)) === '.js' && file !== 'asciidoctor-core.js') {
        fs.unlinkSync(path.join('build', file))
      }
    })
  } else {
    removeBuildDirSync() // remove build directory
  }
}
