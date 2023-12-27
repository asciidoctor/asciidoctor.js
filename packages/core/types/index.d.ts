/// <reference types="node" />
// TypeScript Version: 3.7
type Author = Document.Author;
type Title = Document.Title;
type TitleOptions = Document.Title.Options;
type Registry = Extensions.Registry;
type Cursor = Reader.Cursor;

declare class OpalKlass<T> {
  $new(...params: any[]): T;
}

interface Runtime {
  ioModule: string | 'node';
  platform: string | 'node';
  engine: string | 'v8';
  framework: string;
}

export class Reader implements Logging {
  /**
   * Push source onto the front of the reader and switch the context based on the file, document-relative path and line information given.
   *
   * This method is typically used in an IncludeProcessor to add source read from the target specified.
   *
   * @param data - data
   * @param file - file
   * @param path - path
   * @param lineno - line number
   * @param attributes - a JSON of attributes
   * @returns this {Reader} object.
   */
  pushInclude(data: string | string[], file?: string, path?: string, lineno?: number, attributes?: object): Reader;

  /**
   * Get the current location of the reader's cursor, which encapsulates the file, dir, path, and lineno of the file being read.
   */
  getCursor(): Cursor;

  /**
   * Get the remaining unprocessed lines, without consuming them, as an {Array} of {string}.
   *
   * Lines will not be consumed from the Reader (ie. you will be able to read these lines again).
   *
   * @returns the remaining unprocessed lines as an Array of String.
   */
  getLines(): string[];

  /**
   * Get the remaining unprocessed lines, without consuming them, as a String.
   *
   * Lines will not be consumed from the Reader (ie. you will be able to read these lines again).
   *
   * @returns the remaining unprocessed lines as a String (joined by linefeed characters).
   */
  getString(): string;

  /**
   * Check whether there are any lines left to read.
   * If a previous call to this method resulted in a value of false, immediately returned the cached value.
   * Otherwise, delegate to peekLine to determine if there is a next line available.
   *
   * @returns true if there are more lines, false if there are not.
   */
  hasMoreLines(): boolean;

  /**
   * Check whether this reader is empty (contains no lines).
   *
   * @returns true if there are no more lines to peek, otherwise false.
   */
  isEmpty(): boolean;

  /**
   * Peek at the next line.
   * Processes the line if not already marked as processed, but does not consume it (ie. you will be able to read this line again).
   *
   * This method will probe the reader for more lines.
   * If there is a next line that has not previously been visited, the line is passed to the Reader#processLine method to be initialized.
   * This call gives sub-classes the opportunity to do preprocessing.
   * If the return value of the Reader#processLine is undefined, the data is assumed to be changed and Reader#peekLine is invoked again to perform further processing.
   *
   * If hasMoreLines is called immediately before peekLine, the direct flag is implicitly true (since the line is flagged as visited).
   *
   * @param direct - A {boolean} flag to bypasses the check for more lines and immediately returns the first element of the internal lines {Array}. (default: false)
   * @returns the next line as a {string} if there are lines remaining.
   */
  peekLine(direct: boolean): string;

  /**
   * Consume, preprocess, and return the next line.
   *
   * Line will be consumed from the Reader (ie. you won't be able to read this line again).
   *
   * @returns the next line as a {string} if data is present.
   */
  readLine(): string;

  /**
   * Consume, preprocess, and return the remaining lines.
   *
   * This method calls Reader#readLine repeatedly until all lines are consumed and returns the lines as an {Array} of {string}.
   * This method differs from Reader#getLines in that it processes each line in turn, hence triggering any preprocessors implemented in sub-classes.
   *
   * Lines will be consumed from the Reader (ie. you won't be able to read these lines again).
   *
   * @returns the lines read as an {Array} of {string}.
   */
  readLines(): string[];

  /**
   * Consume, preprocess, and return the remaining lines joined as a {string}.
   *
   * Delegates to Reader#readLines, then joins the result.
   *
   * Lines will be consumed from the Reader (ie. you won't be able to read these lines again).
   *
   * @returns the lines read joined as a {string}
   */
  read(): string;

  /**
   * Advance to the next line by discarding the line at the front of the stack.
   * @returns a Boolean indicating whether there was a line to discard.
   */
  advance(): boolean;

  getLogger(): Logger;

  createLogMessage(text: string, context: any): LoggerMessage;
}

export namespace Reader {
  /**
   *
   */
  class Cursor {
    /**
     * @returns the file associated to the cursor
     */
    getFile(): string | undefined;

    /**
     * @returns the directory associated to the cursor
     */
    getDirectory(): string | undefined;

    /**
     * @returns the path associated to the cursor (or '<stdin>')
     */
    getPath(): string | undefined;

    /**
     * Get the line number of the cursor.
     * @returns the line number of the cursor
     */
    getLineNumber(): number | undefined;
  }
}

export namespace SafeMode {
  /**
   * A safe mode level that disables any of the security features enforced by
   */
  const UNSAFE: number;

  /**
   * A safe mode level that closely parallels safe mode in AsciiDoc.
   * This value prevents access to files which reside outside of the parent directory of the source file and disables any macro other than the include::[] directive.
   */
  const SAFE: number;

  /**
   * A safe mode level that disallows the document from setting attributes that would affect the conversion of the document,
   * in addition to all the security features of {SafeMode.SAFE}.
   * For instance, this level forbids changing the backend or source-highlighter using an attribute defined in the source document header.
   * This is the most fundamental level of security for server deployments (hence the name).
   */
  const SERVER: number;

  /**
   * A safe mode level that disallows the document from attempting to read files from the file system and including the contents of them into the document,
   *  in additional to all the security features of SafeMode.SERVER}.
   *  For instance, this level disallows use of the include::[] directive and the embedding of binary content (data uri), stylesheets and JavaScripts referenced by the document.
   *  (Asciidoctor and trusted extensions may still be allowed to embed trusted content into the document).
   *  Since Asciidoctor is aiming for wide adoption, this level is the default and is recommended for server deployments.
   */
  const SECURE: number;

  /**
   * @param name - the name of the security level
   * @returns the integer value of the corresponding security level.
   */
  function getValueForName(name: string): number;

  /**
   * @param value - the integer value of the security level
   * @returns the name of the corresponding security level.
   */
  function getNameForValue(value: number): string | undefined;

  /**
   * @returns the String {Array} of security levels.
   */
  function getNames(): string[];
}

interface Callout {
  [key: string]: any;

  id?: string;
  ordinal?: number;
}

/**
 * Maintains a catalog of callouts and their associations.
 */
export class Callouts {
  /**
   * Create a new Callouts.
   * @returns a new Callouts
   */
  static create(): Callouts;

  /**
   * Register a new callout for the given list item ordinal.
   * Generates a unique id for this callout based on the index of the next callout list in the document and the index of this callout since the end of the last callout list.
   *
   * @param ordinal - the Integer ordinal (1-based) of the list item to which this callout is to be associated
   * @returns The unique String id of this callout
   * @example
   *  callouts = asciidoctor.Callouts.create()
   *  callouts.register(1)
   *  // => "CO1-1"
   *  callouts.nextList()
   *  callouts.register(2)
   *  // => "CO2-1"
   */
  register(ordinal: number): string;

  /**
   * Get the next callout index in the document.
   *
   * Reads the next callout index in the document and advances the pointer.
   * This method is used during conversion to retrieve the unique id of the callout that was generated during parsing.
   *
   * @returns The unique String id of the next callout in the document
   */
  readNextId(): string;

  /**
   *
   */
  getLists(): Callout[][];

  /**
   *
   */
  getListIndex(): number;

  /**
   * et a space-separated list of callout ids for the specified list item.
   * @param ordinal - the Integer ordinal (1-based) of the list item for which to retrieve the callouts
   * @returns a space-separated String of callout ids associated with the specified list item
   */
  getCalloutIds(ordinal: number): string;

  /**
   * The current list for which callouts are being collected.
   * @returns The Array of callouts at the position of the list index pointer
   */
  getCurrentList(): any[];

  /**
   * Advance to the next callout list in the document.
   */
  nextList(): void;

  /**
   * Rewind the list index pointer, intended to be used when switching from the parsing to conversion phase.
   */
  rewind(): void;
}

/**
 * Logger
 */
interface LoggerFormatterFunction {
  postConstruct?: (this: LoggerFormatter) => any;
  call?: (this: LoggerFormatter, severity: string, time: Date, programName: string, message: string | RubyLoggerMessage) => string;
}

interface LoggerFunction {
  postConstruct?: (this: Logger) => any;
  add?: (this: Logger, severity: string, message: string | RubyLoggerMessage | undefined, programName: string) => void;
}

export namespace LoggerManager {
  function getLogger(): Logger;

  function setLogger(logger: Logger): void;

  function newLogger(name: string, functions: LoggerFunction): Logger;

  function newFormatter(name: string, functions: LoggerFormatterFunction): LoggerFormatter;
}

interface Writer {
  write(message: string | LoggerMessage): void;
}

interface BasicLogger {
  log(message: string | LoggerMessage): void;
}

declare class RubyLogger {
  $add(severity: string | number, message: string | LoggerMessage, programName?: string): any;

  add(severity: string | number, message: string | LoggerMessage, programName?: string): any;

  log(severity: string | number, message: string | LoggerMessage, programName?: string): any;

  debug(message: string): any;

  info(message: string): any;

  warn(message: string): any;

  error(message: string): any;

  fatal(message: string): any;

  isDebugEnabled(): boolean;

  isInfoEnabled(): boolean;

  isWarnEnabled(): boolean;

  isErrorEnabled(): boolean;

  isFatalEnabled(): boolean;
}

export class Logger extends RubyLogger {
  [key: string]: any;

  formatter: LoggerFormatter;

  getMaxSeverity(): undefined | number;

  getFormatter(): LoggerFormatter;

  setFormatter(formatter: LoggerFormatter): any;

  getLevel(): number;

  setLevel(level: number): any;

  getProgramName(): string;

  setProgramName(programName: string): any;
}

export class MemoryLogger extends Logger {
  /**
   * Create a new MemoryLogger.
   * @returns a new MemoryLogger
   */
  static create(): MemoryLogger;

  getMessages(): LoggerMessage[];
}

export class NullLogger extends Logger {
  /**
   * Create a new NullLogger.
   * @returns a new NullLogger
   */
  static create(): NullLogger;

  getMaxSeverity(): undefined | number;
}

export class LoggerFormatter {
  call(severity: string, time: Date, programName: string, message: string): string;
}

interface Logging {
  getLogger(): Logger;

  createLogMessage(text: string, context: any): LoggerMessage;
}

export namespace LoggerSeverity {
  function get(severity: string): number;
}

interface RubyLoggerMessage {
  message: string;
  source_location: SourceLocation;
  text: string;
}

export class LoggerMessage implements RubyLoggerMessage {
  message: string;
  source_location: SourceLocation;
  text: string;

  getText(): string;

  getSeverity(): string;

  getSourceLocation(): SourceLocation;
}

interface SourceLocation {
  getLineNumber(): number;

  getFile(): undefined | string;

  getDirectory(): string;

  getPath(): string;
}

export class Timings {
  /**
   * Create a new Timings.
   * @returns a Timings
   */
  static create(): Timings;

  /**
   * Print a report to the specified output.
   * The report will include:
   * - the time to read and parse source
   * - the time to convert document
   * - the total time (read, parse and convert)
   * @param to - an optional output (by default stdout)
   * @param subject - an optional subject (usually the file name)
   */
  printReport(to?: Writer | BasicLogger | RubyLogger, subject?: string): void;
}

export namespace Document {
  /**
   * The Author class represents information about an author extracted from document attributes.
   */
  class Author {
    /**
     * @returns the author's full name
     */
    getName(): string | undefined;

    /**
     * @returns the author's first name
     */
    getFirstName(): string | undefined;

    /**
     * @returns the author's middle name (or undefined if the author has no middle name)
     */
    getMiddleName(): string | undefined;

    /**
     * @returns the author's last name
     */
    getLastName(): string | undefined;

    /**
     * @returns the author's initials (by default based on the author's name)
     */
    getInitials(): string | undefined;

    /**
     * @returns the author's email
     */
    getEmail(): string | undefined;
  }

  namespace Title {
    interface Options {
      partition?: boolean;
      sanitize?: boolean;
      use_fallback?: boolean;
    }
  }

  /**
   *
   */
  class Footnote {
    /**
     * @returns the footnote's index
     */
    getIndex(): number | undefined;

    /**
     * @returns the footnote's id
     */
    getId(): number | undefined;

    /**
     * @returns the footnote's text
     */
    getText(): string | undefined;
  }

  interface AttributeEntry {
    name: string;
    value: string;
    negate: boolean;
  }

  /**
   *
   */
  class ImageReference {
    /**
     * @returns the image's target
     */
    getTarget(): string;

    /**
     * @returns the image's directory (imagesdir attribute)
     */
    getImagesDirectory(): string | undefined;
  }

  /**
   * The Title class represents a partitioned title (i.e., title & subtitle).
   */
  class Title {
    getMain(): string;

    getCombined(): string;

    getSubtitle(): string;

    isSanitized(): boolean;

    hasSubtitle(): boolean;
  }

