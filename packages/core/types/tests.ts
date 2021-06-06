// use module-alias to resolve @asciidoctor/core
// see: https://github.com/microsoft/TypeScript/issues/10866
import 'module-alias/register';
import asciidoctor, { Asciidoctor } from '@asciidoctor/core';
import { strict as assert } from 'assert';
import * as ospath from 'path';
import fs from 'fs';
import nunjucks from 'nunjucks';
import pkg from '../package.json';

const processor = asciidoctor();
const version: string = processor.getVersion();

// Version
assert(version === pkg.version);

// Safe mode
assert(processor.SafeMode.UNSAFE === 0);
assert(processor.SafeMode.SAFE === 1);
assert(processor.SafeMode.SERVER === 10);
assert(processor.SafeMode.SECURE === 20);
const safeModeNames = processor.SafeMode.getNames();
assert(safeModeNames.length === 4);
assert(safeModeNames.includes('safe'));
assert(safeModeNames.includes('unsafe'));
assert(safeModeNames.includes('server'));
assert(safeModeNames.includes('secure'));
assert(processor.SafeMode.getValueForName('secure') === 20);
assert(processor.SafeMode.getNameForValue(0) === 'unsafe');
assert(processor.SafeMode.getNameForValue(50) === undefined);

const defaultLogger = processor.LoggerManager.getLogger();
assert(defaultLogger.getLevel() === 2);
assert(defaultLogger.getProgramName() === 'asciidoctor');
assert(defaultLogger.getMaxSeverity() === undefined);
defaultLogger.setProgramName('asciidoctor.js');
assert(defaultLogger.getProgramName() === 'asciidoctor.js');

const input = `= Main Title: Subtitle
Doc Writer <doc.writer@asciidoc.org>; John Smith <john.smith@asciidoc.org>
v1.0, 2013-05-20: First draft

== First section

A normal paragraph.

The hail-and-rainbow protocol can be initiated at five levels:
double,
tertiary,
supernumerary,
supermassive,
and apocalyptic party.footnote:[The double hail-and-rainbow level makes my toes tingle.]
A bold statement!footnote:disclaimer[Opinions are my own.]

Another outrageous statement.footnote:disclaimer[]

[#img-sunset]
[caption="Figure 1: ",link=https://www.flickr.com/photos/javh/5448336655]
image::sunset.jpg[Sunset,300,200]

image::https://asciidoctor.org/images/octocat.jpg[GitHub mascot]`;
const asciidoctorDocument = processor.load(input);

// Document title
const documentTitle = asciidoctorDocument.getDocumentTitle({partition: true});
const documentTitlePartitioned = documentTitle as Asciidoctor.Document.Title;
assert(documentTitlePartitioned.getMain() === 'Main Title');
assert(documentTitlePartitioned.getSubtitle() === 'Subtitle');
const documentTitleString = asciidoctorDocument.getDocumentTitle();
assert(documentTitleString === 'Main Title: Subtitle');
asciidoctorDocument.setTitle('The Dangerous & Thrilling Documentation');
assert(asciidoctorDocument.getTitle() === 'The Dangerous &amp; Thrilling Documentation');

// Author
const authors = asciidoctorDocument.getAuthors();
assert(authors.length === 2);
const firstAuthor = authors[0];
assert(firstAuthor.getName() === 'Doc Writer');
assert(firstAuthor.getEmail() === 'doc.writer@asciidoc.org');
assert(firstAuthor.getFirstName() === 'Doc');
assert(firstAuthor.getLastName() === 'Writer');
assert(firstAuthor.getMiddleName() === undefined);
assert(firstAuthor.getInitials() === 'DW');

const output = processor.convert(input, {to_file: `${__dirname}/output.html`, catalog_assets: true});
const doc = output as Asciidoctor.Document;
assert(doc.hasSections());
assert(!doc.getSourcemap());
doc.setSourcemap(true);
assert(doc.getSourcemap());

// Block
const block = processor.Block.create(doc, 'paragraph');
assert(block.getContext() === 'paragraph');
assert(block.applySubstitutions('<html> -- the root of all web') === '&lt;html&gt;&#8201;&#8212;&#8201;the root of all web');
assert(Object.keys(block.getAttributes()).length === 0);
block.setAttribute('awesome', true);
block.setAttribute('status', 'active');
block.setAttribute('status', 'passive');
block.setAttribute('count', 3);
block.setAttribute('awesome', '1', false);
const attributes = block.getAttributes();
assert(attributes.count === 3);
assert(attributes.awesome);
assert(attributes.status === 'passive');

// Section
const section = processor.Section.create();
section.setId('sect1');
assert(section.getId() === 'sect1');

const footnotes = doc.getFootnotes();
assert(footnotes.length === 2);
const firstFootnote = footnotes[0];
assert(firstFootnote.getIndex() === 1);
assert(firstFootnote.getText() === 'The double hail-and-rainbow level makes my toes tingle.');

const imagesCatalog = doc.getImages();
assert(imagesCatalog.length === 2);
const firstImage = imagesCatalog[0];
assert(firstImage.getTarget() === 'sunset.jpg');
const secondImage = imagesCatalog[1];
assert(secondImage.getTarget() === 'https://asciidoctor.org/images/octocat.jpg');
assert(secondImage.getImagesDirectory() === undefined);

// Reader
const reader = doc.getReader();
assert(reader.getLines().length === 0); // reader is empty, document is already processed
assert(reader.getString() === '');
assert(!reader.hasMoreLines());
assert(reader.isEmpty());

// Cursor
const cursor = reader.getCursor();
assert(cursor.getDirectory() === `${ospath.resolve(`${__dirname}/..`)}`);
assert(cursor.getFile() === undefined);
assert(cursor.getLineNumber() === 24); // end of the input
assert(cursor.getPath() === '<stdin>');

