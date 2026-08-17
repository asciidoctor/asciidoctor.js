/**
 * @extends {AbstractBlock<any[]>}
 */
export class List extends AbstractBlock<any[]> {
    constructor(parent: any, context: any, opts?: {});
    /** Alias for blocks — the list content. */
    content(): Promise<AbstractBlock<string>[]>;
    /**
     * Alias for {@link getItems}.
     * @returns {ListItem[]}
     * @see {getItems}
     */
    get items(): ListItem[];
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
    /**
     * Return the list items.
     * @returns {ListItem[]}
     */
    getItems(): ListItem[];
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
    /**
     * Contextual alias for parent.
     * @see {getParent}
     */
    get list(): import("./abstract_node.js").AbstractNode;
    /**
     * Alias for {@link setText}.
     * @see {setText}
     */
    set text(val: string | null);
    /**
     * Alias for {@link getText}.
     *
     * If this item's text contains a footnote and is read before real conversion (e.g. from
     * an extension, or application code inspecting the parsed tree), the footnote is shown
     * numbered `1` regardless of how many footnotes precede it or its eventual real,
     * document-order number, rather than fixing it based on read order rather than document
     * order (which may not match): the real number is only ever assigned once
     * `Document#convert` is actually running (see {@link Document#_converting}).
     * @see {getText}
     * @returns {string|null}
     */
    get text(): string | null;
    /**
     * Check whether the text of this list item is non-blank.
     * @returns {boolean}
     */
    hasText(): boolean;
    /**
     * Pre-compute the converted text asynchronously.
     * Called during `Document.parse()` so the synchronous getter works during conversion.
     * @returns {Promise<void>}
     */
    precomputeText(): Promise<void>;
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
    /**
     * Return the parent List block (alias of {@link getParent}).
     * @returns {List}
     * @see {getParent}
     */
    getList(): List;
    /**
     * Return the list marker string for this item (e.g. '.', '..', '*').
     * @returns {string|null}
     */
    getMarker(): string | null;
    /**
     * Return the text of this list item with substitutions applied.
     * The result is pre-computed during `Document.parse()` via {@link precomputeText}.
     * Falls back to the raw text if {@link precomputeText} has not been called yet.
     *
     * In Ruby, text is lazy (`apply_subs` on first access), so API callers can modify
     * subs before accessing text and get the result they expect. Here we replicate
     * that by invalidating the pre-computed value when subs have changed since it
     * was computed: returning raw text mirrors what Ruby would produce when subs are
     * cleared or reduced to a no-op set (since `applySubs` is async and cannot be
     * re-run synchronously).
     *
     * A footnote in the text is shown numbered `1` if this is read before real conversion —
     * see the note on {@link text}.
     * @returns {string|null}
     */
    getText(): string | null;
    /**
     * Set the raw text of this list item.
     * @param {string|null} val
     */
    setText(val: string | null): void;
}
import { AbstractBlock } from './abstract_block.js';
