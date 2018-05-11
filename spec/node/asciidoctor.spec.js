/* eslint-env node, es6 */
const path = require('path');
const fs = require('fs');
const process = require('process');
const shareSpec = require('../share/asciidoctor.spec.js');
const includeHttpsSpec = require('../share/asciidoctor-include-https.spec');
const config = {
  runtime: {
    platform: 'node',
    engine: 'v12',
    framework: 'lollipop'
  }
};
const asciidoctor = require('../../build/asciidoctor-node.js')(config);

const Opal = require('opal-runtime').Opal; // for testing purpose only
require('asciidoctor-docbook.js')();
require('asciidoctor-reveal.js');
const packageJson = require('../../package.json');

const testOptions = {
  platform: 'Node.js',
  baseDir: path.join(__dirname, '..', '..')
};

shareSpec(testOptions, asciidoctor);
includeHttpsSpec(testOptions, asciidoctor);

function fileExists (path) {
  try {
    fs.statSync(path);
    return true;
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}

function removeFile (path) {
  if (fileExists(path)) {
    fs.unlinkSync(path);
  }
}

const resolveFixture = (name) => {
  return path.resolve(path.join(__dirname, '..', 'fixtures', name));
};

describe('Node.js', () => {

  describe('Asciidoctor.js API', () => {
    it('should return Asciidoctor.js version', () => {
      expect(asciidoctor.getVersion()).toBe(packageJson.version);
    });
  });

  if (asciidoctor.LoggerManager) {
    describe('Logger', () => {
      it('should warn if part has no sections', () => {
        const input = `= Book
:doctype: book

= Part 1

[partintro]
intro
`;
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        const memoryLogger = asciidoctor.MemoryLogger.$new();
        try {
          asciidoctor.LoggerManager.setLogger(memoryLogger);
          asciidoctor.convert(input);
          const errorMessage = memoryLogger.getMessages()[0];
          expect(errorMessage.severity.toString()).toBe('ERROR');
          expect(errorMessage.message['text']).toBe('invalid part, must have at least one section (e.g., chapter, appendix, etc.)');
          const sourceLocation = errorMessage.message['source_location'];
          expect(sourceLocation.getLineNumber()).toBe(8);
          expect(sourceLocation.getFile()).toBeUndefined();
          expect(sourceLocation.getDirectory()).toBe(process.cwd());
          expect(sourceLocation.getPath()).toBe('<stdin>');
        } finally {
          asciidoctor.LoggerManager.setLogger(defaultLogger);
        }
      });
    });
  }

  describe('Configuring Asciidoctor module', () => {
    it('should be able to configure Asciidoctor module', () => {
      expect(Opal.JAVASCRIPT_IO_MODULE).toBe('node');
      expect(Opal.JAVASCRIPT_PLATFORM).toBe('node');
      expect(Opal.JAVASCRIPT_ENGINE).toBe('v12');
      expect(Opal.JAVASCRIPT_FRAMEWORK).toBe('lollipop');
    });
  });

  describe('Loading document', () => {
    it('should get the base directory', () => {
      const doc = asciidoctor.load('== Test');
      expect(doc.getBaseDir()).toBe(process.cwd());
    });
  });

  describe('Loading file', () => {
    it('should be able to load a file', () => {
      const doc = asciidoctor.loadFile(resolveFixture('test.adoc'));
      expect(doc.getAttribute('docname')).toBe('test');
    });

    it('should be able to load a buffer', () => {
      const doc = asciidoctor.load(fs.readFileSync(resolveFixture('test.adoc')));
      expect(doc.getDoctitle()).toBe('Document title');
    });

    it('should return empty document title if not specified', () => {
      const doc = asciidoctor.load('paragraph');
      expect(doc.getDocumentTitle()).toBe(undefined);
      expect(doc.getTitle()).toBe(undefined);
    });

    it('should return empty revision info', () => {
      const doc = asciidoctor.load('= Begin Again\n\n== First section');
      expect(doc.getRevisionDate()).toBe(undefined);
      expect(doc.getRevisionNumber()).toBe(undefined);
      expect(doc.getRevisionRemark()).toBe(undefined);

      expect(doc.hasRevisionInfo()).toBe(false);
      const revisionInfo = doc.getRevisionInfo();
      expect(revisionInfo.isEmpty()).toBe(true);
      expect(revisionInfo.getDate()).toBe(undefined);
      expect(revisionInfo.getNumber()).toBe(undefined);
      expect(revisionInfo.getRemark()).toBe(undefined);
      expect(revisionInfo.date).toBe(undefined);
      expect(revisionInfo.number).toBe(undefined);
      expect(revisionInfo.remark).toBe(undefined);
    });

    it('should be able to retrieve structural content from file', () => {
      const doc = asciidoctor.loadFile(resolveFixture('documentblocks.adoc'));
      expect(doc.getDocumentTitle()).toBe('Sample Document');
      const header = doc.getHeader();
      expect(header.level).toBe(0);
      expect(header.title).toBe('Sample Document');
      expect(header.getAttribute('revdate')).toBe('2013-05-20');
      expect(header.getAttribute('revnumber')).toBe('1.0');
      expect(header.getAttribute('revremark')).toBe('First draft');

      expect(doc.getRevisionDate()).toBe('2013-05-20');
      expect(doc.getRevisionNumber()).toBe('1.0');
      expect(doc.getRevisionRemark()).toBe('First draft');

      expect(doc.hasRevisionInfo()).toBe(true);
      const revisionInfo = doc.getRevisionInfo();
      expect(revisionInfo.isEmpty()).toBe(false);
      expect(revisionInfo.getDate()).toBe('2013-05-20');
      expect(revisionInfo.getNumber()).toBe('1.0');
      expect(revisionInfo.getRemark()).toBe('First draft');
      expect(revisionInfo.date).toBe('2013-05-20');
      expect(revisionInfo.number).toBe('1.0');
      expect(revisionInfo.remark).toBe('First draft');

      expect(header.getAttribute('tags')).toBe('[document, example]');
      expect(header.getAttribute('author')).toBe('Doc Writer');
      expect(header.getAttribute('email')).toBe('doc.writer@asciidoc.org');

      const blocks = doc.getBlocks();
      expect(blocks.length).toBe(4);
      expect(blocks[0].getContext()).toBe('section');
      expect(blocks[0].getTitle()).toBe('Abstract');
      expect(blocks[0].getCaptionedTitle()).toBe('Abstract');
      expect(blocks[0].getBlocks().length).toBe(1);
      expect(blocks[0].getBlocks()[0].getStyle()).toBe('abstract');
      expect(blocks[0].getBlocks()[0].getContext()).toBe('open');

      expect(blocks[1].getTitle()).toBe('First Section');
      expect(blocks[1].getId()).toBe('_first_section');
      expect(blocks[1].getContext()).toBe('section');
      expect(blocks[1].getBlocks().length).toBe(5);

      expect(blocks[1].getBlocks()[1].getId()).toBe('blockid');
      expect(blocks[1].getBlocks()[1].getStyle()).toBe('quote');
      expect(blocks[1].getBlocks()[1].getAttribute('attribution')).toBe('Abraham Lincoln');
      expect(blocks[1].getBlocks()[1].getSourceLines()).toEqual(['This is a quote.', 'It has a title, id, and attribution.']);
      expect(blocks[1].getBlocks()[1].getSource()).toBe('This is a quote.\nIt has a title, id, and attribution.');

      expect(blocks[1].getBlocks()[2].getContext()).toBe('ulist');
      expect(blocks[1].getBlocks()[2].getRole()).toBe('feature-list');
      expect(blocks[1].getBlocks()[2].getItems().length).toBe(4);
      expect(blocks[1].getBlocks()[2].getItems()[0].getText()).toBe('<em>lightweight</em>');

      expect(blocks[2].getTitle()).toBe('Second Section');
      expect(blocks[2].getBlocks().length).toBe(3);

      expect(blocks[2].getBlocks()[0].getContext()).toBe('image');
      expect(blocks[2].getBlocks()[0].getTitle()).toBe(undefined);
      expect(blocks[2].getBlocks()[1].getContext()).toBe('image');

      expect(blocks[3].getTitle()).toBe('Got <span class="icon">[file pdf o]</span>?');
    });

    it('should be able to find blocks', () => {
      const doc = asciidoctor.loadFile(resolveFixture('documentblocks.adoc'));
      const quoteBlocks = doc.findBy((b) => b.getStyle() === 'quote');
      expect(quoteBlocks.length).toBe(1);

      const sectionBlocks = doc.findBy({'context': 'section'});
      expect(sectionBlocks.length).toBe(5);

      const abstractSectionBlocks = doc.findBy({'context': 'section'}, (b) => b.getTitle() === 'Second Section');
      expect(abstractSectionBlocks.length).toBe(1);
    });

    it('should be able to find blocks with line number', () => {
      const doc = asciidoctor.loadFile(resolveFixture('documentblocks.adoc'), {sourcemap: true});
      const blocks = doc.findBy(() => true);
      expect(blocks.length).toBe(26);

      const blocksWithLineNumber = doc.findBy((b) => typeof b.getLineNumber() !== 'undefined');
      // since https://github.com/asciidoctor/asciidoctor/commit/46700a9c12d1cfe551db2790dd232baa0bec8195
      // When the sourcemap option is specified, the source location (and as a consequence the line number) is defined on the Document object.
      expect(blocksWithLineNumber.length >= 18).toBe(true);
    });
  });

  describe('Converting file', () => {
    it('should be able to convert a file', () => {
      const expectFilePath = resolveFixture('test.html');
      removeFile(expectFilePath);
      try {
        asciidoctor.convertFile(resolveFixture('test.adoc'));
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css', () => {
      const expectFilePath = resolveFixture('test.html');
      removeFile(expectFilePath);
      try {
        const options = {attributes: ['stylesheet=simple.css', 'stylesdir=fixtures/css']};
        asciidoctor.convertFile(resolveFixture('test.adoc'), options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('fixtures/css/simple.css');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css embedded', () => {
      const expectFilePath = resolveFixture('test.html');
      removeFile(expectFilePath);
      try {
        const options = {safe: 'server', attributes: ['stylesheet=simple.css', 'stylesdir=css']};
        asciidoctor.convertFile(resolveFixture('test.adoc'), options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('h1 { color: #4078c0; }');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir', () => {
      const expectFilePath = path.resolve(path.join(__dirname, '..', 'fixtures', 'target', 'test.html'));
      removeFile(expectFilePath);
      try {
        const options = {to_dir: './spec/fixtures/target'};
        asciidoctor.convertFile(resolveFixture('test.adoc'), options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir and to_file', () => {
      const expectFilePath = path.resolve(path.join(__dirname, '..', 'fixtures', 'target', 'output.html'));
      removeFile(expectFilePath);
      try {
        const options = {to_dir: './spec/fixtures/target', to_file: 'output.html'};
        asciidoctor.convertFile(resolveFixture('test.adoc'), options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to use a custom backend', () => {
      const options = {safe: 'safe', 'header_footer': true, attributes: {revealjsdir: 'node_modules/reveal.js@'}};
      const content = `= Title
:backend: revealjs

== Slide 1
Content 1

== Slide 2
Content 2`;
      const result = asciidoctor.convert(content, options);
      expect(result).toContain('<section id="slide_1"');
      expect(result).toContain('<section id="slide_2"');
      expect(result).toContain('<script src="node_modules/reveal.js/js/reveal.js">');
    });

    it('should be able to process smiley extension', () => {
      try {
        require('../share/extensions/smiley-inline-macro.js');
        const result = asciidoctor.convert(fs.readFileSync(resolveFixture('smiley-inline-macro-ex.adoc')));
        expect(result).toContain('<strong>:D</strong>');
        expect(result).toContain('<strong>;)</strong>');
        expect(result).toContain('<strong>:)</strong>');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process love tree processor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {extension_registry: registry};
      require('../share/extensions/love-tree-processor.js')(registry);
      const resultWithExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('love-tree-processor-ex.adoc')), opts);
      expect(resultWithExtension).toContain('Made with icon:heart[]');

      const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('love-tree-processor-ex.adoc')));
      expect(resultWithoutExtension).toContain('How this document was made ?');
    });

    it('should be able to process foo bar postprocessor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {extension_registry: registry};
      require('../share/extensions/foo-bar-postprocessor.js')(registry);
      const resultWithExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('foo-bar-postprocessor-ex.adoc')), opts);
      expect(resultWithExtension).toContain('bar, qux, bar.');
      expect(resultWithExtension).not.toContain('foo');

      const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('foo-bar-postprocessor-ex.adoc')));
      expect(resultWithoutExtension).toContain('foo, qux, foo.');
      expect(resultWithoutExtension).not.toContain('bar');
    });

    it('should be able to process custom block', () => {
      try {
        require('../share/extensions/shout-block.js');
        const result = asciidoctor.convert(fs.readFileSync(resolveFixture('shout-block-ex.adoc')));
        expect(result).toContain('<p>SAY IT LOUD.\nSAY IT PROUD.</p>');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process custom block on multiple contexts', () => {
      try {
        asciidoctor.Extensions.register(function () {
          this.block(function () {
            this.named('cloak');
            this.onContexts('paragraph', 'literal');
            this.process((parent, reader, attrs) => {
              return this.createBlock(parent, 'paragraph', 'cloaked: ' + attrs['cloaked-context']);
            });
          });
        });
        const result = asciidoctor.convert('[cloak]\nparagraph\n\n[cloak]\n....\nliteral\n....');
        expect(result).toContain('<p>cloaked: paragraph</p>');
        expect(result).toContain('<p>cloaked: literal</p>');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process custom include processor when target does match', () => {
      try {
        require('../share/extensions/foo-include.js');
        const result = asciidoctor.convert(fs.readFileSync(resolveFixture('foo-include-ex.adoc')));
        expect(result).toContain('foo\nfoo');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should not process custom include processor when target does not match', () => {
      const result = asciidoctor.convert(fs.readFileSync(resolveFixture('bar-include-ex.adoc')));
      expect(result).toContain('bar');
    });

    it('should be able to register an include processor class', () => {
      try {
        const LoremIncludeProcessor = require('../share/extensions/include-processor-class.js');
        asciidoctor.Extensions.register(function () {
          this.includeProcessor(LoremIncludeProcessor);
        });
        const html = asciidoctor.convert('include::fake.adoc[]', {safe: 'safe'});
        expect(html).toContain('Lorem ipsum');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process lorem extension', () => {
      try {
        require('../share/extensions/lorem-block-macro.js');
        const result = asciidoctor.convert(fs.readFileSync(resolveFixture('lorem-block-macro-ex.adoc')));
        expect(result).toContain('Lorem ipsum dolor sit amet');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should return empty hash of groups if no extensions are registered', () => {
      const groups = asciidoctor.Extensions.getGroups();
      expect(groups).toBeDefined();
      expect(Object.keys(groups).length).toBe(0);
    });

    it('should not fail to unregister extension groups if no extensions are defined', () => {
      asciidoctor.Extensions.unregister('no-such-group');
    });

    it('should be able to unregister a single statically-registered extension group', () => {
      var extensions = asciidoctor.Extensions;
      try {
        extensions.register('test', function () {
          this.blockMacro(function () {
            this.named('test');
            this.process((parent) => {
              return this.createBlock(parent, 'paragraph', 'this was only a test');
            });
          });
        });
        const groups = extensions.getGroups();
        expect(groups).toBeDefined();
        expect(Object.keys(groups).length).toBe(1);
        expect('test' in groups).toBe(true);
        let html = asciidoctor.convert('test::[]');
        expect(html).toContain('<p>this was only a test</p>');
        extensions.unregister('test');
        html = asciidoctor.convert('test::[]');
        expect(html).toContain('test::[]');
        expect(html).not.toContain('<p>this was only a test</p>');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to unregister multiple statically-registered extension groups', () => {
      var extensions = asciidoctor.Extensions;
      try {
        extensions.register('test', function () {
          this.blockMacro(function () {
            this.named('test');
            this.process((parent) => {
              return this.createBlock(parent, 'paragraph', 'this was only a test');
            });
          });
        });
        extensions.register('foo', function () {
          this.blockMacro(function () {
            this.named('foo');
            this.process((parent) => {
              return this.createBlock(parent, 'paragraph', 'foo means foo');
            });
          });
        });
        extensions.register('bar', function () {
          this.blockMacro(function () {
            this.named('bar');
            this.process((parent) => {
              return this.createBlock(parent, 'paragraph', 'bar or bust');
            });
          });
        });
        let groups = extensions.getGroups();
        expect(groups).toBeDefined();
        expect(Object.keys(groups).length).toBe(3);
        expect(Object.keys(groups)).toEqual(['test', 'foo', 'bar']);
        let html = asciidoctor.convert('test::[]\n\nfoo::[]\n\nbar::[]');
        expect(html).toContain('<p>this was only a test</p>');
        expect(html).toContain('<p>foo means foo</p>');
        expect(html).toContain('<p>bar or bust</p>');
        extensions.unregister('foo', 'bar');
        groups = extensions.getGroups();
        expect(groups).toBeDefined();
        expect(Object.keys(groups).length).toBe(1);
        html = asciidoctor.convert('test::[]\n\nfoo::[]\n\nbar::[]');
        expect(html).toContain('<p>this was only a test</p>');
        expect(html).toContain('foo::[]');
        expect(html).toContain('bar::[]');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to unregister multiple statically-registered extension groups as Array', () => {
      var extensions = asciidoctor.Extensions;
      try {
        extensions.register('foo', function () {
          this.blockMacro(function () {
            this.named('foo');
            this.process((parent) => {
              return this.createBlock(parent, 'paragraph', 'foo means foo');
            });
          });
        });
        extensions.register('bar', function () {
          this.blockMacro(function () {
            this.named('bar');
            this.process((parent) => {
              return this.createBlock(parent, 'paragraph', 'bar or bust');
            });
          });
        });
        let groups = extensions.getGroups();
        expect(groups).toBeDefined();
        expect(Object.keys(groups).length).toBe(2);
        expect(Object.keys(groups)).toEqual(['foo', 'bar']);
        extensions.unregister(['foo', 'bar']);
        groups = extensions.getGroups();
        expect(groups).toBeDefined();
        expect(Object.keys(groups).length).toBe(0);
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to unregister a single extension group from a custom registry', () => {
      var registry = asciidoctor.Extensions.create('test', function () {
        this.blockMacro(function () {
          this.named('test');
          this.process((parent) => {
            return this.createBlock(parent, 'paragraph', 'this was only a test');
          });
        });
      });
      const groups = registry.getGroups();
      expect(groups).toBeDefined();
      expect('test' in groups).toBe(true);
      const opts = {extension_registry: registry};
      let html = asciidoctor.convert('test::[]', opts);
      expect(html).toContain('<p>this was only a test</p>');
      registry.unregister('test');
      html = asciidoctor.convert('test::[]');
      expect(html).toContain('test::[]');
      expect(html).not.toContain('<p>this was only a test</p>');
    });

    it('should be able to unregister all extension groups from a custom registry', () => {
      var registry = asciidoctor.Extensions.create('test', function () {
        this.blockMacro(function () {
          this.named('test');
          this.process((parent) => {
            return this.createBlock(parent, 'paragraph', 'this was only a test');
          });
        });
      });
      const groups = registry.getGroups();
      expect(groups).toBeDefined();
      expect('test' in groups).toBe(true);
      const opts = {extension_registry: registry};
      let html = asciidoctor.convert('test::[]', opts);
      expect(html).toContain('<p>this was only a test</p>');
      registry.unregisterAll();
      html = asciidoctor.convert('test::[]');
      expect(html).toContain('test::[]');
      expect(html).not.toContain('<p>this was only a test</p>');
    });

    it('should be able to process draft preprocessor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {extension_registry: registry};
      require('../share/extensions/draft-preprocessor.js')(registry);
      const doc = asciidoctor.load(fs.readFileSync(resolveFixture('draft-preprocessor-ex.adoc')), opts);
      expect(doc.getAttribute('status')).toBe('DRAFT');
      const result = doc.convert();
      expect(result).toContain('Important');
      expect(result).toContain('This section is a draft: we need to talk about Y.');
    });

    it('should be able to process moar footer docinfo processor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {safe: 'server', header_footer: true, extension_registry: registry};
      require('../share/extensions/moar-footer-docinfo-processor.js')(registry);
      const resultWithExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('moar-footer-docinfo-processor-ex.adoc')), opts);
      expect(resultWithExtension).toContain('moar footer');

      const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('moar-footer-docinfo-processor-ex.adoc')));
      expect(resultWithoutExtension).not.toContain('moar footer');
    });

    it('should be able to pass an extension registry to the processor', () => {
      const registry = asciidoctor.Extensions.create(function () {
        this.block(function () {
          const self = this;
          self.named('whisper');
          self.onContext('paragraph');
          self.process(function (parent, reader) {
            const lines = reader.getLines().map((l) => l.toLowerCase().replace('!', '.'));
            return self.createBlock(parent, 'paragraph', lines);
          });
        });
      });
      const opts = {extension_registry: registry};
      const result = asciidoctor.convert('[whisper]\nWE HAVE LIFTOFF!', opts);
      expect(result).toContain('we have liftoff.');
    });

    it('should be able to create an image block from a processor extension', () => {
      const registry = asciidoctor.Extensions.create(function () {
        this.blockMacro(function () {
          this.named('img');
          this.process((parent, target) => {
            return this.createImageBlock(parent, {target: target + '.png'});
          });
        });
      });
      const opts = {extension_registry: registry};
      const result = asciidoctor.convert('img::image-name[]', opts);
      expect(result).toContain('<img src="image-name.png" alt="image name">');
    });

    it('should be able to process emoji inline macro processor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {extension_registry: registry};
      require('../share/extensions/emoji-inline-macro.js')(registry);
      const result = asciidoctor.convert(fs.readFileSync(resolveFixture('emoji-inline-macro-ex.adoc')), opts);
      expect(result).toContain('1f422.svg');
      expect(result).toContain('2764.svg');
      expect(result).toContain('twemoji.maxcdn.com');
    });

    it('should be able to convert a file and include the default stylesheet', () => {
      const options = {safe: 'safe', header_footer: true};
      const html = asciidoctor.convert('=== Test', options);
      expect(html).toContain('Asciidoctor default stylesheet');
      expect(html).toContain('Test');
    });

    it('should include a file with a relative path', () => {
      var options = {safe: 'unsafe', header_footer: false, 'to_file': false};
      var html = asciidoctor.convertFile('spec/fixtures/chapter-01/index.adoc', options);
      expect(html).toContain('We recommend to use version 1.2.3');
    });

    it('should include a file as a UTF-8 file', () => {
      var options = {safe: 'unsafe', header_footer: false, 'to_file': false};
      var html = asciidoctor.convertFile('spec/fixtures/encoding.adoc', options);
      expect(html).toContain('À propos des majuscules accentuées');
      expect(html).toContain('Le français c&#8217;est pas compliqué :)');
    });

    it('should issue a warning if an include file is not found', () => {
      const options = {safe: 'safe', header_footer: true};
      const html = asciidoctor.convert('= Test\n\ninclude::nonexistent.adoc[]', options);
      expect(html).toContain('Test');
      expect(html).toContain('Unresolved directive');
      expect(html).toContain('include::nonexistent.adoc[]');
    });

    it('Should include file with a relative path (base_dir is not defined)', function () {
      const opts = {safe: 'safe'};
      const html = asciidoctor.convert('include::spec/fixtures/include.adoc[]', opts);
      expect(html).toContain('include content');
    });

    it('Should include file with an absolute path (base_dir is explicitly defined)', function () {
      const opts = {safe: 'safe', base_dir: testOptions.baseDir};
      const html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include.adoc[]', opts);
      expect(html).toContain('include content');
    });

    it('should be able to convert a file and embed an image', () => {
      const options = {safe: 'safe', header_footer: true};
      const content = fs.readFileSync(path.resolve(__dirname, '../fixtures/image.adoc'), 'utf8');
      const html = asciidoctor.convert(content, options);
      expect(html).toContain('French frog');
      expect(html).toContain('data:image/jpg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/7SMwU');
    });

    it('should be able to convert a buffer', () => {
      const options = {safe: 'safe', header_footer: true};
      const content = fs.readFileSync(resolveFixture('test.adoc'));
      const html = asciidoctor.convert(content, options);
      expect(html).toContain('Hello world');
    });
  });
});