  class RevisionInfo {
    /**
     * Get the document revision date from document header (document attribute <code>revdate</code>).
     */
    getDate(): string;

    /**
     * Get the document revision number from document header (document attribute <code>revnumber</code>).
     */
    getNumber(): string;

    /**
     * Get the document revision remark from document header (document attribute <code>revremark</code>).
     * A short summary of changes in this document revision.
     */
    getRemark(): string;

    /**
     * @returns true if the revision info is empty (ie. not defined), otherwise false
     */
    isEmpty(): boolean;
  }
}

export namespace Image {
  interface Attributes {
    [key: string]: any;

    target: string;
    alt?: string;
    title?: string;
    caption?: string;
  }
}

interface Attributes {
  [key: string]: any;
}

export namespace Inline {
  interface Options {
    [key: string]: any;

    id?: string;
    type?: string;
    target?: string;
    attributes?: Attributes;
  }
}

export namespace Block {
  interface Options {
    [key: string]: any;

    content_model?: string;
    subs?: string | string[];
  }

  interface Attributes {
    attribute_entries?: Document.AttributeEntry[];
  }
}

interface Selector {
  [key: string]: any;
}

interface ParseAttributesOptions {
  [key: string]: any;

  positional_attributes?: string | string[];
  sub_attributes?: boolean;
}

interface Options {
  [key: string]: any;
}

interface ProcessorOptions {
  [key: string]: any;

  /**
   * Sets additional document attributes, which override equivalently-named attributes defined in the document unless the value ends with @.
   * Any number of built-in or user-defined attributes in one of the following formats:
   * - JSON: {'name': 'value'}
   * - Array:['name=value']
   * - String: 'name=value'
   */
  attributes?: Attributes | string[] | string;
  /**
   * Selects the converter to use (as registered with this keyword).
   */
  backend?: string;
  /**
   * Sets the base (aka working) directory containing the document and resources.
   */
  base_dir?: string;
  /**
   * If true, tells the parser to capture images and links in the reference table.
   * (Normally only IDs, footnotes and indexterms are included).
   * The reference table is available via the references property on the document AST object.
   * (Experimental).
   */
  catalog_assets?: boolean;
  /**
   * Sets the document type.
   */
  doctype?: string;
  /**
   * Overrides the extensions registry instance.
   * Instead of providing a JavaScript function containing extensions to register,
   * this option lets you replace the extension registry itself,
   * giving you complete control over how extensions are registered for this processor.
   */
  extension_registry?: Registry;
  /**
   * @deprecated Please use {@link ProcessorOptions#standalone}
   */
  header_footer?: boolean;
  /**
   * If true, add the document header and footer (i.e., framing) around the body content in the output.
   */
  standalone?: boolean;
  /**
   * If true, the processor will create the necessary output directories if they don’t yet exist.
   */
  mkdirs?: boolean;
  /**
   * If true, the source is parsed eagerly (i.e., as soon as the source is passed to the load or loadFile API).
   * If false, parsing is deferred until the parse method is explicitly invoked.
   */
  parse?: boolean;
  /**
   * Sets the safe mode.
   */
  safe?: string | number;
  /**
   * Keeps track of the file and line number for each parsed block.
   * (Useful for tooling applications where the association between the converted output and the source file is important).
   */
  sourcemap?: boolean;
  /**
   * An array of directories containing templates to be used instead of the default built-in templates.
   */
  template_dirs?: string[];
  /**
   * Capture time taken to read, parse, and convert document. Internal use only.
   */
  timings?: Timings;
  /**
   * Destination directory for output file(s), relative to base_dir.
   */
  to_dir?: string;
  /**
   * The name of the output file to write, or true to use the default output file (docname + outfilesuffix).
   */
  to_file?: boolean | string;
}

/**
 * @description
 * Extensions provide a way to participate in the parsing and converting
 * phases of the AsciiDoc processor or extend the AsciiDoc syntax.
 *
 * The various extensions participate in AsciiDoc processing as follows:
 *
 * 1. After the source lines are normalized, {{@link Extensions/Preprocessor}}s modify or replace
 *    the source lines before parsing begins. {{@link Extensions/IncludeProcessor}}s are used to
 *    process include directives for targets which they claim to handle.
 * 2. The Parser parses the block-level content into an abstract syntax tree.
 *    Custom blocks and block macros are processed by associated {{@link Extensions/BlockProcessor}}s
 *    and {{@link Extensions/BlockMacroProcessor}}s, respectively.
 * 3. {{@link Extensions/TreeProcessor}}s are run on the abstract syntax tree.
 * 4. Conversion of the document begins, at which point inline markup is processed
 *    and converted. Custom inline macros are processed by associated {InlineMacroProcessor}s.
 * 5. {{@link Extensions/Postprocessor}}s modify or replace the converted document.
 * 6. The output is written to the output stream.
 *
 * Extensions may be registered globally using the {Extensions.register} method
 * or added to a custom {Registry} instance and passed as an option to a single
 * Asciidoctor processor.
 *
 * @example
 * asciidoctor.Extensions.register(function () {
 *   this.block(function () {
 *     var self = this;
 *     self.named('shout');
 *     self.onContext('paragraph');
 *     self.process(function (parent, reader) {
 *       var lines = reader.getLines().map(function (l) { return l.toUpperCase(); });
 *       return this.createBlock(parent, 'paragraph', lines);
 *     });
 *   });
 * });
 */
export namespace Extensions {
  /**
   * Tree processor functions
   */
  interface TreeProcessorFunctions {
    postConstruct?: (this: TreeProcessorInstance) => any;
    initialize?: (this: TreeProcessorInstance, name: string, config: any) => void;
    process: (this: TreeProcessorInstance, parent: Document) => any;
  }

  interface TreeProcessorInstance extends TreeProcessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Include processor functions
   */
  interface IncludeProcessorFunctions {
    postConstruct?: (this: IncludeProcessorInstance) => any;
    initialize?: (this: IncludeProcessorInstance, name: string, config: any) => void;
    process: (this: IncludeProcessorInstance, document: Document, reader: Reader, target: string, attributes: any) => void;
  }

  interface IncludeProcessorInstance extends IncludeProcessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Postprocessor functions
   */
  interface PostprocessorFunctions {
    postConstruct?: (this: PostprocessorInstance) => any;
    initialize?: (this: PostprocessorInstance, name: string, config: any) => void;
    process: (this: PostprocessorInstance, document: Document, output: string) => any;
  }

  interface PostprocessorInstance extends Postprocessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Preprocessor functions
   */
  interface PreprocessorFunctions {
    postConstruct?: (this: PreprocessorInstance) => any;
    initialize?: (this: PreprocessorInstance, name: string, config: any) => void;
    process: (this: PreprocessorInstance, document: Document, reader: Reader) => any;
  }

  interface PreprocessorInstance extends Preprocessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Docinfo processor functions
   */
  interface DocinfoProcessorFunctions {
    postConstruct?: (this: DocinfoProcessorInstance) => any;
    initialize?: (this: DocinfoProcessorInstance, name: string, config: any) => void;
    process: (this: DocinfoProcessorInstance, parent: Document, reader: Reader) => any;
  }

  interface DocinfoProcessorInstance extends DocinfoProcessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Block processor functions
   */
  interface BlockProcessorFunctions {
    postConstruct?: (this: BlockProcessorInstance) => any;
    initialize?: (this: BlockProcessorInstance, name: string, config: any) => void;
    process: (this: BlockProcessorInstance, parent: Document, reader: Reader, attributes?: any) => any;
  }

  interface BlockProcessorInstance extends BlockProcessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Block macro functions
   */
  interface BlockMacroFunctions {
    postConstruct?: (this: BlockMacroProcessorInstance) => any;
    initialize?: (this: BlockMacroProcessorInstance, name: string, config: any) => void;
    process: (this: BlockMacroProcessorInstance, parent: Document, target: string, attributes?: any) => any;
  }

  interface BlockMacroProcessorInstance extends BlockMacroProcessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Inline macro functions
   */
  interface InlineMacroFunctions {
    postConstruct?: (this: InlineMacroProcessorInstance) => any;
    initialize?: (this: InlineMacroProcessorInstance, name: string, config: any) => void;
    process: (this: InlineMacroProcessorInstance, parent: Document, target: string, attributes?: any) => any;
  }

  interface InlineMacroProcessorInstance extends InlineMacroProcessor {
    [key: string]: any;

    super: (...params: any[]) => void;
  }

  /**
   * Create a new {@link Registry}.
   * @param [name] - An optional name
   * @param [block] - An optional block
   * @returns a {@link Registry}
   */
  function create(name?: string, block?: (this: Registry) => any): Registry;

  /**
   */
  function register(block?: (this: Registry) => any): void;

  /**
   * Get statically-registered extension groups.
   */
  function getGroups(): object;

  /**
   * Unregister all statically-registered extension groups.
   */
  function unregisterAll(): void;

  /**
   * Unregister the specified statically-registered extension groups.
   *
   * NOTE Opal cannot delete an entry from a Hash that is indexed by symbol, so
   * we have to resort to using low-level operations in this method.
   */
  function unregister(...names: string[]): void;

  /**
   * Create a postprocessor
   * @description this API is experimental and subject to change
   */
  function createPostprocessor(arg: string | PostprocessorFunctions): PostprocessorKlass;

  /**
   * Create a postprocessor
   * @description this API is experimental and subject to change
   */
  function createPostprocessor(name: string, functions: PostprocessorFunctions): PostprocessorKlass;

  /**
   * Create and instantiate a postprocessor
   * @description this API is experimental and subject to change
   */
  function newPostprocessor(arg: string | PostprocessorFunctions): Postprocessor;
  /**
   * Create and instantiate a postprocessor
   * @description this API is experimental and subject to change
   */
  function newPostprocessor(name: string, functions: PostprocessorFunctions): Postprocessor;

  /**
   * Create a preprocessor
   * @description this API is experimental and subject to change
   */
  function createPreprocessor(arg: string | PreprocessorFunctions): PreprocessorKlass;

  /**
   * Create a preprocessor
   * @description this API is experimental and subject to change
   */
  function createPreprocessor(name: string, functions: PreprocessorFunctions): PreprocessorKlass;

  /**
   * Create and instantiate a preprocessor
   * @description this API is experimental and subject to change
   */
  function newPreprocessor(arg: string | PreprocessorFunctions): Preprocessor;

  /**
   * Create and instantiate a preprocessor
   * @description this API is experimental and subject to change
   */
  function newPreprocessor(name: string, functions: PreprocessorFunctions): Preprocessor;

  /**
   * Create a tree processor
   * @description this API is experimental and subject to change
   */
  function createTreeProcessor(arg: string | TreeProcessorFunctions): TreeProcessorKlass;

  /**
   * Create a tree processor
   * @description this API is experimental and subject to change
   */
  function createTreeProcessor(name: string, functions: TreeProcessorFunctions): TreeProcessorKlass;

  /**
   * Create and instantiate a tree processor
   * @description this API is experimental and subject to change
   */
  function newTreeProcessor(arg: string | TreeProcessorFunctions): TreeProcessor;

  /**
   * Create and instantiate a tree processor
   * @description this API is experimental and subject to change
   */
  function newTreeProcessor(name: string, functions: TreeProcessorFunctions): TreeProcessor;

  /**
   * Create an include processor
   * @description this API is experimental and subject to change
   */
  function createIncludeProcessor(arg: string | IncludeProcessorFunctions): IncludeProcessorKlass;

  /**
   * Create an include processor
   * @description this API is experimental and subject to change
   */
  function createIncludeProcessor(name: string, functions: IncludeProcessorFunctions): IncludeProcessorKlass;

  /**
   * Create and instantiate an include processor
   * @description this API is experimental and subject to change
   */
  function newIncludeProcessor(arg: string | IncludeProcessorFunctions): IncludeProcessor;

  /**
   * Create and instantiate an include processor
   * @description this API is experimental and subject to change
   */
  function newIncludeProcessor(name: string, functions: IncludeProcessorFunctions): IncludeProcessor;

  /**
   * Create a Docinfo processor
   * @description this API is experimental and subject to change
   */
  function createDocinfoProcessor(arg: string | DocinfoProcessorFunctions): DocinfoProcessorKlass;

  /**
   * Create a Docinfo processor
   * @description this API is experimental and subject to change
   */
  function createDocinfoProcessor(name: string, functions: DocinfoProcessorFunctions): DocinfoProcessorKlass;

  /**
   * Create and instantiate a Docinfo processor
   * @description this API is experimental and subject to change
   */
  function newDocinfoProcessor(arg: string | DocinfoProcessorFunctions): DocinfoProcessor;

  /**
   * Create and instantiate a Docinfo processor
   * @description this API is experimental and subject to change
   */
  function newDocinfoProcessor(name: string, functions: DocinfoProcessorFunctions): DocinfoProcessor;

  /**
   * Create a block processor
   * @description this API is experimental and subject to change
   */
  function createBlockProcessor(arg: string | BlockProcessorFunctions): BlockProcessorKlass;

  /**
   * Create a block processor
   * @description this API is experimental and subject to change
   */
  function createBlockProcessor(name: string, functions: BlockProcessorFunctions): BlockProcessorKlass;

  /**
   * Create and instantiate a block processor
   * @description this API is experimental and subject to change
   */
  function newBlockProcessor(arg: string | BlockProcessorFunctions): BlockProcessor;

