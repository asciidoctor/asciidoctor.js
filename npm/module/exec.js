'use strict';
const child_process = require('child_process');
const log = require('bestikk-log');

module.exports.execSync = (command) => {
  log.debug(command);
  if (!process.env.DRY_RUN) {
    let stdout = child_process.execSync(command);
    process.stdout.write(stdout);
    return stdout;
  }
};
