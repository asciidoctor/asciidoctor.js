import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'
import ManPageConverter from '../src/converter/manpage.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAN_HEADER = `= ls(1)
:doctype: manpage
:manmanual: Linux User's Manual
:mansource: GNU coreutils 9.0`

// Mirrors the Ruby SAMPLE_MANPAGE_HEADER used in manpage_test.rb
const SAMPLE_MANPAGE_HEADER = `= command(1)
Author Name
:doctype: manpage
:manmanual: Command Manual
:mansource: Command 1.2.3

== NAME

command - does stuff

== SYNOPSIS

*command* [_OPTION_]... _FILE_...

== DESCRIPTION`

// ── Helpers ───────────────────────────────────────────────────────────────────

// Standalone conversion (full document with .TH header)
const manpage = async (input, opts = {}) => {
  const doc = await load(input, { safe: 'safe', backend: 'manpage', doctype: 'manpage', standalone: true, ...opts })
  return doc.convert()
}

// Non-standalone / embedded conversion (body content only, no .TH header)
const convert = async (input, opts = {}) => {
  const doc = await load(input, { safe: 'safe', backend: 'manpage', doctype: 'manpage', ...opts })
  return doc.convert()
}

// Load document for attribute inspection
const loadManpage = async (input, opts = {}) =>
  load(input, { safe: 'safe', backend: 'manpage', doctype: 'manpage', ...opts })

// Inline manify testing via a direct converter instance
const c = new ManPageConverter('manpage')

// ── manify ────────────────────────────────────────────────────────────────────

describe('ManPageConverter#manify', () => {
  test('collapses whitespace by default', () => {
    assert.equal(c.manify('hello  \n  world'), 'hello world')
  })

  test('normalizes whitespace: removes blanks around newlines', () => {
    assert.equal(c.manify('hello  \n  world', { whitespace: 'normalize' }), 'hello\nworld')
  })

  test('preserves whitespace: expands tabs to 8 spaces', () => {
    assert.equal(c.manify('\thello', { whitespace: 'preserve' }), '        hello')
  })

  test('preserves whitespace: escapes leading indent (non-line-start spaces)', () => {
    // Two or more spaces NOT at line start are escaped with \& to preserve indentation
    const result = c.manify('x  indented', { whitespace: 'preserve' })
    assert.match(result, /\\& {2}indented/)
  })

  test('preserves whitespace: keeps leading spaces on a line as-is', () => {
    const result = c.manify('  indented', { whitespace: 'preserve' })
    assert.equal(result, '  indented')
  })

  test('appends newline when append_newline is true', () => {
    assert.equal(c.manify('hello', { append_newline: true }), 'hello\n')
  })

  test('replaces literal backslash with \\(rs', () => {
    assert.equal(c.manify('foo\\bar'), 'foo\\(rsbar')
  })

  test('keeps troff escape sequence (ESC + backslash) unchanged', () => {
    // ESC-prefixed backslash should not be replaced
    const input = '\u001b\\fBbold\u001b\\fP'
    const result = c.manify(input)
    assert.equal(result, '\\fBbold\\fP')
  })

  test('replaces ellipsis entity with troff approximation', () => {
    assert.equal(c.manify('end&#8230;&#8203;start'), 'end.\\|.\\|.start')
  })

  test('escapes leading period on a line', () => {
    assert.equal(c.manify('.B heading'), '\\&.B heading')
  })

  test('replaces dash with \\-', () => {
    assert.equal(c.manify('non-breaking'), 'non\\-breaking')
  })

  test('decodes &lt; and &gt;', () => {
    assert.equal(c.manify('a &lt; b &gt; c'), 'a < b > c')
  })

  test('decodes &amp; (after other entities)', () => {
    assert.equal(c.manify('a &amp; b'), 'a & b')
  })

  test('replaces apostrophe with \\*(Aq', () => {
    assert.equal(c.manify("it's"), "it\\*(Aqs")
  })

  test('decodes copyright &#169;', () => {
    assert.equal(c.manify('&#169;'), '\\(co')
  })

  test('decodes en-dash &#8211;', () => {
    assert.equal(c.manify('&#8211;'), '\\(en')
  })

  test('decodes em-dash &#8212;', () => {
    assert.equal(c.manify('&#8212;'), '\\(em')
  })

  test('decodes em-dash followed by zero-width space', () => {
    assert.equal(c.manify('&#8212;&#8203;'), '\\(em')
  })

  test('decodes left/right double quotes', () => {
    assert.equal(c.manify('&#8220;hi&#8221;'), '\\(lqhi\\(rq')
  })

  test('decodes left/right single quotes', () => {
    assert.equal(c.manify('&#8216;hi&#8217;'), '\\(oqhi\\(cq')
  })

  test('strips trailing whitespace', () => {
    assert.equal(c.manify('hello   '), 'hello')
  })
})

// ── _uppercasePcdata ──────────────────────────────────────────────────────────

describe('ManPageConverter#_uppercasePcdata', () => {
  test('uppercases plain text', () => {
    assert.equal(c._uppercasePcdata('hello world'), 'HELLO WORLD')
  })

  test('uppercases only text content, leaves markup intact', () => {
    const result = c._uppercasePcdata('<b>hello</b> world')
    assert.equal(result, '<b>HELLO</b> WORLD')
  })

  test('uppercases only text content, leaves entity refs intact', () => {
    const result = c._uppercasePcdata('a &amp; b')
    assert.equal(result, 'A &amp; B')
  })
})

// ── Configuration ─────────────────────────────────────────────────────────────

describe('Configuration', () => {
  test('sets proper manpage-related attributes', async () => {
    const doc = await loadManpage(SAMPLE_MANPAGE_HEADER)
    assert.equal(doc.attr('filetype'), 'man')
    // doc.attr() uses a falsy check, so empty-string attributes must be read directly
    assert.equal(doc.attributes['filetype-man'], '')
    assert.equal(doc.attr('manvolnum'), '1')
    assert.equal(doc.attr('outfilesuffix'), '.1')
    assert.equal(doc.attr('manname'), 'command')
    assert.equal(doc.attr('mantitle'), 'command')
    assert.equal(doc.attr('manpurpose'), 'does stuff')
    assert.equal(doc.attr('docname'), 'command')
  })

  test('does not escape hyphen in manname in NAME section', async () => {
    const input = SAMPLE_MANPAGE_HEADER.replace('command - does stuff', 'git-describe - does stuff')
    const result = await manpage(input)
    assert.ok(result.includes('\n.SH "NAME"\ngit-describe \\- does stuff\n'))
  })

  test('outputs multiple mannames in NAME section', async () => {
    const input = SAMPLE_MANPAGE_HEADER.replace('command - does stuff', 'command, alt_command - does stuff')
    const result = await manpage(input)
    assert.ok(result.split('\n').includes('command, alt_command \\- does stuff'))
  })

  test('substitutes attributes in manname and manpurpose in NAME section', async () => {
    const input = `= {cmdname}(1)
