/**
 * @extends {AbstractBlock<any[]>}
 */
export class List extends AbstractBlock<any[]> {
    constructor(parent: any, context: any, opts?: {});
    /** Alias for blocks — the list items. */
    get items(): AbstractBlock<string>[];
    /** Alias for blocks — the list content. */
    content(): Promise<AbstractBlock<string>[]>;
    /**
     * Return the list items (alias for items / blocks).
     * @returns {ListItem[]}
     */
    getItems(): ListItem[];
    /**
     * Check whether this list has items (blocks).
     * @returns {boolean}
     */
    hasItems(): boolean;
    /**
     * Check whether this list is an outline list (unordered or ordered).
     * @returns {boolean}
     */
    outline(): boolean;
}
/**
 * Methods for managing items for AsciiDoc olists, ulists, and dlists.
 *
 * In a description list (dlist), each item is a tuple: `[[term, term, ...], desc]`.
 * If a description is not set, the second entry is null.
 */
export class ListItem extends AbstractBlock<string> {
    /**
     * @param {List} parent - The parent List block.
     * @param {string|null} [text=null] - The text of this item.
     */
    constructor(parent: List, text?: string | null);
    /**
     * The string marker used for this list item.
     * @type {string|null}
     */
    marker: string | null;
    _text: string;
    subs: string[];
    /** Contextual alias for parent. */
    get list(): import("./abstract_node.js").AbstractNode;
    /**
     * Return the text of this list item with substitutions applied.
     * Synchronous because text is pre-computed during parse().
     * @returns {string|null}
     */
    getText(): string | null;
    /**
     * Return the list marker string for this item (e.g. '.', '..', '*').
     * @returns {string|null}
     */
    getMarker(): string | null;
    /**
     * Check whether the text of this list item is non-blank.
     * @returns {boolean}
     */
    hasText(): boolean;
    /**
     * Set the raw text of this list item.
     * @param {string|null} val
     */
    set text(val: string | null);
    /**
     * Get the string text with substitutions applied.
     * The result is pre-computed during `Document.parse()` via {@link precomputeText}.
     * Falls back to the raw text if {@link precomputeText} has not been called yet.
     *
     * In Ruby, text is lazy (`apply_subs` on first access), so API callers can modify
     * subs before accessing text and get the result they expect. Here we replicate
     * that by invalidating the pre-computed value when subs have changed since it
     * was computed: returning raw text mirrors what Ruby would produce when subs are
     * cleared or reduced to a no-op set (since `applySubs` is async and cannot be
     * re-run synchronously).
     * @returns {string|null}
     */
    get text(): string | null;
    /**
     * Pre-compute the converted text asynchronously.
     * Called during `Document.parse()` so the synchronous getter works during conversion.
     * @returns {Promise<void>}
     */
    precomputeText(): Promise<void>;
    _convertedText: any;
    _subsSnapshot: string[];
    /**
     * Check whether this list item has simple content.
     * @returns {boolean} `true` if the item has no blocks or only a single nested outline list.
     */
    simple(): boolean;
    /**
     * Check whether this list item has compound content.
     * @returns {boolean} `true` if the item contains blocks other than a single nested outline list.
     */
    compound(): boolean;
}
import { AbstractBlock } from './abstract_block.js';
