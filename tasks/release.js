import childProcess from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import log from 'bestikk-log'

const projectRootDirectory = join(import.meta.dirname, '..')

function execSync(command, opts) {
  log.debug(command, opts)
  if (!process.env.DRY_RUN) {
    const stdout = childProcess.execSync(command, opts)
    process.stdout.write(stdout)
    return stdout
  }
}

const prepareRelease = (releaseVersion) => {
  log.task(`Release version: ${releaseVersion}`)
  if (process.env.DRY_RUN) {
    log.warn(
      'Dry run! To perform the release, run the command again without DRY_RUN environment variable'
    )
  }
  try {
    childProcess.execSync('git diff-index --quiet HEAD --', {
      cwd: projectRootDirectory,
    })
  } catch {
    log.error('Git working directory not clean')
    process.stdout.write(childProcess.execSync('git status -s'))
    process.exit(1)
  }
  const branchName = childProcess
    .execSync('git symbolic-ref --short HEAD', { cwd: projectRootDirectory })
    .toString('utf-8')
    .trim()
  if (branchName !== 'main' && !/^\d+\.\d+\.x$/.test(branchName)) {
    log.error('Release must be performed on main branch or a maintenance branch (e.g. 1.2.x)')
    process.exit(1)
  }
  // update asciidoctor package version and dependencies
  const asciidoctorPkgPath = join(
    projectRootDirectory,
    'packages',
    'asciidoctor',
    'package.json'
  )
  const asciidoctorPkg = JSON.parse(readFileSync(asciidoctorPkgPath, 'utf8'))
  asciidoctorPkg.version = releaseVersion
  asciidoctorPkg.dependencies['@asciidoctor/core'] = releaseVersion
  const asciidoctorPkgUpdated = JSON.stringify(asciidoctorPkg, null, 2).concat(
    '\n'
  )
  if (process.env.DRY_RUN) {
    log.debug(
      `Dry run! ${asciidoctorPkgPath} will be updated:\n${asciidoctorPkgUpdated}`
    )
  } else {
    writeFileSync(asciidoctorPkgPath, asciidoctorPkgUpdated)
  }
  // update core package version
  const corePkgPath = join(
    projectRootDirectory,
    'packages',
    'core',
    'package.json'
  )
  const corePkg = JSON.parse(readFileSync(corePkgPath, 'utf8'))
  corePkg.version = releaseVersion
  const corePkgUpdated = JSON.stringify(corePkg, null, 2).concat('\n')
  if (process.env.DRY_RUN) {
    log.debug(`Dry run! ${corePkgPath} will be updated:\n${corePkgUpdated}`)
  } else {
    writeFileSync(corePkgPath, corePkgUpdated)
  }
  // git commit and tag
  execSync(`git commit -a -m "${releaseVersion}"`, {
    cwd: projectRootDirectory,
  })
  execSync(`git tag v${releaseVersion} -m "${releaseVersion}"`, {
    cwd: projectRootDirectory,
  })
}

export const pushRelease = () => {
  if (process.env.DRY_RUN || process.env.NO_PUSH) return false
  const remoteName = childProcess
    .execSync('git remote -v')
    .toString('utf8')
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.includes('(push)') &&
        line.includes('asciidoctor/asciidoctor.js.git')
    )
    .map((line) => line.split('\t')[0])
    .reduce((a, b) => a + b, '')
  if (remoteName) {
    execSync(`git push ${remoteName} main`)
    execSync(`git push ${remoteName} --tags`)
    return true
  }
  log.warn(
    'Unable to find the remote name of the original repository asciidoctor/asciidoctor.js'
  )
  return false
}

const completeRelease = (releasePushed, releaseVersion) => {
  log.info('')
  log.info('To complete the release, you need to:')
  if (!releasePushed) {
    log.info(
      '[ ] push changes upstream: `git push origin main && git push origin --tags`'
    )
  }
  log.info(
    `[ ] edit the release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/tag/v${releaseVersion}`
  )
}

export const release = (releaseVersion) => {
  const start = process.hrtime()
  prepareRelease(releaseVersion)
  const releasePushed = pushRelease()
  completeRelease(releasePushed, releaseVersion)
  log.success(`Done in ${process.hrtime(start)[0]} s`)
}

// Entry point — only runs when executed directly, not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [releaseVersion] = process.argv.slice(2)
  if (!releaseVersion) {
    log.error(
      'Release version is undefined, please specify a version `npm run release 1.0.0`'
    )
    process.exit(9)
  }
  release(releaseVersion)
}
