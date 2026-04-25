export namespace ProcessorDsl {
    function option(key: any, value: any): void;
    function process(...args: any[]): any;
    function processBlockGiven(): boolean;
}
export namespace DocumentProcessorDsl {
    function prefer(): void;
    /** Alias for {@link prefer}. */
    function prepend(): void;
}
export namespace SyntaxProcessorDsl {
    function named(value: any): void;
    function contentModel(value: any): void;
    /** Alias for {@link contentModel}. */
    function parseContentAs(value: any): void;
    function positionalAttributes(...value: any[]): void;
    /** Alias for {@link positionalAttributes}. */
    function namePositionalAttributes(...value: any[]): void;
    function positionalAttrs(...value: any[]): void;
    function defaultAttributes(value: any): void;
    /** @deprecated Alias for {@link defaultAttributes}. */
    function defaultAttrs(value: any): void;
    /**
     * Resolve and register positional attribute names and default values.
     *
     * Accepts any of:
     *   resolveAttributes()             → positional_attrs: [], default_attrs: {}
     *   resolveAttributes('foo', 'bar') → positional maps (Array-style)
     *   resolveAttributes({...})        → positional maps (Object-style)
     *
     * Array-style tokens understand positional-index notation (e.g. '1:name',
     * '@:name') and default-value notation (e.g. 'name=value', '1:name=value').
     *
     * @param {...*} args - Positional attribute specifications.
     */
    function resolveAttributes(...args: any[]): void;
    /** @deprecated Alias for {@link resolveAttributes}. */
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
    /**
     * Override: passing a falsy value sets content_model to :text instead of
     * configuring positional attributes.
     *
     * @param {...*} args - Positional attribute specifications.
     */
    function resolveAttributes(...args: any[]): void;
    /** @deprecated Alias for {@link resolveAttributes}. */
    function resolvesAttributes(...args: any[]): void;
}
export namespace InlineMacroProcessorDsl {
    function format(value: any): void;
    /** Alias for {@link format}. */
    function matchFormat(value: any): void;
    /** @deprecated Alias for {@link format}. */
    function usingFormat(value: any): void;
    function match(value: any): void;
}
/**
 * Abstract base class for document and syntax processors.
 *
 * Provides a class-level config map (via static config / static option) and a
 * set of convenience factory methods for creating AST nodes.
 */
