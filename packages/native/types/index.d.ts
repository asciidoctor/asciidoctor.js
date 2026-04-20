export default function _default(): Asciidoctor;
export { SyntaxHighlighterBase };
declare class Asciidoctor {
    /**
     * Get the version of Asciidoctor.js.
     *
     * @returns {string} - the version of Asciidoctor.js
     */
    getVersion(): string;
    /**
     * Get Asciidoctor core version number.
     *
     * @returns {string} - the version of Asciidoctor core (Ruby)
     */
    getCoreVersion(): string;
    get LoggerManager(): {
        loggerClass: typeof import("./logging.js").Logger;
        logger: any;
        getLogger(): any;
        setLogger(newLogger: any): void;
        newFormatter(_name: any, impl: any): {
            call: any;
        };
        newLogger(_name: any, impl: any): import("./logging.js").Logger;
    };
    get MemoryLogger(): typeof MemoryLogger;
    get NullLogger(): typeof NullLogger;
    get SafeMode(): {
        UNSAFE: number;
        SAFE: number;
        SERVER: number;
        SECURE: number;
        valueForName(name: any): number;
        getValueForName(name: any): number;
        nameForValue(value: any): any;
        getNameForValue(value: any): any;
        names(): string[];
        getNames(): string[];
    };
    get Timings(): typeof Timings;
    get Extensions(): {
        generateName(): string;
        nextAutoId(): number;
        groups(): any;
        create(name?: any, block?: any): import("./extensions.js").Registry;
        register(...args: any[]): any;
        unregisterAll(): void;
        unregister(...names: any[]): void;
        _buildProcessorClass(BaseClass: any, name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        createPreprocessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newPreprocessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createTreeProcessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newTreeProcessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createPostprocessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newPostprocessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createIncludeProcessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newIncludeProcessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createDocinfoProcessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newDocinfoProcessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createBlockProcessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newBlockProcessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createInlineMacroProcessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newInlineMacroProcessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
        createBlockMacroProcessor(name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        newBlockMacroProcessor(name: any, functions: any, ...args: any[]): {
            [x: string]: any;
        };
    };
    get ConverterFactory(): {
        _defaultRegistry: {};
        register(converter: any, ...backends: any[]): void;
        _catchAll: any;
        for(backend: any): any;
        getRegistry(): {};
        getDefault(): /*elided*/ any;
        createSync(backend: any, opts?: {}): any;
        create(backend: any, opts?: {}): Promise<any>;
        unregisterAll(): void;
        _registry: {};
        converters(): {};
    };
    get Html5Converter(): typeof Html5Converter;
    get Block(): typeof Block;
    get Section(): typeof Section;
    get SyntaxHighlighter(): {
        _defaultRegistry: {};
        register(syntaxHighlighter: any, ...names: any[]): void;
        for(name: any): any;
        get(name: string): Function | SyntaxHighlighterBase | undefined;
        create(name: any, backend?: string, opts?: {}): any;
        unregisterAll(): void;
        _registry: any;
    };
    /**
     * Parse the AsciiDoc source input into a Document.
     *
     * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<Document>} - the parsed Document
     */
    load(input: string | string[] | Buffer, options?: any): Promise<Document>;
    /**
     * Parse the AsciiDoc source input and convert it to the specified backend format.
     *
     * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<string>} - the converted output as a String
     */
    convert(input: string | string[] | Buffer, options?: any): Promise<string>;
    /**
     * Parse the contents of the AsciiDoc source file into a Document.
     *
     * @param {string} filename - the path to the AsciiDoc source file
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<Document>} - the parsed Document
     */
    loadFile(filename: string, options?: any): Promise<Document>;
    /**
     * Parse the contents of the AsciiDoc source file and convert it to the specified backend format.
     *
     * @param {string} filename - the path to the AsciiDoc source file
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<string>} - the converted output as a String
     */
    convertFile(filename: string, options?: any): Promise<string>;
}
import { SyntaxHighlighterBase } from './syntax_highlighter.js';
import { MemoryLogger } from './logging.js';
import { NullLogger } from './logging.js';
import { Timings } from './timings.js';
import Html5Converter from './converter/html5.js';
import { Block } from './block.js';
import { Section } from './section.js';
