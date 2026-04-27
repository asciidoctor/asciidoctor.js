import { MemoryLogger, LoggerManager, convert } from '@asciidoctor/core'

const memoryLogger = MemoryLogger.create()
LoggerManager.setLogger(memoryLogger)

await convert('some content')
const errorMessage = memoryLogger.getMessages()[0]
console.log(errorMessage.getSeverity())   // 'ERROR'
console.log(errorMessage.getText())       // 'invalid part, must have at least one section...'
const sourceLocation = errorMessage.getSourceLocation()
if (sourceLocation) {
  console.log(sourceLocation.getLineNumber())  // 8
  console.log(sourceLocation.getFile())        // undefined
  console.log(sourceLocation.getDirectory())   // process.cwd()
  console.log(sourceLocation.getPath())        // '<stdin>'
}