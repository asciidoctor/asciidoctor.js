%x(
  var value;
  if (typeof module !== 'undefined' && module.exports) {
    value = 'node';
  }
  else if (typeof XMLHttpRequest !== 'undefined') {
  // or we can check for document
  //else if (typeof document !== 'undefined' && document.nodeType) {
    value = 'browser';
  }
  else if (typeof Java !== 'undefined' && Java.type) {
    value = 'java-nashorn';
  }
  else if (typeof java !== 'undefined') {
    value = 'java-rhino';
  }
  else {
    // standalone is likely SpiderMonkey
    value = 'standalone';
  }
)
JAVASCRIPT_PLATFORM = %x(value)
require 'strscan'
require 'asciidoctor/opal_ext/dir'
require 'asciidoctor/opal_ext/file'
require 'asciidoctor/opal_ext/match_data'
require 'asciidoctor/opal_ext/kernel'

case JAVASCRIPT_PLATFORM
  when 'java-nashorn'
    require 'asciidoctor/opal_ext/nashorn/io'
  else
end
