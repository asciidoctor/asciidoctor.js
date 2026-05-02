export class Footnote {
    constructor(index: any, id: any, text: any);
    index: any;
    id: any;
    text: any;
    /**
     * @returns {number} the index of this footnote.
     */
    getIndex(): number;
    /**
     * @returns {string|null} the id of this footnote, or null if not set.
     */
    getId(): string | null;
    /**
     * @returns {string} the text of this footnote.
     */
    getText(): string;
}
