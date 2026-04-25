// ESM conversion of rx.rb
// A collection of regular expression constants used by the parser.
//
// Ruby → JavaScript regex engine differences handled here:
//
//   Ruby \p{Alpha}  → JS \p{Alphabetic}  (Unicode Binary Property, requires 'u' flag)
//   Ruby \p{Alnum}  → JS \p{Alphabetic}\p{N}   (inside […]) or [\p{Alphabetic}\p{N}]
//   Ruby \p{Word}   → JS \p{Alphabetic}\p{N}\p{Pc}  (Letter + Number + Connector Punct)
//   Ruby \p{Blank}  → JS \p{Zs}\t  (Unicode Space_Separator + tab)
//   Ruby CC_ALL (. with /m)  → [\s\S]  (no 's' flag needed)
//   Ruby CC_ANY (.)          → .
//   Ruby ^ / $               → always line anchors in Ruby; in JS only with 'm' flag
//   Ruby \A / \Z             → ^ / $ in JS (string anchors, no 'm' flag)
//
// IMPORTANT – 'u' flag and unset back-references:
//   Without 'u': \n to an unset group matches the empty string (Ruby-compatible).
//   With    'u': \n to an unset group fails (stricter).
//   → InlineLinkRx is intentionally kept WITHOUT the 'u' flag because it relies on
//     the (?!\2) trick (negative lookahead of an unset back-reference) to guard the
//     angle-bracket branch.  All other patterns use 'u'.

// ── Character class string constants ─────────────────────────────────────────
// CC_* → raw content for insertion INSIDE a character class: [${CC_WORD}]
// CG_* → complete character class GROUP for standalone use:  ${CG_WORD}
//
// These are runtime strings whose value contains real regex syntax (single
// backslashes) so that String.raw`…${CC_WORD}…` produces correct regex source.

export const CC_ALL = '[\\s\\S]' // any char including newlines (Ruby . with /m flag)
export const CC_ANY = '.' // any char except newlines
export const CC_EOL = '$' // end of line / string

// \p{Alphabetic} ≈ Ruby \p{Alpha} – all Unicode alphabetic characters
export const CC_ALPHA = '\\p{Alphabetic}' // inside [...]
export const CG_ALPHA = '\\p{Alphabetic}' // standalone (unary property, no brackets needed)

// \p{Alphabetic}\p{N} ≈ Ruby \p{Alnum} – alphabetics + all Unicode numbers
export const CC_ALNUM = '\\p{Alphabetic}\\p{N}' // inside [...]
export const CG_ALNUM = '[\\p{Alphabetic}\\p{N}]' // standalone group

// \p{Alphabetic}\p{N}\p{Pc} ≈ Ruby \p{Word}
// Letter + Number + Connector Punctuation (underscore, undertie, …)
export const CC_WORD = '\\p{Alphabetic}\\p{N}\\p{Pc}' // inside [...]
export const CG_WORD = '[\\p{Alphabetic}\\p{N}\\p{Pc}]' // standalone group

// \p{Zs}\t ≈ Ruby \p{Blank} – Unicode Space_Separator category + tab
export const CG_BLANK = '[\\p{Zs}\\t]' // standalone group

// Attribute list pattern fragment: \[([^\[\]]+)\]
// Ruby: QuoteAttributeListRxt = %(\\[([^\\[\\]]+)\\])
export const QuoteAttributeListRxt = '\\[([^\\[\\]]+)\\]'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a regex with the Unicode flag ('u'), enabling \p{…} property escapes.
 * @param {string} src        - Regex source string (use String.raw for easy authoring).
 * @param {string} extraFlags - Additional flags, e.g. 'm' for multiline ^ / $
 */
const ru = (src, extraFlags = '') => new RegExp(src, `u${extraFlags}`)

/**
 * Escape all regex metacharacters in str (equivalent to Regexp.escape in Ruby).
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a lazy-initialised regex map, mirroring Ruby's Hash.new { |h,k| h[k] = … }.
 * Accessing map[key] creates and caches the regex for that key.
 */
function makeLazyRxMap(buildFn) {
  const cache = new Map()
  return new Proxy(Object.create(null), {
    get(_target, key) {
      if (typeof key !== 'string') return undefined
      if (!cache.has(key)) cache.set(key, buildFn(key))
      return cache.get(key)
    },
  })
}

