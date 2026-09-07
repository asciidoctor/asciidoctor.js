export namespace Stylesheets {
    let instance: StylesheetsClass;
}
declare class StylesheetsClass {
    static DEFAULT_STYLESHEET_NAME: string;
    static SEMANTIC_STYLESHEET_NAME: string;
    get primaryStylesheetName(): string;
    primaryStylesheetData(): Promise<string>;
    embedPrimaryStylesheet(): Promise<string>;
    writePrimaryStylesheet(stylesoutdir: any): Promise<boolean>;
    get semanticStylesheetName(): string;
    semanticStylesheetData(): Promise<string>;
    embedSemanticStylesheet(): Promise<string>;
    writeSemanticStylesheet(stylesoutdir: any): Promise<boolean>;
}
export {};
