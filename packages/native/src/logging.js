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
  DEBUG:   0,
  INFO:    1,
  WARN:    2,
  ERROR:   3,
  FATAL:   4,
  UNKNOWN: 5,
}

const SEVERITY_LABEL = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'ANY']
const SEVERITY_LABEL_SUBSTITUTES = { WARN: 'WARNING', FATAL: 'FAILED' }

// ── Logger ────────────────────────────────────────────────────────────────────

export class Logger {
  constructor (opts = {}) {
    this.progname = opts.progname ?? 'asciidoctor'
    this.level = opts.level ?? Severity.WARN
    this._maxSeverity = null
    this._formatter = opts.formatter ?? new Logger.BasicFormatter()
    this._pipe = opts.pipe ?? null  // null → write via _writeln
  }

  get maxSeverity () { return this._maxSeverity }

  add (severity, message = null, progname = null) {
    severity = severity ?? Severity.UNKNOWN
    if (this._maxSeverity === null || severity > this._maxSeverity) {
      this._maxSeverity = severity
    }
    if (severity < this.level) return true
    const text = message ?? (typeof progname === 'function' ? progname() : progname)
    const line = this._formatter.call(SEVERITY_LABEL[severity] ?? 'ANY', null, this.progname, text)
    this._writeln(line)
    return true
  }

  debug (msg, progname)   { return this.add(Severity.DEBUG,   msg, progname) }
  info (msg, progname)    { return this.add(Severity.INFO,    msg, progname) }
  warn (msg, progname)    { return this.add(Severity.WARN,    msg, progname) }
  error (msg, progname)   { return this.add(Severity.ERROR,   msg, progname) }
  fatal (msg, progname)   { return this.add(Severity.FATAL,   msg, progname) }
  unknown (msg, progname) { return this.add(Severity.UNKNOWN, msg, progname) }

  _writeln (line) {
    // Remove trailing newline added by formatter before passing to console
    process?.stderr?.write?.(line) ?? console.error(line.replace(/\n$/, ''))
  }
}

Logger.BasicFormatter = class {
  call (severity, _time, progname, msg) {
    const label = SEVERITY_LABEL_SUBSTITUTES[severity] ?? severity
    const text = typeof msg === 'string' ? msg : (msg?.inspect?.() ?? String(msg))
    return `${progname}: ${label}: ${text}\n`
  }
}

Logger.AutoFormattingMessage = {
  // Attach auto-formatting to any plain object carrying { text, source_location }.
  // Returns the same object with an inspect() method added.
  attach (obj) {
    obj.inspect = function () {
      const sloc = this.source_location
      return sloc ? `${sloc}: ${this.text}` : this.text
    }
    obj.toString = obj.inspect
    return obj
  },
}

// ── MemoryLogger ──────────────────────────────────────────────────────────────

export class MemoryLogger {
  constructor () {
    this.level = Severity.UNKNOWN
    this.messages = []
    this._maxSeverity = null
  }

  get maxSeverity () {
    if (this.messages.length === 0) return null
    return Math.max(...this.messages.map(m => Severity[m.severity] ?? Severity.UNKNOWN))
  }

  add (severity, message = null, progname = null) {
    const sev = severity ?? Severity.UNKNOWN
    const msg = message ?? (typeof progname === 'function' ? progname() : progname)
    const severityName = Object.keys(Severity).find(k => Severity[k] === sev) ?? 'UNKNOWN'
    this.messages.push({ severity: severityName, message: msg })
    return true
  }

  debug (msg, pn)   { return this.add(Severity.DEBUG,   msg, pn) }
  info (msg, pn)    { return this.add(Severity.INFO,    msg, pn) }
  warn (msg, pn)    { return this.add(Severity.WARN,    msg, pn) }
  error (msg, pn)   { return this.add(Severity.ERROR,   msg, pn) }
  fatal (msg, pn)   { return this.add(Severity.FATAL,   msg, pn) }
  unknown (msg, pn) { return this.add(Severity.UNKNOWN, msg, pn) }

  clear () { this.messages.length = 0 }
  empty () { return this.messages.length === 0 }
}

// ── NullLogger ────────────────────────────────────────────────────────────────

export class NullLogger {
  constructor () {
    this.level = Severity.UNKNOWN
    this._maxSeverity = null
  }

  get maxSeverity () { return this._maxSeverity }

  add (severity) {
    const sev = severity ?? Severity.UNKNOWN
    if (this._maxSeverity === null || sev > this._maxSeverity) this._maxSeverity = sev
    return true
  }

  debug ()   { return this.add(Severity.DEBUG) }
  info ()    { return this.add(Severity.INFO) }
  warn ()    { return this.add(Severity.WARN) }
  error ()   { return this.add(Severity.ERROR) }
  fatal ()   { return this.add(Severity.FATAL) }
  unknown () { return this.add(Severity.UNKNOWN) }
}

// ── LoggerManager ─────────────────────────────────────────────────────────────
// Module-level singleton — the active logger is stored here and can be
// replaced by callers (e.g. the `load` function).

export const LoggerManager = (() => {
  let _loggerClass = Logger
  let _logger = null

  return {
    get loggerClass () { return _loggerClass },
    set loggerClass (cls) { _loggerClass = cls },

    get logger () {
      if (!_logger) _logger = new _loggerClass()
      return _logger
    },
    set logger (newLogger) {
      _logger = newLogger ?? new _loggerClass()
    },
  }
})()

// ── Logging mixin ─────────────────────────────────────────────────────────────

// Public: Apply the Logging mixin to a class prototype.
//
// proto - The prototype object (e.g. MyClass.prototype) to augment.
//
// The mixin installs:
//   logger               - getter that returns LoggerManager.logger
//   messageWithContext() - builds an auto-formatting message object
export function applyLogging (proto) {
  Object.defineProperty(proto, 'logger', {
    get () { return LoggerManager.logger },
    configurable: true,
  })

  proto.messageWithContext = function (text, context = {}) {
    return Logger.AutoFormattingMessage.attach({ text, ...context })
  }
}

// Convenience: a plain object implementing the Logging mixin interface,
// for use in non-class contexts (e.g. top-level module functions).
export const Logging = {
  get logger () { return LoggerManager.logger },
  messageWithContext (text, context = {}) {
    return Logger.AutoFormattingMessage.attach({ text, ...context })
  },
}
