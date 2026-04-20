export class Callouts {
    _lists: any[];
    _listIndex: number;
    register(liOrdinal: any): string;
    readNextId(): any;
    calloutIds(liOrdinal: any): any;
    currentList(): any;
    nextList(): void;
    _coIndex: number;
    rewind(): void;
    _generateNextCalloutId(): string;
}