// Registry
const emptyRegistry = processor.Extensions.create();
const docWithEmptyRegistry = processor.load('test', {extension_registry: emptyRegistry});
const emptyExtensionsRegistry = docWithEmptyRegistry.getExtensions();
assert(!emptyExtensionsRegistry.hasBlockMacros());
assert(!emptyExtensionsRegistry.hasBlocks());
assert(!emptyExtensionsRegistry.hasDocinfoProcessors());
assert(!emptyExtensionsRegistry.hasDocinfoProcessors('head'));
assert(!emptyExtensionsRegistry.hasDocinfoProcessors('footer'));
assert(!emptyExtensionsRegistry.hasIncludeProcessors());
assert(!emptyExtensionsRegistry.hasInlineMacros());
assert(!emptyExtensionsRegistry.hasPostprocessors());
assert(!emptyExtensionsRegistry.hasPreprocessors());
assert(!emptyExtensionsRegistry.hasTreeProcessors());
const fooRegistry = processor.Extensions.create('foo', function() {
  this.includeProcessor(function() {
    const self = this;
    self.process((doc, reader, target, attrs) => {
      reader.pushInclude(['included content'], target, target, 1, attrs);
    });
  });
  this.treeProcessor(function() {
    const self = this;
    self.process((document) => {
      document.setAttribute('firstname', 'Ghost');
      document.setAttribute('author', 'Ghost Writer');
      return document;
    });
  });
  this.postprocessor(function() {
    const self = this;
    self.process((document, output) => {
      return output.replace(/<(\w+).*?>/m, "<\\1>");
    });
  });
  this.docinfoProcessor(function() {
    const self = this;
    self.atLocation('head');
    self.process((_) => {
      return '<meta name="application-name" content="Asciidoctor App">';
    });
  });
  this.preprocessor(function() {
    const self = this;
    self.process((document, reader) => {
      const lines = reader.getLines();
      const skipped = [];
      while (lines.length > 0 && !lines[0].startsWith('=')) {
        skipped.push(lines.shift());
        reader.advance();
      }
      document.setAttribute('skipped', (skipped.join('\n')));
      return reader;
    });
  });
});
const docWithFooRegistry = processor.load('test', {extension_registry: fooRegistry});
const fooExtensionsRegistry = docWithFooRegistry.getExtensions();
assert(!fooExtensionsRegistry.hasBlockMacros());
assert(!fooExtensionsRegistry.hasBlocks());
assert(!fooExtensionsRegistry.hasDocinfoProcessors('footer'));
assert(!fooExtensionsRegistry.hasInlineMacros());
assert(fooExtensionsRegistry.hasDocinfoProcessors());
assert(fooExtensionsRegistry.hasDocinfoProcessors('head'));
assert(fooExtensionsRegistry.hasIncludeProcessors());
assert(fooExtensionsRegistry.hasPostprocessors());
assert(fooExtensionsRegistry.hasPreprocessors());
assert(fooExtensionsRegistry.hasTreeProcessors());
const docinfoProcessors = fooExtensionsRegistry.getDocinfoProcessors('head');
assert(docinfoProcessors.length === 1);
const testRegistry = processor.Extensions.create('test', function() {
  this.inlineMacro('attrs', function() {
    const self = this;
    self.matchFormat('short');
    self.defaultAttributes({1: 'a', 2: 'b', foo: 'baz'});
    self.positionalAttributes('a', 'b');
    self.process(function(parent, _, attrs) {
      return this.createInline(parent, 'quoted', `a=${attrs['a']},2=${attrs[2]},b=${attrs['b'] || 'nil'},foo=${attrs['foo']}`);
    });
  });
  this.blockMacro(function() {
    this.named('test');
    this.process(function(parent) {
      return this.createBlock(parent, 'paragraph', 'this was only a test');
    });
  });
  this.block('yell', function() {
    this.onContext('paragraph');
    this.positionalAttributes('chars');
    this.parseContentAs('simple');
    this.process(function(parent, reader, attributes) {
      const chars = attributes['chars'];
      const lines = reader.getLines();
      if (chars) {
        const regexp = new RegExp(`[${chars}]`, 'g');
        return this.createParagraph(parent, lines.map((l) => l.toLowerCase().replace(regexp, (m) => m.toUpperCase())), attributes);
      } else {
        const source = lines.map((l) => l.toUpperCase());
        return this.createParagraph(parent, source, attributes);
      }
    });
  });
  this.block('todo-list', function() {
    this.onContext('paragraph');
    this.parseContentAs('simple');
    this.process(function(parent, reader) {
      const list = this.createList(parent, 'ulist');
      const lines = reader.getLines();
      for (const line of lines) {
        list.append(this.createListItem(list, line));
      }
      list.append(this.createListItem(list));
      parent.append(list);
    });
  });
  this.blockMacro(function() {
    this.named('img');
    this.process(function(parent, target) {
      return this.createImageBlock(parent, {target: target + '.png', title: 'title', caption: 'caption'});
    });
  });
  this.blockMacro(function() {
    this.named('open');
    this.process(function(parent, target) {
      const block = this.createOpenBlock(parent);
      block.append(this.createParagraph(parent, target));
      return block;
    });
  });
  this.blockMacro(function() {
    this.named('example');
    this.process(function(parent, target) {
      return this.createExampleBlock(parent, target);
    });
  });
  this.blockMacro(function() {
    this.named('span');
    this.process(function(parent, target) {
      return this.createPassBlock(parent, `<span>${target}</span>`);
    });
  });
  this.blockMacro(function() {
    this.named('listing');
    this.process(function(parent, target) {
      return this.createListingBlock(parent, `console.log('${target}')`);
    });
  });
  this.blockMacro(function() {
    this.named('literal');
    this.process(function(parent, target) {
      return this.createLiteralBlock(parent, target);
    });
  });
  this.inlineMacro(function() {
    this.named('mention');
    this.resolveAttributes(false);
    this.process(function(parent, target, attrs) {
      const text = attrs.text ? attrs.text : target;
      return this.createAnchor(parent, text, {type: 'link', target: `https://github.com/${target}`});
    });
  });
  this.inlineMacro(function() {
    this.named('say');
    this.process(function(parent, target) {
      return this.createInlinePass(parent, `*${target}*`, {attributes: {subs: 'normal'}});
    });
  });
  this.inlineMacro(function() {
    this.named('@mention');
    this.match(/@(\w+)/);
    this.process(function(parent, target) {
      const mentionsUriPattern = parent.getDocument().getAttribute('mentions-uri-pattern') || 'https://github.com/%s';
      const mentionsUri = mentionsUriPattern.replace('%s', target);
      return this.createAnchor(parent, `@${target}`, {type: 'link', target: mentionsUri});
    });
  });
});