  /**
   * Create and instantiate a block processor
   * @description this API is experimental and subject to change
   */
  function newBlockProcessor(name: string, functions: BlockProcessorFunctions): BlockProcessor;

  /**
   * Create an inline macro processor
   * @description this API is experimental and subject to change
   */
  function createInlineMacroProcessor(arg: string | InlineMacroFunctions): InlineMacroProcessorKlass;

  /**
   * Create an inline macro processor
   * @description this API is experimental and subject to change
   */
  function createInlineMacroProcessor(name: string, functions: InlineMacroFunctions): InlineMacroProcessorKlass;

  /**
   * Create and instantiate an inline macro processor
   * @description this API is experimental and subject to change
   */
  function newInlineMacroProcessor(arg: string | InlineMacroFunctions): InlineMacroProcessor;

  /**
   * Create and instantiate an inline macro processor
   * @description this API is experimental and subject to change
   */
  function newInlineMacroProcessor(name: string, functions: InlineMacroFunctions): InlineMacroProcessor;

  /**
   * Create a block macro processor
   * @description this API is experimental and subject to change
   */
  function createBlockMacroProcessor(arg: string | BlockMacroFunctions): BlockMacroProcessorKlass;

  /**
   * Create a block macro processor
   * @description this API is experimental and subject to change
   */
  function createBlockMacroProcessor(name: string, functions: BlockMacroFunctions): BlockMacroProcessorKlass;

  /**
   * Create and instantiate a block macro processor
   * @description this API is experimental and subject to change
   */
  function newBlockMacroProcessor(arg: string | BlockMacroFunctions): BlockMacroProcessor;

  /**
   * Create and instantiate a block macro processor
   * @description this API is experimental and subject to change
   */
  function newBlockMacroProcessor(name: string, functions: BlockMacroFunctions): BlockMacroProcessor;

  class Registry {
    /**
     * Get extension groups.
     */
    getGroups(): any;

    unregisterAll(): void;

    unregister(...names: string[]): void;

    prefer(name: string, processor: any): void;

    block(name: string, processor: ((this: BlockProcessorDsl) => void | typeof BlockProcessorKlass | BlockProcessor)): void;
    block(processor: ((this: BlockProcessorDsl) => void) | typeof BlockProcessorKlass | BlockProcessor): void;

    inlineMacro(name: string, processor: ((this: InlineMacroProcessorDsl) => void) | typeof InlineMacroProcessorKlass | InlineMacroProcessor): void;
    inlineMacro(processor: ((this: InlineMacroProcessorDsl) => void) | typeof InlineMacroProcessorKlass | InlineMacroProcessor): void;

    blockMacro(name: string, processor: ((this: BlockMacroProcessorDsl) => void) | typeof BlockMacroProcessorKlass | BlockMacroProcessor): void;
    blockMacro(processor: ((this: BlockMacroProcessorDsl) => void) | typeof BlockMacroProcessorKlass | BlockMacroProcessor): void;

    includeProcessor(processor: ((this: IncludeProcessorDsl) => void) | typeof IncludeProcessorKlass | IncludeProcessor): void;

    treeProcessor(processor: ((this: TreeProcessorDsl) => void) | typeof TreeProcessorKlass | TreeProcessor): void;

    postprocessor(processor: ((this: PostprocessorDsl) => void) | typeof PostprocessorKlass | Postprocessor): void;

    preprocessor(processor: ((this: PreprocessorDsl) => void) | typeof PreprocessorKlass | Preprocessor): void;

    docinfoProcessor(processor: ((this: DocinfoProcessorDsl) => void) | typeof DocinfoProcessorKlass | DocinfoProcessor): void;

    /**
     * Checks whether any {{@link Extensions/Preprocessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/Preprocessor}} extensions are registered.
     */
    hasPreprocessors(): boolean;

    /**
     * Checks whether any {{@link Extensions/TreeProcessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/TreeProcessor}} extensions are registered.
     */
    hasTreeProcessors(): boolean;

    /**
     * Checks whether any {{@link Extensions/IncludeProcessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/IncludeProcessor}} extensions are registered.
     */
    hasIncludeProcessors(): boolean;

    /**
     * Checks whether any {{@link Extensions/Postprocessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/Postprocessor}} extensions are registered.
     */
    hasPostprocessors(): boolean;

    /**
     * Checks whether any {{@link Extensions/DocinfoProcessor}} extensions have been registered.
     *
     * @param location - A for selecting docinfo extensions at a given location (head or footer) (default: undefined)
     * @returns a {boolean} indicating whether any {{@link Extensions/DocinfoProcessor}} extensions are registered.
     */
    hasDocinfoProcessors(location?: string): boolean;

    /**
     * Checks whether any {{@link Extensions/BlockProcessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/BlockProcessor}} extensions are registered.
     */
    hasBlocks(): boolean;

    /**
     * Checks whether any {{@link Extensions/BlockMacroProcessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/BlockMacroProcessor}} extensions are registered.
     */
    hasBlockMacros(): boolean;

    /**
     * Checks whether any {{@link Extensions/InlineMacroProcessor}} extensions have been registered.
     *
     * @returns a {boolean} indicating whether any {{@link Extensions/InlineMacroProcessor}} extensions are registered.
     */
    hasInlineMacros(): boolean;

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/Preprocessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getPreprocessors(): Preprocessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/TreeProcessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getTreeProcessors(): TreeProcessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/IncludeProcessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getIncludeProcessors(): IncludeProcessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/Postprocessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getPostprocessors(): Postprocessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/DocinfoProcessor}} instances stored in this registry.
     *
     * @param location - A {string} for selecting docinfo extensions at a given location (head or footer) (default: undefined)
     * @returns an {array} of Extension proxy objects.
     */
    getDocinfoProcessors(location?: string): DocinfoProcessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/BlockProcessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getBlocks(): BlockProcessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/BlockMacroProcessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getBlockMacros(): BlockMacroProcessor[];

    /**
     * Retrieves the Extension proxy objects for all the {{@link Extensions/InlineMacroProcessor}} instances stored in this registry.
     *
     * @returns an {array} of Extension proxy objects.
     */
    getInlineMacros(): InlineMacroProcessor[];

    /**
     * Get any {{@link Extensions/InlineMacroProcessor}} extensions are registered to handle the specified inline macro name.
     *
     * @param name - the {string} inline macro name
     * @returns the Extension proxy object for the {{@link Extensions/InlineMacroProcessor}} that matches the inline macro name or undefined if no match is found.
     */
    getInlineMacroFor(name: string): InlineMacroProcessor | undefined;

    /**
     * Get any {{@link Extensions/BlockProcessor}} extensions are registered to handle the specified block name appearing on the specified context.
     * @param name - the {string} block name
     * @param context - the context of the block: paragraph, open... (optional)
     * @returns the Extension proxy object for the {{@link Extensions/BlockProcessor}} that matches the block name and context or undefined if no match is found.
     */
    getBlockFor(name: string, context?: string): BlockProcessor | undefined;

    /**
     * Get any {{@link Extensions/BlockMacroProcessor}} extensions are registered to handle the specified macro name.
     *
     * @param name - the {string} macro name
     * @returns the Extension proxy object for the {{@link Extensions/BlockMacroProcessor}} that matches the macro name or undefined if no match is found.
     */
    getBlockMacroFor(name: string): BlockMacroProcessor | undefined;
  }

  class Processor {
    constructor(config?: any);

    /**
     * Creates a list block node and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new list block.
     * @param context - The list context (e.g., ulist, olist, colist, dlist)
     * @param attrs - An object of attributes to set on this list block
     * @returns a {List}
     */
    createList(parent: AbstractBlock, context: string, attrs?: any): List;

    /**
     * Creates a list item node and links it to the specified parent.
     * @param parent - The parent {List} of this new list item block.
     * @param text - The text of the list item.
     * @returns a {ListItem}
     */
    createListItem(parent: List, text?: string): ListItem;

    /**
     * Creates an image block node and links it to the specified parent.
     * @param parent - The parent Block of this new image block.
     * @param attrs - A JSON of attributes
     * @param attrs.target - the target attribute to set the source of the image.
     * @param attrs.alt - the alt attribute to specify an alternative text for the image.
     * @param opts - A JSON of options
     * @returns an image {Block}
     */
    createImageBlock(parent: AbstractBlock, attrs: Image.Attributes, opts?: Block.Options): Block;

    /**
     * Creates a paragraph block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createParagraph(parent: AbstractBlock, source: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates an open block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createOpenBlock(parent: AbstractBlock, source?: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates an example block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createExampleBlock(parent: AbstractBlock, source: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates a pass block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createPassBlock(parent: AbstractBlock, source: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates a listing block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createListingBlock(parent: AbstractBlock, source: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates a literal block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createLiteralBlock(parent: AbstractBlock, source: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates a block and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param context - The context name
     * @param source - The source
     * @param attrs - An object of attributes to set on this block
     * @param opts - An object of options to set on this block
     */
    createBlock(parent: AbstractBlock, context: string, source: string | string[], attrs?: any, opts?: Block.Options): Block;

    /**
     * Creates an inline anchor and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param text - The text
     * @param opts - An object of options to set on this block
     * @returns an {Inline} anchor
     */
    createAnchor(parent: AbstractBlock, text: string, opts?: Inline.Options): Inline;

    /**
     * Creates an inline pass and links it to the specified parent.
     * @param parent - The parent Block (Block, Section, or Document) of this new block.
     * @param text - The text
     * @param opts - An object of options to set on this block
     * @returns an {Inline} pass
     */
    createInlinePass(parent: AbstractBlock, text: string, opts?: Inline.Options): Inline;

    /**
     * Creates an inline node and links it to the specified parent.
     * @param parent - The parent Block of this new inline node.
     * @param context - The context name
     * @param text - The text
     * @param opts - A JSON of options
     * @returns an {Inline} node
     */
    createInline(parent: AbstractBlock, context: string, text: string, opts?: Inline.Options): Inline;

    /**
     * Parses blocks in the content and attaches the block to the parent.
     * @param parent - the parent block
     * @param content - the content
     * @param attrs - an object of attributes
     * @returns The parent node into which the blocks are parsed.
     */
    parseContent(parent: AbstractBlock, content: string | string[], attrs?: any): AbstractNode;

    /**
     * Parses the attrlist String into a JSON of attributes
     * @param block - the current AbstractBlock or the parent AbstractBlock if there is no current block (used for applying subs)
     * @param attrlist - the list of attributes as a String
     * @param opts - an optional JSON of options to control processing:
     * - positional_attributes: an Array of attribute names to map positional arguments to (optional, default: [])
     * - sub_attributes: enables attribute substitution on the attrlist argument (optional, default: false)
     * @returns a JSON of parsed attributes
     */
    parseAttributes(block: AbstractBlock, attrlist: string, opts?: ParseAttributesOptions): Attributes;

    /**
     * Get the configuration JSON for this processor instance.
     */
    getConfig(): Options;
  }

  class ProcessorDsl {
    option(key: string, value: any): void;
  }

  class MacroProcessor extends Processor {
    constructor(name?: string, config?: any);

    getName(): string;

    process(parent: Document, target: string, attributes?: any): any;
  }

  class BlockProcessor extends Processor {
    constructor(name?: string, config?: any);

    getName(): string;

    process(parent: Document, reader: Reader, attributes?: any): any;
  }

  class BlockMacroProcessor extends MacroProcessor {
  }

  class InlineMacroProcessor extends MacroProcessor {
  }

  class InlineMacroProcessorDsl extends MacroProcessorDsl {
    parseContentAs(value: string): void;

    matchFormat(value: string): void;

    match(value: RegExp): void;

    process(block: (this: InlineMacroProcessor, parent: Document, target: string, attributes: any) => void): void;
  }

  class IncludeProcessor {
    process(this: IncludeProcessor, document: Document, reader: Reader, target: string, attributes: any): void;
  }

  class TreeProcessor extends Processor {
    process(this: TreeProcessor, document: Document): any;
  }

  class Postprocessor extends Processor {
    process(this: Postprocessor, document: Document, output: string): any;
  }

  class Preprocessor extends Processor {
    process(this: Preprocessor, document: Document, reader: Reader): any;
  }

  class DocinfoProcessor extends Processor {
    process(this: DocinfoProcessor, document: Document): any;
  }

  // OpalKlass
  class BlockProcessorKlass extends OpalKlass<BlockProcessor> {
  }

  class BlockMacroProcessorKlass extends OpalKlass<BlockMacroProcessor> {
  }

  class InlineMacroProcessorKlass extends OpalKlass<InlineMacroProcessor> {
  }

  class TreeProcessorKlass extends OpalKlass<TreeProcessor> {
  }

  class IncludeProcessorKlass extends OpalKlass<IncludeProcessor> {
  }

  class PostprocessorKlass extends OpalKlass<Postprocessor> {
  }

  class PreprocessorKlass extends OpalKlass<Preprocessor> {
  }

  class DocinfoProcessorKlass extends OpalKlass<DocinfoProcessor> {
  }

  // DSL
  abstract class SyntaxProcessorDsl extends ProcessorDsl {
    named(name: string): void;

    defaultAttributes(value: any): void;

    positionalAttributes(value: string[]): void;

    positionalAttributes(...value: string[]): void;

    /**
     * Specify how to resolve attributes.
     * @param [value] - A specification to resolve attributes.
     */
    resolveAttributes(value?: string | string[] | object | boolean): void;
  }

  class MacroProcessorDsl extends SyntaxProcessorDsl {
    /**
     * Specify how to resolve attributes.
     * @param [value] - A specification to resolve attributes.
     */
    resolveAttributes(value?: string | string[] | object | boolean): void;
  }

  class BlockProcessorDsl extends SyntaxProcessorDsl {
    onContext(context: string | string[]): void;

    onContexts(...contexts: string[]): void;

    parseContentAs(value: string): void;

    process(block: (this: BlockProcessor, parent: Document, reader: Reader, attributes: any) => void): void;
  }

  class BlockMacroProcessorDsl extends MacroProcessorDsl {
    parseContentAs(value: string): void;

    process(block: (this: BlockMacroProcessor, parent: Document, target: string, attributes: any) => void): void;
  }

  class IncludeProcessorDsl {
    process(block: (this: IncludeProcessor, document: Document, reader: Reader, target: string, attributes: any) => void): void;

    handles(block: (target: string) => boolean): void;

    prefer(): void;
  }

  class DocumentProcessorDsl {
    prefer(): void;
  }

  class TreeProcessorDsl extends DocumentProcessorDsl {
    process(block: (this: TreeProcessor, document: Document) => void): void;
  }

  class PostprocessorDsl extends DocumentProcessorDsl {
    process(block: (this: Postprocessor, document: Document, output: string) => void): void;
  }

  class PreprocessorDsl extends DocumentProcessorDsl {
    process(block: (this: Preprocessor, document: Document, reader: Reader) => void): void;
  }

  class DocinfoProcessorDsl extends DocumentProcessorDsl {
    atLocation(location: string): void;

    process(block: (this: DocinfoProcessor, document: Document) => void): void;
  }
}

