var path = require('path');
var fs = require('fs');
var commonSpec = require('../share/common-spec.js');
var config = {
  runtime: {
    platform: 'node',
    engine: 'v12',
    framework: 'lollipop'
  }
};
var asciidoctor = require('../../build/asciidoctor.js')(config);
function asciidoctorVersionGreaterThan (version) {
  var currentVersion = asciidoctor.$$const.VERSION;
  var currentVersionNumeric = parseInt(currentVersion.replace('.dev', '').replace(/\./g, ''));
  var versionNumeric = version.replace(/\./g, '');
  return currentVersionNumeric > versionNumeric; 
}
var Opal = require('opal-runtime').Opal; // for testing purpose only
require('asciidoctor-docbook.js');
require('asciidoctor-template.js');
require('../share/extensions/smiley-inline-macro.js');
require('../share/extensions/shout-block.js');
if (asciidoctorVersionGreaterThan('1.5.5')) {
  require('../share/extensions/foo-include.js');
}
require('../share/extensions/lorem-block-macro.js');

var testOptions = {
  platform: 'Node.js',
  baseDir: path.join(__dirname, '..', '..')
};

commonSpec(testOptions, asciidoctor);

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

describe('Node.js', function () {

  describe('Configuring Asciidoctor module', function () {
    it('should be able to configure Asciidoctor module', function () {
      expect(Opal.JAVASCRIPT_IO_MODULE).toBe('node');
      expect(Opal.JAVASCRIPT_PLATFORM).toBe('node');
      expect(Opal.JAVASCRIPT_ENGINE).toBe('v12');
      expect(Opal.JAVASCRIPT_FRAMEWORK).toBe('lollipop');
    });
  });

  describe('Loading file', function () {
    it('should be able to load a file', function () {
      var doc = asciidoctor.loadFile(__dirname + '/test.adoc');
      expect(doc.getAttribute('docname')).toBe('test');
    });

    it('should be able to load a buffer', function () {
      var doc = asciidoctor.load(fs.readFileSync(path.resolve(__dirname + '/test.adoc')));
      expect(doc.getDoctitle()).toBe('Document title');
    });

    it('should return empty revision info', function () {
      var doc = asciidoctor.load('= Begin Again\n\n== First section');
      expect(doc.getRevisionDate()).toBe(undefined);
      expect(doc.getRevisionNumber()).toBe(undefined);
      expect(doc.getRevisionRemark()).toBe(undefined);

      expect(doc.hasRevisionInfo()).toBe(false);
      var revisionInfo = doc.getRevisionInfo();
      expect(revisionInfo.isEmpty()).toBe(true);
      expect(revisionInfo.getDate()).toBe(undefined);
      expect(revisionInfo.getNumber()).toBe(undefined);
      expect(revisionInfo.getRemark()).toBe(undefined);
      expect(revisionInfo.date).toBe(undefined);
      expect(revisionInfo.number).toBe(undefined);
      expect(revisionInfo.remark).toBe(undefined);
    });

    it('should be able to retrieve structural content from file', function () {
      var doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
      var header = doc.getHeader();
      expect(header.level).toBe(0);
      expect(header.title).toBe('Sample Document');
      expect(header.getAttribute('revdate')).toBe('2013-05-20');
      expect(header.getAttribute('revnumber')).toBe('1.0');
      expect(header.getAttribute('revremark')).toBe('First draft');

      expect(doc.getRevisionDate()).toBe('2013-05-20');
      expect(doc.getRevisionNumber()).toBe('1.0');
      expect(doc.getRevisionRemark()).toBe('First draft');

      expect(doc.hasRevisionInfo()).toBe(true);
      var revisionInfo = doc.getRevisionInfo();
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

      var blocks = doc.getBlocks();
      expect(blocks.length).toBe(4);
      expect(blocks[0].getContext()).toBe('section');
      expect(blocks[0].getTitle()).toBe('Abstract');
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

      expect(blocks[1].getBlocks()[2].getRole()).toBe('feature-list');

      expect(blocks[2].getTitle()).toBe('Second Section');
      expect(blocks[2].getBlocks().length).toBe(3);

      expect(blocks[2].getBlocks()[0].getContext()).toBe('image');
      expect(blocks[2].getBlocks()[0].getTitle()).toBe('');
      expect(blocks[2].getBlocks()[1].getContext()).toBe('image');

      expect(blocks[3].getTitle()).toBe('Got <span class="icon">[file pdf o]</span>?');
    });

    it('should be able to find blocks', function () {
      var doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
      var quoteBlocks = doc.findBy(function (b) { return b.getStyle() === 'quote'; });
      expect(quoteBlocks.length).toBe(1);

      var sectionBlocks = doc.findBy({'context': 'section'});
      expect(sectionBlocks.length).toBe(5);

      var abstractSectionBlocks = doc.findBy({'context': 'section'}, function (b) { return b.getTitle() === 'Second Section'; });
      expect(abstractSectionBlocks.length).toBe(1);
    });

    it('should be able to find blocks with line number', function () {
      var doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc', {sourcemap: true});
      var blocks = doc.findBy(function () { return true; });
      expect(blocks.length).toBe(26);

      var blocksWithLineNumber = doc.findBy(function (b) { return typeof b.getLineNumber() !== 'undefined'; });
      expect(blocksWithLineNumber.length).toBe(18);
    });
  });

  describe('Converting file', function () {
    it('should be able to convert a file', function () {
      var expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        asciidoctor.convertFile(__dirname + '/test.adoc');
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css', function () {
      var expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        var options = {attributes: ['stylesheet=simple.css', 'stylesdir=css']};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('css/simple.css');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css embedded', function () {
      var expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        var options = {safe: 'server', attributes: ['stylesheet=simple.css', 'stylesdir=css']};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('h1 { color: #4078c0; }');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir', function () {
      var expectFilePath = __dirname + '/target/test.html';
      removeFile(expectFilePath);
      try {
        var options = {to_dir: './spec/node/target'};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir and to_file', function () {
      var expectFilePath = __dirname + '/target/output.html';
      removeFile(expectFilePath);
      try {
        var options = {to_dir: './spec/node/target', to_file: 'output.html'};
        asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to use a custom backend', function () {
      var options = {safe: 'safe', 'header_footer': true};
      var content = '= Title\n' +
                    ':backend: revealjs\n\n' +
                    '== Slide 1\n\n' +
                    'Content 1\n\n' +
                    '== Slide 2\n\n' +
                    'Content 2';
      var result = asciidoctor.convert(content, options);
      expect(result).toContain('<section id="_slide_1"');
      expect(result).toContain('<section id="_slide_2"');
      expect(result).toContain('<script src="reveal.js/js/reveal.js"></script>');
    });

    it('should be able to process smiley extension', function () {
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/smiley-inline-macro-ex.adoc')));
      expect(result).toContain('<strong>:D</strong>');
      expect(result).toContain('<strong>;)</strong>');
      expect(result).toContain('<strong>:)</strong>');
    });

    it('should be able to process love tree processor extension', function () {
      var registry = asciidoctor.Extensions.create();
      var opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/love-tree-processor.js')(registry);
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/love-tree-processor-ex.adoc')), opts);
      expect(result).toContain('Made with icon:heart[]');

      result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/love-tree-processor-ex.adoc')));
      expect(result).toContain('How this document was made ?');
    });

    it('should be able to process foo bar postprocessor extension', function () {
      var registry = asciidoctor.Extensions.create();
      var opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/foo-bar-postprocessor.js')(registry);
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/foo-bar-postprocessor-ex.adoc')), opts);
      expect(result).toContain('bar, qux, bar.');
      expect(result).not.toContain('foo');

      result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/foo-bar-postprocessor-ex.adoc')));
      expect(result).toContain('foo, qux, foo.');
      expect(result).not.toContain('bar');
    });

    it('should be able to process custom block', function () {
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/shout-block-ex.adoc')));
      expect(result).toContain('<p>SAY IT LOUD.\nSAY IT PROUD.</p>');
    });

    it('should be able to process custom include processor when target does match', function () {
      if (asciidoctorVersionGreaterThan('1.5.5')) {
        var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/foo-include-ex.adoc')));
        expect(result).toContain('foo\nfoo');
      }
    });

    it('should not process custom include processor when target does not match', function () {
      if (asciidoctorVersionGreaterThan('1.5.5')) {
        var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/bar-include-ex.adoc')));
        expect(result).toContain('bar');
      }
    });

    it('should be able to process lorem extension', function () {
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/lorem-block-macro-ex.adoc')));
      expect(result).toContain('Lorem ipsum dolor sit amet');
    });

    it('should be able to process draft preprocessor extension', function () {
      var registry = asciidoctor.Extensions.create();
      var opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/draft-preprocessor.js')(registry);
      var doc = asciidoctor.load(fs.readFileSync(path.resolve(__dirname + '/draft-preprocessor-ex.adoc')), opts);
      expect(doc.getAttribute('status')).toBe('DRAFT');
      var result = doc.convert();
      expect(result).toContain('Important');
      expect(result).toContain('This section is a draft: we need to talk about Y.');
    });

    it('should be able to process moar footer docinfo processor extension', function () {
      var registry = asciidoctor.Extensions.create();
      var opts = {'safe': 'server', 'header_footer': true};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      require('../share/extensions/moar-footer-docinfo-processor.js')(registry);
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/moar-footer-docinfo-processor-ex.adoc')), opts);
      expect(result).toContain('moar footer');

      result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/moar-footer-docinfo-processor-ex.adoc')));
      expect(result).not.toContain('moar footer');
    });

    it('should be able to pass an extension registry to the processor', function () {
      var registry = asciidoctor.Extensions.create(function () {
        this.block(function () {
          var self = this;
          self.named('whisper');
          self.onContext('paragraph');
          self.process(function (parent, reader) {
            var lines = reader.$lines().map(function (l) { return l.toLowerCase().replace('!', '.'); });
            return self.createBlock(parent, 'paragraph', lines);
          });
        });
      });
      var opts = {};
      opts[asciidoctorVersionGreaterThan('1.5.5') ? 'extension_registry' : 'extensions_registry'] = registry;
      var result = asciidoctor.convert('[whisper]\nWE HAVE LIFTOFF!', opts);
      expect(result).toContain('we have liftoff.');
    });

    it('should be able to convert a file and include the default stylesheet', function () {
      var options = {safe: 'safe', header_footer: true};
      var html = asciidoctor.convert('=== Test', options);
      expect(html).toContain('Asciidoctor default stylesheet');
      expect(html).toContain('Test');
    });

    it('should issue a warning if an include file is not found', function () {
      var options = {safe: 'safe', header_footer: true};
      var html = asciidoctor.convert('= Test\n\ninclude::nonexistent.adoc[]', options);
      expect(html).toContain('Test');
      expect(html).toContain('Unresolved directive');
      expect(html).toContain('include::nonexistent.adoc[]');
    });

    it('should be able to convert a file and embed an image', function () {
      var options = {safe: 'safe', header_footer: true};
      var content = fs.readFileSync(path.resolve(__dirname, '../share/image.adoc'), 'utf8');
      var html = asciidoctor.convert(content, options);
      expect(html).toContain('French frog');
      expect(html).toContain('data:image/jpg;base64,');
    });

    it('should be able to convert a buffer', function () {
      var options = {safe: 'safe', header_footer: true};
      var content = fs.readFileSync(path.resolve(__dirname + '/test.adoc'));
      var html = asciidoctor.convert(content, options);
      expect(html).toContain('Hello world');
    });
  });
});

