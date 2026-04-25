export default function _default(): Asciidoctor;
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
        groups(): object;
        create(name?: string | null, block?: Function | null): Registry;
        register(...args: any[]): Function | object;
        unregisterAll(): void;
        unregister(...names: string[]): void;
        _buildProcessorClass(BaseClass: any, name: any, functions: any, ...args: any[]): {
            new (): {
                [x: string]: any;
            };
            [x: string]: any;
            readonly name: any;
        };
        createPreprocessor(name?: string, functions?: object, ...args: any[]): typeof Preprocessor;
        newPreprocessor(name?: string, functions?: object, ...args: any[]): Preprocessor;
        createTreeProcessor(name?: string, functions?: object, ...args: any[]): typeof TreeProcessor;
        newTreeProcessor(name?: string, functions?: object, ...args: any[]): TreeProcessor;
        createPostprocessor(name?: string, functions?: object, ...args: any[]): typeof Postprocessor;
        newPostprocessor(name?: string, functions?: object, ...args: any[]): Postprocessor;
        createIncludeProcessor(name?: string, functions?: object, ...args: any[]): typeof IncludeProcessor;
        newIncludeProcessor(name?: string, functions?: object, ...args: any[]): IncludeProcessor;
        createDocinfoProcessor(name?: string, functions?: object, ...args: any[]): typeof DocinfoProcessor;
        newDocinfoProcessor(name?: string, functions?: object, ...args: any[]): DocinfoProcessor;
        createBlockProcessor(name?: string, functions?: object, ...args: any[]): typeof BlockProcessor;
        newBlockProcessor(name?: string, functions?: object, ...args: any[]): BlockProcessor;
        createInlineMacroProcessor(name?: string, functions?: object, ...args: any[]): typeof InlineMacroProcessor;
        newInlineMacroProcessor(name?: string, functions?: object, ...args: any[]): InlineMacroProcessor;
        createBlockMacroProcessor(name?: string, functions?: object, ...args: any[]): typeof BlockMacroProcessor;
        newBlockMacroProcessor(name?: string, functions?: object, ...args: any[]): BlockMacroProcessor;
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
import { Extensions } from './extensions.js';
import { MemoryLogger } from './logging.js';
import { NullLogger } from './logging.js';
import { Timings } from './timings.js';
import type { Registry } from './extensions.js';
import type { Preprocessor } from './extensions.js';
import type { TreeProcessor } from './extensions.js';
import type { Postprocessor } from './extensions.js';
import type { IncludeProcessor } from './extensions.js';
import type { DocinfoProcessor } from './extensions.js';
import type { BlockProcessor } from './extensions.js';
import type { InlineMacroProcessor } from './extensions.js';
import type { BlockMacroProcessor } from './extensions.js';
import Html5Converter from './converter/html5.js';
import { Block } from './block.js';
import { Section } from './section.js';
import type { Document } from './document.js';
export { SyntaxHighlighterBase, Extensions };
