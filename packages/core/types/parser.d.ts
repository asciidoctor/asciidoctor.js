export class Parser {
    /**
     * Parse AsciiDoc source from reader into document.
     * @param {Reader} reader
     * @param {Document} document
     * @param {{header_only?: boolean}} [options={}]
     * @returns {Promise<Document>}
     */
    static parse(reader: Reader, document: Document, options?: {
        header_only?: boolean;
    }): Promise<Document>;
    /**
     * Parse the document header.
     * @param {Reader} reader
     * @param {Document} document
     * @param {boolean} [headerOnly=false]
     * @returns {Promise<Object>} Block attributes after the header.
     */
    static parseDocumentHeader(reader: Reader, document: Document, headerOnly?: boolean): Promise<any>;
    /**
     * Parse manpage header.
     * @param {Reader} reader
     * @param {Document} document
     * @param {Object} blockAttributes
     * @param {boolean} [headerOnly=false]
     * @returns {Promise<void>}
     */
    static parseManpageHeader(reader: Reader, document: Document, blockAttributes: any, headerOnly?: boolean): Promise<void>;
    /**
     * Return the next section from the reader.
     * @param {Reader} reader
     * @param {Document|Section} parent
     * @param {Object} [attributes={}]
     * @returns {Promise<[Section|null, Object]>} Tuple of the new section (or null) and orphaned attributes.
     */
    static nextSection(reader: Reader, parent: Document | Section, attributes?: any): Promise<[Section | null, any]>;
    /**
     * Parse and return the next Block at the Reader's current location.
     * @param {Reader} reader
     * @param {AbstractBlock} parent
     * @param {Object} [attributes={}]
     * @param {Object} [options={}]
     * @returns {Promise<Block|null>}
     */
    static nextBlock(reader: Reader, parent: AbstractBlock, attributes?: any, options?: any): Promise<Block | null>;
    /**
     * Parse blocks from reader until exhausted.
     * @param {Reader} reader
     * @param {AbstractBlock} parent
     * @param {Object|null} [attributes=null]
     * @returns {Promise<void>}
     */
    static parseBlocks(reader: Reader, parent: AbstractBlock, attributes?: any | null): Promise<void>;
    /**
     * Check if line1 (and optionally line2) form a section title.
     * @param {string} line1
     * @param {string|null} [line2=null]
     * @returns {number|null} The section level, or null.
     */
    static isSectionTitle(line1: string, line2?: string | null): number | null;
    /**
     * Parse section title from reader.
     * @param {Reader} reader
     * @param {Document} document
     * @param {string|null} [sectId=null]
     * @returns {Promise<[string|null, string|null, string, number, boolean]>} Tuple of [id, reftext, title, level, atx].
     */
    static parseSectionTitle(reader: Reader, document: Document, sectId?: string | null): Promise<[string | null, string | null, string, number, boolean]>;
    /**
     * Parse header metadata (author line and revision line).
     * @param {Reader} reader
     * @param {Document|null} [document=null]
     * @param {boolean} [retrieve=true]
     * @returns {Promise<Object|null>}
     */
    static parseHeaderMetadata(reader: Reader, document?: Document | null, retrieve?: boolean): Promise<any | null>;
    /**
     * Store the attribute in the document.
     * @param {string} name
     * @param {string} value
     * @param {Document|null} [doc=null]
     * @param {Object|null} [attrs=null]
     * @param {Object} [opts={}]
     * @returns {[string, string|null]} Tuple of the resolved name and value.
     */
    static storeAttribute(name: string, value: string, doc?: Document | null, attrs?: any | null, opts?: any): [string, string | null];
    /**
     * Check if line is the start of a delimited block.
     * @param {string} line
     * @param {boolean} [returnMatchData=false]
     * @returns {{context: string, masq: string[], tip: string, terminator: string}|true|null}
     *   BlockMatchData object if returnMatchData is true, true/null otherwise.
     */
    static isDelimitedBlock(line: string, returnMatchData?: boolean): {
        context: string;
        masq: string[];
        tip: string;
        terminator: string;
    } | true | null;
    /**
     * Parse the first positional attribute for style, role, id, and options.
     * @param {Object} attributes
     * @param {Reader|null} [reader=null]
     * @returns {string|null} The resolved style value.
     */
    static parseStyleAttribute(attributes: any, reader?: Reader | null): string | null;
    static _yieldBufferedAttribute(attrs: any, name: any, value: any, reader: any): void;
}
import { Reader } from './reader.js';
import { Section } from './section.js';
import { Block } from './block.js';
import { List } from './list.js';
import { ListItem } from './list.js';
import { Table } from './table.js';
