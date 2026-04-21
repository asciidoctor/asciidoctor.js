import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { load } from '../src/load.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { FONT_AWESOME_VERSION, HIGHLIGHT_JS_VERSION } from '../src/constants.js'
import { assertCss, assertXpath, assertMessage, decodeChar } from './helpers.js'

const __dirname = import.meta.url.startsWith('http')
  ? new URL('.', import.meta.url).href.replace(/\/$/, '')
  : path.dirname(fileURLToPath(import.meta.url))

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

  describe('Media', () => {
    test('should detect and convert video macro', async () => {
      const input = 'video::cats-vs-dogs.avi[]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="cats-vs-dogs.avi"]', 1)
    })

    test('should detect and convert video macro with positional attributes for poster and dimensions', async () => {
      const input = 'video::cats-vs-dogs.avi[cats-and-dogs.png, 200, 300]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="cats-vs-dogs.avi"]', 1)
      assertCss(output, 'video[poster="cats-and-dogs.png"]', 1)
      assertCss(output, 'video[width="200"]', 1)
      assertCss(output, 'video[height="300"]', 1)
    })

    test('should set direction CSS class on video block if float attribute is set', async () => {
      const input = 'video::cats-vs-dogs.avi[cats-and-dogs.png,float=right]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="cats-vs-dogs.avi"]', 1)
      assertCss(output, '.videoblock.right', 1)
    })

    test('should set text alignment CSS class on video block if align attribute is set', async () => {
      const input = 'video::cats-vs-dogs.avi[cats-and-dogs.png,align=center]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="cats-vs-dogs.avi"]', 1)
      assertCss(output, '.videoblock.text-center', 1)
    })

    test('video macro should honor all options', async () => {
      const input = 'video::cats-vs-dogs.avi[options="autoplay,muted,nocontrols,loop",preload="metadata"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[autoplay]', 1)
      assertCss(output, 'video[muted]', 1)
      assertCss(output, 'video:not([controls])', 1)
      assertCss(output, 'video[loop]', 1)
      assertCss(output, 'video[preload=metadata]', 1)
    })

    test('video macro should add time range anchor with start time if start attribute is set', async () => {
      const input = 'video::cats-vs-dogs.avi[start="30"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertXpath(output, '//video[@src="cats-vs-dogs.avi#t=30"]', 1)
    })

    test('video macro should add time range anchor with end time if end attribute is set', async () => {
      const input = 'video::cats-vs-dogs.avi[end="30"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertXpath(output, '//video[@src="cats-vs-dogs.avi#t=,30"]', 1)
    })

    test('video macro should add time range anchor with start and end time if start and end attributes are set', async () => {
      const input = 'video::cats-vs-dogs.avi[start="30",end="60"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertXpath(output, '//video[@src="cats-vs-dogs.avi#t=30,60"]', 1)
    })

    test('video macro should use imagesdir attribute to resolve target and poster', async () => {
      const input = `\
:imagesdir: assets

video::cats-vs-dogs.avi[cats-and-dogs.png, 200, 300]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="assets/cats-vs-dogs.avi"]', 1)
      assertCss(output, 'video[poster="assets/cats-and-dogs.png"]', 1)
      assertCss(output, 'video[width="200"]', 1)
      assertCss(output, 'video[height="300"]', 1)
    })

    test('video macro should not use imagesdir attribute to resolve target if target is a URL', async () => {
      const input = `\
:imagesdir: assets

video::http://example.org/videos/cats-vs-dogs.avi[]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="http://example.org/videos/cats-vs-dogs.avi"]', 1)
    })

    test('video macro should output custom HTML with iframe for vimeo service', async () => {
      const input = 'video::67480300[vimeo, 400, 300, start=60, options="autoplay,muted"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://player.vimeo.com/video/67480300?autoplay=1&muted=1#at=60"]', 1)
      assertCss(output, 'iframe[width="400"]', 1)
      assertCss(output, 'iframe[height="300"]', 1)
    })

    test('video macro should allow hash for vimeo video to be specified in video ID', async () => {
      const input = 'video::67480300/123456789[vimeo, 400, 300, options=loop]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://player.vimeo.com/video/67480300?h=123456789&loop=1"]', 1)
      assertCss(output, 'iframe[width="400"]', 1)
      assertCss(output, 'iframe[height="300"]', 1)
    })

    test('video macro should allow hash for vimeo video to be specified using hash attribute', async () => {
      const input = 'video::67480300[vimeo, 400, 300, options=loop, hash=123456789]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://player.vimeo.com/video/67480300?h=123456789&loop=1"]', 1)
      assertCss(output, 'iframe[width="400"]', 1)
      assertCss(output, 'iframe[height="300"]', 1)
    })

    test('video macro should output custom HTML with iframe for youtube service', async () => {
      const input = 'video::U8GBXvdmHT4/PLg7s6cbtAD15Das5LK9mXt_g59DLWxKUe[youtube, 640, 360, start=60, options="autoplay,muted,modest", theme=light]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://www.youtube.com/embed/U8GBXvdmHT4?rel=0&start=60&autoplay=1&mute=1&list=PLg7s6cbtAD15Das5LK9mXt_g59DLWxKUe&modestbranding=1&theme=light"]', 1)
      assertCss(output, 'iframe[width="640"]', 1)
      assertCss(output, 'iframe[height="360"]', 1)
    })

    test('video macro should output custom HTML with iframe for youtube service with dynamic playlist', async () => {
      const input = 'video::SCZF6I-Rc4I,AsKGOeonbIs,HwrPhOp6-aM[youtube, 640, 360, start=60, options=autoplay]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://www.youtube.com/embed/SCZF6I-Rc4I?rel=0&start=60&autoplay=1&playlist=SCZF6I-Rc4I,AsKGOeonbIs,HwrPhOp6-aM"]', 1)
      assertCss(output, 'iframe[width="640"]', 1)
      assertCss(output, 'iframe[height="360"]', 1)
    })

    test('video macro should output custom HTML with iframe for wistia service', async () => {
      const input = 'video::be5gtsbaco[wistia,640,360,start=60,options="autoplay,loop,muted"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://fast.wistia.com/embed/iframe/be5gtsbaco?time=60&autoPlay=true&endVideoBehavior=loop&muted=true"]', 1)
      assertCss(output, 'iframe[width="640"]', 1)
      assertCss(output, 'iframe[height="360"]', 1)
    })

    test('video macro should output custom HTML with iframe for wistia service with loop behavior set', async () => {
      const input = 'video::be5gtsbaco[wistia,640,360,start=60,options="autoplay,reset,muted"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 0)
      assertCss(output, 'iframe', 1)
      assertCss(output, 'iframe[src="https://fast.wistia.com/embed/iframe/be5gtsbaco?time=60&autoPlay=true&endVideoBehavior=reset&muted=true"]', 1)
      assertCss(output, 'iframe[width="640"]', 1)
      assertCss(output, 'iframe[height="360"]', 1)
    })

    test('should detect and convert audio macro', async () => {
      const input = 'audio::podcast.mp3[]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'audio', 1)
      assertCss(output, 'audio[src="podcast.mp3"]', 1)
    })

    test('audio macro should use imagesdir attribute to resolve target', async () => {
      const input = `\
:imagesdir: assets

audio::podcast.mp3[]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'audio', 1)
      assertCss(output, 'audio[src="assets/podcast.mp3"]', 1)
    })

    test('audio macro should not use imagesdir attribute to resolve target if target is a URL', async () => {
      const input = `\
:imagesdir: assets

video::http://example.org/podcast.mp3[]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'video', 1)
      assertCss(output, 'video[src="http://example.org/podcast.mp3"]', 1)
    })

    test('audio macro should honor all options', async () => {
      const input = 'audio::podcast.mp3[options="autoplay,nocontrols,loop"]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'audio', 1)
      assertCss(output, 'audio[autoplay]', 1)
      assertCss(output, 'audio:not([controls])', 1)
      assertCss(output, 'audio[loop]', 1)
    })

    test('audio macro should support start and end time', async () => {
      const input = 'audio::podcast.mp3[start=1,end=2]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'audio', 1)
      assertCss(output, 'audio[controls]', 1)
      assertCss(output, 'audio[src="podcast.mp3#t=1,2"]', 1)
    })

    test('should use the imagesdir attribute on the node when resolving the video path', async () => {
      const video = await blockFromString('video::promo.mp4[]', { attributes: { imagesdir: 'images' } })
      video.setAttr('imagesdir', 'chapter-1/videos')
      const videoUri = video.mediaUri(video.attr('target'))
      assert.equal(videoUri, 'chapter-1/videos/promo.mp4')
    })

    test('should use the imagesdir attribute defined on video macro when resolving image path', async () => {
      const input = `\
:imagesdir: images

video::promo.mp4[imagesdir=chapter-1/videos]
'''
`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('src="chapter-1/videos/promo.mp4"'))
    })
  })

  describe('Admonition icons', () => {
    test('can resolve icon relative to default iconsdir', async () => {
      const input = `\
:icons:

[TIP]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'server' })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="./images/icons/tip.png"][@alt="Tip"]', 1)
    })

    test('can resolve icon relative to custom iconsdir', async () => {
      const input = `\
:icons:
:iconsdir: icons

[TIP]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'server' })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="icons/tip.png"][@alt="Tip"]', 1)
    })

    test('should use iconsdir attribute set on admonition block in document to resolve icon path', async () => {
      const input = `\
:icons:

[TIP,iconsdir=icons]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'server' })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="icons/tip.png"][@alt="Tip"]', 1)
    })

    test('should add file extension to custom icon if not specified', async () => {
      const input = `\
:icons: font
:iconsdir: images/icons

[TIP,icon=a]
Override the icon of an admonition block using an attribute
`
      const output = await convertString(input, { safe: 'server' })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="images/icons/a.png"]', 1)
    })

    test('should allow icontype to be specified when using built-in admonition icon', async () => {
      const input = 'TIP: Set the icontype using either the icontype attribute on the icons attribute.'
      const cases = [
        { icons: '', ext: 'png' },
        { icons: '', icontype: 'jpg', ext: 'jpg' },
        { icons: 'jpg', ext: 'jpg' },
        { icons: 'image', ext: 'png' },
      ]
      for (const attrs of cases) {
        const ext = attrs.ext
        const attributes = { ...attrs }
        delete attributes.ext
        const expectedSrc = `./images/icons/tip.${ext}`
        const output = await convertString(input, { attributes })
        assertXpath(output, `//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="${expectedSrc}"]`, 1)
      }
    })

    test('should allow icontype to be specified when using custom admonition icon', async () => {
      const input = `\
[TIP,icon=hint]
Set the icontype using either the icontype attribute on the icons attribute.
`
      const cases = [
        { icons: '', ext: 'png' },
        { icons: '', icontype: 'jpg', ext: 'jpg' },
        { icons: 'jpg', ext: 'jpg' },
        { icons: 'image', ext: 'png' },
      ]
      for (const attrs of cases) {
        const ext = attrs.ext
        const attributes = { ...attrs }
        delete attributes.ext
        const expectedSrc = `./images/icons/hint.${ext}`
        const output = await convertString(input, { attributes })
        assertXpath(output, `//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="${expectedSrc}"]`, 1)
      }
    })

    test('embeds base64-encoded data uri of icon when data-uri attribute is set and safe mode level is less than SECURE', async () => {
      const input = `\
:icons:
:iconsdir: fixtures
:icontype: gif
:data-uri:

[TIP]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'safe', attributes: { docdir: __dirname } })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Tip"]', 1)
    })

    test('should embed base64-encoded data uri of custom icon when data-uri attribute is set', async () => {
      const input = `\
:icons:
:iconsdir: fixtures
:icontype: gif
:data-uri:

[TIP,icon=tip]
You can set a custom icon using the icon attribute on the block.
`
      const output = await convertString(input, { safe: 'safe', attributes: { docdir: __dirname, 'allow-uri-read': '' } })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Tip"]', 1)
    })

    test('does not embed base64-encoded data uri of icon when safe mode level is SECURE or greater', async () => {
      const input = `\
:icons:
:iconsdir: fixtures
:icontype: gif
:data-uri:

[TIP]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'secure', attributes: { icons: '' } })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="fixtures/tip.gif"][@alt="Tip"]', 1)
    })

    test('cleans reference to ancestor directories before reading icon if safe mode level is at least SAFE', async () => {
      const input = `\
:icons:
:iconsdir: ../fixtures
:icontype: gif
:data-uri:

[TIP]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'safe', attributes: { docdir: __dirname, 'allow-uri-read': '' } })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Tip"]', 1)
      assertMessage(logger, 'warn', 'image has illegal reference to ancestor of jail; recovering automatically')
    })

    test('should import Font Awesome and use font-based icons when value of icons attribute is font', async () => {
      const input = `\
:icons: font

[TIP]
You can use icons for admonitions by setting the 'icons' attribute.
`
      const output = await convertString(input, { safe: 'server' })
      assertCss(output, `html > head > link[rel="stylesheet"][href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${FONT_AWESOME_VERSION}/css/font-awesome.min.css"]`, 1)
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/i[@class="fa icon-tip"]', 1)
    })

    test('font-based icon should not override icon specified on admonition', async () => {
      const input = `\
:icons: font
:iconsdir: images/icons

[TIP,icon=a.png]
Override the icon of an admonition block using an attribute
`
      const output = await convertString(input, { safe: 'server' })
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/i[@class="fa icon-tip"]', 0)
      assertXpath(output, '//*[@class="admonitionblock tip"]//*[@class="icon"]/img[@src="images/icons/a.png"]', 1)
    })

    test('should use http uri scheme for assets when asset-uri-scheme is http', async () => {
      const input = `\
:asset-uri-scheme: http
:icons: font
:source-highlighter: highlightjs

TIP: You can control the URI scheme used for assets with the asset-uri-scheme attribute

[source,ruby]
puts "AsciiDoc, FTW!"
`
      const output = await convertString(input, { safe: 'safe' })
      assertCss(output, `html > head > link[rel="stylesheet"][href="http://cdnjs.cloudflare.com/ajax/libs/font-awesome/${FONT_AWESOME_VERSION}/css/font-awesome.min.css"]`, 1)
      assertCss(output, `html > body > script[src="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HIGHLIGHT_JS_VERSION}/highlight.min.js"]`, 1)
    })

    test('should use no uri scheme for assets when asset-uri-scheme is blank', async () => {
      const input = `\
:asset-uri-scheme:
:icons: font
:source-highlighter: highlightjs

TIP: You can control the URI scheme used for assets with the asset-uri-scheme attribute

[source,ruby]
puts "AsciiDoc, FTW!"
`
      const output = await convertString(input, { safe: 'safe' })
      assertCss(output, `html > head > link[rel="stylesheet"][href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/${FONT_AWESOME_VERSION}/css/font-awesome.min.css"]`, 1)
      assertCss(output, `html > body > script[src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/${HIGHLIGHT_JS_VERSION}/highlight.min.js"]`, 1)
    })
  })
})
