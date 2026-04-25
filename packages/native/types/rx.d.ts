export const CC_ALL: "[\\s\\S]";
export const CC_ANY: ".";
export const CC_EOL: "$";
export const CC_ALPHA: "\\p{Alphabetic}";
export const CG_ALPHA: "\\p{Alphabetic}";
export const CC_ALNUM: "\\p{Alphabetic}\\p{N}";
export const CG_ALNUM: "[\\p{Alphabetic}\\p{N}]";
export const CC_WORD: "\\p{Alphabetic}\\p{N}\\p{Pc}";
export const CG_WORD: "[\\p{Alphabetic}\\p{N}\\p{Pc}]";
export const CG_BLANK: "[\\p{Zs}\\t]";
export const QuoteAttributeListRxt: "\\[([^\\[\\]]+)\\]";
/**
 * Matches the author info line immediately following the document title.
 * @example
 * Doc Writer <doc@example.com>
 * Mary_Sue Brontë
 */
export const AuthorInfoLineRx: RegExp;
/**
 * Matches the delimiter that separates multiple authors.
 * @example
 * Doc Writer; Junior Writer
 */
export const AuthorDelimiterRx: RegExp;
/**
 * Matches the revision info line immediately following the author info line.
 * @example
 * v1.0
 * 2013-01-01
 * v1.0, 2013-01-01: Ring in the new year release
 */
export const RevisionInfoLineRx: RegExp;
/**
 * Matches the title and volnum in the manpage doctype.
 * @example
 * = asciidoctor(1)
 * = asciidoctor ( 1 )
 */
export const ManpageTitleVolnumRx: RegExp;
/**
 * Matches the name and purpose in the manpage doctype.
 * @example
 * asciidoctor - converts AsciiDoc source files to HTML, DocBook and other formats
 */
export const ManpageNamePurposeRx: RegExp;
/**
 * Matches a conditional preprocessor directive (ifdef, ifndef, ifeval, endif).
 * @example
 * ifdef::basebackend-html[]
 * ifeval::["{asciidoctor-version}" >= "0.1.0"]
 * endif::[]
 */
export const ConditionalDirectiveRx: RegExp;
/**
 * Matches a restricted (safe) eval expression.
 * @example
 * "{asciidoctor-version}" >= "0.1.0"
 */
export const EvalExpressionRx: RegExp;
/**
 * Matches an include preprocessor directive.
 * @example
 * include::chapter1.ad[]
 * include::example.txt[lines=1;2;5..10]
 */
export const IncludeDirectiveRx: RegExp;
/**
 * Matches a trailing tag directive in an include file.
 *
 * NOTE: 'm' flag required so that $ matches end-of-line (not only end-of-string) in JS.
 * NOTE: accounts for \r in Windows line endings.
 * @example
 * // tag::try-catch[]
 * // end::try-catch[]
 */
export const TagDirectiveRx: RegExp;
/**
 * Matches a document attribute entry.
 * @example
 * :foo: bar
 * :First Name: Dan
 * :sectnums!:
 */
export const AttributeEntryRx: RegExp;
/** Matches invalid characters in an attribute name. */
export const InvalidAttributeNameCharsRx: RegExp;
/**
 * Matches a pass inline macro surrounding an attribute entry value.
 *
 * NOTE: ^ / $ are string anchors here (no 'm' flag). [\s\S]* allows multi-line values.
 * @example
 * pass:[text]
 * pass:a[{a} {b} {c}]
 */
export const AttributeEntryPassMacroRx: RegExp;
/**
 * Matches an inline attribute reference.
 * @example
 * {foobar}
 * {counter:sequence-name:1}
 * {set:foo:bar}
 */
export const AttributeReferenceRx: RegExp;
/**
 * Matches an anchor (id + optional reference text) on a line above a block.
 * @example
 * [[idname]]
 * [[idname,Reference Text]]
 */
export const BlockAnchorRx: RegExp;
/**
 * Matches an attribute list above a block element.
 * @example
 * [quote, Adam Smith, Wealth of Nations]
 * [{lead}]
 */
export const BlockAttributeListRx: RegExp;
/** Combined pattern matching either a block anchor or a block attribute list. */
export const BlockAttributeLineRx: RegExp;
/**
 * Matches a title above a block.
 * @example
 * .Title goes here
 */
export const BlockTitleRx: RegExp;
/**
 * Matches an admonition label at the start of a paragraph.
 * @example
 * NOTE: Just a little note.
 * TIP: Don't forget!
 */
export const AdmonitionParagraphRx: RegExp;
/**
 * Matches a literal paragraph (line preceded by at least one space or tab).
 * @example
 * <SPACE>Foo
 * <TAB>Foo
 */
export const LiteralParagraphRx: RegExp;
/**
 * Matches an Atx (single-line) section title.
 * @example
 * == Foo
 * == Foo ==
 */
