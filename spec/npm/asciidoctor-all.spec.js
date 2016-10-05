var path = require('path');
var fs = require('fs');
var commonSpec = require('../share/common-specs.js');
var asciidoctor = require('../../build/npm/asciidoctor-core.js')();
var testOptions = {
  platform: 'Node.js',
  baseDir: path.join(__dirname, '..', '..')
};
var Asciidoctor = asciidoctor.Asciidoctor(true);
var Opal = asciidoctor.Opal;

Opal.load('nodejs');
Opal.load('pathname');

commonSpec(testOptions, Opal, Asciidoctor);

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

  describe('Loading file', function () {
    it('should be able to load a file', function () {
      var doc = Asciidoctor.loadFile(__dirname + '/test.adoc', null);
      expect(doc.getAttribute('docname')).toBe('test');
    });

    it('should be able to retrieve structural content from file', function () {
      var doc = Asciidoctor.loadFile(__dirname + '/documentblocks.adoc');
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
      expect(blocks[2].getBlocks()[1].getContext()).toBe('image');
    });
  });

  describe('Converting file', function () {
    it('should be able to convert a file', function () {
      var expectFilePath = __dirname + '/test.html';
      removeFile(expectFilePath);
      try {
        Asciidoctor.convertFile(__dirname + '/test.adoc', null);
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
        Asciidoctor.convertFile(__dirname + '/test.adoc', options);
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
        Asciidoctor.convertFile(__dirname + '/test.adoc', options);
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
        var options = {to_dir: './spec/npm/target'};
        Asciidoctor.convertFile(__dirname + '/test.adoc', options);
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
        var options = {to_dir: './spec/npm/target', to_file: 'output.html'};
        Asciidoctor.convertFile(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });
  });
});

