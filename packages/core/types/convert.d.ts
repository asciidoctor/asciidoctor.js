/**
 * Parse the AsciiDoc source input into a Document and convert it to the specified backend format.
 *
 * Accepts input as a Node.js Readable stream (or any object with a read() method), a String,
 * or a String Array. If the input is a file-like object with a `.path` property, it is treated
 * as a file: the output is written to a file adjacent to the input by default.
 *
 * If `to_file` is true or omitted and the input is a file-like object, the output is written
 * next to the input file. If `to_file` is a String path, the output is written there.
 * If `to_file` is false, the converted String is returned.
 * If `to_file` is `'/dev/null'`, the document is loaded but neither converted nor written.
 *
 * @param {string|string[]|object} input - the AsciiDoc source (String, Array, Readable, or
 *   file-like object with a `.path` property)
 * @param {object} [options={}] - a plain Object of options (mirrors Ruby API):
 *   - `to_file` {string|boolean|object} - String path, Boolean, stream object, or `'/dev/null'`
 *   - `to_dir` {string} - output directory
 *   - `mkdirs` {boolean} - create missing directories if true
 *   - `standalone` {boolean} - include header/footer
 *   - `header_footer` {boolean} - deprecated alias for `standalone`
 *   - `base_dir` {string} - base directory
 * @returns {Promise<import('./document.js').Document|string>} the Document if output was written to a file, otherwise the converted String
 */
export function convert(input: string | string[] | object, options?: object): Promise<import("./document.js").Document | string>;
/**
 * Parse the contents of the AsciiDoc source file into a Document and convert it
 * to the specified backend format.
 *
 * @param {string} filename - the path to the AsciiDoc source file
 * @param {object} [options={}] - a plain Object of options (see {@link convert})
 * @returns {Promise<import('./document.js').Document|string>} the Document if output was written to a file, otherwise the converted String
 */
export function convertFile(filename: string, options?: object): Promise<import("./document.js").Document | string>;
export { convert as render, convertFile as renderFile };
