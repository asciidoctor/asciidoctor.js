/**
 * Run the CLI.
 * Equivalent to `new Invoker(new Options().parse(argv)).invoke()`.
 *
 * @param {string[]} [argv=process.argv]
 * @returns {Promise<void>}
 */
export function run(argv?: string[]): Promise<void>;
/**
 * Definition of a CLI option used by {@link Options#addOption}.
 *
 * @typedef {Object} OptionDefinition
 * @property {'string'|'boolean'} type - the value type of the option
 * @property {string} [short] - single character short alias (without -)
 * @property {boolean} [multiple] - whether the option can be repeated
 * @property {string|boolean} [default] - default value when the option is absent
 * @property {string} [describe] - description shown in --help output
 * @property {string} [metavar] - value placeholder shown in --help for string options (e.g. `<theme>`)
 */
/**
 * Parses command-line arguments and builds Asciidoctor convert options.
 * Extend this class to add custom options via {@link Options#addOption}.
 */
export class Options {
    /** @internal */
    _definitions: {
        backend: {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        doctype: {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        'out-file': {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        'safe-mode': {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        embedded: {
            type: string;
            short: string;
            describe: string;
        };
        'no-header-footer': {
            type: string;
            short: string;
            describe: string;
        };
        'section-numbers': {
            type: string;
            short: string;
            describe: string;
        };
        'base-dir': {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        'destination-dir': {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        'failure-level': {
            type: string;
            describe: string;
            metavar: string;
        };
        quiet: {
            type: string;
            short: string;
            describe: string;
        };
        trace: {
            type: string;
            describe: string;
        };
        verbose: {
            type: string;
            short: string;
            describe: string;
        };
        timings: {
            type: string;
            short: string;
            describe: string;
        };
        'template-dir': {
            type: string;
            short: string;
            multiple: boolean;
            describe: string;
            metavar: string;
        };
        'template-engine': {
            type: string;
            short: string;
            describe: string;
            metavar: string;
        };
        attribute: {
            type: string;
            short: string;
            multiple: boolean;
            describe: string;
            metavar: string;
        };
        require: {
            type: string;
            short: string;
            multiple: boolean;
            describe: string;
            metavar: string;
        };
        version: {
            type: string;
            short: string;
            describe: string;
        };
        help: {
            type: string;
            describe: string;
            metavar: string;
        };
    };
    /** @type {string[]|null} */
    argv: string[] | null;
    /** @type {Record<string, unknown>} */
    values: Record<string, unknown>;
    /** @type {string[]} */
    positionals: string[];
    /** @type {boolean} */
    stdin: boolean;
    /** @type {Object} */
    options: any;
    /** @type {number} */
    failureLevel: number;
    /**
     * Register a custom CLI option.
     * Call this in your subclass constructor before invoking {@link Options#parse}.
     *
     * @param {string} key - the long option name (without --)
     * @param {OptionDefinition} opt - the option definition
     * @returns {this}
     */
    addOption(key: string, opt: OptionDefinition): this;
    /**
     * Parse the command-line arguments.
     * Populates {@link Options#values}, {@link Options#positionals}, {@link Options#stdin},
     * {@link Options#options}, and {@link Options#failureLevel}.
     *
     * @param {string[]} argv - the process arguments (typically `process.argv`)
     * @returns {this}
     */
    parse(argv: string[]): this;
    /** @internal */
    _buildConvertOptions(extraAttrs?: any[]): {
        options: {
            standalone: boolean;
            safe: unknown;
            verbose: number;
            timings: unknown;
            trace: unknown;
            attributes: any[];
            mkdirs: boolean;
        };
        failureLevel: any;
    };
    /**
     * Build the help text from all registered option definitions.
     *
     * @returns {string}
     */
    buildHelpText(): string;
}
/**
 * Executes the CLI after options have been parsed.
 * Extend this class to customize the conversion workflow.
 */
export class Invoker {
    /**
     * @param {Options} options - the parsed options instance
     */
    constructor(options: Options);
    options: Options;
    /**
     * Run the CLI: handle `--version`, `--help`, stdin, and file conversion.
     *
     * @returns {Promise<void>}
     */
    invoke(): Promise<void>;
    /**
     * Return the version string printed by `--version`.
     * Override to prepend your tool's own version.
     *
     * @returns {string}
     */
    version(): string;
    /**
     * Print the version string to stdout.
     */
    showVersion(): void;
    /**
     * Print help to stderr, or the AsciiDoc syntax reference if `topic` is `'syntax'`.
     *
     * @param {string} [topic]
     */
    showHelp(topic?: string): void;
    /**
     * Convert the given files.
     * Override this method to implement custom conversion logic (e.g. PDF generation).
     *
     * @param {string[]} files - input files to convert
     * @param {Object} options - Asciidoctor convert options built from the CLI flags
     * @param {Record<string, unknown>} values - all parsed CLI values, including custom options
     * @returns {Promise<void>}
     */
    convertFiles(files: string[], options: any, values: Record<string, unknown>): Promise<void>;
    /** @internal */
    _prepareProcessor(values: any): void;
    /** @internal */
    _convertFromStdin(options: any): Promise<void>;
    /** @internal */
    _exit(failureLevel: any): Promise<void>;
}
/**
 * Definition of a CLI option used by {@link Options#addOption}.
 */
export type OptionDefinition = {
    /**
     * - the value type of the option
     */
    type: "string" | "boolean";
    /**
     * - single character short alias (without -)
     */
    short?: string;
    /**
     * - whether the option can be repeated
     */
    multiple?: boolean;
    /**
     * - default value when the option is absent
     */
    default?: string | boolean;
    /**
     * - description shown in --help output
     */
    describe?: string;
    /**
     * - value placeholder shown in --help for string options (e.g. `<theme>`)
     */
    metavar?: string;
};