/**
 * The {@link Document} class represents a parsed AsciiDoc document.
 *
 * Document is the root node of a parsed AsciiDoc document.<br/>
 * It provides an abstract syntax tree (AST) that represents the structure of the AsciiDoc document
 * from which the Document object was parsed.
 *
 * Although the constructor can be used to create an empty document object,
 * more commonly, you'll load the document object from AsciiDoc source
 * using the primary API methods on {@link Asciidoctor}.
 * When using one of these APIs, you almost always want to set the safe mode to 'safe' (or 'unsafe')
 * to enable all of Asciidoctor's features.
 *
 * <pre>
 *   var doc = load('= Hello, AsciiDoc!', { 'safe': 'safe' })
 *   // => Asciidoctor::Document { doctype: "article", doctitle: "Hello, AsciiDoc!", blocks: 0 }
 * </pre>
 *
 * Instances of this class can be used to extract information from the document or alter its structure.
 * As such, the Document object is most often used in extensions and by integrations.
 *
 * The most basic usage of the Document object is to retrieve the document's title.
 *
 * <pre>
 *  var source = '= Document Title'
 *  var doc = asciidoctor.load(source, { 'safe': 'safe' })
 *  console.log(doc.getTitle()) // 'Document Title'
 * </pre>
 *
 * You can also use the Document object to access document attributes defined in the header, such as the author and doctype.
 */
export class Document extends AbstractBlock {
  /**
   * Returns the SyntaxHighlighter associated with this document.
   *
   * @returns the {SyntaxHighlighter} associated with this document.
   */
  getSyntaxHighlighter(): SyntaxHighlighter;

  /**
   * Returns a JSON {Object} of references captured by the processor.
   *
   * @returns a JSON object of {AbstractNode} in the document.
   */
  getRefs(): any;

  /**
   * Returns an {Array} of {Document/ImageReference} captured by the processor.
   *
   * @returns an {Array} of {Document/ImageReference} in the document.
   * Will return an empty array if the option "catalog_assets: true" was not defined on the processor.
   */
  getImages(): Document.ImageReference[];

  /**
   * Returns an {Array} of links captured by the processor.
   *
   * @returns an {Array} of links in the document.
   * Will return an empty array if:
   * - the function was called before the document was converted
   * - the option "catalog_assets: true" was not defined on the processor
   */
  getLinks(): any[];

  /**
   * @returns true if the document has footnotes otherwise false
   */
  hasFootnotes(): boolean;

  /**
   * Returns an {Array} of {Document/Footnote} captured by the processor.
   *
   * @returns an {Array} of {Document/Footnote} in the document.
   * Will return an empty array if the function was called before the document was converted.
   */
  getFootnotes(): Document.Footnote[];

  /**
   * Returns the level-0 {Section} (i.e. the document title).
   * Only stores the title, not the header attributes.
   *
   * @returns the level-0 {Section}.
   */
  getHeader(): string;

  /**
   * @param [options] - a JSON of options to control processing (default: {})
   */
  convert(options?: object): string;

  /**
   * Write the output to the specified file.
   *
   * If the converter responds to "write", delegate the work of writing the file to that method.
   * Otherwise, write the output the specified file.
   */
  write(output: string, target: string): void;

  /**
   * @returns the full name of the author as a String
   */
  getAuthor(): string;

  getSource(): string;

  getSourceLines(): string[];

  isNested(): boolean;

  isEmbedded(): boolean;

  hasExtensions(): boolean;

  getDoctype(): string;

  getBackend(): string;

  isBasebackend(): boolean;

  /**
   * Return the document title as a {string}
   *
   * @returns the resolved document title as a {string} or undefined if a document title cannot be resolved
   */
  getTitle(): string | undefined;

  /**
   * Set the title on the document header
   *
   * Set the title of the document header to the specified value.
   * If the header does not exist, it is first created.
   *
   * @param title - the String title to assign as the title of the document header
   *
   * @returns the new String title assigned to the document header
   */
  setTitle(title: string): string;

  /**
   * Resolves the primary title for the document
   *
   * Searches the locations to find the first non-empty value:
   *
   * - document-level attribute named title
   * - header title (known as the document title)
   * - title of the first section
   * - document-level attribute named untitled-label (if use_fallback option is set)
   *
   * If no value can be resolved, undefined is returned.
   *
   * If the partition attribute is specified, the value is parsed into an {@link Document/Title} object.
   * If the sanitize attribute is specified, XML elements are removed from the value.
   *
   *
   * @returns the resolved title as a {@link Document/Title} if the partition option is passed
   * or a {string} if not or undefined if no value can be resolved.
   */
  getDocumentTitle(options?: TitleOptions): string | Title | undefined;

  /**
   * @see {@link Document#getDocumentTitle}
   */
  getDoctitle(options: TitleOptions): string | Title;

  /**
   * Get the document catalog JSON object.
   */
  getCatalog(): object;

  /**
   * @see Document#getCatalog
   */
  getReferences(): object;

  /**
   * Get the document revision date from document header (document attribute <code>revdate</code>).
   */
  getRevisionDate(): string | undefined;

  /**
   * @see Document#getRevisionDate
   */
  getRevdate(): string | undefined;

  /**
   * Get the document revision number from document header (document attribute <code>revnumber</code>).
   */
  getRevisionNumber(): string | undefined;

  /**
   * Get the document revision remark from document header (document attribute <code>revremark</code>).
   */
  getRevisionRemark(): string | undefined;

  /**
   *  Assign a value to the specified attribute in the document header.
   *
   *  The assignment will be visible when the header attributes are restored,
   *  typically between processor phases (e.g., between parse and convert).
   *
   * @param name - The attribute name to assign
   * @param value - The value to assign to the attribute (default: '')
   * @param overwrite - A {boolean} indicating whether to assign the attribute
   * if already present in the attributes Hash (default: true)
   *
   * @returns true if the assignment was performed otherwise false
   */
  setHeaderAttribute(name: string, value: any, overwrite: boolean): boolean;

  /**
   * Convenience method to retrieve the authors of this document as an {Array} of {Document/Author} objects.
   *
   * This method is backed by the author-related attributes on the document.
   *
   * @returns an {Array} of {Document/Author} objects.
   */
  getAuthors(): Author[];

  /**
   * @returns a {@link Document/RevisionInfo}
   */
  getRevisionInfo(): Document.RevisionInfo;

  /**
   * @returns true if the document contains revision info, otherwise false
   */
  hasRevisionInfo(): boolean;

  /**
   */
  getNotitle(): boolean;

  /**
   */
  getNoheader(): boolean;

  /**
   */
  getNofooter(): boolean;

  /**
   */
  hasHeader(): boolean;

  /**
   * Replay attribute assignments at the block level
   *
   * <i>This method belongs to an internal API that deals with how attributes are managed by the processor.</i>
   * If you understand why this group of methods are necessary, and what they do, feel free to use them.
   * <strong>However, keep in mind they are subject to change at any time.</strong>
   *
   * @param blockAttributes - a JSON of attributes
   */
  playbackAttributes(blockAttributes: Block.Attributes): void;

  /**
   * Delete the specified attribute from the document if the name is not locked.
   * If the attribute is locked, false is returned.
   * Otherwise, the attribute is deleted.
   *
   * @param name - the String attribute name
   *
   * @returns true if the attribute was deleted, false if it was not because it's locked
   */
  deleteAttribute(name: string): boolean;

  /**
   * Restore the attributes to the previously saved state (attributes in header).
   */
  restoreAttributes(): void;

  /**
   * Determine if the attribute has been locked by being assigned in document options.
   *
   * @param key - The attribute key to check
   *
   * @returns true if the attribute is locked, false otherwise
   */
  isAttributeLocked(key: string): boolean;

  /**
   * Parse the AsciiDoc source stored in the {Reader} into an abstract syntax tree.
   *
   * If the data parameter is not nil, create a new {PreprocessorReader} and assigned it to the reader property of this object.
   * Otherwise, continue with the reader that was created when the {Document} was instantiated.
   * Pass the reader to {Parser.parse} to parse the source data into an abstract syntax tree.
   *
   * If parsing has already been performed, this method returns without performing any processing.
   *
   * @param [data] - The optional replacement AsciiDoc source data as a String or String Array. (default: undefined)
   *
   * @returns this {Document}
   */
  parse(data?: string | string[]): Document;

  /**
   * Read the docinfo file(s) for inclusion in the document template
   *
   * If the docinfo1 attribute is set, read the docinfo.ext file.
   * If the docinfo attribute is set, read the doc-name.docinfo.ext file.
   * If the docinfo2 attribute is set, read both files in that order.
   *
   * @param location - The Symbol location of the docinfo (e.g., head, footer, etc). (default: head)
   * @param suffix   - The suffix of the docinfo file(s).
   * If not set, the extension will be set to the outfilesuffix. (default: undefined)
   *
   * @returns the contents of the docinfo file(s) or empty string if no files are found or the safe mode is secure or greater.
   */
  getDocinfo(location: string, suffix?: string): string;

  /**
   * @param [docinfoLocation] - A {string} for checking docinfo extensions at a given location (head or footer) (default: head)
   */
  hasDocinfoProcessors(docinfoLocation?: string): boolean;

  /**
   * Increment the specified counter and store it in the block's attributes.
   *
   * @param counterName - the String name of the counter attribute
   * @param block - the {Block} on which to save the counter
   *
   * @returns the next number in the sequence for the specified counter
   */
  incrementAndStoreCounter(counterName: string, block: Block): number;

  /**
   * Get the named counter and take the next number in the sequence.
   *
   * @param name - the String name of the counter
   * @param seed - the initial value as a String or Integer
   *
   * @returns the next number in the sequence for the specified counter
   */
  counter(name: string, seed: string | number): number;

  /**
   * A read-only integer value indicating the level of security that should be enforced while processing this document.
   * The value must be set in the Document constructor using the "safe" option.
   *
   * A value of 0 (UNSAFE) disables any of the security features enforced by
   *
   * A value of 1 (SAFE) closely parallels safe mode in AsciiDoc.
   * In particular, it prevents access to files which reside outside of the parent directory of the source file and disables any macro other than the include directive.
   *
   * A value of 10 (SERVER) disallows the document from setting attributes that would affect the conversion of the document,
   * in addition to all the security features of SafeMode.SAFE.
   * For instance, this level forbids changing the backend or source-highlighter using an attribute defined in the source document header.
   * This is the most fundamental level of security for server deployments (hence the name).
   *
   * A value of 20 (SECURE) disallows the document from attempting to read files from the file system and including the contents of them into the document,
   * in addition to all the security features of SafeMode.SECURE.
   * In particular, it disallows use of the include::[] directive and the embedding of binary content (data uri), stylesheets and JavaScripts referenced by the document.
   * (Asciidoctor and trusted extensions may still be allowed to embed trusted content into the document).
   *
   * Since Asciidoctor is aiming for wide adoption, 20 (SECURE) is the default value and is recommended for server deployments.
   *
   * A value of 100 (PARANOID) is planned to disallow the use of passthrough macros and prevents the document from setting any known attributes,
   * in addition to all the security features of SafeMode.SECURE.
   * Please note that this level is not currently implemented (and therefore not enforced)!
   *
   * @returns An integer value indicating the level of security
   */
  getSafe(): number;

