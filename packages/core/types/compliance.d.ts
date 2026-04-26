export namespace Compliance {
    let keys: Set<string>;
    /** AsciiDoc terminates paragraphs adjacent to block content (delimiter or block attribute list). Compliance value: true */
    let blockTerminatesParagraph: boolean;
    /** AsciiDoc does not parse paragraphs with a verbatim style as verbatim content. Compliance value: false (Asciidoctor default: true) */
    let strictVerbatimParagraphs: boolean;
    /** AsciiDoc supports both atx (single-line) and setext (underlined) section titles. Compliance value: true */
    let underlineStyleSectionTitles: boolean;
    /** Asciidoctor will unwrap the content in a preamble if the document has a title and no sections. Compliance value: false (Asciidoctor default: true) */
    let unwrapStandalonePreamble: boolean;
    /** AsciiDoc drops lines that contain references to missing attributes. Possible values: 'skip', 'drop', 'drop-line', 'warn'. Compliance value: 'drop-line' (Asciidoctor default: 'skip') */
    let attributeMissing: string;
    /** AsciiDoc drops lines that contain an attribute unassignment. Compliance value: 'drop-line' */
    let attributeUndefined: string;
    /** Shorthand syntax for id, role and options on blocks (e.g. #id.role%opt). Compliance value: false (Asciidoctor default: true) */
    let shorthandPropertySyntax: boolean;
    /** Resolve cross-reference targets by matching reftext or title. Compliance value: false (Asciidoctor default: true) */
    let naturalXrefs: boolean;
    /** Starting counter when generating a unique id on conflict. Compliance value: 2 */
    let uniqueIdStartIndex: number;
    /** Recognize commonly-used Markdown syntax where it does not conflict. Compliance value: false (Asciidoctor default: true) */
    let markdownSyntax: boolean;
}
