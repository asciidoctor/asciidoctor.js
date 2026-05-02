/**
 * Parse the AsciiDoc source input into a Document.
 *
 * Accepts input as a Node.js Readable stream (or any object with a read()
 * method), a String, or a String Array. If the input is a file descriptor
 * object produced by openFile() / Node's fs.openSync(), pass a plain object
 * with { path, read() } instead; the function sets docfile/docdir/docname
 * attributes automatically.
 *
 * @param {Buffer|string|string[]|{path?: string, read(): string|Promise<string>, mtime?: Date}} input - The AsciiDoc source.
 * @param {Object} [options={}] - Options to control processing. See Document for the full list.
 * @param {string|string[]|Object} [options.attributes] - Document attributes.
 * @param {boolean} [options.parse] - Set to false to skip parsing after Document creation.
 * @param {Object} [options.logger] - Logger instance to use for this call.
 * @param {{start(label: string): void, record(label: string): void}} [options.timings] - Timings object.
 * @returns {Promise<Document>} A Promise that resolves to the Document.
 */
export function load(input: Buffer | string | string[] | {
    path?: string;
    read(): string | Promise<string>;
    mtime?: Date;
}, options?: {
    attributes?: string | string[] | any;
    parse?: boolean;
    logger?: any;
    timings?: {
        start(label: string): void;
        record(label: string): void;
    };
}): Promise<Document>;
/**
 * Parse the contents of the AsciiDoc source file into a Document.
 *
 * @param {string} filename - The path to the AsciiDoc source file.
 * @param {Object} [options={}] - Options to control processing.
 * @returns {Promise<Document>} A Promise that resolves to the Document.
 */
export function loadFile(filename: string, options?: any): Promise<Document>;
import { Document } from './document.js';
