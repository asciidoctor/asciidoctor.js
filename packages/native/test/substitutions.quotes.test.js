// ESM conversion of substitutions_test.rb — Quotes context

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { load } from '../src/load.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const BACKSLASH = '\\'

const load_ = (input, opts = {}) => load(input, { safe: 'safe', ...opts })
const blockFromString = async (input, opts = {}) => (await load_(input, opts)).blocks[0]
const documentFromString = (input, opts = {}) => load_(input, opts)

// ── Substitutions — Quotes ────────────────────────────────────────────────────

describe('Substitutions', () => {
  describe('Quotes', () => {
    test('single-line double-quoted string', async () => {
      let para = await blockFromString('``a few quoted words\'\'', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '&#8220;a few quoted words&#8221;')

      para = await blockFromString('"`a few quoted words`"')
      assert.equal(await para.subQuotes(para.source), '&#8220;a few quoted words&#8221;')

      para = await blockFromString('"`a few quoted words`"', { backend: 'docbook' })
      assert.equal(await para.subQuotes(para.source), '<quote role="double">a few quoted words</quote>')
    })

    test('escaped single-line double-quoted string', async () => {
      let para = await blockFromString(`${BACKSLASH}\`\`a few quoted words''`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), "&#8216;`a few quoted words&#8217;'")

      para = await blockFromString(`${BACKSLASH.repeat(2)}\`\`a few quoted words''`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '``a few quoted words\'\'')

      para = await blockFromString(`${BACKSLASH}"\`a few quoted words\`"`)
      assert.equal(await para.subQuotes(para.source), '"`a few quoted words`"')

      para = await blockFromString(`${BACKSLASH.repeat(2)}"\`a few quoted words\`"`)
      assert.equal(await para.subQuotes(para.source), `${BACKSLASH}"\`a few quoted words\`"`)
    })

    test('multi-line double-quoted string', async () => {
      let para = await blockFromString("``a few\nquoted words''", { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '&#8220;a few\nquoted words&#8221;')

      para = await blockFromString('"`a few\nquoted words`"')
      assert.equal(await para.subQuotes(para.source), '&#8220;a few\nquoted words&#8221;')
    })

    test('double-quoted string with inline single quote', async () => {
      let para = await blockFromString("``Here's Johnny!''", { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), "&#8220;Here's Johnny!&#8221;")

      para = await blockFromString('"`Here\'s Johnny!`"')
      assert.equal(await para.subQuotes(para.source), "&#8220;Here's Johnny!&#8221;")
    })

    test('double-quoted string with inline backquote', async () => {
      let para = await blockFromString('``Here`s Johnny!\'\'', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '&#8220;Here`s Johnny!&#8221;')

      para = await blockFromString('"`Here`s Johnny!`"')
      assert.equal(await para.subQuotes(para.source), '&#8220;Here`s Johnny!&#8221;')
    })

    test('double-quoted string around monospaced text', async () => {
      let para = await blockFromString('"``E=mc^2^` is the solution!`"')
      assert.equal(await para.applySubs(para.source), '&#8220;`E=mc<sup>2</sup>` is the solution!&#8221;')

      para = await blockFromString('"```E=mc^2^`` is the solution!`"')
      assert.equal(await para.applySubs(para.source), '&#8220;<code>E=mc<sup>2</sup></code> is the solution!&#8221;')
    })

    test('single-line single-quoted string', async () => {
      let para = await blockFromString('`a few quoted words\'', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '&#8216;a few quoted words&#8217;')

      para = await blockFromString("'`a few quoted words`'")
      assert.equal(await para.subQuotes(para.source), '&#8216;a few quoted words&#8217;')

      para = await blockFromString("'`a few quoted words`'", { backend: 'docbook' })
      assert.equal(await para.subQuotes(para.source), '<quote role="single">a few quoted words</quote>')
    })

    test('escaped single-line single-quoted string', async () => {
      let para = await blockFromString(`${BACKSLASH}\`a few quoted words'`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '`a few quoted words\'')

      para = await blockFromString(`${BACKSLASH}'${"`"}a few quoted words${"`"}'`)
      assert.equal(await para.subQuotes(para.source), `'${"`"}a few quoted words${"`"}'`)
    })

    test('multi-line single-quoted string', async () => {
      let para = await blockFromString('`a few\nquoted words\'', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '&#8216;a few\nquoted words&#8217;')

      para = await blockFromString("'`a few\nquoted words`'")
      assert.equal(await para.subQuotes(para.source), '&#8216;a few\nquoted words&#8217;')
    })

    test("single-quoted string with inline single quote", async () => {
      let para = await blockFromString("`That isn't what I did.'", { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), "&#8216;That isn't what I did.&#8217;")

      para = await blockFromString("'`That isn't what I did.`'")
      assert.equal(await para.subQuotes(para.source), "&#8216;That isn't what I did.&#8217;")
    })

    test("single-quoted string with inline backquote", async () => {
      let para = await blockFromString("`Here\`s Johnny!'", { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), '&#8216;Here`s Johnny!&#8217;')

      para = await blockFromString("'`Here`s Johnny!`'")
      assert.equal(await para.subQuotes(para.source), '&#8216;Here`s Johnny!&#8217;')
    })

    test('single-line constrained marked string', async () => {
      const para = await blockFromString('#a few words#')
      assert.equal(await para.subQuotes(para.source), '<mark>a few words</mark>')
    })

    test('escaped single-line constrained marked string', async () => {
      const para = await blockFromString(`${BACKSLASH}#a few words#`)
      assert.equal(await para.subQuotes(para.source), '#a few words#')
    })

    test('multi-line constrained marked string', async () => {
      const para = await blockFromString('#a few\nwords#')
      assert.equal(await para.subQuotes(para.source), '<mark>a few\nwords</mark>')
    })

    test('constrained marked string should not match entity references', async () => {
      const para = await blockFromString('111 #mark a# 222 "`quote a`" 333 #mark b# 444')
      assert.equal(await para.subQuotes(para.source), '111 <mark>mark a</mark> 222 &#8220;quote a&#8221; 333 <mark>mark b</mark> 444')
    })

    test('single-line unconstrained marked string', async () => {
      const para = await blockFromString('##--anything goes ##')
      assert.equal(await para.subQuotes(para.source), '<mark>--anything goes </mark>')
    })

    test('escaped single-line unconstrained marked string', async () => {
      const para = await blockFromString(`${BACKSLASH.repeat(2)}##--anything goes ##`)
      assert.equal(await para.subQuotes(para.source), '##--anything goes ##')
    })

    test('multi-line unconstrained marked string', async () => {
      const para = await blockFromString('##--anything\ngoes ##')
      assert.equal(await para.subQuotes(para.source), '<mark>--anything\ngoes </mark>')
    })

    test('single-line constrained marked string with role', async () => {
      const para = await blockFromString('[statement]#a few words#')
      assert.equal(await para.subQuotes(para.source), '<span class="statement">a few words</span>')
    })

    test('does not recognize attribute list with left square bracket on formatted text', async () => {
      const para = await blockFromString('key: [ *before [.redacted]#redacted# after* ]')
      assert.equal(await para.subQuotes(para.source), 'key: [ <strong>before <span class="redacted">redacted</span> after</strong> ]')
    })

    test('should ignore enclosing square brackets when processing formatted text with attribute list', async () => {
      const doc = await documentFromString('nums = [1, 2, 3, [.blue]#4#]', { doctype: 'inline' })
      assert.equal(await doc.convert(), 'nums = [1, 2, 3, <span class="blue">4</span>]')
    })

    test('single-line constrained strong string', async () => {
      const para = await blockFromString('*a few strong words*')
      assert.equal(await para.subQuotes(para.source), '<strong>a few strong words</strong>')
    })

    test('escaped single-line constrained strong string', async () => {
      const para = await blockFromString(`${BACKSLASH}*a few strong words*`)
      assert.equal(await para.subQuotes(para.source), '*a few strong words*')
    })

    test('multi-line constrained strong string', async () => {
      const para = await blockFromString('*a few\nstrong words*')
      assert.equal(await para.subQuotes(para.source), '<strong>a few\nstrong words</strong>')
    })

    test('constrained strong string containing an asterisk', async () => {
      const para = await blockFromString('*bl*ck*-eye')
      assert.equal(await para.subQuotes(para.source), '<strong>bl*ck</strong>-eye')
    })

    test('constrained strong string containing an asterisk and multibyte word chars', async () => {
      const para = await blockFromString('*黑*眼圈*')
      assert.equal(await para.subQuotes(para.source), '<strong>黑*眼圈</strong>')
    })

    test('single-line constrained quote variation emphasized string', async () => {
      const para = await blockFromString('_a few emphasized words_')
      assert.equal(await para.subQuotes(para.source), '<em>a few emphasized words</em>')
    })

    test('escaped single-line constrained quote variation emphasized string', async () => {
      const para = await blockFromString(`${BACKSLASH}_a few emphasized words_`)
      assert.equal(await para.subQuotes(para.source), '_a few emphasized words_')
    })

    test('escaped single quoted string', async () => {
      const para = await blockFromString(`${BACKSLASH}'a few emphasized words'`)
      // NOTE the \' is replaced with ' by the :replacements substitution, later in the substitution pipeline
      assert.equal(await para.subQuotes(para.source), `${BACKSLASH}'a few emphasized words'`)
    })

    test('multi-line constrained emphasized quote variation string', async () => {
      const para = await blockFromString('_a few\nemphasized words_')
      assert.equal(await para.subQuotes(para.source), '<em>a few\nemphasized words</em>')
    })

    test('single-quoted string containing an emphasized phrase', async () => {
      let para = await blockFromString("`I told him, 'Just go for it!'\'", { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), "&#8216;I told him, <em>Just go for it!</em>&#8217;")

      para = await blockFromString("'`I told him, 'Just go for it!'`'")
      assert.equal(await para.subQuotes(para.source), "&#8216;I told him, 'Just go for it!'&#8217;")
    })

    test("escaped single-quotes inside emphasized words are restored", async () => {
      let para = await blockFromString(`'Here${BACKSLASH}'s Johnny!'`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), "<em>Here's Johnny!</em>")

      para = await blockFromString(`'Here${BACKSLASH}'s Johnny!'`)
      assert.equal(await para.applySubs(para.source), "'Here's Johnny!'")
    })

    test('single-line constrained emphasized underline variation string', async () => {
      const para = await blockFromString('_a few emphasized words_')
      assert.equal(await para.subQuotes(para.source), '<em>a few emphasized words</em>')
    })

    test('escaped single-line constrained emphasized underline variation string', async () => {
      const para = await blockFromString(`${BACKSLASH}_a few emphasized words_`)
      assert.equal(await para.subQuotes(para.source), '_a few emphasized words_')
    })

    test('multi-line constrained emphasized underline variation string', async () => {
      const para = await blockFromString('_a few\nemphasized words_')
      assert.equal(await para.subQuotes(para.source), '<em>a few\nemphasized words</em>')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('single-line constrained monospaced string', async () => {
      let para = await blockFromString('`a few <{monospaced}> words`', { attributes: { monospaced: 'monospaced', 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), '<code>a few &lt;{monospaced}&gt; words</code>')

      para = await blockFromString('`a few <{monospaced}> words`', { attributes: { monospaced: 'monospaced' } })
      assert.equal(await para.applySubs(para.source), '<code>a few &lt;monospaced&gt; words</code>')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('single-line constrained monospaced string with role', async () => {
      let para = await blockFromString('[input]`a few <{monospaced}> words`', { attributes: { monospaced: 'monospaced', 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), '<code class="input">a few &lt;{monospaced}&gt; words</code>')

      para = await blockFromString('[input]`a few <{monospaced}> words`', { attributes: { monospaced: 'monospaced' } })
      assert.equal(await para.applySubs(para.source), '<code class="input">a few &lt;monospaced&gt; words</code>')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped single-line constrained monospaced string', async () => {
      let para = await blockFromString(`${BACKSLASH}\`a few <monospaced> words\``, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), '`a few &lt;monospaced&gt; words`')

      para = await blockFromString(`${BACKSLASH}\`a few <monospaced> words\``)
      assert.equal(await para.applySubs(para.source), '`a few &lt;monospaced&gt; words`')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped single-line constrained monospaced string with role', async () => {
      let para = await blockFromString(`[input]${BACKSLASH}\`a few <monospaced> words\``, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), '[input]`a few &lt;monospaced&gt; words`')

      para = await blockFromString(`[input]${BACKSLASH}\`a few <monospaced> words\``)
      assert.equal(await para.applySubs(para.source), '[input]`a few &lt;monospaced&gt; words`')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped role on single-line constrained monospaced string', async () => {
      let para = await blockFromString(`${BACKSLASH}[input]\`a few <monospaced> words\``, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), '[input]<code>a few &lt;monospaced&gt; words</code>')

      para = await blockFromString(`${BACKSLASH}[input]\`a few <monospaced> words\``)
      assert.equal(await para.applySubs(para.source), '[input]<code>a few &lt;monospaced&gt; words</code>')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped role on escaped single-line constrained monospaced string', async () => {
      let para = await blockFromString(`${BACKSLASH}[input]${BACKSLASH}\`a few <monospaced> words\``, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), `${BACKSLASH}[input]\`a few &lt;monospaced&gt; words\``)

      para = await blockFromString(`${BACKSLASH}[input]${BACKSLASH}\`a few <monospaced> words\``)
      assert.equal(await para.applySubs(para.source), `${BACKSLASH}[input]\`a few &lt;monospaced&gt; words\``)
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('should ignore role that ends with transitional role on constrained monospace span', async () => {
      const para = await blockFromString('[foox-]`leave it alone`')
      assert.equal(await para.applySubs(para.source), '<code class="foox-">leave it alone</code>')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped single-line constrained monospace string with forced compat role', async () => {
      const para = await blockFromString(`[x-]${BACKSLASH}\`leave it alone\``)
      assert.equal(await para.applySubs(para.source), '[x-]`leave it alone`')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped forced compat role on single-line constrained monospace string', async () => {
      const para = await blockFromString(`${BACKSLASH}[x-]\`just *mono*\``)
      assert.equal(await para.applySubs(para.source), '[x-]<code>just <strong>mono</strong></code>')
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('multi-line constrained monospaced string', async () => {
      let para = await blockFromString('`a few\n<{monospaced}> words`', { attributes: { monospaced: 'monospaced', 'compat-mode': '' } })
      assert.equal(await para.applySubs(para.source), '<code>a few\n&lt;{monospaced}&gt; words</code>')

      para = await blockFromString('`a few\n<{monospaced}> words`', { attributes: { monospaced: 'monospaced' } })
      assert.equal(await para.applySubs(para.source), '<code>a few\n&lt;monospaced&gt; words</code>')
    })

    test('single-line unconstrained strong chars', async () => {
      const para = await blockFromString('**Git**Hub')
      assert.equal(await para.subQuotes(para.source), '<strong>Git</strong>Hub')
    })

    test('escaped single-line unconstrained strong chars', async () => {
      const para = await blockFromString(`${BACKSLASH}**Git**Hub`)
      assert.equal(await para.subQuotes(para.source), '<strong>*Git</strong>*Hub')
    })

    test('multi-line unconstrained strong chars', async () => {
      const para = await blockFromString('**G\ni\nt\n**Hub')
      assert.equal(await para.subQuotes(para.source), '<strong>G\ni\nt\n</strong>Hub')
    })

    test('unconstrained strong chars with inline asterisk', async () => {
      const para = await blockFromString('**bl*ck**-eye')
      assert.equal(await para.subQuotes(para.source), '<strong>bl*ck</strong>-eye')
    })

    test('unconstrained strong chars with role', async () => {
      const para = await blockFromString('Git[blue]**Hub**')
      assert.equal(await para.subQuotes(para.source), 'Git<strong class="blue">Hub</strong>')
    })

    test('escaped unconstrained strong chars with role', async () => {
      const para = await blockFromString(`Git${BACKSLASH}[blue]**Hub**`)
      assert.equal(await para.subQuotes(para.source), 'Git[blue]<strong>*Hub</strong>*')
    })

    test('single-line unconstrained emphasized chars', async () => {
      const para = await blockFromString('__Git__Hub')
      assert.equal(await para.subQuotes(para.source), '<em>Git</em>Hub')
    })

    test('escaped single-line unconstrained emphasized chars', async () => {
      const para = await blockFromString(`${BACKSLASH}__Git__Hub`)
      assert.equal(await para.subQuotes(para.source), '__Git__Hub')
    })

    test('escaped single-line unconstrained emphasized chars around word', async () => {
      const para = await blockFromString(`${BACKSLASH.repeat(2)}__GitHub__`)
      assert.equal(await para.subQuotes(para.source), '__GitHub__')
    })

    test('multi-line unconstrained emphasized chars', async () => {
      const para = await blockFromString('__G\ni\nt\n__Hub')
      assert.equal(await para.subQuotes(para.source), '<em>G\ni\nt\n</em>Hub')
    })

    test('unconstrained emphasis chars with role', async () => {
      const para = await blockFromString('[gray]__Git__Hub')
      assert.equal(await para.subQuotes(para.source), '<em class="gray">Git</em>Hub')
    })

    test('escaped unconstrained emphasis chars with role', async () => {
      const para = await blockFromString(`${BACKSLASH}[gray]__Git__Hub`)
      assert.equal(await para.subQuotes(para.source), '[gray]__Git__Hub')
    })

    test('single-line constrained monospaced chars', async () => {
      let para = await blockFromString('call +save()+ to persist the changes', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'call <code>save()</code> to persist the changes')

      para = await blockFromString('call [x-]+save()+ to persist the changes')
      assert.equal(await para.applySubs(para.source), 'call <code>save()</code> to persist the changes')

      para = await blockFromString('call `save()` to persist the changes')
      assert.equal(await para.subQuotes(para.source), 'call <code>save()</code> to persist the changes')
    })

    test('single-line constrained monospaced chars with role', async () => {
      let para = await blockFromString('call [method]+save()+ to persist the changes', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'call <code class="method">save()</code> to persist the changes')

      para = await blockFromString('call [method x-]+save()+ to persist the changes')
      assert.equal(await para.applySubs(para.source), 'call <code class="method">save()</code> to persist the changes')

      para = await blockFromString('call [method]`save()` to persist the changes')
      assert.equal(await para.subQuotes(para.source), 'call <code class="method">save()</code> to persist the changes')
    })

    test('escaped single-line constrained monospaced chars', async () => {
      let para = await blockFromString(`call ${BACKSLASH}+save()+ to persist the changes`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'call +save()+ to persist the changes')

      para = await blockFromString(`call ${BACKSLASH}\`save()\` to persist the changes`)
      assert.equal(await para.subQuotes(para.source), 'call `save()` to persist the changes')
    })

    test('escaped single-line constrained monospaced chars with role', async () => {
      let para = await blockFromString(`call [method]${BACKSLASH}+save()+ to persist the changes`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'call [method]+save()+ to persist the changes')

      para = await blockFromString(`call [method]${BACKSLASH}\`save()\` to persist the changes`)
      assert.equal(await para.subQuotes(para.source), 'call [method]`save()` to persist the changes')
    })

    test('escaped role on single-line constrained monospaced chars', async () => {
      let para = await blockFromString(`call ${BACKSLASH}[method]+save()+ to persist the changes`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'call [method]<code>save()</code> to persist the changes')

      para = await blockFromString(`call ${BACKSLASH}[method]\`save()\` to persist the changes`)
      assert.equal(await para.subQuotes(para.source), 'call [method]<code>save()</code> to persist the changes')
    })

    test('escaped role on escaped single-line constrained monospaced chars', async () => {
      let para = await blockFromString(`call ${BACKSLASH}[method]${BACKSLASH}+save()+ to persist the changes`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), `call ${BACKSLASH}[method]+save()+ to persist the changes`)

      para = await blockFromString(`call ${BACKSLASH}[method]${BACKSLASH}\`save()\` to persist the changes`)
      assert.equal(await para.subQuotes(para.source), `call ${BACKSLASH}[method]\`save()\` to persist the changes`)
    })

    // NOTE must use applySubs because constrained monospaced is handled as a passthrough
    test('escaped single-line constrained passthrough string with forced compat role', async () => {
      const para = await blockFromString(`[x-]${BACKSLASH}+leave it alone+`)
      assert.equal(await para.applySubs(para.source), '[x-]+leave it alone+')
    })

    test('single-line unconstrained monospaced chars', async () => {
      let para = await blockFromString('Git++Hub++', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'Git<code>Hub</code>')

      para = await blockFromString('Git[x-]++Hub++')
      assert.equal(await para.applySubs(para.source), 'Git<code>Hub</code>')

      para = await blockFromString('Git``Hub``')
      assert.equal(await para.subQuotes(para.source), 'Git<code>Hub</code>')
    })

    test('escaped single-line unconstrained monospaced chars', async () => {
      let para = await blockFromString(`Git${BACKSLASH}++Hub++`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'Git+<code>Hub</code>+')

      para = await blockFromString(`Git${BACKSLASH.repeat(2)}++Hub++`, { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'Git++Hub++')

      para = await blockFromString(`Git${BACKSLASH}\`\`Hub\`\``)
      assert.equal(await para.subQuotes(para.source), 'Git``Hub``')
    })

    test('multi-line unconstrained monospaced chars', async () => {
      let para = await blockFromString('Git++\nH\nu\nb++', { attributes: { 'compat-mode': '' } })
      assert.equal(await para.subQuotes(para.source), 'Git<code>\nH\nu\nb</code>')

      para = await blockFromString('Git[x-]++\nH\nu\nb++')
      assert.equal(await para.applySubs(para.source), 'Git<code>\nH\nu\nb</code>')

      para = await blockFromString('Git``\nH\nu\nb``')
      assert.equal(await para.subQuotes(para.source), 'Git<code>\nH\nu\nb</code>')
    })

    test('single-line superscript chars', async () => {
      const para = await blockFromString("x^2^ = x * x, e = mc^2^, there's a 1^st^ time for everything")
      assert.equal(await para.subQuotes(para.source), "x<sup>2</sup> = x * x, e = mc<sup>2</sup>, there's a 1<sup>st</sup> time for everything")
    })

    test('escaped single-line superscript chars', async () => {
      const para = await blockFromString(`x${BACKSLASH}^2^ = x * x`)
      assert.equal(await para.subQuotes(para.source), 'x^2^ = x * x')
    })

    test('does not match superscript across whitespace', async () => {
      const para = await blockFromString('x^(n\n-\n1)^')
      assert.equal(await para.subQuotes(para.source), para.source)
    })

    test('allow spaces in superscript if spaces are inserted using an attribute reference', async () => {
      const para = await blockFromString('Night ^A{sp}poem{sp}by{sp}Jane{sp}Kondo^.')
      assert.equal(await para.applySubs(para.source), 'Night <sup>A poem by Jane Kondo</sup>.')
    })

    test('allow spaces in superscript if text is wrapped in a passthrough', async () => {
      const para = await blockFromString('Night ^+A poem by Jane Kondo+^.')
      assert.equal(await para.applySubs(para.source), 'Night <sup>A poem by Jane Kondo</sup>.')
    })

    test('does not match adjacent superscript chars', async () => {
      const para = await blockFromString('a ^^ b')
      assert.equal(await para.subQuotes(para.source), 'a ^^ b')
    })

    test('does not confuse superscript and links with blank window shorthand', async () => {
      const para = await blockFromString('http://localhost[Text^] on the 21^st^ and 22^nd^')
      assert.equal(await para.content(), '<a href="http://localhost" target="_blank" rel="noopener">Text</a> on the 21<sup>st</sup> and 22<sup>nd</sup>')
    })

    test('single-line subscript chars', async () => {
      const para = await blockFromString('H~2~O')
      assert.equal(await para.subQuotes(para.source), 'H<sub>2</sub>O')
    })

    test('escaped single-line subscript chars', async () => {
      const para = await blockFromString(`H${BACKSLASH}~2~O`)
      assert.equal(await para.subQuotes(para.source), 'H~2~O')
    })

    test('does not match subscript across whitespace', async () => {
      const para = await blockFromString('project~ view\non\nGitHub~')
      assert.equal(await para.subQuotes(para.source), para.source)
    })

    test('does not match adjacent subscript chars', async () => {
      const para = await blockFromString('a ~~ b')
      assert.equal(await para.subQuotes(para.source), 'a ~~ b')
    })

    test('does not match subscript across distinct URLs', async () => {
      const para = await blockFromString('http://www.abc.com/~def[DEF] and http://www.abc.com/~ghi[GHI]')
      assert.equal(await para.subQuotes(para.source), para.source)
    })

    test('quoted text with role shorthand', async () => {
      const para = await blockFromString('[.white.red-background]#alert#')
      assert.equal(await para.subQuotes(para.source), '<span class="white red-background">alert</span>')
    })

    test('quoted text with id shorthand', async () => {
      const para = await blockFromString('[#bond]#007#')
      assert.equal(await para.subQuotes(para.source), '<span id="bond">007</span>')
    })

    test('quoted text with id and role shorthand', async () => {
      const para = await blockFromString('[#bond.white.red-background]#007#')
      assert.equal(await para.subQuotes(para.source), '<span id="bond" class="white red-background">007</span>')
    })

    test('quoted text with id and role shorthand with roles before id', async () => {
      const para = await blockFromString('[.white.red-background#bond]#007#')
      assert.equal(await para.subQuotes(para.source), '<span id="bond" class="white red-background">007</span>')
    })

    test('quoted text with id and role shorthand with roles around id', async () => {
      const para = await blockFromString('[.white#bond.red-background]#007#')
      assert.equal(await para.subQuotes(para.source), '<span id="bond" class="white red-background">007</span>')
    })

    test('quoted text with id and role shorthand using docbook backend', async () => {
      const para = await blockFromString('[#bond.white.red-background]#007#', { backend: 'docbook' })
      assert.equal(await para.subQuotes(para.source), '<anchor xml:id="bond"/><phrase role="white red-background">007</phrase>')
    })

    test('should not assign role attribute if shorthand style has no roles', async () => {
      const para = await blockFromString('[#idname]*blah*')
      assert.equal(await para.content(), '<strong id="idname">blah</strong>')
    })

    test('should remove trailing spaces from role defined using shorthand', async () => {
      const para = await blockFromString('[.rolename ]*blah*')
      assert.equal(await para.content(), '<strong class="rolename">blah</strong>')
    })

    test('should allow role to be defined using attribute reference', async () => {
      const doc = await documentFromString('[{rolename}]#phrase#', { doctype: 'inline', attributes: { rolename: 'red' } })
      assert.equal(await doc.convert(), '<span class="red">phrase</span>')
    })

    test('should ignore attributes after comma', async () => {
      const para = await blockFromString('[red, foobar]#alert#')
      assert.equal(await para.subQuotes(para.source), '<span class="red">alert</span>')
    })

    test('should remove leading and trailing spaces around role after ignoring attributes after comma', async () => {
      const para = await blockFromString('[ red , foobar]#alert#')
      assert.equal(await para.subQuotes(para.source), '<span class="red">alert</span>')
    })

    test('should not assign role if value before comma is empty', async () => {
      const para = await blockFromString('[,]#anonymous#')
      assert.equal(await para.subQuotes(para.source), 'anonymous')
    })

    test('inline passthrough with id and role set using shorthand', async () => {
      for (const attrlist of ['#idname.rolename', '.rolename#idname']) {
        const para = await blockFromString(`[${attrlist}]+pass+`)
        assert.equal(await para.content(), '<span id="idname" class="rolename">pass</span>')
      }
    })
  })
})
