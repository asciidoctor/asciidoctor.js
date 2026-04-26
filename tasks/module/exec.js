import childProcess from 'node:child_process'
import log from 'bestikk-log'

export function execSync(command, opts) {
  log.debug(command, opts)
  if (!process.env.DRY_RUN) {
    const stdout = childProcess.execSync(command, opts)
    process.stdout.write(stdout)
    return stdout
  }
}
