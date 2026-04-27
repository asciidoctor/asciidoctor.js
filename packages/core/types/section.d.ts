/**
 * Methods for managing sections of AsciiDoc content in a document.
 */
export class Section extends AbstractBlock<string> {
    /**
     * Create a new Section — mirrors the core Section.create() API.
     * @param {AbstractBlock|null} [parent=null]
     * @param {number|null} [level=null]
     * @param {boolean} [numbered=false]
     * @param {Object} [opts={}]
     * @returns {Section}
     */
    static create(parent?: AbstractBlock | null, level?: number | null, numbered?: boolean, opts?: any): Section;
    /**
     * Generate a String ID from the given section title.
     * @param {string} title - The String title.
     * @param {object} document - The Document.
     * @returns {string} the generated String ID.
     */
    static generateId(title: string, document: object): string;
    /**
     * Initialize an Asciidoctor Section object.
     * @param {AbstractBlock|null} [parent=null] - The parent AbstractBlock (Document or Section), or null.
     * @param {number|null} [level=null] - The Integer level of this section (default: parent.level + 1 or 1).
     * @param {boolean} [numbered=false] - Boolean indicating whether numbering is enabled.
     * @param {Object} [opts={}] - An optional plain object of options.
     */
    constructor(parent?: AbstractBlock | null, level?: number | null, numbered?: boolean, opts?: any);
    special: boolean;
    numbered: boolean;
    index: number;
    sectname: any;
    /**
     * The name of this section — alias for title.
     * @returns {string|null}
     */
    get name(): string | null;
    /**
     * Generate a String ID from the title of this section.
     * This sync convenience method is only called outside of parsing (e.g. extensions).
     * At that point #convertedTitle is already set, so this.title returns the fully-substituted
     * HTML title — matching Ruby's behaviour where section.title calls apply_title_subs.
     * @returns {string}
     */
    generateId(): string;
    /**
     * Get the section number for the current Section as a dot-separated String.
     * @param {string} [delimiter='.'] - The separator between numerals.
     * @param {string|false|null} [append=null] - String appended at the end, or false to omit trailing delimiter
     *   (default: null → same as delimiter).
     * @returns {string} the section number String.
     */
    sectnum(delimiter?: string, append?: string | false | null): string;
    /**
     * Generate cross-reference text for this section.
     * Respects an explicit reftext if set; otherwise formats the section title
     * according to xrefstyle ('full', 'short', or 'basic').
     * @param {string|null} [xrefstyle=null]
     * @returns {Promise<string|null>}
     */
    xreftext(xrefstyle?: string | null): Promise<string | null>;
    /**
     * Append a content block to this block's list of blocks.
     * If the child block is a Section, assign an index/numeral to it.
     * @param {AbstractBlock} block - The child Block to append.
     * @returns {this}
     */
    append(block: AbstractBlock): this;
    /**
     * Get the section title (alias of title).
     * @returns {string|null}
     */
    getName(): string | null;
    /**
     * Get the section name (e.g. 'section', 'appendix').
     * @returns {string|null}
     */
    getSectionName(): string | null;
    /**
     * Get the 0-based index of this section within the parent block.
     * @returns {number}
     */
    getIndex(): number;
    /**
     * Get whether this section is numbered.
     * @returns {boolean}
     */
    isNumbered(): boolean;
    /**
     * Get whether this section is a special section.
     * @returns {boolean}
     */
    isSpecial(): boolean;
    /**
     * Get the section numeral string.
     * @returns {string|null}
     */
    getNumeral(): string | null;
    /**
     * Set the section numeral string.
     * @param {string|null} val
     */
    setNumeral(val: string | null): void;
    /**
     * Get the section number string (dot-separated).
     * @returns {string}
     */
    getSectionNumeral(): string;
    /**
     * Get the section number string (alias of getSectionNumeral).
     * @returns {string}
     */
    getSectionNumber(): string;
}
import { AbstractBlock } from './abstract_block.js';
