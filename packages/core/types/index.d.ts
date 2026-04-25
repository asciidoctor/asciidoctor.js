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
    /** @returns {typeof LoggerManager} */
    get LoggerManager(): typeof LoggerManager;
    get MemoryLogger(): typeof MemoryLogger;
    get NullLogger(): typeof NullLogger;
    /** @returns {typeof SafeMode} */
    get SafeMode(): typeof SafeMode;
    get Timings(): typeof Timings;
    /** @returns {typeof Extensions} */
    get Extensions(): typeof Extensions;
    /** @returns {typeof Converter} */
    get ConverterFactory(): typeof Converter;
    get Html5Converter(): typeof Html5Converter;
    get Block(): typeof Block;
    get Section(): typeof Section;
    /** @returns {typeof SyntaxHighlighter} */
    get SyntaxHighlighter(): typeof SyntaxHighlighter;
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
import { LoggerManager } from './logging.js';
import { MemoryLogger } from './logging.js';
import { NullLogger } from './logging.js';
import { SafeMode } from './constants.js';
import { Timings } from './timings.js';
import { Converter } from './converter.js';
import Html5Converter from './converter/html5.js';
import { Block } from './block.js';
import { Section } from './section.js';
import { SyntaxHighlighter } from './syntax_highlighter.js';
import type { Document } from './document.js';
export { SyntaxHighlighterBase, Extensions };
