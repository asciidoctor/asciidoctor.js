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
