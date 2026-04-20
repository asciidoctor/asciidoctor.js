/**
 * @extends {AbstractBlock<any[]>}
 */
export class List extends AbstractBlock<any[]> {
    constructor(parent: any, context: any, opts?: {});
    get items(): any[];
    hasItems(): boolean;
    outline(): boolean;
}
export class ListItem extends AbstractBlock<string> {
    constructor(parent: any, text?: any);
    _text: any;
    level: any;
    subs: string[];
    marker: any;
    get list(): any;
    hasText(): boolean;
    set text(val: any);
    get text(): any;
    precomputeText(): Promise<void>;
    _convertedText: any;
    _subsSnapshot: string[];
    simple(): boolean;
    compound(): boolean;
    foldFirst(): void;
}
import { AbstractBlock } from './abstract_block.js';