export class Processor {
    /**
     * Get the static configuration map for this processor class.
     * Uses hasOwnProperty to avoid inheriting a parent class's config object
     * through the prototype chain when a subclass first accesses config.
     *
     * @returns {object}
     */
    static get config(): object;
    /**
     * Set a default option value for all instances of this processor class.
     *
     * @param {string} key - The option key.
     * @param {*} value - The option value.
     */
    static option(key: string, value: any): void;
    /**
     * Mix the DSL object for this processor class into its prototype.
     */
    static enableDsl(): void;
    /** Alias for {@link enableDsl}. */
    static useDsl(): void;
    constructor(config?: {});
    config: any;
    updateConfig(config: any): void;
    process(..._args: any[]): void;
    /**
     * Create a Section node in the same manner as the parser.
     *
     * @param {Section|Document} parent - The parent Section or Document of this new Section.
     * @param {string} title - The String title of the new Section.
     * @param {object} attrs - A plain object of attributes to control how the section is built.
     *   Use the style attribute to set the name of a special section (e.g. appendix).
     *   Use the id attribute to assign an explicit ID, or set it to false to
     *   disable automatic ID generation (when sectids document attribute is set).
     * @param {object} [opts={}] - An optional plain object of options:
     *   - level {number} - The Integer level to assign; defaults to parent.level + 1.
     *   - numbered {boolean} - Flag to force numbering.
     * @returns {Section} a Section node with all properties properly initialized.
     */
    createSection(parent: Section | Document, title: string, attrs: object, opts?: object): Section;
    /**
     * Create a generic block node and link it to the specified parent.
     *
     * @param {Block|Section} parent - The parent node.
     * @param {string} context - The block context (e.g. 'paragraph', 'listing').
     * @param {string|string[]|null} source - The source content.
     * @param {object} attrs - A plain object of attributes.
     * @param {object} [opts={}] - An optional plain object of options.
     * @returns {Block} a Block node with all properties properly initialized.
     */
    createBlock(parent: Block | Section, context: string, source: string | string[] | null, attrs: object, opts?: object): Block;
    /**
     * Create a list node and link it to the specified parent.
     *
     * @param {Block|Section|Document} parent - The parent of this new list.
     * @param {string} context - The list context ('ulist', 'olist', 'colist', 'dlist').
     * @param {object|null} [attrs=null] - A plain object of attributes to set on this list block.
     * @returns {List} a List node with all properties properly initialized.
     */
    createList(parent: Block | Section | Document, context: string, attrs?: object | null): List;
    /**
     * Create a list item node and link it to the specified parent.
     *
     * @param {List} parent - The parent List of this new list item.
     * @param {string|null} [text=null] - The text of the list item.
     * @returns {ListItem} a ListItem node with all properties properly initialized.
     */
    createListItem(parent: List, text?: string | null): ListItem;
    /**
     * Create an image block node and link it to the specified parent.
     *
     * @param {Block|Section|Document} parent - The parent of this new image block.
     * @param {object} attrs - A plain object of attributes to control how the image block is built.
     *   The target attribute sets the image source; alt sets the alt text.
     * @param {object} [opts={}] - An optional plain object of options.
     * @returns {Block} a Block node with all properties properly initialized.
     */
    createImageBlock(parent: Block | Section | Document, attrs: object, opts?: object): Block;
    /**
     * Create an inline node and bind it to the specified parent.
     *
     * @param {Block} parent - The parent Block of this new inline node.
     * @param {string} context - The context of the inline node ('quoted', 'anchor', etc.).
     * @param {string} text - The text of the inline node.
     * @param {object} [opts={}] - An optional plain object of options:
     *   - type {string} - The subtype of the inline node context.
     *   - attributes {object} - Attributes to set on the inline node.
     * @returns {Inline} an Inline node with all properties properly initialized.
     */
    createInline(parent: Block, context: string, text: string, opts?: object): Inline;
    /**
     * Parse blocks in the content and attach them to the parent.
     *
     * @param {Block|Section} parent - The parent node.
     * @param {string[]|Reader} content - Lines or a Reader.
     * @param {object|null} [attributes=null] - Attributes to pass to the parser.
     * @returns {Promise<Block|Section>} the parent node into which the blocks are parsed.
     */
    parseContent(parent: Block | Section, content: string[] | Reader, attributes?: object | null): Promise<Block | Section>;
    /**
     * Parse the attrlist String into a plain object of attributes.
     *
     * @param {Block|Section} block - The current block (used for applying subs).
     * @param {string} attrlist - The list of attributes as a String.
     * @param {object} [opts={}] - An optional plain object of options:
     *   - positional_attributes {string[]} - Array of attribute names to map positional args to.
     *   - sub_attributes {boolean} - Enables attribute substitution on attrlist.
     * @returns {Promise<object>} a plain object of parsed attributes.
     */
    parseAttributes(block: Block | Section, attrlist: string, opts?: object): Promise<object>;
    /** Shorthand for {@link createBlock} with context 'paragraph'. */
    createParagraph(parent: any, ...rest: any[]): Block;
    /** Shorthand for {@link createBlock} with context 'open'. */
    createOpenBlock(parent: any, ...rest: any[]): Block;
    /** Shorthand for {@link createBlock} with context 'example'. */
    createExampleBlock(parent: any, ...rest: any[]): Block;
    /** Shorthand for {@link createBlock} with context 'pass'. */
    createPassBlock(parent: any, ...rest: any[]): Block;
    /** Shorthand for {@link createBlock} with context 'listing'. */
    createListingBlock(parent: any, ...rest: any[]): Block;
    /** Shorthand for {@link createBlock} with context 'literal'. */
    createLiteralBlock(parent: any, ...rest: any[]): Block;
    /** Shorthand for {@link createInline} with context 'anchor'. */
    createAnchor(parent: any, ...rest: any[]): Inline;
    /** Shorthand for {@link createInline} with context 'quoted'. */
    createInlinePass(parent: any, ...rest: any[]): Inline;
}
/**
 * Preprocessors are run after the source text is split into lines and
 * normalised, but before parsing begins.
 *
 * Asciidoctor passes the document and the document's Reader to the process
 * method of the Preprocessor instance. The Preprocessor can modify the Reader
 * as necessary and either return the same Reader (or falsy) or a substitute Reader.
 *
 * Implementations must extend Preprocessor.
 */
