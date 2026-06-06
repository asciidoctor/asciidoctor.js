import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve, isAbsolute, dirname, sep } from 'node:path'
import {
  getVersion as _getVersion,
  getCoreVersion,
  Timings,
  Extensions,
  LoggerManager,
  convert,
  convertFile,
} from '@asciidoctor/core'

const require = createRequire(import.meta.url)

const FAILURE_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  WARNING: 2,
  ERROR: 3,
  FATAL: 4,
}

const DOT_RELATIVE_RX = new RegExp(`^\\.{1,2}[/${sep.replace('\\', '\\\\')}]`)

const HELP_PREAMBLE = `asciidoctor [options...] files...
Translate the AsciiDoc source file or file(s) into the backend output format (e.g., HTML 5, DocBook 5, etc.)
By default, the output is written to a file with the basename of the source file and the appropriate extension

Options:`

const HELP_COLUMN = 36

const BASE_OPTION_DEFINITIONS = {
  backend: {
    type: 'string',
    short: 'b',
    describe: 'set output format backend',
    metavar: '<backend>',
  },
  doctype: {
    type: 'string',
    short: 'd',
    describe: 'document type [article, book, manpage, inline]',
    metavar: '<doctype>',
  },
  'out-file': {
    type: 'string',
    short: 'o',
    describe: "output file; use '' or '-' for STDOUT",
    metavar: '<file>',
  },
  'safe-mode': {
    type: 'string',
    short: 'S',
    describe: 'safe mode level [unsafe, safe, server, secure]',
    metavar: '<mode>',
  },
  embedded: {
    type: 'boolean',
    short: 'e',
    describe: 'suppress enclosing document structure',
  },
  'no-header-footer': {
    type: 'boolean',
    short: 's',
    describe: 'suppress enclosing document structure',
  },
  'section-numbers': {
    type: 'boolean',
    short: 'n',
    describe: 'auto-number section titles in the HTML backend',
  },
  'base-dir': {
    type: 'string',
    short: 'B',
    describe: 'base directory containing the document and resources',
    metavar: '<dir>',
  },
  'destination-dir': {
    type: 'string',
    short: 'D',
    describe: 'destination output directory',
    metavar: '<dir>',
  },
  'failure-level': {
    type: 'string',
    describe:
      'minimum logging level that triggers non-zero exit code [INFO, WARN, ERROR, FATAL]',
    metavar: '<level>',
  },
  quiet: { type: 'boolean', short: 'q', describe: 'suppress warnings' },
  trace: {
    type: 'boolean',
    describe: 'include backtrace information on errors',
  },
  verbose: { type: 'boolean', short: 'v', describe: 'enable verbose mode' },
  timings: { type: 'boolean', short: 't', describe: 'enable timings mode' },
  'template-dir': {
    type: 'string',
    short: 'T',
    multiple: true,
    describe: 'directory with custom converter templates (repeatable)',
    metavar: '<dir>',
  },
  'template-engine': {
    type: 'string',
    short: 'E',
    describe: 'template engine to use for custom converter templates',
    metavar: '<engine>',
  },
  attribute: {
    type: 'string',
    short: 'a',
    multiple: true,
    describe: 'document attribute to set (repeatable)',
    metavar: '<key[=value]>',
  },
  require: {
    type: 'string',
    short: 'r',
    multiple: true,
    describe:
      'require the specified library before executing the processor (repeatable)',
    metavar: '<library>',
  },
  extension: {
    type: 'string',
    multiple: true,
    describe:
      'require the specified extension and register it before executing the processor (repeatable)',
    metavar: '<extension>',
  },
  version: {
    type: 'boolean',
    short: 'V',
    describe: 'display the version and runtime environment',
  },
  help: {
    type: 'boolean',
    describe:
      "show this help; show AsciiDoc syntax overview if topic is 'syntax'",
    metavar: '[syntax]',
  },
}

function buildHelpLine(key, def) {
  const shortPart = def.short ? `-${def.short}, ` : '    '
  const metavar = def.type === 'boolean' ? '' : ` ${def.metavar ?? `<${key}>`}`
  const keyPart = `--${key}${metavar}`
  const left = `  ${shortPart}${keyPart}`
  const padding = Math.max(2, HELP_COLUMN - left.length)
  return `${left}${' '.repeat(padding)}${def.describe ?? ''}`
}