const PackageInlineMacro = processor.Extensions.createInlineMacroProcessor('PackageInlineMacro', {
  initialize(name, config) {
    this.DEFAULT_PACKAGE_URL_FORMAT = config.defaultPackageUrlFormat || 'https://packages.ubuntu.com/bionic/%s';
    this.super(name, config);
  },
  process(parent, target) {
    const format = parent.getDocument().getAttribute('url-package-url-format', this.DEFAULT_PACKAGE_URL_FORMAT);
    const url = format.replace('%s', target);
    const content = target;
    const attributes = {window: '_blank'};
    return this.createInline(parent, 'anchor', content, {type: 'link', target: url, attributes});
  }
});
const inlineMacroProcessorInstance = PackageInlineMacro.$new('package', {defaultPackageUrlFormat: 'https://apps.fedoraproject.org/packages/%s'});
assert(inlineMacroProcessorInstance.getConfig().defaultPackageUrlFormat === 'https://apps.fedoraproject.org/packages/%s');
assert(inlineMacroProcessorInstance.getName() === 'package');
testRegistry.inlineMacro(inlineMacroProcessorInstance);
testRegistry.inlineMacro('pkg', function() {
  this.option('defaultPackageUrlFormat', 'https://apps.fedoraproject.org/packages/%s');
  this.process(function(parent, target) {
    const format = parent.getDocument().getAttribute('url-package-url-format', this.getConfig().defaultPackageUrlFormat);
    const url = format.replace('%s', target);
    const content = target;
    const attributes = {window: '_blank'};
    return this.createInline(parent, 'anchor', content, {type: 'link', target: url, attributes});
  });
});
testRegistry.includeProcessor(processor.Extensions.newIncludeProcessor('StaticIncludeProcessor', {
  process(doc, reader, target, attrs) {
    reader.pushInclude(['included content'], target, target, 1, attrs);
  }
}));
const includeProcessor = processor.Extensions.createIncludeProcessor('StaticIncludeProcessor', {
  initialize(value) {
    this.value = value;
    this.super();
  },
  postConstruct() {
    this.bar = 'bar';
  },
  process(doc, reader, target, attrs) {
    reader.pushInclude([this.value + this.bar], target, target, 1, attrs);
  }
});
const includeProcessorInstance = includeProcessor.$new('foo');
testRegistry.includeProcessor(includeProcessorInstance);

const SelfSigningTreeProcessor = processor.Extensions.createTreeProcessor('SelfSigningTreeProcessor', {
  process(document) {
    document.append(this.createBlock(document, 'paragraph', 'SelfSigningTreeProcessor', {}));
  }
});
try {
  processor.Extensions.register(function() {
    this.treeProcessor(function() {
      this.process(function(doc) {
        doc.append(this.createBlock(doc, 'paragraph', 'd', {}));
      });
    });
    this.treeProcessor(function() {
      const self = this;
      self.prefer();
      self.process(function(doc) {
        doc.append(this.createBlock(doc, 'paragraph', 'c', {}));
      });
    });
    this.prefer('tree_processor', processor.Extensions.newTreeProcessor('AwesomeTreeProcessor', {
      process(doc) {
        doc.append(this.createBlock(doc, 'paragraph', 'b', {}));
      }
    }));
    this.prefer('tree_processor', processor.Extensions.newTreeProcessor({
      process(doc) {
        doc.append(this.createBlock(doc, 'paragraph', 'a', {}));
      }
    }));
    this.prefer('tree_processor', SelfSigningTreeProcessor);
  });
  const doc = processor.load('');
  const lines = doc.getBlocks().map(block => block.getSourceLines()[0]);
  assert(lines[0] === 'SelfSigningTreeProcessor');
  assert(lines[1] === 'a');
  assert(lines[2] === 'b');
  assert(lines[3] === 'c');
  assert(lines[4] === 'd');
} finally {
  processor.Extensions.unregisterAll();
}

const groups = testRegistry.getGroups();
assert(Object.keys(groups)[0] === 'test');
const opts = {extension_registry: testRegistry, header_footer: false, safe: 'safe'};

let html = processor.convert('test::[]', opts);
assert(html === `<div class="paragraph">
<p>this was only a test</p>
</div>`);

html = processor.convert('attrs:[A,foo=bar]', opts);
assert(html === `<div class="paragraph">
<p>a=A,2=b,b=nil,foo=bar</p>
</div>`);

html = processor.convert('Install package:asciidoctor[]', opts);
assert(html === `<div class="paragraph">
<p>Install <a href="https://apps.fedoraproject.org/packages/asciidoctor" target="_blank" rel="noopener">asciidoctor</a></p>
</div>`);
html = processor.convert(`
[yell]
Hi there!

[yell,chars=aeiou]
Hi there!
`, opts);
assert(html === `<div class="paragraph">
<p>HI THERE!</p>
</div>
<div class="paragraph">
<p>hI thErE!</p>
</div>`);

html = processor.convert(`
[todo-list]
redesign website
do some nerdy stuff
`, opts);
assert(html === `<div class="ulist">
<ul>
<li>
<p>redesign website</p>
</li>
<li>
<p>do some nerdy stuff</p>
</li>
<li>
<p></p>
</li>
</ul>
</div>`);

html = processor.convert('@mojavelinux', opts);
assert(html === `<div class="paragraph">
<p><a href="https://github.com/mojavelinux">@mojavelinux</a></p>
</div>`);

const docWithSectionsWithAndWithoutRole = processor.load(`= Title

[.foreword]
== Section with role

== Section without role
`);
const sectionWithRoleForeword = docWithSectionsWithAndWithoutRole.getBlocks()[0];
assert(sectionWithRoleForeword.getRole() === 'foreword');
const sectionWithoutRole = docWithSectionsWithAndWithoutRole.getBlocks()[1];
assert(sectionWithoutRole.getRole() === undefined);

