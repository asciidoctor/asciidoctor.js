export default class ManPageConverter extends ConverterBase {
    static writeAlternatePages(mannames: any, manvolnum: any, target: any): Promise<void>;
    convert_document(node: any): Promise<string>;
    convert_embedded(node: any): Promise<string>;
    convert_section(node: any): Promise<string>;
    convert_admonition(node: any): Promise<string>;
    convert_colist(node: any): Promise<string>;
    convert_dlist(node: any): Promise<string>;
    convert_example(node: any): Promise<string>;
    convert_floating_title(node: any): Promise<string>;
    convert_image(node: any): Promise<string>;
    convert_listing(node: any): Promise<string>;
    convert_literal(node: any): Promise<string>;
    convert_sidebar(node: any): Promise<string>;
    convert_olist(node: any): Promise<string>;
    convert_open(node: any): Promise<any>;
    convert_page_break(_node: any): Promise<string>;
    convert_paragraph(node: any): Promise<string>;
    convert_pass(node: any): Promise<string>;
    convert_preamble(node: any): Promise<string>;
    convert_quote(node: any): Promise<string>;
    convert_stem(node: any): Promise<string>;
    convert_table(node: any): Promise<string>;
    convert_thematic_break(_node: any): Promise<string>;
    convert_toc(_node: any): Promise<void>;
    convert_ulist(node: any): Promise<string>;
    convert_verse(node: any): Promise<string>;
    convert_video(node: any): Promise<string>;
    convert_inline_anchor(node: any): Promise<any>;
    convert_inline_break(node: any): Promise<string>;
    convert_inline_button(node: any): Promise<string>;
    convert_inline_callout(node: any): Promise<string>;
    convert_inline_footnote(node: any): Promise<string>;
    convert_inline_image(node: any): Promise<string>;
    convert_inline_indexterm(node: any): Promise<any>;
    convert_inline_kbd(node: any): Promise<string>;
    convert_inline_menu(node: any): Promise<string>;
    convert_inline_quoted(node: any): Promise<any>;
    /**
     * Converts HTML entity references back to their original form, escapes
     * special man characters and strips trailing whitespace.
     *
     * It's crucial that text only ever pass through manify once.
     *
     * @param {string} str - the string to convert
     * @param {Object} [opts={}] - options to control processing
     * @param {'preserve'|'normalize'|'collapse'} [opts.whitespace='collapse'] - how to handle whitespace:
     *   `'preserve'` preserves spaces (only expanding tabs);
     *   `'normalize'` removes spaces around newlines;
     *   `'collapse'` collapses adjacent whitespace to a single space
     * @param {boolean} [opts.append_newline=false] - append a newline to the result
     * @returns {string} the manified string
     */
    manify(str: string, opts?: {
        whitespace?: "preserve" | "normalize" | "collapse";
        append_newline?: boolean;
    }): string;
}
import { ConverterBase } from '../converter.js';