  /**
   * Get the Boolean AsciiDoc compatibility mode.
   * Enabling this attribute activates the following syntax changes:
   *
   *   * single quotes as constrained emphasis formatting marks
   *   * single backticks parsed as inline literal, formatted as monospace
   *   * single plus parsed as constrained, monospaced inline formatting
   *   * double plus parsed as constrained, monospaced inline formatting
   */
  getCompatMode(): boolean;

  /**
   * Get the Boolean flag that indicates whether source map information should be tracked by the parser.
   */
  getSourcemap(): boolean;

  /**
   * Set the Boolean flag that indicates whether source map information should be tracked by the parser.
   */
  setSourcemap(value: boolean): void;

  /**
   * Get the JSON of document counters.
   */
  getCounters(): object;

  /**
   */
  getCallouts(): Callouts;

  /**
   * Get the String base directory for converting this document.
   *
   * Defaults to directory of the source file.
   * If the source is a string, defaults to the current directory.
   */
  getBaseDir(): string;

  /**
   * Get the JSON of resolved options used to initialize this {Document}.
   */
  getOptions(): any;

  /**
   * Get the outfilesuffix defined at the end of the header.
   */
  getOutfilesuffix(): string;

  /**
   * Get a reference to the parent {Document} of this nested document.
   */
  getParentDocument(): Document | undefined;

  /**
   * Get the {Reader} associated with this document.
   */
  getReader(): Reader;

  /**
   * Get the {Converter} instance being used to convert the current {Document}.
   */
  getConverter(): AbstractConverter;

  /**
   * Get the activated {Extensions.Registry} associated with this document.
   */
  getExtensions(): Registry;
}

type ContentModel = 'compound' | 'simple' | 'verbatim' | 'raw' | 'empty'

  /**
   */
 export class AbstractBlock extends AbstractNode {

    /**
     * Describes the type of content this block accepts and how it should be converted.
     * @returns the type of content this block accepts.
     */
    getContentModel(): ContentModel

    /**
     *  Set the type of content this block accepts. Acceptable values are:
     *  - compound - this block contains other blocks
     *  - simple - this block holds a paragraph of prose that receives normal substitutions
     *  - verbatim - this block holds verbatim text (displayed "as is") that receives verbatim substitutions
     *  - raw - this block holds unprocessed content passed directly to the output with no substitutions applied
     *  - empty - this block has no content
     * @param contentModel - the type of content
     */
    setContentModel(contentModel: ContentModel): void;

    /**
     * Append a block to this block's list of child blocks.
     * @param block - the block to append
     * @returns the parent block to which this block was appended.
     */
    append(block: AbstractBlock): AbstractBlock;

  /**
   * Get the String title of this Block with title substitions applied
   *
   * The following substitutions are applied to block and section titles:
   *
   * <code>specialcharacters</code>, <code>quotes</code>, <code>replacements</code>, <code>macros</code>, <code>attributes</code> and <code>post_replacements</code>
   *
   * @returns the converted String title for this Block, or undefined if the title is not set.
   * @example
   * block.title // "Foo 3^ # {two-colons} Bar(1)"
   * block.getTitle(); // "Foo 3^ # :: Bar(1)"
   */
  getTitle(): string | undefined;

  /**
   * Set the String block title.
   * @param title - The document title
   * @returns returns the new String title assigned to this Block.
   */
  setTitle(title: string | undefined): string;

  /**
   * Generate and assign caption to block if not already assigned.
   *
   * If the block has a title and a caption prefix is available for this block,
   * then build a caption from this information, assign it a number and store it
   * to the caption attribute on the block.
   *
   * If a caption has already been assigned to this block, do nothing.
   *
   * The parts of a complete caption are: `<prefix> <number>. <title>`
   * This partial caption represents the part the precedes the title.
   *
   * @param value - the String caption to assign to this block or nil to use document attribute.
   * @param captionContext - the String context to use when resolving caption-related attributes.
   * If not provided, the name of the context for this block is used. Only certain contexts allow the caption to be looked up.
   */
  assignCaption(value?: string, captionContext?: string): void;

  /**
   * Convenience method that returns the interpreted title of the Block
   * with the caption prepended.
   * Concatenates the value of this Block's caption instance variable and the
   * return value of this Block's title method. No space is added between the
   * two values. If the Block does not have a caption, the interpreted title is
   * returned.
   *
   * @returns the converted String title prefixed with the caption, or just the
   * converted String title if no caption is set
   */
  getCaptionedTitle(): string;

  /**
   * Get the style (block type qualifier) for this block.
   * @returns the style for this block
   */
  getStyle(): string;

  /**
   * Set the style for this block.
   * @param style - Style
   */
  setStyle(style: string): void;

  /**
   * Get the location in the AsciiDoc source where this block begins.
   * @returns the location in the AsciiDoc source where this block begins
   */
  getSourceLocation(): Cursor;

  /**
   * Get the caption for this block.
   * @returns the caption for this block
   */
  getCaption(): string | undefined;

  /**
   * Set the caption for this block.
   * @param caption - Caption
   */
  setCaption(caption: string): void;

  /**
   * Get the level of this section or the section level in which this block resides.
   * @returns he level (Integer) of this section
   */
  getLevel(): number;

  /**
   * Get the substitution keywords to be applied to the contents of this block.
   *
   * @returns the list of {string} substitution keywords associated with this block.
   */
  getSubstitutions(): string[];

  /**
   * Check whether a given substitution keyword is present in the substitutions for this block.
   *
   * @returns whether the substitution is present on this block.
   */
  hasSubstitution(): boolean;

  /**
   * Remove the specified substitution keyword from the list of substitutions for this block.
   *
   * @returns undefined
   */
  removeSubstitution(): any;

  /**
   * Checks if the {@link AbstractBlock} contains any child blocks.
   * @returns whether the {@link AbstractBlock} has child blocks.
   */
  hasBlocks(): boolean;

  /**
   * Get the list of {@link AbstractBlock} sub-blocks for this block.
   * @returns a list of {@link AbstractBlock} sub-blocks
   */
  getBlocks(): any[];

  /**
   * Get the converted result of the child blocks by converting the children appropriate to content model that this block supports.
   * @returns the converted result of the child blocks
   */
  getContent(): string|undefined;

  /**
   * Get the converted content for this block.
   * If the block has child blocks, the content method should cause them to be converted
   * and returned as content that can be included in the parent block's template.
   * @returns the converted String content for this block
   */
  convert(): string;

  /**
   * Query for all descendant block-level nodes in the document tree
   * that match the specified selector (context, style, id, and/or role).
   * If a function block is given, it's used as an additional filter.
   * If no selector or function block is supplied, all block-level nodes in the tree are returned.
   * @example
   * doc.findBy({'context': 'section'});
   * // => { level: 0, title: "Hello, AsciiDoc!", blocks: 0 }
   * // => { level: 1, title: "First Section", blocks: 1 }
   *
   * doc.findBy({'context': 'section'}, function (section) { return section.getLevel() === 1; });
   * // => { level: 1, title: "First Section", blocks: 1 }
   *
   * doc.findBy({'context': 'listing', 'style': 'source'});
   * // => { context: :listing, content_model: :verbatim, style: "source", lines: 1 }
   *
   * @returns a list of block-level nodes that match the filter or an empty list if no matches are found
   */
  findBy(selector: Selector | ((block: AbstractBlock) => boolean | string), block?: ((block: AbstractBlock) => boolean | string)): AbstractBlock[];

  /**
   * Get the source line number where this block started.
   * @returns the source line number where this block started
   */
  getLineNumber(): number;

  /**
   * Check whether this block has any child Section objects.
   * Only applies to Document and Section instances.
   * @returns true if this block has child Section objects, otherwise false
   */
  hasSections(): boolean;

  /**
   * Get the Array of child Section objects.
   * Only applies to Document and Section instances.
   * @returns an {Array} of {@link Section} objects
   */
  getSections(): Section[];

  /**
   * Get the numeral of this block (if section, relative to parent, otherwise absolute).
   * Only assigned to section if automatic section numbering is enabled.
   * Only assigned to formal block (block with title) if corresponding caption attribute is present.
   * If the section is an appendix, the numeral is a letter (starting with A).
   * @returns the numeral
   */
  getNumeral(): string;

  /**
   * Set the numeral of this block.
   * @param value - The numeral value
   */
  setNumeral(value: string): void;

  /**
   * A convenience method that checks whether the title of this block is defined.
   *
   * @returns a {boolean} indicating whether this block has a title.
   */
  hasTitle(): boolean;

  /**
   * Returns the converted alt text for this block image.
   *
   * @returns the {string} value of the alt attribute with XML special character and replacement substitutions applied.
   */
  getAlt(): string;
}

/**
 * @description
 * Methods for managing sections of AsciiDoc content in a document.
 *
 * @example
 * <pre>
 *   section = asciidoctor.Section.create()
 *   section.setTitle('Section 1')
 *   section.setId('sect1')
 *   section.getBlocks().length // 0
 *   section.getId() // "sect1"
 *   section.append(newBlock)
 *   section.getBlocks().length // 1
 * </pre>
 */
export class Section extends AbstractBlock {
  /**
   * Create a {Section} object.
   * @param [parent] - The parent AbstractBlock. If set, must be a Document or Section object (default: undefined)
   * @param [level] - The Integer level of this section (default: 1 more than parent level or 1 if parent not defined)
   * @param [numbered] - A Boolean indicating whether numbering is enabled for this Section (default: false)
   * @param [opts] - An optional JSON of options (default: {})
   *
   * @returns a new {Section} object
   */
  static create(parent?: AbstractBlock, level?: number, numbered?: boolean, opts?: object): Section;

  /**
   * Set the level of this section or the section level in which this block resides.
   * @param level - Level (Integer)
   */
  setLevel(level: number): void;

  /**
   * Get the 0-based index order of this section within the parent block.
   */
  getIndex(): number;

  /**
   * Set the 0-based index order of this section within the parent block.
   * @param index - The index order of this section
   */
  setIndex(index: number): void;

  /**
   * Get the section name of this section.
   */
  getSectionName(): string;

  /**
   * Set the section name of this section.
   * @param value - The section name
   */
  setSectionName(value: string): void;

  /**
   * Get the section number of this section.
   */
  getSectionNumeral(): string;

  // alias
  getSectionNumber(): string;

  /**
   * Get the flag to indicate whether this is a special section or a child of one.
   */
  isSpecial(): boolean;

  /**
   * Set the flag to indicate whether this is a special section or a child of one.
   * @param value - A flag to indicated if this is a special section
   */
  setSpecial(value: boolean): void;

  /**
   * Get the state of the numbered attribute at this section (need to preserve for creating TOC).
   */
  isNumbered(): boolean;

  /**
   * Get the caption for this section (only relevant for appendices).
   */
  getCaption(): string | undefined;

  /**
   * Get the name of the Section (title)
   * @see {@link AbstractBlock#getTitle}
   */
  getName(): string;
}

/**
 * Methods for managing inline elements in AsciiDoc block.
 */
export class Inline extends AbstractNode {
  /**
   * Create a new Inline element.
   * @returns a new Inline element
   */
  static create(parent: AbstractBlock, context: string, text?: string, opts?: Record<string, unknown>): Inline;

  /**
   * Get the converted content for this inline node.
   * @returns the converted String content for this inline node
   */
  convert(): string;

  /**
   * Get the converted String text of this Inline node, if applicable.
   * @returns the converted String text for this Inline node, or undefined if not applicable for this node.
   */
  getText(): string;

  /**
   * Get the String sub-type (aka qualifier) of this Inline node.
   *
   * This value is used to distinguish different variations of the same node
   * category, such as different types of anchors.
   *
   * @returns the string sub-type of this Inline node.
   */
  getType(): string;

  /**
   * Get the primary String target of this Inline node.
   *
   * @returns the string target of this Inline node.
   */
  getTarget(): string | undefined;

  /**
   * Returns the converted alt text for this inline image.
   *
   * @returns the {string} value of the alt attribute.
   */
  getAlt(): string;
}

/**
 * Methods for managing AsciiDoc content blocks.
 *
 * @example
 * block = Asciidoctor::Block.new(parent, :paragraph, source: '_This_ is a <test>')
 * block.content
 * => "<em>This</em> is a &lt;test&gt;"
 */
export class Block extends AbstractBlock {
  /**
   * Create a {Block} object.
   * @param parent - The parent {AbstractBlock} with a compound content model to which this {Block} will be appended.
   * @param context - The context name for the type of content (e.g., "paragraph").
   * @param [opts] - a JSON of options to customize block initialization: (default: {})
   * @param opts.content_model - indicates whether blocks can be nested in this {Block} ("compound"),
   * otherwise how the lines should be processed ("simple", "verbatim", "raw", "empty"). (default: "simple")
   * @param opts.attributes - a JSON of attributes (key/value pairs) to assign to this {Block}. (default: {})
   * @param opts.source - a String or {Array} of raw source for this {Block}. (default: undefined)
   *
   * IMPORTANT: If you don't specify the `subs` option, you must explicitly call the `commit_subs` method to resolve and assign the substitutions
   * to this block (which are resolved from the `subs` attribute, if specified, or the default substitutions based on this block's context).
   * If you want to use the default subs for a block, pass the option `subs: "default"`.
   * You can override the default subs using the `default_subs` option.
   *
   * @returns a new {Block} object
   */
  static create(parent: AbstractBlock, context: string, opts?: object): Block;

