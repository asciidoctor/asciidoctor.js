/* eslint-env node, es6 */
const path = require('path');
const fs = require('fs');
const process = require('process');
const chai = require('chai');
const expect = chai.expect;

const shareSpec = require('../share/asciidoctor-spec.js');
const includeHttpsSpec = require('../share/asciidoctor-include-https-spec');

const config = {
  runtime: {
    platform: 'node',
    engine: 'v12',
    framework: 'lollipop'
  }
};
const asciidoctor = require('../../build/asciidoctor-node.js')(config);

const Opal = require('opal-runtime').Opal; // for testing purpose only
const packageJson = require('../../package.json');

const testOptions = {
  platform: 'Node.js',
  baseDir: path.join(__dirname, '..', '..')
};

shareSpec(testOptions, asciidoctor, expect);
includeHttpsSpec(testOptions, asciidoctor, expect);

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

function truncateFile (path) {
  try {
    fs.truncateSync(path, 0); // file must be empty
  } catch (err) {
    if (err.code === 'ENOENT') {
      // it's OK, if the file does not exists
    }
  }
}

const resolveFixture = (name) => {
  return path.resolve(path.join(__dirname, '..', 'fixtures', name));
};

describe('Node.js', () => {

  describe('Asciidoctor.js API', () => {
    it('should return Asciidoctor.js version', () => {
      expect(asciidoctor.getVersion()).to.equal(packageJson.version);
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
          expect(errorMessage.getSeverity()).to.equal('ERROR');
          expect(errorMessage.getText()).to.equal('invalid part, must have at least one section (e.g., chapter, appendix, etc.)');
          const sourceLocation = errorMessage.getSourceLocation();
          expect(sourceLocation.getLineNumber()).to.equal(8);
          expect(sourceLocation.getFile()).to.be.undefined;
          expect(sourceLocation.getDirectory()).to.equal(process.cwd());
          expect(sourceLocation.getPath()).to.equal('<stdin>');
        } finally {
          asciidoctor.LoggerManager.setLogger(defaultLogger);
        }
      });
      it('should be able to get logger\'s info', () => {
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        expect(defaultLogger.getLevel()).to.equal(2);
        expect(defaultLogger.getFormatter()['$$class'].name).to.equal('$BasicFormatter');
        expect(defaultLogger.getProgramName()).to.equal('asciidoctor');
        expect(defaultLogger.getMaxSeverity()).to.equal(2);
      });
      it('should be able to set the logger\'s program name', () => {
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        try {
          expect(defaultLogger.getProgramName()).to.equal('asciidoctor');
          defaultLogger.setProgramName('asciidoctor.js');
          expect(defaultLogger.getProgramName()).to.equal('asciidoctor.js');
        } finally {
          defaultLogger.setProgramName('asciidoctor'); // reset
        }
      });
      it('should be able to set the logger\'s level', () => {
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        try {
          expect(defaultLogger.getLevel()).to.equal(2);
          defaultLogger.setLevel(3);
          expect(defaultLogger.getLevel()).to.equal(3);
        } finally {
          defaultLogger.setLevel(2); // reset
        }
      });
      it('should use the default formatter', () => {
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        const defaultFormatter = defaultLogger.getFormatter();
        const processStderrWriteFunction = process.stderr.write;
        let stderrOutput = '';
        process.stderr.write = function (chunk) {
          stderrOutput += chunk;
        };
        try {
          const input = `= Book
:doctype: book

= Part 1

[partintro]
intro
`;
          asciidoctor.convert(input);
          expect(stderrOutput).to.equal('asciidoctor: ERROR: <stdin>: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)\n');
        } finally {
          defaultLogger.setFormatter(defaultFormatter);
          process.stderr.write = processStderrWriteFunction;
        }
      });
      it('should be able to use a JSON formatter', () => {
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        const defaultFormatter = defaultLogger.getFormatter();
        const processStderrWriteFunction = process.stderr.write;
        let stderrOutput = '';
        process.stderr.write = function (chunk) {
          stderrOutput += chunk;
        };
        try {
          expect(defaultFormatter['$$class']['$$name']).to.equal('BasicFormatter');
          defaultLogger.setFormatter(asciidoctor.LoggerManager.newFormatter('JsonFormatter', {
            call: function (severity, time, programName, message) {
              const text = message['text'];
              const sourceLocation = message['source_location'];
              return JSON.stringify({
                programName: programName,
                message: text,
                sourceLocation: {
                  lineNumber: sourceLocation.getLineNumber(),
                  path: sourceLocation.getPath()
                },
                severity: severity
              }) + '\n';
            }
          }));
          const input = `= Book
:doctype: book

= Part 1

[partintro]
intro
`;
          expect(defaultLogger.getFormatter()['$$class']['$$name']).to.equal('JsonFormatter');
          asciidoctor.convert(input);
          expect(stderrOutput).to.equal('{"programName":"asciidoctor","message":"invalid part, must have at least one section (e.g., chapter, appendix, etc.)","sourceLocation":{"lineNumber":8,"path":"<stdin>"},"severity":"ERROR"}\n');
          expect(JSON.parse(stderrOutput).message).to.equal('invalid part, must have at least one section (e.g., chapter, appendix, etc.)');
        } finally {
          defaultLogger.setFormatter(defaultFormatter);
          process.stderr.write = processStderrWriteFunction;
        }
      });
      it('should not log anything when NullLogger is used', () => {
        const input = `= Book
:doctype: book

= Part 1

[partintro]
intro
`;
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        const nullLogger = asciidoctor.NullLogger.$new();
        const stderrWriteFunction = process.stderr.write;
        let stderrOutput = '';
        process.stderr.write = function (chunk) {
          stderrOutput += chunk;
        };
        try {
          asciidoctor.LoggerManager.setLogger(nullLogger);
          asciidoctor.convert(input);
          expect(nullLogger.getMaxSeverity()).to.equal(3);
          expect(stderrOutput).to.equal('');
        } finally {
          process.stderr.write = stderrWriteFunction;
          asciidoctor.LoggerManager.setLogger(defaultLogger);
        }
      });
      it('should create a custom Logger', (done) => {
        const input = `= Book
:doctype: book

= Part 1

[partintro]
intro
`;
        const fs = require('fs');
        const defaultLogger = asciidoctor.LoggerManager.getLogger();
        const logFile = path.join(__dirname, '..', '..', 'build', 'async.log');
        const asyncLogger = asciidoctor.LoggerManager.newLogger('AsyncFileLogger', {
          postConstruct: function () {
            this.writer = fs.createWriteStream(logFile, {
              flags: 'a'
            });
            truncateFile(logFile);
          },
          add: function (severity, _, message) {
            const log = this.formatter.call(severity, new Date(), this.progname, message);
            this.writer.write(log);
          }
        });

        try {
          asciidoctor.LoggerManager.setLogger(asyncLogger);
          asciidoctor.convert(input);
          asyncLogger.writer.end(() => {
            expect(fs.readFileSync(logFile, 'UTF-8')).to.equal('asciidoctor: ERROR: <stdin>: line 8: invalid part, must have at least one section (e.g., chapter, appendix, etc.)\n');
            done();
          });
        } finally {
          asciidoctor.LoggerManager.setLogger(defaultLogger);
        }
      });
    });
  }

  describe('Configuring Asciidoctor module', () => {
    it('should be able to configure Asciidoctor module', () => {
      /** @namespace Opal.JAVASCRIPT_PLATFORM.JAVASCRIPT_IO_MODULE.JAVASCRIPT_ENGINE.JAVASCRIPT_FRAMEWORK */
      expect(Opal.JAVASCRIPT_IO_MODULE).to.equal('node');
      expect(Opal.JAVASCRIPT_PLATFORM).to.equal('node');
      expect(Opal.JAVASCRIPT_ENGINE).to.equal('v12');
      expect(Opal.JAVASCRIPT_FRAMEWORK).to.equal('lollipop');
      const runtime = asciidoctor.getRuntime();
      expect(runtime.ioModule).to.equal('node');
      expect(runtime.platform).to.equal('node');
      expect(runtime.engine).to.equal('v12');
      expect(runtime.framework).to.equal('lollipop');
    });
  });

  describe('Loading document', () => {
    it('should get the base directory', () => {
      const doc = asciidoctor.load('== Test');
      expect(doc.getBaseDir()).to.equal(process.cwd());
    });
  });

  describe('Loading file', () => {
    it('should be able to load a file', () => {
      const doc = asciidoctor.loadFile(resolveFixture('test.adoc'));
      expect(doc.getAttribute('docname')).to.equal('test');
    });

    it('should be able to load a buffer', () => {
      const doc = asciidoctor.load(fs.readFileSync(resolveFixture('test.adoc')));
      expect(doc.getDoctitle()).to.equal('Document title');
    });

    it('should return empty document title if not specified', () => {
      const doc = asciidoctor.load('paragraph');
      expect(doc.getDocumentTitle()).to.be.undefined;
      expect(doc.getTitle()).to.be.undefined;
    });

    it('should return empty revision info', () => {
      const doc = asciidoctor.load('= Begin Again\n\n== First section');
      expect(doc.getRevisionDate()).to.be.undefined;
      expect(doc.getRevisionNumber()).to.be.undefined;
      expect(doc.getRevisionRemark()).to.be.undefined;

      expect(doc.hasRevisionInfo()).false;
      const revisionInfo = doc.getRevisionInfo();
      expect(revisionInfo.isEmpty()).to.be.true;
      expect(revisionInfo.getDate()).to.be.undefined;
      expect(revisionInfo.getNumber()).to.be.undefined;
      expect(revisionInfo.getRemark()).to.be.undefined;
      expect(revisionInfo.date).to.be.undefined;
      expect(revisionInfo.number).to.be.undefined;
      expect(revisionInfo.remark).to.be.undefined;
    });

    it('should be able to retrieve structural content from file', () => {
      const doc = asciidoctor.loadFile(resolveFixture('documentblocks.adoc'));
      expect(doc.getDocumentTitle()).to.equal('Sample Document');
      const header = doc.getHeader();
      expect(header.level).to.equal(0);
      expect(header.title).to.equal('Sample Document');
      expect(header.getAttribute('revdate')).to.equal('2013-05-20');
      expect(header.getAttribute('revnumber')).to.equal('1.0');
      expect(header.getAttribute('revremark')).to.equal('First draft');

      expect(doc.getRevisionDate()).to.equal('2013-05-20');
      expect(doc.getRevisionNumber()).to.equal('1.0');
      expect(doc.getRevisionRemark()).to.equal('First draft');

      expect(doc.hasRevisionInfo()).to.be.true;
      const revisionInfo = doc.getRevisionInfo();
      expect(revisionInfo.isEmpty()).false;
      expect(revisionInfo.getDate()).to.equal('2013-05-20');
      expect(revisionInfo.getNumber()).to.equal('1.0');
      expect(revisionInfo.getRemark()).to.equal('First draft');
      expect(revisionInfo.date).to.equal('2013-05-20');
      expect(revisionInfo.number).to.equal('1.0');
      expect(revisionInfo.remark).to.equal('First draft');

      expect(header.getAttribute('tags')).to.equal('[document, example]');
      expect(header.getAttribute('author')).to.equal('Doc Writer');
      expect(header.getAttribute('email')).to.equal('doc.writer@asciidoc.org');

      expect(doc.hasBlocks()).to.be.true;
      const blocks = doc.getBlocks();
      expect(blocks.length).to.equal(4);
      expect(blocks[0].getContext()).to.equal('section');
      expect(blocks[0].getTitle()).to.equal('Abstract');
      expect(blocks[0].getCaptionedTitle()).to.equal('Abstract');
      expect(blocks[0].getBlocks().length).to.equal(1);
      expect(blocks[0].getBlocks()[0].getStyle()).to.equal('abstract');
      expect(blocks[0].getBlocks()[0].getContext()).to.equal('open');

      expect(blocks[1].getTitle()).to.equal('First Section');
      expect(blocks[1].getId()).to.equal('_first_section');
      expect(blocks[1].getContext()).to.equal('section');
      expect(blocks[1].getBlocks().length).to.equal(5);

      expect(blocks[1].getBlocks()[1].getId()).to.equal('blockid');
      expect(blocks[1].getBlocks()[1].getStyle()).to.equal('quote');
      expect(blocks[1].getBlocks()[1].getAttribute('attribution')).to.equal('Abraham Lincoln');
      expect(blocks[1].getBlocks()[1].getSourceLines()).to.have.members(['This is a quote.', 'It has a title, id, and attribution.']);
      expect(blocks[1].getBlocks()[1].getSource()).to.equal('This is a quote.\nIt has a title, id, and attribution.');

      expect(blocks[1].getBlocks()[2].getContext()).to.equal('ulist');
      expect(blocks[1].getBlocks()[2].getRole()).to.equal('feature-list');
      expect(blocks[1].getBlocks()[2].getItems().length).to.equal(4);
      expect(blocks[1].getBlocks()[2].getItems()[0].getText()).to.equal('<em>lightweight</em>');
      blocks[1].getBlocks()[2].getItems()[0].setText('*heavyweight*');
      expect(blocks[1].getBlocks()[2].getItems()[0].getText()).to.equal('<strong>heavyweight</strong>');

      expect(blocks[2].getTitle()).to.equal('Second Section');
      expect(blocks[2].getBlocks().length).to.equal(3);

      expect(blocks[2].getBlocks()[0].getContext()).to.equal('image');
      expect(blocks[2].getBlocks()[0].getTitle()).to.be.undefined;
      expect(blocks[2].getBlocks()[1].getContext()).to.equal('image');

      expect(blocks[3].hasBlocks()).to.be.false;
      expect(blocks[3].getTitle()).to.equal('Got <span class="icon">[file pdf o]</span>?');
    });

    it('should be able to find blocks', () => {
      const doc = asciidoctor.loadFile(resolveFixture('documentblocks.adoc'));
      const quoteBlocks = doc.findBy((b) => b.getStyle() === 'quote');
      expect(quoteBlocks.length).to.equal(1);

      const sectionBlocks = doc.findBy({'context': 'section'});
      expect(sectionBlocks.length).to.equal(5);

      const abstractSectionBlocks = doc.findBy({'context': 'section'}, (b) => b.getTitle() === 'Second Section');
      expect(abstractSectionBlocks.length).to.equal(1);
    });

    it('should be able to find blocks with line number', () => {
      const doc = asciidoctor.loadFile(resolveFixture('documentblocks.adoc'), {sourcemap: true});
      const blocks = doc.findBy(() => true);
      expect(blocks.length).to.equal(26);

      const blocksWithLineNumber = doc.findBy((b) => typeof b.getLineNumber() !== 'undefined');
      // since https://github.com/asciidoctor/asciidoctor/commit/46700a9c12d1cfe551db2790dd232baa0bec8195
      // When the sourcemap option is specified, the source location (and as a consequence the line number) is defined on the Document object.
      expect(blocksWithLineNumber.length >= 18).to.be.true;
    });
  });

  describe('Converting file', () => {
    it('should not hang', () => {
      const content = 'Link the system library `+libconfig++.so.9+` located at `+/usr/lib64/libconfig++.so.9+`.';
      asciidoctor.convert(content);
    });

    it('should be able to convert a file', () => {
      const expectFilePath = resolveFixture('test.html');
      removeFile(expectFilePath);
      try {
        asciidoctor.convertFile(resolveFixture('test.adoc'));
        expect(fileExists(expectFilePath)).to.be.true;
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).to.contain('Hello world');
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
        expect(fileExists(expectFilePath)).to.be.true;
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).to.contain('fixtures/css/simple.css');
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
        expect(fileExists(expectFilePath)).to.be.true;
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).to.contain('h1 { color: #4078c0; }');
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
        expect(fileExists(expectFilePath)).to.be.true;
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).to.contain('Hello world');
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
        expect(fileExists(expectFilePath)).to.be.true;
        const content = fs.readFileSync(expectFilePath, 'utf8');
        expect(content).to.contain('Hello world');
      } finally {
        removeFile(expectFilePath);
      }
    });

    it('should be able to apply default inline substitutions to text', () => {
      const doc = asciidoctor.load('para', { attributes: { start: 'start', finish: 'finish' } });
      const para = doc.getBlocks()[0];
      expect(para.applySubstitutions('{start}--{finish}')).to.equal('start&#8212;&#8203;finish');
    });

    it('should be able to apply specific inline substitutions to text', () => {
      const doc = asciidoctor.load('para', { attributes: { start: 'start', finish: 'finish' } });
      const para = doc.getBlocks()[0];
      expect(para.applySubstitutions('{start}--{finish}', ['attributes'])).to.equal('start--finish');
    });

    describe('Extension', () => {

      describe('Registry', () => {
        it('should return empty hash of groups if no extensions are registered', () => {
          const groups = asciidoctor.Extensions.getGroups();
          expect(groups).to.be.instanceof(Object);
          expect(Object.keys(groups).length).to.equal(0);
        });

        it('should not fail to unregister extension groups if no extensions are defined', () => {
          asciidoctor.Extensions.unregister('no-such-group');
        });

        it('should be able to unregister a single statically-registered extension group', () => {
          const extensions = asciidoctor.Extensions;
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
            expect(groups).to.be.instanceof(Object);
            expect(Object.keys(groups).length).to.equal(1);
            expect('test' in groups).to.be.true;
            let html = asciidoctor.convert('test::[]');
            expect(html).to.contain('<p>this was only a test</p>');
            extensions.unregister('test');
            html = asciidoctor.convert('test::[]');
            expect(html).to.contain('test::[]');
            expect(html).not.to.contain('<p>this was only a test</p>');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should be able to unregister multiple statically-registered extension groups', () => {
          const extensions = asciidoctor.Extensions;
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
            expect(groups).to.be.instanceof(Object);
            expect(Object.keys(groups).length).to.equal(3);
            expect(Object.keys(groups)).to.have.members(['test', 'foo', 'bar']);
            let html = asciidoctor.convert('test::[]\n\nfoo::[]\n\nbar::[]');
            expect(html).to.contain('<p>this was only a test</p>');
            expect(html).to.contain('<p>foo means foo</p>');
            expect(html).to.contain('<p>bar or bust</p>');
            extensions.unregister('foo', 'bar');
            groups = extensions.getGroups();
            expect(groups).to.be.instanceof(Object);
            expect(Object.keys(groups).length).to.equal(1);
            html = asciidoctor.convert('test::[]\n\nfoo::[]\n\nbar::[]');
            expect(html).to.contain('<p>this was only a test</p>');
            expect(html).to.contain('foo::[]');
            expect(html).to.contain('bar::[]');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should be able to unregister multiple statically-registered extension groups as Array', () => {
          const extensions = asciidoctor.Extensions;
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
            expect(groups).to.be.instanceof(Object);
            expect(Object.keys(groups).length).to.equal(2);
            expect(Object.keys(groups)).to.have.members(['foo', 'bar']);
            extensions.unregister(['foo', 'bar']);
            groups = extensions.getGroups();
            expect(groups).to.be.instanceof(Object);
            expect(Object.keys(groups).length).to.equal(0);
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should be able to unregister a single extension group from a custom registry', () => {
          const registry = asciidoctor.Extensions.create('test', function () {
            this.blockMacro(function () {
              this.named('test');
              this.process((parent) => {
                return this.createBlock(parent, 'paragraph', 'this was only a test');
              });
            });
          });
          const groups = registry.getGroups();
          expect(groups).to.be.instanceof(Object);
          expect('test' in groups).to.be.true;
          const opts = {extension_registry: registry};
          let html = asciidoctor.convert('test::[]', opts);
          expect(html).to.contain('<p>this was only a test</p>');
          registry.unregister('test');
          html = asciidoctor.convert('test::[]');
          expect(html).to.contain('test::[]');
          expect(html).not.to.contain('<p>this was only a test</p>');
        });

        it('should be able to unregister all extension groups from a custom registry', () => {
          const registry = asciidoctor.Extensions.create('test', function () {
            this.blockMacro(function () {
              this.named('test');
              this.process((parent) => {
                return this.createBlock(parent, 'paragraph', 'this was only a test');
              });
            });
          });
          const groups = registry.getGroups();
          expect(groups).to.be.instanceof(Object);
          expect('test' in groups).to.be.true;
          const opts = {extension_registry: registry};
          let html = asciidoctor.convert('test::[]', opts);
          expect(html).to.contain('<p>this was only a test</p>');
          registry.unregisterAll();
          html = asciidoctor.convert('test::[]');
          expect(html).to.contain('test::[]');
          expect(html).not.to.contain('<p>this was only a test</p>');
        });
      });

      describe('Post processor', () => {
        it('should be able to process foo bar postprocessor extension', () => {
          const registry = asciidoctor.Extensions.create();
          const opts = {extension_registry: registry};
          require('../share/extensions/foo-bar-postprocessor.js')(registry);
          const resultWithExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('foo-bar-postprocessor-ex.adoc')), opts);
          expect(resultWithExtension).to.contain('bar, qux, bar.');
          expect(resultWithExtension).not.to.contain('foo');

          const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('foo-bar-postprocessor-ex.adoc')));
          expect(resultWithoutExtension).to.contain('foo, qux, foo.');
          expect(resultWithoutExtension).not.to.contain('bar');
        });
      });

      describe('Tree processor', () => {
        it('should be able to process love tree processor extension', () => {
          const registry = asciidoctor.Extensions.create();
          const opts = {extension_registry: registry};
          require('../share/extensions/love-tree-processor.js')(registry);
          const resultWithExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('love-tree-processor-ex.adoc')), opts);
          expect(resultWithExtension).to.contain('Made with icon:heart[]');

          const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('love-tree-processor-ex.adoc')));
          expect(resultWithoutExtension).to.contain('How this document was made ?');
        });
      });

      describe('Preprocessor', () => {
        it('should be able to process draft preprocessor extension', () => {
          const registry = asciidoctor.Extensions.create();
          const opts = {extension_registry: registry};
          require('../share/extensions/draft-preprocessor.js')(registry);
          const doc = asciidoctor.load(fs.readFileSync(resolveFixture('draft-preprocessor-ex.adoc')), opts);
          expect(doc.getAttribute('status')).to.equal('DRAFT');
          const result = doc.convert();
          expect(result).to.contain('Important');
          expect(result).to.contain('This section is a draft: we need to talk about Y.');
        });
      });

      describe('Docinfo processor', () => {
        it('should be able to process moar footer docinfo processor extension', () => {
          const registry = asciidoctor.Extensions.create();
          const opts = {safe: 'server', header_footer: true, extension_registry: registry};
          require('../share/extensions/moar-footer-docinfo-processor.js')(registry);
          const resultWithExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('moar-footer-docinfo-processor-ex.adoc')), opts);
          expect(resultWithExtension).to.contain('moar footer');

          const resultWithoutExtension = asciidoctor.convert(fs.readFileSync(resolveFixture('moar-footer-docinfo-processor-ex.adoc')));
          expect(resultWithoutExtension).not.to.contain('moar footer');
        });
      });

      describe('Block processor', () => {
        it('should be able to create, instantiate and register a block processor class', () => {
          const registry = asciidoctor.Extensions.create();
          var ShoutBlockProcessor = asciidoctor.Extensions.createBlockProcessor('ShoutBlockProcessor', {
            process: function (parent, reader) {
              const lines = reader.getLines().map((l) => l.toUpperCase());
              return this.createBlock(parent, 'paragraph', lines);
            }
          });
          registry.block('shout', ShoutBlockProcessor.$new());
          const opts = {extension_registry: registry};
          const result = asciidoctor.convert(fs.readFileSync(resolveFixture('shout-block-ex.adoc')), opts);
          expect(result).to.contain('<p>SAY IT LOUD.\nSAY IT PROUD.</p>');
        });

        it('should be able to process custom block', () => {
          try {
            require('../share/extensions/shout-block.js');
            const result = asciidoctor.convert(fs.readFileSync(resolveFixture('shout-block-ex.adoc')));
            expect(result).to.contain('<p>SAY IT LOUD.\nSAY IT PROUD.</p>');
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
            expect(result).to.contain('<p>cloaked: paragraph</p>');
            expect(result).to.contain('<p>cloaked: literal</p>');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
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
          expect(result).to.contain('we have liftoff.');
        });

        it('should be able to append a block to the parent block', () => {
          const extensions = asciidoctor.Extensions;
          try {
            extensions.register('test', function () {
              this.block(function () {
                this.named('test');
                this.onContext('paragraph');
                this.process((parent) => {
                  parent.append(this.createBlock(parent, 'paragraph', 'this was only a test'));
                });
              });
            });
            let html = asciidoctor.convert('[test]\nreplace me');
            expect(html).to.contain('<p>this was only a test</p>');
            extensions.unregister('test');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });
      });

      describe('Inline macro processor', () => {
        it('should be able to process smiley extension', () => {
          try {
            require('../share/extensions/smiley-inline-macro.js');
            const result = asciidoctor.convert(fs.readFileSync(resolveFixture('smiley-inline-macro-ex.adoc')));
            expect(result).to.contain('<strong>:D</strong>');
            expect(result).to.contain('<strong>;)</strong>');
            expect(result).to.contain('<strong>:)</strong>');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should be able to process emoji inline macro processor extension', () => {
          const registry = asciidoctor.Extensions.create();
          const opts = {extension_registry: registry};
          require('../share/extensions/emoji-inline-macro.js')(registry);
          const result = asciidoctor.convert(fs.readFileSync(resolveFixture('emoji-inline-macro-ex.adoc')), opts);
          expect(result).to.contain('1f422.svg');
          expect(result).to.contain('2764.svg');
          expect(result).to.contain('twemoji.maxcdn.com');
        });
      });

      describe('Block processor', () => {
        it('should be able to process lorem extension', () => {
          try {
            require('../share/extensions/lorem-block-macro.js');
            const result = asciidoctor.convert(fs.readFileSync(resolveFixture('lorem-block-macro-ex.adoc')));
            expect(result).to.contain('Lorem ipsum dolor sit amet');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
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
          expect(result).to.contain('<img src="image-name.png" alt="image name">');
        });
      });

      describe('Include processor', () => {
        it('should process a custom include processor when target does match', () => {
          try {
            require('../share/extensions/foo-include.js');
            const result = asciidoctor.convert(fs.readFileSync(resolveFixture('foo-include-ex.adoc')));
            expect(result).to.contain('foo\nfoo');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should not process custom include processor when target does not match', () => {
          try {
            require('../share/extensions/foo-include.js');
            const result = asciidoctor.convert(fs.readFileSync(resolveFixture('bar-include-ex.adoc')));
            expect(result).to.contain('bar');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should be able to register an include processor class', () => {
          try {
            const LoremIncludeProcessor = require('../share/extensions/include-processor-class.js');
            asciidoctor.Extensions.register(function () {
              this.includeProcessor(LoremIncludeProcessor);
            });
            const html = asciidoctor.convert('include::fake.adoc[]', {safe: 'safe'});
            expect(html).to.contain('Lorem ipsum');
          } finally {
            asciidoctor.Extensions.unregisterAll();
          }
        });

        it('should be able to create and register an include processor class', () => {
          const registry = asciidoctor.Extensions.create();
          registry.includeProcessor(asciidoctor.Extensions.createIncludeProcessor('StaticIncludeProcessor', {
            process: (doc, reader, target, attrs) => {
              reader.pushInclude(['included content'], target, target, 1, attrs);
            }
          }));
          const opts = {};
          opts['extension_registry'] = registry;
          opts['safe'] = 'safe';
          const result = asciidoctor.convert('include::whatever.adoc[]', opts);
          expect(result).to.contain('included content');
        });

        it('should be able to register an include processor class with a state', () => {
          const registry = asciidoctor.Extensions.create();
          const $callback = Symbol('callback');
          let includeProcessor = asciidoctor.Extensions.createIncludeProcessor('StaticIncludeProcessor', {
            postConstruct: function () {
              this[$callback] = (value => 'you should ' + value);
            },
            process: function (doc, reader, target, attrs) {
              reader.pushInclude([this[$callback]('pass')], target, target, 1, attrs);
            }
          });
          let includeProcessorInstance = includeProcessor.$new();
          registry.includeProcessor(includeProcessorInstance);
          const opts = {};
          opts['extension_registry'] = registry;
          opts['safe'] = 'safe';
          const result = asciidoctor.convert('include::whatever.adoc[]', opts);
          expect(result).to.contain('you should pass');
        });

        it('should be able to register an include processor class with a postConstruct and a custom initialize function', () => {
          const registry = asciidoctor.Extensions.create();
          let includeProcessor = asciidoctor.Extensions.createIncludeProcessor('StaticIncludeProcessor', {
            initialize: function (value) {
              this.value = value;
              this.super();
            },
            postConstruct: function () {
              this.bar = 'bar';
            },
            process: function (doc, reader, target, attrs) {
              reader.pushInclude([this.value + this.bar], target, target, 1, attrs);
            }
          });
          let includeProcessorInstance = includeProcessor.$new('foo');
          registry.includeProcessor(includeProcessorInstance);
          const opts = {};
          opts['extension_registry'] = registry;
          opts['safe'] = 'safe';
          const result = asciidoctor.convert('include::whatever.adoc[]', opts);
          expect(result).to.contain('foobar');
        });

        it('should be able to register an include processor instance', () => {
          const registry = asciidoctor.Extensions.create();
          registry.includeProcessor(asciidoctor.Extensions.newIncludeProcessor('StaticIncludeProcessor', {
            process: function (doc, reader, target, attrs) {
              reader.pushInclude(['included content'], target, target, 1, attrs);
            }
          }));
          const opts = {};
          opts['extension_registry'] = registry;
          opts['safe'] = 'safe';
          const result = asciidoctor.convert('include::whatever.adoc[]', opts);
          expect(result).to.contain('included content');
        });

        it('should be able to create the Fedora package inline macro', () => {
          const PackageInlineMacro = asciidoctor.Extensions.createInlineMacroProcessor('PackageInlineMacro', {
            initialize: function (name, config) {
              this.DEFAULT_PACKAGE_URL_FORMAT = 'https://apps.fedoraproject.org/packages/%s';
              this.super(name, config);
            },
            process: function (parent, target) {
              const format = parent.getDocument().getAttribute('url-package-url-format', this.DEFAULT_PACKAGE_URL_FORMAT);
              const url = format.replace('%s', target);
              const content = target;
              const attributes = { window: '_blank' };
              return this.createInline(parent, 'anchor', content, { type: 'link', target: url, attributes });
            }
          });
          const registry = asciidoctor.Extensions.create();
          registry.inlineMacro(PackageInlineMacro.$new('package', {}));
          const opts = {};
          opts['extension_registry'] = registry;
          opts['safe'] = 'safe';
          const result = asciidoctor.convert('Install package:asciidoctor[]', opts);
          expect(result).to.contain('Install <a href="https://apps.fedoraproject.org/packages/asciidoctor" target="_blank" rel="noopener">asciidoctor</a>');
        });
      });
    });

    it('should be able to convert a file and include the default stylesheet', () => {
      const options = {safe: 'safe', header_footer: true};
      const html = asciidoctor.convert('=== Test', options);
      expect(html).to.contain('Asciidoctor default stylesheet');
      expect(html).to.contain('Test');
    });

    it('should include a file with a relative path', () => {
      const options = {safe: 'unsafe', header_footer: false, 'to_file': false};
      const html = asciidoctor.convertFile('spec/fixtures/chapter-01/index.adoc', options);
      expect(html).to.contain('We recommend to use version 1.2.3');
    });

    it('should include a file as a UTF-8 file', () => {
      var options = {safe: 'unsafe', header_footer: false, 'to_file': false};
      var html = asciidoctor.convertFile('spec/fixtures/encoding.adoc', options);
      expect(html).to.contain('À propos des majuscules accentuées');
      expect(html).to.contain('Le français c&#8217;est pas compliqué :)');
    });

    it('should issue a warning if an include file is not found', () => {
      const options = {safe: 'safe', header_footer: true};
      const html = asciidoctor.convert('= Test\n\ninclude::nonexistent.adoc[]', options);
      expect(html).to.contain('Test');
      expect(html).to.contain('Unresolved directive');
      expect(html).to.contain('include::nonexistent.adoc[]');
    });

    it('Should include file with a relative path (base_dir is not defined)', function () {
      const opts = {safe: 'safe'};
      const html = asciidoctor.convert('include::spec/fixtures/include.adoc[]', opts);
      expect(html).to.contain('include content');
    });

    it('Should include file with an absolute path (base_dir is explicitly defined)', function () {
      const opts = {safe: 'safe', base_dir: testOptions.baseDir};
      const html = asciidoctor.convert('include::' + testOptions.baseDir + '/spec/fixtures/include.adoc[]', opts);
      expect(html).to.contain('include content');
    });

    it('should be able to convert a file and embed an image', () => {
      const options = {safe: 'safe', header_footer: true};
      const content = fs.readFileSync(path.resolve(__dirname, '../fixtures/image.adoc'), 'utf8');
      const html = asciidoctor.convert(content, options);
      expect(html).to.contain('French frog');
      expect(html).to.contain('data:image/jpg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/7SMwU');
    });

    it('should be able to convert a buffer', () => {
      const options = {safe: 'safe', header_footer: true};
      const content = fs.readFileSync(resolveFixture('test.adoc'));
      const html = asciidoctor.convert(content, options);
      expect(html).to.contain('Hello world');
    });
  });
});
