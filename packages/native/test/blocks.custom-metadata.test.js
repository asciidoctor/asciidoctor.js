import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { load } from '../src/load.js'
import { MemoryLogger, LoggerManager, Severity } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage, decodeChar } from './helpers.js'

const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const convertString = (input, opts = {}) => documentFromString(input, { standalone: true, ...opts }).then((doc) => doc.convert())
const convertStringToEmbedded = (input, opts = {}) => documentFromString(input, opts).then((doc) => doc.convert())
const blockFromString = async (input, opts = {}) => (await documentFromString(input, opts)).blocks[0]

describe('Blocks', () => {
  let logger
  let defaultLogger

  beforeEach(() => {
    defaultLogger = LoggerManager.logger
    LoggerManager.logger = logger = new MemoryLogger()
  })

  afterEach(() => {
    LoggerManager.logger = defaultLogger
  })

  describe('Custom Blocks', () => {
    test('should not warn if block style is unknown', async () => {
      const input = `\
[foo]
--
bar
--`
      await convertStringToEmbedded(input)
      assert.equal(logger.messages.length, 0)
    })

    test('should log debug message if block style is unknown and debug level is enabled', async () => {
      const input = `\
[foo]
--
bar
--`
      logger.level = Severity.DEBUG
      await convertStringToEmbedded(input)
      assertMessage(logger, 'debug', 'unknown style for open block: foo')
    })
  })

  describe('Metadata', () => {
    test('block title above section gets carried over to first block in section', async () => {
      const input = `\
.Title
== Section

paragraph`
      const output = await convertString(input)
      assertXpath(output, '//*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="paragraph"]/*[@class="title"][text()="Title"]', 1)
      assertXpath(output, '//*[@class="paragraph"]/p[text()="paragraph"]', 1)
    })

    test('block title above document title demotes document title to a section title', async () => {
      const input = `\
.Block title
= Section Title

section paragraph`
      const output = await convertString(input)
      assertXpath(output, '//*[@id="header"]/*', 0)
      assertXpath(output, '//*[@id="preamble"]/*', 0)
      assertXpath(output, '//*[@id="content"]/h1[text()="Section Title"]', 1)
      assertXpath(output, '//*[@class="paragraph"]', 1)
      assertXpath(output, '//*[@class="paragraph"]/*[@class="title"][text()="Block title"]', 1)
      assertMessage(logger, 'error', 'level 0 sections can only be used when doctype is book')
    })

    test('block title above document title gets carried over to first block in first section if no preamble', async () => {
      const input = `\
:doctype: book
.Block title
= Document Title

== First Section

paragraph`
      const doc = await documentFromString(input)
      // NOTE block title demotes document title to level-0 section
      assert.ok(!doc.header)
      const output = await doc.convert()
      assertXpath(output, '//*[@class="sect1"]//*[@class="paragraph"]/*[@class="title"][text()="Block title"]', 1)
    })

    test('should apply substitutions to a block title in normal order', async () => {
      const input = `\
.{link-url}[{link-text}]{tm}
The one and only!`

      const output = await convertStringToEmbedded(input, {
        attributes: {
          'link-url': 'https://acme.com',
          'link-text': 'ACME',
          'tm': '(TM)',
        },
      })
      assertCss(output, '.title', 1)
      assertCss(output, '.title a[href="https://acme.com"]', 1)
      assertXpath(output, `//*[@class="title"][contains(text(),"${decodeChar(8482)}")]`, 1)
    })

    test('empty attribute list should not appear in output', async () => {
      const input = `\
[]
--
Block content
--`

      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Block content'))
      assert.ok(!output.includes('[]'))
    })

    test('empty block anchor should not appear in output', async () => {
      const input = `\
[[]]
--
Block content
--`

      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('Block content'))
      assert.ok(!output.includes('[[]]'))
    })
  })
})
