import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  convertAsciidocToMarkdown,
  formatReleaseNotes,
  prepareChangelog,
  splitChangelog,
} from '../tasks/release.js'

const CHANGELOG_FIXTURE = `= Asciidoctor.js Changelog

This document provides a high-level view of the changes introduced in Asciidoctor.js by release.

== Unreleased

Breaking Changes::

* API is now fully asynchronous
* Requires Node.js ≥ 24

Improvements::

* Pure ESM library with no external runtime dependencies
* HTTP includes use the standard https://fetch.spec.whatwg.org[Fetch API]
+
[source,js]
----
import { convert } from '@asciidoctor/core'

await convert('Hello _world_')
----

== v3.0.4 (2024-02-12)

Bug Fixes::

* Fix conditional exports (#1722)
`

const RELEASE_NOTES_OPTS = {
  summary: 'A great release.',
  date: '2026-04-27',
  author: 'Jane Doe',
  previousTag: 'v3.0.4',
  currentTag: 'v4.0.0',
  changelog: '### Breaking Changes\n\n* Item A',
}

describe('convertAsciidocToMarkdown', () => {
  test('converts a labeled list term to a Markdown h3', () => {
    assert.equal(
      convertAsciidocToMarkdown('Bug Fixes::\n\n* Fix something'),
      '### Bug Fixes\n* Fix something'
    )
  })

  test('converts multiple labeled list terms', () => {
    assert.equal(
      convertAsciidocToMarkdown(
        'Breaking Changes::\n\n* Item A\n\nImprovements::\n\n* Item B'
      ),
      '### Breaking Changes\n* Item A\n\n### Improvements\n* Item B'
    )
  })

  test('converts an AsciiDoc link to a Markdown link', () => {
    assert.equal(
      convertAsciidocToMarkdown('See https://example.com[the docs]'),
      'See [the docs](https://example.com)'
    )
  })

  test('converts a source block with list continuation to an indented fenced code block', () => {
    const input =
      '* Example\n+\n[source,js]\n----\nconsole.log("hi")\n----\n* Next item'
    const result = convertAsciidocToMarkdown(input)
    assert.ok(result.includes('  ```js\n  console.log("hi")\n  ```'))
    assert.ok(!result.includes('[source,js]'))
    assert.ok(!result.includes('----'))
  })

  test('converts a standalone source block to a fenced code block', () => {
    assert.equal(
      convertAsciidocToMarkdown('[source,ruby]\n----\nputs "hello"\n----'),
      '```ruby\nputs "hello"\n```'
    )
  })

  test('preserves the language in fenced code blocks', () => {
    assert.ok(
      convertAsciidocToMarkdown(
        '[source,typescript]\n----\nconst x: number = 1\n----'
      ).startsWith('```typescript')
    )
  })

  test('handles a multiline source block', () => {
    assert.equal(
      convertAsciidocToMarkdown(
        '[source,js]\n----\nconst a = 1\nconst b = 2\n----'
      ),
      '```js\nconst a = 1\nconst b = 2\n```'
    )
  })

  test('collapses consecutive blank lines', () => {
    assert.equal(
      convertAsciidocToMarkdown('line A\n\n\n\nline B'),
      'line A\n\nline B'
    )
  })

  test('trims leading and trailing whitespace', () => {
    assert.equal(convertAsciidocToMarkdown('\n\n* item\n\n'), '* item')
  })

  test('leaves plain list items and inline code unchanged', () => {
    const input = '* Use `npm ci` to install'
    assert.equal(convertAsciidocToMarkdown(input), input)
  })
})

describe('splitChangelog', () => {
  test('returns the intro paragraph as summary and the sections as changelog', () => {
    const input =
      'A great release.\n\nBreaking Changes::\n\n* Item A\n\nImprovements::\n\n* Item B'
    const { summary, changelog } = splitChangelog(input)
    assert.equal(summary, 'A great release.')
    assert.ok(changelog.startsWith('Breaking Changes::'))
    assert.ok(!changelog.includes('A great release.'))
  })

  test('returns empty summary when content starts with a labeled section', () => {
    const input = 'Breaking Changes::\n\n* Item A'
    const { summary, changelog } = splitChangelog(input)
    assert.equal(summary, '')
    assert.equal(changelog, input)
  })

  test('returns all content as summary and empty changelog when there are no labeled sections', () => {
    const input = 'Just a free-form paragraph with no sections.'
    const { summary, changelog } = splitChangelog(input)
    assert.equal(summary, input)
    assert.equal(changelog, '')
  })
})

