'use strict'
const childProcess = require('child_process')
const log = require('bestikk-log')

module.exports.execSync = (command, opts) => {
  log.debug(command, opts)
  if (!process.env.DRY_RUN) {
    let stdout = childProcess.execSync(command, opts)
    process.stdout.write(stdout)
    return stdout
  }
}
