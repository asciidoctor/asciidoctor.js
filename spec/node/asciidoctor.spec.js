const path = require('path');
const fs = require('fs');
const process = require('process');
const shareSpec = require('../share/asciidoctor.spec.js');
const config = {
  runtime: {
    platform: 'node',
    engine: 'v12',
    framework: 'lollipop'
  }
};
const asciidoctor = require('../../build/asciidoctor.js')(config);
function asciidoctorVersionGreaterThan (version) {
  const currentVersion = asciidoctor.getCoreVersion();
  // ignore the fourth number, keep only major, minor and patch numbers
  const currentVersionNumeric = parseInt(currentVersion.replace('.dev', '').replace(/\./g, '').substring(0, 3));
  const versionNumeric = version.replace(/\./g, '');
  return currentVersionNumeric > versionNumeric; 
}

const Opal = require('opal-runtime').Opal; // for testing purpose only
require('asciidoctor-docbook.js')();
require('asciidoctor-template.js')();
require('asciidoctor-reveal.js');
const packageJson = require('../../package.json');

const testOptions = {
  platform: 'Node.js',
  baseDir: path.join(__dirname, '..', '..')
};

shareSpec(testOptions, asciidoctor);

function fileExists (path) {
  try {
    fs.statSync(path);
    return true;
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}

function removeFile (path) {
  if (fileExists(path)) {
    fs.unlinkSync(path);
  }
}

describe('Node.js', () => {

  describe('Asciidoctor.js API', () => {
    it('should return Asciidoctor.js version', () => {
      expect(asciidoctor.getVersion()).toBe(packageJson.version);
    });
  });

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
      const doc = asciidoctor.loadFile(__dirname + '/test.adoc');
      expect(doc.getAttribute('docname')).toBe('test');
    });

    it('should be able to load a buffer', () => {
      const doc = asciidoctor.load(fs.readFileSync(path.resolve(__dirname + '/test.adoc')));
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
      const doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
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
      expect(blocks[2].getBlocks()[0].getTitle()).toBe('');
      expect(blocks[2].getBlocks()[1].getContext()).toBe('image');

      expect(blocks[3].getTitle()).toBe('Got <span class="icon">[file pdf o]</span>?');
    });

    it('should be able to find blocks', () => {
      const doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
      const quoteBlocks = doc.findBy(function (b) { return b.getStyle() === 'quote'; });
      expect(quoteBlocks.length).toBe(1);

      const sectionBlocks = doc.findBy({'context': 'section'});
      expect(sectionBlocks.length).toBe(5);

      const abstractSectionBlocks = doc.findBy({'context': 'section'}, function (b) { return b.getTitle() === 'Second Section'; });
      expect(abstractSectionBlocks.length).toBe(1);
    });

    it('should be able to find blocks with line number', () => {
      const doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc', {sourcemap: true});
      const blocks = doc.findBy(function () { return true; });
      expect(blocks.length).toBe(26);

      const blocksWithLineNumber = doc.findBy(function (b) { return typeof b.getLineNumber() !== 'undefined'; });
      // since https://github.com/asciidoctor/asciidoctor/commit/46700a9c12d1cfe551db2790dd232baa0bec8195
      // When the sourcemap option is specified, the source location (and as a consequence the line number) is defined on the Document object.
      expect(blocksWithLineNumber.length >= 18).toBe(true);
    });
  });

  describe('Converting file', () => {
    it('should be able to convert a file', () => {
      const expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        asciidoctor.convertFile(__dirname + '/test.adoc');
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css', () => {
      const expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        const options = {attributes: ['stylesheet=simple.css', 'stylesdir=css']};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('css/simple.css');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css embedded', () => {
      const expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        const options = {safe: 'server', attributes: ['stylesheet=simple.css', 'stylesdir=css']};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('h1 { color: #4078c0; }');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir', () => {
      const expectFilePath = __dirname + '/target/test.html';
      removeFile(expectFilePath);
      try {
        const options = {to_dir: './spec/node/target'};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir and to_file', () => {
      const expectFilePath = __dirname + '/target/output.html';
      removeFile(expectFilePath);
      try {
        const options = {to_dir: './spec/node/target', to_file: 'output.html'};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
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
        const result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/smiley-inline-macro-ex.adoc')));
        expect(result).toContain('<strong>:D</strong>');
        expect(result).toContain('<strong>;)</strong>');
        expect(result).toContain('<strong>:)</strong>');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process love tree processor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/love-tree-processor.js')(registry);
      const resultWithExtension = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/love-tree-processor-ex.adoc')), opts);
      expect(resultWithExtension).toContain('Made with icon:heart[]');

      const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/love-tree-processor-ex.adoc')));
      expect(resultWithoutExtension).toContain('How this document was made ?');
    });

    it('should be able to process foo bar postprocessor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/foo-bar-postprocessor.js')(registry);
      const resultWithExtension = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/foo-bar-postprocessor-ex.adoc')), opts);
      expect(resultWithExtension).toContain('bar, qux, bar.');
      expect(resultWithExtension).not.toContain('foo');

      const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/foo-bar-postprocessor-ex.adoc')));
      expect(resultWithoutExtension).toContain('foo, qux, foo.');
      expect(resultWithoutExtension).not.toContain('bar');
    });

    it('should be able to process custom block', () => {
      try {
        require('../share/extensions/shout-block.js');
        const result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/shout-block-ex.adoc')));
        expect(result).toContain('<p>SAY IT LOUD.\nSAY IT PROUD.</p>');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process custom include processor when target does match', () => {
      if (asciidoctorVersionGreaterThan('1.5.5')) {
        try {
          require('../share/extensions/foo-include.js');
          const result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/foo-include-ex.adoc')));
          expect(result).toContain('foo\nfoo');
        } finally {
          asciidoctor.Extensions.unregisterAll();
        }
      }
    });

    it('should not process custom include processor when target does not match', () => {
      if (asciidoctorVersionGreaterThan('1.5.5')) {
        const result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/bar-include-ex.adoc')));
        expect(result).toContain('bar');
      }
    });

    it('should be able to process lorem extension', () => {
      try {
        require('../share/extensions/lorem-block-macro.js');
        const result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/lorem-block-macro-ex.adoc')));
        expect(result).toContain('Lorem ipsum dolor sit amet');
      } finally {
        asciidoctor.Extensions.unregisterAll();
      }
    });

    it('should be able to process draft preprocessor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/draft-preprocessor.js')(registry);
      const doc = asciidoctor.load(fs.readFileSync(path.resolve(__dirname + '/draft-preprocessor-ex.adoc')), opts);
      expect(doc.getAttribute('status')).toBe('DRAFT');
      const result = doc.convert();
      expect(result).toContain('Important');
      expect(result).toContain('This section is a draft: we need to talk about Y.');
    });

    it('should be able to process moar footer docinfo processor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {'safe': 'server', 'header_footer': true};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/moar-footer-docinfo-processor.js')(registry);
      const resultWithExtension = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/moar-footer-docinfo-processor-ex.adoc')), opts);
      expect(resultWithExtension).toContain('moar footer');

      const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/moar-footer-docinfo-processor-ex.adoc')));
      expect(resultWithoutExtension).not.toContain('moar footer');
    });

    it('should be able to pass an extension registry to the processor', () => {
      const registry = asciidoctor.Extensions.create(function () {
        this.block(function () {
          const self = this;
          self.named('whisper');
          self.onContext('paragraph');
          self.process(function (parent, reader) {
            const lines = reader.getLines().map(function (l) { return l.toLowerCase().replace('!', '.'); });
            return self.createBlock(parent, 'paragraph', lines);
          });
        });
      });
      const opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      const result = asciidoctor.convert('[whisper]\nWE HAVE LIFTOFF!', opts);
      expect(result).toContain('we have liftoff.');
    });

    it('should be able to process emoji inline macro processor extension', () => {
      const registry = asciidoctor.Extensions.create();
      const opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/emoji-inline-macro.js')(registry);
      const result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/emoji-inline-macro-ex.adoc')), opts);
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

    it('should issue a warning if an include file is not found', () => {
      const options = {safe: 'safe', header_footer: true};
      const html = asciidoctor.convert('= Test\n\ninclude::nonexistent.adoc[]', options);
      expect(html).toContain('Test');
      expect(html).toContain('Unresolved directive');
      expect(html).toContain('include::nonexistent.adoc[]');
    });

    it('should be able to convert a file and embed an image', () => {
      const options = {safe: 'safe', header_footer: true};
      const content = fs.readFileSync(path.resolve(__dirname, '../share/image.adoc'), 'utf8');
      const html = asciidoctor.convert(content, options);
      expect(html).toContain('French frog');
      expect(html).toContain('data:image/jpg;base64,');
    });

    it('should be able to convert a buffer', () => {
      const options = {safe: 'safe', header_footer: true};
      const content = fs.readFileSync(path.resolve(__dirname + '/test.adoc'));
      const html = asciidoctor.convert(content, options);
      expect(html).toContain('Hello world');
    });
  });
});