describe('formatReleaseNotes', () => {
  test('produces the expected section structure', () => {
    const result = formatReleaseNotes(RELEASE_NOTES_OPTS)
    assert.ok(result.includes('## Summary'))
    assert.ok(result.includes('## Release meta'))
    assert.ok(result.includes('## Changelog'))
  })

  test('places summary content under ## Summary', () => {
    const result = formatReleaseNotes(RELEASE_NOTES_OPTS)
    assert.ok(result.includes('## Summary\n\nA great release.'))
  })

  test('includes the release date, author, and publisher in ## Release meta', () => {
    const result = formatReleaseNotes(RELEASE_NOTES_OPTS)
    assert.ok(result.includes('Released on: 2026-04-27'))
    assert.ok(result.includes('Released by: Jane Doe'))
    assert.ok(result.includes('Published by: GitHub'))
  })

  test('includes the full diff link with the correct tag range', () => {
    const result = formatReleaseNotes(RELEASE_NOTES_OPTS)
    assert.ok(
      result.includes(
        'Logs: [full diff](https://github.com/asciidoctor/asciidoctor.js/compare/v3.0.4...v4.0.0)'
      )
    )
  })

  test('places changelog content under ## Changelog', () => {
    const result = formatReleaseNotes(RELEASE_NOTES_OPTS)
    assert.ok(result.includes('## Changelog\n\n### Breaking Changes'))
  })

  test('appends the footer when provided', () => {
    const result = formatReleaseNotes({
      ...RELEASE_NOTES_OPTS,
      footer: 'Thanks to all contributors!',
    })
    assert.ok(result.endsWith('Thanks to all contributors!'))
  })

  test('omits the footer section when not provided', () => {
    const result = formatReleaseNotes(RELEASE_NOTES_OPTS)
    assert.ok(!result.includes('Thanks to all contributors!'))
  })
})

describe('prepareChangelog', () => {
  const AUTHOR = 'Jane Doe'
  const PREVIOUS_TAG = 'v3.0.4'

  test('renames == Unreleased to the versioned header', () => {
    const { updatedChangelog } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(updatedChangelog.includes('== v4.0.0 (2026-04-27)'))
    assert.ok(!updatedChangelog.match(/^== Unreleased\n\n[^=]/m))
  })

  test('adds a new empty == Unreleased section above the versioned header', () => {
    const { updatedChangelog } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(updatedChangelog.match(/^== Unreleased\n\n== v4\.0\.0/m))
  })

  test('preserves the existing unreleased content under the versioned header', () => {
    const { updatedChangelog } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(
      updatedChangelog.includes('== v4.0.0 (2026-04-27)\n\nBreaking Changes::')
    )
  })

  test('preserves previous version sections unchanged', () => {
    const { updatedChangelog } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(updatedChangelog.includes('== v3.0.4 (2024-02-12)'))
  })

  test('release notes contain the full template sections', () => {
    const { releaseNotes } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(releaseNotes.includes('## Summary'))
    assert.ok(releaseNotes.includes('## Release meta'))
    assert.ok(releaseNotes.includes('## Changelog'))
  })

  test('release notes include release meta with author, date, and diff link', () => {
    const { releaseNotes } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(releaseNotes.includes('Released on: 2026-04-27'))
    assert.ok(releaseNotes.includes('Released by: Jane Doe'))
    assert.ok(
      releaseNotes.includes(
        '[full diff](https://github.com/asciidoctor/asciidoctor.js/compare/v3.0.4...v4.0.0)'
      )
    )
  })

  test('release notes changelog contains converted AsciiDoc sections', () => {
    const { releaseNotes } = prepareChangelog(
      CHANGELOG_FIXTURE,
      '4.0.0',
      '2026-04-27',
      AUTHOR,
      PREVIOUS_TAG
    )
    assert.ok(releaseNotes.includes('### Breaking Changes'))
    assert.ok(releaseNotes.includes('### Improvements'))
    assert.ok(
      releaseNotes.includes('[Fetch API](https://fetch.spec.whatwg.org)')
    )
    assert.ok(releaseNotes.includes('  ```js\n  import { convert }'))
  })
})
