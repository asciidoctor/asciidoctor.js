/* global Asciidoctor, ASCIIDOCTOR_JS_VERSION */
import * as std from 'std';
import * as os from 'os';

//{{opalCode}}

const __path__ = {
  separator: os.platform == "win32" ? '\\' : '/',
  split(path) { return path.split(this.separator); },
  join(compo) { return compo.join(this.separator); },
  basename(path) { return this.join(this.split(path).slice(0,-1)); },
  dirname(path) { return this.split(path).pop(); },
};
const __asciidoctorDistDir__ = os.realpath(scriptArgs[0])[0].match(os.platform == "win32" ? /.*\\/ : /.*\//);

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