  /**
   * Get the source of this block.
   * @returns the String source of this block.
   */
  getSource(): string;

  /**
   * Get the source lines of this block.
   * @returns the String {Array} of source lines for this block.
   */
  getSourceLines(): string[];
}

/** Methods for managing AsciiDoc tables. */
export class Table extends AbstractBlock {
  /**
   * Create a new Table element.
   * @param parent - The parent {AbstractBlock}.
   * @param attributes - a JSON of attributes
   * @returns a new {Table} object
   */
  static create(parent: AbstractBlock, attributes: Attributes): Table;

  /**
   * Get the caption of the table.
   * @returns the String caption
   */
  getCaption(): string;

  /**
   * Get the rows of this table.
   * @returns an {Table.Rows} object with the members "head", "body" and "foot"
   */
  getRows(): Table.Rows;

  /**
   * Get the columns of this table.
   * @returns an {Array} of {Table.Column}
   */
  getColumns(): Table.Column[];

  /**
   * Get the head rows of this table.
   * @returns an {Array} of {Array} of {Table.Cell}.
   */
  getHeadRows(): Table.Cell[][];

  /**
   * Check if the table has a head rows.
   * @returns true if the table has head rows, false otherwise.
   */
  hasHeadRows(): boolean;

  /**
   * Get the body rows of this table.
   * @returns an {Array} of {Array} of {Table.Cell}.
   */
  getBodyRows(): Table.Cell[][];

  /**
   * Check if the table has a body rows.
   * @returns true if the table has body rows, false otherwise.
   */
  hasBodyRows(): boolean;

  /**
   * Get the foot rows of this table.
   * @returns an {Array} of {Array} of {Table.Cell}.
   */
  getFootRows(): Table.Cell[][];

  /**
   * Check if the table has a foot rows.
   * @returns true if the table has foot rows, false otherwise.
   */
  hasFootRows(): boolean;

  /**
   * Check if the table has a header option set.
   * @returns true if the header option is set, false otherwise.
   */
  hasHeaderOption(): boolean;

  /**
   * Check if the table has the footer option set.
   * @returns true if the footer option is set, false otherwise.
   */
  hasFooterOption(): boolean;

  /**
   * Check if the table has the autowidth option set.
   * @returns true if the autowidth option is set, false otherwise.
   */
  hasAutowidthOption(): boolean;

  /**
   * Get the number of rows in the table.
   * Please note that the header and footer rows are also counted.
   * @returns the number of rows in the table.
   */
  getRowCount(): number;

  /**
   * Set the number of rows in the table.
   * Please note that the header and footer rows are also counted.
   * @param value - the value
   */
  setRowCount(value: number): void;

  /**
   * Get the number of columns in the table.
   * @returns the number of columns in the table.
   */
  getColumnCount(): number;

  /**
   * Set the number of columns in the table.
   * @param value - the value
   */
  setColumnCount(value: number): void;
}

/**
 * Methods for managing AsciiDoc tables.
 */
export namespace Table {
  class Rows {
    /**
     * head rows.
     */
    head: Cell[][];
    /**
     * body rows.
     */
    body: Cell[][];
    /**
     * foot rows.
     */
    foot: Cell[][];

    /**
     * Create a new {Rows} object.
     * @param head - head rows
     * @param foot - foot rows
     * @param body - body rows
     * @returns a new {Rows} object.
     */
    static create(head: Cell[][], foot: Cell[][], body: Cell[][]): Rows;

    /**
     * Get head rows.
     * @returns head rows.
     */
    getHead(): Cell[][];

    /**
     * Get body rows.
     * @returns body rows.
     */
    getBody(): Cell[][];

    /**
     * Get foot rows.
     * @returns foot rows.
     */
    getFoot(): Cell[][];

    /**
     * Retrieve the rows grouped by section as a nested {Array}.
     * Creates a 2-dimensional array of two element entries.
     * The first element is the section name as a String.
     * The second element is the Array of rows in that section.
     * The entries are in document order (head, foot, body).
     * @returns a 2-dimensional {Array} two element entries
     */
    bySection(): Array<[string, Cell[][]]>;
  }

  /**
   * Methods to manage the columns of an AsciiDoc table.
   * In particular, it keeps track of the column specs.
   */
  class Column {
    static create(table: Table, index: number, attributes: Attributes): Column;

    /**
     * Get the column number of this cell.
     * @returns the column number.
     */
    getColumnNumber(): number;

    /**
     * Get the width of this cell.
     * @returns the width of this cell.
     */
    getWidth(): string | undefined;

    /**
     * Get the horizontal align of this cell.
     * @returns the horizontal align of this cell.
     */
    getHorizontalAlign(): string | undefined;

    /**
     * Get the vertical align of this cell.
     * @returns the vertical align of this cell.
     */
    getVerticalAlign(): string | undefined;

    /**
     * Get the style of this cell.
     * @returns the style of this cell.
     */
    getStyle(): string | undefined;
  }

  /**
   * Methods for managing the cells in an AsciiDoc table.
   */
  class Cell {
    /**
     * Get the column span of this {@link Cell} node.
     * @returns a {number} of the number of columns this cell will span (default: undefined).
     */
    getColumnSpan(): number | undefined;

    /**
     * Set the column span of this {@link Cell} node.
     * @param value - the value
     * @returns the new colspan value.
     */
    setColumnSpan(value: number): number;

    /**
     * Get the row span of this {@link Cell} node
     * @returns a {number} of the number of rows this cell will span (default: undefined).
     */
    getRowSpan(): number | undefined;

    /**
     * Set the row span of this {@link Cell} node
     * @param value - the value
     * @returns the new rowspan value.
     */
    setRowSpan(value: number): number;

    /**
     * Get the content of the cell.
     * This method should not be used for cells in the head row or that have the literal style.
     * @returns the String content of the cell.
     */
    getContent(): string;

    /**
     * Get the text of the cell.
     * @returns the text of the cell.
     */
    getText(): string;

    /**
     * Get the source of the cell.
     * @returns the source of the cell.
     */
    getSource(): string;

    /**
     * Get the lines of the cell.
     * @returns the lines of the cell.
     */
    getLines(): string[];

    /**
     * Get the line number of the cell.
     * @returns the line number of the cell.
     */
    getLineNumber(): number | undefined;

    /**
     * Get the source file of the cell.
     * @returns the file of the cell.
     */
    getFile(): string | undefined;

    /**
     * Get the style of the cell.
     * @returns the style of the cell.
     */
    getStyle(): string | undefined;

    /**
     * Get the column of this cell.
     * @returns the column of this cell.
     */
    getColumn(): Column | undefined;

    /**
     * Get the width of this cell.
     * @returns the width of this cell.
     */
    getWidth(): string | undefined;

    /**
     * Get the column width in percentage of this cell.
     * @returns the column width in percentage of this cell.
     */
    getColumnPercentageWidth(): string | undefined;

    /**
     * Get the nested {Document} of this cell when style is 'asciidoc'.
     * @returns the nested {Document}
     */
    getInnerDocument(): Document | undefined;
  }
}

/**
 * @description
 * An abstract base class that provides state and methods for managing a node of AsciiDoc content.
 * The state and methods on this class are common to all content segments in an AsciiDoc document.
 */
export class AbstractNode implements Logging {
  /**
   * Resolve the list of comma-delimited subs against the possible options.
   *
   * @param subs - The comma-delimited String of substitution names or aliases.
   * @param [type] - A String representing the context for which the subs are being resolved (default: 'block').
   * @param [defaults] - An Array of substitutions to start with when computing incremental substitutions (default: undefined).
   * @param [subject] - The String to use in log messages to communicate the subject for which subs are being resolved (default: undefined)
   *
   * @returns An Array of Strings representing the substitution operation or nothing if no subs are found.
   */

  node_name: string;
  context: string

  resolveSubstitutions(subs: string, type?: string, defaults?: string[], subject?: string): string[] | undefined;

  /**
   * Call {@link AbstractNode#resolveSubstitutions} for the 'block' type.
   *
   * @see {@link AbstractNode#resolveSubstitutions}
   */
  resolveBlockSubstitutions(subs: string, defaults?: string[], subject?: string): string[] | undefined;

  /**
   * Call {@link AbstractNode#resolveSubstitutions} for the 'inline' type with the subject set as passthrough macro.
   *
   * @see {@link AbstractNode#resolveSubstitutions}
   */
  resolvePassSubstitutions(subs: string): string[] | undefined;

  /**
   * Apply the specified substitutions to the text.
   *
   * @param text - The String or String Array of text to process; must not be undefined.
   * @param [subs] - The substitutions to perform; must be a String, an Array or undefined (default: NORMAL_SUBS).
   *
   * @returns a String or String Array to match the type of the text argument with substitutions applied.
   */
  applySubstitutions(text: string, subs?: string | string[]): string | string[];

  /**
   * @returns the String name of this node
   */
  getNodeName(): string;

  /**
   * @returns the JSON of attributes for this node
   */
  getAttributes(): any;

  /**
   * Get the value of the specified attribute.
   * If the attribute is not found on this node, fallback_name is set, and this node is not the Document node, get the value of the specified attribute from the Document node.
   *
   * Look for the specified attribute in the attributes on this node and return the value of the attribute, if found.
   * Otherwise, if fallback_name is set (default: same as name) and this node is not the Document node, look for that attribute on the Document node and return its value, if found.
   * Otherwise, return the default value (default: undefined).
   *
   * @param name - The String of the attribute to resolve.
   * @param [defaultValue] - The {Object} value to return if the attribute is not found (default: undefined).
   * @param [fallbackName] - The String of the attribute to resolve on the Document if the attribute is not found on this node (default: same as name).
   *
   * @returns the {Object} value (typically a String) of the attribute or defaultValue if the attribute is not found.
   */
  getAttribute(name: string, defaultValue?: any, fallbackName?: string): any;

  /**
   * Check whether the specified attribute is present on this node.
   *
   * @param name - The String of the attribute to resolve.
   * @returns true if the attribute is present, otherwise false
   */
  hasAttribute(name: string): boolean;

  /**
   * Check if the specified attribute is defined using the same logic as {AbstractNode#getAttribute}, optionally performing acomparison with the expected value if specified.
   *
   * Look for the specified attribute in the attributes on this node.
   * If not found, fallback_name is specified (default: same as name), and this node is not the Document node, look for that attribute on the Document node.
   * In either case, if the attribute is found, and the comparison value is truthy, return whether the two values match.
   * Otherwise, return whether the attribute was found.
   *
   * @param name - The String name of the attribute to resolve.
   * @param [expectedValue] - The expected Object value of the attribute (default: undefined).
   * @param fallbackName - The String of the attribute to resolve on the Document if the attribute is not found on this node (default: same as name).
   *
   * @returns a Boolean indicating whether the attribute exists and, if a truthy comparison value is specified, whether the value of the attribute matches the comparison value.
   */
  isAttribute(name: string, expectedValue?: any, fallbackName?: string): boolean;

  /**
   * Assign the value to the attribute name for the current node.
   *
   * @param name - The String attribute name to assign
   * @param value - The Object value to assign to the attribute (default: '')
   * @param overwrite - A Boolean indicating whether to assign the attribute if currently present in the attributes JSON (default: true)
   *
   * @returns a Boolean indicating whether the assignment was performed
   */
  setAttribute(name: string, value: any, overwrite?: boolean): boolean;

  /**
   * Remove the attribute from the current node.
   * @param name - The String attribute name to remove
   * @returns the previous {string} value, or undefined if the attribute was not present.
   */
  removeAttribute(name: string): string | undefined;

  /**
   * Get the {@link Document} to which this node belongs.
   *
   * @returns the {@link Document} object to which this node belongs.
   */
  getDocument(): Document;

  /**
   * Get the {@link AbstractNode} to which this node is attached.
   *
   * @returns the {@link AbstractNode} object to which this node is attached,
   * or undefined if this node has no parent.
   */
  getParent(): AbstractNode | undefined;

  /**
   * @returns true if this {AbstractNode} is an instance of {Inline}
   */
  isInline(): boolean;

  /**
   * @returns true if this {AbstractNode} is an instance of {Block}
   */
  isBlock(): boolean;

  /**
   * Checks if the role attribute is set on this node and, if an expected value is given, whether the space-separated role matches that value.
   *
   * @param expectedValue - The expected String value of the role (optional, default: undefined)
   *
   * @returns a Boolean indicating whether the role attribute is set on this node and, if an expected value is given, whether the space-separated role matches that value.
   */
  isRole(expectedValue?: string): boolean;

  /**
   * Retrieves the space-separated String role for this node.
   *
   * @returns the role as a space-separated String.
   */
  getRole(): string | undefined;

  /**
   * Sets the value of the role attribute on this node.
   *
   * @param names - A single role name, a space-separated String of role names or a list of role names
   *
   * @returns the value of the role attribute.
   */
  setRole(...names: string[]): string;

  /**
   * Sets the value of the role attribute on this node.
   *
   * @param names - an Array of role names
   *
   * @returns the value of the role attribute.
   */
  setRole(names: string[]): string;