Author Name
:doctype: manpage
:manmanual: Foo Bar Manual
:mansource: Foo Bar 1.0

== NAME

{cmdname} - {cmdname} puts the foo in your bar`
    const doc = await load(input, {
      safe: 'safe',
      backend: 'manpage',
      doctype: 'manpage',
      attributes: { cmdname: 'foobar' },
    })
    assert.equal(doc.attr('manname'), 'foobar')
    assert.deepEqual(doc.attr('mannames'), ['foobar'])
    assert.equal(doc.attr('manpurpose'), 'foobar puts the foo in your bar')
    assert.equal(doc.attr('docname'), 'foobar')
  })

  test('does not parse NAME section if manname and manpurpose attributes are pre-set', async () => {
    const input = `= foobar(1)
Author Name
:doctype: manpage
:manmanual: Foo Bar Manual
:mansource: Foo Bar 1.0

== SYNOPSIS

*foobar* [_OPTIONS_]...

== DESCRIPTION

When you need to put some foo on the bar.`
    const doc = await load(input, {
      safe: 'safe',
      backend: 'manpage',
      doctype: 'manpage',
      attributes: { manname: 'foobar', manpurpose: 'puts some foo on the bar' },
    })
    assert.equal(doc.attr('manname'), 'foobar')
    assert.deepEqual(doc.attr('mannames'), ['foobar'])
    assert.equal(doc.attr('manpurpose'), 'puts some foo on the bar')
    assert.equal(doc.sections()[0].title, 'SYNOPSIS')
  })

  test('normalizes whitespace and skips line comments before and inside NAME section', async () => {
    const input = `= foobar(1)
Author Name
:doctype: manpage
:manmanual: Foo Bar Manual
:mansource: Foo Bar 1.0

// this is the name section
== NAME

// it follows the form \`name - description\`
foobar - puts some foo
 on the bar
// a little bit of this, a little bit of that

== SYNOPSIS

*foobar* [_OPTIONS_]...

== DESCRIPTION

When you need to put some foo on the bar.`
    const doc = await loadManpage(input)
    assert.equal(doc.attr('manpurpose'), 'puts some foo on the bar')
  })

  test('defines default linkstyle', async () => {
    const result = await manpage(SAMPLE_MANPAGE_HEADER)
    assert.ok(result.split('\n').includes('.  LINKSTYLE blue R < >'))
  })

  test('uses linkstyle defined by man-linkstyle attribute', async () => {
    const result = await manpage(SAMPLE_MANPAGE_HEADER, {
      attributes: { 'man-linkstyle': 'cyan B \\[fo] \\[fc]' },
    })
    assert.ok(result.split('\n').includes('.  LINKSTYLE cyan B \\[fo] \\[fc]'))
  })

  test('collapses whitespace in man manual and man source in .TH line', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

Describe this thing.`
    const result = await manpage(input, {
      attributes: {
        manmanual: 'General\nCommands\nManual',
        mansource: 'Control\nAll\nThe\nThings\n5.0',
      },
    })
    assert.ok(result.includes('Manual: General Commands Manual'))
    assert.ok(result.includes('Source: Control All The Things 5.0'))
    assert.ok(result.includes('"Control All The Things 5.0" "General Commands Manual"'))
  })
})