function requireLibrary(requirePath, cwd = process.cwd()) {
  if (DOT_RELATIVE_RX.test(requirePath)) {
    requirePath = resolve(cwd, requirePath)
  } else if (!isAbsolute(requirePath)) {
    const paths = [cwd, dirname(import.meta.dirname)].map((s) =>
      join(s, 'node_modules')
    )
    requirePath = require.resolve(requirePath, { paths })
  }
  return require(requirePath)
}

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
  constructor() {
    /** @internal */
    this._definitions = { ...BASE_OPTION_DEFINITIONS }
    /** @type {string[]|null} */
    this.argv = null
    /** @type {Record<string, unknown>} */
    this.values = {}
    /** @type {string[]} */
    this.positionals = []
    /** @type {boolean} */
    this.stdin = false
    /** @type {Object} */
    this.options = {}
    /** @type {number} */
    this.failureLevel = FAILURE_LEVELS.FATAL
  }

  /**
   * Register a custom CLI option.
   * Call this in your subclass constructor before invoking {@link Options#parse}.
   *
   * @param {string} key - the long option name (without --)
   * @param {OptionDefinition} opt - the option definition
   * @returns {this}
   */
  addOption(key, opt) {
    this._definitions[key] = opt
    return this
  }

  /**
   * Parse the command-line arguments.
   * Populates {@link Options#values}, {@link Options#positionals}, {@link Options#stdin},
   * {@link Options#options}, and {@link Options#failureLevel}.
   *
   * @param {string[]} argv - the process arguments (typically `process.argv`)
   * @returns {this}
   */
  parse(argv) {
    this.argv = argv
    const args = argv.slice(2)
    const parseArgsOptions = {}
    for (const [key, def] of Object.entries(this._definitions)) {
      const entry = { type: def.type }
      if (def.short) entry.short = def.short
      if (def.multiple) entry.multiple = def.multiple
      if (def.default !== undefined) entry.default = def.default
      parseArgsOptions[key] = entry
    }
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: parseArgsOptions,
    })
    this.values = values
    this.positionals = positionals
    this.stdin =
      positionals.includes('-') ||
      (positionals.length === 0 && args[args.length - 1] === '-')
    if (this.stdin) {
      this.values['out-file'] = this.values['out-file'] ?? '-'
    }
    const built = this._buildConvertOptions()
    this.options = built.options
    this.failureLevel = built.failureLevel
    return this
  }

  /** @internal */
  _buildConvertOptions(extraAttrs = []) {
    const {
      backend,
      doctype,
      'safe-mode': safeMode,
      embedded,
      'no-header-footer': noHeaderFooter,
      'section-numbers': sectionNumbers,
      'base-dir': baseDir,
      'destination-dir': destinationDir,
      'out-file': outFile,
      'template-dir': templateDir,
      'template-engine': templateEngine,
      quiet,
      verbose,
      timings,
      trace,
      'failure-level': failureLevelStr = 'FATAL',
      attribute: cliAttributes,
    } = this.values

    const level = failureLevelStr.toUpperCase()
    const failureLevel = FAILURE_LEVELS[level] ?? FAILURE_LEVELS.FATAL

    const attributes = [...extraAttrs]
    if (sectionNumbers) attributes.push('sectnums')
    if (cliAttributes) attributes.push(...cliAttributes)

    const standalone = !(embedded || noHeaderFooter)
    const verboseMode = quiet ? 0 : verbose ? 2 : 1

    const options = {
      standalone,
      safe: safeMode ?? 'unsafe',
      verbose: verboseMode,
      timings: timings ?? false,
      trace: trace ?? false,
      attributes,
      mkdirs: true,
    }

    if (backend) options.backend = backend
    if (doctype) options.doctype = doctype
    if (baseDir != null) options.base_dir = baseDir
    if (destinationDir != null) options.to_dir = destinationDir
    if (templateDir) options.template_dirs = templateDir
    if (templateEngine) options.template_engine = templateEngine

    const toStdout = outFile === '' || outFile === "''" || outFile === '-'
    if (toStdout) {
      options.to_file = false
    } else if (outFile !== undefined) {
      options.to_file = outFile
    }

    return { options, failureLevel }
  }

  /**
   * Build the help text from all registered option definitions.
   *
   * @returns {string}
   */
  buildHelpText() {
    const lines = [HELP_PREAMBLE]
    for (const [key, def] of Object.entries(this._definitions)) {
      lines.push(buildHelpLine(key, def))
    }
    return lines.join('\n')
  }
}

/**
 * Executes the CLI after options have been parsed.
 * Extend this class to customize the conversion workflow.
 */
export class Invoker {
  /**
   * @param {Options} options - the parsed options instance
   */
  constructor(options) {
    this.options = options
  }

