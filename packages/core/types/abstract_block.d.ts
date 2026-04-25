/**
 * @template {string | any[]} [TContent=string]
 */
export class AbstractBlock<TContent extends string | any[] = string> extends AbstractNode {
    constructor(parent: any, context: any, opts?: {});
    contentModel: string;
    blocks: any[];
    subs: any[];
    numeral: any;
    style: string;
    defaultSubs: any;
    sourceLocation: any;
    level: number;
    _nextSectionIndex: number;
    _nextSectionOrdinal: number;
    isBlock(): boolean;
    isInline(): boolean;
    /**
     * Set the String block title (clears the memoised converted title).
     * @param {string|null} val
     */
    set title(val: string | null);
    /**
     * Get the String title of this block with title substitutions applied.
     * The result is pre-computed during Document.parse() via precomputeTitle().
     * Falls back to applyHeaderSubs (sync) if precomputeTitle() has not been called yet
     * (e.g. when a title is set via the API after parsing).
     * @returns {string|null} the converted String title, or null if the source title is falsy.
     */
    get title(): string | null;
    /**
     * Pre-compute the converted title asynchronously.
     * Called during Document.parse() so the synchronous getter works during conversion.
     * Re-entrant calls (circular title references) are detected via _computingTitle and
     * silently skipped so that Section#xreftext() can return null (→ "[refid]" fallback).
     * @returns {Promise<void>}
     */
    precomputeTitle(): Promise<void>;
    _computingTitle: boolean;
    /**
     * Check whether the title of this block is defined.
     * @returns {boolean}
     */
    hasTitle(): boolean;
    /**
     * Set the caption for this block.
     * @param {string|null} val
     */
    set caption(val: string | null);
    /**
     * Get the caption for this block.
     * For admonition blocks, returns the 'textlabel' attribute instead.
     * @returns {string|null}
     */
    get caption(): string | null;
    /**
     * Get the source file where this block started.
     * @returns {string|null}
     */
    get file(): string | null;
    /**
     * Get the source line number where this block started.
     * @returns {number|null}
     */
    get lineno(): number | null;
    /**
     * Update the context of this block, also updating the node name.
     * @param {string} context - The String context to assign to this block.
     */
    setContext(context: string): void;
    /**
     * @deprecated
     * @param {number|string} val
     */
    set number(val: number | string);
    /**
     * @deprecated Get/set the numeral of this section as an integer when possible.
     * @returns {number|string}
     */
    get number(): number | string;
    /**
     * Convert this block and return the converted String content.
     * @returns {Promise<string>} the result of the converter.
     */
    convert(): Promise<string>;
    /** @deprecated Use convert() instead. */
    render(): Promise<string>;
    /**
     * Get the converted result of all child blocks joined with a newline.
     * @returns {Promise<TContent>}
     */
    content(): Promise<TContent>;
    /**
     * Alias for the content method — mirrors the core API.
     * @returns {Promise<TContent>}
     */
    getContent(): Promise<TContent>;
    /**
     * Append a content block to this block's list of blocks.
     * @param {AbstractBlock} block - The new child block.
     * @returns {this} this block (enables chaining).
     */
    append(block: AbstractBlock): this;
    /**
     * Determine whether this block contains block content.
     * @returns {boolean}
     */
    hasBlocks(): boolean;
    /**
     * Check whether this block has any child Section objects.
     * Overridden by Document and Section.
     * @returns {boolean}
     */
    hasSections(): boolean;
    /**
     * Get the child Section objects of this block.
     * Only applies to Document and Section instances.
     * @returns {AbstractBlock[]} array of Section objects (may be empty).
     */
    sections(): AbstractBlock[];
    /**
     * Get the converted alt text for this block image.
     * @returns {string} string with XML special character and replacement substitutions applied.
     */
    alt(): string;
    /**
     * Get the converted alt text for this block image (alias of alt).
     * @returns {string}
     */
    getAlt(): string;
    /**
     * Get the converted title prefixed with the caption.
     * @returns {string} the captioned title.
     */
    captionedTitle(): string;
    /**
     * Get the list marker keyword for the specified list type.
     * @param {string|null} [listType=null] - The String list type (default: this.style).
     * @returns {string|undefined} the single-character String keyword for the list marker.
     */
    listMarkerKeyword(listType?: string | null): string | undefined;
    /**
     * Check whether the specified substitution is enabled for this block.
     * @param {string} name - The String substitution name.
     * @returns {boolean}
     */
    hasSub(name: string): boolean;
    /**
     * Remove a substitution from this block.
     * @param {string} name - The String substitution name to remove.
     */
    removeSub(name: string): void;
    /**
     * Generate cross-reference text (xreftext) used to refer to this block.
     * Uses the explicit reftext if set. For sections or captioned blocks (blocks
     * with both a title and a caption), formats the text according to xrefstyle.
     * Falls back to the title, or null if no title is available.
     * @param {string|null} [xrefstyle=null] - Optional String style: 'full', 'short', or 'basic'.
     * @returns {Promise<string|null>} the xreftext, or null.
     */
    xreftext(xrefstyle?: string | null): Promise<string | null>;
    /**
     * Generate and assign a caption to this block if not already assigned.
     * If the block has a title and a caption prefix is available, builds a caption
     * from the prefix and a counter, then stores it.
     * @param {string|null} [value=null] - The String caption to assign, or null to derive from document attributes.
     * @param {string} [captionContext=this.context] - The String context used to look up caption attributes.
     */
    assignCaption(value?: string | null, captionContext?: string): void;
    /**
     * Walk the document tree and find all block-level nodes that match
     * the selector and optional filter function.
     * @param {Object} [selector={}] - A plain object with optional keys: context, style, role, id, traverseDocuments.
     * @param {Function|null} [filter=null] - An optional Function called with each candidate node.
     *   Return values: true/truthy → accept node; 'prune' → accept, skip children;
     *   'reject' → skip node and children; 'stop' → stop traversal.
     * @returns {AbstractBlock[]} array of matching block-level nodes.
     */
    findBy(selector?: any, filter?: Function | null): AbstractBlock[];
    /** Alias for findBy (matches Ruby's `alias query find_by`). */
    query(selector?: {}, filter?: any): AbstractBlock<string>[];
    /**
     * Move to the next adjacent block in document order.
     * If the current block is the last item in a list, returns the following
     * sibling of the list block.
     * @returns {AbstractBlock|null} the next AbstractBlock, or null.
     */
    nextAdjacentBlock(): AbstractBlock | null;
    /**
     * Get the content model of this block.
     * @returns {string}
     */
    getContentModel(): string;
    /**
     * Set the content model of this block.
     * @param {string} val
     */
    setContentModel(val: string): void;
    /**
     * Get the child blocks of this block.
     * @returns {AbstractBlock[]}
     */
    getBlocks(): AbstractBlock[];
    /**
     * Get the child Section blocks of this block.
     * @returns {AbstractBlock[]}
     */
    getSections(): AbstractBlock[];
    /**
     * Get the title of this block with substitutions applied.
     * @returns {string|null}
     */
    getTitle(): string | null;
    /**
     * Set the raw title of this block.
     * @param {string|null} val
     */
    setTitle(val: string | null): void;
    /**
     * Get the caption of this block.
     * @returns {string|undefined}
     */
    getCaption(): string | undefined;
    /**
     * Set the caption of this block.
     * @param {string|null} val
     */
    setCaption(val: string | null): void;
    /**
     * Get the captioned title of this block.
     * @returns {string}
     */
    getCaptionedTitle(): string;
    /**
     * Get the style of this block.
     * @returns {string|null}
     */
    getStyle(): string | null;
    /**
     * Set the style of this block.
     * @param {string|null} val
     */
    setStyle(val: string | null): void;
    /**
     * Get the level of this block.
     * @returns {number|null}
     */
    getLevel(): number | null;
    /**
     * Set the level of this block.
     * @param {number|null} val
     */
    setLevel(val: number | null): void;
    /**
     * Get the source line number where this block started.
     * @returns {number|undefined} line number, or undefined when sourcemap is disabled.
     */
    getLineNumber(): number | undefined;
    /**
     * Get the source location of this block.
     * @returns {object|undefined} the Cursor source location object, or undefined when sourcemap is disabled.
     */
    getSourceLocation(): object | undefined;
    /**
     * Get the list of substitutions enabled for this block.
     * @returns {string[]}
     */
    getSubstitutions(): string[];
    /**
     * Check whether the specified substitution is enabled for this block.
     * @param {string} name
     * @returns {boolean}
     */
    hasSubstitution(name: string): boolean;
    /**
     * Add the specified substitution to this block's substitutions list.
     * @param {string} name
     */
    addSubstitution(name: string): void;
    /**
     * Remove the specified substitution from this block's substitutions list.
     * @param {string} name
     */
    removeSubstitution(name: string): void;
    #private;
}
import { AbstractNode } from './abstract_node.js';