// ── Manify (integration) ──────────────────────────────────────────────────────

describe('Manify (integration)', () => {
  test('unescapes literal ampersand', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

(C) & (R) are translated to character references, but not the &.`
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(lines[lines.length - 1], '\\(co & \\(rg are translated to character references, but not the &.')
  })

  test('replaces numeric character reference for plus', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

A {plus} B`
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(lines[lines.length - 1], 'A + B')
  })

  test('replaces numeric character reference for degree sign', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

0{deg} is freezing`
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(lines[lines.length - 1], '0\\(de is freezing')
  })

  test('replaces em dashes', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

go -- to

go--to`
    const result = await convert(input)
    assert.ok(result.includes('go \\(em to'))
    assert.ok(result.includes('go\\(emto'))
  })

  test('escapes lone period', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

.`
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(lines[lines.length - 1], '\\&.')
  })

  test('escapes raw macro', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

AAA this line of text should be shown
.if 1 .nx
BBB this line and the one above it should be visible`
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(lines[lines.length - 2], '\\&.if 1 .nx')
  })

  test('escapes ellipsis at start of line', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

-x::
Ao gravar o commit, acrescente uma linha que diz "(cherry picked from commit
...)" à mensagem de commit original para indicar qual commit esta mudança
foi escolhida. Isso é feito apenas para picaretas de cereja sem conflitos.`
    const result = await convert(input)
    const lines = result.split('\n')
    const dotLine = lines.find(l => l.startsWith('\\&.'))
    assert.ok(dotLine, 'should have a line starting with \\&.')
    assert.ok(dotLine.startsWith('\\&.\\|.\\|.'))
  })

  test('does not escape ellipsis in the middle of a line', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

-x::
Ao gravar o commit, acrescente uma linha que diz
"(cherry picked from commit...)" à mensagem de commit
original para indicar qual commit esta mudança
foi escolhida. Isso é feito apenas para picaretas
de cereja sem conflitos.`
    const result = await convert(input)
    assert.ok(result.includes('commit.\\|.\\|.'))
  })

  test('normalizes whitespace in a paragraph', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

Oh, here it goes again
  I should have known,
    should have known,
should have known again`
    const result = await convert(input)
    assert.ok(result.includes('Oh, here it goes again\nI should have known,\nshould have known,\nshould have known again'))
  })

  test('normalizes whitespace in a list item', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

* Oh, here it goes again
    I should have known,
  should have known,
should have known again`
    const result = await convert(input)
    assert.ok(result.includes('Oh, here it goes again\nI should have known,\nshould have known,\nshould have known again'))
  })

  test('drops principal text of list item in ulist if empty', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

* {empty}
+
the main text`
    const result = await convert(input)
    assert.ok(result.endsWith('.\\}\nthe main text\n.RE'))
  })

  test('drops principal text of list item in olist if empty', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

. {empty}
+
the main text`
    const result = await convert(input)
    assert.ok(result.endsWith('.\\}\nthe main text\n.RE'))
  })

  test('does not add extra space before block content if dlist item has no text', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

term::
+
description`
    const result = await convert(input)
    assert.ok(result.endsWith('term\n.RS 4\ndescription\n.RE'))
  })

  test('honors start attribute on ordered list', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

[start=5]
. five
. six`
    const result = await convert(input)
    assert.match(result, /IP " 5\."[\s\S]*five/)
    assert.match(result, /IP " 6\."[\s\S]*six/)
  })

  test('uppercases section titles without mangling formatting macros', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

does stuff

== "\`Main\`" _<Options>_`
    const result = await convert(input)
    assert.ok(result.includes('.SH "\\(lqMAIN\\(rq \\fI<OPTIONS>\\fP"'))
  })

  test('does not uppercase monospace span in section titles', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

does stuff

== \`show\` option`
    const result = await convert(input)
    assert.ok(result.includes('.SH "\\f(CRshow\\fP OPTION"'))
  })

  test('escapes repeated spaces in literal content', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

....
  ,---.          ,-----.
  |Bob|          |Alice|
  \`-+-'          \`--+--'
    |    hello      |
    |-------------->|
  ,-+-.          ,--+--.
  |Bob|          |Alice|
  \`---'          \`-----'
....`
    const result = await convert(input)
    assert.ok(result.includes('.fam C'))
    assert.ok(result.includes('.fam'))
    assert.ok(result.includes('\\&'))
  })
})

// ── Backslash ─────────────────────────────────────────────────────────────────

