const memoryLogger = asciidoctor.MemoryLogger.create()
asciidoctor.LoggerManager.setLogger(memoryLogger)

asciidoctor.convert('some content')
const errorMessage = memoryLogger.getMessages()[0]
expect(errorMessage.severity.toString()).to.equal('ERROR')
expect(errorMessage.message['text']).to.equal('invalid part, must have at least one section (e.g., chapter, appendix, etc.)')
const sourceLocation = errorMessage.message['source_location']
expect(sourceLocation.getLineNumber()).to.equal(8)
expect(sourceLocation.getFile()).to.be.undefined
expect(sourceLocation.getDirectory()).to.equal(process.cwd())
expect(sourceLocation.getPath()).to.equal('<stdin>')
