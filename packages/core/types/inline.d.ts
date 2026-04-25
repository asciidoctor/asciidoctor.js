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
    text: string;
    id: any;
    type: any;
    target: any;
    isBlock(): boolean;
    isInline(): boolean;
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
    /** Return the text of this inline node. */
    getText(): string;
    /** Return the type qualifier of this inline node (e.g. 'ref', 'bibref'). */
    getType(): any;
    /** Return the target (e.g. URI or anchor) of this inline node. */
    getTarget(): any;
    /**
     * Get the alt text for this inline image.
     * @returns {string} the value of the alt attribute, or ''.
     */
    alt(): string;
    /**
     * Generate xreftext for this inline node.
     * @param {string|null} [_xrefstyle=null]
     * @returns {string|null}
     */
    xreftext(_xrefstyle?: string | null): string | null;
}
import { AbstractNode } from './abstract_node.js';
