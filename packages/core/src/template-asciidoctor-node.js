/* global Asciidoctor, ASCIIDOCTOR_JS_VERSION */
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

import Opal from 'asciidoctor-opal-runtime'
import unxhr from 'unxhr'

const __path__ = path
const __XMLHttpRequest__ = unxhr.XMLHttpRequest
const __asciidoctorDistDir__ = path.dirname(fileURLToPath(import.meta.url))
const __require__ = createRequire(import.meta.url)

export default function (moduleConfig) {
//{{asciidoctorCode}}

//{{asciidoctorAPI}}

//{{asciidoctorVersion}}

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
}
