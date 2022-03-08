'use strict'
const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')
const log = require('bestikk-log')
const execModule = require('./exec')

const prepareRelease = (releaseVersion) => {
  log.task(`Release version: ${releaseVersion}`)
  if (process.env.DRY_RUN) {
    log.warn('Dry run! To perform the release, run the command again without DRY_RUN environment variable')
  }
  const projectRootDirectory = path.join(__dirname, '..', '..')
  try {
    childProcess.execSync('git diff-index --quiet HEAD --', { cwd: projectRootDirectory })
  } catch (e) {
    log.error('Git working directory not clean')
    const status = childProcess.execSync('git status -s')
    process.stdout.write(status)
    process.exit(1)
  }
  const branchName = childProcess.execSync('git symbolic-ref --short HEAD', { cwd: projectRootDirectory }).toString('utf-8').trim()
  if (branchName !== 'main') {
    log.error('Release must be performed on main branch')
    process.exit(1)
  }
  // update asciidoctor package version and dependencies
  const asciidoctorPkgPath = path.join(projectRootDirectory, 'packages', 'asciidoctor', 'package.json')
  const asciidoctorPkg = require(asciidoctorPkgPath)
  asciidoctorPkg.version = releaseVersion
  asciidoctorPkg.dependencies['@asciidoctor/core'] = releaseVersion
  const asciidoctorPkgUpdated = JSON.stringify(asciidoctorPkg, null, 2).concat('\n')
  if (process.env.DRY_RUN) {
    log.debug(`Dry run! ${asciidoctorPkgPath} will be updated:\n${asciidoctorPkgUpdated}`)
  } else {
    fs.writeFileSync(asciidoctorPkgPath, asciidoctorPkgUpdated)
  }
  // update core package version
  const corePkgPath = path.join(projectRootDirectory, 'packages', 'core', 'package.json')
  const corePkg = require(corePkgPath)
  corePkg.version = releaseVersion
  const corePkgUpdated = JSON.stringify(corePkg, null, 2).concat('\n')
  if (process.env.DRY_RUN) {
    log.debug(`Dry run! ${corePkgPath} will be updated:\n${corePkgUpdated}`)
  } else {
    fs.writeFileSync(corePkgPath, corePkgUpdated)
  }
  // git commit and tag
  execModule.execSync(`git commit -a -m "${releaseVersion}"`, { cwd: projectRootDirectory })
  execModule.execSync(`git tag v${releaseVersion} -m "${releaseVersion}"`, { cwd: projectRootDirectory })
}

const pushRelease = () => {
  if (process.env.DRY_RUN || process.env.NO_PUSH) {
    return false
  }
  const remoteName = childProcess.execSync('git remote -v').toString('utf8')
    .split(/\r?\n/)
    .filter(line => { return line.includes('(push)') && line.includes('asciidoctor/asciidoctor.js.git') })
    .map(line => line.split('\t')[0])
    .reduce((a, b) => a + b, '')

  if (remoteName) {
    execModule.execSync(`git push ${remoteName} main`)
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
    log.info('[ ] push changes upstream: `git push origin main && git push origin --tags`')
  }
  log.info(`[ ] edit the release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/tag/v${releaseVersion}`)
}

const release = (releaseVersion) => {
  const start = process.hrtime()
  prepareRelease(releaseVersion)
  const releasePushed = pushRelease()
  completeRelease(releasePushed, releaseVersion)
  log.success(`Done in ${process.hrtime(start)[0]} s`)
}

module.exports = {
  release,
  // for testing purpose
  pushRelease
}
