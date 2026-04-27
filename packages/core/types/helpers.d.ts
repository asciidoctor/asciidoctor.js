/**
 * Prepare the source data Array for parsing.
 *
 * Strips a leading BOM from the first element if present, then trims trailing
 * whitespace (trimEnd = true) or only the trailing newline (trimEnd = false)
 * from every line.
 *
 * @param {string[]} data - the source data Array to prepare (no null/undefined entries allowed)
 * @param {boolean} [trimEnd=true] - whether to strip all trailing whitespace (true) or only \n (false)
 * @returns {string[]} Array of prepared lines
 */
export function prepareSourceArray(data: string[], trimEnd?: boolean): string[];
/**
 * Prepare the source data String for parsing.
 *
 * Strips a leading BOM if present, splits into an array, and trims trailing
 * whitespace (trimEnd = true) or only the trailing newline (trimEnd = false)
 * from every line.
 *
 * @param {string} data - the source data String to prepare
 * @param {boolean} [trimEnd=true] - whether to strip all trailing whitespace (true) or only \n (false)
 * @returns {string[]} Array of prepared lines
 */
export function prepareSourceString(data: string, trimEnd?: boolean): string[];
/**
 * Efficiently check whether the specified String resembles a URI.
 *
 * Uses UriSniffRx to check whether the String begins with a URI prefix (e.g.
 * http://). No validation of the URI is performed.
 *
 * @param {string} str - the String to check
 * @returns {boolean} true if the String resembles a URI, false otherwise
 */
export function isUriish(str: string): boolean;
/**
 * Encode a URI component String for safe inclusion in a URI.
 *
 * Encodes all characters that are not unreserved per RFC-3986. Specifically,
 * encodeURIComponent leaves !, ', (, ), and * unencoded; this function encodes
 * those as well so the result matches CGI.escapeURIComponent (Ruby ≥ 3.2) /
 * CGI.escape + gsub('+', '%20').
 *
 * @param {string} str - the URI component String to encode
 * @returns {string} the encoded String
 */
export function encodeUriComponent(str: string): string;
/**
 * Replace spaces with %20 in a URI path.
 *
 * @param {string} str - the String to encode
 * @returns {string} the String with all spaces replaced with %20
 */
export function encodeSpacesInUri(str: string): string;
/**
 * Remove the file extension from a filename and return the result.
 *
 * The filename is expected to be a POSIX path. The extension is only stripped
 * when no path separator follows the last dot, so paths like
 * "dir.with.dots/file" are returned unchanged.
 *
 * @param {string} filename - the String file name to process
 * @returns {string} the String filename with the file extension removed
 *
 * @example
 * rootname('part1/chapter1.adoc')
 * // => "part1/chapter1"
 */
export function rootname(filename: string): string;
/**
 * Retrieve the basename of a filename, optionally removing the extension.
 *
 * @param {string} filename - the String file name to process
 * @param {boolean|string|null} [dropExt=null] - a Boolean flag or an explicit String extension to drop
 * @returns {string} the String filename with leading directories removed and, optionally, the extension removed
 *
 * @example
 * basename('images/tiger.png', true)
 * // => "tiger"
 *
 * basename('images/tiger.png', '.png')
 * // => "tiger"
 */
export function basename(filename: string, dropExt?: boolean | string | null): string;
/**
 * Return whether this path has a file extension.
 *
 * @param {string} path - the path String to check (expects a POSIX path)
 * @returns {boolean} true if the path has a file extension, false otherwise
 */
export function isExtname(path: string): boolean;
/**
 * Retrieve the file extension of the specified path.
 *
 * The file extension is the portion of the last path segment starting from
 * the last period. Differs from Node's path.extname in that the fallback value
 * is configurable.
 *
 * @param {string} path - the path String in which to look for a file extension
 * @param {string} [fallback=''] - the fallback String to return if no file extension is present
 * @returns {string} the String file extension (with the leading dot) or fallback
 */
export function extname(path: string, fallback?: string): string;
/**
 * Async-aware string replacement using matchAll.
 *
 * The replacer may return a string or a Promise<string>.
 * The regex is treated as global regardless of its flags.
 *
 * @param {string} str - the String to perform replacements on
 * @param {RegExp} regex - the RegExp pattern to match
 * @param {Function} replacer - an async function receiving the same arguments as String#replace callbacks
 * @returns {Promise<string>} the String with all matches replaced
 */
export function asyncReplace(str: string, regex: RegExp, replacer: Function): Promise<string>;
/**
 * Make a directory, creating all missing parent directories.
 *
 * @param {string} dir - the String path of the directory to create
 * @returns {Promise<void>} Throws if the path cannot be created
 */
export function mkdirP(dir: string): Promise<void>;
/**
 * Convert an integer to a Roman numeral.
 *
 * @param {number} val - the integer value to convert
 * @returns {string} the String Roman numeral
 */
export function intToRoman(val: number): string;
/**
 * Convert an uppercase Roman numeral to an integer.
 *
 * @param {string} val - the String Roman numeral in uppercase to convert
 * @returns {number} the integer value
 */
export function romanToInt(val: string): number;
/**
 * Get the next value in a sequence.
 *
 * Handles integer sequences (numeric increment) and alphabetic sequences
 * (ASCII letter increment with carry, matching Ruby's String#succ for the
 * alphanumeric subset used by Asciidoctor list labels).
 *
 * @param {string|number} current - the value to increment
 * @returns {string|number} the next value in the sequence
 */
export function nextval(current: string | number): string | number;
