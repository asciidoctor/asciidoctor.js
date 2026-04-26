export namespace Substitutors {
    /**
     * Apply the specified substitutions to the text.
     *
     * @param {string|string[]} text - The text to process; must not be null.
     * @param {string[]} [subs=NORMAL_SUBS] - The substitutions to perform.
     * @returns {string|string[]} Text with substitutions applied.
     */
    function applySubs(text: string | string[], subs?: string[]): string | string[];
    /** Apply normal substitutions (alias for applySubs with default args). */
    function applyNormalSubs(text: any): Promise<string | string[]>;
    /** Apply substitutions for header metadata and attribute assignments.
     * Header subs are 'specialcharacters' + 'attributes', both of which are
     * purely synchronous operations — so this method is intentionally sync
     * to allow it to be called from synchronous contexts such as setAttribute()
     * and the {set:...} directive inside subAttributes(). */
    function applyHeaderSubs(text: any): string;
    /** Apply substitutions for titles (alias for applySubs). */
    function applyTitleSubs(text: any, subs?: readonly string[]): Promise<string | string[]>;
    /** Apply substitutions for reftext. */
    function applyReftextSubs(text: any): Promise<string | string[]>;
    /**
     * Substitute special characters (encode XML entities).
     *
     * @param {string} text
     * @returns {string}
     */
    function subSpecialchars(text: string): string;
    /** Alias for subSpecialchars. */
    function subSpecialcharacters(text: any): string;
    /**
     * Substitute quoted text (emphasis, strong, monospaced, etc.)
     *
     * @param {string} text
     * @returns {string}
     */
    function subQuotes(text: string): string;
    /**
     * Substitute attribute references in the specified text.
     *
     * @param {string} text
     * @param {Object} [opts={}]
     * @returns {string}
     */
    function subAttributes(text: string, opts?: any): string;
    /**
     * Substitute replacement characters (copyright, trademark, etc.)
     *
     * @param {string} text
     * @returns {string}
     */
    function subReplacements(text: string): string;
    /**
     * Substitute inline macros (links, images, etc.)
     *
     * @param {string} text
     * @returns {string}
     */
    function subMacros(text: string): string;
    /**
     * Substitute post replacements (hard line breaks).
     *
     * @param {string} text
     * @returns {string}
     */
    function subPostReplacements(text: string): string;
    /**
     * Apply verbatim substitutions on source.
     *
     * @param {string} source
     * @param {boolean} processCallouts
     * @returns {string}
     */
    function subSource(source: string, processCallouts: boolean): string;
    /**
     * Substitute callout source references.
     *
     * @param {string} text
     * @returns {string}
     */
    function subCallouts(text: string): string;
    /**
     * Highlight (colorize) the source code using a syntax highlighter.
     *
     * @param {string} source
     * @param {boolean} processCallouts
     * @returns {string}
     */
    function highlightSource(source: string, processCallouts: boolean): string;
    /**
     * Resolve line numbers to highlight from a test string.
     *
     * @param {string} source
     * @param {string} spec   - e.g. "1-5, !2, 10" or "1..5;!2;10"
     * @param {number|null} [start=null]
     * @returns {number[]}
     */
    function resolveLinesToHighlight(source: string, spec: string, start?: number | null): number[];
    /**
     * Extract passthrough text for reinsertion after processing.
     *
     * @param {string} text
     * @returns {string} Text with passthrough regions replaced by placeholders.
     */
    function extractPassthroughs(text: string): string;
    /**
     * Restore passthrough text by reinserting into placeholder positions.
     *
     * @param {string} text
     * @returns {string}
     */
    function restorePassthroughs(text: string): string;
    /**
     * Resolve the list of comma-delimited subs against the possible options.
     *
     * @param {string} subs
     * @param {'block'|'inline'} [type='block']
     * @param {string[]|null} [defaults=null]
     * @param {string|null} [subject=null]
     * @returns {string[]|undefined}
     */
    function resolveSubs(subs: string, type?: "block" | "inline", defaults?: string[] | null, subject?: string | null): string[] | undefined;
    /** Call resolveSubs for the 'block' type. */
    function resolveBlockSubs(subs: any, defaults: any, subject: any): string[];
    /** Call resolveSubs for the 'inline' type with subject set as passthrough macro. */
    function resolvePassSubs(subs: any, subject?: string): string[];
    /**
     * Expand all groups in the subs list and return.
     *
     * @param {string|string[]} subs
     * @param {string|null} [subject=null]
     * @returns {string[]|null}
     */
    function expandSubs(subs: string | string[], subject?: string | null): string[] | null;
    /**
     * Commit the requested substitutions to this block.
     * Looks for an attribute named "subs". If present, resolves substitutions.
     */
    function commitSubs(): any;
    /**
     * Parse attributes in name or name=value format from a comma-separated String.
     *
     * @param {string} attrlist
     * @param {string[]} [posattrs=[]]
     * @param {Object} [opts={}]
     * @returns {Object}
     */
    function parseAttributes(attrlist: string, posattrs?: string[], opts?: any): any;
    function extractAttributesFromText(text: any, defaultText?: any): Promise<any[]>;
    function extractCallouts(source: any): any[];
    function restoreCallouts(source: any, calloutMarks: any, sourceOffset?: any): Promise<string>;
    function convertQuotedText(args: any, type: any, scope: any): Promise<any>;
    function doReplacement(match: any, replacement: any, restore: any): any;
    /** Inserts text into a formatted text enclosure (sprintf). */
    function subPlaceholder(format: any, ...args: any[]): any;
    function parseQuotedTextAttributes(str: any): {};
    function normalizeText(text: any, normalizeWhitespace?: any, unescapeClosingSquareBrackets?: any): any;
    function splitSimpleCsv(str: any): any;
}
export const BASIC_SUBS: readonly string[];
export const HEADER_SUBS: readonly string[];
export const NO_SUBS: readonly any[];
export const NORMAL_SUBS: readonly string[];
export const REFTEXT_SUBS: readonly string[];
export const VERBATIM_SUBS: readonly string[];
export namespace SUB_GROUPS {
    export { NO_SUBS as none };
    export { NORMAL_SUBS as normal };
    export { VERBATIM_SUBS as verbatim };
    export { BASIC_SUBS as specialchars };
}
export namespace SUB_HINTS {
    let a: string;
    let m: string;
    let n: string;
    let p: string;
    let q: string;
    let r: string;
    let c: string;
    let v: string;
}
export namespace SUB_OPTIONS {
    let block: string[];
    let inline: string[];
}
export const CAN: "\u0018";
export const DEL: "";
export const PASS_START: "\u0096";
export const PASS_END: "\u0097";
export const PASS_SLOT_RX: RegExp;
export const HIGHLIGHTED_PASS_SLOT_RX: RegExp;
export const RS: "\\";
export const R_SB: "]";
export const ESC_R_SB: "\\]";
export const PLUS: "+";
export const SPECIAL_CHARS_RX: RegExp;
export const SPECIAL_CHARS_TR: {
    '>': string;
    '<': string;
    '&': string;
};
export namespace QUOTED_TEXT_SNIFF_RX {
    let _false: RegExp;
    export { _false as false };
    let _true: RegExp;
    export { _true as true };
}
