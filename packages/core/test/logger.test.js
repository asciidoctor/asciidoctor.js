import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  LoggerManager,
  MemoryLogger,
  NullLogger,
  Timings,
  Extensions,
  convert,
} from '../src/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PART_WITH_NO_SECTION = `= Book
:doctype: book

= Part 1

[partintro]
intro
`

describe('Logger', () => {
  test('should get default logger', () => {
    const defaultLogger = LoggerManager.getLogger()
    assert.equal(defaultLogger.getLevel(), 2)
    assert.equal(defaultLogger.getProgramName(), 'asciidoctor')
    assert.ok(defaultLogger.getFormatter(), 'formatter should be defined')
  })

  test('should send an error message if part has no section', async () => {
    const defaultLogger = LoggerManager.getLogger()
    const memoryLogger = MemoryLogger.create()
    try {
      LoggerManager.setLogger(memoryLogger)
      await convert(PART_WITH_NO_SECTION)
      const errorMessage = memoryLogger.getMessages()[0]
      assert.equal(errorMessage.getSeverity(), 'ERROR')
      assert.equal(
        errorMessage.getText(),
        'invalid part, must have at least one section (e.g., chapter, appendix, etc.)'
      )
      const sourceLocation = errorMessage.getSourceLocation()
      assert.equal(sourceLocation.getLineNumber(), 8)
      assert.equal(sourceLocation.getFile(), undefined)
      if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
        assert.equal(sourceLocation.getDirectory(), process.cwd())
      }
      assert.equal(sourceLocation.getPath(), '<stdin>')
    } finally {
      LoggerManager.setLogger(defaultLogger)
    }
  })

  test('should be able to set program name', () => {
    const defaultLogger = LoggerManager.getLogger()
    try {
      assert.equal(defaultLogger.getProgramName(), 'asciidoctor')
      defaultLogger.setProgramName('asciidoctor.js')
      assert.equal(defaultLogger.getProgramName(), 'asciidoctor.js')
    } finally {
      defaultLogger.setProgramName('asciidoctor') // reset
    }
  })

  test('should be able to set log level', () => {
    const defaultLogger = LoggerManager.getLogger()
    try {
      assert.equal(defaultLogger.getLevel(), 2)
      defaultLogger.setLevel(3)
      assert.equal(defaultLogger.getLevel(), 3)
    } finally {
      defaultLogger.setLevel(2) // reset
    }
  })

  test('should use the default formatter', async () => {
    const defaultLogger = LoggerManager.getLogger()
    const defaultFormatter = defaultLogger.getFormatter()
    const canInterceptStderr =
      typeof process !== 'undefined' &&
      typeof process.stderr?.write === 'function'
    const processStderrWriteFunction = canInterceptStderr
      ? process.stderr.write
      : null
    let stderrOutput = ''
    if (canInterceptStderr) {
      process.stderr.write = (chunk) => {
        stderrOutput += chunk
      }
    }
    try {
      await convert(PART_WITH_NO_SECTION)
      if (canInterceptStderr)
        assert.equal(
          stderrOutput,
          'asciidoctor: ERROR: <stdin>: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)\n'
        )
    } finally {
      defaultLogger.setFormatter(defaultFormatter)
      if (canInterceptStderr) process.stderr.write = processStderrWriteFunction
    }
  })

  test('should be able to use a JSON formatter', async () => {
    const defaultLogger = LoggerManager.getLogger()
    const defaultFormatter = defaultLogger.getFormatter()
    const canInterceptStderr =
      typeof process !== 'undefined' &&
      typeof process.stderr?.write === 'function'
    const processStderrWriteFunction = canInterceptStderr
      ? process.stderr.write
      : null
    let stderrOutput = ''
    if (canInterceptStderr) {
      process.stderr.write = (chunk) => {
        stderrOutput += chunk
      }
    }
    try {
      defaultLogger.setFormatter(
        LoggerManager.newFormatter('JsonFormatter', {
          call: (severity, time, programName, message) => {
            const text = message.text
            const sourceLocation = message.source_location
            return `${JSON.stringify({
              programName,
              message: text,
              sourceLocation: {
                lineNumber: sourceLocation.getLineNumber(),
                path: sourceLocation.getPath(),
              },
              severity,
            })}\n`
          },
        })
      )
      await convert(PART_WITH_NO_SECTION)
      if (canInterceptStderr) {
        assert.equal(
          stderrOutput,
          '{"programName":"asciidoctor","message":"invalid part, must have at least one section (e.g., chapter, appendix, etc.)","sourceLocation":{"lineNumber":8,"path":"<stdin>"},"severity":"ERROR"}\n'
        )
        assert.equal(
          JSON.parse(stderrOutput).message,
          'invalid part, must have at least one section (e.g., chapter, appendix, etc.)'
        )
      }
    } finally {
      defaultLogger.setFormatter(defaultFormatter)
      if (canInterceptStderr) process.stderr.write = processStderrWriteFunction
    }
  })

  test('should not log anything when NullLogger is used', async () => {
    const defaultLogger = LoggerManager.getLogger()
    const nullLogger = NullLogger.create()
    const canInterceptStderr =
      typeof process !== 'undefined' &&
      typeof process.stderr?.write === 'function'
    const stderrWriteFunction = canInterceptStderr ? process.stderr.write : null
    let stderrOutput = ''
    if (canInterceptStderr) {
      process.stderr.write = (chunk) => {
        stderrOutput += chunk
      }
    }
    try {
      LoggerManager.setLogger(nullLogger)
      await convert(PART_WITH_NO_SECTION)
      assert.equal(nullLogger.getMaxSeverity(), 3)
      if (canInterceptStderr) assert.equal(stderrOutput, '')
    } finally {
      if (canInterceptStderr) process.stderr.write = stderrWriteFunction
      LoggerManager.setLogger(defaultLogger)
    }
  })

  test('should create a custom Logger', async () => {
    const defaultLogger = LoggerManager.getLogger()
    const buildDir = path.join(__dirname, '..', 'build')
    fs.mkdirSync(buildDir, { recursive: true })
    const logFile = path.join(buildDir, 'async.log')
    // Truncate the log file before each run
    fs.writeFileSync(logFile, '')
    const asyncLogger = LoggerManager.newLogger('AsyncFileLogger', {
      postConstruct: function () {
        this.writer = fs.createWriteStream(logFile, { flags: 'a' })
      },
      add: function (severity, message, _progname) {
        const log = this.formatter.call(
          severity,
          new Date(),
          this.progname,
          message
        )
        this.writer.write(log)
      },
    })

    try {
      LoggerManager.setLogger(asyncLogger)
      await convert(PART_WITH_NO_SECTION)
      await new Promise((resolve) => asyncLogger.writer.end(resolve))
      assert.equal(
        fs.readFileSync(logFile, 'UTF-8'),
        'asciidoctor: ERROR: <stdin>: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)\n'
      )
    } finally {
      LoggerManager.setLogger(defaultLogger)
    }
  })

  test('should print timings to the MemoryLogger', async () => {
    const memoryLogger = MemoryLogger.create()
    const timings = Timings.create()
    const options = { timings }
    await convert('Hello *world*', options)
    timings.printReport(memoryLogger, 'stdin')
    const messages = memoryLogger.getMessages()
    assert.equal(messages.length, 4)
    assert.equal(messages[0].getSeverity(), 'INFO')
    assert.equal(messages[0].getText(), 'Input file: stdin')
  })

  test('should print a message with context', async () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('plantuml')
      this.onContext(['listing'])
      this.parseContentAs('raw')
      this.process((parent, reader) => {
        const lines = reader.getLines()
        if (lines.length === 0) {
          reader.getLogger().log(
            'warn',
            reader.createLogMessage('plantuml block is empty', {
              source_location: reader.getCursor(),
            })
          )
          reader.getLogger().fatal('game over')
        }
      })
    })
    const input = `
