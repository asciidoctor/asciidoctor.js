// Integration tests for the Extensions public API.
// Ported from packages/core/test/share/asciidoctor-test.cjs → describe('Extensions').
//
// Differences from the core suite:
//   - load() and convert() are async → all tests use async/await.
//   - Assertions use node:assert/strict instead of chai.

import { describe, test, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { Extensions, load, convert } from '../src/index.js'

describe('Extensions (API)', () => {
  afterEach(() => {
    Extensions.unregisterAll()
  })

  test('should get global extension', async () => {
    Extensions.register(function () {
      this.treeProcessor(function () {
        this.process((doc) => {
          doc.append(this.createBlock(doc, 'paragraph', 'd', {}))
        })
      })
    })

    const doc = await load('test')
    assert.ok(typeof doc.getExtensions() === 'object')
    assert.equal(doc.getExtensions().tree_processor_extensions.length, 1)
  })

  test('should get document extension', async () => {
    const registry = Extensions.create()
    const opts = { extension_registry: registry }
    registry.treeProcessor(function () {
      this.process((doc) => {
        doc.append(this.createBlock(doc, 'paragraph', 'd', {}))
      })
    })
    const doc = await load('test', opts)
    assert.ok(typeof doc.getExtensions() === 'object')
    assert.equal(doc.getExtensions().tree_processor_extensions.length, 1)
  })

  test('should prepend the extension in the list', async () => {
    const registry = Extensions.create()
    const opts = { extension_registry: registry }
    registry.preprocessor(function () {
      this.process((doc, reader) => {
        const lines = reader.lines
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/\/\/ smiley/)) lines[i] = ':)'
        }
        return reader
      })
    })
    // This extension is prepended (higher precedence)
    registry.preprocessor(function () {
      this.prepend()
      this.process((doc, reader) => {
        const lines = reader.lines
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/\/\/ smiley/)) lines[i] = ':('
        }
        return reader
      })
    })
    const result = await convert('// smiley', opts)
    // Sad face because the second extension is prepended and runs first
    assert.ok(result.includes(':('))
  })

  test('should append the extension in the list (default)', async () => {
    const registry = Extensions.create()
    const opts = { extension_registry: registry }
    registry.preprocessor(function () {
      this.process((doc, reader) => {
        const lines = reader.lines
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/\/\/ smiley/)) lines[i] = ':)'
        }
        return reader
      })
    })
    // This extension is appended by default (lower precedence)
    registry.preprocessor(function () {
      this.process((doc, reader) => {
        const lines = reader.lines
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/\/\/ smiley/)) lines[i] = ':('
        }
        return reader
      })
    })
    const result = await convert('// smiley', opts)
    // Happy face because the second extension is appended and runs after the first
    assert.ok(result.includes(':)'))
  })

  test('should be able to register preferred tree processor', async () => {
    const SelfSigningTreeProcessor = Extensions.createTreeProcessor(
      'SelfSigningTreeProcessor',
      {
        process: function (document) {
          document.append(
            this.createBlock(
              document,
              'paragraph',
              'SelfSigningTreeProcessor',
              {}
            )
          )
        },
      }
    )
    Extensions.register(function () {
      this.treeProcessor(function () {
        this.process((doc) => {
          doc.append(this.createBlock(doc, 'paragraph', 'd', {}))
        })
      })
      this.treeProcessor(function () {
        this.prefer()
        this.process((doc) => {
          doc.append(this.createBlock(doc, 'paragraph', 'c', {}))
        })
      })
      this.prefer(
        'tree_processor',
        Extensions.newTreeProcessor('AwesomeTreeProcessor', {
          process: function (doc) {
            doc.append(this.createBlock(doc, 'paragraph', 'b', {}))
          },
        })
      )
      this.prefer(
        'tree_processor',
        Extensions.newTreeProcessor({
          process: function (doc) {
            doc.append(this.createBlock(doc, 'paragraph', 'a', {}))
          },
        })
      )
      this.prefer('tree_processor', SelfSigningTreeProcessor)
    })
    const doc = await load('')
    const lines = doc.getBlocks().map((block) => block.getSourceLines()[0])
    assert.deepEqual(
      lines.sort(),
      ['SelfSigningTreeProcessor', 'a', 'b', 'c', 'd'].sort()
    )
    // Verify prepend ordering: SelfSigningTreeProcessor is first
    assert.equal(lines[0], 'SelfSigningTreeProcessor')
  })

  test('should register an inline macro with short format', async () => {
    Extensions.register(function () {
      this.inlineMacro('label', function () {
        this.matchFormat('short')
        this.parseContentAs('text')
        this.process((parent, _, attrs) =>
          this.createInline(parent, 'quoted', `<label>${attrs.text}</label>`)
        )
      })
    })
    const html = await convert('label:[Checkbox]', { doctype: 'inline' })
    assert.equal(html, '<label>Checkbox</label>')
  })

  test('should register a block macro that creates a link', async () => {
    Extensions.register(function () {
      this.blockMacro('extlink', function () {
        this.process((parent, target, attrs) => {
          let text
          if (attrs.text === '') {
            text = target
          }
          const openBlock = this.createBlock(parent, 'open', [], {
            role: 'external-url',
          })
          openBlock.title = attrs.title
          const link = this.createInline(parent, 'anchor', text, {
            type: 'link',
            target,
          })
          openBlock.append(link)
          return openBlock
        })
      })
    })
    const html = await convert('extlink::http://github.com[title="GitHub"]')
    assert.equal(
      html,
      `<div class="openblock external-url">
<div class="title">GitHub</div>
<div class="content">
<a href="http://github.com"></a>
</div>
</div>`
    )
  })

  test('should parse attributes', async () => {
    let parsedAttrs = {}
    const registry = Extensions.create()
    registry.block(function () {
      this.named('attrs')
      this.onContext('open')
      this.process(async function (parent, reader) {
        parsedAttrs = await this.parseAttributes(
          parent,
          await reader.readLine(),
          { positional_attributes: ['a', 'b'] }
        )
        Object.assign(
          parsedAttrs,
          await this.parseAttributes(parent, 'foo={foo}', {
            sub_attributes: true,
          })
        )
      })
    })
    await convert(
      `:foo: bar
[attrs]
--
a,b,c,key=val
--
`,
      { extension_registry: registry }
    )
    assert.equal(parsedAttrs.a, 'a')
    assert.equal(parsedAttrs.b, 'b')
    assert.equal(parsedAttrs.key, 'val')
    assert.equal(parsedAttrs.foo, 'bar')
  })

  test('should not share attributes between parsed blocks', async () => {
    const registry = Extensions.create()
    registry.block(function () {
      this.named('wrap')
      this.onContext('open')
      this.process(async function (parent, reader, attrs) {
        const wrap = this.createOpenBlock(parent, undefined, attrs)
        return this.parseContent(wrap, await reader.readLines())
      })
    })
    const input = `
[wrap]
--
[foo=bar]
====
content
====
[baz=qux]
====
content
====
--
`
    const doc = await load(input, { extension_registry: registry })
    assert.equal(doc.getBlocks().length, 1)
    const wrap = doc.getBlocks()[0]
    assert.equal(wrap.getBlocks().length, 2)
    assert.equal(Object.keys(wrap.getBlocks()[0].getAttributes()).length, 2)
    assert.equal(Object.keys(wrap.getBlocks()[1].getAttributes()).length, 2)
    assert.equal(wrap.getBlocks()[1].getAttributes().foo, undefined)
  })

  describe('parseContent', () => {
    test('should convert attributes to Hash when calling parseContent', async () => {
      const registry = Extensions.create()
      registry.block(function () {
        this.named('test')
        this.process(async (parent, reader) => {
          await this.parseContent(parent, await reader.readLines(), {
            id: 'foo',
          })
        })
      })
      const html = await convert('[test]\n*Hello world*', {
        extension_registry: registry,
      })
      assert.ok(html.includes('<strong>Hello world</strong>'))
      assert.ok(html.includes('<div id="foo" class="paragraph">'))
    })

    test('should parse table content', async () => {
      const registry = Extensions.create()
      registry.blockMacro(function () {
        this.named('jira')
        this.process(async (parent, target, attrs) => {
          const issues = [
            {
              key: 'DOC-1234',
              fields: {
                summary: 'Parse content should work',
                created: '2021-12-28T14:38:12.056',
                priority: { name: 'High' },
                assignee: { displayName: 'CK' },
              },
            },
          ]
          const content = []
          content.push('[options="header",cols="2,1,1,2,6"]')
          content.push('|====')
          content.push('|ID | Priority | Created | Assignee | Summary')
          for (const issue of issues) {
            content.push(`|${issue.key}`)
            content.push(`|${issue.fields.priority.name}`)
            content.push(`|${issue.fields.created}`)
            content.push(
              `|${issue.fields.assignee?.displayName}` || 'Not assigned'
            )
            content.push(`|${issue.fields.summary}`)
          }
          content.push('|====')
          await this.parseContent(parent, content.join('\n'), attrs)
        })
      })
      const html = await convert('jira::DOC[]', {
        extension_registry: registry,
      })
      assert.ok(
        html.includes('<th class="tableblock halign-left valign-top">ID</th>')
      )
      assert.ok(
        html.includes(
          '<th class="tableblock halign-left valign-top">Priority</th>'
        )
      )
      assert.ok(
        html.includes(
          '<td class="tableblock halign-left valign-top"><p class="tableblock">DOC-1234</p></td>'
        )
      )
      assert.ok(
        html.includes(
          '<td class="tableblock halign-left valign-top"><p class="tableblock">Parse content should work</p></td>'
        )
      )
    })

    test('should append blocks to current parent', async () => {
      const registry = Extensions.create()
      registry.block(function () {
        this.named('csv')
        this.onContext('literal')
        this.process(async (parent, reader) => {
          this.parseContent(
            parent,
            [',==='].concat(...(await reader.readLines())).concat(',===')
          )
          return undefined
        })
      })
      const doc = await load(
        `
before

[csv]
....
a,b,c
....

after`,
        { extension_registry: registry }
      )
      assert.equal(doc.getBlocks().length, 3)
      const table = doc.getBlocks()[1]
      assert.equal(table.getContext(), 'table')
      assert.ok((await doc.convert()).includes('<td'))
    })

    test('should not share attributes between parsed blocks (parseContent)', async () => {
      const registry = Extensions.create()
      registry.block(function () {
        this.named('wrap')
        this.onContext('open')
        this.process(async (parent, reader, attrs) => {
          const wrap = this.createOpenBlock(parent, undefined, attrs)
          return this.parseContent(wrap, await reader.readLines())
        })
      })
      const doc = await load(
        `
[wrap]
--
[foo=bar]
====
content
====
[baz=qux]
====
content
====
--
`,
        { extension_registry: registry }
      )
      assert.equal(doc.getBlocks().length, 1)
      const wrap = doc.getBlocks()[0]
      assert.equal(wrap.getBlocks().length, 2)
      assert.equal(Object.keys(wrap.getBlocks()[0].getAttributes()).length, 2)
      assert.equal(Object.keys(wrap.getBlocks()[1].getAttributes()).length, 2)
      assert.equal(wrap.getBlocks()[1].getAttributes().foo, undefined)
    })
  })
})
