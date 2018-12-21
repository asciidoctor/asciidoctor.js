/* global Opal, Asciidoctor, toHash, fromHash, prepareOptions */
const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')

const ConditionalDirectiveRx = /^(\\)?(ifdef|ifndef|ifeval|endif)::(\S*?(?:([,+])\S*?)?)\[(.+)?]$/
const IncludeDirectiveRx = /^(\\)?include::([^[][^[]*)\[(.+)?]$/
const LF = '\n'
const ASCIIDOC_EXTENSIONS = {
  '.adoc': true,
  '.asciidoc': true,
  '.asc': true,
  '.ad': true
}

const readFile = (fileName) => {
  return new Promise(function (resolve, reject) {
    fs.readFile(fileName, 'utf8', (err, data) => {
      err ? reject(err) : resolve(data)
    })
  })
}

const getHttp = (uri) => {
  const httpModule = uri.startsWith('https://') ? https : http
  return new Promise(function (resolve, reject) {
    httpModule.get(uri, (res) => {
      const { statusCode } = res
      if (statusCode !== 200) {
        res.resume()
        reject(new Error(`Unable to get content from ${uri}. Status code: ${statusCode}.`))
        return
      }
      res.setEncoding('utf8')
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        resolve(data)
      })
    }).on('error', (e) => {
      reject(e)
    })
  })
}

const readHttp = (uri) => getHttp(uri)
const readHttps = (uri) => getHttp(uri)

const resolveSafeMode = (options) => {
  if (!options) {
    return 20 // secure
  }
  // safely resolve the safe mode from const, int or string
  const safeMode = options.safe
  if (!safeMode) {
    return 20 // secure
  }
  if (typeof safeMode === 'number') {
    // be permissive in case API user wants to define new levels
    return safeMode
  }
  if (typeof safeMode === 'string') {
    const safeModes = {
      'unsafe': 0,
      'safe': 1,
      'server': 10,
      'secure': 20
    }
    const result = safeModes[safeMode.toLocaleLowerCase()]
    if (result) {
      return result
    }
  }
  return 20 // secure
}

const hasIncludeProcessorExtensions = (includeProcessors, target) => {
  if (includeProcessors && includeProcessors.length > 0) {
    for (let i = 0; i < includeProcessors.length; i++) {
      if (includeProcessors[i].handles(target)) {
        return true
      }
    }
  }
  return false
}

const getBaseDir = (options) => {
  if (options && options.base_dir) {
    return path.resolve(options.base_dir)
  }
  return process.cwd().split(path.sep).join(path.posix.sep)
}

const resolveIncludePath = (target, baseDir) => {
  if (target.startsWith('http://')) {
    return { path: target, type: 'http' }
  }
  if (target.startsWith('https://')) {
    return { path: target, type: 'https' }
  }
  let result = target
  if (result.startsWith('file://')) {
    result = result.substring('file://'.length)
  }
  if (!path.isAbsolute(result)) {
    return { path: path.join(baseDir, result), type: 'file' }
  } else {
    return { path: result, type: 'file' }
  }
}

const readIncludeTarget = async (includeTarget, options) => {
  const targetPath = includeTarget.path
  try {
    const attributes = fromHash(options.attributes)
    if (includeTarget.type === 'file') {
      return await readFile(targetPath)
    } else if (includeTarget.type === 'http') {
      if (attributes && attributes['allow-uri-read']) {
        return await readHttp(targetPath)
      }
      return '' // bare link
    } else if (includeTarget.type === 'https') {
      if (attributes && attributes['allow-uri-read']) {
        return await readHttps(targetPath)
      }
      return '' // bare link
    } else {
      console.log(`Unsupported target type ${includeTarget.type}, ignoring the include directive`)
      return `unsupported target type ${includeTarget.type}`
    }
  } catch (error) {
    console.log(error.message)
    return `unable to read ${targetPath}`
  }
}

