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

//{{asciidoctorNodeAPI}}

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
