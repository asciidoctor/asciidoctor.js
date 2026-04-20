export class Section extends AbstractBlock {
    static generateId(title: any, document: any): string;
    constructor(parent?: any, level?: any, numbered?: boolean, opts?: {});
    level: any;
    special: boolean;
    numbered: boolean;
    index: number;
    sectname: any;
    get name(): any;
    generateId(): string;
    sectnum(delimiter?: string, append?: any): any;
    append(block: any): this;
    getName(): any;
    getSectionName(): any;
    getIndex(): number;
    isNumbered(): boolean;
    isSpecial(): boolean;
    getNumeral(): any;
    setNumeral(val: any): void;
    getSectionNumeral(): any;
    getSectionNumber(): any;
}
import { AbstractBlock } from './abstract_block.js';
