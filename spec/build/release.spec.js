/* global it, describe */
const chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const { VERSION_RX } = require('../../tasks/version')
const {
  convertAsciidocToMarkdown,
  extractReleaseNotes,
  rollUnreleased,
  splitChangelog
} = require('../../tasks/changelog')

const CHANGELOG_FIXTURE = `= Asciidoctor.js Changelog
:uri-repo: https://github.com/asciidoctor/asciidoctor.js

This document provides a high-level view of the changes introduced in Asciidoctor.js by release.

== Unreleased

Bug Fixes::

* Fix something ({uri-repo}/issues/1234[#1234])

Improvements::

* Add \`MatchData#names\`

== 2.2.9 (2026-04-30)

Improvements::

* Replace \`glob\` by \`fast-glob\`

== 2.2.8 (2024-06-02)

This release is based on Asciidoctor 2.0.23.

Improvements::

* Build against the latest release of Asciidoctor 2.0.23
`

const NOTES_OPTS = { author: '@ggrossetie', previousTag: 'v2.2.9', asciidoctorCoreVersion: 'v2.0.23' }

describe('Release', function () {
  describe('Version', function () {
    it('should accept a 2.2.x version', function () {
      expect(VERSION_RX.test('2.2.10')).to.equal(true)
      expect(VERSION_RX.test('2.2.0')).to.equal(true)
    })

    it('should reject a version outside of the 2.2.x line', function () {
      ['2.3.1', '3.1.2', '2.2', '2.2.x', 'v2.2.10', '2.2.10-rc.1', '2.2.01', '12.2.1'].forEach((version) => {
        expect(VERSION_RX.test(version), version).to.equal(false)
      })
    })
  })

  describe('Changelog', function () {
    it('should convert a labeled list term to a Markdown h3', function () {
      expect(convertAsciidocToMarkdown('Bug Fixes::\n\n* Fix something')).to.equal('### Bug Fixes\n* Fix something')
    })

    it('should split the summary from the changelog', function () {
      expect(splitChangelog('A summary.\n\n### Bug Fixes\n* Fix')).to.deep.equal({ summary: 'A summary.', changelog: '### Bug Fixes\n* Fix' })
      expect(splitChangelog('### Bug Fixes\n* Fix')).to.deep.equal({ summary: '', changelog: '### Bug Fixes\n* Fix' })
    })

    it('should roll the unreleased section into a dated version section', function () {
      const result = rollUnreleased(CHANGELOG_FIXTURE, '2.2.10', '2026-10-19')
      expect(result).to.contain('== Unreleased\n\n== 2.2.10 (2026-10-19)\n\nBug Fixes::')
      expect(result.match(/^== Unreleased$/gm)).to.have.lengthOf(1)
    })

    it('should throw an error if the unreleased section is missing', function () {
      expect(() => rollUnreleased('= Changelog\n\n== 2.2.9 (2026-04-30)\n', '2.2.10', '2026-10-19')).to.throw('Section "== Unreleased" not found')
    })

    it('should extract the release notes of a version', function () {
      const changelog = rollUnreleased(CHANGELOG_FIXTURE, '2.2.10', '2026-10-19')
      expect(extractReleaseNotes(changelog, '2.2.10', NOTES_OPTS)).to.equal(`## Summary

This release is based on [Asciidoctor 2.0.23](https://github.com/asciidoctor/asciidoctor/releases/tag/v2.0.23).

## Release meta

Released on: 2026-10-19
Released by: @ggrossetie
Published by: GitHub Actions

Logs: [full diff](https://github.com/asciidoctor/asciidoctor.js/compare/v2.2.9...v2.2.10)

## Changelog

### Bug Fixes
* Fix something ([#1234](https://github.com/asciidoctor/asciidoctor.js/issues/1234))

### Improvements
* Add \`MatchData#names\``)
    })

    it('should use the intro paragraph as the summary', function () {
      const notes = extractReleaseNotes(CHANGELOG_FIXTURE, '2.2.8', { ...NOTES_OPTS, previousTag: 'v2.2.7' })
      expect(notes).to.contain('## Summary\n\nThis release is based on Asciidoctor 2.0.23.\n\n## Release meta')
      expect(notes).to.contain('### Improvements\n* Build against the latest release of Asciidoctor 2.0.23')
    })

    it('should not include the next version in the release notes', function () {
      const notes = extractReleaseNotes(CHANGELOG_FIXTURE, '2.2.9', NOTES_OPTS)
      expect(notes).to.contain('Replace `glob` by `fast-glob`')
      expect(notes).not.to.contain('Build against the latest release')
    })

    it('should throw an error if the version section is missing or empty', function () {
      expect(() => extractReleaseNotes(CHANGELOG_FIXTURE, '2.2.10', NOTES_OPTS)).to.throw('Section "== 2.2.10" not found')
      const changelog = rollUnreleased(rollUnreleased(CHANGELOG_FIXTURE, '2.2.10', '2026-10-19'), '2.2.11', '2026-10-20')
      expect(() => extractReleaseNotes(changelog, '2.2.11', NOTES_OPTS)).to.throw('Section "== 2.2.11" is empty')
    })

    it('should extract the release notes from the project changelog', function () {
      const content = fs.readFileSync(path.join(__dirname, '..', '..', 'CHANGELOG.adoc'), 'utf8')
      expect(extractReleaseNotes(content, '2.2.8', { ...NOTES_OPTS, previousTag: 'v2.2.7' })).to.contain('* Build against the latest release of Asciidoctor 2.0.23')
    })
  })
})
