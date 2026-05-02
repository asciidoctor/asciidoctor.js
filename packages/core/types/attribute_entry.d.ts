export class AttributeEntry {
    constructor(name: any, value: any, negate?: any);
    name: any;
    value: any;
    negate: any;
    saveTo(blockAttributes: any): this;
}
