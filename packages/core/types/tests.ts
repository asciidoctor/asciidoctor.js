// use module-alias to resolve @asciidoctor/core
// see: https://github.com/microsoft/TypeScript/issues/10866
import 'module-alias/register';
import asciidoctor, { Asciidoctor } from '@asciidoctor/core';
import { strict as assert } from 'assert';
import * as ospath from 'path';
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
});

const PackageInlineMacro = processor.Extensions.createInlineMacroProcessor('PackageInlineMacro', {
  initialize(name, config) {
    this.DEFAULT_PACKAGE_URL_FORMAT = 'https://apps.fedoraproject.org/packages/%s';
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
const inlineMacroProcessorInstance = PackageInlineMacro.$new('package', {});
assert(inlineMacroProcessorInstance.getName() === 'package');
testRegistry.inlineMacro(inlineMacroProcessorInstance);
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
class BlogConverter {
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

  convert(node: Asciidoctor.AbstractNode, transform: string|null, opts: any) {
    const template = this.transforms[transform || node.getNodeName()];
    if (template) {
      return template(node);
    }
    return this.baseConverter.convert(node, transform, opts);
  }
}

processor.ConverterFactory.register(new BlogConverter(), ['html5']);
const blogResult = processor.convert(`= One Thing to Write the Perfect Blog Post
Guillaume Grossetie <ggrossetie@yuzutech.fr>

== Write in AsciiDoc!

AsciiDoc is about being able to focus on expressing your ideas, writing with ease and passing on knowledge without the distraction of complex applications or angle brackets.
In other words, it’s about discovering writing zen.`, { safe: 'safe', header_footer: true }) as string;
assert(blogResult.includes('<span class="blog-author">Guillaume Grossetie</span>')); // custom blog converter
assert(blogResult.includes('<div class="sect1">')); // built-in HTML5 converter
