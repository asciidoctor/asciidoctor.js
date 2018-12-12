'use strict'
const childProcess = require('child_process')
const log = require('bestikk-log')
const execModule = require('./exec')

const prepareRelease = (releaseVersion) => {
  log.task(`Release version: ${releaseVersion}`)

  if (process.env.DRY_RUN) {
    log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable')
  } else {
    execModule.execSync(`npm version ${releaseVersion}`)
  }
}

const pushRelease = () => {
  const remoteName = childProcess.execSync('git remote -v').toString('utf8')
    .split(/\r?\n/)
    .filter(line => line.includes('(push)') && line.includes('asciidoctor/asciidoctor.js.git'))
    .map(line => line.split('\t')[0])
    .reduce((a, b) => a + b, '')

  if (remoteName) {
    execModule.execSync(`git push ${remoteName} master`)
    execModule.execSync(`git push ${remoteName} --tags`)
    return true
  }
  log.warn('Unable to find the remote name of the original repository asciidoctor/asciidoctor.js')
  return false
}

const completeRelease = (releasePushed, releaseVersion) => {
  log.info('')
  log.info('To complete the release, you need to:')
  if (!releasePushed) {
    log.info('[ ] push changes upstream: `git push origin master && git push origin --tags')
  }
  log.info(`[ ] edit the release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/tag/v${releaseVersion}`)
  log.info('[ ] create an issue here: https://github.com/webjars/asciidoctor.js to update Webjars')
}

const release = (releaseVersion) => {
  const start = process.hrtime()

  prepareRelease(releaseVersion)
  const releasePushed = pushRelease()
  completeRelease(releasePushed, releaseVersion)
  log.success(`Done in ${process.hrtime(start)[0]} s`)
}

module.exports = {
  release: release,
  // for testing purpose
  pushRelease: pushRelease
}
