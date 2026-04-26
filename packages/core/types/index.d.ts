/**
 * Get the version of Asciidoctor.js.
 *
 * @returns {string} - the version of Asciidoctor.js
 */
export function getVersion(): string;
/**
 * Get Asciidoctor core version number.
 *
 * @returns {string} - the version of Asciidoctor core (Ruby)
 */
export function getCoreVersion(): string;
/**
 * Parse the AsciiDoc source input into a Document.
 *
 * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<Document>} - the parsed Document
 */
export function load(input: string | string[] | Buffer, options?: any): Promise<Document>;
/**
 * Parse the AsciiDoc source input and convert it to the specified backend format.
 *
 * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<string>} - the converted output as a String
 */
export function convert(input: string | string[] | Buffer, options?: any): Promise<string>;
/**
 * Parse the contents of the AsciiDoc source file into a Document.
 *
 * @param {string} filename - the path to the AsciiDoc source file
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<Document>} - the parsed Document
 */
export function loadFile(filename: string, options?: any): Promise<Document>;
/**
 * Parse the contents of the AsciiDoc source file and convert it to the specified backend format.
 *
 * @param {string} filename - the path to the AsciiDoc source file
 * @param {Object} [options={}] - a plain object of options to control processing
 * @returns {Promise<string>} - the converted output as a String
 */
export function convertFile(filename: string, options?: any): Promise<string>;
export default asciidoctor;
import type { Document } from './document.js';
import { SyntaxHighlighterBase } from './syntax_highlighter.js';
import { LoggerManager } from './logging.js';
import { MemoryLogger } from './logging.js';
import { NullLogger } from './logging.js';
import { SafeMode } from './constants.js';
import { Timings } from './timings.js';
import { Extensions } from './extensions.js';
import { Converter } from './converter.js';
import Html5Converter from './converter/html5.js';
import { Block } from './block.js';
import { Section } from './section.js';
import { SyntaxHighlighter } from './syntax_highlighter.js';
declare namespace asciidoctor {
    /**
     * Get the version of Asciidoctor.js.
     *
     * @returns {string} - the version of Asciidoctor.js
     */
    export function getVersion(): string;
    /**
     * Get Asciidoctor core version number.
     *
     * @returns {string} - the version of Asciidoctor core (Ruby)
     */
    export function getCoreVersion(): string;
    export { LoggerManager };
    export { MemoryLogger };
    export { NullLogger };
    export { SafeMode };
    export { Timings };
    export { Extensions };
    export { Converter as ConverterFactory };
    export { Html5Converter };
    export { Block };
    export { Section };
    export { SyntaxHighlighter };
    /**
     * Parse the AsciiDoc source input into a Document.
     *
     * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<Document>} - the parsed Document
     */
    export function load(input: string | string[] | Buffer, options?: any): Promise<Document>;
    /**
     * Parse the AsciiDoc source input and convert it to the specified backend format.
     *
     * @param {string|string[]|Buffer} input - the AsciiDoc source as a String, String Array, or Buffer
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<string>} - the converted output as a String
     */
    export function convert(input: string | string[] | Buffer, options?: any): Promise<string>;
    /**
     * Parse the contents of the AsciiDoc source file into a Document.
     *
     * @param {string} filename - the path to the AsciiDoc source file
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<Document>} - the parsed Document
     */
    export function loadFile(filename: string, options?: any): Promise<Document>;
    /**
     * Parse the contents of the AsciiDoc source file and convert it to the specified backend format.
     *
     * @param {string} filename - the path to the AsciiDoc source file
     * @param {Object} [options={}] - a plain object of options to control processing
     * @returns {Promise<string>} - the converted output as a String
     */
    export function convertFile(filename: string, options?: any): Promise<string>;
}
export { SyntaxHighlighterBase, LoggerManager, MemoryLogger, NullLogger, SafeMode, Timings, Extensions, Converter as ConverterFactory, Html5Converter, Block, Section, SyntaxHighlighter };
