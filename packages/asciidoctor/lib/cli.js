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

const HELP_TEXT = `asciidoctor [options...] files...
Translate the AsciiDoc source file or file(s) into the backend output format (e.g., HTML 5, DocBook 5, etc.)
By default, the output is written to a file with the basename of the source file and the appropriate extension

Options:
  -b, --backend <backend>           set output format backend
  -d, --doctype <doctype>           document type [article, book, manpage, inline]
  -o, --out-file <file>             output file; use '' or '-' for STDOUT
  -S, --safe-mode <mode>            safe mode level [unsafe, safe, server, secure]
  -e, --embedded                    suppress enclosing document structure
  -s, --no-header-footer            suppress enclosing document structure
  -n, --section-numbers             auto-number section titles in the HTML backend
  -B, --base-dir <dir>              base directory containing the document and resources
  -D, --destination-dir <dir>       destination output directory
      --failure-level <level>       minimum logging level that triggers non-zero exit code [INFO, WARN, ERROR, FATAL]
  -q, --quiet                       suppress warnings
      --trace                       include backtrace information on errors
  -v, --verbose                     enable verbose mode
  -t, --timings                     enable timings mode
  -T, --template-dir <dir>          directory with custom converter templates (repeatable)
  -E, --template-engine <engine>    template engine to use for custom converter templates
  -a, --attribute <key[=value]>     document attribute to set (repeatable)
  -r, --require <library>           require the specified library before executing the processor (repeatable)
  -V, --version                     display the version and runtime environment
      --help [syntax]               show this help; show AsciiDoc syntax overview if topic is 'syntax'`

function parseCliArgs(argv) {
  const args = argv.slice(2)
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      backend: { type: 'string', short: 'b' },
      doctype: { type: 'string', short: 'd' },
      'out-file': { type: 'string', short: 'o' },
      'safe-mode': { type: 'string', short: 'S' },
      embedded: { type: 'boolean', short: 'e' },
      'no-header-footer': { type: 'boolean', short: 's' },
      'section-numbers': { type: 'boolean', short: 'n' },
      'base-dir': { type: 'string', short: 'B' },
      'destination-dir': { type: 'string', short: 'D' },
      'failure-level': { type: 'string' },
      quiet: { type: 'boolean', short: 'q' },
      trace: { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v' },
      timings: { type: 'boolean', short: 't' },
      'template-dir': { type: 'string', short: 'T', multiple: true },
      'template-engine': { type: 'string', short: 'E' },
      attribute: { type: 'string', short: 'a', multiple: true },
      require: { type: 'string', short: 'r', multiple: true },
      version: { type: 'boolean', short: 'V' },
      help: { type: 'boolean' },
    },
  })
  return { values, positionals, args }
}

function buildOptions(values, extraAttrs = []) {
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
  } = values

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

  return { options, failureLevel, toStdout }
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

function prepareProcessor(values) {
  const requirePaths = values.require
  if (!requirePaths) return
  for (const requirePath of requirePaths) {
    const lib = requireLibrary(requirePath)
    if (lib && typeof lib.register === 'function') {
      lib.register(Extensions)
    }
  }
}

function getVersion() {
  const pkg = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')
  )
  return `Asciidoctor.js ${_getVersion()} (Asciidoctor ${getCoreVersion()}) [https://asciidoctor.org]
Runtime Environment (node ${process.version} on ${process.platform})
CLI version ${pkg.version}`
}

function readFromStdin() {
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

async function exit(failureLevel) {
  const logger = LoggerManager.getLogger()
  const maxSeverity = logger.getMaxSeverity()
  const code = maxSeverity !== null && maxSeverity >= failureLevel ? 1 : 0
  process.exit(code)
}

export async function run(argv = process.argv) {
  const { values, positionals, args } = parseCliArgs(argv)

  if (values.version || (values.verbose && args.length === 1)) {
    console.log(getVersion())
    process.exit(0)
  }

  if (values.help) {
    if (positionals[0] === 'syntax') {
      console.log(
        readFileSync(
          join(import.meta.dirname, '..', 'data', 'reference', 'syntax.adoc'),
          'utf8'
        )
      )
    } else {
      console.error(HELP_TEXT)
    }
    process.exit(0)
  }

  prepareProcessor(values)
  const { options, failureLevel, toStdout } = buildOptions(values)

  // Configure logger verbosity
  const logger = LoggerManager.getLogger()
  if (values.quiet)
    logger.setLevel(3) // ERROR
  else if (values.verbose) logger.setLevel(0) // DEBUG

  const files = positionals.filter((f) => f !== '-')
  const isStdin =
    positionals.includes('-') ||
    (files.length === 0 && args[args.length - 1] === '-')

  if (isStdin) {
    const data = await readFromStdin()
    const output = await convert(data, { ...options, to_file: false })
    process.stdout.write(output)
  } else if (files.length > 0) {
    for (const file of files) {
      if (values.verbose) console.log(`converting file ${file}`)
      if (values.timings) {
        const timings = Timings.create()
        const fileOptions = { ...options, timings }
        if (toStdout) fileOptions.to_file = false
        const result = await convertFile(file, fileOptions)
        if (toStdout && typeof result === 'string') process.stdout.write(result)
        timings.printReport(process.stderr, file)
      } else {
        const result = await convertFile(file, options)
        if (toStdout && typeof result === 'string') process.stdout.write(result)
      }
    }
  } else {
    console.error(HELP_TEXT)
    process.exit(0)
  }

  await exit(failureLevel)
}