export const AtxSectionTitleRx: RegExp;
/** Extended Atx section title supporting the Markdown variant (#). */
export const ExtAtxSectionTitleRx: RegExp;
/**
 * Matches the first line of a Setext (two-line) section title.
 * Must not start with '.' and must contain at least one alphanumeric character.
 */
export const SetextSectionTitleRx: RegExp;
/**
 * Matches an anchor inside a section title.
 * @example
 * Section Title [[idname]]
 * Section Title [[idname,Reference Text]]
 */
export const InlineSectionAnchorRx: RegExp;
/**
 * Matches invalid ID characters in a section title.
 * NOTE: Uppercase excluded; expression is run only on a lowercase string.
 */
export const InvalidSectionIdCharsRx: RegExp;
/** Matches an explicit section level style like sect1. */
export const SectionLevelStyleRx: RegExp;
/**
 * Detects the start of any list item.
 *
 * NOTE: Check only up to the blank character since non-whitespace follows.
 * IMPORTANT: Must agree with the per-list-type regexps or the parser will hang.
 */
export const AnyListRx: RegExp;
/**
 * Matches an unordered list item.
 * @example
 * * Foo
 * - Foo
 */
export const UnorderedListRx: RegExp;
/**
 * Matches an ordered list item.
 * @example
 * . Foo    1. Foo    a. Foo    I. Foo
 */
export const OrderedListRx: RegExp;
export namespace OrderedListMarkerRxMap {
    let arabic: RegExp;
    let loweralpha: RegExp;
    let lowerroman: RegExp;
    let upperalpha: RegExp;
    let upperroman: RegExp;
}
/**
 * Matches a description list entry.
 * @example
 * foo::
 * foo:: The metasyntactic variable …
 */
export const DescriptionListRx: RegExp;
/** Matches a sibling description list item (excluding the delimiter given by key). */
export const DescriptionListSiblingRx: {
    '::': RegExp;
    ':::': RegExp;
    '::::': RegExp;
    ';;': RegExp;
};
/**
 * Matches a callout list item.
 * @example
 * <1> Explanation
 * <.> Explanation with automatic number
 */
export const CalloutListRx: RegExp;
/**
 * Matches a callout reference inside literal text (applied line-by-line).
 *
 * Group layout:
 *   1 – optional line-comment prefix (//  #  --  ;;)
 *   2 – backslash escape
 *   3 – optional XML comment delimiter (--)
 *   4 – callout number or dot
 */
export const CalloutExtractRx: RegExp;
/**
 * Template string for CalloutExtractRxMap entries.
 * Runtime value: (\\)?<()(\d+|\.)>(?=(?: ?\\?<(?:\d+|\.)>)*$)
 * Note: 'm' flag added so $ matches end-of-line (Ruby regex default behaviour).
 */
export const CalloutExtractRxt: "(\\\\)?<()([\\d]+|\\.)>(?=(?: ?\\\\?<(?:\\d+|\\.)>)*$)";
/**
 * Lazy map: line-comment string → callout-extract regex.
 * Mirrors Ruby: Hash.new { |h,k| h[k] = /(prefix)?#{CalloutExtractRxt}/ }
 */
export const CalloutExtractRxMap: any;
/** Matches a callout reference when scanning source (special chars NOT yet replaced). */
export const CalloutScanRx: RegExp;
/**
 * Matches a callout reference in HTML output (special chars already replaced).
 *
 * Group layout mirrors CalloutExtractRx.
 * Note: 'm' flag so $ matches end-of-line, matching Ruby regex semantics.
 */
export const CalloutSourceRx: RegExp;
/**
 * Template string for CalloutSourceRxMap entries.
 * Runtime value: (\\)?&lt;()(\d+|\.)&gt;(?=(?: ?\\?&lt;(?:\d+|\.)&gt;)*$)
 */
export const CalloutSourceRxt: "(\\\\)?&lt;()([\\d]+|\\.)&gt;(?=(?: ?\\\\?&lt;(?:\\d+|\\.)&gt;)*$)";
/** Lazy map: line-comment string → callout-source regex. */
export const CalloutSourceRxMap: any;
export namespace ListRxMap {
    export { UnorderedListRx as ulist };
    export { OrderedListRx as olist };
    export { DescriptionListRx as dlist };
    export { CalloutListRx as colist };
}
/**
 * Parses the column spec (colspec) for a table.
 * @example
 * 1*h,2*,^3e
 */
export const ColumnSpecRx: RegExp;
/**
 * Parses the start of a cell spec.
 * @example
 * 2.3+<.>m
 */
export const CellSpecStartRx: RegExp;
/** Parses the end of a cell spec. */
export const CellSpecEndRx: RegExp;
/**
 * Matches the custom block macro pattern.
 * @example
 * gist::123456[]
 */
export const CustomBlockMacroRx: RegExp;
/**
 * Matches an image, video or audio block macro.
 * @example
 * image::filename.png[Caption]
 * video::http://youtube.com/12345[Cats vs Dogs]
 */
