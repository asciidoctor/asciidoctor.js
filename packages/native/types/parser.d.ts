export class Parser {
    static parse(reader: any, document: any, options?: {}): Promise<any>;
    static parseDocumentHeader(reader: any, document: any, headerOnly?: boolean): Promise<any>;
    static parseManpageHeader(reader: any, document: any, blockAttributes: any, headerOnly?: boolean): Promise<void>;
    static nextSection(reader: any, parent: any, attributes?: {}): Promise<any[]>;
    static nextBlock(reader: any, parent: any, attributes?: {}, options?: {}): Promise<any>;
    static buildBlock(blockContext: any, contentModel: any, terminator: any, parent: any, reader: any, attributes: any, options?: {}): Promise<any>;
    static parseBlocks(reader: any, parent: any, attributes?: any): Promise<void>;
    static parseList(reader: any, listType: any, parent: any, style?: any, opts?: {}): Promise<List>;
    static catalogCallouts(text: any, document: any): boolean;
    static catalogInlineAnchor(id: any, reftext: any, node: any, location: any, doc?: any): void;
    static catalogInlineAnchors(text: any, block: any, document: any, reader: any): void;
    static catalogInlineBiblioAnchor(id: any, reftext: any, node: any, reader: any): void;
    static parseDescriptionList(reader: any, match: any, parent: any): Promise<List>;
    static parseCalloutList(reader: any, match: any, parent: any, callouts: any): Promise<List>;
    static parseListItem(reader: any, listBlock: any, match: any, siblingTrait: any, style?: any): Promise<ListItem | (ListItem | ListItem[])[]>;
    static readLinesForListItem(reader: any, listType: any, siblingTrait?: any, hasText?: boolean): Promise<any[]>;
    static initializeSection(reader: any, parent: any, attributes?: {}): Promise<Section>;
    static isNextLineSection(reader: any, attributes: any): Promise<any>;
    static isNextLineDoctitle(reader: any, attributes: any, leveloffset: any): Promise<boolean>;
    static isSectionTitle(line1: any, line2?: any): any;
    static atxSectionTitle(line: any): number;
    static setextSectionTitle(line1: any, line2: any): any;
    static parseSectionTitle(reader: any, document: any, sectId?: any): Promise<any[]>;
    static parseHeaderMetadata(reader: any, document?: any, retrieve?: boolean): Promise<({
        authorcount: number;
    } & {
        authors: any;
        authorcount: number;
    }) | ({
        authorcount: number;
    } & {
        authorcount: number;
    })>;
    static processAuthors(authorLine: any, namesOnly?: boolean, multiple?: boolean): {
        authors: any;
        authorcount: number;
    };
    static parseBlockMetadataLines(reader: any, document: any, attributes?: {}, options?: {}): Promise<{}>;
    static parseBlockMetadataLine(reader: any, document: any, attributes: any, options?: {}): Promise<boolean>;
    static processAttributeEntries(reader: any, document: any, attributes?: any): Promise<void>;
    static processAttributeEntry(reader: any, document: any, attributes?: any, match?: any): Promise<boolean>;
    static storeAttribute(name: any, value: any, doc?: any, attrs?: any, opts?: {}): any[];
    static readParagraphLines(reader: any, breakAtList: any, opts?: {}): Promise<any>;
    static isDelimitedBlock(line: any, returnMatchData?: boolean): true | {
        context: any;
        masq: any;
        tip: any;
        terminator: any;
    };
    static resolveListMarker(listType: any, marker: any): any;
    static resolveOrderedListMarker(marker: any, ordinal?: any, validate?: boolean, reader?: any): any[];
    static resolveOrderedListStart(marker: any): number;
    static isSiblingListItem(line: any, listType: any, siblingTrait: any): boolean;
    static parseTable(tableReader: any, parent: any, attributes: any): Promise<Table>;
    static parseColspecs(records: any): {
        width: number;
    }[];
    static parseCellspec(line: any, pos?: string, delimiter?: any): any[];
    static parseStyleAttribute(attributes: any, reader?: any): any;
    static _yieldBufferedAttribute(attrs: any, name: any, value: any, reader: any): void;
    static adjustIndentation(lines: any, indentSize?: number, tabSize?: number): void;
    static uniform(str: any, chr: any, len: any): boolean;
    static sanitizeAttributeName(name: any): any;
}
import { List } from './list.js';
import { ListItem } from './list.js';
import { Section } from './section.js';
import { Table } from './table.js';
