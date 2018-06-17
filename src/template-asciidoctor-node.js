/* eslint-env node, es6 */
const Opal = require('opal-runtime').Opal;

// Node module
(function (root, factory) {
  module.exports = factory;
// eslint-disable-next-line no-unused-vars
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
    return ASCIIDOCTOR_JS_VERSION;
  };
  return Opal.Asciidoctor;
}));
