export class Inline extends AbstractNode {
    constructor(parent: any, context: any, text?: any, opts?: {});
    text: any;
    id: any;
    type: any;
    target: any;
    isBlock(): boolean;
    isInline(): boolean;
    convert(): Promise<any>;
    render(): Promise<any>;
    content(): any;
    alt(): any;
    get reftext(): any;
    xreftext(_xrefstyle?: any): any;
}
import { AbstractNode } from './abstract_node.js';
