import childProcess from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import downdoc from 'downdoc'

const projectRootDirectory = join(import.meta.dirname, '..')

// Converts description list terms (e.g. "Breaking Changes::") to AsciiDoc
// section titles ("=== Breaking Changes") so that downdoc renders them as
// Markdown h3 headers ("### Breaking Changes").
export function convertAsciidocToMarkdown(content) {
  const preprocessed = content.replace(/^([A-Z][^\n]+)::\s*$/gm, '=== $1')
  return downdoc(preprocessed)
}

// Splits unreleased content into a summary (intro paragraph before the first
// labeled section) and the structured changelog (the labeled sections themselves).
export function splitChangelog(unreleasedContent) {
  const firstSectionIdx = unreleasedContent.search(/^[A-Z][^\n]+::\s*$/m)
  if (firstSectionIdx === -1) {
    return { summary: unreleasedContent, changelog: '' }
  }
  return {
    summary: unreleasedContent.slice(0, firstSectionIdx).trim(),
    changelog: unreleasedContent.slice(firstSectionIdx).trim(),
  }
}

export function formatReleaseNotes({
  summary,
  date,
  author,
  previousTag,
  currentTag,
  changelog,
  footer = '',
}) {
  const lines = [
    '## Summary',
    '',
    summary,
    '',
    '## Release meta',
    '',
    `Released on: ${date}`,
    `Released by: ${author}`,
    'Published by: GitHub',
    '',
    `Logs: [full diff](https://github.com/asciidoctor/asciidoctor.js/compare/${previousTag}...${currentTag})`,
    '',
    '## Changelog',
    '',
    changelog,
  ]
  if (footer) {
    lines.push('', footer)
  }
  return lines.join('\n').trimEnd()
}

export function prepareChangelog(
  content,
  version,
  releaseDate,
  author,
  previousTag
) {
  const match = content.match(/== Unreleased\n([\s\S]*?)(?=\n== )/)
  const unreleasedContent = match ? match[1].trim() : ''

  const updatedChangelog = content.replace(
    /^== Unreleased$/m,
    `== Unreleased\n\n== v${version} (${releaseDate})`
  )

  const { summary, changelog } = splitChangelog(unreleasedContent)
  const releaseNotes = formatReleaseNotes({
    summary: convertAsciidocToMarkdown(summary),
    date: releaseDate,
    author,
    previousTag,
    currentTag: `v${version}`,
    changelog: convertAsciidocToMarkdown(changelog),
  })

  return { updatedChangelog, releaseNotes }
}

function updateChangelog(version) {
  const changelogPath = join(projectRootDirectory, 'CHANGELOG.adoc')
  const content = readFileSync(changelogPath, 'utf8')
  const releaseDate = new Date().toISOString().slice(0, 10)

  const author = childProcess
    .execSync('git config user.name', { cwd: projectRootDirectory })
    .toString()
    .trim()

  let previousTag = ''
  try {
    previousTag = childProcess
      .execSync('git describe --abbrev=0 --tags', { cwd: projectRootDirectory })
      .toString()
      .trim()
  } catch {
    // No previous tags exist yet
  }

  const { updatedChangelog, releaseNotes } = prepareChangelog(
    content,
    version,
    releaseDate,
    author,
    previousTag
  )

  if (process.env.DRY_RUN) {
    console.log(`Dry run! ${changelogPath} will be updated`)
    console.log(`Dry run! RELEASE_NOTES.md will be created:\n${releaseNotes}`)
  } else {
    writeFileSync(changelogPath, updatedChangelog)
    writeFileSync(join(projectRootDirectory, 'RELEASE_NOTES.md'), releaseNotes)
  }
}

function execSync(command, opts) {
  console.log(command)
  if (!process.env.DRY_RUN) {
    const stdout = childProcess.execSync(command, opts)
    process.stdout.write(stdout)
    return stdout
  }
}

const prepareRelease = (releaseVersion) => {
  console.log(`\nRelease version: ${releaseVersion}`)
  if (process.env.DRY_RUN) {
    console.warn(
      'Dry run! To perform the release, run the command again without DRY_RUN environment variable'
    )
  }
  try {
    childProcess.execSync('git diff-index --quiet HEAD --', {
      cwd: projectRootDirectory,
    })
  } catch {
    console.error('Git working directory not clean')
    process.stdout.write(childProcess.execSync('git status -s'))
    process.exit(1)
  }
  const branchName = childProcess
    .execSync('git symbolic-ref --short HEAD', { cwd: projectRootDirectory })
    .toString('utf-8')
    .trim()
  if (branchName !== 'main' && !/^\d+\.\d+\.x$/.test(branchName)) {
    console.error(
      'Release must be performed on main branch or a maintenance branch (e.g. 1.2.x)'
    )
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
    console.log(
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
    console.log(`Dry run! ${corePkgPath} will be updated:\n${corePkgUpdated}`)
  } else {
    writeFileSync(corePkgPath, corePkgUpdated)
  }
  // update changelog and generate release notes
  updateChangelog(releaseVersion)
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
  console.warn(
    'Unable to find the remote name of the original repository asciidoctor/asciidoctor.js'
  )
  return false
}

const completeRelease = (releasePushed, releaseVersion) => {
  console.log('')
  console.log('To complete the release, you need to:')
  if (!releasePushed) {
    console.log(
      '[ ] push changes upstream: `git push origin main && git push origin --tags`'
    )
  }
  console.log(
    `[ ] edit the release page on GitHub: https://github.com/asciidoctor/asciidoctor.js/releases/tag/v${releaseVersion}`
  )
}

export const release = (releaseVersion) => {
  const start = process.hrtime()
  prepareRelease(releaseVersion)
  const releasePushed = pushRelease()
  completeRelease(releasePushed, releaseVersion)
  console.log(`\nDone in ${process.hrtime(start)[0]} s`)
}

// Entry point — only runs when executed directly, not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [releaseVersion] = process.argv.slice(2)
  if (!releaseVersion) {
    console.error(
      'Release version is undefined, please specify a version `npm run release 1.0.0`'
    )
    process.exit(9)
  }
  release(releaseVersion)
}