// ── Document header ───────────────────────────────────────────────────────────

/**
 * Matches the author info line immediately following the document title.
 * @example
 * Doc Writer <doc@example.com>
 * Mary_Sue Brontë
 */
export const AuthorInfoLineRx = ru(
  String.raw`^(${CG_WORD}[${CC_WORD}\-'.]*)(?: +(${CG_WORD}[${CC_WORD}\-'.]*))?` +
    String.raw`(?: +(${CG_WORD}[${CC_WORD}\-'.]*))?(?:[ ]+<([^>]+)>)?$`
)

/**
 * Matches the delimiter that separates multiple authors.
 * @example
 * Doc Writer; Junior Writer
 */
export const AuthorDelimiterRx = /;(?: |$)/

/**
 * Matches the revision info line immediately following the author info line.
 * @example
 * v1.0
 * 2013-01-01
 * v1.0, 2013-01-01: Ring in the new year release
 */
export const RevisionInfoLineRx =
  /^(?:[^\d{]*(.*?),)? *(?!:)(.*?)(?: *(?!^),?: *(.*))?$/

/**
 * Matches the title and volnum in the manpage doctype.
 * @example
 * = asciidoctor(1)
 * = asciidoctor ( 1 )
 */
export const ManpageTitleVolnumRx = /^(.+?) *\( *(.+?) *\)$/

/**
 * Matches the name and purpose in the manpage doctype.
 * @example
 * asciidoctor - converts AsciiDoc source files to HTML, DocBook and other formats
 */
export const ManpageNamePurposeRx = /^(.+?) +- +(.+)$/

// ── Preprocessor directives ───────────────────────────────────────────────────

/**
 * Matches a conditional preprocessor directive (ifdef, ifndef, ifeval, endif).
 * @example
 * ifdef::basebackend-html[]
 * ifeval::["{asciidoctor-version}" >= "0.1.0"]
 * endif::[]
 */
export const ConditionalDirectiveRx =
  /^(\\)?(ifdef|ifndef|ifeval|endif)::(\S*?(?:([,+])\S*?)?)\[(.+)?\]$/

/**
 * Matches a restricted (safe) eval expression.
 * @example
 * "{asciidoctor-version}" >= "0.1.0"
 */
export const EvalExpressionRx = /^(.+?) *([=!><]=|[><]) *(.+)$/

/**
 * Matches an include preprocessor directive.
 * @example
 * include::chapter1.ad[]
 * include::example.txt[lines=1;2;5..10]
 */
export const IncludeDirectiveRx =
  /^(\\)?include::([^\s[](?:[^[]*[^\s[])?)\[(.+)?\]$/

/**
 * Matches a trailing tag directive in an include file.
 *
 * NOTE: 'm' flag required so that $ matches end-of-line (not only end-of-string) in JS.
 * NOTE: accounts for \r in Windows line endings.
 * @example
 * // tag::try-catch[]
 * // end::try-catch[]
 */
export const TagDirectiveRx = /\b(?:tag|(e)nd)::(\S+?)\[\](?=$|[ \r])/m

// ── Attribute entries and references ─────────────────────────────────────────

/**
 * Matches a document attribute entry.
 * @example
 * :foo: bar
 * :First Name: Dan
 * :sectnums!:
 */
export const AttributeEntryRx = ru(
  String.raw`^:(!?${CG_WORD}[^:]*):(?:[ \t]+(.*))?$`
)

/** Matches invalid characters in an attribute name. */
export const InvalidAttributeNameCharsRx = ru(String.raw`[^${CC_WORD}\-]`)

/**
 * Matches a pass inline macro surrounding an attribute entry value.
 *
 * NOTE: ^ / $ are string anchors here (no 'm' flag). [\s\S]* allows multi-line values.
 * @example
 * pass:[text]
 * pass:a[{a} {b} {c}]
 */
export const AttributeEntryPassMacroRx =
  /^pass:([a-z]+(?:,[a-z-]+)*)?\[([\s\S]*)\]$/

/**
 * Matches an inline attribute reference.
 * @example
 * {foobar}
 * {counter:sequence-name:1}
 * {set:foo:bar}
 */
export const AttributeReferenceRx = ru(
  String.raw`(\\)?\{(${CG_WORD}[${CC_WORD}\-]*|(set|counter2?):.*?)(\\)?\}`
)

// ── Paragraphs and delimited blocks ──────────────────────────────────────────

/**
 * Matches an anchor (id + optional reference text) on a line above a block.
 * @example
 * [[idname]]
 * [[idname,Reference Text]]
 */
export const BlockAnchorRx = ru(
  String.raw`^\[\[(?:|([${CC_ALPHA}_:][${CC_WORD}\-:.]*)(?:, *(.+))?)\]\]$`
)

/**
 * Matches an attribute list above a block element.
 * @example
 * [quote, Adam Smith, Wealth of Nations]
 * [{lead}]
 */
export const BlockAttributeListRx = ru(
  String.raw`^\[(|[${CC_WORD}.#%{,"'].*)\]$`
)

/** Combined pattern matching either a block anchor or a block attribute list. */
export const BlockAttributeLineRx = ru(
  String.raw`^\[(?:|[${CC_WORD}.#%{,"'].*|\[(?:|[${CC_ALPHA}_:][${CC_WORD}\-:.]*(?:, *.+)?)\])\]$`
)

/**
 * Matches a title above a block.
 * @example
 * .Title goes here
 */
export const BlockTitleRx = /^\.(\.?[^ \t.].*)$/

/**
 * Matches an admonition label at the start of a paragraph.
 * @example
 * NOTE: Just a little note.
 * TIP: Don't forget!
 */
export const AdmonitionParagraphRx =
  /^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):[ \t]+/

/**
 * Matches a literal paragraph (line preceded by at least one space or tab).
 * @example
 * <SPACE>Foo
 * <TAB>Foo
 */
export const LiteralParagraphRx = /^([ \t]+.*)$/

// ── Section titles ────────────────────────────────────────────────────────────

/**
 * Matches an Atx (single-line) section title.
 * @example
 * == Foo
 * == Foo ==
 */
export const AtxSectionTitleRx = /^(=={0,5})[ \t]+(.+?)(?:[ \t]+\1)?$/

/** Extended Atx section title supporting the Markdown variant (#). */
export const ExtAtxSectionTitleRx =
  /^(=={0,5}|##{0,5})[ \t]+(.+?)(?:[ \t]+\1)?$/

/**
 * Matches the first line of a Setext (two-line) section title.
 * Must not start with '.' and must contain at least one alphanumeric character.
 */
export const SetextSectionTitleRx = ru(String.raw`^((?!\.).*?${CG_ALNUM}.*)$`)

/**
 * Matches an anchor inside a section title.
 * @example
 * Section Title [[idname]]
 * Section Title [[idname,Reference Text]]
 */
export const InlineSectionAnchorRx = ru(
  String.raw` (\\)?\[\[([${CC_ALPHA}_:][${CC_WORD}\-:.]*)(?:, *(.+?))?\]\]$`
)

/**
 * Matches invalid ID characters in a section title.
 * NOTE: Uppercase excluded; expression is run only on a lowercase string.
 */
export const InvalidSectionIdCharsRx = ru(
  String.raw`<[^>]+>|&(?:[a-z][a-z]+\d{0,2}|#\d\d\d{0,4}|#x[\da-f][\da-f][\da-f]{0,3});|[^ ${CC_WORD}\-.]+?`
)

/** Matches an explicit section level style like sect1. */
export const SectionLevelStyleRx = /^sect\d$/

// ── Lists ─────────────────────────────────────────────────────────────────────

/**
 * Detects the start of any list item.
 *
 * NOTE: Check only up to the blank character since non-whitespace follows.
 * IMPORTANT: Must agree with the per-list-type regexps or the parser will hang.
 */
export const AnyListRx =
  /^(?:[ \t]*(?:-|\*\**|\.\.*|\u2022|\d+\.|[a-zA-Z]\.|[IVXivx]+\))[ \t]|(?!\/\/[^/])[ \t]*[^ \t].*?(?::::{0,2}|;;)(?:$|[ \t])|<(?:\d+|\.)>[ \t])/

/**
 * Matches an unordered list item.
 * @example
 * * Foo
 * - Foo
 */
export const UnorderedListRx = /^[ \t]*(-|\*\**|\u2022)[ \t]+([\s\S]*)$/

/**
 * Matches an ordered list item.
 * @example
 * . Foo    1. Foo    a. Foo    I. Foo
 */
export const OrderedListRx =
  /^[ \t]*(\.\.*|\d+\.|[a-zA-Z]\.|[IVXivx]+\))[ \t]+([\s\S]*)$/

/** Ordinal pattern for each ordered list type. */
export const OrderedListMarkerRxMap = {
  arabic: /\d+\./,
  loweralpha: /[a-z]\./,
  lowerroman: /[ivx]+\)/,
  upperalpha: /[A-Z]\./,
  upperroman: /[IVX]+\)/,
}

