/**
 * Maps block context strings to their default content model.
 * Any context not listed defaults to 'simple'.
 * @type {Object<string, string>}
 */
export const DEFAULT_CONTENT_MODEL: {
    [x: string]: string;
};
/**
 * Methods for managing AsciiDoc content blocks.
 */
export class Block extends AbstractBlock<string> {
    /**
     * Factory method — mirrors the core Block.create(parent, context, opts) API.
     * @param {AbstractBlock} parent
     * @param {string} context
     * @param {Object} [opts={}]
     * @returns {Block}
     */
    static create(parent: AbstractBlock, context: string, opts?: any): Block;
    /**
     * Initialize an Asciidoctor::Block object.
     * @param {AbstractBlock} parent - The parent AbstractBlock.
     * @param {string} context - The context name (e.g. 'paragraph', 'listing').
     * @param {Object} [opts={}]
     * @param {'compound'|'simple'|'verbatim'|'raw'|'empty'} [opts.content_model] - Defaults to lookup from DEFAULT_CONTENT_MODEL.
     * @param {Object} [opts.attributes] - Attributes to merge in.
     * @param {string|string[]} [opts.source] - Raw source string or lines.
     * @param {'default'|string[]|string|null} [opts.subs]
     * @param {string[]} [opts.default_subs] - Override for default subs (used with subs: 'default').
     */
    constructor(parent: AbstractBlock, context: string, opts?: {
        content_model?: "compound" | "simple" | "verbatim" | "raw" | "empty";
        attributes?: any;
        source?: string | string[];
        subs?: "default" | string[] | string | null;
        default_subs?: string[];
    });
    defaultSubs: any[];
    lines: any[];
    /** @returns {string} Alias for context — consistent with AsciiDoc terminology. */
    get blockname(): string;
    /** @returns {string[]} The source lines for this block (matches the core API). */
    getSourceLines(): string[];
    /** @returns {string} The preprocessed source of this block as a single String. */
    get source(): string;
    /** @returns {string} The source as a single String (alias for the source getter). */
    getSource(): string;
}
import { AbstractBlock } from './abstract_block.js';