[plantuml]
----
----`
    const defaultLogger = LoggerManager.getLogger()
    const memoryLogger = MemoryLogger.create()
    try {
      LoggerManager.setLogger(memoryLogger)
      await convert(input, { extension_registry: registry })
      const warnMessage = memoryLogger.getMessages()[0]
      assert.equal(warnMessage.getSeverity(), 'WARN')
      assert.equal(warnMessage.getText(), 'plantuml block is empty')
      const sourceLocation = warnMessage.getSourceLocation()
      assert.equal(sourceLocation.getLineNumber(), 1)
      assert.equal(sourceLocation.getFile(), undefined)
      assert.equal(sourceLocation.getDirectory(), '.')
      assert.equal(sourceLocation.getPath(), '<stdin>')
      const fatalMessage = memoryLogger.getMessages()[1]
      assert.equal(fatalMessage.getSeverity(), 'FATAL')
      assert.equal(fatalMessage.getText(), 'game over')
    } finally {
      LoggerManager.setLogger(defaultLogger)
    }
  })

  test('should return true if the logger instance is enabled for the specified level', () => {
    const defaultLogger = LoggerManager.getLogger()
    assert.equal(defaultLogger.isDebugEnabled(), false)
    assert.equal(defaultLogger.isInfoEnabled(), false)
    assert.equal(defaultLogger.isWarnEnabled(), true)
    assert.equal(defaultLogger.isErrorEnabled(), true)
    assert.equal(defaultLogger.isFatalEnabled(), true)
  })

  test('should log using a message', () => {
    const logs = []
    const customLogger = LoggerManager.newLogger('CustomLogger', {
      add: (severity, message, progname) => {
        logs.push({ severity, message: message || progname })
      },
    })
    customLogger.error('hello')
    const errorMessage = logs[0]
    assert.equal(errorMessage.severity, 3)
    assert.equal(errorMessage.message, 'hello')
  })

  test('should log using a message and a program name', () => {
    const logs = []
    const customLogger = LoggerManager.newLogger('CustomLogger', {
      add: (severity, message, progname) => {
        logs.push({ severity, message, progname })
      },
    })
    customLogger.add('error', 'hi', 'asciidoctor.js')
    const errorMessage = logs[0]
    assert.equal(errorMessage.severity, 3)
    assert.equal(errorMessage.message, 'hi')
    assert.equal(errorMessage.progname, 'asciidoctor.js')
  })

  test('should accept a message as block argument', async () => {
    const messages = []
    const memoryLogger = LoggerManager.newLogger('CustomMemoryLogger', {
      add: (severity, message, programName, block) => {
        if (typeof block === 'function') {
          messages.push(block())
        } else {
          messages.push(message)
        }
      },
    })
    const defaultLogger = LoggerManager.getLogger()
    try {
      LoggerManager.setLogger(memoryLogger)
      memoryLogger.add('error', 'before', 'asciidoctor.js')
      await convert('Hello, {name}!', {
        attributes: {
          'attribute-missing': 'drop-line',
        },
      })
      memoryLogger.add('error', 'after', 'asciidoctor.js')
      assert.equal(messages.length, 3)
      assert.ok(messages.includes('before'))
      assert.ok(
        messages.includes(
          'dropping line containing reference to missing attribute: name'
        )
      )
      assert.ok(messages.includes('after'))
    } finally {
      LoggerManager.setLogger(defaultLogger)
    }
  })
})
