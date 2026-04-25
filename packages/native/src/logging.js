// ESM conversion of logging.rb
//
// Ruby-to-JavaScript notes:
//   - Ruby's Logger hierarchy (Logger, MemoryLogger, NullLogger) is reimplemented
//     without inheriting from a stdlib Logger class.
//   - Severity levels mirror Ruby's Logger::Severity constants.
//   - Logger.BasicFormatter formats messages as "asciidoctor: SEVERITY: text\n".
//   - Logger.AutoFormattingMessage is an interface for objects that carry both
//     text and source_location; in JS it is a plain object with a custom
//     toString / inspect method attached.
//   - LoggerManager is a module-level singleton object (not a class instance).
//   - The Logging mixin is applied via applyLogging(prototype) which installs
//     `logger` and `messageWithContext` on the target prototype.
//   - In JS there is no $stderr; the default pipe is console.error.

// ── Severity levels (mirrors Ruby Logger::Severity) ──────────────────────────
export const Severity = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
  UNKNOWN: 5,
}

const SEVERITY_LABEL = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'ANY']
const SEVERITY_LABEL_SUBSTITUTES = { WARN: 'WARNING', FATAL: 'FAILED' }

/**
 * Convert a string or nullable severity value to a numeric Severity constant.
 * @param {number|string|null|undefined} severity
 * @returns {number}
 * @internal
 */
function resolveSeverity(severity) {
  if (typeof severity === 'number') return severity
  if (typeof severity === 'string')
    return Severity[severity.toUpperCase()] ?? Severity.UNKNOWN
  return severity ?? Severity.UNKNOWN
}

// ── Logger ────────────────────────────────────────────────────────────────────

/** Standard logger that writes formatted messages to stderr or a custom pipe. */
export class Logger {
  constructor(opts = {}) {
    this.progname = opts.progname ?? 'asciidoctor'
    this.level = opts.level ?? Severity.WARN
    /** @internal */
    this._maxSeverity = null
    /** @internal */
    this._formatter = opts.formatter ?? new Logger.BasicFormatter()
    /** @internal */
    this._pipe = opts.pipe ?? null // null → write via _writeln
  }

  /** getter/setter so custom logger impls can access this.formatter */
  get formatter() {
    return this._formatter
  }
  set formatter(f) {
    this._formatter = f
  }

  /** @returns {number|null} The highest severity level logged so far. */
  get maxSeverity() {
    return this._maxSeverity
  }

  // Fluent getters/setters (used by the public API consumed by tests)
  getLevel() {
    return this.level
  }
  setLevel(n) {
    this.level = n
  }
  getFormatter() {
    return this._formatter
  }
  setFormatter(f) {
    this._formatter = f
  }
  getProgramName() {
    return this.progname
  }
  setProgramName(n) {
    this.progname = n
  }
  getMaxSeverity() {
    return this._maxSeverity
  }

  /** @returns {boolean} Whether DEBUG-level messages will be logged. */
  isDebugEnabled() {
    return this.level <= Severity.DEBUG
  }
  /** @returns {boolean} Whether INFO-level messages will be logged. */
  isInfoEnabled() {
    return this.level <= Severity.INFO
  }
  /** @returns {boolean} Whether WARN-level messages will be logged. */
  isWarnEnabled() {
    return this.level <= Severity.WARN
  }
  /** @returns {boolean} Whether ERROR-level messages will be logged. */
  isErrorEnabled() {
    return this.level <= Severity.ERROR
  }
  /** @returns {boolean} Whether FATAL-level messages will be logged. */
  isFatalEnabled() {
    return this.level <= Severity.FATAL
  }

  // Kept for internal compatibility
  isDebug() {
    return this.level <= Severity.DEBUG
  }
  isInfo() {
    return this.level <= Severity.INFO
  }

  /**
   * Log a message at the given severity level.
   * @param {number|string} severity - Severity level (numeric constant or string name).
   * @param {string|{inspect?(): string}|null} [message=null] - The message to log.
   * @param {string|Function|null} [progname=null] - Program name or message supplier function.
   * @returns {boolean}
   */
  add(severity, message = null, progname = null) {
    severity = resolveSeverity(severity)
    if (this._maxSeverity === null || severity > this._maxSeverity) {
      this._maxSeverity = severity
    }
    if (severity < this.level) return true
    const text =
      message ?? (typeof progname === 'function' ? progname() : progname)
    const label = SEVERITY_LABEL[severity] ?? 'ANY'
    const line = this._formatter.call(label, null, this.progname, text)
    this._writeln(line)
    return true
  }

  /** Alias for {@link add} (Ruby Logger API). */
  log(severity, message, progname) {
    return this.add(severity, message, progname)
  }

