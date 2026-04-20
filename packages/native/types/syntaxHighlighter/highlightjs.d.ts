export class HighlightJsAdapter extends SyntaxHighlighterBase {
    constructor(...args: any[]);
    format(node: any, lang: any, opts: any): string;
    hasDocinfo(location: any): boolean;
    docinfo(location: any, doc: any, opts: any): string;
}
export default HighlightJsAdapter;
import { SyntaxHighlighterBase } from '../syntax_highlighter.js';
