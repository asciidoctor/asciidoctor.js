import { test, describe, before, after, beforeEach, afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage } from './helpers.js'
import { convertStringToEmbedded } from './harness.js'
import { startServer } from './http-server.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

  describe('Images (HTTP)', () => {
    let server
    let baseUri

    before(async () => {
      const FIXTURES_DIR = path.join(__dirname, 'fixtures')
      const routes = new Map([
        [
          '/fixtures/dot.gif',
          {
            contentType: 'image/gif',
            body: readFileSync(path.join(FIXTURES_DIR, 'dot.gif')),
          },
        ],
        [
          '/fixtures/circle.svg',
          {
            contentType: 'image/svg+xml',
            body: readFileSync(path.join(FIXTURES_DIR, 'circle.svg'), 'utf8'),
          },
        ],
      ])
      ;({ server, baseUri } = await startServer(routes))
    })

    after(() => {
      server.close()
    })

    test('embeds remote SVG to inline when inline option is set on block and allow-uri-read is set on document', async () => {
      const input = `[%inline]\nimage::${baseUri}/fixtures/circle.svg[Circle,100,100]`
      const output = await convertStringToEmbedded(input, {
        safe: 'safe',
        attributes: { 'allow-uri-read': '' },
      })
      assertCss(output, 'svg', 1)
      assertCss(output, 'svg[style]', 0)
      assertCss(output, 'svg[width="100"]', 1)
      assertCss(output, 'svg[height="100"]', 1)
      assertCss(output, 'svg circle', 1)
    })

    test('embeds base64-encoded data uri for remote image when data-uri attribute is set', async () => {
      const input = `:data-uri:\n\nimage::${baseUri}/fixtures/dot.gif[Dot]`
      const output = await convertStringToEmbedded(input, {
        safe: 'safe',
        attributes: { 'allow-uri-read': '' },
      })
      assertXpath(
        output,
        '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]',
        1
      )
    })

    test('embeds base64-encoded data uri for remote image when imagesdir is a URI and data-uri attribute is set', async () => {
      const input = `:data-uri:\n:imagesdir: ${baseUri}/fixtures\n\nimage::dot.gif[Dot]`
      const output = await convertStringToEmbedded(input, {
        safe: 'safe',
        attributes: { 'allow-uri-read': '' },
      })
      assertXpath(
        output,
        '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]',
        1
      )
    })

    test('uses remote image uri when data-uri attribute is set and image cannot be retrieved', async () => {
      const imageUri = `${baseUri}/fixtures/missing-image.gif`
      const input = `:data-uri:\n\nimage::${imageUri}[Missing image]`
      const output = await convertStringToEmbedded(input, {
        safe: 'safe',
        attributes: { 'allow-uri-read': '' },
      })
      assertXpath(
        output,
        `/*[@class="imageblock"]//img[@src="data:image/gif;base64,"][@alt="Missing image"]`,
        1
      )
      assertMessage(logger, 'warn', 'image to embed not found or not readable')
    })

    test('uses remote image uri when data-uri attribute is set and allow-uri-read is not set', async () => {
      const imageUri = `${baseUri}/fixtures/dot.gif`
      const input = `:data-uri:\n\nimage::${imageUri}[Dot]`
      const output = await convertStringToEmbedded(input, { safe: 'safe' })
      assertXpath(
        output,
        `/*[@class="imageblock"]//img[@src="${imageUri}"][@alt="Dot"]`,
        1
      )
    })
  })
})
