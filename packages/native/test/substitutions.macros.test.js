// ESM conversion of substitutions_test.rb — Macros context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from '../src/load.js'
import { Inline } from '../src/inline.js'
import { assertXpath, assertCss, assertMessage, usingMemoryLogger } from './helpers.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const BACKSLASH = '\\'

const load_ = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const blockFromString = async (input, opts = {}) => (await load_(input, opts)).blocks[0]
const documentFromString = (input, opts = {}) => load_(input, opts)
const convertStringToEmbedded = async (input, opts = {}) => (await load_(input, opts)).convert()
const convertInlineString = async (input, opts = {}) => (await load_(input, { doctype: 'inline', ...opts })).convert()

// Normalize whitespace between tags
const normalizeTagSpaces = (html) => html.replace(/>\s+</g, '><')

// ── Substitutions — Macros ────────────────────────────────────────────────────

describe('Substitutions', () => {
  describe('Macros', () => {
    test('a single-line link macro should be interpreted as a link', async () => {
      const para = await blockFromString('link:/home.html[]')
      assert.equal(para.subMacros(para.source), '<a href="/home.html" class="bare">/home.html</a>')
    })

    test('a single-line link macro with text should be interpreted as a link', async () => {
      const para = await blockFromString('link:/home.html[Home]')
      assert.equal(para.subMacros(para.source), '<a href="/home.html">Home</a>')
    })

    test('a mailto macro should be interpreted as a mailto link', async () => {
      const para = await blockFromString('mailto:doc.writer@asciidoc.org[]')
      assert.equal(para.subMacros(para.source), '<a href="mailto:doc.writer@asciidoc.org">doc.writer@asciidoc.org</a>')
    })

    test('a mailto macro with text should be interpreted as a mailto link', async () => {
      const para = await blockFromString('mailto:doc.writer@asciidoc.org[Doc Writer]')
      assert.equal(para.subMacros(para.source), '<a href="mailto:doc.writer@asciidoc.org">Doc Writer</a>')
    })

    test('a mailto macro with text and subject should be interpreted as a mailto link', async () => {
      const para = await blockFromString('mailto:doc.writer@asciidoc.org[Doc Writer, Pull request]')
      assert.equal(para.subMacros(para.source), '<a href="mailto:doc.writer@asciidoc.org?subject=Pull%20request">Doc Writer</a>')
    })

    test('a mailto macro with text, subject and body should be interpreted as a mailto link', async () => {
      const para = await blockFromString('mailto:doc.writer@asciidoc.org[Doc Writer, Pull request, Please accept my pull request]')
      assert.equal(para.subMacros(para.source), '<a href="mailto:doc.writer@asciidoc.org?subject=Pull%20request&amp;body=Please%20accept%20my%20pull%20request">Doc Writer</a>')
    })

    test('a mailto macro with subject and body only should use e-mail as text', async () => {
      const para = await blockFromString('mailto:doc.writer@asciidoc.org[,Pull request,Please accept my pull request]')
      assert.equal(para.subMacros(para.source), '<a href="mailto:doc.writer@asciidoc.org?subject=Pull%20request&amp;body=Please%20accept%20my%20pull%20request">doc.writer@asciidoc.org</a>')
    })

    test('a mailto macro supports id and role attributes', async () => {
      const para = await blockFromString('mailto:doc.writer@asciidoc.org[,id=contact,role=icon]')
      assert.equal(para.subMacros(para.source), '<a href="mailto:doc.writer@asciidoc.org" id="contact" class="icon">doc.writer@asciidoc.org</a>')
    })

    test('should recognize inline email addresses', async () => {
      const emails = [
        'doc.writer@asciidoc.org',
        'author+website@4fs.no',
        'john@domain.uk.co',
        'name@somewhere.else.com',
        'joe_bloggs@mail_server.com',
        'joe-bloggs@mail-server.com',
        'joe.bloggs@mail.server.com',
        'FOO@BAR.COM',
        'docs@writing.ninja',
      ]
      for (const input of emails) {
        const para = await blockFromString(input)
        assert.equal(para.subMacros(para.source), `<a href="mailto:${input}">${input}</a>`)
      }
    })

    test('should recognize inline email address containing an ampersand', async () => {
      const para = await blockFromString('bert&ernie@sesamestreet.com')
      assert.equal(para.applySubs(para.source), '<a href="mailto:bert&amp;ernie@sesamestreet.com">bert&amp;ernie@sesamestreet.com</a>')
    })

    test('should recognize inline email address surrounded by angle brackets', async () => {
      const para = await blockFromString('<doc.writer@asciidoc.org>')
      assert.equal(para.applySubs(para.source), '&lt;<a href="mailto:doc.writer@asciidoc.org">doc.writer@asciidoc.org</a>&gt;')
    })

    test('should ignore escaped inline email address', async () => {
      const para = await blockFromString(`${BACKSLASH}doc.writer@asciidoc.org`)
      assert.equal(para.subMacros(para.source), 'doc.writer@asciidoc.org')
    })

    test('a single-line raw url should be interpreted as a link', async () => {
      const para = await blockFromString('http://google.com')
      assert.equal(para.subMacros(para.source), '<a href="http://google.com" class="bare">http://google.com</a>')
    })

    test('a single-line raw url with text should be interpreted as a link', async () => {
      const para = await blockFromString('http://google.com[Google]')
      assert.equal(para.subMacros(para.source), '<a href="http://google.com">Google</a>')
    })

    test('a multi-line raw url with text should be interpreted as a link', async () => {
      const para = await blockFromString('http://google.com[Google\nHomepage]')
      assert.equal(para.subMacros(para.source), '<a href="http://google.com">Google\nHomepage</a>')
    })

    test('a single-line raw url with attribute as text should be interpreted as a link with resolved attribute', async () => {
      const para = await blockFromString('http://google.com[{google_homepage}]')
      para.document.attributes['google_homepage'] = 'Google Homepage'
      assert.equal(para.subMacros(para.subAttributes(para.source)), '<a href="http://google.com">Google Homepage</a>')
    })

    test('should not resolve an escaped attribute in link text', async () => {
      const cases = {
        'http://google.com': `http://google.com[${BACKSLASH}{google_homepage}]`,
        'http://google.com?q=,': `link:http://google.com?q=,[${BACKSLASH}{google_homepage}]`,
      }
      for (const [uri, macro] of Object.entries(cases)) {
        const para = await blockFromString(macro)
        para.document.attributes['google_homepage'] = 'Google Homepage'
        assert.equal(para.subMacros(para.subAttributes(para.source)), `<a href="${uri}">{google_homepage}</a>`)
      }
    })

    test('a single-line escaped raw url should not be interpreted as a link', async () => {
      const para = await blockFromString(`${BACKSLASH}http://google.com`)
      assert.equal(para.subMacros(para.source), 'http://google.com')
    })

    test('a comma separated list of links should not include commas in links', async () => {
      const para = await blockFromString('http://foo.com, http://bar.com, http://example.org')
      assert.equal(para.subMacros(para.source), '<a href="http://foo.com" class="bare">http://foo.com</a>, <a href="http://bar.com" class="bare">http://bar.com</a>, <a href="http://example.org" class="bare">http://example.org</a>')
    })

    test('a single-line image macro should be interpreted as an image', async () => {
      const para = await blockFromString('image:tiger.png[]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger.png" alt="tiger"></span>')
    })

    test('should use the imagesdir attribute defined on image macro when resolving image path', async () => {
      const input = ':imagesdir: images\n\nGreat job! image:rainbow.png[imagesdir=stickers]\n\'\'\'\n'
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('src="stickers/rainbow.png"'))
    })

    test('should replace underscore and hyphen with space in generated alt text for an inline image', async () => {
      const para = await blockFromString('image:tiger-with-family_1.png[]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger-with-family_1.png" alt="tiger with family 1"></span>')
    })

    test('a single-line image macro with text should be interpreted as an image with alt text', async () => {
      const para = await blockFromString('image:tiger.png[Tiger]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger.png" alt="Tiger"></span>')
    })

    test('should encode special characters in alt text of inline image', async () => {
      const input = "A tiger's \"roar\" is < a bear's \"growl\""
      const expected = 'A tiger&#8217;s &quot;roar&quot; is &lt; a bear&#8217;s &quot;growl&quot;'
      const output = normalizeTagSpaces(await convertInlineString(`image:tiger-roar.png[${input}]`))
      assert.equal(output, `<span class="image"><img src="tiger-roar.png" alt="${expected}"></span>`)
    })

    test('an image macro with SVG image and text should be interpreted as an image with alt text', async () => {
      const para = await blockFromString('image:tiger.svg[Tiger]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger.svg" alt="Tiger"></span>')
    })

    test('an image macro with an interactive SVG image and alt text should be converted to an object element', async () => {
      const para = await blockFromString('image:tiger.svg[Tiger,opts=interactive]', { safe: 'server', attributes: { imagesdir: 'images' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><object type="image/svg+xml" data="images/tiger.svg"><span class="alt">Tiger</span></object></span>')
    })

    test('an image macro with an interactive SVG image, fallback and alt text should be converted to an object element', async () => {
      const para = await blockFromString('image:tiger.svg[Tiger,fallback=tiger.png,opts=interactive]', { safe: 'server', attributes: { imagesdir: 'images' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><object type="image/svg+xml" data="images/tiger.svg"><img src="images/tiger.png" alt="Tiger"></object></span>')
    })

    test('an image macro with an inline SVG image should be converted to an svg element', async () => {
      const para = await blockFromString('image:circle.svg[Tiger,100,opts=inline]', { safe: 'server', attributes: { imagesdir: 'fixtures', docdir: __dirname } })
      const result = normalizeTagSpaces(para.subMacros(para.source))
      assert.match(result, /<svg\s[^>]*width="100"[^>]*>/)
      assert.doesNotMatch(result, /<svg\s[^>]*width="500"[^>]*>/)
      assert.doesNotMatch(result, /<svg\s[^>]*height="500"[^>]*>/)
      assert.doesNotMatch(result, /<svg\s[^>]*style="[^>]*>/)
    })

    test('should ignore link attribute if value is self and image target is inline SVG', async () => {
      const para = await blockFromString('image:circle.svg[Tiger,100,opts=inline,link=self]', { safe: 'server', attributes: { imagesdir: 'fixtures', docdir: __dirname } })
      const result = normalizeTagSpaces(para.subMacros(para.source))
      assert.match(result, /<svg\s[^>]*width="100"[^>]*>/)
      assert.doesNotMatch(result, /<a href=/)
    })

    test('an image macro with an inline SVG image should be converted to an svg element even when data-uri is set', async () => {
      const para = await blockFromString('image:circle.svg[Tiger,100,opts=inline]', { safe: 'server', attributes: { 'data-uri': '', imagesdir: 'fixtures', docdir: __dirname } })
      assert.match(normalizeTagSpaces(para.subMacros(para.source)), /<svg\s[^>]*width="100">/)
    })

    test('an image macro with an SVG image should not use an object element when safe mode is secure', async () => {
      const para = await blockFromString('image:tiger.svg[Tiger,opts=interactive]', { attributes: { imagesdir: 'images' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="images/tiger.svg" alt="Tiger"></span>')
    })

    test('a single-line image macro with text containing escaped square bracket should be interpreted as an image with alt text', async () => {
      const para = await blockFromString(`image:tiger.png[[Another${BACKSLASH}] Tiger]`)
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger.png" alt="[Another] Tiger"></span>')
    })

    test('a single-line image macro with text and dimensions should be interpreted as an image with alt text and dimensions', async () => {
      const para = await blockFromString('image:tiger.png[Tiger, 200, 100]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger.png" alt="Tiger" width="200" height="100"></span>')
    })

    test('a single-line image macro with text and dimensions should be interpreted as an image with alt text and dimensions in docbook', async () => {
      const para = await blockFromString('image:tiger.png[Tiger, 200, 100]', { backend: 'docbook' })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<inlinemediaobject><imageobject><imagedata fileref="tiger.png" contentwidth="200" contentdepth="100"/></imageobject><textobject><phrase>Tiger</phrase></textobject></inlinemediaobject>')
    })

    test('a single-line image macro with scaledwidth attribute should be supported in docbook', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,scaledwidth=25%]', { backend: 'docbook' })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<inlinemediaobject><imageobject><imagedata fileref="tiger.png" width="25%"/></imageobject><textobject><phrase>Tiger</phrase></textobject></inlinemediaobject>')
    })

    test('a single-line image macro with scaled attribute should be supported in docbook', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,scale=200]', { backend: 'docbook' })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<inlinemediaobject><imageobject><imagedata fileref="tiger.png" scale="200"/></imageobject><textobject><phrase>Tiger</phrase></textobject></inlinemediaobject>')
    })

    test('should pass through role on image macro to DocBook output', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,200,role=animal]', { backend: 'docbook' })
      const result = para.subMacros(para.source)
      assert.ok(result.includes('<inlinemediaobject role="animal">'))
    })

    test('a single-line image macro with text and link should be interpreted as a linked image with alt text', async () => {
      const para = await blockFromString('image:tiger.png[Tiger, link="http://en.wikipedia.org/wiki/Tiger"]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><a class="image" href="http://en.wikipedia.org/wiki/Tiger"><img src="tiger.png" alt="Tiger"></a></span>')
    })

    test('an inline image macro with link should be interpreted as a linked image in docbook', async () => {
      const para = await blockFromString('image:apache license 2_0.png[Apache License 2.0,link=http://www.apache.org/licenses/LICENSE-2.0]', { backend: 'docbook' })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<link xl:href="http://www.apache.org/licenses/LICENSE-2.0"><inlinemediaobject><imageobject><imagedata fileref="apache%20license%202_0.png"/></imageobject><textobject><phrase>Apache License 2.0</phrase></textobject></inlinemediaobject></link>')
    })

    test('a single-line image macro with text and link to self should be interpreted as a self-referencing image with alt text', async () => {
      const para = await blockFromString('image:tiger.png[Tiger, link=self]', { attributes: { imagesdir: 'img' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><a class="image" href="img/tiger.png"><img src="img/tiger.png" alt="Tiger"></a></span>')
    })

    test('an inline image macro with text and link to self should be interpreted as a self-referencing image in docbook', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,link=self]', { attributes: { imagesdir: 'img' }, backend: 'docbook' })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<link xl:href="img/tiger.png"><inlinemediaobject><imageobject><imagedata fileref="img/tiger.png"/></imageobject><textobject><phrase>Tiger</phrase></textobject></inlinemediaobject></link>')
    })

    test('should link to data URI if value of link attribute is self and inline image is embedded', async () => {
      const para = await blockFromString('image:circle.svg[Tiger,100,link=self]', { safe: 'server', attributes: { 'data-uri': '', imagesdir: 'fixtures', docdir: __dirname } })
      const output = normalizeTagSpaces(para.subMacros(para.source))
      assertXpath(output, '//a[starts-with(@href,"data:image/svg+xml;base64,")]', 1)
      assertXpath(output, '//img[starts-with(@src,"data:image/svg+xml;base64,")]', 1)
    })

    test('rel=noopener should be added to an image with a link that targets the _blank window', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,link=http://en.wikipedia.org/wiki/Tiger,window=_blank]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><a class="image" href="http://en.wikipedia.org/wiki/Tiger" target="_blank" rel="noopener"><img src="tiger.png" alt="Tiger"></a></span>')
    })

    test('rel=noopener should be added to an image with a link that targets a named window when the noopener option is set', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,link=http://en.wikipedia.org/wiki/Tiger,window=name,opts=noopener]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><a class="image" href="http://en.wikipedia.org/wiki/Tiger" target="name" rel="noopener"><img src="tiger.png" alt="Tiger"></a></span>')
    })

    test('rel=nofollow should be added to an image with a link when the nofollow option is set', async () => {
      const para = await blockFromString('image:tiger.png[Tiger,link=http://en.wikipedia.org/wiki/Tiger,opts=nofollow]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><a class="image" href="http://en.wikipedia.org/wiki/Tiger" rel="nofollow"><img src="tiger.png" alt="Tiger"></a></span>')
    })

    test('a multi-line image macro with text and dimensions should be interpreted as an image with alt text and dimensions', async () => {
      const para = await blockFromString('image:tiger.png[Another\nAwesome\nTiger, 200,\n100]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image"><img src="tiger.png" alt="Another Awesome Tiger" width="200" height="100"></span>')
    })

    test('an inline image macro with a url target should be interpreted as an image', async () => {
      const para = await blockFromString('Beware of the image:http://example.com/images/tiger.png[tiger].')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), 'Beware of the <span class="image"><img src="http://example.com/images/tiger.png" alt="tiger"></span>.')
    })

    test('an inline image macro with a float attribute should be interpreted as a floating image', async () => {
      const para = await blockFromString('image:http://example.com/images/tiger.png[tiger, float="right"] Beware of the tigers!')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="image right"><img src="http://example.com/images/tiger.png" alt="tiger"></span> Beware of the tigers!')
    })

    test('should propagate id attribute on inline image', async () => {
      const para = await blockFromString('image:ruby.png[Ruby logo,id=ruby-logo] is the Ruby logo')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span id="ruby-logo" class="image"><img src="ruby.png" alt="Ruby logo"></span> is the Ruby logo')
    })

    test('should propagate id attribute on inline image and use alt text as reftext when converting to DocBook', async () => {
      const para = await blockFromString('image:ruby.png[Ruby logo,id=ruby-logo] is the Ruby logo', { backend: 'docbook' })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<inlinemediaobject xml:id="ruby-logo"><imageobject><imagedata fileref="ruby.png"/></imageobject><textobject><phrase>Ruby logo</phrase></textobject></inlinemediaobject> is the Ruby logo')
    })

    test('should prepend value of imagesdir attribute to inline image target if target is relative path', async () => {
      const para = await blockFromString('Beware of the image:tiger.png[tiger].', { attributes: { imagesdir: './images' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), 'Beware of the <span class="image"><img src="./images/tiger.png" alt="tiger"></span>.')
    })

    test('should not prepend value of imagesdir attribute to inline image target if target is absolute path', async () => {
      const para = await blockFromString('Beware of the image:/tiger.png[tiger].', { attributes: { imagesdir: './images' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), 'Beware of the <span class="image"><img src="/tiger.png" alt="tiger"></span>.')
    })

    test('should not prepend value of imagesdir attribute to inline image target if target is url', async () => {
      const para = await blockFromString('Beware of the image:http://example.com/images/tiger.png[tiger].', { attributes: { imagesdir: './images' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), 'Beware of the <span class="image"><img src="http://example.com/images/tiger.png" alt="tiger"></span>.')
    })

    test('should match an inline image macro if target contains a space character', async () => {
      const para = await blockFromString('Beware of the image:big cats.png[] around here.')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), 'Beware of the <span class="image"><img src="big%20cats.png" alt="big cats"></span> around here.')
    })

    test('should not match an inline image macro if target contains a newline character', async () => {
      const para = await blockFromString('Fear not. There are no image:big\ncats.png[] around here.')
      const result = para.subMacros(para.source)
      assert.ok(!result.includes('<img '))
      assert.ok(result.includes('image:big\ncats.png[]'))
    })

    test('should not match an inline image macro if target begins or ends with space character', async () => {
      for (const input of ['image: big cats.png[]', 'image:big cats.png []']) {
        const para = await blockFromString(`Fear not. There are no ${input} around here.`)
        const result = para.subMacros(para.source)
        assert.ok(!result.includes('<img '))
        assert.ok(result.includes(input))
      }
    })

    test('should not detect a block image macro found inline', async () => {
      const para = await blockFromString('Not an inline image macro image::tiger.png[].')
      const result = para.subMacros(para.source)
      assert.ok(!result.includes('<img '))
      assert.ok(result.includes('image::tiger.png[]'))
    })

    // NOTE this test verifies attributes get substituted eagerly in target of image in title
    test('should substitute attributes in target of inline image in section title', async () => {
      const input = '== image:{iconsdir}/dot.gif[dot] Title'
      await usingMemoryLogger(async (logger) => {
        const sect = await blockFromString(input, { attributes: { 'data-uri': '', iconsdir: 'fixtures', docdir: __dirname }, safe: 'server', catalog_assets: true })
        assert.equal(sect.document.catalog.images.length, 1)
        assert.equal(String(sect.document.catalog.images[0]), 'fixtures/dot.gif')
        assert.equal(sect.document.catalog.images[0].imagesdir, undefined)
        assert.equal(logger.messages.length, 0)
      })
    })

    test('an icon macro should be interpreted as an icon if icons are enabled', async () => {
      const para = await blockFromString('icon:github[]', { attributes: { icons: '' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon"><img src="./images/icons/github.png" alt="github"></span>')
    })

    test('an icon macro should be interpreted as alt text if icons are disabled', async () => {
      const para = await blockFromString('icon:github[]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon">[github&#93;</span>')
    })

    test('should not mangle icon with link if icons are disabled', async () => {
      const para = await blockFromString('icon:github[link=https://github.com]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon"><a class="image" href="https://github.com">[github&#93;</a></span>')
    })

    test('should not mangle icon inside link if icons are disabled', async () => {
      const para = await blockFromString('https://github.com[icon:github[] GitHub]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<a href="https://github.com"><span class="icon">[github&#93;</span> GitHub</a>')
    })

    test('an icon macro should output alt text if icons are disabled and alt is given', async () => {
      const para = await blockFromString('icon:github[alt="GitHub"]')
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon">[GitHub&#93;</span>')
    })

    test('an icon macro should be interpreted as a font-based icon when icons=font', async () => {
      const para = await blockFromString('icon:github[]', { attributes: { icons: 'font' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon"><i class="fa fa-github"></i></span>')
    })

    test('an icon macro with a size should be interpreted as a font-based icon with a size when icons=font', async () => {
      const para = await blockFromString('icon:github[4x]', { attributes: { icons: 'font' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon"><i class="fa fa-github fa-4x"></i></span>')
    })

    test('an icon macro with flip should be interpreted as a flipped font-based icon when icons=font', async () => {
      const para = await blockFromString('icon:shield[fw,flip=horizontal]', { attributes: { icons: 'font' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon"><i class="fa fa-shield fa-fw fa-flip-horizontal"></i></span>')
    })

    test('an icon macro with rotate should be interpreted as a rotated font-based icon when icons=font', async () => {
      const para = await blockFromString('icon:shield[fw,rotate=90]', { attributes: { icons: 'font' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon"><i class="fa fa-shield fa-fw fa-rotate-90"></i></span>')
    })

    test('an icon macro with a role and title should be interpreted as a font-based icon with a class and title when icons=font', async () => {
      const para = await blockFromString('icon:heart[role="red", title="Heart me"]', { attributes: { icons: 'font' } })
      assert.equal(normalizeTagSpaces(para.subMacros(para.source)), '<span class="icon red"><i class="fa fa-heart" title="Heart me"></i></span>')
    })

    test('should use the imagesdir attribute on the node when resolving the icon path', async () => {
      const doc = await load_('', { attributes: { iconsdir: 'assets/icons', icons: 'image' } })
      const icon = new Inline(doc, 'image', null, { type: 'icon', attributes: { iconsdir: 'chapter-1/icons' } })
      const iconUri = icon.iconUri('wave')
      assert.equal(iconUri, 'chapter-1/icons/wave.png')
    })

    test('a single-line footnote macro should be registered and output as a footnote', async () => {
      const para = await blockFromString('Sentence text footnote:[An example footnote.].')
      assert.equal(para.subMacros(para.source), 'Sentence text <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      const footnote = para.document.catalog.footnotes[0]
      assert.equal(footnote.index, 1)
      assert.equal(footnote.id, null)
      assert.equal(footnote.text, 'An example footnote.')
    })

    test('a multi-line footnote macro should be registered and output as a footnote without newline', async () => {
      const para = await blockFromString('Sentence text footnote:[An example footnote\nwith wrapped text.].')
      assert.equal(para.subMacros(para.source), 'Sentence text <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      const footnote = para.document.catalog.footnotes[0]
      assert.equal(footnote.index, 1)
      assert.equal(footnote.id, null)
      assert.equal(footnote.text, 'An example footnote with wrapped text.')
    })

    test('an escaped closing square bracket in a footnote should be unescaped when converted', async () => {
      const para = await blockFromString(`footnote:[a ${BACKSLASH}] b].`)
      assert.equal(para.subMacros(para.source), '<sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      const footnote = para.document.catalog.footnotes[0]
      assert.equal(footnote.text, 'a ] b')
    })

    test('a footnote macro can be directly adjacent to preceding word', async () => {
      const para = await blockFromString('Sentence textfootnote:[An example footnote.].')
      assert.equal(para.subMacros(para.source), 'Sentence text<sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
    })

    test('a footnote macro may contain an escaped backslash', async () => {
      const para = await blockFromString('footnote:[\\]]\nfootnote:[a \\] b]\nfootnote:[a \\]\\] b]')
      para.subMacros(para.source)
      assert.equal(para.document.catalog.footnotes.length, 3)
      assert.equal(para.document.catalog.footnotes[0].text, ']')
      assert.equal(para.document.catalog.footnotes[1].text, 'a ] b')
      assert.equal(para.document.catalog.footnotes[2].text, 'a ]] b')
    })

    test('a footnote macro may contain a link macro', async () => {
      const para = await blockFromString('Share your code. footnote:[https://github.com[GitHub]]')
      assert.equal(para.subMacros(para.source), 'Share your code. <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>')
      assert.equal(para.document.catalog.footnotes.length, 1)
      assert.equal(para.document.catalog.footnotes[0].text, '<a href="https://github.com">GitHub</a>')
    })

    test('a footnote macro may contain a plain URL', async () => {
      const para = await blockFromString('the JLine footnote:[https://github.com/jline/jline2]\nlibrary.')
      const result = para.subMacros(para.source)
      assert.equal(result, 'the JLine <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>\nlibrary.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      assert.equal(para.document.catalog.footnotes[0].text, '<a href="https://github.com/jline/jline2" class="bare">https://github.com/jline/jline2</a>')
    })

    test('a footnote macro followed by a semi-colon may contain a plain URL', async () => {
      const para = await blockFromString('the JLine footnote:[https://github.com/jline/jline2];\nlibrary.')
      const result = para.subMacros(para.source)
      assert.equal(result, 'the JLine <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>;\nlibrary.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      assert.equal(para.document.catalog.footnotes[0].text, '<a href="https://github.com/jline/jline2" class="bare">https://github.com/jline/jline2</a>')
    })

    test('a footnote macro may contain text formatting', async () => {
      const para = await blockFromString('You can download patches from the product page.footnote:[Only available with an _active_ subscription.]')
      para.convert()
      const footnotes = para.document.catalog.footnotes
      assert.equal(footnotes.length, 1)
      assert.equal(footnotes[0].text, 'Only available with an <em>active</em> subscription.')
    })

    test('an externalized footnote macro may contain text formatting', async () => {
      const input = ':fn-disclaimer: pass:q[footnote:[Only available with an _active_ subscription.]]\n\nYou can download patches from the production page.{fn-disclaimer}'
      const doc = await documentFromString(input)
      await doc.convert()
      const footnotes = doc.catalog.footnotes
      assert.equal(footnotes.length, 1)
      assert.equal(footnotes[0].text, 'Only available with an <em>active</em> subscription.')
    })

    test('a footnote macro may contain a shorthand xref', async () => {
      // specialcharacters escaping is simulated
      const para = await blockFromString('text footnote:[&lt;&lt;_install,install&gt;&gt;]')
      const doc = para.document
      doc.register('refs', ['_install', new Inline(doc, 'anchor', 'Install', { type: 'ref', target: '_install' }), 'Install'])
      const catalog = doc.catalog
      assert.equal(para.subMacros(para.source), 'text <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>')
      assert.equal(catalog.footnotes.length, 1)
      assert.equal(catalog.footnotes[0].text, '<a href="#_install">install</a>')
    })

    test('a footnote macro may contain an xref macro', async () => {
      const para = await blockFromString('text footnote:[xref:_install[install]]')
      const doc = para.document
      doc.register('refs', ['_install', new Inline(doc, 'anchor', 'Install', { type: 'ref', target: '_install' }), 'Install'])
      const catalog = doc.catalog
      assert.equal(para.subMacros(para.source), 'text <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>')
      assert.equal(catalog.footnotes.length, 1)
      assert.equal(catalog.footnotes[0].text, '<a href="#_install">install</a>')
    })

    test('a footnote macro may contain an anchor macro', async () => {
      const para = await blockFromString('text footnote:[a [[b]] [[c\\]\\] d]')
      assert.equal(para.subMacros(para.source), 'text <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>')
      assert.equal(para.document.catalog.footnotes.length, 1)
      assert.equal(para.document.catalog.footnotes[0].text, 'a <a id="b"></a> [[c]] d')
    })

    test('subsequent footnote macros with escaped URLs should be restored in DocBook', async () => {
      const input = 'foofootnote:[+http://example.com+]barfootnote:[+http://acme.com+]baz'
      const result = await convertStringToEmbedded(input, { doctype: 'inline', backend: 'docbook' })
      assert.equal(result, 'foo<footnote><simpara>http://example.com</simpara></footnote>bar<footnote><simpara>http://acme.com</simpara></footnote>baz')
    })

    test('should increment index of subsequent footnote macros', async () => {
      const para = await blockFromString('Sentence text footnote:[An example footnote.]. Sentence text footnote:[Another footnote.].')
      assert.equal(para.subMacros(para.source), 'Sentence text <sup class="footnote">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>. Sentence text <sup class="footnote">[<a id="_footnoteref_2" class="footnote" href="#_footnotedef_2" title="View footnote.">2</a>]</sup>.', 'should have both footnotes')
      assert.equal(para.document.catalog.footnotes.length, 2)
      const footnote1 = para.document.catalog.footnotes[0]
      assert.equal(footnote1.index, 1)
      assert.equal(footnote1.id, null)
      assert.equal(footnote1.text, 'An example footnote.')
      const footnote2 = para.document.catalog.footnotes[1]
      assert.equal(footnote2.index, 2)
      assert.equal(footnote2.id, null)
      assert.equal(footnote2.text, 'Another footnote.')
    })

    test('a footnoteref macro with id and single-line text should be registered and output as a footnote', async () => {
      const para = await blockFromString('Sentence text footnoteref:[ex1, An example footnote.].', { attributes: { 'compat-mode': '' } })
      assert.equal(para.subMacros(para.source), 'Sentence text <sup class="footnote" id="_footnote_ex1">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      const footnote = para.document.catalog.footnotes[0]
      assert.equal(footnote.index, 1)
      assert.equal(footnote.id, 'ex1')
      assert.equal(footnote.text, 'An example footnote.')
    })

    test('a footnoteref macro with id and multi-line text should be registered and output as a footnote without newlines', async () => {
      const para = await blockFromString('Sentence text footnoteref:[ex1, An example footnote\nwith wrapped text.].', { attributes: { 'compat-mode': '' } })
      assert.equal(para.subMacros(para.source), 'Sentence text <sup class="footnote" id="_footnote_ex1">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      const footnote = para.document.catalog.footnotes[0]
      assert.equal(footnote.index, 1)
      assert.equal(footnote.id, 'ex1')
      assert.equal(footnote.text, 'An example footnote with wrapped text.')
    })

    test('a footnoteref macro with id should refer to footnoteref with same id', async () => {
      const para = await blockFromString('Sentence text footnoteref:[ex1, An example footnote.]. Sentence text footnoteref:[ex1].', { attributes: { 'compat-mode': '' } })
      assert.equal(para.subMacros(para.source), 'Sentence text <sup class="footnote" id="_footnote_ex1">[<a id="_footnoteref_1" class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>. Sentence text <sup class="footnoteref">[<a class="footnote" href="#_footnotedef_1" title="View footnote.">1</a>]</sup>.')
      assert.equal(para.document.catalog.footnotes.length, 1)
      const footnote = para.document.catalog.footnotes[0]
      assert.equal(footnote.index, 1)
      assert.equal(footnote.id, 'ex1')
      assert.equal(footnote.text, 'An example footnote.')
    })

    test('an unresolved footnote reference should produce a warning message and output fallback text in red', async () => {
      const input = 'Sentence text.footnote:ex1[]'
      await usingMemoryLogger(async (logger) => {
        const para = await blockFromString(input)
        const output = para.subMacros(para.source)
        assert.equal(output, 'Sentence text.<sup class="footnoteref red" title="Unresolved footnote reference.">[ex1]</sup>')
        assertMessage(logger, 'WARN', 'invalid footnote reference: ex1')
      })
    })

    test('using a footnoteref macro should generate a warning when compat mode is not enabled', async () => {
      const input = 'Sentence text.footnoteref:[fn1,Commentary on this sentence.]'
      await usingMemoryLogger(async (logger) => {
        const para = await blockFromString(input)
        para.subMacros(para.source)
        assertMessage(logger, 'WARN', 'found deprecated footnoteref macro: footnoteref:[fn1,Commentary on this sentence.]; use footnote macro with target instead')
      })
    })

    test('inline footnote macro can be used to define and reference a footnote reference', async () => {
      const input = [
        'You can download the software from the product page.footnote:sub[Option only available if you have an active subscription.]',
        '',
        'You can also file a support request.footnote:sub[]',
        '',
        'If all else fails, you can give us a call.footnoteref:[sub]',
      ].join('\n')
      await usingMemoryLogger(async (logger) => {
        const output = await convertStringToEmbedded(input, { attributes: { 'compat-mode': '' } })
        assertCss(output, '#_footnotedef_1', 1)
        assertCss(output, 'p a[href="#_footnotedef_1"]', 3)
        assertCss(output, '#footnotes .footnote', 1)
        assert.equal(logger.messages.length, 0)
      })
    })

    test('should parse multiple footnote references in a single line', async () => {
      const input = 'notable text.footnote:id[about this [text\\]], footnote:id[], footnote:id[]'
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//p)[1]/sup[starts-with(@class,"footnote")]', 3)
      assertXpath(output, '(//p)[1]/sup[@class="footnote"]', 1)
      assertXpath(output, '(//p)[1]/sup[@class="footnoteref"]', 2)
      assertXpath(output, '(//p)[1]/sup[starts-with(@class,"footnote")]/a[@class="footnote"][text()="1"]', 3)
      assertCss(output, '#footnotes .footnote', 1)
    })

    test('should not register footnote with id and text if id already registered', async () => {
      const input = [
        ':fn-notable-text: footnote:id[about this text]',
        '',
        'notable text.{fn-notable-text}',
        '',
        'more notable text.{fn-notable-text}',
      ].join('\n')
      const output = await convertStringToEmbedded(input)
      assertXpath(output, '(//p)[1]/sup[@class="footnote"]', 1)
      assertXpath(output, '(//p)[2]/sup[@class="footnoteref"]', 1)
      assertCss(output, '#footnotes .footnote', 1)
    })

    test('should not resolve an inline footnote macro missing both id and text', async () => {
      const input = [
        'The footnote:[] macro can be used for defining and referencing footnotes.',
        '',
        'The footnoteref:[] macro is now deprecated.',
      ].join('\n')
      const output = await convertStringToEmbedded(input)
      assert.ok(output.includes('The footnote:[] macro'))
      assert.ok(output.includes('The footnoteref:[] macro'))
    })

    test('inline footnote macro can define a numeric id without conflicting with auto-generated ID', async () => {
      const input = 'You can download the software from the product page.footnote:1[Option only available if you have an active subscription.]'
      const output = await convertStringToEmbedded(input)
      assertCss(output, '#_footnote_1', 1)
      assertCss(output, 'p sup#_footnote_1', 1)
      assertCss(output, 'p a#_footnoteref_1', 1)
      assertCss(output, 'p a[href="#_footnotedef_1"]', 1)
      assertCss(output, '#footnotes #_footnotedef_1', 1)
    })

    test('inline footnote macro can define an id that uses any word characters in Unicode', async () => {
      const input = [
        "L'origine du mot forêt{blank}footnote:forêt[un massif forestier] est complexe.",
        '',
        "Qu'est-ce qu'une forêt ?{blank}footnote:forêt[]",
      ].join('\n')
      const output = await convertStringToEmbedded(input)
      assertCss(output, '#_footnote_forêt', 1)
      assertCss(output, '#_footnotedef_1', 1)
      assertXpath(output, '//a[@class="footnote"][text()="1"]', 2)
    })

    test('should be able to reference a bibliography entry in a footnote', async () => {
      const input = [
        'Choose a design pattern.footnote:[See <<gof>> to find a collection of design patterns.]',
        '',
        '[bibliography]',
        '== Bibliography',
        '',
        '* [[[gof]]] Erich Gamma, et al. _Design Patterns: Elements of Reusable Object-Oriented Software._ Addison-Wesley. 1994.',
      ].join('\n')
      const result = await convertStringToEmbedded(input)
      assert.ok(result.includes('<a href="#_footnoteref_1">1</a>. See <a href="#gof">[gof]</a> to find a collection of design patterns.'))
    })

    // TODO: Ruby Asciidoctor numbers heading footnotes differently from body footnotes.
    //
    // Root cause: in Ruby, section titles have their substitutions applied during the *parsing phase*
    // (via `Document#parse` → `Parser.parse` → each section calls `apply_title_subs` which calls
    // `sub_macros`). At that moment the footnote counter is at 0, so the heading footnote gets
    // index 1. Then, during the *conversion phase*, the body paragraphs are converted in document
    // order and start the footnote counter again from 1 — producing a second footnote with index 1.
    //
    // As a result, both the paragraph's "first footnote" and the heading's "second footnote" end up
    // with index 1, and "third footnote" becomes index 2. The footnote definitions section lists them
    // in catalog registration order: heading footnote first (registered during parsing), then the two
    // body footnotes (registered during conversion).
    //
    // Current JS output (wrong):  refs ['2','1','3'], defs ['1. second footnote','2. first footnote','3. third footnote']
    // Expected Ruby output:        refs ['1','1','2'], defs ['1. second footnote','1. first footnote','2. third footnote']
    //
    // To fix this, section titles would need their substitutions (especially sub_macros / footnote
    // registration) to be applied during the parsing phase rather than lazily at conversion time.
    // Concretely, `Parser.parseSection` (or the equivalent in parser.js) should call `commitSubs()`
    // and `subMacros(title)` on each section node immediately after the title is parsed, mirroring
    // Ruby's `apply_title_subs`. The footnote counter in `doc.counter('footnote-number')` would then
    // be incremented during parsing for heading footnotes, leaving conversion-phase numbering to start
    // from 1 for body content — exactly reproducing the Ruby "out of sequence" quirk.
    test('footnotes in headings are expected to be numbered out of sequence', async () => {
      const input = [
        '== Section 1',
        '',
        'para.footnote:[first footnote]',
        '',
        '== Section 2footnote:[second footnote]',
        '',
        'para.footnote:[third footnote]',
      ].join('\n')
      const { parse } = await import('node-html-parser')
      const result = await convertStringToEmbedded(input)
      const root = parse(`<body>${result}</body>`)
      const footnoteRefs = root.querySelectorAll('a.footnote')
      const footnoteDefs = root.querySelectorAll('div.footnote')
      assert.equal(footnoteRefs.length, 3)
      assert.deepEqual(footnoteRefs.map((el) => el.text), ['1', '1', '2'])
      assert.equal(footnoteDefs.length, 3)
      assert.deepEqual(footnoteDefs.map((el) => el.text.trim()), ['1. second footnote', '1. first footnote', '2. third footnote'])
    })

    test('a single-line index term macro with a primary term should be registered as an index reference', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      for (const macro of ['indexterm:[Tigers]', '(((Tigers)))']) {
        const para = await blockFromString(`${sentence}${macro}`)
        const output = para.subMacros(para.source)
        assert.equal(output, sentence)
      }
    })

    test('a single-line index term macro with primary and secondary terms should be registered as an index reference', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      for (const macro of ['indexterm:[Big cats, Tigers]', '(((Big cats, Tigers)))']) {
        const para = await blockFromString(`${sentence}${macro}`)
        const output = para.subMacros(para.source)
        assert.equal(output, sentence)
      }
    })

    test('a single-line index term macro with primary, secondary and tertiary terms should be registered as an index reference', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      for (const macro of ['indexterm:[Big cats,Tigers , Panthera tigris]', '(((Big cats,Tigers , Panthera tigris)))']) {
        const para = await blockFromString(`${sentence}${macro}`)
        const output = para.subMacros(para.source)
        assert.equal(output, sentence)
      }
    })

    test('a multi-line index term macro should be compacted and registered as an index reference', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      for (const macro of ['indexterm:[Panthera\ntigris]', '(((Panthera\ntigris)))']) {
        const para = await blockFromString(`${sentence}${macro}`)
        const output = para.subMacros(para.source)
        assert.equal(output, sentence)
      }
    })

    test('should escape concealed index term if second bracket is preceded by a backslash', async () => {
      const input = `National Institute of Science and Technology (${BACKSLASH}((NIST)))`
      const doc = await documentFromString(input, { standalone: false })
      const output = await doc.convert()
      assertXpath(output, '//p[text()="National Institute of Science and Technology (((NIST)))"]', 1)
    })

    test('should only escape enclosing brackets if concealed index term is preceded by a backslash', async () => {
      const input = `National Institute of Science and Technology ${BACKSLASH}(((NIST)))`
      const doc = await documentFromString(input, { standalone: false })
      const output = await doc.convert()
      assertXpath(output, '//p[text()="National Institute of Science and Technology (NIST)"]', 1)
    })

    test('should not split index terms on commas inside of quoted terms', async () => {
      const inputs = [
        'Tigers are big, scary cats.\nindexterm:[Tigers, "[Big\\],\nscary cats"]\n',
        'Tigers are big, scary cats.\n(((Tigers, "[Big],\nscary cats")))\n',
      ]
      for (const input of inputs) {
        const para = await blockFromString(input)
        const output = para.subMacros(para.source)
        assert.equal(output, input.split('\n')[0] + '\n')
      }
    })

    test('normal substitutions are performed on an index term macro', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      for (const macro of ['indexterm:[*Tigers*]', '(((*Tigers*)))']) {
        const para = await blockFromString(`${sentence}${macro}`)
        const output = para.applySubs(para.source)
        assert.equal(output, sentence)
      }
    })

    test('registers multiple index term macros', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.'
      const macros = '(((Tigers)))\n(((Animals,Cats)))'
      const para = await blockFromString(`${sentence}\n${macros}`)
      const output = para.subMacros(para.source)
      assert.equal(output.trimEnd(), sentence)
    })

    test('an index term macro with round bracket syntax may contain round brackets in term', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      const macro = '(((Tiger (Panthera tigris))))'
      const para = await blockFromString(`${sentence}${macro}`)
      const output = para.subMacros(para.source)
      assert.equal(output, sentence)
    })

    test('visible shorthand index term macro should not consume trailing round bracket', async () => {
      const input = '(text with ((index term)))'
      const expected = '<indexterm>\n<primary>index term</primary>\n</indexterm>'
      const para = await blockFromString(input, { backend: 'docbook' })
      const output = para.subMacros(para.source)
      assert.ok(output.includes(expected))
    })

    test('visible shorthand index term macro should not consume leading round bracket', async () => {
      const input = '(((index term)) for text)'
      const expected = '<indexterm>\n<primary>index term</primary>\n</indexterm>'
      const para = await blockFromString(input, { backend: 'docbook' })
      const output = para.subMacros(para.source)
      assert.ok(output.includes(expected))
    })

    test('an index term macro with square bracket syntax may contain square brackets in term', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.\n'
      const macro = 'indexterm:[Tiger [Panthera tigris\\]]'
      const para = await blockFromString(`${sentence}${macro}`)
      const output = para.subMacros(para.source)
      assert.equal(output, sentence)
    })

    test('a single-line index term 2 macro should be registered as an index reference and retain term inline', async () => {
      const sentence = 'The tiger (Panthera tigris) is the largest cat species.'
      for (const macro of ['The indexterm2:[tiger] (Panthera tigris) is the largest cat species.', 'The ((tiger)) (Panthera tigris) is the largest cat species.']) {
        const para = await blockFromString(macro)
        const output = para.subMacros(para.source)
        assert.equal(output, sentence)
      }
    })

    test('a multi-line index term 2 macro should be compacted and registered as an index reference and retain term inline', async () => {
      const sentence = 'The panthera tigris is the largest cat species.'
      for (const macro of ['The indexterm2:[ panthera\ntigris ] is the largest cat species.', 'The (( panthera\ntigris )) is the largest cat species.']) {
        const para = await blockFromString(macro)
        const output = para.subMacros(para.source)
        assert.equal(output, sentence)
      }
    })

    test('registers multiple index term 2 macros', async () => {
      const sentence = 'The ((tiger)) (Panthera tigris) is the largest ((cat)) species.'
      const para = await blockFromString(sentence)
      const output = para.subMacros(para.source)
      assert.equal(output, 'The tiger (Panthera tigris) is the largest cat species.')
    })

    test('should escape visible index term if preceded by a backslash', async () => {
      const sentence = `The ${BACKSLASH}((tiger)) (Panthera tigris) is the largest ${BACKSLASH}((cat)) species.`
      const para = await blockFromString(sentence)
      const output = para.subMacros(para.source)
      assert.equal(output, 'The ((tiger)) (Panthera tigris) is the largest ((cat)) species.')
    })

    test('normal substitutions are performed on an index term 2 macro', async () => {
      const sentence = 'The ((*tiger*)) (Panthera tigris) is the largest cat species.'
      const para = await blockFromString(sentence)
      const output = para.applySubs(para.source)
      assert.equal(output, 'The <strong>tiger</strong> (Panthera tigris) is the largest cat species.')
    })

    test('index term 2 macro with round bracket syntax should not interfere with index term macro with round bracket syntax', async () => {
      const sentence = 'The ((panthera tigris)) is the largest cat species.\n(((Big cats,Tigers)))'
      const para = await blockFromString(sentence)
      const output = para.subMacros(para.source)
      assert.equal(output, 'The panthera tigris is the largest cat species.\n')
    })

    test('should parse visible shorthand index term with see and seealso', async () => {
      const sentence = '((Flash >> HTML 5)) has been supplanted by ((HTML 5 &> CSS 3 &> SVG)).'
      const output = await convertStringToEmbedded(sentence, { backend: 'docbook' })
      assert.ok(output.includes('<primary>Flash</primary>\n<see>HTML 5</see>'))
      assert.ok(output.includes('<primary>HTML 5</primary>\n<seealso>CSS 3</seealso>\n<seealso>SVG</seealso>'))
    })

    test('should parse concealed shorthand index term with see and seealso', async () => {
      const sentence = 'Flash(((Flash >> HTML 5))) has been supplanted by HTML 5(((HTML 5 &> CSS 3 &> SVG))).'
      const output = await convertStringToEmbedded(sentence, { backend: 'docbook' })
      assert.ok(output.includes('<primary>Flash</primary>\n<see>HTML 5</see>'))
      assert.ok(output.includes('<primary>HTML 5</primary>\n<seealso>CSS 3</seealso>\n<seealso>SVG</seealso>'))
    })

    test('should parse visible index term macro with see and seealso', async () => {
      const sentence = 'indexterm2:[Flash,see=HTML 5] has been supplanted by indexterm2:[HTML 5,see-also="CSS 3, SVG"].'
      const output = await convertStringToEmbedded(sentence, { backend: 'docbook' })
      assert.ok(output.includes('<primary>Flash</primary>\n<see>HTML 5</see>'))
      assert.ok(output.includes('<primary>HTML 5</primary>\n<seealso>CSS 3</seealso>\n<seealso>SVG</seealso>'))
    })

    test('should parse concealed index term macro with see and seealso', async () => {
      const sentence = 'Flashindexterm:[Flash,see=HTML 5] has been supplanted by HTML 5indexterm:[HTML 5,see-also="CSS 3, SVG"].'
      const output = await convertStringToEmbedded(sentence, { backend: 'docbook' })
      assert.ok(output.includes('<primary>Flash</primary>\n<see>HTML 5</see>'))
      assert.ok(output.includes('<primary>HTML 5</primary>\n<seealso>CSS 3</seealso>\n<seealso>SVG</seealso>'))
    })

    test('should honor secondary and tertiary index terms when primary index term is quoted and contains equals sign', async () => {
      const sentence = 'Assigning variables.'
      const expected = `${sentence}<indexterm><primary>name=value</primary><secondary>variable</secondary><tertiary>assignment</tertiary></indexterm>`
      for (const macro of ['indexterm:["name=value",variable,assignment]', '(((name=value,variable,assignment)))']) {
        const para = await blockFromString(`${sentence}${macro}`, { backend: 'docbook' })
        const output = para.subMacros(para.source).replace(/\n/g, '')
        assert.equal(output, expected)
      }
    })

    describe('Button macro', () => {
      test('btn macro', async () => {
        const para = await blockFromString('btn:[Save]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<b class="button">Save</b>')
      })

      test('btn macro that spans multiple lines', async () => {
        const para = await blockFromString('btn:[Rebase and\nmerge]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<b class="button">Rebase and merge</b>')
      })

      test('btn macro for docbook backend', async () => {
        const para = await blockFromString('btn:[Save]', { backend: 'docbook', attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<guibutton>Save</guibutton>')
      })
    })

    describe('Keyboard macro', () => {
      test('kbd macro with single key', async () => {
        const para = await blockFromString('kbd:[F3]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<kbd>F3</kbd>')
      })

      test('kbd macro with single backslash key', async () => {
        const para = await blockFromString(`kbd:[${BACKSLASH} ]`, { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<kbd>\\</kbd>')
      })

      test('kbd macro with single key, docbook backend', async () => {
        const para = await blockFromString('kbd:[F3]', { backend: 'docbook', attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<keycap>F3</keycap>')
      })

      test('kbd macro with key combination', async () => {
        const para = await blockFromString('kbd:[Ctrl+Shift+T]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd></span>')
      })

      test('kbd macro with key combination that spans multiple lines', async () => {
        const para = await blockFromString('kbd:[Ctrl +\nT]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>T</kbd></span>')
      })

      test('kbd macro with key combination, docbook backend', async () => {
        const para = await blockFromString('kbd:[Ctrl+Shift+T]', { backend: 'docbook', attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<keycombo><keycap>Ctrl</keycap><keycap>Shift</keycap><keycap>T</keycap></keycombo>')
      })

      test('kbd macro with key combination delimited by pluses with spaces', async () => {
        const para = await blockFromString('kbd:[Ctrl + Shift + T]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd></span>')
      })

      test('kbd macro with key combination delimited by commas', async () => {
        const para = await blockFromString('kbd:[Ctrl,Shift,T]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd></span>')
      })

      test('kbd macro with key combination delimited by commas with spaces', async () => {
        const para = await blockFromString('kbd:[Ctrl, Shift, T]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd></span>')
      })

      test('kbd macro with key combination delimited by plus containing a comma key', async () => {
        const para = await blockFromString('kbd:[Ctrl+,]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>,</kbd></span>')
      })

      test('kbd macro with key combination delimited by commas containing a plus key', async () => {
        const para = await blockFromString('kbd:[Ctrl, +, Shift]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>+</kbd>+<kbd>Shift</kbd></span>')
      })

      test('kbd macro with key combination where last key matches plus delimiter', async () => {
        const para = await blockFromString('kbd:[Ctrl + +]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>+</kbd></span>')
      })

      test('kbd macro with key combination where last key matches comma delimiter', async () => {
        const para = await blockFromString('kbd:[Ctrl, ,]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>,</kbd></span>')
      })

      test('kbd macro with key combination containing escaped bracket', async () => {
        const para = await blockFromString('kbd:[Ctrl + \\]]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>]</kbd></span>')
      })

      test('kbd macro with key combination ending in backslash', async () => {
        const para = await blockFromString(`kbd:[Ctrl + ${BACKSLASH} ]`, { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="keyseq"><kbd>Ctrl</kbd>+<kbd>\\</kbd></span>')
      })

      test('kbd macro looks for delimiter beyond first character', async () => {
        const para = await blockFromString('kbd:[,te]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<kbd>,te</kbd>')
      })

      test('kbd macro restores trailing delimiter as key value', async () => {
        const para = await blockFromString('kbd:[te,]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<kbd>te,</kbd>')
      })
    })

    describe('Menu macro', () => {
      test('should process menu using macro syntax', async () => {
        const para = await blockFromString('menu:File[]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<b class="menuref">File</b>')
      })

      test('should process menu for docbook backend', async () => {
        const para = await blockFromString('menu:File[]', { backend: 'docbook', attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<guimenu>File</guimenu>')
      })

      test('should process multiple menu macros in same line', async () => {
        const para = await blockFromString('menu:File[] and menu:Edit[]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<b class="menuref">File</b> and <b class="menuref">Edit</b>')
      })

      test('should process menu with menu item using macro syntax', async () => {
        const para = await blockFromString('menu:File[Save As&#8230;]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">File</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Save As&#8230;</b></span>')
      })

      test('should process menu macro that spans multiple lines', async () => {
        const para = await blockFromString('menu:Preferences[Compile\non\nSave]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">Preferences</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Compile\non\nSave</b></span>')
      })

      test('should unescape escaped closing bracket in menu macro', async () => {
        const para = await blockFromString('menu:Preferences[Compile [on\\] Save]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">Preferences</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Compile [on] Save</b></span>')
      })

      test('should process menu with menu item using macro syntax when fonts icons are enabled', async () => {
        const para = await blockFromString('menu:Tools[More Tools &gt; Extensions]', { attributes: { experimental: '', icons: 'font' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">Tools</b>&#160;<i class="fa fa-angle-right caret"></i> <b class="submenu">More Tools</b>&#160;<i class="fa fa-angle-right caret"></i> <b class="menuitem">Extensions</b></span>')
      })

      test('should process menu with menu item for docbook backend', async () => {
        const para = await blockFromString('menu:File[Save As&#8230;]', { backend: 'docbook', attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<menuchoice><guimenu>File</guimenu> <guimenuitem>Save As&#8230;</guimenuitem></menuchoice>')
      })

      test('should process menu with menu item in submenu using macro syntax', async () => {
        const para = await blockFromString('menu:Tools[Project &gt; Build]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">Tools</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">Project</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Build</b></span>')
      })

      test('should process menu with menu item in submenu for docbook backend', async () => {
        const para = await blockFromString('menu:Tools[Project &gt; Build]', { backend: 'docbook', attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<menuchoice><guimenu>Tools</guimenu> <guisubmenu>Project</guisubmenu> <guimenuitem>Build</guimenuitem></menuchoice>')
      })

      test('should process menu with menu item in submenu using macro syntax and comma delimiter', async () => {
        const para = await blockFromString('menu:Tools[Project, Build]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">Tools</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">Project</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Build</b></span>')
      })

      test('should process menu with menu item using inline syntax', async () => {
        const para = await blockFromString('"File &gt; Save As&#8230;"', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">File</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Save As&#8230;</b></span>')
      })

      test('should process menu with menu item in submenu using inline syntax', async () => {
        const para = await blockFromString('"Tools &gt; Project &gt; Build"', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">Tools</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">Project</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Build</b></span>')
      })

      test('inline menu syntax should not match closing quote of XML attribute', async () => {
        const para = await blockFromString('<span class="xmltag">&lt;node&gt;</span><span class="classname">r</span>', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="xmltag">&lt;node&gt;</span><span class="classname">r</span>')
      })

      test('should process menu macro with items containing multibyte characters', async () => {
        const para = await blockFromString('menu:视图[放大, 重置]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">视图</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">放大</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">重置</b></span>')
      })

      test('should process inline menu with items containing multibyte characters', async () => {
        const para = await blockFromString('"视图 &gt; 放大 &gt; 重置"', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">视图</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">放大</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">重置</b></span>')
      })

      test('should process a menu macro with a target that begins with a character reference', async () => {
        const para = await blockFromString('menu:&#8942;[More Tools, Extensions]', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">&#8942;</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">More Tools</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Extensions</b></span>')
      })

      test('should not process a menu macro with a target that ends with a space', async () => {
        const input = 'menu:foo [bar] menu:File[Save]'
        const para = await blockFromString(input, { attributes: { experimental: '' } })
        const result = para.subMacros(para.source)
        assertXpath(result, '/span[@class="menuseq"]', 1)
        assertXpath(result, '//b[@class="menu"][text()="File"]', 1)
      })

      test('should process an inline menu that begins with a character reference', async () => {
        const para = await blockFromString('"&#8942; &gt; More Tools &gt; Extensions"', { attributes: { experimental: '' } })
        assert.equal(para.subMacros(para.source), '<span class="menuseq"><b class="menu">&#8942;</b>&#160;<b class="caret">&#8250;</b> <b class="submenu">More Tools</b>&#160;<b class="caret">&#8250;</b> <b class="menuitem">Extensions</b></span>')
      })
    })
  })
})