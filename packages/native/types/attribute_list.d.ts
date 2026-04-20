export class AttributeList {
    static rekey(attributes: any, positionalAttrs: any): any;
    constructor(source: any, block?: any, delimiter?: string);
    parseInto(attributes: any, positionalAttrs?: any[]): Promise<any>;
    parse(positionalAttrs?: any[]): Promise<any>;
    rekey(positionalAttrs: any): any;
    #private;
}
