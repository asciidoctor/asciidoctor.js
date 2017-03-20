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
var Opal = require('opal-runtime').Opal; // for testing purpose only
require('asciidoctor-docbook.js');
require('asciidoctor-template.js');
require('../share/extensions/smiley-macro.js');

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
      expect(Opal.get('JAVASCRIPT_IO_MODULE')).toBe('node');
      expect(Opal.get('JAVASCRIPT_PLATFORM')).toBe('node');
      expect(Opal.get('JAVASCRIPT_ENGINE')).toBe('v12');
      expect(Opal.get('JAVASCRIPT_FRAMEWORK')).toBe('lollipop');
    });
  });

  describe('Loading file', function () {
    it('should be able to load a file', function () {
      var doc = asciidoctor.loadFile(__dirname + '/test.adoc', null);
      expect(doc.getAttribute('docname')).toBe('test');
    });

    it('should be able to load a buffer', function () {
      var doc = asciidoctor.load(fs.readFileSync(path.resolve(__dirname + '/test.adoc')), null);
      expect(doc.getDoctitle()).toBe('Document title');
    });

    it('should be able to retrieve structural content from file', function () {
      var doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
      var header = doc.getHeader();
      expect(header.level).toBe(0);
      expect(header.title).toBe('Sample Document');
      expect(header.getAttribute('revdate')).toBe('2013-05-20');
      expect(header.getAttribute('revnumber')).toBe('1.0');
      expect(header.getAttribute('revremark')).toBe('First draft');
      expect(header.getAttribute('tags')).toBe('[document, example]');
      expect(header.getAttribute('author')).toBe('Doc Writer');
      expect(header.getAttribute('email')).toBe('doc.writer@asciidoc.org');

      var blocks = doc.getBlocks();
      expect(blocks.length).toBe(3);
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
      expect(blocks[2].getBlocks().length).toBe(2);

      expect(blocks[2].getBlocks()[0].getContext()).toBe('image');
      expect(blocks[2].getBlocks()[0].getTitle()).toBe('');
      expect(blocks[2].getBlocks()[1].getContext()).toBe('image');
    });

    it('should be able to find blocks', function () {
      var doc = asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
      var quoteBlocks = doc.findBy(function (b) { return b.getStyle() === 'quote'; });
      expect(quoteBlocks.length).toBe(1);

      var sectionBlocks = doc.findBy({'context': 'section'});
      expect(sectionBlocks.length).toBe(4);

      var abstractSectionBlocks = doc.findBy({'context': 'section'}, function (b) { return b.getTitle() === 'Second Section'; });
      expect(abstractSectionBlocks.length).toBe(1);
    });
  });

  describe('Converting file', function () {
    it('should be able to convert a file', function () {
      var expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        asciidoctor.convertFile(__dirname + '/test.adoc', null);
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
      var result = asciidoctor.convert(fs.readFileSync(path.resolve(__dirname + '/extension.adoc')), null);
      expect(result).toContain(':D');
      expect(result).toContain(';)');
      expect(result).toContain(':)');
    });

    it('should be able to convert a file and include the default stylesheet', function () {
      var options = {safe: 'safe', header_footer: true};
      var html = asciidoctor.convert('=== Test', options);
      expect(html).toContain('Asciidoctor default stylesheet');
      expect(html).toContain('Test');
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

