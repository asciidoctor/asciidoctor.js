export namespace Stylesheets {
    let instance: StylesheetsClass;
}
declare class StylesheetsClass {
    static DEFAULT_STYLESHEET_NAME: string;
    get primaryStylesheetName(): string;
    primaryStylesheetData(): Promise<string>;
    embedPrimaryStylesheet(): Promise<string>;
}
export {};