describe('Backslash', () => {
  test('does not escape spaces for empty manual or source fields', async () => {
    const headerLines = SAMPLE_MANPAGE_HEADER
      .split('\n')
      .filter(l => !l.startsWith(':manmanual:') && !l.startsWith(':mansource:'))
    const input = headerLines.join('\n')
    const result = await manpage(input)
    assert.match(result, / Manual: \\ \\&/)
    assert.match(result, / Source: \\ \\&/)
    assert.match(result, /^\.TH "COMMAND" .* "\\ \\&" "\\ \\&"$/m)
  })

  test('preserves backslashes in escape sequences', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

"\`hello\`" '\`goodbye\`' *strong* _weak_ \`even\``
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(
      lines[lines.length - 1],
      '\\(lqhello\\(rq \\(oqgoodbye\\(cq \\fBstrong\\fP \\fIweak\\fP \\f(CReven\\fP'
    )
  })

  test('preserves literal backslashes in content', async () => {
    // Equivalent to Ruby SAMPLE_MANPAGE_HEADER + \.foo \ bar \\ baz\
    const input = `${SAMPLE_MANPAGE_HEADER}

\\.foo \\ bar \\\\ baz\\
more`
    const result = await convert(input)
    const lines = result.split('\n')
    assert.equal(lines[lines.length - 2], '\\(rs.foo \\(rs bar \\(rs\\(rs baz\\(rs')
  })

  test('preserves inline breaks', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

Before break. +
After break.`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 3], 'Before break.')
    assert.equal(lines[len - 2], '.br')
    assert.equal(lines[len - 1], 'After break.')
  })
})

// ── URL macro ─────────────────────────────────────────────────────────────────

describe('URL macro', () => {
  test('does not leave blank line before URL macro', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}
First paragraph.

http://asciidoc.org[AsciiDoc]`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 4], '.sp')
    assert.equal(lines[len - 3], 'First paragraph.')
    assert.equal(lines[len - 2], '.sp')
    assert.equal(lines[len - 1], '.URL "http://asciidoc.org" "AsciiDoc" ""')
  })

  test('does not swallow content following URL', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

http://asciidoc.org[AsciiDoc] can be used to create man pages.`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 2], '.URL "http://asciidoc.org" "AsciiDoc" ""')
    assert.equal(lines[len - 1], 'can be used to create man pages.')
  })

  test('passes adjacent character as final argument of URL macro', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

This is http://asciidoc.org[AsciiDoc].`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 2], 'This is \\c')
    assert.equal(lines[len - 1], '.URL "http://asciidoc.org" "AsciiDoc" "."')
  })

  test('passes adjacent character and moves trailing content to next line', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

This is http://asciidoc.org[AsciiDoc], which can be used to write content.`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 3], 'This is \\c')
    assert.equal(lines[len - 2], '.URL "http://asciidoc.org" "AsciiDoc" ","')
    assert.equal(lines[len - 1], 'which can be used to write content.')
  })

  test('does not leave blank lines between URLs on contiguous lines of input', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

The corresponding implementations are
http://clisp.sf.net[CLISP],
http://ccl.clozure.com[Clozure CL],
http://cmucl.org[CMUCL],
http://ecls.sf.net[ECL],
and http://sbcl.sf.net[SBCL].`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 8], '.sp')
    assert.equal(lines[len - 7], 'The corresponding implementations are')
    assert.equal(lines[len - 6], '.URL "http://clisp.sf.net" "CLISP" ","')
    assert.equal(lines[len - 5], '.URL "http://ccl.clozure.com" "Clozure CL" ","')
    assert.equal(lines[len - 4], '.URL "http://cmucl.org" "CMUCL" ","')
    assert.equal(lines[len - 3], '.URL "http://ecls.sf.net" "ECL" ","')
    assert.equal(lines[len - 2], 'and \\c')
    assert.equal(lines[len - 1], '.URL "http://sbcl.sf.net" "SBCL" "."')
  })

  test('does not leave blank lines between URLs on same line of input', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

The corresponding implementations are http://clisp.sf.net[CLISP], http://ccl.clozure.com[Clozure CL], http://cmucl.org[CMUCL], http://ecls.sf.net[ECL], and http://sbcl.sf.net[SBCL].`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 8], '.sp')
    assert.equal(lines[len - 7], 'The corresponding implementations are \\c')
    assert.equal(lines[len - 6], '.URL "http://clisp.sf.net" "CLISP" ","')
    assert.equal(lines[len - 5], '.URL "http://ccl.clozure.com" "Clozure CL" ","')
    assert.equal(lines[len - 4], '.URL "http://cmucl.org" "CMUCL" ","')
    assert.equal(lines[len - 3], '.URL "http://ecls.sf.net" "ECL" ","')
    assert.equal(lines[len - 2], 'and')
    assert.equal(lines[len - 1], '.URL "http://sbcl.sf.net" "SBCL" "."')
  })

  test('does not insert space between link and non-whitespace characters surrounding it', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

Please search |link:http://discuss.asciidoctor.org[the forums]| before asking.`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 4], '.sp')
    assert.equal(lines[len - 3], 'Please search |\\c')
    assert.equal(lines[len - 2], '.URL "http://discuss.asciidoctor.org" "the forums" "|"')
    assert.equal(lines[len - 1], 'before asking.')
  })

  test('can use monospaced text inside a link', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

Enter the link:cat[\`cat\`] command.`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 4], '.sp')
    assert.equal(lines[len - 3], 'Enter the \\c')
    assert.equal(lines[len - 2], '.URL "cat" "\\f(CRcat\\fP" ""')
    assert.equal(lines[len - 1], 'command.')
  })
})

