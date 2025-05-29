/* global Asciidoctor, ASCIIDOCTOR_JS_VERSION */
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

import Opal from '@asciidoctor/opal-runtime'
import unxhr from 'unxhr'

const __path__ = path
const __XMLHttpRequest__ = unxhr.XMLHttpRequest
const __asciidoctorDistDir__ = path.dirname(fileURLToPath(import.meta.url))
const __require__ = createRequire(import.meta.url)

export default function (moduleConfig) {
//{{openUriCachedCode}}

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

  // Alias
  Opal.Asciidoctor.Cache = {
    disable: function () {
      const openUriSingleton = Opal.OpenURI.$singleton_class()
      if (Opal.OpenURI['$respond_to?']('original_open_uri')) {
        openUriSingleton.$send('remove_method', 'open_uri')
        openUriSingleton.$send('alias_method', 'open_uri', 'original_open_uri')
      }
    },
    clear: function() {
      if (typeof Opal.OpenURI.Cache['$clear'] === 'function') {
        Opal.OpenURI.Cache['$clear']()
      }
    },
    enable: function () {
      const result = Opal.require('open-uri/cached')
      const openUriSingleton = Opal.OpenURI.$singleton_class()
      openUriSingleton.$send('remove_method', 'open_uri')
      openUriSingleton.$send('alias_method', 'open_uri', 'cache_open_uri')
      return result
    },
    setMax: function (maxLength) {
      if (!Opal.OpenURI['$respond_to?']('cache_open_uri')) {
        this.enable()
      }
      if (typeof Opal.OpenURI.Cache['$max='] === 'function') {
        Opal.OpenURI.Cache['$max='](maxLength)
      }
    }
  }
  Opal.Asciidoctor.Cache.DEFAULT_MAX = 16000000

  return Opal.Asciidoctor
}