  /**
   * Checks if the specified role is present in the list of roles for this node.
   *
   * @param name - The String name of the role to find.
   *
   * @returns a Boolean indicating whether this node has the specified role.
   */
  hasRole(name: string): boolean;

  /**
   * Retrieves the String role names for this node as an Array.
   *
   * @returns the role names as a String {Array}, which is empty if the role attribute is absent on this node.
   */
  getRoles(): string[];

  /**
   * Adds the given role directly to this node.
   *
   * @param name - The name of the role to add
   *
   * @returns a Boolean indicating whether the role was added.
   */
  addRole(name: string): boolean;

  /**
   * Public: Removes the given role directly from this node.
   *
   * @param name - The name of the role to remove
   *
   * @returns a Boolean indicating whether the role was removed.
   */
  removeRole(name: string): boolean;

  /**
   * A convenience method that checks if the reftext attribute is defined.
   * @returns A Boolean indicating whether the reftext attribute is defined
   */
  isReftext(): boolean;

  /**
   * A convenience method that returns the value of the reftext attribute with substitutions applied.
   * @returns the value of the reftext attribute with substitutions applied.
   */
  getReftext(): string | undefined;

  /**
   * @returns the context name for this node
   */
  getContext(): string;

  /**
   * @returns the String id of this node
   */
  getId(): string;

  /**
   * @param id - the String id of this node
   */
  setId(id: string): void;

  /**
   * A convenience method to check if the specified option attribute is enabled on the current node.
   * Check if the option is enabled. This method simply checks to see if the <name>-option attribute is defined on the current node.
   *
   * @param name - the String name of the option
   *
   * @return a Boolean indicating whether the option has been specified
   */
  isOption(name: string): boolean;

  /**
   * Set the specified option on this node.
   * This method sets the specified option on this node by setting the <name>-option attribute.
   *
   * @param name - the String name of the option
   */
  setOption(name: string): void;

  /**
   * Construct a reference or data URI to an icon image for the specified icon name.
   *
   * If the 'icon' attribute is set on this block, the name is ignored and the value of this attribute is used as the target image path.
   * Otherwise, construct a target image path by concatenating the value of the 'iconsdir' attribute,
   * the icon name, and the value of the 'icontype' attribute (defaulting to 'png').
   *
   * The target image path is then passed through the {@link AbstractNode#getImageUri} method.
   * If the 'data-uri' attribute is set on the document, the image will be safely converted to a data URI.
   *
   * The return value of this method can be safely used in an image tag.
   *
   * @param name - the String name of the icon
   *
   * @returns A String reference or data URI for an icon image
   */
  getIconUri(name: string): string;

  /**
   * Construct a URI reference to the target media.
   *
   * If the target media is a URI reference, then leave it untouched.
   *
   * The target media is resolved relative to the directory retrieved from the specified attribute key, if provided.
   *
   * The return value can be safely used in a media tag (img, audio, video).
   *
   * @param target - A String reference to the target media
   * @param assetDirKey - The String attribute key used to lookup the directory where the media is located (default: 'imagesdir')
   *
   * @returns A String reference for the target media
   */
  getMediaUri(target: string, assetDirKey?: string): string;

  /**
   * Construct a URI reference or data URI to the target image.
   *
   * If the target image is a URI reference, then leave it untouched.
   *
   * The target image is resolved relative to the directory retrieved from the specified attribute key, if provided.
   *
   * If the 'data-uri' attribute is set on the document, and the safe mode level is less than SafeMode.SECURE,
   * the image will be safely converted to a data URI by reading it from the same directory.
   * If neither of these conditions are satisfied, a relative path (i.e., URL) will be returned.
   *
   * The return value of this method can be safely used in an image tag.
   *
   * @param targetImage - A String path to the target image
   * @param assetDirKey - The String attribute key used to lookup the directory where the image is located (default: 'imagesdir')
   *
   * @returns A String reference or data URI for the target image
   */
  getImageUri(targetImage: string, assetDirKey?: string): string;

  /**
   * Get the {Converter} instance being used to convert the current {Document}.
   */
  getConverter(): object;

  /**
   */
  readContents(): void;

  /**
   * Read the contents of the file at the specified path.
   * This method assumes that the path is safe to read.
   * It checks that the file is readable before attempting to read it
   * @param path - the {string} path from which to read the contents
   * @param options - a JSON of options to control processing (default: {})
   * - warn_on_failure a {boolean} that controls whether a warning is issued if the file cannot be read (default: false)
   * - normalize a {boolean} that controls whether the lines are normalized and coerced to UTF-8 (default: false)
   * @returns the {string} content of the file at the specified path, or undefined if the file does not exist.
   */
  readAsset(path: string, options: any): string;

  /**
   */
  normalizeWebPath(): void;

  /**
   */
  normalizeSystemPath(): void;

  /**
   */
  normalizeAssetPath(): void;

  // alias
  getLogger(): Logger;

  createLogMessage(text: string, context: any): LoggerMessage;
}

/**
 * Methods for managing AsciiDoc lists (ordered, unordered and description lists).
 */
export class List extends AbstractBlock {
  /**
   * Checks if the {@link List} contains any child {@link ListItem}.
   * @returns whether the {@link List} has child {@link ListItem}.
   */
  hasItems(): boolean;

  /**
   * Get the Array of {@link ListItem} nodes for this {@link List}.
   * @returns an Array of {@link ListItem} nodes.
   */
  getItems(): ListItem[];
}

/**
 * Methods for managing items for AsciiDoc olists, ulist, and dlists.
 *
 * In a description list (dlist), each item is a tuple that consists of a 2-item Array of ListItem terms and a ListItem description (i.e., [[term, term, ...], desc].
 * If a description is not set, then the second entry in the tuple is nil.
 */
export class ListItem extends AbstractBlock {
  /**
   * Get the converted String text of this {@link ListItem} node.
   * @returns the converted String text for this {@link ListItem} node.
   */
  getText(): string;

  /**
   * Set the String source text of this {@link ListItem} node.
   * @returns the new String text assigned to this {@link ListItem}
   */
  setText(text: string): string;

  /**
   * A convenience method that checks whether the text of this {@link ListItem} is not blank (i.e. not undefined or empty string).
   * @returns whether the text is not blank
   */
  hasText(): boolean;

  /**
   * Get the {string} used to mark this {@link ListItem}.
   */
  getMarker(): string;

  /**
   * Set the {string} used to mark this {@link ListItem}.
   *
   * @param marker - the {string} used to mark this {@link ListItem}
   */
  setMarker(marker: string): void;

  /**
   * Get the {@link List} to which this {@link ListItem} is attached.
   *
   * @returns the {@link List} object to which this {@link ListItem} is attached,
   * or undefined if this node has no parent.
   */
  getList(): List;

  /**
   * @see {@link ListItem#getList}
   */
  getParent(): List;
}

export namespace Html5Converter {
  /**
   * Create a new {@link Html5Converter}.
   * @returns a {@link Html5Converter}
   */
  function create(): Html5Converter;
}

interface AbstractConverter {
  /**
   * Converts an {AbstractNode} using the given transform.
   * This method must be implemented by a concrete converter class.
   *
   * @param node - The concrete instance of AbstractNode to convert.
   * @param [transform] - An optional String transform that hints at which transformation should be applied to this node.
   * If a transform is not given, the transform is often derived from the value of the {AbstractNode#getNodeName} property. (optional, default: undefined)
   * @param [opts]- An optional JSON of options hints about how to convert the node. (optional, default: undefined)
   *
   * @returns the {String} result.
   */
  convert(node: AbstractNode, transform?: string, opts?: unknown): string;
}

interface ConverterConstructor {
  new(backend?: string, opts?: unknown): AbstractConverter;
}

export class Converter implements AbstractConverter {
  /**
   * Converts an {AbstractNode} using the given transform.
   * This method must be implemented by a concrete converter class.
   *
   * @param node - The concrete instance of AbstractNode to convert.
   * @param [transform] - An optional String transform that hints at which transformation should be applied to this node.
   * If a transform is not given, the transform is often derived from the value of the {AbstractNode#getNodeName} property. (optional, default: undefined)
   * @param [opts]- An optional JSON of options hints about how to convert the node. (optional, default: undefined)
   *
   * @returns the {String} result.
   */
  convert(node: AbstractNode, transform?: string, opts?: any): string;
}

/**
 * A built-in {Converter} implementation that generates HTML 5 output.
 */
export class Html5Converter extends Converter {
}

export namespace ConverterFactory {
  /**
   * Create an instance of the converter bound to the specified backend.
   *
   * @param backend - look for a converter bound to this keyword.
   * @param opts - a JSON of options to pass to the converter (default: {})
   * @returns a {Converter} instance for converting nodes in an Asciidoctor AST.
   */
  function create(backend: string, opts?: unknown): Converter;
}

/**
 * A registry of {Converter} instances or classes keyed by backend name.
 */
interface ConverterRegistry {
  [key: string]: typeof Converter | Converter;
}

export class ConverterFactory {
  /**
   * Register a custom converter in the global converter factory to handle conversion to the specified backends.
   * If the backend value is an asterisk, the converter is used to handle any backend that does not have an explicit converter.
   *
   * @param converter - The {Converter} instance to register
   * @param backends- A {string} {Array} of backend names that this converter should be registered to handle (optional, default: ['*'])
   */
  register(converter: AbstractConverter | ConverterConstructor, backends?: string[]): void;

  /**
   * Retrieves the singleton instance of the converter factory.
   *
   * @param initialize - instantiate the singleton if it has not yet been instantiated.
   * If this value is false and the singleton has not yet been instantiated, this method returns a fresh instance.
   * @returns an instance of the {ConverterFactory}.
   */
  getDefault(initialize: boolean): ConverterFactory;

  /**
   * Get the converter registry.
   * @returns the registry
   */
  getRegistry(): ConverterRegistry;

  /**
   * Lookup the custom converter registered with this factory to handle the specified backend.
   * @param backend - The {string} backend name.
   * @returns the {Converter} class or instance registered to convert the specified backend or undefined if no match is found.
   */
  for(backend: string): typeof Converter | Converter | undefined;
}

interface SyntaxHighlighterHighlightOptions {
  [key: string]: any;

  /**
   * An Object of callouts extracted from the source, indexed by line number (1-based) (optional).
   */
  callouts?: any;
  /**
   * The String CSS mode ("class" or "inline").
   */
  css_mode?: string;
  /**
   * A 1-based Array of Integer line numbers to highlight (aka emphasize) (optional).
   */
  highlight_lines?: number[];
  /**
   * A String indicating whether lines should be numbered ("table" or "inline") (optional).
   */
  number_lines?: string;
  /**
   * The starting Integer (1-based) line number (optional, default: 1).
   */
  start_line_number?: number;
  /**
   * The String style (aka theme) to use for colorizing the code (optional).
   */
  style?: string;
}

interface SyntaxHighlighterDocinfoOptions {
  [key: string]: any;

  /**
   * A Boolean indicating whether the stylesheet should be linked instead of embedded (optional).
   */
  linkcss?: boolean;
  /**
   * The String base URL for assets loaded from the CDN.
   */
  cdn_base_url?: string;
  /**
   * The String '/' if the converter calling this method emits self-closing tags.
   */
  self_closing_tag_slash?: string;
}

interface SyntaxHighlighterFormatOptions {
  [key: string]: any;

  /**
   * A Boolean that indicates whether wrapping should be disabled (optional).
   */
  nowrap?: boolean;
}

/**
 * Syntax highlighter functions
 */
interface SyntaxHighlighterFunctions {
  postConstruct?: (this: SyntaxHighlighter) => any;
  initialize?: (this: SyntaxHighlighter, name: string, backend: string, opts: any) => void;
  format?: (this: SyntaxHighlighter, parent: Document, target: string, attributes?: any) => string;
  highlight?: (this: SyntaxHighlighter, node: Block, source: string, lang: string, opts: SyntaxHighlighterHighlightOptions) => any;
  handlesHighlighting?: (this: SyntaxHighlighter) => boolean;
  hasDocinfo?: (this: SyntaxHighlighter, location: string) => boolean;
  docinfo?: (this: SyntaxHighlighter, location: string, doc: Document, opts: SyntaxHighlighterDocinfoOptions) => string;
}

/**
 * @description
 * This API is experimental and subject to change.
 *
 * A pluggable adapter for integrating a syntax (aka code) highlighter into AsciiDoc processing.
 *
 * There are two types of syntax highlighter adapters. The first performs syntax highlighting during the convert phase.
 * This adapter type must define a "handlesHighlighting" method that returns true.
 * The companion "highlight" method will then be called to handle the "specialcharacters" substitution for source blocks.
 *
 * The second assumes syntax highlighting is performed on the client (e.g., when the HTML document is loaded).
 * This adapter type must define a "hasDocinfo" method that returns true.
 * The companion "docinfo" method will then be called to insert markup into the output document.
 * The docinfo functionality is available to both adapter types.
 *
 * js provides several a built-in adapter for highlight.js.
 * Additional adapters can be registered using SyntaxHighlighter.register.
 */
export namespace SyntaxHighlighter {
  /**
   * Associates the syntax highlighter class or object with the specified names.
   *
   * @description This API is experimental and subject to change.
   *
   * @param names - A {string} name or an {Array} of {string} names
   * @param functions - A list of functions representing a {SyntaxHighlighter} or a {SyntaxHighlighter} class to instantiate
   */
  function register(names: string | string[], functions: SyntaxHighlighterFunctions | object): void;

