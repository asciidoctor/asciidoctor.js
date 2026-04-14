// ESM conversion of timings.rb
//
// Ruby-to-JavaScript notes:
//   - Process.clock_gettime(CLOCK_MONOTONIC) → performance.now() (ms, not s).
//     All stored values are in milliseconds.
//   - print_report writes to a stream; in JS the default is console.log.
//     Pass a { write(line) } object to customise the output destination.

export class Timings {
  static create () { return new Timings() }

  constructor () {
    this._log = {}
    this._timers = {}
  }

  start (key) {
    this._timers[key] = this._now()
  }

  record (key) {
    this._log[key] = this._now() - (this._timers[key] ?? 0)
    delete this._timers[key]
  }

  time (...keys) {
    const total = keys.reduce((sum, key) => sum + (this._log[key] || 0), 0)
    return total > 0 ? total : null
  }

  read ()           { return this.time('read') }
  parse ()          { return this.time('parse') }
  readParse ()      { return this.time('read', 'parse') }
  convert ()        { return this.time('convert') }
  readParseConvert () { return this.time('read', 'parse', 'convert') }
  write ()          { return this.time('write') }
  total ()          { return this.time('read', 'parse', 'convert', 'write') }

  // Public: Print a summary report.
  //
  // out     - An object with a write(line) or log(line) method (default: console).
  // subject - Optional String label for the input file.
  printReport (out = console, subject = null) {
    const writeln = typeof out.write === 'function'
      ? (s) => out.write(s + '\n')
      : (s) => out.log(s)
    if (subject) writeln(`Input file: ${subject}`)
    writeln(`  Time to read and parse source: ${(this.readParse() ?? 0).toFixed(5)}`)
    writeln(`  Time to convert document: ${(this.convert() ?? 0).toFixed(5)}`)
    writeln(`  Total time (read, parse and convert): ${(this.readParseConvert() ?? 0).toFixed(5)}`)
  }

  _now () {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
  }
}