/**
 * Matches a description list entry.
 * @example
 * foo::
 * foo:: The metasyntactic variable …
 */
export const DescriptionListRx =
  /^(?!\/\/[^/])[ \t]*([^ \t].*?)(:::{0,2}|;;)(?:$|[ \t]+([\s\S]*)$)/

/** Matches a sibling description list item (excluding the delimiter given by key). */
export const DescriptionListSiblingRx = {
  '::': /^(?!\/\/[^/])[ \t]*([^ \t].*?[^:]|[^ \t:])(::)(?:$|[ \t]+([\s\S]*)$)/,
  ':::':
    /^(?!\/\/[^/])[ \t]*([^ \t].*?[^:]|[^ \t:])(:::)(?:$|[ \t]+([\s\S]*)$)/,
  '::::':
    /^(?!\/\/[^/])[ \t]*([^ \t].*?[^:]|[^ \t:])(::::)(?:$|[ \t]+([\s\S]*)$)/,
  ';;': /^(?!\/\/[^/])[ \t]*([^ \t].*?)(;;)(?:$|[ \t]+([\s\S]*)$)/,
}

/**
 * Matches a callout list item.
 * @example
 * <1> Explanation
 * <.> Explanation with automatic number
 */
export const CalloutListRx = /^<(\d+|\.)>[ \t]+([\s\S]*)$/