  debug(msg, progname) {
    return this.add(Severity.DEBUG, msg, progname)
  }
  info(msg, progname) {
    return this.add(Severity.INFO, msg, progname)
  }
  warn(msg, progname) {
    return this.add(Severity.WARN, msg, progname)
  }
  error(msg, progname) {
    return this.add(Severity.ERROR, msg, progname)
  }
  fatal(msg, progname) {
    return this.add(Severity.FATAL, msg, progname)
  }
  unknown(msg, progname) {
    return this.add(Severity.UNKNOWN, msg, progname)
  }

  /**
   * Write a formatted line to stderr or console.error.
   * @param {string} line
   * @internal
   */
  _writeln(line) {
    if (typeof process !== 'undefined' && process.stderr?.write) {
      process.stderr.write(line)
    } else {
      console.error(line.replace(/\n$/, ''))
    }
  }
}

Logger.BasicFormatter = class {
  /**
   * Format a log entry as "progname: SEVERITY: message\n".
   * @param {number|string} severity
   * @param {null} _time
   * @param {string} progname
   * @param {string|{inspect?(): string}} msg
   * @returns {string}
   */
  call(severity, _time, progname, msg) {
    // severity may be numeric (from newLogger impls) or a string label
    const label =
      typeof severity === 'number'
        ? (SEVERITY_LABEL[severity] ?? 'ANY')
        : severity
    const substituted = SEVERITY_LABEL_SUBSTITUTES[label] ?? label
    const text =
      typeof msg === 'string' ? msg : (msg?.inspect?.() ?? String(msg))
    return `${progname}: ${substituted}: ${text}\n`
  }
}

Logger.AutoFormattingMessage = {
  /**
   * Attach auto-formatting to any plain object carrying { text, source_location }.
   * @param {{text: string, source_location?: string}} obj
   * @returns {typeof obj} The same object with inspect() and toString() added.
   */
  attach(obj) {
    obj.inspect = function () {
      const sloc = this.source_location
      return sloc ? `${sloc}: ${this.text}` : this.text
    }
    obj.toString = obj.inspect
    return obj
  },
}

// ── LogMessage ────────────────────────────────────────────────────────────────

/** Wrapper stored by MemoryLogger; provides getSeverity/getText/getSourceLocation. */
class LogMessage {
  constructor(severity, message) {
    this.message = message
    this.severity = severity // string label, e.g. 'ERROR'
    // AutoFormattingMessage objects carry { text, source_location }
    if (message !== null && typeof message === 'object' && 'text' in message) {
      this._text = message.text
      this._sourceLocation = message.source_location ?? null
    } else {
      this._text = message != null ? String(message) : ''
      this._sourceLocation = null
    }
  }

  getSeverity() {
    return this.severity
  }
  getText() {
    return this._text
  }
  getSourceLocation() {
    return this._sourceLocation ?? undefined
  }
}

// ── MemoryLogger ──────────────────────────────────────────────────────────────

/** In-memory logger that stores all log messages for later inspection. */
export class MemoryLogger {
  constructor() {
    // Default level is UNKNOWN (highest) so isDebug() returns false by default,
    // matching Ruby's MemoryLogger (level: UNKNOWN). The add() method stores all
    // messages unconditionally — level is only used by the isDebug() guard.
    this.level = Severity.UNKNOWN
    this.messages = []
  }

  static create() {
    return new MemoryLogger()
  }

  getMessages() {
    return this.messages
  }

  getMaxSeverity() {
    if (this.messages.length === 0) return null
    return Math.max(
      ...this.messages.map((m) => Severity[m.getSeverity()] ?? Severity.UNKNOWN)
    )
  }

  add(severity, message = null, progname = null) {
    const sev = resolveSeverity(severity)
    const msg =
      message ?? (typeof progname === 'function' ? progname() : progname)
    const severityName = SEVERITY_LABEL[sev] ?? 'UNKNOWN'
    this.messages.push(new LogMessage(severityName, msg))
    return true
  }

  debug(msg, pn) {
    return this.add(Severity.DEBUG, msg, pn)
  }
  info(msg, pn) {
    return this.add(Severity.INFO, msg, pn)
  }
  warn(msg, pn) {
    return this.add(Severity.WARN, msg, pn)
  }
  error(msg, pn) {
    return this.add(Severity.ERROR, msg, pn)
  }
  fatal(msg, pn) {
    return this.add(Severity.FATAL, msg, pn)
  }
  unknown(msg, pn) {
    return this.add(Severity.UNKNOWN, msg, pn)
  }

  log(severity, message, progname) {
    return this.add(severity, message, progname)
  }

  isDebug() {
    return this.level <= Severity.DEBUG
  }
  isInfo() {
    return this.level <= Severity.INFO
  }

  /**
   * Write a string at INFO level (trailing newline stripped).
   * Allows MemoryLogger to be used with Timings.printReport().
   * @param {string} s
   * @returns {boolean}
   */
  write(s) {
    return this.info(s.replace(/\n$/, ''))
  }

  clear() {
    this.messages.length = 0
  }
  empty() {
    return this.messages.length === 0
  }
}