export const BlockMediaMacroRx: RegExp;
/**
 * Matches the TOC block macro.
 * @example
 * toc::[]
 * toc::[levels=2]
 */
export const BlockTocMacroRx: RegExp;
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
export const InlineAnchorRx: RegExp;
/** Scans for a non-escaped anchor in the flow of text. */
export const InlineAnchorScanRx: RegExp;
/** Scans for a leading, non-escaped anchor. */
export const LeadingInlineAnchorRx: RegExp;
/**
 * Matches a bibliography anchor at the start of a list item.
 * @example
 * [[[Fowler_1997]]] Fowler M. ...
 */
export const InlineBiblioAnchorRx: RegExp;
/**
 * Matches an inline e-mail address.
 * @example
 * doc.writer@example.com
 */
export const InlineEmailRx: RegExp;
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
export const InlineFootnoteMacroRx: RegExp;
/**
 * Matches an image or icon inline macro (may span multiple lines).
 * @example
 * image:filename.png[Alt Text]
 * icon:github[large]
 */
export const InlineImageMacroRx: RegExp;
/**
 * Matches an indexterm inline macro (may span multiple lines).
 * @example
 * indexterm:[Tigers,Big cats]
 * (((Tigers,Big cats)))
 * ((Tigers))
 */
export const InlineIndextermMacroRx: RegExp;
/**
 * Matches either the kbd or btn inline macro (may span multiple lines).
 * @example
 * kbd:[F3]     kbd:[Ctrl+Shift+T]     btn:[Save]
 */
export const InlineKbdBtnMacroRx: RegExp;
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
export const InlineLinkRx: RegExp;
/**
 * Matches a link or e-mail inline macro (may span multiple lines).
 * @example
 * link:path[label]
 * mailto:doc.writer@example.com[]
 */
export const InlineLinkMacroRx: RegExp;
/** Matches the name of a macro. */
export const MacroNameRx: RegExp;
/**
 * Matches a stem (and alternatives) inline macro (may span multiple lines).
 * @example
 * stem:[x != 0]
 * latexmath:[\sqrt{4} = 2]
 */
export const InlineStemMacroRx: RegExp;
/**
 * Matches a menu inline macro (may span multiple lines).
 * @example
 * menu:File[Save As...]
 * menu:View[Page Style > No Style]
 */
export const InlineMenuMacroRx: RegExp;
/**
 * Matches an implicit menu inline macro.
 * @example
 * "File > New..."
 */
export const InlineMenuRx: RegExp;
export namespace InlinePassRx {
    let _false: (string | RegExp)[];
    export { _false as false };
    let _true: (string | RegExp)[];
    export { _true as true };
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
export const InlinePassMacroRx: RegExp;
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
export const InlineXrefMacroRx: RegExp;
/**
 * Matches a trailing + preceded by at least one space, forcing a hard line break.
 *
 * NOTE: 'm' flag required so that ^ / $ are line anchors (not string anchors) in JS.
 * @example
 * Humpty Dumpty sat on a wall, +
 * Humpty Dumpty had a great fall.
 */
export const HardLineBreakRx: RegExp;
/**
 * Matches a Markdown horizontal rule.
 * @example
 * --- or - - -
 * *** or * * *
 * ___ or _ _ _
 */
export const MarkdownThematicBreakRx: RegExp;
/**
 * Matches an AsciiDoc or Markdown horizontal rule, or an AsciiDoc page break.
 * @example
 * '''  <<<  ---  ***  ___
 */
export const ExtLayoutBreakRx: RegExp;
/** Matches consecutive blank lines. */
export const BlankLineRx: RegExp;
/**
 * Matches whitespace escaped by a backslash.
 * @example
 * three\ blind\ mice
 */
export const EscapedSpaceRx: RegExp;
/** Detects text that may contain replaceable characters. */
export const ReplaceableTextRx: RegExp;
/**
 * Matches a whitespace delimiter (space, tab, newline).
 * Replicates the parsing rules of Ruby %w strings.
 *
 * TODO: Replace with /(?<!\\)[ \t\n]+/ when lookbehind is universally available.
 */
export const SpaceDelimiterRx: RegExp;
/** Matches a + or - modifier in a subs list. */
export const SubModifierSniffRx: RegExp;
/**
 * Matches one or more consecutive digits at the end of a line.
 * @example
 * docbook5   html5
 */
export const TrailingDigitsRx: RegExp;
/**
 * Detects strings that resemble URIs.
 *
 * NOTE: ^ is used as a string-start anchor (no 'm' flag), equivalent to Ruby \A.
 * NOTE: Does NOT match Windows paths like c:/sample.adoc or c:\sample.adoc.
 * @example
 * http://domain    https://domain    file:///path    data:info
 */
export const UriSniffRx: RegExp;
/** Detects XML tags. */
export const XmlSanitizeRx: RegExp;
