'use strict'

const childProcess = require('child_process')
const log = require('bestikk-log')

module.exports.execSync = (command) => {
  log.debug(command)
  if (!process.env.DRY_RUN) {
    const stdout = childProcess.execSync(command)
    process.stdout.write(stdout)
    return stdout
  }
}