const docWithSingleSection = processor.load(`= Title

[.foreword]
== Foreword`);
const sectionWithRole = docWithSingleSection.getBlocks()[0];
assert(sectionWithRole.getRole() === 'foreword');
sectionWithRole.setRole('afterword');
assert(sectionWithRole.getRole() === 'afterword');
sectionWithRole.setRole('afterword last');
assert(sectionWithRole.getRole() === 'afterword last');
sectionWithRole.setRole('lastword', 'closing');
assert(sectionWithRole.getRole() === 'lastword closing');
sectionWithRole.setRole(['finalword', 'conclude']);
assert(sectionWithRole.getRole() === 'finalword conclude');

const docWithImage = processor.load('img::image-name[]', opts);
let images = docWithImage.findBy((b) => b.getContext() === 'image');
assert(images.length === 1);
assert(images[0].getTitle() === 'title');
assert(images[0].getCaption() === 'caption');
images = docWithImage.findBy({context: 'image'});
assert(images.length === 1);
assert(images[0].getTitle() === 'title');
assert(images[0].getCaption() === 'caption');
html = docWithImage.convert(opts);
assert(html === `<div class="imageblock">
<div class="content">
<img src="image-name.png" alt="image name">
</div>
<div class="title">captiontitle</div>
</div>`);

const docWithParagraphs = processor.load(`paragraph 1

====
paragraph 2

term::
+
paragraph 3
====

paragraph 4`);
const result = docWithParagraphs.findBy((candidate) => {
  const ctx = candidate.getContext();
  if (ctx === 'example') {
    return 'reject';
  } else if (ctx === 'paragraph') {
    return true;
  }
});
assert(result.length === 2);
assert(result[0].getContext() === 'paragraph');
assert(result[1].getContext() === 'paragraph');

testRegistry.unregister('test');
html = processor.convert('test::[]', {header_footer: false});
assert(html === `<div class="paragraph">
<p>test::[]</p>
</div>`);

interface Transforms {
  [key: string]: (node: Asciidoctor.AbstractNode) => string;
}

class BlogConverter implements Asciidoctor.AbstractConverter {
  private readonly baseConverter: Asciidoctor.Html5Converter;
  private readonly transforms: Transforms;

