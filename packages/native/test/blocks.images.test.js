import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { load } from '../src/load.js'
import { MemoryLogger, LoggerManager } from '../src/logging.js'
import { assertCss, assertXpath, assertMessage, decodeChar } from './helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

  describe('Images', () => {
    test('can convert block image with alt text defined in macro', async () => {
      const input = 'image::images/tiger.png[Tiger]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('converts SVG image using img element by default', async () => {
      const input = 'image::tiger.svg[Tiger]'
      const output = await convertStringToEmbedded(input, { safe: 'server' })
      assertXpath(output, '/*[@class="imageblock"]//img[@src="tiger.svg"][@alt="Tiger"]', 1)
    })

    test('converts interactive SVG image with alt text using object element', async () => {
      const input = `\
:imagesdir: images

[%interactive]
image::tiger.svg[Tiger,100]
`
      const output = await convertStringToEmbedded(input, { safe: 'server' })
      assertXpath(output, '/*[@class="imageblock"]//object[@type="image/svg+xml"][@data="images/tiger.svg"][@width="100"]/span[@class="alt"][text()="Tiger"]', 1)
    })

    test('converts SVG image with alt text using img element when safe mode is secure', async () => {
      const input = `\
[%interactive]
image::images/tiger.svg[Tiger,100]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.svg"][@alt="Tiger"]', 1)
    })

    test('inserts fallback image for SVG inside object element using same dimensions', async () => {
      const input = `\
:imagesdir: images

[%interactive]
image::tiger.svg[Tiger,100,fallback=tiger.png]
`
      const output = await convertStringToEmbedded(input, { safe: 'server' })
      assertXpath(output, '/*[@class="imageblock"]//object[@type="image/svg+xml"][@data="images/tiger.svg"][@width="100"]/img[@src="images/tiger.png"][@width="100"]', 1)
    })

    test('detects SVG image URI that contains a query string', async () => {
      const input = `\
:imagesdir: images

[%interactive]
image::http://example.org/tiger.svg?foo=bar[Tiger,100]
`
      const output = await convertStringToEmbedded(input, { safe: 'server' })
      assertXpath(output, '/*[@class="imageblock"]//object[@type="image/svg+xml"][@data="http://example.org/tiger.svg?foo=bar"][@width="100"]/span[@class="alt"][text()="Tiger"]', 1)
    })

    test('detects SVG image when format attribute is svg', async () => {
      const input = `\
:imagesdir: images

[%interactive]
image::http://example.org/tiger-svg[Tiger,100,format=svg]
`
      const output = await convertStringToEmbedded(input, { safe: 'server' })
      assertXpath(output, '/*[@class="imageblock"]//object[@type="image/svg+xml"][@data="http://example.org/tiger-svg"][@width="100"]/span[@class="alt"][text()="Tiger"]', 1)
    })

    test('converts to inline SVG image when inline option is set on block', async () => {
      const input = `\
:imagesdir: fixtures

[%inline]
image::circle.svg[Tiger,100]
`
      const output = await convertStringToEmbedded(input, { safe: 'server', attributes: { docdir: __dirname } })
      assert.match(output, /<svg\s[^>]*width="100"[^>]*>/)
      assert.doesNotMatch(output, /<svg\s[^>]*width="500"[^>]*>/)
      assert.doesNotMatch(output, /<svg\s[^>]*height="500"[^>]*>/)
      assert.doesNotMatch(output, /<svg\s[^>]*style="[^>]*>/)
    })

    test('should ignore link attribute if value is self and image target is inline SVG', async () => {
      const input = `\
:imagesdir: fixtures

[%inline]
image::circle.svg[Tiger,100,link=self]
`
      const output = await convertStringToEmbedded(input, { safe: 'server', attributes: { docdir: __dirname } })
      assert.match(output, /<svg\s[^>]*width="100"[^>]*>/)
      assert.doesNotMatch(output, /<a href=/)
    })

    test('should honor percentage width for SVG image with inline option', async () => {
      const input = `\
:imagesdir: fixtures

image::circle.svg[Circle,50%,opts=inline]
`
      const output = await convertStringToEmbedded(input, { safe: 'server', attributes: { docdir: __dirname } })
      assert.match(output, /<svg\s[^>]*width="50%"[^>]*>/)
    })

    test('should not crash if explicit width on SVG image block is an integer', async () => {
      const input = `\
:imagesdir: fixtures

image::circle.svg[Circle,opts=inline]
`
      const doc = await documentFromString(input, { safe: 'server', attributes: { docdir: __dirname } })
      doc.blocks[0].setAttr('width', 50)
      const output = await doc.convert()
      assert.match(output, /<svg\s[^>]*width="50"[^>]*>/)
    })

    test('converts to inline SVG image when inline option is set on block and data-uri is set on document', async () => {
      const input = `\
:imagesdir: fixtures
:data-uri:

[%inline]
image::circle.svg[Tiger,100]
`
      const output = await convertStringToEmbedded(input, { safe: 'server', attributes: { docdir: __dirname } })
      assert.match(output, /<svg\s[^>]*width="100">/)
    })

    test('should not throw exception if SVG to inline is empty', async () => {
      const input = 'image::empty.svg[nada,opts=inline]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', attributes: { docdir: __dirname, imagesdir: 'fixtures' } })
      assertXpath(output, '//svg', 0)
      assertXpath(output, '//span[@class="alt"][text()="nada"]', 1)
      assertMessage(logger, 'warn', 'contents of SVG is empty:')
    })

    test('should not throw exception if SVG to inline contains an incomplete start tag and explicit width is specified', async () => {
      const input = 'image::incomplete.svg[,200,opts=inline]'
      const output = await convertStringToEmbedded(input, { safe: 'safe', attributes: { docdir: __dirname, imagesdir: 'fixtures' } })
      assertXpath(output, '//svg', 1)
      assertXpath(output, '//span[@class="alt"]', 0)
    })

    // TODO: needs web server for remote SVG tests
    // test('embeds remote SVG to inline when inline option is set on block and allow-uri-read is set on document', ...)
    // test('should cache remote SVG when allow-uri-read, cache-uri, and inline option are set', ...)

    test('converts to alt text for SVG with inline option set if SVG cannot be read', async () => {
      const input = `\
[%inline]
image::no-such-image.svg[Alt Text]
`
      const output = await convertStringToEmbedded(input, { safe: 'server' })
      assertXpath(output, '//span[@class="alt"][text()="Alt Text"]', 1)
      assertMessage(logger, 'warn', 'SVG does not exist or cannot be read')
    })

    test('can convert block image with alt text defined in macro containing square bracket', async () => {
      const input = 'image::images/tiger.png[A [Bengal] Tiger]'
      const output = await convertString(input)
      // TODO: needs DOM parser
      // const img = xmlnodes_at_xpath('//img', output, 1)
      // assert.equal(img.attr('alt'), 'A [Bengal] Tiger')
      assert.ok(output.includes('alt="A [Bengal] Tiger"'))
    })

    test('can convert block image with target containing spaces', async () => {
      const input = 'image::images/big tiger.png[A Big Tiger]'
      const output = await convertString(input)
      // TODO: needs DOM parser
      // const img = xmlnodes_at_xpath('//img', output, 1)
      // assert.equal(img.attr('src'), 'images/big%20tiger.png')
      // assert.equal(img.attr('alt'), 'A Big Tiger')
      assert.ok(output.includes('src="images/big%20tiger.png"'))
      assert.ok(output.includes('alt="A Big Tiger"'))
    })

    test('should not recognize block image if target has leading or trailing spaces', async () => {
      for (const target of [' tiger.png', 'tiger.png ']) {
        const input = `image::${target}[Tiger]`
        const output = await convertStringToEmbedded(input)
        assertXpath(output, '//img', 0)
      }
    })

    test('can convert block image with alt text defined in block attribute above macro', async () => {
      const input = `\
[Tiger]
image::images/tiger.png[]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('alt text in macro overrides alt text above macro', async () => {
      const input = `\
[Alt Text]
image::images/tiger.png[Tiger]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('should substitute attribute references in alt text defined in image block macro', async () => {
      const input = `\
:alt-text: Tiger

image::images/tiger.png[{alt-text}]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('should set direction CSS class on image if float attribute is set', async () => {
      const input = `\
[float=left]
image::images/tiger.png[Tiger]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.imageblock.left', 1)
      assertCss(output, '.imageblock[style]', 0)
    })

    test('should set text alignment CSS class on image if align attribute is set', async () => {
      const input = `\
[align=center]
image::images/tiger.png[Tiger]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, '.imageblock.text-center', 1)
      assertCss(output, '.imageblock[style]', 0)
    })

    test('style attribute is dropped from image macro', async () => {
      const input = `\
[style=value]
image::images/tiger.png[Tiger]
`
      const doc = await documentFromString(input)
      const img = doc.blocks[0]
      assert.ok(!Object.prototype.hasOwnProperty.call(img.attributes, 'style'))
      assert.equal(img.style, null)
    })

    test('should apply specialcharacters and replacement substitutions to alt text', async () => {
      const input = 'A tiger\'s "roar" is < a bear\'s "growl"'
      const expected = 'A tiger&#8217;s &quot;roar&quot; is &lt; a bear&#8217;s &quot;growl&quot;'
      const result = await convertStringToEmbedded(`image::images/tiger-roar.png[${input}]`)
      assert.ok(result.includes(`alt="${expected}"`))
    })

    test('should not encode double quotes in alt text when converting to DocBook', async () => {
      const input = 'Select "File > Open"'
      const expected = 'Select "File &gt; Open"'
      const result = await convertStringToEmbedded(`image::images/open.png[${input}]`, { backend: 'docbook' })
      assert.ok(result.includes(`<phrase>${expected}</phrase>`))
    })

    test('should auto-generate alt text for block image if alt text is not specified', async () => {
      const input = 'image::images/lions-and-tigers.png[]'
      const image = await blockFromString(input)
      assert.equal(image.getAttr('alt'), 'lions and tigers')
      assert.equal(image.getAttr('default-alt'), 'lions and tigers')
      const output = image.convert()
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/lions-and-tigers.png"][@alt="lions and tigers"]', 1)
    })

    test('can convert block image with alt text and height and width', async () => {
      const input = 'image::images/tiger.png[Tiger, 200, 300]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"][@width="200"][@height="300"]', 1)
    })

    test('should not output empty width attribute if positional width attribute is empty', async () => {
      const input = 'image::images/tiger.png[Tiger,]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"]', 1)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@width]', 0)
    })

    test('can convert block image with link', async () => {
      const input = `\
image::images/tiger.png[Tiger, link='http://en.wikipedia.org/wiki/Tiger']
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//a[@class="image"][@href="http://en.wikipedia.org/wiki/Tiger"]/img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('can convert block image with link to self', async () => {
      const input = `\
:imagesdir: img

image::tiger.png[Tiger, link=self]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//a[@class="image"][@href="img/tiger.png"]/img[@src="img/tiger.png"][@alt="Tiger"]', 1)
    })

    test('adds rel=noopener attribute to block image with link that targets _blank window', async () => {
      const input = 'image::images/tiger.png[Tiger,link=http://en.wikipedia.org/wiki/Tiger,window=_blank]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//a[@class="image"][@href="http://en.wikipedia.org/wiki/Tiger"][@target="_blank"][@rel="noopener"]/img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('adds rel=noopener attribute to block image with link that targets name window when the noopener option is set', async () => {
      const input = 'image::images/tiger.png[Tiger,link=http://en.wikipedia.org/wiki/Tiger,window=name,opts=noopener]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//a[@class="image"][@href="http://en.wikipedia.org/wiki/Tiger"][@target="name"][@rel="noopener"]/img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('adds rel=nofollow attribute to block image with a link when the nofollow option is set', async () => {
      const input = 'image::images/tiger.png[Tiger,link=http://en.wikipedia.org/wiki/Tiger,opts=nofollow]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//a[@class="image"][@href="http://en.wikipedia.org/wiki/Tiger"][@rel="nofollow"]/img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('can convert block image with caption', async () => {
      const input = `\
.The AsciiDoc Tiger
image::images/tiger.png[Tiger]
`
      const doc = await documentFromString(input)
      assert.equal(await doc.blocks[0].numeral, 1)
      const output = await doc.convert()
      assertXpath(output, '//*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
      assertXpath(output, '//*[@class="imageblock"]/*[@class="title"][text()="Figure 1. The AsciiDoc Tiger"]', 1)
      assert.equal(doc.attributes['figure-number'], 1)
    })

    test('can convert block image with explicit caption', async () => {
      const input = `\
[caption="Voila! "]
.The AsciiDoc Tiger
image::images/tiger.png[Tiger]
`
      const doc = await documentFromString(input)
      assert.equal(await doc.blocks[0].numeral, null)
      const output = await doc.convert()
      assertXpath(output, '//*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
      assertXpath(output, '//*[@class="imageblock"]/*[@class="title"][text()="Voila! The AsciiDoc Tiger"]', 1)
      assert.ok(!Object.prototype.hasOwnProperty.call(doc.attributes, 'figure-number'))
    })

    test('can align image in DocBook backend', async () => {
      const input = 'image::images/sunset.jpg[Sunset,align=right]'
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//imagedata', 1)
      assertXpath(output, '//imagedata[@align="right"]', 1)
    })

    test('should set content width and depth in DocBook backend if no scaling', async () => {
      const input = 'image::images/sunset.jpg[Sunset,500,332]'
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//imagedata', 1)
      assertXpath(output, '//imagedata[@contentwidth="500"]', 1)
      assertXpath(output, '//imagedata[@contentdepth="332"]', 1)
      assertXpath(output, '//imagedata[@width]', 0)
      assertXpath(output, '//imagedata[@depth]', 0)
    })

    test('can scale image in DocBook backend', async () => {
      const input = 'image::images/sunset.jpg[Sunset,500,332,scale=200]'
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//imagedata', 1)
      assertXpath(output, '//imagedata[@scale="200"]', 1)
      assertXpath(output, '//imagedata[@width]', 0)
      assertXpath(output, '//imagedata[@depth]', 0)
      assertXpath(output, '//imagedata[@contentwidth]', 0)
      assertXpath(output, '//imagedata[@contentdepth]', 0)
    })

    test('scale image width in DocBook backend', async () => {
      const input = 'image::images/sunset.jpg[Sunset,500,332,scaledwidth=25%]'
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//imagedata', 1)
      assertXpath(output, '//imagedata[@width="25%"]', 1)
      assertXpath(output, '//imagedata[@depth]', 0)
      assertXpath(output, '//imagedata[@contentwidth]', 0)
      assertXpath(output, '//imagedata[@contentdepth]', 0)
    })

    test('adds % to scaled width if no units given in DocBook backend', async () => {
      const input = 'image::images/sunset.jpg[Sunset,scaledwidth=25]'
      const output = await convertStringToEmbedded(input, { backend: 'docbook' })
      assertXpath(output, '//imagedata', 1)
      assertXpath(output, '//imagedata[@width="25%"]', 1)
    })

    test('keeps attribute reference unprocessed if image target is missing attribute reference and attribute-missing is skip', async () => {
      const input = `\
:attribute-missing: skip

image::{bogus}[]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'img[src="{bogus}"]', 1)
      assert.equal(logger.messages.length, 0)
    })

    test('should not drop line if image target is missing attribute reference and attribute-missing is drop', async () => {
      const input = `\
:attribute-missing: drop

image::{bogus}/photo.jpg[]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'img[src="/photo.jpg"]', 1)
      assert.equal(logger.messages.length, 0)
    })

    test('drops line if image target is missing attribute reference and attribute-missing is drop-line', async () => {
      const input = `\
:attribute-missing: drop-line

image::{bogus}[]
`
      const output = await convertStringToEmbedded(input)
      assert.equal(output.trim(), '')
      assertMessage(logger, 'info', 'dropping line containing reference to missing attribute: bogus')
    })

    test('should not drop line if image target resolves to blank and attribute-missing is drop-line', async () => {
      const input = `\
:attribute-missing: drop-line

image::{blank}[]
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'img[src=""]', 1)
      assert.equal(logger.messages.length, 0)
    })

    test('dropped image does not break processing of following section and attribute-missing is drop-line', async () => {
      const input = `\
:attribute-missing: drop-line

image::{bogus}[]

== Section Title
`
      const output = await convertStringToEmbedded(input)
      assertCss(output, 'img', 0)
      assertCss(output, 'h2', 1)
      assert.ok(!output.includes('== Section Title'))
      assertMessage(logger, 'info', 'dropping line containing reference to missing attribute: bogus')
    })

    test('should pass through image that references uri', async () => {
      const input = `\
:imagesdir: images

image::http://asciidoc.org/images/tiger.png[Tiger]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="http://asciidoc.org/images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('should encode spaces in image target if value is a URI', async () => {
      const input = 'image::http://example.org/svg?digraph=digraph G { a -> b; }[diagram]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, `/*[@class="imageblock"]//img[@src="http://example.org/svg?digraph=digraph%20G%20{%20a%20-${decodeChar(62)}%20b;%20}"]`, 1)
    })

    test('can resolve image relative to imagesdir', async () => {
      const input = `\
:imagesdir: images

image::tiger.png[Tiger]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '/*[@class="imageblock"]//img[@src="images/tiger.png"][@alt="Tiger"]', 1)
    })

    test('embeds base64-encoded data uri for image when data-uri attribute is set', async () => {
      const input = `\
:data-uri:
:imagesdir: fixtures

image::dot.gif[Dot]
`
      const doc = await documentFromString(input, { safe: 'safe', attributes: { docdir: __dirname } })
      assert.equal(await doc.attributes['imagesdir'], 'fixtures')
      const output = await doc.convert()
      assertXpath(output, '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]', 1)
    })

    test('embeds SVG image with image/svg+xml mimetype when file extension is .svg', async () => {
      const input = `\
:imagesdir: fixtures
:data-uri:

image::circle.svg[Tiger,100]
`
      const output = await convertStringToEmbedded(input, { safe: 'server', attributes: { docdir: __dirname } })
      assertXpath(output, '//img[starts-with(@src,"data:image/svg+xml;base64,")]', 1)
    })

    test('should link to data URI if value of link attribute is self and image is embedded', async () => {
      const input = `\
:imagesdir: fixtures
:data-uri:

image::circle.svg[Tiger,100,link=self]
`
      const output = await convertStringToEmbedded(input, { safe: 'server', attributes: { docdir: __dirname } })
      assertXpath(output, '//img[starts-with(@src,"data:image/svg+xml;base64,")]', 1)
      assertXpath(output, '//a[starts-with(@href,"data:image/svg+xml;base64,")]', 1)
    })

    test('embeds empty base64-encoded data uri for unreadable image when data-uri attribute is set', async () => {
      const input = `\
:data-uri:
:imagesdir: fixtures

image::unreadable.gif[Dot]
`
      const doc = await documentFromString(input, { safe: 'safe', attributes: { docdir: __dirname } })
      assert.equal(await doc.attributes['imagesdir'], 'fixtures')
      const output = await doc.convert()
      assertXpath(output, '//img[@src="data:image/gif;base64,"]', 1)
      assertMessage(logger, 'warn', 'image to embed not found or not readable')
    })

    test('embeds base64-encoded data uri with application/octet-stream mimetype when file extension is missing', async () => {
      const input = `\
:data-uri:
:imagesdir: fixtures

image::dot[Dot]
`
      const doc = await documentFromString(input, { safe: 'safe', attributes: { docdir: __dirname } })
      assert.equal(await doc.attributes['imagesdir'], 'fixtures')
      const output = await doc.convert()
      assertXpath(output, '//img[starts-with(@src,"data:application/octet-stream;base64,")]', 1)
    })

    // TODO: needs web server for remote image tests
    // test('embeds base64-encoded data uri for remote image when data-uri attribute is set', ...)
    // test('embeds base64-encoded data uri for remote image when imagesdir is a URI and data-uri attribute is set', ...)
    // test('should cache remote image when allow-uri-read, cache-uri, and data-uri are set', ...)
    // test('uses remote image uri when data-uri attribute is set and image cannot be retrieved', ...)
    // test('uses remote image uri when data-uri attribute is set and allow-uri-read is not set', ...)

    test('can handle embedded data uri images', async () => {
      const input = 'image::data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=[Dot]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]', 1)
    })

    test('can handle embedded data uri images when data-uri attribute is set', async () => {
      const input = `\
:data-uri:

image::data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=[Dot]
`
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]', 1)
    })

    test('cleans reference to ancestor directories in imagesdir before reading image if safe mode level is at least SAFE', async () => {
      const input = `\
:data-uri:
:imagesdir: ../..//fixtures/./../../fixtures

image::dot.gif[Dot]
`
      const doc = await documentFromString(input, { safe: 'safe', attributes: { docdir: __dirname } })
      assert.equal(await doc.attributes['imagesdir'], '../..//fixtures/./../../fixtures')
      const output = await doc.convert()
      // image target resolves to fixtures/dot.gif relative to docdir (which is explicitly set to the directory of this file)
      // the reference cannot fall outside of the document directory in safe mode
      assertXpath(output, '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]', 1)
      assertMessage(logger, 'warn', 'image has illegal reference to ancestor of jail; recovering automatically')
    })

    test('cleans reference to ancestor directories in target before reading image if safe mode level is at least SAFE', async () => {
      const input = `\
:data-uri:
:imagesdir: ./

image::../..//fixtures/./../../fixtures/dot.gif[Dot]
`
      const doc = await documentFromString(input, { safe: 'safe', attributes: { docdir: __dirname } })
      assert.equal(await doc.attributes['imagesdir'], './')
      const output = await doc.convert()
      // image target resolves to fixtures/dot.gif relative to docdir (which is explicitly set to the directory of this file)
      // the reference cannot fall outside of the document directory in safe mode
      assertXpath(output, '//img[@src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="][@alt="Dot"]', 1)
      assertMessage(logger, 'warn', 'image has illegal reference to ancestor of jail; recovering automatically')
    })

    test('should use the imagesdir attribute set on the node when resolving the image path', async () => {
      const image = await blockFromString('image::rainbow.png[]', { attributes: { imagesdir: 'images' } })
      image.setAttr('imagesdir', 'chapter-1/images')
      const imageUri = image.imageUri(image.getAttr('target'))
      assert.equal(imageUri, 'chapter-1/images/rainbow.png')
    })

    test('should use the imagesdir attribute defined on image macro when resolving image path', async () => {
      const input = `\
:imagesdir: images

image::rainbow.png[imagesdir=chapter-1/images]
'''
`
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('src="chapter-1/images/rainbow.png"'))
    })
  })
})
