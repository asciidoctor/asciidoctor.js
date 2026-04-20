export namespace DEFAULT_CONTENT_MODEL {
    let audio: string;
    let image: string;
    let listing: string;
    let literal: string;
    let stem: string;
    let open: string;
    let page_break: string;
    let pass: string;
    let thematic_break: string;
    let video: string;
}
export class Block extends AbstractBlock<string> {
    static create(parent: any, context: any, opts?: {}): Block;
    constructor(parent: any, context: any, opts?: {});
    contentModel: any;
    lines: any;
    get blockname(): any;
    content(): Promise<any>;
    getSourceLines(): any;
    get source(): any;
}
import { AbstractBlock } from './abstract_block.js';