  // SyntaxHighlighter.for can be defined because "for" is a reserved keyword :|

  /**
   * Retrieves the syntax highlighter class or object registered for the specified name.
   *
   * @description This API is experimental and subject to change.
   *
   * @param name - The {string} name of the syntax highlighter to retrieve.
   * @returns the {SyntaxHighlighter} registered for this name.
   */
  function get(name: string): SyntaxHighlighter | undefined;
}

export class SyntaxHighlighter {
  $$name: string;

  [key: string]: any;

  super: (...params: any[]) => void;

  /**
   * Format the highlighted source for inclusion in an HTML document.
   *
   * @param node - The source Block being processed.
   * @param lang - The source language String for this Block (e.g., ruby).
   * @param opts - An object of options that control syntax highlighting.
   *
   * @returns the highlighted source String wrapped in preformatted tags (e.g., pre and code)
   */
  format(node: Block, lang: string, opts?: SyntaxHighlighterFormatOptions): string;

  /**
   * Highlights the specified source when this source block is being converted.
   *
   * If the source contains callout marks, the caller assumes the source remains on the same lines and no closing tags are added to the end of each line.
   * If the source gets shifted by one or more lines, this method must return a tuple containing the highlighted source and the number of lines by which the source was shifted.
   *
   * @param node - The source Block to syntax highlight.
   * @param source - The raw source text String of this source block (after preprocessing).
   * @param lang - The source language String specified on this block (e.g., ruby).
   * @param opts - An object of options that configure the syntax highlighting.
   *
   * @returns the highlighted source String or a tuple of the highlighted source String and an Integer line offset.
   */
  highlight(node: Block, source: string, lang: string, opts: SyntaxHighlighterHighlightOptions): any;

  /**
   * Indicates whether highlighting is handled by this syntax highlighter or by the client.
   *
   * @returns a Boolean indicating whether the highlight method should be used to handle the "specialchars" substitution.
   */
  handlesHighlighting(): boolean;

  /**
   * Indicates whether this syntax highlighter has docinfo (i.e., markup) to insert into the output document at the specified location.
   * Should be called by converter after main content has been converted.
   *
   * @param location - The String representing the location slot ("head" or "footer").
   *
   * @returns a Boolean indicating whether the docinfo method should be called for this location.
   */
  hasDocinfo(location: string): boolean;

  /**
   * Generates docinfo markup for this syntax highlighter to insert at the specified location in the output document.
   * Should be called by converter after main content has been converted.
   *
   * @param location - The String representing the location slot ("head" or "footer").
   * @param doc - The Document in which this syntax highlighter is being used.
   * @param opts - A Object of options that configure the syntax highlighting
   * @returns the String markup to insert.
   */
  docinfo(location: string, doc: Document, opts: SyntaxHighlighterDocinfoOptions): string;
}

/**
 * @description
 * This API is experimental and subject to change.
 *
 * Please note that this API is currently only available in a Node environment.
 * We recommend to use a custom converter if you are running in the browser.
 */
export namespace TemplateConverter {
  interface CreateOptions {
    [key: string]: any;

    template_engine?: string;
    template_cache?: TemplateCache;
  }

  interface TemplateCache {
    [key: string]: any;

    /**
     * a JSON of template objects keyed by template name keyed by path patterns
     */
    scans?: TemplatesIndexed;
    /**
     * a JSON of template objects keyed by file paths
     */
    templates?: TemplateIndexed;
  }

  interface TemplatesIndexed {
    [key: string]: TemplateIndexed;
  }

  interface TemplateIndexed {
    [key: string]: Template;
  }

  /**
   * Create a new {@link TemplateConverter}.
   * @param backend - the backend name
   * @param templateDirectories - a list of template directories
   * @param [opts] - a JSON of options
   * @param [opts.template_engine] - the name of the template engine
   * @param [opts.template_cache] - a template cache
   * @param [opts.template_cache.scans] - a JSON of template objects keyed by template name keyed by path patterns
   * @param [opts.template_cache.templates] - a JSON of template objects keyed by file paths
   * @returns a {@link TemplateConverter}
   */
  function create(backend: string, templateDirectories: string[], opts?: CreateOptions): TemplateConverter;
}

/**
 * A built-in {Converter} implementation that uses templates composed in template languages
 * to convert {AbstractNode} objects from a parsed AsciiDoc document tree to the backend format.
 */
export class TemplateConverter extends Converter {
  /**
   * @returns the global cache
   */
  static getCache(): TemplateConverter.TemplateCache;

  /**
   * Clear the global cache.
   */
  static clearCache(): void;

  /**
   * Convert an {AbstractNode} to the backend format using the named template.
   *
   * Looks for a template that matches the value of the template name or,
   * if the template name is not specified, the value of the {@see AbstractNode.getNodeName} function.
   *
   * @param node - the AbstractNode to convert
   * @param [templateName] - the {string} name of the template to use, or the node name of the node if a template name is not specified. (optional, default: undefined)
   * @param [opts] - an optional JSON that is passed as local variables to the template. (optional, default: undefined)
   * @returns The {string} result from rendering the template
   */
  convert(node: AbstractNode, templateName?: string, opts?: any): string;

  /**
   * Checks whether there is a template registered with the specified name.
   *
   * @param name - the {string} template name
   * @returns a {boolean} that indicates whether a template is registered for the specified template name.
   */
  handles(name: string): boolean;

  /**
   * Retrieves the templates that this converter manages.
   *
   * @returns a JSON of template objects keyed by template name
   */
  getTemplates(): TemplateConverter.TemplateIndexed;

  /**
   * Registers a template with this converter.
   *
   * @param name - the {string} template name
   * @param template - the template object to register
   * @returns the template object
   */
  register(name: string, template: Template): TemplateConverter.TemplateIndexed;
}

/**
 * A {Converter} implementation that delegates to the chain of {Converter}
 * objects passed to the constructor. Selects the first {Converter} that
 * identifies itself as the handler for a given transform.
 */
export class CompositeConverter extends Converter {
  /**
   * Delegates to the first converter that identifies itself as the handler for the given transform.
   * The optional Hash is passed as the last option to the delegate's convert method.
   *
   * @param node - the AbstractNode to convert
   * @param [transform] - the optional {string} transform, or the name of the node if no transform is specified. (optional, default: undefined)
   * @param [opts] - an optional JSON that is passed as local variables to the template. (optional, default: undefined)
   * @returns The {string} result from the delegate's convert method
   */
  convert(node: AbstractNode, transform?: string, opts?: any): string;

  /**
   * Checks whether there is a template registered with the specified name.
   *
   * @param name - the {string} template name
   * @returns a {boolean} that indicates whether a template is registered for the specified template name.
   */
  handles(name: string): boolean;

  /**
   * Retrieves the templates that this converter manages.
   *
   * @returns a JSON of template objects keyed by template name
   */
  getTemplates(): TemplateConverter.TemplateIndexed;

  /**
   * Registers a template with this converter.
   *
   * @param name - the {string} template name
   * @param template - the template object to register
   * @returns the template object
   */
  register(name: string, template: Template): TemplateConverter.TemplateIndexed;
}

export namespace Template {
  interface Context {
    node: AbstractNode;
    opts?: Options;
    helpers?: any;
  }
}

/**
 * Handles template rendering.
 */
interface Template {
  [key: string]: any;

  /**
   * Render the template with a given context.
   * @param context - A context that contains the {AbstractNode}
   * @returns The resulting {string}
   */
  render: (context: Template.Context) => string;
}

export namespace TemplateEngine {
  interface Registry {
    [key: string]: Adapter;
  }

  /**
   * Handles template compilation.
   */
  interface Adapter {
    /**
     * Compile a file to a {Template}.
     * @param file - The file path
     * @param nodeName - The node name
     */
    compile: (file: string, nodeName: string) => Template;
  }
}

/**
 * @description
 * This API is experimental and subject to change.
 *
 * A global registry for integrating a template engine into the built-in template converter.
 */
export class TemplateEngine {
  /**
   * The template engine registry.
   */
  registry: TemplateEngine.Registry;

  /**
   * Register a template engine adapter for the given names.
   * @param names - a {string} name or an {Array} of {string} names
   * @param templateEngineAdapter - a template engine adapter instance
   * @example
   * import fs from 'fs';
   * class DotTemplateEngineAdapter implements TemplateEngine.Adapter {
   *   private readonly doT: any;
   *   constructor() {
   *     this.doT = require('dot');
   *   }
   *   compile file: string) {
   *     const templateFn = this.doT.template(fs.readFileSync(file, 'utf8'));
   *     return {
   *       render: templateFn
   *     };
   *   }
   * }
   * processor.TemplateEngine.register('dot', new DotTemplateEngineAdapter());
   */
  static register(names: string | string[], templateEngineAdapter: TemplateEngine.Adapter): void;
}

/**
 * @description
 * The main application interface (API) for
 * This API provides methods to parse AsciiDoc content and convert it to various output formats using built-in or third-party converters.
 *
 * An AsciiDoc document can be as simple as a single line of content,
 * though it more commonly starts with a document header that declares the document title and document attribute definitions.
 * The document header is then followed by zero or more section titles, optionally nested, to organize the paragraphs, blocks, lists, etc. of the document.
 *
 * By default, the processor converts the AsciiDoc document to HTML 5 using a built-in converter.
 * However, this behavior can be changed by specifying a different backend (e.g., +docbook+).
 * A backend is a keyword for an output format (e.g., DocBook).
 * That keyword, in turn, is used to select a converter, which carries out the request to convert the document to that format.
 *
 * @example
 * asciidoctor.convertFile('document.adoc', { 'safe': 'safe' }) // Convert an AsciiDoc file
 *
 * asciidoctor.convert("I'm using *Asciidoctor* version {asciidoctor-version}.", { 'safe': 'safe' }) // Convert an AsciiDoc string
 *
 * const doc = asciidoctor.loadFile('document.adoc', { 'safe': 'safe' }) // Parse an AsciiDoc file into a document object
 *
 * const doc = asciidoctor.load("= Document Title\n\nfirst paragraph\n\nsecond paragraph", { 'safe': 'safe' }) // Parse an AsciiDoc string into a document object
 */
export class Asciidoctor {
  /**
   * Get Asciidoctor core version number.
   *
   * @returns the version number of Asciidoctor core.
   */
  getCoreVersion(): string;

  /**
   * Get js runtime environment information.
   *
   * @returns the runtime environment including the ioModule, the platform, the engine and the framework.
   */
  getRuntime(): Runtime;

  /**
   * Parse the AsciiDoc source input into an {@link Document} and convert it to the specified backend format.
   *
   * Accepts input as a Buffer or String.
   *
   * @param input - AsciiDoc input as String or Buffer
   * @param options - a JSON of options to control processing (default: {})
   * @returns the {@link Document} object if the converted String is written to a file,
   * otherwise the converted String
   * @example
   * var input = '= Hello, AsciiDoc!\n' +
   *   'Guillaume Grossetie <ggrossetie@example.com>\n\n' +
   *   'An introduction to http://asciidoc.org[AsciiDoc].\n\n' +
   *   '== First Section\n\n' +
   *   '* item 1\n' +
   *   '* item 2\n';
   *
   * var html = asciidoctor.convert(input);
   */
  convert(input: string | Buffer, options?: ProcessorOptions): string | Document;

  /**
   * Parse the AsciiDoc source input into an {@link Document} and convert it to the specified backend format.
   *
   * @param filename - source filename
   * @param options - a JSON of options to control processing (default: {})
   * @returns the {@link Document} object if the converted String is written to a file,
   * otherwise the converted String
   * @example
   * var html = asciidoctor.convertFile('./document.adoc');
   */
  convertFile(filename: string, options?: ProcessorOptions): string | Document;

  /**
   * Parse the AsciiDoc source input into an {@link Document}
   *
   * Accepts input as a Buffer or String.
   *
   * @param input - AsciiDoc input as String or Buffer
   * @param options - a JSON of options to control processing (default: {})
   * @returns the {@link Document} object
   */
  load(input: string | Buffer, options?: ProcessorOptions): Document;

  /**
   * Parse the contents of the AsciiDoc source file into an {@link Document}
   *
   * @param filename - source filename
   * @param options - a JSON of options to control processing (default: {})
   * @returns the {@link Document} object
   */
  loadFile(filename: string, options?: ProcessorOptions): Document;

  /**
   * Get js version number.
   *
   * @returns the version number of js.
   */
  getVersion(): string;

  Block: typeof Block;

  Section: typeof Section;

  SafeMode: typeof SafeMode;

  Extensions: typeof Extensions;

  Html5Converter: typeof Html5Converter;

  TemplateConverter: typeof TemplateConverter;

  ConverterFactory: ConverterFactory;

  MemoryLogger: typeof MemoryLogger;

  NullLogger: typeof MemoryLogger;

  Timings: typeof Timings;

  LoggerManager: typeof LoggerManager;

  SyntaxHighlighter: typeof SyntaxHighlighter;

  TemplateEngine: typeof TemplateEngine;
}

export default function asciidoctor(): Asciidoctor;