export class Preprocessor extends Processor {
    process(_document: any, _reader: any): void;
}
export namespace Preprocessor {
    export { DocumentProcessorDsl as DSL };
}
/**
 * TreeProcessors are run on the Document after the source has been
 * parsed into an abstract syntax tree (AST).
 *
 * Implementations must extend TreeProcessor.
 */
export class TreeProcessor extends Processor {
    process(_document: any): void;
}
export namespace TreeProcessor {
    export { DocumentProcessorDsl as DSL };
}
/** @deprecated Alias for {@link TreeProcessor} kept for backwards compatibility. */
export const Treeprocessor: typeof TreeProcessor;
/**
 * Postprocessors are run after the document is converted, but before
 * it is written to the output stream.
 *
 * Implementations must extend Postprocessor.
 */
export class Postprocessor extends Processor {
    process(_document: any, _output: any): void;
}
export namespace Postprocessor {
    export { DocumentProcessorDsl as DSL };
}
/**
 * IncludeProcessors handle include::<target>[] directives.
 *
 * Implementations must extend IncludeProcessor.
 */
export class IncludeProcessor extends Processor {
    process(_document: any, _reader: any, _target: any, _attributes: any): void;
    handles(_doc: any, _target: any): boolean;
}
export namespace IncludeProcessor {
    export { IncludeProcessorDsl as DSL };
}
/**
 * DocinfoProcessors add additional content to the header and/or footer
 * of the generated document.
 *
 * Implementations must extend DocinfoProcessor.
 */
export class DocinfoProcessor extends Processor {
    process(_document: any): void;
}
export namespace DocinfoProcessor {
    export { DocinfoProcessorDsl as DSL };
}
/**
 * BlockProcessors handle delimited blocks and paragraphs with a custom name.
 *
 * Implementations must extend BlockProcessor.
 */
export class BlockProcessor extends Processor {
    constructor(name?: any, config?: {});
    name: any;
    process(_parent: any, _reader: any, _attributes: any): void;
}
export namespace BlockProcessor {
    export { BlockProcessorDsl as DSL };
}
/**
 * @internal Base class shared by BlockMacroProcessor and InlineMacroProcessor.
 */
export class MacroProcessor extends Processor {
    constructor(name?: any, config?: {});
    name: any;
    process(_parent: any, _target: any, _attributes: any): void;
}
/**
 * BlockMacroProcessors handle block macros with a custom name.
 *
 * Implementations must extend BlockMacroProcessor.
 */
export class BlockMacroProcessor extends MacroProcessor {
    _name: any;
}
export namespace BlockMacroProcessor {
    export { MacroProcessorDsl as DSL };
}
/**
 * InlineMacroProcessors handle inline macros with a custom name.
 *
 * Implementations must extend InlineMacroProcessor.
 */
export class InlineMacroProcessor extends MacroProcessor {
    static rxCache: Map<any, any>;
    /**
     * Look up (and memoize) the regexp for this inline macro processor.
     *
     * @returns {RegExp}
     */
    get regexp(): RegExp;
    resolveRegexp(name: any, format: any): any;
}
export namespace InlineMacroProcessor {
    export { InlineMacroProcessorDsl as DSL };
}
/**
 * Proxy that encapsulates the extension kind, config, and instance.
 * This is what gets stored in the extension registry when activated.
 */
export class Extension {
    constructor(kind: any, instance: any, config: any);
    kind: any;
    instance: any;
    config: any;
}
/**
 * Specialisation of Extension that additionally stores a reference
 * to the process method, accommodating both class-based processors and function blocks.
 */
export class ProcessorExtension extends Extension {
    processMethod: any;
}
/**
 * A Group registers one or more extensions with a Registry.
 *
 * Subclass Group and pass the subclass to Extensions.register(), or call
 * the static register() method directly.
 */
export class Group {
    static register(name?: any): void;
    activate(_registry: any): void;
}
/**
 * The primary entry point into the extension system.
 *
 * Registry holds the extensions which have been registered and activated, has
 * methods for registering or defining a processor and looks up extensions
 * stored in the registry during parsing.
 */
