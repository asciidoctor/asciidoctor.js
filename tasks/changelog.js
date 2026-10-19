'use strict'
// Changelog automation for the release workflow.
//
// Usage:
//   node tasks/changelog.js release <version>   Roll the "== Unreleased" section into a dated
//                                               "== <version> (YYYY-MM-DD)" section and start a
//                                               fresh, empty "== Unreleased" section.
//   node tasks/changelog.js notes <version>     Print the "== <version>" section to stdout as
//                                               Markdown (used as the GitHub release notes).
//
// The changelog is CHANGELOG.adoc (AsciiDoc): each release is a "== <version> (date)" section
// holding an optional intro paragraph followed by labeled sections ("Bug Fixes::", ...).

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const downdoc = require('downdoc')

const projectRootDirectory = path.join(__dirname, '..')
const changelogPath = path.join(projectRootDirectory, 'CHANGELOG.adoc')

// Converts description list terms (e.g. "Bug Fixes::") to AsciiDoc
// section titles ("=== Bug Fixes") so that downdoc renders them as
// Markdown h3 headers ("### Bug Fixes").
const convertAsciidocToMarkdown = (content) => {
  const preprocessed = content.replace(/^([A-Z][^\n]+)::\s*$/gm, '=== $1')
  return downdoc(preprocessed)
}

// Splits a release section (already converted to Markdown) into a summary
// (intro paragraph before the first labeled section) and the structured
// changelog (the labeled sections themselves, now Markdown h3 headers).
const splitChangelog = (sectionContent) => {
  const firstSectionIdx = sectionContent.search(/^### /m)
  if (firstSectionIdx === -1) {
    return { summary: sectionContent, changelog: '' }
  }
  return {
    summary: sectionContent.slice(0, firstSectionIdx).trim(),
    changelog: sectionContent.slice(firstSectionIdx).trim()
  }
}

// The default summary states the version of Asciidoctor (Ruby) the release is based on.
const defaultSummary = (asciidoctorCoreVersion) => {
  const tag = asciidoctorCoreVersion.startsWith('v') ? asciidoctorCoreVersion : `v${asciidoctorCoreVersion}`
  return `This release is based on [Asciidoctor ${tag.slice(1)}](https://github.com/asciidoctor/asciidoctor/releases/tag/${tag}).`
}

const formatReleaseNotes = ({ summary, date, author, previousTag, currentTag, changelog }) => {
  const lines = [
    '## Summary',
    '',
    summary,
    '',
    '## Release meta',
    '',
    `Released on: ${date}`,
    `Released by: ${author}`,
    'Published by: GitHub Actions',
    ''
  ]
  if (previousTag) {
    lines.push(`Logs: [full diff](https://github.com/asciidoctor/asciidoctor.js/compare/${previousTag}...${currentTag})`, '')
  }
  lines.push('## Changelog', '', changelog)
  return lines.join('\n').trimEnd()
}

// Rolls the "== Unreleased" section into "== <version> (<releaseDate>)" and
// starts a fresh, empty "== Unreleased" section above it.
const rollUnreleased = (content, version, releaseDate) => {
  if (!/^== Unreleased$/m.test(content)) {
    throw new Error('Section "== Unreleased" not found in CHANGELOG.adoc')
  }
  return content.replace(/^== Unreleased$/m, `== Unreleased\n\n== ${version} (${releaseDate})`)
}

// Extracts the "== <version> (date)" section and formats it as Markdown release notes.
//
// The whole changelog is converted to Markdown up front (rather than
// extracting the AsciiDoc section first and converting it in isolation) so
// that document-level context — attribute references such as
// "{uri-repo}/issues/1857[#1857]" in particular — resolves correctly.
const extractReleaseNotes = (content, version, { author, previousTag, asciidoctorCoreVersion }) => {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const markdown = convertAsciidocToMarkdown(content)
  const headerRegex = new RegExp(`(?:^|\\n)## ${escapedVersion} \\(([^)]+)\\)\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = markdown.match(headerRegex)
  if (!match) {
    throw new Error(`Section "== ${version}" not found in CHANGELOG.adoc`)
  }
  const [, releaseDate, sectionContent] = match
  const { summary, changelog } = splitChangelog(sectionContent.trim())
  if (!changelog && !summary) {
    throw new Error(`Section "== ${version}" is empty in CHANGELOG.adoc`)
  }
  return formatReleaseNotes({
    summary: summary || defaultSummary(asciidoctorCoreVersion),
    date: releaseDate,
    author,
    previousTag,
    currentTag: `v${version}`,
    changelog
  })
}

if (require.main === module) {
  const git = (args) => childProcess.execFileSync('git', args, { cwd: projectRootDirectory, encoding: 'utf8' }).trim()

  const [command, version] = process.argv.slice(2)
  if (!version || !['release', 'notes'].includes(command)) {
    console.error('Usage: node tasks/changelog.js <release|notes> <version>')
    process.exit(9)
  }
  const content = fs.readFileSync(changelogPath, 'utf8')
  if (command === 'release') {
    const releaseDate = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(changelogPath, rollUnreleased(content, version, releaseDate))
  } else {
    const asciidoctorCoreVersion = process.env.ASCIIDOCTOR_CORE_VERSION
    if (!asciidoctorCoreVersion) {
      console.error('ASCIIDOCTOR_CORE_VERSION environment variable must be defined')
      process.exit(9)
    }
    const author = process.env.GITHUB_ACTOR ? `@${process.env.GITHUB_ACTOR}` : git(['log', `v${version}`, '-1', '--format=%an'])
    let previousTag = ''
    try {
      previousTag = git(['describe', '--abbrev=0', '--tags', `v${version}^`])
    } catch (e) {
      // no previous tag exists
    }
    process.stdout.write(`${extractReleaseNotes(content, version, { author, previousTag, asciidoctorCoreVersion })}\n`)
  }
}

module.exports = {
  convertAsciidocToMarkdown,
  extractReleaseNotes,
  formatReleaseNotes,
  rollUnreleased,
  splitChangelog
}