/**
 * Matches a callout reference inside literal text (applied line-by-line).
 *
 * Group layout:
 *   1 – optional line-comment prefix (//  #  --  ;;)
 *   2 – backslash escape
 *   3 – optional XML comment delimiter (--)
 *   4 – callout number or dot
 */
export const CalloutExtractRx =
  /((?:\/\/|#|--|;;) ?)?(\\)?<!?(|--)(\d+|\.)\3>(?=(?: ?\\?<!?\3(?:\d+|\.)\3>)*$)/m

/**
 * Template string for CalloutExtractRxMap entries.
 * Runtime value: (\\)?<()(\d+|\.)>(?=(?: ?\\?<(?:\d+|\.)>)*$)
 * Note: 'm' flag added so $ matches end-of-line (Ruby regex default behaviour).
 */
export const CalloutExtractRxt =
  '(\\\\)?<()([\\d]+|\\.)>(?=(?: ?\\\\?<(?:\\d+|\\.)>)*$)'

/**
 * Lazy map: line-comment string → callout-extract regex.
 * Mirrors Ruby: Hash.new { |h,k| h[k] = /(prefix)?#{CalloutExtractRxt}/ }
 */
export const CalloutExtractRxMap = makeLazyRxMap((key) => {
  const prefix = key ? `(${escapeRegex(key)} ?)?` : '()?'
  return new RegExp(`${prefix}${CalloutExtractRxt}`, 'm')
})

/** Matches a callout reference when scanning source (special chars NOT yet replaced). */
export const CalloutScanRx =
  /\\?<!?(|--)(\d+|\.)\1>(?=(?: ?\\?<!?\1(?:\d+|\.)\1>)*$)/m

/**
 * Matches a callout reference in HTML output (special chars already replaced).
 *
 * Group layout mirrors CalloutExtractRx.
 * Note: 'm' flag so $ matches end-of-line, matching Ruby regex semantics.
 */
export const CalloutSourceRx =
  /((?:\/\/|#|--|;;) ?)?(\\)?&lt;!?(|--)(\d+|\.)\3&gt;(?=(?: ?\\?&lt;!?\3(?:\d+|\.)\3&gt;)*$)/m

/**
 * Template string for CalloutSourceRxMap entries.
 * Runtime value: (\\)?&lt;()(\d+|\.)&gt;(?=(?: ?\\?&lt;(?:\d+|\.)&gt;)*$)
 */
export const CalloutSourceRxt =
  '(\\\\)?&lt;()([\\d]+|\\.)&gt;(?=(?: ?\\\\?&lt;(?:\\d+|\\.)&gt;)*$)'

/** Lazy map: line-comment string → callout-source regex. */
export const CalloutSourceRxMap = makeLazyRxMap((key) => {
  const prefix = key ? `(${escapeRegex(key)} ?)?` : '()?'
  return new RegExp(`${prefix}${CalloutSourceRxt}`, 'm')
})

/** Dynamic map from list context to its regex. */
export const ListRxMap = {
  ulist: UnorderedListRx,
  olist: OrderedListRx,
  dlist: DescriptionListRx,
  colist: CalloutListRx,
}

// ── Tables ────────────────────────────────────────────────────────────────────

/**
 * Parses the column spec (colspec) for a table.
 * @example
 * 1*h,2*,^3e
 */
export const ColumnSpecRx =
  /^(?:(\d+)\*)?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?(\d+%?|~)?([a-z])?$/

/**
 * Parses the start of a cell spec.
 * @example
 * 2.3+<.>m
 */
export const CellSpecStartRx =
  /^[ \t]*(?:(\d+(?:\.\d*)?|(?:\d*\.)?\d+)([*+]))?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?([a-z])?$/

/** Parses the end of a cell spec. */
export const CellSpecEndRx =
  /[ \t]+(?:(\d+(?:\.\d*)?|(?:\d*\.)?\d+)([*+]))?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?([a-z])?$/

// ── Block macros ──────────────────────────────────────────────────────────────

/**
 * Matches the custom block macro pattern.
 * @example
 * gist::123456[]
 */
export const CustomBlockMacroRx = ru(
  String.raw`^(${CG_WORD}[${CC_WORD}\-]*)::(|\S|\S.*?\S)\[(.+)?\]$`
)

/**
 * Matches an image, video or audio block macro.
 * @example
 * image::filename.png[Caption]
 * video::http://youtube.com/12345[Cats vs Dogs]
 */
export const BlockMediaMacroRx = /^(image|video|audio)::(\S|\S.*?\S)\[(.+)?\]$/

/**
 * Matches the TOC block macro.
 * @example
 * toc::[]
 * toc::[levels=2]
 */
export const BlockTocMacroRx = /^toc::\[(.+)?\]$/

// ── Inline macros ─────────────────────────────────────────────────────────────

/**
 * Matches an anchor (id + optional reference text) in the flow of text.
 *
 * Group layout:
 *   1 – backslash escape
 *   2 – id  (double-bracket form)
 *   3 – reftext  (double-bracket form)
 *   4 – id  (anchor: macro form)
 *   5 – reftext  (anchor: macro form)
 * @example
 * [[idname]]
 * [[idname,Reference Text]]
 * anchor:idname[]
 * anchor:idname[Reference Text]
 */
export const InlineAnchorRx = ru(
  String.raw`(\\)?(?:\[\[([${CC_ALPHA}_:][${CC_WORD}\-:.]*)(?:, *(.+?))? ?\]\]` +
    String.raw`|anchor:([${CC_ALPHA}_:][${CC_WORD}\-:.]*)\[(?:\]|([\s\S]*?[^\\])\]))`
)

/** Scans for a non-escaped anchor in the flow of text. */
export const InlineAnchorScanRx = ru(
  String.raw`(?:^|[^\\\[])\[\[([${CC_ALPHA}_:][${CC_WORD}\-:.]*)(?:, *(.+?))? ?\]\]` +
    String.raw`|(?:^|[^\\])anchor:([${CC_ALPHA}_:][${CC_WORD}\-:.]*)\[(?:\]|(.*?[^\\])\])`
)

/** Scans for a leading, non-escaped anchor. */
export const LeadingInlineAnchorRx = ru(
  String.raw`^\[\[([${CC_ALPHA}_:][${CC_WORD}\-:.]*)(?:, *(.+?))?\]\]`
)

/**
 * Matches a bibliography anchor at the start of a list item.
 * @example
 * [[[Fowler_1997]]] Fowler M. ...
 */
export const InlineBiblioAnchorRx = ru(
  String.raw`^\[\[\[([${CC_ALPHA}_:][${CC_WORD}\-:.]*)(?:, *(.+?))?\]\]\]`
)

/**
 * Matches an inline e-mail address.
 * @example
 * doc.writer@example.com
 */
export const InlineEmailRx = ru(
  String.raw`([\\>:/])?${CG_WORD}(?:&amp;|[${CC_WORD}\-.%+])*` +
    String.raw`@${CG_ALNUM}[${CC_ALNUM}_\-.]*\.[a-zA-Z]{2,5}\b`
)

/**
 * Matches an inline footnote macro (may span multiple lines).
 *
 * NOTE: [\s\S]*? allows multiline content (Ruby /m + CC_ALL).
 * NOTE: (?!</a>) avoids matching inside an anchor tag.
 * @example
 * footnote:[text]
 * footnote:id[text]
 * footnoteref:[id,text]  (legacy)
 */
export const InlineFootnoteMacroRx = ru(
  String.raw`\\?footnote(?:(ref):|:([${CC_WORD}\-]+)?)\[(?:|([\s\S]*?[^\\]))\](?!</a>)`
)

/**
 * Matches an image or icon inline macro (may span multiple lines).
 * @example
 * image:filename.png[Alt Text]
 * icon:github[large]
 */
export const InlineImageMacroRx =
  /\\?i(?:mage|con):([^:\s[](?:[^\n[]*[^\s[])?)\[(|[\s\S]*?[^\\])\]/

/**
 * Matches an indexterm inline macro (may span multiple lines).
 * @example
 * indexterm:[Tigers,Big cats]
 * (((Tigers,Big cats)))
 * ((Tigers))
 */
export const InlineIndextermMacroRx =
  /\\?(?:(indexterm2?):\[([\s\S]*?[^\\])\]|\(\(([\s\S]+?)\)\)(?!\)))/

/**
 * Matches either the kbd or btn inline macro (may span multiple lines).
 * @example
 * kbd:[F3]     kbd:[Ctrl+Shift+T]     btn:[Save]
 */
export const InlineKbdBtnMacroRx = /(\\)?(kbd|btn):\[([\s\S]*?[^\\])\]/

/**
 * Matches an implicit link and the link inline macro.
 *
 * NOTE: This is the Opal/JS variant of the pattern.
 *   Group 2 captures ':' inside a lookahead from the &lt;<protocol> branch.
 *   (?!\2) then guards the &gt;-terminated branch: when group 2 IS ':',
 *   the guard prevents matching '://' at the start of the path; when group 2
 *   is UNSET (other prefix branches), (?!\2) expands to (?!"") which ALWAYS
 *   FAILS – correctly preventing the &gt; branch for non-&lt; prefixes.
 *
 * *** NO 'u' FLAG: the (?!\2) guard relies on unset back-references matching
 *     the empty string, which only holds in non-Unicode mode. ***
 *
 * Group layout:
 *   1 – prefix (^, link:, blank, \\?&lt; or punctuation)
 *   2 – ':' captured by lookahead  (only when prefix is \\?&lt;)
 *   3 – URL scheme + ://
 *   4 – target before [   (formal macro)
 *   5 – attrlist           (formal macro, may be empty)
 *   6 – target before &gt; (angle-bracket autolink, requires &lt; prefix)
 *   7 – target             (bare autolink)
 *   8 – last non-terminating char of bare target
 * @example
 * https://github.com
 * https://github.com[GitHub]
 * <https://github.com>
 * link:https://github.com[]
 */
export const InlineLinkRx =
  /(^|link:|[ \t\u00a0]|\\?&lt;(?=\\?(?:https?|file|ftp|irc)(:))|[>()[\];"'])(\\?(?:https?|file|ftp|irc):\/\/)(?:([^\s[\]]+)\[(|[\s\S]*?[^\\])\]|(?!\2)([^\s]+?)&gt;|([^\s[\]<]*([^\s,.?![\]<)])))/m

/**
 * Matches a link or e-mail inline macro (may span multiple lines).
 * @example
 * link:path[label]
 * mailto:doc.writer@example.com[]
 */
export const InlineLinkMacroRx =
  /\\?(?:link|(mailto)):(|[^:\s[][^\s[]*)\[(|[\s\S]*?[^\\])\]/

/** Matches the name of a macro. */
export const MacroNameRx = ru(String.raw`^${CG_WORD}[${CC_WORD}\-]*$`)

/**
 * Matches a stem (and alternatives) inline macro (may span multiple lines).
 * @example
 * stem:[x != 0]
 * latexmath:[\sqrt{4} = 2]
 */
export const InlineStemMacroRx =
  /\\?(stem|(?:latex|ascii)math):([a-z]+(?:,[a-z-]+)*)?\[([\s\S]*?[^\\])\]/

/**
 * Matches a menu inline macro (may span multiple lines).
 * @example
 * menu:File[Save As...]
 * menu:View[Page Style > No Style]
 */
export const InlineMenuMacroRx = ru(
  String.raw`\\?menu:(${CG_WORD}|[${CC_WORD}&][^\n\[]*[^\s\[])` +
    String.raw`\[ *(?:|([\s\S]*?[^\\]))\]`
)

/**
 * Matches an implicit menu inline macro.
 * @example
 * "File > New..."
 */
export const InlineMenuRx = ru(
  String.raw`\\?"([${CC_WORD}&][^"]*?[ \n]+&gt;[ \n]+[^"]*)"`
)

/**
 * Matches an inline passthrough (may span multiple lines).
 *
 * Group layout (false / non-compat):
 *   1 – preceding context or escape boundary
 *   2 – '[' captured by lookahead (back-reference trick for attribute list detection)
 *   3 – x- / 'attrlist x-' content
 *   4 – QuoteAttributeListRxt content
 *   5 – optional backslash before opening delimiter
 *   6 – full quoted span (including delimiters)
 *   7 – opening/closing delimiter (+ or `)
 *   8 – span content
 *
 * Group layout (true / compat):
 *   1 – preceding char or start-of-line
 *   2 – ($) end-of-string sentinel  (never matches in inline text, preserves group count)
 *   3 – empty group paired with sentinel
 *   4 – QuoteAttributeListRxt content
 *   5 – optional backslash before opening delimiter
 *   6 – full quoted span
 *   7 – opening/closing delimiter (`)
 *   8 – span content
 *
 * NOTE: 'u' flag used, but the 'm' flag is also set so that ^ is a line anchor.
 *   Unset optional back-references (\5?) with 'u' flag: the '?' quantifier
 *   allows 0 occurrences, so the match continues even when the group is unset.
 * @example
 * +text+
 * [x-]+text+
 * `text`  (compat only)
 */
export const InlinePassRx = {
  false: [
    '+',
    '-]',
    ru(
      String.raw`((?:^|[^${CC_WORD};:\\])(?=(\[)|\+)|\\(?=\[)|(?=\\\+))` +
        String.raw`(?:\2(x-|[^\[\]]+ x-)\]|(?:` +
        QuoteAttributeListRxt +
        String.raw`)?(?=(\\)?\+))` +
        String.raw`(\5?(\+|` +
        '`' +
        String.raw`)(\S|\S` +
        CC_ALL +
        String.raw`*?\S)\7)(?!${CG_WORD})`,
      'm'
    ),
  ],
  true: [
    '`',
    null,
    ru(
      String.raw`(^|[^` +
        '`' +
        String.raw`${CC_WORD}])(?:($)()|(?:` +
        QuoteAttributeListRxt +
        String.raw`)(?=(\\?)))?` +
        String.raw`(\5?(` +
        '`' +
        String.raw`)([^` +
        '`' +
        String.raw`\s]|[^` +
        '`' +
        String.raw`\s]` +
        CC_ALL +
        String.raw`*?\S)\7)(?![` +
        '`' +
        String.raw`${CC_WORD}])`,
      'm'
    ),
  ],
}

/**
 * Matches several variants of the passthrough inline macro (may span multiple lines).
 *
 * Group layout:
 *   1 – optional backslash before attribute list
 *   2 – attribute list content  (QuoteAttributeListRxt)
 *   3 – backslash(es) before delimiter  (0–2)
 *   4 – delimiter: +++, ++, or $$
 *   5 – content between delimiters  (\4 closes)
 *   6 – backslash before pass: macro
 *   7 – subs list after pass:
 *   8 – content inside pass:[…]
 * @example
 * +++text+++
 * $$text$$
 * pass:quotes[text]
 * pass:[]
 */
export const InlinePassMacroRx = new RegExp(
  `(?:(?:(\\\\?)${QuoteAttributeListRxt})?(\\\\{0,2})(\\+\\+\\+?|\\$\\$)([\\s\\S]*?)\\4|(\\\\?)pass:([a-z]+(?:,[a-z-]+)*)?\\[(|[\\s\\S]*?[^\\\\])\\])`
)

/**
 * Matches an xref (cross-reference) inline macro (may span multiple lines).
 *
 * NOTE: { included to support targets beginning with an attribute reference.
 * NOTE: Special characters are already entity-encoded in the matched text.
 *
 * Group layout:
 *   1 – target of <<…>> form
 *   2 – target of xref:…[] form
 *   3 – link text inside xref:…[…]
 * @example
 * <<id,reftext>>
 * xref:id[reftext]
 */
export const InlineXrefMacroRx = ru(
  String.raw`\\?(?:&lt;&lt;([${CC_WORD}#/.:{]` +
    CC_ALL +
    String.raw`*?)&gt;&gt;` +
    String.raw`|xref:([${CC_WORD}#/.:{]` +
    CC_ALL +
    String.raw`*?)\[(?:\]|(` +
    CC_ALL +
    String.raw`*?[^\\])\]))`
)

// ── Layout ────────────────────────────────────────────────────────────────────

/**
 * Matches a trailing + preceded by at least one space, forcing a hard line break.
 *
 * NOTE: 'm' flag required so that ^ / $ are line anchors (not string anchors) in JS.
 * @example
 * Humpty Dumpty sat on a wall, +
 * Humpty Dumpty had a great fall.
 */
export const HardLineBreakRx = /^(.*) \+$/m

/**
 * Matches a Markdown horizontal rule.
 * @example
 * --- or - - -
 * *** or * * *
 * ___ or _ _ _
 */
export const MarkdownThematicBreakRx = /^ {0,3}([-*_])( *)\1\2\1$/

/**
 * Matches an AsciiDoc or Markdown horizontal rule, or an AsciiDoc page break.
 * @example
 * '''  <<<  ---  ***  ___
 */
export const ExtLayoutBreakRx = /^(?:'{3,}|<{3,}|([-*_])( *)\1\2\1)$/

// ── General ───────────────────────────────────────────────────────────────────

/** Matches consecutive blank lines. */
export const BlankLineRx = /\n{2,}/

/**
 * Matches whitespace escaped by a backslash.
 * @example
 * three\ blind\ mice
 */
export const EscapedSpaceRx = /\\([ \t\n])/g

/** Detects text that may contain replaceable characters. */
export const ReplaceableTextRx = /[&']|--|\.\.\.|\([CRT]M?\)/

/**
 * Matches a whitespace delimiter (space, tab, newline).
 * Replicates the parsing rules of Ruby %w strings.
 *
 * TODO: Replace with /(?<!\\)[ \t\n]+/ when lookbehind is universally available.
 */
export const SpaceDelimiterRx = /([^\\])[ \t\n]+/g

/** Matches a + or - modifier in a subs list. */
export const SubModifierSniffRx = /[+-]/

/**
 * Matches one or more consecutive digits at the end of a line.
 * @example
 * docbook5   html5
 */
export const TrailingDigitsRx = /\d+$/

/**
 * Detects strings that resemble URIs.
 *
 * NOTE: ^ is used as a string-start anchor (no 'm' flag), equivalent to Ruby \A.
 * NOTE: Does NOT match Windows paths like c:/sample.adoc or c:\sample.adoc.
 * @example
 * http://domain    https://domain    file:///path    data:info
 */
export const UriSniffRx = ru(String.raw`^${CG_ALPHA}[${CC_ALNUM}.+\-]+:\/{0,2}`)

/** Detects XML tags. */
export const XmlSanitizeRx = /<[^>]+>/
