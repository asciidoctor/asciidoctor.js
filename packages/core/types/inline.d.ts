/**
 * Represents an inline element in an AsciiDoc document.
 */
export class Inline extends AbstractNode {
    /**
     * @param {AbstractNode} parent
     * @param {string} context
     * @param {string|null} [text=null] - The String text of this inline element.
     * @param {Object} [opts={}] - A plain object of options:
     *   id     - The String id of this inline element.
     *   type   - The String type qualifier (e.g. 'ref', 'bibref').
     *   target - The String target (e.g. a URI).
     */
    constructor(parent: AbstractNode, context: string, text?: string | null, opts?: any);
    /** @type {string|null} */
    type: string | null;
    /** @type {string|null} */
    target: string | null;
    /** @type {string|null} */
    text: string | null;
    /**
     * Convert this inline element using the document's converter.
     * @returns {Promise<string>}
     */
    convert(): Promise<string>;
    /** @deprecated Use convert() instead. */
    render(): Promise<string>;
    /**
     * Get the converted content (alias for text).
     * @returns {string|null}
     */
    content(): string | null;
    /**
     * Alias for {@link getAlt}.
     * @see {getAlt}
     */
    get alt(): any;
    /**
     * Generate cross-reference text (xreftext) that can be used to refer to this inline node.
     *
     * Uses the explicit reftext for this inline node, if specified, retrieved by calling the
     * reftext method. Otherwise, returns null.
     *
     * @param {string|null} [_xrefstyle=null] - Not currently used.
     * @returns {string|null} the reftext to refer to this inline node, or null if no reftext is defined.
     */
    xreftext(_xrefstyle?: string | null): string | null;
    /**
     * Return the text of this inline node.
     * @returns {string|null}
     */
    getText(): string | null;
    /**
     * Return the type qualifier of this inline node (e.g. 'ref', 'bibref').
     * @returns {string|null}
     */
    getType(): string | null;
    /**
     * Return the target (e.g. URI or anchor) of this inline node.
     * @returns {string|null}
     */
    getTarget(): string | null;
    /**
     * Get the alt text for this inline image.
     * @returns {string} the value of the alt attribute, or ''.
     */
    getAlt(): string;
}
import { AbstractNode } from './abstract_node.js';
