if (typeof Opal === 'undefined' && typeof module === 'object' && module.exports) {
  Opal = require('opal-runtime').Opal;
}

if (typeof Opal === 'undefined') {
//#{opalCode}
  Opal.require('opal');
}

// UMD Module
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory;
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register a named module.
    define('asciidoctor', ['module'], function (module) {
      return factory(module.config());
    });
  } else {
    // Browser globals (root is window)
    root.Asciidoctor = factory;
  }
// eslint-disable-next-line no-unused-vars
}(this, function (moduleConfig) {
//#{asciidoctorCode}

//#{asciidoctorAPI}

//#{asciidoctorVersion}

  /**
   * Get Asciidoctor.js version number.
   *
   * @memberof Asciidoctor
   * @returns {string} - returns the version number of Asciidoctor.js.
   */
  Asciidoctor.$$proto.getVersion = function () {
    return ASCIIDOCTOR_JS_VERSION;
  };
  return Opal.Asciidoctor;
}));