// ── NullLogger ────────────────────────────────────────────────────────────────

/** Logger that discards all messages but still tracks the maximum severity. */
export class NullLogger {
  constructor() {
    this.level = Severity.UNKNOWN
    this._maxSeverity = null
  }

  static create() {
    return new NullLogger()
  }

  get maxSeverity() {
    return this._maxSeverity
  }
  getMaxSeverity() {
    return this._maxSeverity
  }

  add(severity) {
    const sev = resolveSeverity(severity)
    if (this._maxSeverity === null || sev > this._maxSeverity)
      this._maxSeverity = sev
    return true
  }

  log(severity) {
    return this.add(severity)
  }

  debug() {
    return this.add(Severity.DEBUG)
  }
  info() {
    return this.add(Severity.INFO)
  }
  warn() {
    return this.add(Severity.WARN)
  }
  error() {
    return this.add(Severity.ERROR)
  }
  fatal() {
    return this.add(Severity.FATAL)
  }
  unknown() {
    return this.add(Severity.UNKNOWN)
  }
}

// ── LoggerManager ─────────────────────────────────────────────────────────────

/**
 * Module-level singleton — the active logger is stored here and can be
 * replaced by callers (e.g. the load function).
 */
export const LoggerManager = (() => {
  let _loggerClass = Logger
  let _logger = null

  return {
    get loggerClass() {
      return _loggerClass
    },
    set loggerClass(cls) {
      _loggerClass = cls
    },

    get logger() {
      if (!_logger) _logger = new _loggerClass()
      return _logger
    },
    set logger(newLogger) {
      _logger = newLogger ?? new _loggerClass()
    },

    // Public API (mirrors Ruby LoggerManager)
    getLogger() {
      return this.logger
    },
    setLogger(newLogger) {
      this.logger = newLogger
    },

    /**
     * Create a new formatter whose call() delegates to the provided impl.
     * @param {string} _name
     * @param {{call: Function}} impl
     * @returns {{call: Function}}
     */
    newFormatter(_name, impl) {
      return { call: impl.call.bind(impl) }
    },

    /**
     * Create a new Logger instance with custom behaviour supplied via impl.
     * @param {string} _name
     * @param {{add?: (severity: number, message: any, progname: any) => boolean, postConstruct?: (this: Logger) => void}} impl
     *   - `add(severity, message, progname)` — overrides the default add method; severity is always numeric.
     *   - `postConstruct()` — called once after the instance is created (`this` is the logger instance).
     * @returns {Logger}
     */
    newLogger(_name, impl) {
      const inst = new Logger()
      if (impl.add) {
        const customAdd = impl.add
        inst.add = function (severity, message = null, progname = null) {
          const sev = resolveSeverity(severity)
          if (this._maxSeverity === null || sev > this._maxSeverity) {
            this._maxSeverity = sev
          }
          return customAdd.call(this, sev, message, progname)
        }
        // Re-bind shorthand methods so they resolve through the custom add
        for (const [meth, sev] of [
          ['debug', Severity.DEBUG],
          ['info', Severity.INFO],
          ['warn', Severity.WARN],
          ['error', Severity.ERROR],
          ['fatal', Severity.FATAL],
          ['unknown', Severity.UNKNOWN],
        ]) {
          inst[meth] = (msg, pn) => inst.add(sev, msg, pn)
        }
        inst.log = (severity, msg, pn) => inst.add(severity, msg, pn)
      }
      if (impl.postConstruct) impl.postConstruct.call(inst)
      return inst
    },
  }
})()

// ── Logging mixin ─────────────────────────────────────────────────────────────

/**
 * Apply the Logging mixin to a class prototype.
 *
 * Installs the following on proto:
 * - `logger` getter — returns `LoggerManager.logger`
 * - `getLogger()` — method alias for the logger getter
 * - `messageWithContext(text, context)` — builds an auto-formatting message object
 * - `createLogMessage(text, context)` — alias for messageWithContext (used in extensions)
 *
 * @param {Object} proto - The prototype object (e.g. MyClass.prototype) to augment.
 */
export function applyLogging(proto) {
  Object.defineProperty(proto, 'logger', {
    get() {
      return LoggerManager.logger
    },
    configurable: true,
  })

  proto.getLogger = () => LoggerManager.logger

  proto.messageWithContext = (text, context = {}) =>
    Logger.AutoFormattingMessage.attach({ text, ...context })

  proto.createLogMessage = proto.messageWithContext
}

/**
 * Plain object implementing the Logging mixin interface, for use in non-class contexts
 * (e.g. top-level module functions).
 */
export const Logging = {
  get logger() {
    return LoggerManager.logger
  },
  getLogger() {
    return LoggerManager.logger
  },
  messageWithContext(text, context = {}) {
    return Logger.AutoFormattingMessage.attach({ text, ...context })
  },
  createLogMessage(text, context = {}) {
    return Logger.AutoFormattingMessage.attach({ text, ...context })
  },
}