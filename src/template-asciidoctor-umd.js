if (typeof Opal === 'undefined' && typeof module === 'object' && module.exports) {
  Opal = require('opal-runtime').Opal
}

if (typeof Opal === 'undefined') {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#Fundamental_objects
  var fundamentalObjects = [
    Function,
    Boolean,
    Error,
    Number,
    Date,
    String,
    RegExp,
    Array
  ]
  var backup = {}
  for (var index in fundamentalObjects) {
    var fundamentalObject = fundamentalObjects[index]
    backup[fundamentalObject.name] = {
      call: fundamentalObject.call,
      apply: fundamentalObject.apply,
      bind: fundamentalObject.bind
    }
  }

//{{opalCode}}

  // restore Function methods (see https://github.com/opal/opal/issues/1846)
  for (var index in fundamentalObjects) {
    var fundamentalObject = fundamentalObjects[index]
    var name = fundamentalObject.name
    if (typeof fundamentalObject.call !== 'function') {
      fundamentalObject.call = backup[name].call
    }
    if (typeof fundamentalObject.apply !== 'function') {
      fundamentalObject.apply = backup[name].apply
    }
    if (typeof fundamentalObject.bind !== 'function') {
      fundamentalObject.bind = backup[name].bind
    }
  }
}

// UMD Module
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register a named module.
    define('asciidoctor', ['module'], function (module) {
      return factory(module.config())
    })
  } else {
    // Browser globals (root is window)
    root.Asciidoctor = factory
  }
}(this, function (moduleConfig) {
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
}))
