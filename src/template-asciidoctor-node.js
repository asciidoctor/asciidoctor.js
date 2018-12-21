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

  const fs = require('fs')

  const readFile = (fileName) => {
    return new Promise(function (resolve, reject) {
      fs.readFile(fileName, 'utf8', (err, data) => {
        err ? reject(err) : resolve(data)
      })
    })
  }

  const resolveSafeMode = (options) => {
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

  const processLine = async function (index, lines) {
    const line = lines[index]
    if (line.endsWith(']') && !line.startsWith('[') && line.includes('::')) {
      const conditionDirectiveMatch = ConditionalDirectiveRx.exec(line)
      if (line.includes('if') && conditionDirectiveMatch[0] !== null) {
        // TODO: handle conditional directive
      } else {
        const includeDirectiveMatch = IncludeDirectiveRx.exec(line)
        if ((line.startsWith('inc') || line.startsWith('\\inc')) && includeDirectiveMatch[0] !== null) {
          const target = includeDirectiveMatch[2]
          const attrs = includeDirectiveMatch[3]
          // TODO: handle escaped include directive
          // TODO: trigger include processor
          // TODO: handle include lines and include tags
          // TODO: handle URI
          // TODO: handle level (recursive)
          try {
            let content = await readFile(target)
            content = content.replace(/\n$/, '') // remove newline at end of file
            lines[index] = content
          } catch (error) {
            console.warn(`include file not readable: ${target}`) // FIXME: Use Logger
            lines[index] = `Unresolved directive in <stdin> - include::${target}[${attrs || ''}]`
          }
        }
      }
    }
  }

  Asciidoctor.prototype.convertAsync = async function (input, options) {
    if (typeof input === 'object' && input.constructor.name === 'Buffer') {
      input = input.toString('utf8')
    }
    const safeMode = resolveSafeMode(options)
    if (safeMode < 20) {
      const lines = input.split(LF)
      const linesLength = lines.length
      for (let i = 0; i < linesLength; i++) {
        await processLine(i, lines)
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