  constructor() {
    this.baseConverter = processor.Html5Converter.create();
    this.transforms = {
      document(node) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog</title>
  <link rel="stylesheet" href="./stylesheets/blog.css" />
</head>
<body>
  <section>
    <div class="meta">
      <div class="avatar">by</div>
      <div class="byline">
        <span class="blog-author">${node.getDocument().getAuthor()}</span>
        <time>${node.getDocument().getAttribute('revdate')}</time>
      </div>
    </div>
    <h1 class="blog-title">${(node as Asciidoctor.Document).getDocumentTitle()}</h1>
  </section>
  <section>
    ${(node as Asciidoctor.AbstractBlock).getContent()}
  </section>
</body>`;
      }
    };
  }

  convert(node: Asciidoctor.AbstractNode, transform: string | undefined, opts: any) {
    const template = this.transforms[transform || node.getNodeName()];
    if (template) {
      return template(node);
    }
    return this.baseConverter.convert(node, transform, opts);
  }
}

processor.ConverterFactory.register(new BlogConverter(), ['blog']);
const blogResult = processor.convert(`= One Thing to Write the Perfect Blog Post
Guillaume Grossetie <ggrossetie@yuzutech.fr>

== Write in AsciiDoc!

AsciiDoc is about being able to focus on expressing your ideas, writing with ease and passing on knowledge without the distraction of complex applications or angle brackets.
In other words, it’s about discovering writing zen.`, {safe: 'safe', header_footer: true, backend: 'blog'}) as string;
assert(blogResult.includes('<span class="blog-author">Guillaume Grossetie</span>')); // custom blog converter
assert(blogResult.includes('<div class="sect1">')); // built-in HTML5 converter

const docWithCallouts = processor.load(`
[source,javascript]
----
const asciidoctor = require('@asciidoctor/core')() // <1>
const doc = asciidoctor.load('hello') // <2>

doc.convert() // <3>
----
<1> require @asciidoctor/core
<2> load the document
<3> convert the document`, {safe: 'safe', catalog_assets: true});
docWithCallouts.convert();
const callouts = docWithCallouts.getCallouts();
assert(callouts.getLists()[0].length === 3);
assert(callouts.getLists()[0][0].ordinal === 1);
assert(callouts.getLists()[0][0].id === 'CO1-1');
assert(callouts.getLists()[1].length === 0);
assert(callouts.getListIndex() === 2);
assert(callouts.getCalloutIds(1) === '');
assert(callouts.getCurrentList().length === 0);

let parsedAttrs: Asciidoctor.Attributes = {};
const registryAttrs = processor.Extensions.create();
registryAttrs.block(function() {
  this.named('attrs');
  this.onContext('open');
  this.process(function(parent, reader) {
    parsedAttrs = this.parseAttributes(parent, reader.readLine(), {positional_attributes: ['a', 'b']});
    Object.assign(parsedAttrs, this.parseAttributes(parent, 'foo={foo}', {sub_attributes: true}));
  });
});
processor.convert(`:foo: bar
[attrs]
--
a,b,c,key=val
--
`, {extension_registry: registryAttrs});
assert(parsedAttrs && parsedAttrs['a'] === 'a');
assert(parsedAttrs && parsedAttrs['b'] === 'b');
assert(parsedAttrs && parsedAttrs['key'] === 'val');
assert(parsedAttrs && parsedAttrs['foo'] === 'bar');

const registryWrap = processor.Extensions.create();
registryWrap.block(function() {
  this.named('wrap');
  this.onContext('open');
  this.process(function(parent, reader, attrs) {
    const wrap = this.createOpenBlock(parent, undefined, attrs);
    return this.parseContent(wrap, reader.readLines());
  });
});
const docWithWrap = processor.load(`
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
`, {extension_registry: registryWrap});
assert(docWithWrap.getBlocks().length === 1);
const wrap = docWithWrap.getBlocks()[0];
assert(wrap.getBlocks().length === 2);
assert(Object.keys(wrap.getBlocks()[0].getAttributes()).length === 2);
assert(Object.keys(wrap.getBlocks()[1].getAttributes()).length === 2);
assert(wrap.getBlocks()[1].getAttributes()['foo'] === undefined);

const highlightjsSyntaxHighlighter = processor.SyntaxHighlighter.get('highlight.js');
assert(highlightjsSyntaxHighlighter && highlightjsSyntaxHighlighter.$$name === 'HighlightJsAdapter');
const rougeSyntaxHighlighter = processor.SyntaxHighlighter.get('rouge');
assert(rougeSyntaxHighlighter === undefined);

processor.SyntaxHighlighter.register('unavailable', {
  initialize(name, backend, opts) {
    this.backend = opts.document.getAttribute('backend');
    this.super();
  },
  format(node, language) {
    return `<pre class="highlight"><code class="language-${language}" data-lang="${language}">${node.getContent()}</code></pre>`;
  },
  handlesHighlighting() {
    return false;
  },
  hasDocinfo(location) {
    return location === 'head';
  },
  docinfo(location) {
    if (this.backend !== 'html5') {
      return '';
    }
    if (location === 'head') {
      return '<style>pre.highlight{background-color: lightgrey}</style>';
    }
    return '';
  }
});
const docWithUnavailableSourceHighlighter = processor.load(`[source,ruby]
----
puts 'Hello, World!'
----`, {attributes: {'source-highlighter': 'unavailable'}});
html = docWithUnavailableSourceHighlighter.convert({standalone: true});
assert(html.includes('<pre class="highlight"><code class="language-ruby" data-lang="ruby">puts \'Hello, World!\'</code></pre>'));
assert(html.includes('<style>pre.highlight{background-color: lightgrey}</style>'));

class PrismClientHighlighter {
  private readonly backend: string;

  constructor(name: string, backend: string, opts: any) {
    this.backend = opts.document.getAttribute('backend');
  }

  format(node: Asciidoctor.Block, lang: string, opts: Asciidoctor.SyntaxHighlighterFormatOptions) {
    if (lang) {
      return `<pre${lang ? ` lang="${lang}"` : ''} class="prism${opts.nowrap ? ' nowrap' : ' wrap'}"><code>${node.getContent()}</code></pre>`;
    }
    return `<pre>${node.getContent()}</pre>`;
  }

  hasDocinfo(location: string) {
    return location === 'head';
  }

  docinfo(location: string) {
    if (this.backend !== 'html5') {
      return '';
    }
    if (location === 'head') {
      return '<style>pre.prism{background-color: lightgrey}</style>';
    }
  }
}

processor.SyntaxHighlighter.register('prism', PrismClientHighlighter);
const docWithPrismSyntaxHighlighter = processor.load(`[source,ruby]
----
puts 'Hello, World!'
----

[source]
.options/zones.txt
----
Europe/London
America/New_York
----`, {attributes: {'source-highlighter': 'prism'}});
html = docWithPrismSyntaxHighlighter.convert({standalone: true});
assert(html.includes('<pre lang="ruby" class="prism wrap"><code>puts \'Hello, World!\'</code></pre>'));
assert(html.includes('<pre>Europe/London\nAmerica/New_York</pre>'));
assert(html.includes('<style>pre.prism{background-color: lightgrey}</style>'));

class HtmlPipelineAdapter {
  private readonly defaultClass: string;

  constructor() {
    this.defaultClass = 'prettyprint';
  }

  format(node: Asciidoctor.Block, lang: string) {
    return `<pre${lang ? ` lang="${lang}"` : ''} class="${this.defaultClass}"><code>${node.getContent()}</code></pre>`;
  }
}

processor.SyntaxHighlighter.register('html-pipeline', HtmlPipelineAdapter);
const docWithHtmlPipeline = processor.load(`[source,ruby]
----
puts 'Hello, World!'
----`, {attributes: {'source-highlighter': 'html-pipeline'}});
html = docWithHtmlPipeline.convert();
assert(html.includes('<pre lang="ruby" class="prettyprint"><code>puts \'Hello, World!\'</code></pre>'));

class ServerSideSyntaxHighlighter {
  private readonly defaultClass: string;

  constructor() {
    this.defaultClass = 'prettyprint';
  }

  format(node: Asciidoctor.Block, lang: string) {
    if (lang) {
      return `<pre${lang ? ` lang="${lang}"` : ''} class="${this.defaultClass}"><code>${node.getContent()}</code></pre>`;
    }
    return `<pre>${node.getContent()}</pre>`;
  }

  highlight(node: Asciidoctor.Block, source: string, lang: string, opts: Asciidoctor.SyntaxHighlighterHighlightOptions) {
    if (opts.callouts) {
      const lines = source.split('\n');
      for (const idx in opts.callouts) {
        const lineIndex = parseInt(idx, 0);
        const line = lines[lineIndex];
        lines[lineIndex] = `<span class="has-callout${opts.callouts[idx][0][0] ? ' has-comment' : ''}">${line}</span>`;
      }
      source = lines.join('\n');
    }
    if (lang) {
      return `<span class="has-lang lang-${lang}">${source}</span>`;
    }
    return source;
  }

  handlesHighlighting() {
    return true;
  }

  hasDocinfo() {
    return false;
  }
}

processor.SyntaxHighlighter.register('server-side', ServerSideSyntaxHighlighter);
const docWithServerSideSyntaxHighlighter = processor.load(`[source,ruby]
----
puts 'Hello, World!' # <1>
<2>
----
<1> Prints 'Hello, World!'
<2> ...

[source]
.options/zones.txt
----
Europe/London
America/New_York
----`, {attributes: {'source-highlighter': 'server-side'}});
html = docWithServerSideSyntaxHighlighter.convert();
assert(html.includes(`<pre lang="ruby" class="prettyprint"><code><span class="has-lang lang-ruby"><span class="has-callout has-comment">puts 'Hello, World!' </span># <b class="conum">(1)</b>
<span class="has-callout"></span><b class="conum">(2)</b>
</span></code></pre>`));
assert(html.includes('<pre>Europe/London\nAmerica/New_York</pre>'));

let timings = processor.Timings.create();
processor.convert('Hello *world*', {timings});
timings.printReport();

timings = processor.Timings.create();
let memoryLogger = processor.MemoryLogger.create();
processor.convert('Hello *world*', {timings});
timings.printReport(memoryLogger);
let messages = memoryLogger.getMessages();
assert(messages.length === 3);
assert(messages[0].getSeverity() === 'INFO');

timings = processor.Timings.create();
memoryLogger = processor.MemoryLogger.create();
processor.convert('Hello *world*', {timings});
timings.printReport(memoryLogger, 'stdin');
messages = memoryLogger.getMessages();
assert(messages.length === 4);
assert(messages[0].getSeverity() === 'INFO');
assert(messages[0].getText() === 'Input file: stdin');

const registry = processor.Extensions.create();
registry.block(function() {
  const self = this;
  self.named('plantuml');
  self.onContext(['listing']);
  self.parseContentAs('raw');
  self.process((parent, reader) => {
    const lines = reader.getLines();
    if (lines.length === 0) {
      reader.getLogger().log('warn', reader.createLogMessage('plantuml block is empty', {source_location: reader.getCursor()}));
      reader.getLogger().fatal('game over');
    }
  });
});
memoryLogger = processor.MemoryLogger.create();
try {
  processor.LoggerManager.setLogger(memoryLogger);
  processor.convert(`[plantuml]
----
----`, {extension_registry: registry});
  const warnMessage = memoryLogger.getMessages()[0];
  assert(warnMessage.getSeverity() === 'WARN');
  assert(warnMessage.getText() === 'plantuml block is empty');
  const sourceLocation = warnMessage.getSourceLocation();
  assert(sourceLocation.getLineNumber() === 1);
  assert(sourceLocation.getFile() === undefined);
  assert(sourceLocation.getDirectory() === '.');
  assert(sourceLocation.getPath() === '<stdin>');
  const fatalMessage = memoryLogger.getMessages()[1];
  assert(fatalMessage.getSeverity() === 'FATAL');
  assert(fatalMessage.getText() === 'game over');
} finally {
  processor.LoggerManager.setLogger(defaultLogger);
  defaultLogger.setProgramName('asciidoctor'); // reset
}

const defaultLog = console.log;
try {
  const data: any[] = [];
  console.log = function() {
    data.push({method: 'log', arguments});
    defaultLog.apply(console, arguments as any);
  };
  const timings = processor.Timings.create();
  processor.convert('Hello *world*', {timings});
  timings.printReport(console, 'stdin');
  assert(data.length === 4);
  assert(data[0].arguments[0] === 'Input file: stdin');
} finally {
  console.log = defaultLog;
}
const defaultFormatter = defaultLogger.getFormatter();
const processStderrWriteFunction = process.stderr.write;
let stderrOutput = '';
process.stderr.write = function(chunk: string) {
  stderrOutput += chunk;
  return true;
};
try {
  defaultLogger.setFormatter(processor.LoggerManager.newFormatter('JsonFormatter', {
    call(severity, time, programName, message) {
      const text = (message as Asciidoctor.RubyLoggerMessage).text;
      const sourceLocation = (message as Asciidoctor.RubyLoggerMessage).source_location;
      return JSON.stringify({
        programName,
        message: text,
        sourceLocation: {
          lineNumber: sourceLocation.getLineNumber(),
          path: sourceLocation.getPath()
        },
        severity
      }) + '\n';
    }
  }));
  processor.convert(`= Book
:doctype: book

= Part 1

[partintro]
intro
`);
  assert(stderrOutput === '{"programName":"asciidoctor",' +
    '"message":"invalid part, must have at least one section (e.g., chapter, appendix, etc.)",' +
    '"sourceLocation":{"lineNumber":8,"path":"<stdin>"},' +
    '"severity":"ERROR"}\n');
  assert(JSON.parse(stderrOutput).message === 'invalid part, must have at least one section (e.g., chapter, appendix, etc.)');
} finally {
  defaultLogger.setFormatter(defaultFormatter);
  process.stderr.write = processStderrWriteFunction;
}

const nullLogger = processor.NullLogger.create();
const stderrWriteFunction = process.stderr.write;
stderrOutput = '';
process.stderr.write = function(chunk: string) {
  stderrOutput += chunk;
  return true;
};
try {
  processor.LoggerManager.setLogger(nullLogger);
  processor.convert(`= Book
:doctype: book

= Part 1

[partintro]
intro
`);
  assert(nullLogger.getMaxSeverity() === 3);
  assert(stderrOutput === '');
} finally {
  process.stderr.write = stderrWriteFunction;
  processor.LoggerManager.setLogger(defaultLogger);
}

const logs: any[] = [];
const customLogger = processor.LoggerManager.newLogger('CustomLogger', {
  add(severity, message, progname) {
    logs.push({severity, message: message || progname, progname});
  }
});
customLogger.error('hello');
customLogger.add('warn', 'hi', 'asciidoctor.js');
const errorMessage = logs[0];
assert(errorMessage.severity === 3);
assert(errorMessage.message === 'hello');
const warnMessage = logs[1];
assert(warnMessage.severity === 2);
assert(warnMessage.message === 'hi');
assert(warnMessage.progname === 'asciidoctor.js');

function isError(error: any): error is NodeJS.ErrnoException {
    return error instanceof Error;
}

function truncateFile(path: string) {
  try {
    fs.truncateSync(path, 0); // file must be empty
  } catch (err) {
    if (isError(err) && err.code === 'ENOENT') {
      // it's OK, if the file does not exists
    }
  }
}

(async () => {
  const logFile = ospath.join(__dirname, '..', 'build', 'async.log');
  const asyncLogger = processor.LoggerManager.newLogger('AsyncFileLogger', {
    postConstruct() {
      this.writer = fs.createWriteStream(logFile, {
        flags: 'a'
      });
      truncateFile(logFile);
    },
    add(severity, _, message) {
      const log = this.formatter.call(severity, new Date(), this.progname, message);
      this.writer.write(log);
    }
  });
  try {
    processor.LoggerManager.setLogger(asyncLogger);
    processor.convert(`= Book
:doctype: book

= Part 1

[partintro]
intro
`);
    await new Promise((resolve, _) => {
      asyncLogger.writer.end(() => {
        const content = fs.readFileSync(logFile, 'utf8');
        assert(content === 'asciidoctor: ERROR: <stdin>: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)\n');
        resolve({});
      });
    });
  } finally {
    processor.LoggerManager.setLogger(defaultLogger);
  }
})();

const options = { attributes: 'sectnums' };
const docWithOptions = processor.load('== Test', options);
assert(docWithOptions.getAttribute('sectnums') === '');
assert(docWithOptions.isAttribute('sectnums'));
assert(docWithOptions.isAttribute('sectnums', ''));
assert(!docWithOptions.isAttribute('sectnums', 'not this'));
assert(!docWithOptions.isAttribute('foo'));
assert(!docWithOptions.isAttribute('foo', ''));
assert(!docWithOptions.isAttribute('foo', 'bar'));

const docWithAttributeOverride = processor.load(`= Title
:next-section:

This is a preamble!

:next-section: First section

== First section

:next-section: Second section

== Second section
`);
assert(docWithAttributeOverride.getAttribute('next-section') === '');
docWithAttributeOverride.playbackAttributes(docWithAttributeOverride.getBlocks()[1].getAttributes());
assert(docWithAttributeOverride.getAttribute('next-section') === 'First section');
docWithAttributeOverride.playbackAttributes({
  attribute_entries: [{
    name: 'next-section',
    value: 'Third section',
    negate: false
  }]
});
assert(docWithAttributeOverride.getAttribute('next-section') === 'Third section');

const docWithAttributes = processor.load(`= Document Title
:foo: bar

content

:foo: baz

content`);
assert(docWithAttributes.getAttribute('foo') === 'bar');
docWithAttributes.convert();
assert(docWithAttributes.getAttribute('foo') === 'baz');
docWithAttributes.restoreAttributes();
assert(docWithAttributes.getAttribute('foo') === 'bar');

const emptyDoc = processor.load('== Test', {
  attributes: {
    mediasdir: 'media',
    imagesdir: 'img',
    photosdir: 'photo',
    iconsdir: 'icon'
  }
});
assert(emptyDoc.getMediaUri('poney.mp4') === 'img/poney.mp4');
assert(emptyDoc.getMediaUri('poney.mp4', 'mediasdir') === 'media/poney.mp4');
assert(emptyDoc.getImageUri('whale.jpg') === 'img/whale.jpg');
assert(emptyDoc.getImageUri('whale.jpg', 'photosdir') === 'photo/whale.jpg');
assert(emptyDoc.getIconUri('note') === 'icon/note.png');

const docWithTable = processor.load(`
[%header%footer]
|===
|This is a header cell

|This is a normal cell

|This is a footer cell
|===`);
const table = docWithTable.getBlocks()[0];
assert(table.getContext() === 'table');
const rowsBySection = table.getRows().bySection();
assert(table.getContext() === 'table');
assert(rowsBySection[0][0] === 'head');
assert(rowsBySection[0][1][0][0].getText() === 'This is a header cell');
assert(rowsBySection[1][0] === 'body');
assert(rowsBySection[2][0] === 'foot');

const docWithParagraph = processor.load(`paragraph`);
const paragraphBlock = docWithParagraph.getBlocks()[0];
assert(paragraphBlock.resolveSubstitutions('attributes+', 'block')[0] === 'attributes');
const blockSubs1 = paragraphBlock.resolveBlockSubstitutions('specialchars,attributes,quotes,replacements,macros,post_replacements', 'block');
assert(blockSubs1.length === 6);
assert(blockSubs1[0] === 'specialcharacters');
assert(blockSubs1[1] === 'attributes');
assert(blockSubs1[2] === 'quotes');
assert(blockSubs1[3] === 'replacements');
assert(blockSubs1[4] === 'macros');
assert(blockSubs1[5] === 'post_replacements');
const blockSubs2 = paragraphBlock.resolveBlockSubstitutions('attributes+,+replacements,-callouts', ['verbatim', 'quotes', 'callouts']);
assert(blockSubs2.length === 4);
assert(blockSubs2[0] === 'attributes');
assert(blockSubs2[1] === 'verbatim');
assert(blockSubs2[2] === 'quotes');
assert(blockSubs2[3] === 'replacements');
const blockSubs3 = paragraphBlock.resolveBlockSubstitutions('normal');
assert(blockSubs3.length === 6);
assert(blockSubs3[0] === 'specialcharacters');
assert(blockSubs3[1] === 'quotes');
assert(blockSubs3[2] === 'attributes');
assert(blockSubs3[3] === 'replacements');
assert(blockSubs3[4] === 'macros');
assert(blockSubs3[5] === 'post_replacements');
const blockSubs4 = paragraphBlock.resolvePassSubstitutions('macros');
assert(blockSubs4.length === 1);
assert(blockSubs4[0] === 'macros');
const blockSubs5 = paragraphBlock.resolvePassSubstitutions('verbatim');
assert(blockSubs5.length === 1);
assert(blockSubs5[0] === 'specialcharacters');

const docWithImages = processor.load(`
[#img-sunset]
[caption="Figure 1: ",link=https://www.flickr.com/photos/javh/5448336655]
image::sunset.jpg[*Sunset & Sunside*,300,200]

image::https://asciidoctor.org/images/octocat.jpg[GitHub mascot]

image::noop.png[alt=]

image::tigers.svg[]`);
const imageBlocks = docWithImages.findBy((b) => b.getNodeName() === 'image');
assert(imageBlocks.length === 4);
assert(imageBlocks[0].getAlt() === '*Sunset &amp; Sunside*');
assert(imageBlocks[1].getAlt() === 'GitHub mascot');
assert(imageBlocks[2].getAlt() === '');
assert(imageBlocks[3].getAlt() === 'tigers');

let converterRegistry = processor.ConverterFactory.getRegistry();
assert(typeof converterRegistry.html5 === 'function');

class BlankConverter implements Asciidoctor.AbstractConverter {
  convert() {
    return '';
  }
}

const BlankConstructor = BlankConverter as Asciidoctor.ConverterConstructor;
processor.ConverterFactory.register(BlankConstructor, ['blank']);
converterRegistry = processor.ConverterFactory.getRegistry();
assert(typeof converterRegistry.html5 === 'function');
assert(typeof converterRegistry.blank === 'function');
assert(typeof processor.ConverterFactory.for('html5') === 'function');
assert(typeof processor.ConverterFactory.for('blank') === 'function');
assert(typeof processor.ConverterFactory.for('foo') === 'undefined');

processor.ConverterFactory.register(new BlankConverter(), ['blank']);
converterRegistry = processor.ConverterFactory.getRegistry();
assert(typeof converterRegistry.html5 === 'function');
assert(typeof converterRegistry.blank === 'object');
assert(typeof processor.ConverterFactory.for('html5') === 'function');
assert(typeof processor.ConverterFactory.for('blank') === 'object');
assert(typeof processor.ConverterFactory.for('foo') === 'undefined');
const html5Converter = (converterRegistry.html5 as typeof Asciidoctor.Html5Converter).create();
assert(html5Converter.convert(processor.Block.create(doc, 'paragraph')) === `<div class="paragraph">
<p></p>
</div>`);
// tslint:disable-next-line:no-unnecessary-type-assertion
assert((converterRegistry.blank as Asciidoctor.Converter).convert(processor.Block.create(doc, 'paragraph')) === '');

// Inner document in AsciiDoc cell
const docWithAsciiDocCell = processor.load(`
= Table

[%header,cols=1]
|===
|Header

|Normal cell
a|
:foo: foo
AsciiDoc cell
|===`);
const tableWithAsciiDocCell = docWithAsciiDocCell.findBy({context: 'table'})[0] as Asciidoctor.Table;
const normalCell = tableWithAsciiDocCell.getBodyRows()[0][0];
const asciidocCell = tableWithAsciiDocCell.getBodyRows()[1][0];
assert(typeof normalCell.getInnerDocument() === 'undefined');
assert(asciidocCell.getInnerDocument()!.getAttributes().foo === 'foo');
assert(typeof asciidocCell.getInnerDocument()!.getParentDocument()!.getAttributes().foo === 'undefined');
assert(asciidocCell.getInnerDocument()!.getParentDocument()!.getDocumentTitle() === 'Table');

class DotTemplateEngineAdapter implements Asciidoctor.TemplateEngine.Adapter {
  private readonly doT: any;

  constructor() {
    this.doT = require('dot');
  }

  compile(file: string) {
    const templateFn = this.doT.template(fs.readFileSync(file, 'utf8'));
    return {
      render: templateFn
    };
  }
}

processor.TemplateEngine.register('dot', new DotTemplateEngineAdapter());
const htmlUsingDotTemplate = processor.convert('content', {safe: 'safe', backend: 'html5', template_dir: 'spec/fixtures/templates/dot', template_engine: 'dot'});
assert(htmlUsingDotTemplate === '<p class="paragraph-dot">content</p>');

// templates
processor.TemplateConverter.clearCache(); // since the cache is global, we are using "clearCache" to make sure that other tests won't affect the result
const docWithTemplateConverter = processor.load('content', {safe: 'safe', backend: '-', template_dir: 'spec/fixtures/templates/nunjucks'});
const cache = processor.TemplateConverter.getCache();
const templatesPattern = ospath.resolve(`${__dirname}/../spec/fixtures/templates/nunjucks/*`).replace(/\\/g, '/');
assert(cache.scans && cache.scans[templatesPattern].paragraph.tmplStr.trim() === '<p class="paragraph-nunjucks">{{ node.getContent() }}</p>');
const templateFilePath = ospath.resolve(`${__dirname}/../spec/fixtures/templates/nunjucks/paragraph.njk`).replace(/\\/g, '/');
assert(cache.templates && cache.templates[templateFilePath].tmplStr.trim() === '<p class="paragraph-nunjucks">{{ node.getContent() }}</p>');

// handle a given node
const templateConverter = docWithTemplateConverter.getConverter() as Asciidoctor.TemplateConverter;
assert(templateConverter.handles('paragraph'));
assert(!templateConverter.handles('admonition'));

// convert a given node
const paragraph = processor.Block.create(doc, 'paragraph', {source: 'This is a <test>'});
assert(templateConverter.convert(paragraph, 'paragraph') === '<p class="paragraph-nunjucks">This is a &lt;test&gt;</p>');

// get templates
let templates = templateConverter.getTemplates();
assert(templates.paragraph.tmplStr.trim() === '<p class="paragraph-nunjucks">{{ node.getContent() }}</p>');
assert(typeof templates.admonition === 'undefined');

// render the "default" template
const defaultParagraphResult = templates.paragraph.render({node: paragraph}).trim();
assert(defaultParagraphResult === '<p class="paragraph-nunjucks">This is a &lt;test&gt;</p>');

// replace an existing template (paragraph)
const paragraphTemplate = nunjucks.compile('<p class="paragraph nunjucks new">{{ node.getContent() }}</p>');
templateConverter.register('paragraph', paragraphTemplate);
templates = templateConverter.getTemplates();
const newParagraphResult = templates.paragraph.render({node: paragraph}).trim();
assert(newParagraphResult === '<p class="paragraph nunjucks new">This is a &lt;test&gt;</p>');

// register a new template (admonition)
const admonitionTemplate = nunjucks.compile(`<article class="message is-info">
  <div class="message-header">
    <p>{{ node.getAttribute('textlabel') }}</p>
  </div>
  <div class="message-body">
    {{ node.getContent() }}
  </div>
</article>`);
templateConverter.register('admonition', admonitionTemplate);
templates = templateConverter.getTemplates();
const admonition = processor.Block.create(doc, 'admonition', {source: 'An admonition paragraph, like this note, grabs the reader’s attention.', attributes: {textlabel: 'Note'}});
assert(templates.admonition.render({node: admonition}) === `<article class="message is-info">
  <div class="message-header">
    <p>Note</p>
  </div>
  <div class="message-body">
    An admonition paragraph, like this note, grabs the reader’s attention.
  </div>
</article>`);
