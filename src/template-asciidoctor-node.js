/* global Opal, Asciidoctor, ASCIIDOCTOR_JS_VERSION */
const functionCall = Function.call
const Opal = require('opal-runtime').Opal
// save and restore Function.call until https://github.com/opal/opal/issues/1846 is fixed
Function.call = functionCall;

// Node module
(function (root, factory) {
  module.exports = factory
}(this, function (moduleConfig) {
//{{asciidoctorCode}}

//{{asciidoctorAPI}}

//{{asciidoctorVersion}}

  const ConditionalDirectiveRx = /^(\\)?(ifdef|ifndef|ifeval|endif)::(\S*?(?:([,+])\S*?)?)\[(.+)?\]$/
  const IncludeDirectiveRx = /^(\\)?include::([^\[][^\[]*)\[(.+)?\]$/
  const LF = '\n'
  const ASCIIDOC_EXTENSIONS = {
    '.adoc': true,
    '.asciidoc': true,
    '.asc': true,
    '.ad': true
  }
  const ATTR_REF_HEAD = '{'

  const fs = require('fs')
  const path = require('path')

  const readFile = (fileName) => {
    return new Promise(function (resolve, reject) {
      fs.readFile(fileName, 'utf8', (err, data) => {
        err ? reject(err) : resolve(data)
      })
    })
  }

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

  const hasPreprocessorExtensions = (options) => {
    if (options) {
      const extensionRegistry = options.extension_registry
      if (extensionRegistry) {
        return extensionRegistry.hasPreprocessors()
      }
    }
    const extensionGroups = Opal.Asciidoctor.Extensions.getGroups
    // NOTE: we don't want to activate extensions
    // if there's at least one global extension registered we return true
    return extensionGroups && Object.keys(extensionGroups).length !== 0
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

  const getIncludeProcessorExtensions = (options) => {
    if (options) {
      const extensionRegistry = options.extension_registry
      if (extensionRegistry) {
        return extensionRegistry.getIncludeProcessors()
      }
    }
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

  const processLine = async function (index, lines, baseDir, includeProcessors, cache = {}) {
    const line = lines[index]
    if (line.endsWith(']') && !line.startsWith('[') && line.includes('::')) {
      const conditionDirectiveMatch = ConditionalDirectiveRx.exec(line)
      if (line.includes('if') && conditionDirectiveMatch[0] !== null) {
        return // we can't evaluate conditional include directive at this stage
      }
      const includeDirectiveMatch = IncludeDirectiveRx.exec(line)
      if ((line.startsWith('inc') || line.startsWith('\\inc')) && includeDirectiveMatch[0] !== null) {
        if (includeDirectiveMatch[1] === '\\') {
          return // we can't evaluate escaped include directive at this stage
        }
        const target = includeDirectiveMatch[2]
        if (target.includes(ATTR_REF_HEAD)) {
          return // we can't evaluate attribute at this stage
        }
        const attrs = includeDirectiveMatch[3]
        if (attrs) {
          if (attrs.includes(ATTR_REF_HEAD) || attrs.includes('leveloffset=')) {
            return // we can't evaluate attribute at this stage or handle leveloffset
          }
          return // NOTE: for now we don't support include directive with attributes
        }
        if (hasIncludeProcessorExtensions(includeProcessors, target)) {
          return // we can't evaluate include processor at this stage
        }
        const resolvedIncludePath = resolveIncludePath(target, baseDir)
        if (resolvedIncludePath) {
          if (resolvedIncludePath.type === 'file') {
            try {
              let content
              // NOTE: might be a bad idea since the OS has a (better) filesystem cache
              const targetPath = resolvedIncludePath.path
              if (cache[targetPath]) {
                content = cache[targetPath]
              } else {
                content = await readFile(targetPath)
                content = content.replace(/\n$/, '') // remove newline at end of file
                // If the file is an AsciiDoc document, check if the file contains an include directive
                if (ASCIIDOC_EXTENSIONS[path.extname(path.basename(targetPath))]) {
                  const includeLines = content.split(LF)
                  const includeLinesLength = includeLines.length
                  const result = []
                  for (let i = 0; i < includeLinesLength; i++) {
                    let includeLine = includeLines[i]
                    const includeDirectiveMatch = IncludeDirectiveRx.exec(includeLine)
                    if (includeLine.startsWith('inc') && includeDirectiveMatch[0] !== null) {
                      if (includeDirectiveMatch[1] === '\\') {
                        result.push(includeLine)
                        continue // the include directive is escaped, we do not need to update the relative target
                      }
                      const target = includeDirectiveMatch[2]
                      if (hasIncludeProcessorExtensions(includeProcessors, target)) {
                        cache[targetPath] = line
                        return // we can't evaluate include processor at this stage
                      }
                      // update the relative target
                      const resolvedIncludePath = resolveIncludePath(target, path.dirname(targetPath))
                      const attrs = includeDirectiveMatch[3]
                      const resolvedAbsoluteIncludePath = resolvedIncludePath.path
                      if (resolvedIncludePath.type === 'file') {
                        if (resolvedAbsoluteIncludePath.includes(ATTR_REF_HEAD)) {
                          // we can't evaluate attribute at this stage
                          result.push(`include::${resolvedAbsoluteIncludePath}[${includeDirectiveMatch[3] || ''}]`)
                        } else if (attrs) {
                          // NOTE: for now we don't support include directive with attributes
                          result.push(`include::${resolvedAbsoluteIncludePath}[${includeDirectiveMatch[3] || ''}]`)
                        } else {
                          result.push((await readFile(resolvedAbsoluteIncludePath)).replace(/\n$/, ''))
                        }
                      } else {
                        result.push(`include::${resolvedAbsoluteIncludePath}[${includeDirectiveMatch[3] || ''}]`)
                      }
                    } else {
                      result.push(includeLine)
                    }
                  }
                  content = result.join(LF)
                }
                cache[targetPath] = content
              }
              lines[index] = content
            } catch (error) {
              console.warn(`asciidoctor: ERROR: <stdin>: include file not readable: ${target}`) // FIXME: Use Logger
              lines[index] = `Unresolved directive in <stdin> - include::${target}[${attrs || ''}]`
            }
          } else if (resolvedIncludePath.type === 'http') {
            // NOTE: read file with http module
            // NOTE: we need to check options.attributes['allow-uri-read']
          } else if (resolvedIncludePath.type === 'https') {
            // NOTE: read file with https module
            // NOTE: we need to check options.attributes['allow-uri-read']
          }
          // NOTE: unsupported target
        }
      }
    }
  }

  Asciidoctor.prototype.convertAsync = async function (input, options) {
    if (typeof input === 'object' && input.constructor.name === 'Buffer') {
      input = input.toString('utf8')
    }
    const safeMode = resolveSafeMode(options)
    if (safeMode < 20 && !hasPreprocessorExtensions(options)) {
      const includeProcessors = getIncludeProcessorExtensions(options)
      const baseDir = getBaseDir(options)
      const lines = input.split(LF)
      const linesLength = lines.length
      for (let i = 0; i < linesLength; i++) {
        await processLine(i, lines, baseDir, includeProcessors)
      }
      input = lines.join(LF)
    }
    const result = this.$convert(input, prepareOptions(options))
    return result === Opal.nil ? '' : result
  }

  /**
   * Get Asciidoctor.js version number.
   *
   * @memberof Asciidoctor
   * @returns {string} - returns the version number of Asciidoctor.js.
   */
  Asciidoctor.prototype.getVersion = function () {
    return ASCIIDOCTOR_JS_VERSION
  }
  return Opal.Asciidoctor
}))
