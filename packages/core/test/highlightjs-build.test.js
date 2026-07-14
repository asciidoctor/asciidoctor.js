import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { convertString, convertStringToEmbedded } from './harness.js'
import { MemoryLogger, withLogger } from '../src/logging.js'
import { buildEngine } from '../src/syntaxHighlighter/highlightjs-build.js'

// Build-time highlighting is opt-in via `:highlightjs-mode: build` on the
// built-in `highlightjs` source highlighter — no adapter registration needed.
async function render(input, attributes = {}) {
  return convertStringToEmbedded(input, {
    safe: 'safe',
    attributes: {
      'source-highlighter': 'highlightjs',
      'highlightjs-mode': 'build',
      ...attributes,
    },
  })
}

async function renderStandalone(input, attributes = {}) {
  return convertString(input, {
    safe: 'safe',
    attributes: {
      'source-highlighter': 'highlightjs',
      'highlightjs-mode': 'build',
      ...attributes,
    },
  })
}

describe('highlightjs build mode', () => {
  test('should colourise a source block at build time', async () => {
    const output = await render(`
[source,ruby]
----
puts 'hello'
----
`)
    assert.match(output, /<pre class="highlightjs highlight">/)
    assert.match(output, /<code class="language-ruby hljs"/)
    // colourised markup, not raw source
    assert.match(output, /<span class="hljs-string">/)
  })

  test('should warn and fall back to client-side when build mode is unsupported (browser)', async () => {
    // Simulate the browser build, where highlightjs-build.js is stubbed with
    // { supported: false }.
    const saved = buildEngine.supported
    buildEngine.supported = false
    try {
      const logger = MemoryLogger.create()
      const output = await withLogger(logger, () =>
        convertString(
          `
[source,ruby]
----
puts 'hello'
----
`,
          {
            safe: 'safe',
            attributes: {
              'source-highlighter': 'highlightjs',
              'highlightjs-mode': 'build',
            },
          }
        )
      )
      // fell back to client-side: raw source (no build colourising) + hljs runtime
      assert.doesNotMatch(output, /<span class="hljs-/)
      assert.match(output, /highlight\.min\.js/)
      // warned once
      const warnings = logger
        .getMessages()
        .filter((m) => /not supported/.test(m.getText()))
      assert.equal(warnings.length, 1)
    } finally {
      buildEngine.supported = saved
    }
  })

  test('should stay client-side (no build colourising) without highlightjs-mode', async () => {
    const output = await convertStringToEmbedded(
      `
[source,ruby]
----
puts 'hello'
----
`,
      { safe: 'safe', attributes: { 'source-highlighter': 'highlightjs' } }
    )
    assert.doesNotMatch(output, /<span class="hljs-/)
    assert.match(output, /puts &#39;hello&#39;|puts 'hello'/)
  })

  describe('callouts', () => {
    test('should keep a callout OUTSIDE a multiline comment span', async () => {
      const output = await render(`
[source,java]
----
/*
 * spanning several lines <1>
 */
int x = 0;
----
<1> inside a block comment
`)
      // the comment span is closed before the conum — the conum is not swallowed
      assert.match(
        output,
        /<span class="hljs-comment"> \* spanning several lines <\/span><b class="conum">\(1\)<\/b>/
      )
    })

    test('should place a callout on the LAST line before the closing tags', async () => {
      const output = await render(`
[source,ruby]
----
puts 'done' # <1>
----
<1> last line
`)
      assert.match(
        output,
        /puts .*<\/span> # <b class="conum">\(1\)<\/b><\/code>/
      )
    })

    test('should support two callouts on the same line', async () => {
      const output = await render(`
[source,ruby]
----
x = [1, 2] # <1> <2>
----
<1> the array
<2> literally
`)
      assert.match(
        output,
        /<b class="conum">\(1\)<\/b> <b class="conum">\(2\)<\/b>/
      )
    })
  })

  describe('line numbers', () => {
    test('two-column grid rows (no <table>), numbers via CSS counter', async () => {
      const output = await render(`
[source,ruby,linenums]
----
a = 1
b = 2 # <1>
c = 3
----
<1> middle line
`)
      // <code> is the numbering grid, seeded to start at line 1
      assert.match(
        output,
        /<code class="[^"]*\blinenums\b[^"]*" style="counter-reset:line 0"/
      )
      assert.doesNotMatch(output, /<table class="linenotable">/)
      // each line is an (empty) gutter cell + a code cell; numbers are not in the DOM
      assert.match(output, /<span class="ln"><\/span><span class="line">a = /)
      assert.doesNotMatch(output, /class="linenos"/)
      // conum lands on line 2, inside its code cell (before the cell closes)
      assert.match(
        output,
        /<span class="line">b = <span class="hljs-number">2<\/span> # <b class="conum">\(1\)<\/b><\/span>/
      )
    })

    test('start= seeds the counter and last-line callout stays clean', async () => {
      const output = await render(`
[source,ruby,linenums,start=10]
----
first
second
last # <1>
----
<1> last line, numbering starts at 10
`)
      // counter-reset is start-1, so the first .ln cell renders as 10
      assert.match(output, /style="counter-reset:line 9"/)
      // conum on the last line is tucked inside its code cell
      assert.match(
        output,
        /<span class="line">last # <b class="conum">\(1\)<\/b><\/span>/
      )
    })

    test('multiline comment + callout keeps line count in sync', async () => {
      const output = await render(`
[source,java,linenums]
----
/*
 * multiline <1>
 */
int x = 0;
----
<1> callout inside multiline comment
`)
      // four gutter cells (one per line); the conum stays on line 2 (comment line)
      assert.equal((output.match(/<span class="ln"><\/span>/g) || []).length, 4)
      assert.match(
        output,
        /<span class="hljs-comment"> \* multiline <\/span><b class="conum">\(1\)<\/b>/
      )
    })

    test('wrap vs. scroll follows the nowrap option, not a numbering mode', async () => {
      const wrapped = await render(`
[source,ruby,linenums]
----
a = 1
----
`)
      // default: the <pre> wraps (no nowrap class)
      assert.match(wrapped, /<pre class="highlightjs highlight"/)
      assert.doesNotMatch(wrapped, /nowrap/)

      const scrolled = await render(`
[source%nowrap,ruby,linenums]
----
a = 1
----
`)
      // nowrap option: the <pre> scrolls long lines instead of wrapping
      assert.match(scrolled, /<pre class="highlightjs highlight nowrap"/)
      // same grid markup either way
      assert.match(scrolled, /<span class="ln"><\/span><span class="line">a = /)
    })

    test('legacy -linenums-mode value is ignored (still numbers)', async () => {
      // the table/inline distinction is gone; any value just enables numbering
      const output = await render(
        `
[source,ruby,linenums]
----
a = 1
----
`,
        { 'highlightjs-linenums-mode': 'inline' }
      )
      assert.match(output, /<code class="[^"]*\blinenums\b/)
      assert.match(output, /<span class="ln"><\/span><span class="line">a = /)
    })
  })

  test('should emphasise highlighted lines', async () => {
    const output = await render(`
[source,ruby,highlight=2]
----
a = 1
b = 2
c = 3
----
`)
    assert.match(output, /<span class="hljs-ln-highlight">b = /)
  })

  describe('emphasis with callouts (full-width, conum stays on the line)', () => {
    test('should move a single callout inside the emphasis span', async () => {
      const output = await render(`
[source,ruby,highlight=1]
----
x = 1 # <1>
----
<1> emphasised line with a callout
`)
      // conum sits before the closing </span> of the emphasis span, not after it
      assert.match(
        output,
        /<span class="hljs-ln-highlight">.*<b class="conum">\(1\)<\/b><\/span>/
      )
    })

    test('should move multiple callouts on one emphasised line inside the span', async () => {
      const output = await render(`
[source,ruby,highlight=1]
----
x = [1, 2] # <1> <2>
----
<1> the array
<2> destructured
`)
      assert.match(
        output,
        /<span class="hljs-ln-highlight">.*<b class="conum">\(1\)<\/b> <b class="conum">\(2\)<\/b><\/span>/
      )
    })

    test('numbered + emphasis + callout: highlight on the code cell, conum inside', async () => {
      const output = await render(`
[source,ruby,linenums,highlight=2]
----
a = 1
b = 2 # <1>
----
<1> combo
`)
      // the emphasis class sits on the .line code cell (not the gutter cell), and
      // the conum closes inside that cell so it never becomes a stray grid item
      assert.match(
        output,
        /<span class="ln"><\/span><span class="line hljs-ln-highlight">b = <span class="hljs-number">2<\/span> # <b class="conum">\(1\)<\/b><\/span>/
      )
      // the gutter cell is always empty (the number is a CSS counter)
      assert.doesNotMatch(output, /<span class="ln">[^<]/)
    })
  })

  describe('theme stylesheet', () => {
    test('should embed the theme CSS from node_modules by default', async () => {
      const output = await renderStandalone(`
[source,ruby]
----
puts 'hi'
----
`)
      // embedded <style> containing hljs theme rules, no external link
      assert.match(output, /<style>[\s\S]*\.hljs[\s\S]*<\/style>/)
      assert.doesNotMatch(output, /<link[^>]+styles\/github\.min\.css/)
    })

    test('should link the CDN stylesheet when highlightjs-stylesheet=link', async () => {
      const output = await renderStandalone(
        `
[source,ruby]
----
puts 'hi'
----
`,
        { 'highlightjs-stylesheet': 'link' }
      )
      assert.match(output, /<link[^>]+styles\/github\.min\.css/)
    })

    test('should not add the client-side runtime script in build mode', async () => {
      const output = await renderStandalone(`
[source,ruby]
----
puts 'hi'
----
`)
      assert.doesNotMatch(output, /highlight\.min\.js/)
    })

    test('should warn and link the CDN when the theme stylesheet cannot be read', async () => {
      const logger = MemoryLogger.create()
      const output = await withLogger(logger, () =>
        renderStandalone(
          `
[source,ruby]
----
puts 'hi'
----
`,
          { 'highlightjs-theme': 'this-theme-does-not-exist' }
        )
      )
      // fell back to a CDN link for the (missing) theme
      assert.match(
        output,
        /<link[^>]+styles\/this-theme-does-not-exist\.min\.css/
      )
      const warnings = logger
        .getMessages()
        .filter((m) =>
          /could not read the 'this-theme-does-not-exist' theme/.test(
            m.getText()
          )
        )
      assert.equal(warnings.length, 1)
    })

    test('should inject helper CSS for line numbers and emphasis (embed)', async () => {
      const output = await renderStandalone(`
[source,ruby,linenums,highlight=1]
----
puts 'hi'
----
`)
      assert.match(output, /pre\.highlightjs \.ln\{/)
      assert.match(output, /pre\.highlightjs \.hljs-ln-highlight\{/)
    })

    test('should inject helper CSS even when the theme is linked', async () => {
      const output = await renderStandalone(
        `
[source,ruby,linenums]
----
puts 'hi'
----
`,
        { 'highlightjs-stylesheet': 'link' }
      )
      assert.match(output, /<link[^>]+styles\/github\.min\.css/)
      assert.match(output, /pre\.highlightjs \.ln\{/)
    })
  })
})
