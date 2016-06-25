%x(
  var isNode = typeof module !== 'undefined' && module.exports,
      isElectron = typeof process === 'object' && process.versions === 'object' && process.versions.electron === 'string',
      isBrowser = typeof window !== 'undefined' || typeof importScripts === 'function',
      isNashorn = typeof Java !== 'undefined' && Java.type,
      isRhino = typeof java !== 'undefined',
      value;

  // The order of the if statements is important because 'module' will be defined in a Browserify environment
  if (isBrowser) {
    value = 'browser';
  }
  else if (isNode) {
    if (isElectron) {
      value = 'node-electron';
    } else {
      value = 'node';
    }
  }
  else if (isNashorn) {
    value = 'java-nashorn';
  }
  else if (isRhino) {
    value = 'java-rhino';
  }
  else {
    // standalone most likely SpiderMonkey
    value = 'standalone';
  }
)
JAVASCRIPT_PLATFORM = %x(value)
require 'strscan'
require 'asciidoctor/opal_ext/file'
require 'asciidoctor/opal_ext/match_data'
require 'asciidoctor/opal_ext/kernel'

case JAVASCRIPT_PLATFORM
  when 'java-nashorn'
    require 'asciidoctor/opal_ext/nashorn/io'
  when 'node-electron'
    require 'asciidoctor/opal_ext/electron/io'
  else
end