export class Registry {
    constructor(groups?: {});
    groups: {};
    /**
     * Activate all global extension Groups and the Groups associated with this registry.
     *
     * @param {Document} document - The Document on which the extensions are to be used.
     * @returns {Registry} this Registry.
     */
    activate(document: Document): Registry;
    document: any;
    /**
     * Register a Preprocessor with the extension registry.
     *
     * The processor may be:
     *   - A Preprocessor subclass (constructor function)
     *   - An instance of a Preprocessor subclass
     *   - A Function that configures the processor via the DSL (block style)
     *
     * @example
     * // class style
     * preprocessor(FrontMatterPreprocessor)
     * // instance style
     * preprocessor(new FrontMatterPreprocessor())
     * // block style
     * preprocessor(function () {
     *   this.process(function (doc, reader) { ... })
     * })
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    preprocessor(...args: any[]): ProcessorExtension;
    /**
     * Return the registered Preprocessor extensions, or null if none.
     *
     * @returns {ProcessorExtension[]|null}
     */
    preprocessors(): ProcessorExtension[] | null;
    /**
     * Check whether any Preprocessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasPreprocessors(): boolean;
    /** @internal Core API compatibility alias for preprocessors(). */
    get preprocessor_extensions(): any;
    /**
     * Register a TreeProcessor with the extension registry.
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    treeProcessor(...args: any[]): ProcessorExtension;
    /** @deprecated Alias for {@link treeProcessor}. */
    treeprocessor(...args: any[]): ProcessorExtension;
    /** Alias for {@link treeProcessor} (snake_case for prefer() / Registry method dispatch). */
    tree_processor(...args: any[]): ProcessorExtension;
    /**
     * Return the registered TreeProcessor extensions, or null if none.
     *
     * @returns {ProcessorExtension[]|null}
     */
    treeProcessors(): ProcessorExtension[] | null;
    /**
     * Check whether any TreeProcessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasTreeProcessors(): boolean;
    /** @deprecated Typo alias kept for backward compatibility. Use {@link hasTreeProcessors}. */
    hasTeeProcessors(): boolean;
    /** @deprecated Alias for {@link treeProcessors}. */
    treeprocessors(): any;
    /** @internal Core API compatibility alias for treeProcessors(). */
    get tree_processor_extensions(): any;
    /**
     * Register a Postprocessor with the extension registry.
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    postprocessor(...args: any[]): ProcessorExtension;
    /**
     * Return the registered Postprocessor extensions, or null if none.
     *
     * @returns {ProcessorExtension[]|null}
     */
    postprocessors(): ProcessorExtension[] | null;
    /**
     * Check whether any Postprocessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasPostprocessors(): boolean;
    /** @internal Core API compatibility alias for postprocessors(). */
    get postprocessor_extensions(): any;
    /**
     * Register an IncludeProcessor with the extension registry.
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    includeProcessor(...args: any[]): ProcessorExtension;
    /**
     * Return the registered IncludeProcessor extensions, or null if none.
     *
     * @returns {ProcessorExtension[]|null}
     */
    includeProcessors(): ProcessorExtension[] | null;
    /**
     * Check whether any IncludeProcessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasIncludeProcessors(): boolean;
    /** Alias for {@link includeProcessor} (snake_case for prefer() / Registry method dispatch). */
    include_processor(...args: any[]): ProcessorExtension;
    /** @internal Core API compatibility alias for includeProcessors(). */
    get include_processor_extensions(): any;
    /**
     * Register a DocinfoProcessor with the extension registry.
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    docinfoProcessor(...args: any[]): ProcessorExtension;
    /**
     * Check whether any DocinfoProcessor extensions have been registered.
     *
     * @param {string|null} [location=null] - Optional location ('head' or 'footer') to filter by.
     * @returns {boolean}
     */
    hasDocinfoProcessors(location?: string | null): boolean;
    /**
     * Retrieve Extension proxy objects for DocinfoProcessor instances.
     *
     * @param {string|null} [location=null] - Optional location ('head' or 'footer') to filter by.
     * @returns {ProcessorExtension[]} array of Extension proxy objects.
     */
    docinfoProcessors(location?: string | null): ProcessorExtension[];
    /** Alias for {@link docinfoProcessor} (snake_case for prefer() / Registry method dispatch). */
    docinfo_processor(...args: any[]): ProcessorExtension;
    /** @internal Core API compatibility alias for docinfoProcessors(). */
    get docinfo_processor_extensions(): any;
    /**
     * Register a BlockProcessor with the extension registry.
     *
     * @example
     * // class style
     * block(ShoutBlock)
     * // class style with explicit name
     * block(ShoutBlock, 'shout')
     * // block style
     * block(function () {
     *   this.named('shout')
     *   this.process(function (parent, reader, attrs) { ... })
     * })
     * // block style with explicit name
     * block('shout', function () {
     *   this.process(function (parent, reader, attrs) { ... })
     * })
     *
     * @param {...*} args - Class constructor, instance, block function, or name + one of those.
     * @returns {ProcessorExtension} an Extension proxy object.
     */
    block(...args: any[]): ProcessorExtension;
    /**
     * Check whether any BlockProcessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasBlocks(): boolean;
    /**
     * Check whether a BlockProcessor is registered for the given name and context.
     *
     * @param {string} name - The block name.
     * @param {string} context - The block context.
     * @returns {ProcessorExtension|false} the Extension proxy or false.
     */
    registeredForBlock(name: string, context: string): ProcessorExtension | false;
    /**
     * Retrieve the Extension proxy for the BlockProcessor registered with the given name.
     *
     * @param {string} name - The block name.
     * @returns {ProcessorExtension|null}
     */
    findBlockExtension(name: string): ProcessorExtension | null;
    /**
     * Register a BlockMacroProcessor with the extension registry.
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    blockMacro(...args: any[]): ProcessorExtension;
    /** @deprecated Alias for {@link blockMacro}. */
    block_macro(...args: any[]): ProcessorExtension;
    /**
     * Check whether any BlockMacroProcessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasBlockMacros(): boolean;
    /**
     * Check whether a BlockMacroProcessor is registered for the given name.
     *
     * @param {string} name - The macro name.
     * @returns {ProcessorExtension|false}
     */
    registeredForBlockMacro(name: string): ProcessorExtension | false;
    /**
     * Retrieve the Extension proxy for the BlockMacroProcessor registered with the given name.
     *
     * @param {string} name - The macro name.
     * @returns {ProcessorExtension|null}
     */
    findBlockMacroExtension(name: string): ProcessorExtension | null;
    /**
     * Register an InlineMacroProcessor with the extension registry.
     *
     * @param {...*} args - Class constructor, instance, or block function.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    inlineMacro(...args: any[]): ProcessorExtension;
    /** @deprecated Alias for {@link inlineMacro}. */
    inline_macro(...args: any[]): ProcessorExtension;
    /**
     * Check whether any InlineMacroProcessor extensions have been registered.
     *
     * @returns {boolean}
     */
    hasInlineMacros(): boolean;
    /**
     * Check whether an InlineMacroProcessor is registered for the given name.
     *
     * @param {string} name - The macro name.
     * @returns {ProcessorExtension|false}
     */
    registeredForInlineMacro(name: string): ProcessorExtension | false;
    /**
     * Retrieve the Extension proxy for the InlineMacroProcessor registered with the given name.
     *
     * @param {string} name - The macro name.
     * @returns {ProcessorExtension|null}
     */
    findInlineMacroExtension(name: string): ProcessorExtension | null;
    /**
     * Retrieve all InlineMacroProcessor Extension proxy objects.
     *
     * @returns {ProcessorExtension[]}
     */
    inlineMacros(): ProcessorExtension[];
    /**
     * Insert the document-processor Extension as the first of its kind in the extension registry.
     *
     * @example
     * registry.prefer('includeProcessor', function () {
     *   this.process(function (document, reader, target, attrs) { ... })
     * })
     *
     * @param {...*} args - A ProcessorExtension, or a method name followed by processor args.
     * @returns {ProcessorExtension} the Extension stored in the registry.
     */
    prefer(...args: any[]): ProcessorExtension;
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
    /**
     * @internal Normalise an args array to the expected number of values.
     *
     * Pops a trailing plain-object as options (or uses {}), then pads / trims
     * the remaining args to (expect - 1) elements, then appends the options object.
     * If expect === 1, returns just the options object.
     */
    _resolveArgs(args: any, expect: any): any;
    _asSymbol(name: any): string;
}
export namespace Extensions {
    /** @internal Generate a unique name for an anonymous extension group. */
    function generateName(): string;
    /** @internal Increment and return the global auto-id counter. */
    function nextAutoId(): number;
    /**
     * Return the plain Object that maps names to registered groups.
     *
     * @returns {object}
     */
    function groups(): object;
    /**
     * Create a new Registry, optionally pre-populated with a named block.
     *
     * @param {string|null} [name=null] - Optional name for the group; auto-generated if omitted.
     * @param {Function|null} [block=null] - Optional function to register as the group.
     * @returns {Registry}
     */
    function create(name?: string | null, block?: Function | null): Registry;
    /**
     * Register an extension Group that subsequently registers extensions.
     *
     * @example
     * Extensions.register(UmlExtensions)
     * Extensions.register('uml', UmlExtensions)
     * Extensions.register(function () { this.blockMacro('plantuml', PlantUmlBlock) })
     * Extensions.register('uml', function () { this.blockMacro('plantuml', PlantUmlBlock) })
     *
     * @param {...*} args - Optional name followed by a Group class, instance, or function.
     * @returns {Function|object} the registered group.
     */
    function register(...args: any[]): Function | object;
    /**
     * Unregister all statically-registered extension groups.
     */
    function unregisterAll(): void;
    /**
     * Unregister statically-registered extension groups by name.
     *
     * @param {...string} names - One or more group names to unregister.
     */
    function unregister(...names: string[]): void;
    /** @internal Build a subclass of BaseClass with the given prototype functions. */
    function _buildProcessorClass(BaseClass: any, name: any, functions: any, ...args: any[]): {
        new (): {
            [x: string]: any;
        };
        [x: string]: any;
        readonly name: any;
    };
    /**
     * Create a Preprocessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof Preprocessor}
     */
    function createPreprocessor(name?: string, functions?: object, ...args: any[]): typeof Preprocessor;
    /**
     * Create and return a new Preprocessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {Preprocessor}
     */
    function newPreprocessor(name?: string, functions?: object, ...args: any[]): Preprocessor;
    /**
     * Create a TreeProcessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof TreeProcessor}
     */
    function createTreeProcessor(name?: string, functions?: object, ...args: any[]): typeof TreeProcessor;
    /**
     * Create and return a new TreeProcessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {TreeProcessor}
     */
    function newTreeProcessor(name?: string, functions?: object, ...args: any[]): TreeProcessor;
    /**
     * Create a Postprocessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof Postprocessor}
     */
    function createPostprocessor(name?: string, functions?: object, ...args: any[]): typeof Postprocessor;
    /**
     * Create and return a new Postprocessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {Postprocessor}
     */
    function newPostprocessor(name?: string, functions?: object, ...args: any[]): Postprocessor;
    /**
     * Create an IncludeProcessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof IncludeProcessor}
     */
    function createIncludeProcessor(name?: string, functions?: object, ...args: any[]): typeof IncludeProcessor;
    /**
     * Create and return a new IncludeProcessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {IncludeProcessor}
     */
    function newIncludeProcessor(name?: string, functions?: object, ...args: any[]): IncludeProcessor;
    /**
     * Create a DocinfoProcessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof DocinfoProcessor}
     */
    function createDocinfoProcessor(name?: string, functions?: object, ...args: any[]): typeof DocinfoProcessor;
    /**
     * Create and return a new DocinfoProcessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {DocinfoProcessor}
     */
    function newDocinfoProcessor(name?: string, functions?: object, ...args: any[]): DocinfoProcessor;
    /**
     * Create a BlockProcessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof BlockProcessor}
     */
    function createBlockProcessor(name?: string, functions?: object, ...args: any[]): typeof BlockProcessor;
    /**
     * Create and return a new BlockProcessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {BlockProcessor}
     */
    function newBlockProcessor(name?: string, functions?: object, ...args: any[]): BlockProcessor;
    /**
     * Create an InlineMacroProcessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof InlineMacroProcessor}
     */
    function createInlineMacroProcessor(name?: string, functions?: object, ...args: any[]): typeof InlineMacroProcessor;
    /**
     * Create and return a new InlineMacroProcessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {InlineMacroProcessor}
     */
    function newInlineMacroProcessor(name?: string, functions?: object, ...args: any[]): InlineMacroProcessor;
    /**
     * Create a BlockMacroProcessor subclass with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {typeof BlockMacroProcessor}
     */
    function createBlockMacroProcessor(name?: string, functions?: object, ...args: any[]): typeof BlockMacroProcessor;
    /**
     * Create and return a new BlockMacroProcessor instance with the given prototype functions.
     *
     * @param {string} [name] - Optional class name.
     * @param {object} [functions] - Methods to mix into the prototype.
     * @returns {BlockMacroProcessor}
     */
    function newBlockMacroProcessor(name?: string, functions?: object, ...args: any[]): BlockMacroProcessor;
}
import { Section } from './section.js';
import { Block } from './block.js';
import { List } from './list.js';
import { ListItem } from './list.js';
import { Inline } from './inline.js';
import { Reader } from './reader.js';
