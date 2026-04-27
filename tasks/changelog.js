import childProcess from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  convertAsciidocToMarkdown,
  formatReleaseNotes,
  splitChangelog,
} from './release.js'

const projectRootDirectory = join(import.meta.dirname, '..')

export function extractReleaseNotes(versionTag) {
  const changelogPath = join(projectRootDirectory, 'CHANGELOG.adoc')
  const content = readFileSync(changelogPath, 'utf8')

  // versionTag is like "v4.0.0" — match "== v4.0.0 (YYYY-MM-DD)"
  const version = versionTag
    .replace(/^v/, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const headerRegex = new RegExp(
    `== v${version} \\(([^)]+)\\)\\n([\\s\\S]*?)(?=\\n== )`
  )
  const match = content.match(headerRegex)
  const sectionContent = match ? match[2].trim() : ''
  const releaseDate = match ? match[1] : new Date().toISOString().slice(0, 10)

  const author = childProcess
    .execSync(`git log ${versionTag} -1 --format=%an`, {
      cwd: projectRootDirectory,
    })
    .toString()
    .trim()

  let previousTag = ''
  try {
    previousTag = childProcess
      .execSync(`git describe --abbrev=0 --tags "${versionTag}^"`, {
        cwd: projectRootDirectory,
      })
      .toString()
      .trim()
  } catch {
    // No previous tags exist
  }

  const { summary, changelog } = splitChangelog(sectionContent)
  return formatReleaseNotes({
    summary: convertAsciidocToMarkdown(summary),
    date: releaseDate,
    author,
    previousTag,
    currentTag: versionTag,
    changelog: convertAsciidocToMarkdown(changelog),
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [versionTag] = process.argv.slice(2)
  if (!versionTag) {
    process.stderr.write('Version tag is required (e.g. v4.0.0)\n')
    process.exit(1)
  }
  const notes = extractReleaseNotes(versionTag)
  writeFileSync(join(projectRootDirectory, 'RELEASE_NOTES.md'), notes)
}
