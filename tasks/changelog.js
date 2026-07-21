#!/usr/bin/env node
// Changelog automation for the release workflow.
//
// Usage:
//   node tasks/changelog.js release <version>   Roll the "== Unreleased" section into a dated
//                                               "== v<version> (YYYY-MM-DD)" section and start a
//                                               fresh, empty "== Unreleased" section.
//   node tasks/changelog.js notes <version>     Print the "== v<version>" section to stdout as
//                                               Markdown (used as the GitHub release notes).
//
// The changelog is CHANGELOG.adoc (AsciiDoc): each release is a "== v<version> (date)" section
// holding an optional intro paragraph followed by labeled sections ("Bug Fixes::", ...).

import childProcess from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import downdoc from 'downdoc'

const projectRootDirectory = join(import.meta.dirname, '..')
const changelogPath = join(projectRootDirectory, 'CHANGELOG.adoc')

// Converts description list terms (e.g. "Breaking Changes::") to AsciiDoc
// section titles ("=== Breaking Changes") so that downdoc renders them as
// Markdown h3 headers ("### Breaking Changes").
export function convertAsciidocToMarkdown(content) {
  const preprocessed = content.replace(/^([A-Z][^\n]+)::\s*$/gm, '=== $1')
  return downdoc(preprocessed)
}

// Splits a release section (already converted to Markdown) into a summary
// (intro paragraph before the first labeled section) and the structured
// changelog (the labeled sections themselves, now Markdown h3 headers).
export function splitChangelog(sectionContent) {
  const firstSectionIdx = sectionContent.search(/^### /m)
  if (firstSectionIdx === -1) {
    return { summary: sectionContent, changelog: '' }
  }
  return {
    summary: sectionContent.slice(0, firstSectionIdx).trim(),
    changelog: sectionContent.slice(firstSectionIdx).trim(),
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

// Rolls the "== Unreleased" section into "== v<version> (<releaseDate>)" and
// starts a fresh, empty "== Unreleased" section above it.
export function rollUnreleased(content, version, releaseDate) {
  return content.replace(
    /^== Unreleased$/m,
    `== Unreleased\n\n== v${version} (${releaseDate})`
  )
}

// Extracts the "== v<version> (date)" section and formats it as Markdown release notes.
//
// The whole changelog is converted to Markdown up front (rather than
// extracting the AsciiDoc section first and converting it in isolation) so
// that document-level context — attribute references such as
// "{uri-repo}/issues/1857[#1857]" in particular — resolves correctly.
export function extractReleaseNotes(content, version, { author, previousTag }) {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const markdown = convertAsciidocToMarkdown(content)
  const headerRegex = new RegExp(
    `## v${escapedVersion} \\(([^)]+)\\)\\n([\\s\\S]*?)(?=\\n## |$)`
  )
  const match = markdown.match(headerRegex)
  if (!match) {
    throw new Error(`Section "== v${version}" not found in CHANGELOG.adoc`)
  }
  const [, releaseDate, sectionContent] = match
  const { summary, changelog } = splitChangelog(sectionContent.trim())
  return formatReleaseNotes({
    summary,
    date: releaseDate,
    author,
    previousTag,
    currentTag: `v${version}`,
    changelog,
  })
}

// Entry point — only runs when executed directly, not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const git = (args) =>
    childProcess
      .execFileSync('git', args, {
        cwd: projectRootDirectory,
        encoding: 'utf8',
      })
      .trim()

  const [command, version] = process.argv.slice(2)
  if (!version || !['release', 'notes'].includes(command)) {
    console.error('Usage: node tasks/changelog.js <release|notes> <version>')
    process.exit(9)
  }
  const content = readFileSync(changelogPath, 'utf8')
  if (command === 'release') {
    const releaseDate = new Date().toISOString().slice(0, 10)
    writeFileSync(changelogPath, rollUnreleased(content, version, releaseDate))
  } else {
    const author =
      process.env.GITHUB_ACTOR ||
      git(['log', `v${version}`, '-1', '--format=%an'])
    let previousTag = ''
    try {
      previousTag = git(['describe', '--abbrev=0', '--tags', `v${version}^`])
    } catch {
      // no previous tag exists
    }
    process.stdout.write(
      `${extractReleaseNotes(content, version, { author, previousTag })}\n`
    )
  }
}