// ── MTO macro ─────────────────────────────────────────────────────────────────

describe('MTO macro', () => {
  test('converts inline email macro into MTO macro', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}
First paragraph.

mailto:doc@example.org[Contact the doc]`
    const result = await convert(input)
    const lines = result.split('\n')
    const len = lines.length
    assert.equal(lines[len - 4], '.sp')
    assert.equal(lines[len - 3], 'First paragraph.')
    assert.equal(lines[len - 2], '.sp')
    assert.equal(lines[len - 1], '.MTO "doc\\(atexample.org" "Contact the doc" ""')
  })

  test('sets text of MTO macro to blank for implicit email', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}
Bugs fixed daily by doc@example.org.`
    const result = await convert(input)
    assert.ok(result.endsWith('Bugs fixed daily by \\c\n.MTO "doc\\(atexample.org" "" "."'))
  })
})

// ── Table ─────────────────────────────────────────────────────────────────────

describe('Table', () => {
  test('creates header, body, and footer rows in correct order', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

[%header%footer]
|===
|Header
|Body 1
|Body 2
|Footer
|===`
    const result = await convert(input)
    const expected = [
      'allbox tab(:);',
      'ltB.',
      'T{',
      'Header',
      'T}',
      '.T&',
      'lt.',
      'T{',
      'Body 1',
      'T}',
      'T{',
      'Body 2',
      'T}',
      'T{',
      'Footer',
      'T}',
      '.TE',
      '.sp',
    ].join('\n')
    assert.ok(result.endsWith(expected))
  })

  test('manifies normal table cell content without BOUNDARY markers', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

|===
|*Col A* |_Col B_

|*bold* |\`mono\`
|_italic_ | #mark#
|===`
    const result = await convert(input)
    assert.doesNotMatch(result, /<\/?BOUNDARY>/)
  })

  test('manifies table title', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

.Table of options
|===
| Name | Description | Default

| dim
| dimension of the object
| 3
|===`
    const result = await convert(input)
    const expected = `.it 1 an-trap
.nr an-no-space-flag 1
.nr an-break-flag 1
.br
.B Table 1. Table of options
.TS
allbox tab(:);
ltB ltB ltB.
T{
Name
T}:T{
Description
T}:T{
Default
T}
.T&
lt lt lt.
T{
dim
T}:T{
dimension of the object
T}:T{
3
T}
.TE
.sp`
    assert.ok(result.endsWith(expected))
  })

  test('manifies and preserves whitespace in literal table cell', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

|===
|a l|b
c    _d_
.
|===`
    const result = await convert(input)
    const expected = `.TS
allbox tab(:);
lt lt.
T{
a
T}:T{
.nf
b
c\\&    _d_
\\&.
.fi
T}
.TE
.sp`
    assert.ok(result.endsWith(expected))
  })

  test('preserves break between paragraphs in normal table cell', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

[cols=3*]
|===
|single paragraph
|first paragraph

second paragraph
|foo

more foo

even more foo
|===`
    const result = await convert(input)
    const expected = `.TS
allbox tab(:);
lt lt lt.
T{
single paragraph
T}:T{
first paragraph
.sp
second paragraph
T}:T{
foo
.sp
more foo
.sp
even more foo
T}
.TE
.sp`
    assert.ok(result.endsWith(expected))
  })
})

// ── Images ────────────────────────────────────────────────────────────────────

describe('Images', () => {
  test('replaces block image with alt text enclosed in square brackets', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

Behold the wisdom of the Magic 8 Ball!

image::signs-point-to-yes.jpg[]`
    const result = await convert(input)
    assert.ok(result.endsWith('\n.sp\n[signs point to yes]'))
  })

  test('manifies alt text of block image', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

image::rainbow.jpg["That's a double rainbow, otherwise known as rainbow++!"]`
    const result = await convert(input)
    assert.ok(result.endsWith('\n.sp\n[That\\*(Aqs a double rainbow, otherwise known as rainbow++!]'))
  })

  test('replaces inline image with alt text enclosed in square brackets', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

The Magic 8 Ball says image:signs-point-to-yes.jpg[].`
    const result = await convert(input)
    assert.ok(result.includes('The Magic 8 Ball says [signs point to yes].'))
  })

  test('places link after alt text for inline image if link is defined', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

The Magic 8 Ball says image:signs-point-to-yes.jpg[link=https://en.wikipedia.org/wiki/Magic_8-Ball].`
    const result = await convert(input)
    assert.ok(result.includes('The Magic 8 Ball says [signs point to yes] <https://en.wikipedia.org/wiki/Magic_8\\-Ball>.'))
  })
})

