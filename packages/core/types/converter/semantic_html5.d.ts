/**
 * A built-in converter that generates HTML 5 output maximizing the use of
 * semantic constructs — `<section>`, `<aside>`, `<figure>`, `<nav>`,
 * `<blockquote>`, DPUB-ARIA roles — instead of the AsciiDoc.py-compatible
 * markup produced by the default `html5` backend.
 *
 * Registered for the `semantic-html5` backend:
 *
 * ```js
 * const html = await Asciidoctor.convert(input, { backend: 'semantic-html5' })
 * ```
 *
 * **This converter is experimental.** It is the fast-iteration testbed for the
 * modern HTML output effort started upstream in Asciidoctor's
 * `feature/html-converter-next` branch (see
 * {@link https://github.com/asciidoctor/asciidoctor/issues/242 asciidoctor#242}):
 * shipping it here lets the semantic markup decisions be evaluated against
 * real projects and real stylesheets, and the decisions that prove solid are
 * meant to be ported back to the Ruby implementation. Consequences:
 *
 * - the emitted markup (elements, class names, structure) and the default
 *   stylesheet may change in **any** release, without being treated as
 *   breaking changes — pin an exact version if you depend on the output shape;
 * - it is **not** a candidate to replace the default `html5` backend, and the
 *   `html5` backend's output is not affected in any way;
 * - feedback on the element mapping is welcome on the upstream issue.
 *
 * The scenario fixtures under `test/fixtures/semantic-html5-scenarios/`
 * (shared with the upstream branch) are the source of truth for the emitted
 * markup, and the per-node element mapping and design rationale are documented
 * in `devdocs/semantic-html5-converter.adoc`.
 *
 * @experimental
 */
export default class SemanticHtml5Converter extends ConverterBase {
    /**
     * Create a new SemanticHtml5Converter instance.
     * @param {string} [backend='semantic-html5']
     * @param {Object} [opts={}]
     * @returns {SemanticHtml5Converter}
     */
    static create(backend?: string, opts?: any): SemanticHtml5Converter;
    _xmlMode: boolean;
    _voidSlash: string;
    convert_document(node: any): Promise<string>;
    convert_embedded(node: any): Promise<string>;
    convert_section(node: any): Promise<string>;
    convert_paragraph(node: any): Promise<string>;
    convert_listing(node: any): Promise<string>;
    convert_thematic_break(node: any): Promise<string>;
    convert_page_break(_node: any): Promise<string>;
    convert_admonition(node: any): Promise<string>;
    convert_example(node: any): Promise<string>;
    convert_sidebar(node: any): Promise<string>;
    convert_open(node: any): Promise<string>;
    convert_quote(node: any): Promise<string>;
    convert_verse(node: any): Promise<string>;
    convert_literal(node: any): Promise<string>;
    convert_stem(node: any): Promise<string>;
    convert_pass(node: any): Promise<string>;
    convert_preamble(node: any): Promise<string>;
    convert_floating_title(node: any): Promise<string>;
    convert_ulist(node: any): Promise<any>;
    convert_olist(node: any): Promise<any>;
    convert_dlist(node: any): Promise<any>;
    convert_colist(node: any): Promise<any>;
    convert_table(node: any): Promise<string>;
    convert_toc(node: any): Promise<string>;
    convert_outline(node: any, opts?: {}): Promise<string>;
    convert_video(node: any): Promise<string>;
    convert_audio(node: any): Promise<string>;
    convert_image(node: any): Promise<any>;
    convert_inline_image(node: any): Promise<any>;
    convert_inline_anchor(node: any): Promise<string>;
    convert_inline_callout(node: any): Promise<string>;
    convert_inline_footnote(node: any): Promise<string>;
    convert_inline_indexterm(node: any): Promise<any>;
    convert_inline_kbd(node: any): Promise<string>;
    convert_inline_quoted(node: any): Promise<string>;
    convert_inline_break(node: any): Promise<string>;
    convert_inline_button(node: any): Promise<string>;
    convert_inline_menu(node: any): Promise<string>;
    _generateSectionNumbering(node: any): string;
    _generateHeader(node: any): Promise<string>;
    _generateDocumentTitle(node: any): string;
    _generateAuthors(node: any): Promise<string>;
    _generateRevision(node: any): string;
    _formatAuthor(node: any, author: any): Promise<any>;
    _inContext(name: any, callback: any): Promise<any>;
    readSvgContents: (node: any, target: any) => Promise<any>;
    _decodeDataUri: (target: any) => any;
}
import { ConverterBase } from '../converter.js';
