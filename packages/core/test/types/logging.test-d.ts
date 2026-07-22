// Type-level tests for Logger/MemoryLogger/NullLogger and the LoggerLike
// union returned by every `getLogger()`/`#logger` in the codebase.
//
// These are compile-only checks: `npm run test:types` runs `tsc --noEmit`
// against this file using the generated declarations in ../../types.
// A regression in the JSDoc typings makes this file fail to compile.
//
// Context: `getLogger()` resolves to `LoggerLike` (`Logger | MemoryLogger |
// NullLogger | Console`). Calling a method on a union type requires the call
// to satisfy every member's signature, so a single unannotated `progname`
// parameter on `Logger`/`MemoryLogger` was enough to make the whole union
// require 2 arguments, even though the documented single-argument usage
// (`doc.getLogger().warn(doc.messageWithContext(...))`) is valid at runtime.

import {
  type ConverterBase as ConverterBaseType,
  ConverterBase,
  type Document,
  load,
  Logger,
  LoggerManager,
  type LogMessage,
  MemoryLogger,
  NullLogger,
  Registry,
} from '../../types/index.js'
import { PathResolver } from '../../types/path_resolver.js'
import type { Cursor } from '../../types/reader.js'
import { type LoggerLike, Severity, withLogger } from '../../types/logging.js'

const doc: Document = await load('= Title')

// ── single-argument form: the documented extension/converter pattern ──────────
doc.getLogger().warn(
  doc.messageWithContext('skipping emoji inline macro, smile not found', {
    source_location: doc.getSourceLocation(),
  })
)
doc.getLogger().error('plain string message')
doc.getLogger().info(doc.createLogMessage('info message'))
doc.getLogger().debug('debug message')

// ── the `logger` getter alias behaves the same as getLogger() ─────────────────
doc.logger.warn('via the logger getter')

// ── two-argument form: msg + progname, or msg + a message-supplier function ───
doc.getLogger().warn('deprecated API', 'my-extension')
doc.getLogger().warn(null, () => 'lazily computed message')

// ── reader.getLogger() inside a preprocessor uses the same LoggerLike union ───
const registry = new Registry()
registry.preprocessor(function () {
  this.process((document, reader) => {
    reader.getLogger().warn(reader.createLogMessage('include not found'))
    void document
    return reader
  })
})

// ── messageWithContext()/createLogMessage() on every applyLogging() consumer ──
// (Document above; also ConverterBase, PathResolver, and Table.ParserContext,
// which install the same 4 members at runtime but need them redeclared in the
// class body — see logging.js's "Logging mixin" comment in each file.)
class MyConverter extends ConverterBase {
  convert_paragraph(node: unknown) {
    this.getLogger().warn(
      this.messageWithContext('unsupported paragraph style')
    )
    void node
    return ''
  }
}
const converter: ConverterBaseType = new MyConverter('html5')
void converter

const pathResolver = new PathResolver()
pathResolver
  .getLogger()
  .warn(pathResolver.createLogMessage('unsafe path resolved'))

// ── console is a valid LoggerLike (fallback when no document is attached) ─────
const consoleAsLogger: LoggerLike = console
consoleAsLogger.warn('console message')

// ── Logger: single required message + optional progname ───────────────────────
const logger = new Logger()
logger.warn('hello')
logger.warn('hello', 'progname')
const warned: boolean = logger.warn('hello')
void warned
logger.log(Severity.WARN, 'via log()/add() alias')
logger.log('WARN', 'severity as a string label')
const maxSeverity: number = logger.getMaxSeverity()
void maxSeverity

// ── MemoryLogger: same shorthand surface, plus message inspection ─────────────
const memoryLogger = new MemoryLogger()
memoryLogger.warn('captured message')
const messages: LogMessage[] = memoryLogger.getMessages()
const [firstMessage] = messages
if (firstMessage) {
  const severity: string = firstMessage.getSeverity()
  const text: string = firstMessage.getText()
  const sourceLocation: Cursor | undefined = firstMessage.getSourceLocation()
  void severity
  void text
  void sourceLocation
}

// ── NullLogger: every shorthand takes zero arguments ───────────────────────────
const nullLogger = new NullLogger()
nullLogger.warn()
nullLogger.error()
nullLogger.debug()
nullLogger.info()
nullLogger.fatal()
nullLogger.unknown()

// ── LoggerManager: get/set the process-wide default logger ────────────────────
LoggerManager.setLogger(memoryLogger)
const current: Logger = LoggerManager.getLogger()
void current

// ── withLogger(logger, fn): scope a logger to an async execution ──────────────
await withLogger(memoryLogger, async () => {
  doc.getLogger().warn('scoped warning')
})

// ── fatal()/unknown(): NOT on the raw LoggerLike union, because Console has ───
// neither (Node's console object really lacks them — calling them through a
// console-backed logger would throw at runtime, so rejecting them here is
// correct, not a typing gap). Narrowing LoggerLike away from Console (e.g.
// with an `in` check, or `instanceof Logger`/`instanceof MemoryLogger`)
// restores fatal()/unknown().
const maybeLogger: LoggerLike = doc.getLogger()

// @ts-expect-error fatal() is missing on the Console member of LoggerLike
maybeLogger.fatal('nope')
// @ts-expect-error unknown() is missing on the Console member of LoggerLike
maybeLogger.unknown('nope')

if ('fatal' in maybeLogger) {
  // narrowed to Logger | MemoryLogger | NullLogger
  maybeLogger.fatal('fatal message')
  maybeLogger.unknown('unknown-severity message')
}

if (maybeLogger instanceof Logger) {
  // Logger | NullLogger (NullLogger extends Logger)
  maybeLogger.fatal('fatal via instanceof Logger')
  maybeLogger.unknown('unknown via instanceof Logger')
}

if (maybeLogger instanceof MemoryLogger) {
  maybeLogger.fatal('fatal via instanceof MemoryLogger')
  maybeLogger.unknown('unknown via instanceof MemoryLogger')
}

// ── Negative checks: misuse must NOT compile ───────────────────────────────────
// @ts-expect-error severity is required on Logger#add()
logger.add()

// @ts-expect-error NullLogger's shorthand methods take no arguments
nullLogger.warn('message')