// ── convert_document ──────────────────────────────────────────────────────────

describe('ManPageConverter convert_document', () => {
  test('includes man comment header with title and generator', async () => {
    const input = `${MAN_HEADER}

== NAME

ls - list directory contents`
    const result = await manpage(input)
    assert.match(result, /\.\\" {5}Title: ls/)
    assert.match(result, /\.\\" Generator: Asciidoctor/)
  })

  test('includes portability macros', async () => {
    const result = await manpage(`${MAN_HEADER}\n\n== NAME\n\nls - list`)
    assert.match(result, /\.ie \\n\(\.g \.ds Aq/)
    assert.match(result, /\.nh/)
    assert.match(result, /\.ad l/)
  })

  test('generates AUTHOR section for single author', async () => {
    const input = `= ls(1)
:doctype: manpage
:manmanual: Test Manual
Author Name <author@example.com>

== NAME

ls - list directory`
    const result = await manpage(input)
    assert.match(result, /\.SH "AUTHOR"/)
    assert.match(result, /Author Name/)
  })

  test('omits date line when reproducible attribute is set', async () => {
    const result = await manpage(`${MAN_HEADER}
:reproducible:

== NAME

ls - list`, {})
    assert.doesNotMatch(result, /\.\\" {6}Date:/)
  })
})

// ── convert_section ───────────────────────────────────────────────────────────

describe('ManPageConverter convert_section', () => {
  test('level-1 section generates .SH with uppercase title', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list directory contents

== SYNOPSIS

*ls* [_OPTION_]... [_FILE_]...`)
    assert.match(result, /\.SH "SYNOPSIS"/)
  })

  test('level-2 section generates .SS', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list directory contents

== OPTIONS

=== Formatting options

some content`)
    assert.match(result, /\.SS "Formatting options"/)
  })
})

// ── convert_paragraph ─────────────────────────────────────────────────────────

describe('ManPageConverter convert_paragraph', () => {
  test('generates .sp before paragraph text', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

some text`)
    assert.match(result, /\.sp/)
  })
})

// ── convert_ulist ─────────────────────────────────────────────────────────────

describe('ManPageConverter convert_ulist', () => {
  test('generates bullet list entries', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

* first item
* second item`)

    assert.ok(result.includes('\\(bu'), 'should include bullet character')
    assert.match(result, /first item/)
    assert.match(result, /second item/)
  })
})

// ── convert_olist ─────────────────────────────────────────────────────────────

describe('ManPageConverter convert_olist', () => {
  test('generates numbered list entries', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

. step one
. step two`)
    assert.match(result, /1\./)
    assert.match(result, /step one/)
    assert.match(result, /2\./)
    assert.match(result, /step two/)
  })
})

// ── convert_dlist ─────────────────────────────────────────────────────────────

describe('ManPageConverter convert_dlist', () => {
  test('generates definition list entries', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== OPTIONS

-a::
  do not ignore entries starting with .`)
    assert.match(result, /\\-a/)
    assert.match(result, /do not ignore/)
    assert.match(result, /\.RS 4/)
    assert.match(result, /\.RE/)
  })
})

// ── convert_listing ───────────────────────────────────────────────────────────

describe('ManPageConverter convert_listing', () => {
  test('generates verbatim block with .nf/.fi', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== EXAMPLES

----
ls -la /tmp
----`)
    assert.match(result, /\.nf/)
    assert.match(result, /\.fi/)
    assert.match(result, /ls \\-la \/tmp/)
  })
})

// ── convert_admonition ────────────────────────────────────────────────────────

describe('ManPageConverter convert_admonition', () => {
  test('generates admonition block with label', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== NOTES

NOTE: This is important.`)
    assert.match(result, /\.B Note/)
    assert.match(result, /This is important/)
  })
})

// ── convert_inline_quoted ─────────────────────────────────────────────────────

describe('ManPageConverter convert_inline_quoted', () => {
  test('strong text uses \\fB...\\fP', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

This is *bold* text.`)
    assert.match(result, /\\fBbold\\fP/)
  })

  test('emphasis text uses \\fI...\\fP', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

This is _italic_ text.`)
    assert.match(result, /\\fIitalic\\fP/)
  })

  test('monospaced text uses \\f(CR...\\fP', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

This is \`code\` text.`)
    assert.match(result, /\\f\(CRcode\\fP/)
  })
})

// ── convert_inline_anchor ─────────────────────────────────────────────────────

