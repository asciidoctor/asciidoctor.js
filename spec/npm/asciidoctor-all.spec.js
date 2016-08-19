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

function fileExists(path) {
  try {
    fs.statSync(path);
    return true;
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}

function removeFile(path) {
  if (fileExists(path)) {
    fs.unlinkSync(path)
  }
}

describe('Node.js', function () {

  describe('Loading file', function() {
    it('should be able to load a file', function() {
      var doc = Asciidoctor.$load_file(__dirname + '/test.adoc', null);
      expect(doc.attributes.$fetch('docname')).toBe('test.adoc');
    });
  });

  describe('Converting file', function() {
    it('should be able to convert a file', function() {
      var expectFilePath = __dirname + '/test.adoc.html';
      removeFile(expectFilePath);
      try {
        var doc = Asciidoctor.$convert_file(__dirname + '/test.adoc', null);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css', function() {
      var expectFilePath = __dirname + '/test.adoc.html';
      removeFile(expectFilePath);
      try {
        var options = Opal.hash({'attributes': ['stylesheet=simple.css', 'stylesdir=css']});
        var doc = Asciidoctor.$convert_file(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('css/simple.css');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with custom css embedded', function() {
      var expectFilePath = __dirname + '/test.adoc.html';
      removeFile(expectFilePath);
      try {
        var options = Opal.hash({'safe': 'server', 'attributes': ['stylesheet=simple.css', 'stylesdir=css']});
        var doc = Asciidoctor.$convert_file(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('h1 { color: #4078c0; }');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir', function() {
      var expectFilePath = __dirname + '/target/test.adoc.html';
      removeFile(expectFilePath);
      try {
        var options = Opal.hash({'to_dir': './spec/npm/target'});
        Asciidoctor.$convert_file(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to convert a file with to_dir and to_file', function() {
      var expectFilePath = __dirname + '/target/output.html';
      removeFile(expectFilePath);
      try {
        var options = Opal.hash({'to_dir': './spec/npm/target', 'to_file': 'output.html'});
        Asciidoctor.$convert_file(__dirname + '/test.adoc', options);
        expect(fileExists(expectFilePath)).toBe(true);
        var content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).toContain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });
  });
});

