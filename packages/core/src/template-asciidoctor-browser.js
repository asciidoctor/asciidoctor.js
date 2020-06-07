//{{opalCode}}

export default function Asciidoctor(moduleConfig) {
//{{asciidoctorCode}}

//{{asciidoctorAPI}}

//{{asciidoctorVersion}}

  /**
   * Get Asciidoctor.js version number.
   *
   * @memberof Asciidoctor
   * @returns {string} - returns the version number of Asciidoctor.js.
   */
  Opal.Asciidoctor.prototype.getVersion = function () {
    return ASCIIDOCTOR_JS_VERSION
  }
  return Opal.Asciidoctor
}