describe('ManPageConverter convert_inline_anchor', () => {
  test('MTO macro is generated for mailto links', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== AUTHORS

Contact mailto:admin@example.com[admin].`)
    assert.match(result, /MTO "admin\\\(atexample\.com" "admin"/)
  })
})

// ── convert_thematic_break ────────────────────────────────────────────────────

describe('ManPageConverter convert_thematic_break', () => {
  test('generates centered rule', async () => {
    const result = await manpage(`${MAN_HEADER}

== NAME

ls - list

== DESCRIPTION

paragraph one

'''

paragraph two`)
    assert.match(result, /\.ce/)
    assert.match(result, /\\l'/)
  })
})

// ── Quote Block ───────────────────────────────────────────────────────────────

describe('Quote Block', () => {
  test('indents quote block', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

[,James Baldwin]
____
Not everything that is faced can be changed.
But nothing can be changed until it is faced.
____`
    const result = await convert(input)
    const expected = `.RS 3
.ll -.6i
.sp
Not everything that is faced can be changed.
But nothing can be changed until it is faced.
.br
.RE
.ll
.RS 5
.ll -.10i
\\(em James Baldwin
.RE
.ll`
    assert.ok(result.endsWith(expected))
  })
})

// ── Verse Block ───────────────────────────────────────────────────────────────

describe('Verse Block', () => {
  test('preserves hard line breaks in verse block in SYNOPSIS', async () => {
    const input = `= command(1)
Author Name
:doctype: manpage
:manmanual: Command Manual
:mansource: Command 1.2.3

== NAME

command - does stuff

== SYNOPSIS

[verse]
_command_ [_OPTION_]... _FILE_...

== DESCRIPTION

description`
    // Ruby test uses non-standalone (embedded) conversion
    const result = await convert(input)
    const expected = `.SH "SYNOPSIS"
.sp
.nf
\\fIcommand\\fP [\\fIOPTION\\fP].\\|.\\|. \\fIFILE\\fP.\\|.\\|.
.fi
.br
.SH "DESCRIPTION"
.sp
description`
    assert.ok(result.endsWith(expected))
  })
})

// ── Callout List ──────────────────────────────────────────────────────────────

describe('Callout List', () => {
  test('generates callout list using proper formatting commands', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

----
$ gem install asciidoctor # <1>
----
<1> Installs the asciidoctor gem from RubyGems.org`
    const result = await convert(input)
    const expected = `.TS
tab(:);
r lw(\\n(.lu*75u/100u).
\\fB(1)\\fP\\h'-2n':T{
Installs the asciidoctor gem from RubyGems.org
T}
.TE`
    assert.ok(result.endsWith(expected))
  })
})

// ── Page breaks ───────────────────────────────────────────────────────────────

describe('Page breaks', () => {
  test('inserts page break at location of page break macro', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== Section With Break

before break

<<<

after break`
    const result = await convert(input)
    const expected = `.SH "SECTION WITH BREAK"
.sp
before break
.bp
.sp
after break`
    assert.ok(result.endsWith(expected))
  })
})

// ── UI macros ─────────────────────────────────────────────────────────────────

describe('UI macros', () => {
  test('encloses button in square brackets and formats as bold', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== UI Macros

btn:[Save]`
    const result = await convert(input, { attributes: { experimental: '' } })
    const expected = `.SH "UI MACROS"
.sp
\\fB[\\0Save\\0]\\fP`
    assert.ok(result.endsWith(expected))
  })

  test('formats single key in monospaced text', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== UI Macros

kbd:[Enter]`
    const result = await convert(input, { attributes: { experimental: '' } })
    const expected = `.SH "UI MACROS"
.sp
\\f(CREnter\\fP`
    assert.ok(result.endsWith(expected))
  })

  test('formats each key in sequence as monospaced text separated by +', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== UI Macros

kbd:[Ctrl,s]`
    const result = await convert(input, { attributes: { experimental: '' } })
    const expected = `.SH "UI MACROS"
.sp
\\f(CRCtrl\\0+\\0s\\fP`
    assert.ok(result.endsWith(expected))
  })

  test('formats single menu reference in italic', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== UI Macros

menu:File[]`
    const result = await convert(input, { attributes: { experimental: '' } })
    const expected = `.SH "UI MACROS"
.sp
\\fIFile\\fP`
    assert.ok(result.endsWith(expected))
  })

  test('formats menu sequence in italic separated by carets', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== UI Macros

menu:File[New Tab]`
    const result = await convert(input, { attributes: { experimental: '' } })
    const expected = `.SH "UI MACROS"
.sp
\\fIFile\\0\\(fc\\0New Tab\\fP`
    assert.ok(result.endsWith(expected))
  })

  test('formats menu sequence with submenu in italic separated by carets', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

== UI Macros

menu:View[Zoom > Zoom In]`
    const result = await convert(input, { attributes: { experimental: '' } })
    const expected = `.SH "UI MACROS"
.sp
\\fIView\\fP\\0\\(fc\\0\\fIZoom\\fP\\0\\(fc\\0\\fIZoom In\\fP`
    assert.ok(result.endsWith(expected))
  })
})

// ── xrefs ─────────────────────────────────────────────────────────────────────

describe('xrefs', () => {
  test('populates automatic link text for internal xref', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

You can access this information using the options listed under <<_generic_program_information>>.

== Options

=== Generic Program Information

--help:: Output a usage message and exit.

-V, --version:: Output the version number of grep and exit.`
    const result = await convert(input)
    assert.ok(result.includes('You can access this information using the options listed under Generic Program Information.'))
  })

  test('populates automatic link text for each occurrence of internal xref', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

You can access this information using the options listed under <<_generic_program_information>>.

The options listed in <<_generic_program_information>> should always be used by themselves.

== Options

=== Generic Program Information

--help:: Output a usage message and exit.

-V, --version:: Output the version number of grep and exit.`
    const result = await convert(input)
    assert.ok(result.includes('You can access this information using the options listed under Generic Program Information.'))
    assert.ok(result.includes('The options listed in Generic Program Information should always be used by themselves.'))
  })

  test('uppercases reftext for level-1 section titles if reftext matches section title', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

If you read nothing else, read the <<_foo_bar>> section.

=== Options

--foo-bar _foobar_::
Puts the foo in your bar.
See <<_foo_bar>> section for details.

== Foo Bar

Foo goes with bar, not baz.`
    const result = await convert(input)
    assert.ok(result.includes('If you read nothing else, read the FOO BAR section.'))
    assert.ok(result.includes('See FOO BAR section for details.'))
  })
})

// ── Footnotes ─────────────────────────────────────────────────────────────────

describe('Footnotes', () => {
  test('generates footnotes as numbered list in NOTES section (non-standalone)', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:[first footnote]

more text.footnote:[second footnote]`
    const result = await convert(input)
    const expected = `.sp
text.[1]
.sp
more text.[2]
.SH "NOTES"
.IP [1]
first footnote
.IP [2]
second footnote`
    assert.ok(result.endsWith(expected))
  })

  test('generates footnotes as numbered list in NOTES section (standalone)', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:[first footnote]

more text.footnote:[second footnote]`
    const result = await manpage(input)
    const expected = `.sp
text.[1]
.sp
more text.[2]
.SH "NOTES"
.IP [1]
first footnote
.IP [2]
second footnote
.SH "AUTHOR"
.sp
Author Name`
    assert.ok(result.endsWith(expected))
  })

  test('numbers footnotes according to footnote index', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:fn1[first footnote]footnote:[second footnote]

more text.footnote:fn1[]`
    const result = await convert(input)
    const expected = `.sp
text.[1][2]
.sp
more text.[1]
.SH "NOTES"
.IP [1]
first footnote
.IP [2]
second footnote`
    assert.ok(result.endsWith(expected))
  })

  test('formats footnote with bare URL', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:[https://example.org]`
    const result = await convert(input)
    const expected = `.SH "NOTES"
.IP [1]
.URL "https://example.org" "" ""`
    assert.ok(result.endsWith(expected))
  })

  test('formats footnote with text before bare URL', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:[see https://example.org]`
    const result = await convert(input)
    const expected = `.SH "NOTES"
.IP [1]
see \\c
.URL "https://example.org" "" ""`
    assert.ok(result.endsWith(expected))
  })

  test('formats footnote with text after bare URL', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:[https://example.org is the place]`
    const result = await convert(input)
    const expected = `.SH "NOTES"
.IP [1]
.URL "https://example.org" "" ""
is the place`
    assert.ok(result.endsWith(expected))
  })

  test('formats footnote with URL macro', async () => {
    const input = `${SAMPLE_MANPAGE_HEADER}

text.footnote:[go to https://example.org[example site].]`
    const result = await convert(input)
    const expected = `.SH "NOTES"
.IP [1]
go to \\c
.URL "https://example.org" "example site" "."`
    assert.ok(result.endsWith(expected))
  })
})

// ── Environment ───────────────────────────────────────────────────────────────

describe('Environment', () => {
  test('uses SOURCE_DATE_EPOCH as modified time of input file', async () => {
    const oldSourceDateEpoch = process.env.SOURCE_DATE_EPOCH
    try {
      process.env.SOURCE_DATE_EPOCH = '1234123412'
      const result = await manpage(SAMPLE_MANPAGE_HEADER)
      assert.match(result, /Date: 2009-02-08/)
      assert.match(result, /^\.TH "COMMAND" "1" "2009-02-08" "Command 1\.2\.3" "Command Manual"$/m)
    } finally {
      if (oldSourceDateEpoch === undefined) {
        delete process.env.SOURCE_DATE_EPOCH
      } else {
        process.env.SOURCE_DATE_EPOCH = oldSourceDateEpoch
      }
    }
  })
})