const recursivelyProcessUnconditionalInclude = async (doc, baseDir, content, vfs) => {
  const lines = content.split(LF)
  const options = doc.getOptions()
  const exts = doc.getParentDocument() ? undefined : doc.getExtensions()
  const includeProcessors = exts ? exts.getIncludeProcessors() : undefined
  const linesLength = lines.length
  let commentBlockTerminator
  for (let i = 0; i < linesLength; i++) {
    // TODO ignore ifndef, ifdef, ifeval until an endif is found
    const line = lines[i]
    if (commentBlockTerminator && line === commentBlockTerminator) {
      // comment block ends
      commentBlockTerminator = undefined
      continue
    } else {
      if (line.startsWith('///')) {
        if (line.length > 3 && line === '/'.repeat(line.length)) {
          // comment block starts
          commentBlockTerminator = line
          continue
        }
      }
    }
    if (line.endsWith(']') && !line.startsWith('[') && line.includes('::')) {
      const conditionDirectiveMatch = ConditionalDirectiveRx.exec(line)
      if (line.includes('if') && conditionDirectiveMatch[0] !== null) {
        continue // we can't evaluate conditional include directive at this stage
      }
      const includeDirectiveMatch = IncludeDirectiveRx.exec(line)
      if ((line.startsWith('inc') || line.startsWith('\\inc')) && includeDirectiveMatch[0] !== null) {
        if (includeDirectiveMatch[1] === '\\') {
          continue // we can't evaluate escaped include directive at this stage
        }
        const target = includeDirectiveMatch[2]
        if (hasIncludeProcessorExtensions(includeProcessors, target)) {
          continue // we can't evaluate include processor at this stage
        }
        const resolvedIncludeTarget = resolveIncludePath(target, baseDir)
        const targetPath = resolvedIncludeTarget.path
        if (!vfs[targetPath]) {
          const content = await readIncludeTarget(resolvedIncludeTarget, options)
          vfs[targetPath] = content
          if (ASCIIDOC_EXTENSIONS[path.extname(path.basename(targetPath))]) {
            await recursivelyProcessUnconditionalInclude(doc, path.dirname(targetPath), content, vfs)
          }
        }
      }
    }
  }
}

const processUnconditionalInclude = async (doc, input, vfs) => {
  const options = doc.getOptions()
  await recursivelyProcessUnconditionalInclude(doc, getBaseDir(options), input, vfs)
}

/**
 * /!\ Highly experimental API /!\
 */
Asciidoctor.prototype.convertAsync = async function (input, options) {
  options = options || {}
  options.parse = false
  if (typeof input === 'object' && input.constructor.name === 'Buffer') {
    input = input.toString('utf8')
  }
  let doc = this.load(input, options)
  // call the preprocessor extensions
  const exts = doc.getParentDocument() ? undefined : doc.getExtensions()
  if (exts && exts.hasPreprocessors()) {
    const preprocessors = exts.getPreprocessors()
    for (let j = 0; j < preprocessors.length; j++) {
      doc.reader = preprocessors[j]['$process_method']()['$[]'](doc, this.reader) || doc.reader
    }
  }
  const safeMode = resolveSafeMode(options)
  if (safeMode < 20) {
    // resolve the include directives, fetch the content and populate the "virtual file system"
    const vfs = {}
    await processUnconditionalInclude(doc, input, vfs)
    const docOptions = doc.getOptions()
    docOptions.vfs = toHash(vfs)
    doc.options = prepareOptions(docOptions)
  }

  Opal.Asciidoctor.Parser['$parse'](doc.reader, doc, toHash({ header_only: false }))
  doc['$restore_attributes']()

  if (exts && exts.hasTreeProcessors()) {
    const treeProcessors = exts.getTreeProcessors()
    let treeProcessorResult
    for (let j = 0; j < treeProcessors.length; j++) {
      treeProcessorResult = treeProcessors[j]['$process_method']()['$[]'](doc)
      if (treeProcessorResult && Opal.Asciidoctor.Document['$==='](treeProcessorResult) && treeProcessorResult['$!='](doc)) {
        doc = treeProcessorResult
      }
    }
  }
  const result = doc.convert(options)
  return result === Opal.nil ? '' : result
}
