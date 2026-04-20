export namespace ProcessorDsl {
    function option(key: any, value: any): void;
    function process(...args: any[]): any;
    function processBlockGiven(): boolean;
}
export namespace DocumentProcessorDsl {
    function prefer(): void;
    function prepend(): void;
}
export namespace SyntaxProcessorDsl {
    function named(value: any): void;
    function contentModel(value: any): void;
    function parseContentAs(value: any): void;
    function positionalAttributes(...value: any[]): void;
    function namePositionalAttributes(...value: any[]): void;
    function positionalAttrs(...value: any[]): void;
    function defaultAttributes(value: any): void;
    function defaultAttrs(value: any): void;
    function resolveAttributes(...args: any[]): void;
    function resolvesAttributes(...args: any[]): void;
}
export namespace IncludeProcessorDsl {
    function handles(...args: any[]): any;
}
export namespace DocinfoProcessorDsl {
    function atLocation(value: any): void;
}
export namespace BlockProcessorDsl {
    function contexts(...value: any[]): void;
    function onContexts(...value: any[]): void;
    function onContext(...value: any[]): void;
    function bindTo(...value: any[]): void;
}
export namespace MacroProcessorDsl {
    function resolveAttributes(...args: any[]): void;
    function resolvesAttributes(...args: any[]): void;
}
export namespace InlineMacroProcessorDsl {
    function format(value: any): void;
    function matchFormat(value: any): void;
    function usingFormat(value: any): void;
    function match(value: any): void;
}
export class Processor {
    static get config(): {};
    static option(key: any, value: any): void;
    static enableDsl(): void;
    static useDsl(): void;
    constructor(config?: {});
    config: any;
    updateConfig(config: any): void;
    process(..._args: any[]): void;
    createSection(parent: any, title: any, attrs: any, opts?: {}): Section;
    createBlock(parent: any, context: any, source: any, attrs: any, opts?: {}): Block;
    createList(parent: any, context: any, attrs?: any): List;
    createListItem(parent: any, text?: any): ListItem;
    createImageBlock(parent: any, attrs: any, opts?: {}): Block;
    createInline(parent: any, context: any, text: any, opts?: {}): Inline;
    parseContent(parent: any, content: any, attributes?: any): Promise<any>;
    parseAttributes(block: any, attrlist: any, opts?: {}): Promise<any>;
    createParagraph(parent: any, ...rest: any[]): Block;
    createOpenBlock(parent: any, ...rest: any[]): Block;
    createExampleBlock(parent: any, ...rest: any[]): Block;
    createPassBlock(parent: any, ...rest: any[]): Block;
    createListingBlock(parent: any, ...rest: any[]): Block;
    createLiteralBlock(parent: any, ...rest: any[]): Block;
    createAnchor(parent: any, ...rest: any[]): Inline;
    createInlinePass(parent: any, ...rest: any[]): Inline;
}
export class Preprocessor extends Processor {
    process(_document: any, _reader: any): void;
}
export namespace Preprocessor {
    export { DocumentProcessorDsl as DSL };
}
export class TreeProcessor extends Processor {
    process(_document: any): void;
}
export namespace TreeProcessor {
    export { DocumentProcessorDsl as DSL };
}
export const Treeprocessor: typeof TreeProcessor;
export class Postprocessor extends Processor {
    process(_document: any, _output: any): void;
}
export namespace Postprocessor {
    export { DocumentProcessorDsl as DSL };
}
export class IncludeProcessor extends Processor {
    process(_document: any, _reader: any, _target: any, _attributes: any): void;
    handles(_doc: any, _target: any): boolean;
}
export namespace IncludeProcessor {
    export { IncludeProcessorDsl as DSL };
}
export class DocinfoProcessor extends Processor {
    process(_document: any): void;
}
export namespace DocinfoProcessor {
    export { DocinfoProcessorDsl as DSL };
}
export class BlockProcessor extends Processor {
    constructor(name?: any, config?: {});
    name: any;
    process(_parent: any, _reader: any, _attributes: any): void;
}
export namespace BlockProcessor {
    export { BlockProcessorDsl as DSL };
}
export class MacroProcessor extends Processor {
    constructor(name?: any, config?: {});
    name: any;
    process(_parent: any, _target: any, _attributes: any): void;
}
export class BlockMacroProcessor extends MacroProcessor {
    _name: any;
}
export namespace BlockMacroProcessor {
    export { MacroProcessorDsl as DSL };
}
export class InlineMacroProcessor extends MacroProcessor {
    static rxCache: Map<any, any>;
    get regexp(): any;
    resolveRegexp(name: any, format: any): any;
}
export namespace InlineMacroProcessor {
    export { InlineMacroProcessorDsl as DSL };
}
export class Extension {
    constructor(kind: any, instance: any, config: any);
    kind: any;
    instance: any;
    config: any;
}
export class ProcessorExtension extends Extension {
    processMethod: any;
}
export class Group {
    static register(name?: any): void;
    activate(_registry: any): void;
}
export class Registry {
    constructor(groups?: {});
    groups: {};
    activate(document: any): this;
    document: any;
    preprocessor(...args: any[]): ProcessorExtension;
    preprocessors(): any;
    hasPreprocessors(): boolean;
    get preprocessor_extensions(): any;
    treeProcessor(...args: any[]): ProcessorExtension;
    treeprocessor(...args: any[]): ProcessorExtension;
    tree_processor(...args: any[]): ProcessorExtension;
    treeProcessors(): any;
    hasTreeProcessors(): boolean;
    hasTeeProcessors(): boolean;
    treeprocessors(): any;
    get tree_processor_extensions(): any;
    postprocessor(...args: any[]): ProcessorExtension;
    postprocessors(): any;
    hasPostprocessors(): boolean;
    get postprocessor_extensions(): any;
    includeProcessor(...args: any[]): ProcessorExtension;
    includeProcessors(): any;
    hasIncludeProcessors(): boolean;
    include_processor(...args: any[]): ProcessorExtension;
    get include_processor_extensions(): any;
    docinfoProcessor(...args: any[]): ProcessorExtension;
    hasDocinfoProcessors(location?: any): any;
    docinfoProcessors(location?: any): any;
    docinfo_processor(...args: any[]): ProcessorExtension;
    get docinfo_processor_extensions(): any;
    block(...args: any[]): any;
    hasBlocks(): boolean;
    registeredForBlock(name: any, context: any): any;
    findBlockExtension(name: any): any;
    blockMacro(...args: any[]): any;
    block_macro(...args: any[]): any;
    hasBlockMacros(): boolean;
    registeredForBlockMacro(name: any): any;
    findBlockMacroExtension(name: any): any;
    inlineMacro(...args: any[]): any;
    inline_macro(...args: any[]): any;
    hasInlineMacros(): boolean;
    registeredForInlineMacro(name: any): any;
    findInlineMacroExtension(name: any): any;
    inlineMacros(): any[];
    prefer(...args: any[]): any;
    _addDocumentProcessor(kind: any, args: any): ProcessorExtension;
    _addSyntaxProcessor(kind: any, args: any): any;
    _reset(): void;
    _preprocessor_extensions: any;
    _tree_processor_extensions: any;
    _postprocessor_extensions: any;
    _include_processor_extensions: any;
    _docinfo_processor_extensions: any;
    _block_extensions: any;
    _block_macro_extensions: any;
    _inline_macro_extensions: any;
    _resolveArgs(args: any, expect: any): any;
    _asSymbol(name: any): string;
}
export namespace Extensions {
    function generateName(): string;
    function nextAutoId(): number;
    function groups(): any;
    function create(name?: any, block?: any): Registry;
    function register(...args: any[]): any;
    function unregisterAll(): void;
    function unregister(...names: any[]): void;
    function _buildProcessorClass(BaseClass: any, name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function createPreprocessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newPreprocessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createTreeProcessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newTreeProcessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createPostprocessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newPostprocessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createIncludeProcessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newIncludeProcessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createDocinfoProcessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newDocinfoProcessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createBlockProcessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newBlockProcessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createInlineMacroProcessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newInlineMacroProcessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
    function createBlockMacroProcessor(name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    function newBlockMacroProcessor(name: any, functions: any, ...args: any[]): {
        [x: string]: any;
    };
}
import { Section } from './section.js';
import { Block } from './block.js';
import { List } from './list.js';
import { ListItem } from './list.js';
import { Inline } from './inline.js';
