// ESM conversion of the Compliance module (defined inside asciidoctor.rb).
//
// Ruby-to-JavaScript notes:
//   - The Ruby module uses dynamic attr_accessor generation via `define`.
//     In JS each flag is a plain enumerable property on the exported object.
//   - The `keys` Set is retained so callers can enumerate all known flags
//     (used e.g. by the options-merging code in Document).
//   - All default values match the Asciidoctor defaults (not the "AsciiDoc
//     compliance values" documented in comments — those differ intentionally).

export const Compliance = {
  keys: new Set([
    'blockTerminatesParagraph',
    'strictVerbatimParagraphs',
    'underlineStyleSectionTitles',
    'unwrapStandalonePreamble',
    'attributeMissing',
    'attributeUndefined',
    'shorthandPropertySyntax',
    'naturalXrefs',
    'uniqueIdStartIndex',
    'markdownSyntax',
  ]),

  // AsciiDoc terminates paragraphs adjacent to block content (delimiter or
  // block attribute list). Compliance value: true
  blockTerminatesParagraph: true,

  // AsciiDoc does not parse paragraphs with a verbatim style as verbatim
  // content. Compliance value: false (Asciidoctor default: true)
  strictVerbatimParagraphs: true,

  // AsciiDoc supports both atx (single-line) and setext (underlined) section
  // titles. Compliance value: true
  underlineStyleSectionTitles: true,

  // Asciidoctor will unwrap the content in a preamble if the document has a
  // title and no sections. Compliance value: false (Asciidoctor default: true)
  unwrapStandalonePreamble: true,

  // AsciiDoc drops lines that contain references to missing attributes.
  // Possible values: 'skip', 'drop', 'drop-line', 'warn'.
  // Compliance value: 'drop-line' (Asciidoctor default: 'skip')
  attributeMissing: 'skip',

  // AsciiDoc drops lines that contain an attribute unassignment.
  // Compliance value: 'drop-line'
  attributeUndefined: 'drop-line',

  // Shorthand syntax for id, role and options on blocks (e.g. #id.role%opt).
  // Compliance value: false (Asciidoctor default: true)
  shorthandPropertySyntax: true,

  // Resolve cross-reference targets by matching reftext or title.
  // Compliance value: false (Asciidoctor default: true)
  naturalXrefs: true,

  // Starting counter when generating a unique id on conflict.
  // Compliance value: 2
  uniqueIdStartIndex: 2,

  // Recognize commonly-used Markdown syntax where it does not conflict.
  // Compliance value: false (Asciidoctor default: true)
  markdownSyntax: true,
}
