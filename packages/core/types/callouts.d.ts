/** Maintains a catalog of callouts and their associations. */
export class Callouts {
    _lists: any[];
    _listIndex: number;
    /**
     * Register a new callout for the given list item ordinal.
     * @param {number} liOrdinal - The 1-based ordinal of the list item.
     * @returns {string} The unique id of this callout (e.g. 'CO1-1').
     */
    register(liOrdinal: number): string;
    /**
     * Get the next callout id in document order (used during conversion).
     * @returns {string|null} The unique id of the next callout, or null.
     */
    readNextId(): string | null;
    /**
     * Get a space-separated list of callout ids for the given list item.
     * @param {number} liOrdinal - The 1-based ordinal of the list item.
     * @returns {string} Space-separated callout ids.
     */
    calloutIds(liOrdinal: number): string;
    /** @returns {Array<{ordinal: number, id: string}>} The callout objects at the current list index. */
    currentList(): Array<{
        ordinal: number;
        id: string;
    }>;
    /** Advance to the next callout list in the document. */
    nextList(): void;
    _coIndex: number;
    /** Rewind the list pointer to the beginning (switching parse → convert). */
    rewind(): void;
}
