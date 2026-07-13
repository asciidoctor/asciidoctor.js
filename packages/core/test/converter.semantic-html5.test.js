// Port of test/semantic_html5_converter_test.rb (upstream feature/html-converter-next branch).
//
// Scenario-based: every <name>.adoc file in test/fixtures/semantic-html5-scenarios/
// is converted with the 'semantic-html5' backend (embedded) and compared against
// the expected output in the sibling <name>.html file.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { convertString, convertStringToEmbedded } from './harness.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenariosDir = join(__dirname, 'fixtures', 'semantic-html5-scenarios')

describe('Semantic HTML 5 converter', () => {
  const scenarios = readdirSync(scenariosDir)
    .filter((name) => name.endsWith('.adoc'))
    .map((name) => name.slice(0, -5))
    .sort()

  for (const scenario of scenarios) {
    test(scenario, async () => {
      const input = readFileSync(join(scenariosDir, `${scenario}.adoc`), 'utf8')
      const expected = readFileSync(
        join(scenariosDir, `${scenario}.html`),
        'utf8'
      ).replace(/\n$/, '')
      const result = await convertStringToEmbedded(input, {
        backend: 'semantic-html5',
      })
      assert.equal(result.replace(/\n$/, ''), expected)
    })
  }
})

describe('Semantic HTML 5 converter — standalone document', () => {
  test('generates a semantic standalone document (header/main/footer)', async () => {
    const input = `= Document Title
Doc Writer <doc@example.org>
v1.0, 2026-07-13
:reproducible:

Some content.footnote:[A footnote.]

== Section

More content.
`
    const result = await convertString(input, {
      backend: 'semantic-html5',
    })
    assert.equal(
      result,
      `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="author" content="Doc Writer">
<title>Document Title</title>
</head>
<body class="article">
<header>
<h1>Document Title</h1>
<p class="byline">
<span class="author">Doc Writer <a href="mailto:doc@example.org" rel="author">doc@example.org</a></span>
</p>
<table class="revision">
<thead>
<tr>
<th>Version</th>
<th>Date</th>
<th>Remark</th>
</tr>
</thead>
<tbody>
<tr>
<td data-title="Version">1.0</td>
<td data-title="Date"><time datetime="2026-07-13">2026-07-13</time></td>
<td data-title="Remark"></td>
</tr>
</tbody>
</table>
</header>
<main>
<p>
Some content.<sup class="footnote-ref"><a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote." role="doc-noteref">1</a></sup>
</p>
<section id="_section">
<h2>Section</h2>
<p>
More content.
</p>
</section>
<section class="footnotes" role="doc-endnotes">
<hr>
<ol class="footnotes">
<li id="_footnotedef_1" role="doc-endnote">A footnote. <a class="footnote-backref" href="#_footnoteref_1" role="doc-backlink">&#8617;</a></li>
</ol>
</section>
</main>
<footer>
<span class="rev-number">Version 1.0</span>
</footer>
</body>
</html>`
    )
  })

  test('places the auto TOC inside main', async () => {
    const input = `= Document Title
:toc:
:reproducible:
:nofooter:

== First Section

Content.
`
    const result = await convertString(input, {
      backend: 'semantic-html5',
    })
    assert.ok(
      result.includes(`<main>
<nav id="toc" class="toc">
<strong class="title" id="toctitle">Table of Contents</strong>
<ol class="sect-level-1">
<li><a href="#_first_section">First Section</a></li>
</ol>
</nav>`)
    )
    assert.ok(!result.includes('<footer>'))
  })

  test('does not include the default stylesheet (not compatible with the semantic output)', async () => {
    const result = await convertString('content', {
      backend: 'semantic-html5',
    })
    assert.ok(!result.includes('<style>'))
    assert.ok(!result.includes('<link rel="stylesheet"'))
  })

  test('links the Font Awesome stylesheet when icons=font', async () => {
    const result = await convertString('NOTE: Remember the milk.', {
      backend: 'semantic-html5',
      attributes: { icons: 'font', 'iconfont-remote': '' },
    })
    assert.match(
      result,
      /<link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[^"]+\/css\/font-awesome\.min\.css">/
    )
  })

  test('embeds a user-provided stylesheet in the head', async () => {
    const result = await convertString('content', {
      backend: 'semantic-html5',
      safe: 'server',
      attributes: {
        stylesheet: 'custom.css',
        stylesdir: 'test/fixtures',
      },
    })
    assert.ok(result.includes('<style>'))
  })
})

describe('Semantic HTML 5 converter — XML syntax (XHTML)', () => {
  // htmlsyntax=xml produces well-formed XML so the output can be consumed
  // with an XML parser or XPath (see asciidoctor/asciidoctor#4309)
  const opts = {
    backend: 'semantic-html5',
    attributes: { htmlsyntax: 'xml' },
  }

  test('self-closes void elements', async () => {
    const input = `first +
second

<<<

image::dot.gif[A dot]
`
    const result = await convertStringToEmbedded(input, opts)
    assert.ok(result.includes('first<br/>'))
    assert.ok(result.includes('<hr class="page-break"/>'))
    assert.ok(result.includes('<img src="dot.gif" alt="A dot"/>'))
  })

  test('expands boolean attributes', async () => {
    const input = `[%interactive]
* [x] Done

[%reversed]
. Higher
`
    const result = await convertStringToEmbedded(input, opts)
    assert.ok(result.includes('checked="checked"/>'))
    assert.ok(result.includes('<ol class="arabic" reversed="reversed">'))
  })

  test('declares the XHTML namespace on the root element', async () => {
    const result = await convertString('content', {
      backend: 'semantic-html5',
      attributes: { htmlsyntax: 'xml' },
    })
    assert.ok(
      result.includes('<html xmlns="http://www.w3.org/1999/xhtml" lang="en">')
    )
    assert.ok(result.includes('<meta charset="UTF-8"/>'))
  })

  test('produces well-formed markup an XML parser accepts (embedded)', async () => {
    const input = `= Title
:sectanchors:

first +
second

== Section

* [x] task
* [ ] other

|===
|A |B
|===

image::dot.gif[A dot,100,100]

'''

NOTE: An admonition.
`
    const result = await convertStringToEmbedded(input, opts)
    // wrap in a root element (embedded output is a fragment) and parse strictly
    const { DOMParser } = await import('@xmldom/xmldom')
    let error = null
    const parser = new DOMParser({
      onError: (level, msg) => {
        if (level === 'error' || level === 'fatalError') error = msg
      },
    })
    parser.parseFromString(`<root>${result}</root>`, 'application/xml')
    assert.equal(error, null)
  })
})
