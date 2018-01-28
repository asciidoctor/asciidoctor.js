//{{opalCode}}
Opal.require('opal');

// Nashorn Module
(function (root, factory) {
  // globals (root is window)
  root.Asciidoctor = factory;
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
  Asciidoctor.$$proto.getVersion = function () {
    return ASCIIDOCTOR_JS_VERSION;
  };
  return Opal.Asciidoctor;
}));