  /**
   * Run the CLI: handle `--version`, `--help`, stdin, and file conversion.
   *
   * @returns {Promise<void>}
   */
  async invoke() {
    const { values, positionals, argv, stdin } = this.options
    const args = argv.slice(2)

    if (values.version || (values.verbose && args.length === 1)) {
      this.showVersion()
      process.exit(0)
    }

    if (values.help) {
      this.showHelp(positionals[0])
      process.exit(0)
    }

    this._prepareProcessor(values)
    this._prepareExtensions(values)
    const { options, failureLevel } = this.options

    const logger = LoggerManager.getLogger()
    if (values.quiet) logger.setLevel(3)
    else if (values.verbose) logger.setLevel(0)

    const files = positionals.filter((f) => f !== '-')

    if (stdin) {
      await this._convertFromStdin(options)
    } else if (files.length > 0) {
      await this.convertFiles(files, options, values)
    } else {
      this.showHelp()
      process.exit(0)
    }

    await this._exit(failureLevel)
  }

  /**
   * Return the version string printed by `--version`.
   * Override to prepend your tool's own version.
   *
   * @returns {string}
   */
  version() {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')
    )
    return `Asciidoctor.js ${_getVersion()} (Asciidoctor ${getCoreVersion()}) [https://asciidoctor.org]
Runtime Environment (node ${process.version} on ${process.platform})
CLI version ${pkg.version}`
  }

  /**
   * Print the version string to stdout.
   */
  showVersion() {
    console.log(this.version())
  }

  /**
   * Print help to stderr, or the AsciiDoc syntax reference if `topic` is `'syntax'`.
   *
   * @param {string} [topic]
   */
  showHelp(topic) {
    if (topic === 'syntax') {
      console.log(
        readFileSync(
          join(import.meta.dirname, '..', 'data', 'reference', 'syntax.adoc'),
          'utf8'
        )
      )
    } else {
      console.error(this.options.buildHelpText())
    }
  }

  /**
   * Convert the given files.
   * Override this method to implement custom conversion logic (e.g. PDF generation).
   *
   * @param {string[]} files - input files to convert
   * @param {Object} options - Asciidoctor convert options built from the CLI flags
   * @param {Record<string, unknown>} values - all parsed CLI values, including custom options
   * @returns {Promise<void>}
   */
  async convertFiles(files, options, values) {
    for (const file of files) {
      if (values.verbose) console.log(`converting file ${file}`)
      if (values.timings) {
        const timings = Timings.create()
        const fileOptions = { ...options, timings }
        const result = await convertFile(file, fileOptions)
        if (options.to_file === false && typeof result === 'string')
          process.stdout.write(result)
        timings.printReport(process.stderr, file)
      } else {
        const result = await convertFile(file, options)
        if (options.to_file === false && typeof result === 'string')
          process.stdout.write(result)
      }
    }
  }

  /** @internal */
  _prepareProcessor(values) {
    const requirePaths = values.require
    if (!requirePaths) return
    for (const requirePath of requirePaths) {
      requireLibrary(requirePath)
    }
  }

  /** @internal */
  _prepareExtensions(values) {
    const extensionPaths = values.extension
    if (!extensionPaths || extensionPaths.length === 0) return
    for (const extensionPath of extensionPaths) {
      const lib = requireLibrary(extensionPath)
      const registerFn = lib?.register ?? lib?.default
      if (typeof registerFn === 'function') {
        Extensions.register(function () {
          registerFn(this)
        })
      }
    }
  }

  /** @internal */
  async _convertFromStdin(options) {
    const data = await _readFromStdin()
    const output = await convert(data, { ...options, to_file: false })
    process.stdout.write(output)
  }

  /** @internal */
  async _exit(failureLevel) {
    const logger = LoggerManager.getLogger()
    const maxSeverity = logger.getMaxSeverity()
    const code = maxSeverity !== null && maxSeverity >= failureLevel ? 1 : 0
    process.exit(code)
  }
}

function _readFromStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read()
      if (chunk !== null) data += chunk
    })
    process.stdin.on('error', reject)
    process.stdin.on('end', () => resolve(data.replace(/\n$/, '')))
  })
}

/**
 * Run the CLI.
 * Equivalent to `new Invoker(new Options().parse(argv)).invoke()`.
 *
 * @param {string[]} [argv=process.argv]
 * @returns {Promise<void>}
 */
export async function run(argv = process.argv) {
  return new Invoker(new Options().parse(argv)).invoke()
}
