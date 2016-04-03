%x(
  var isNode = typeof module !== 'undefined' && module.exports,
      isBrowser = typeof window !== 'undefined',
      isNashorn = typeof Java !== 'undefined' && Java.type,
      isRhino = typeof java !== 'undefined',
      value;


  // With browserify we can use module and XMLHttpRequest, so for node
  // we must test that we have not XMLHttpRequest
  if (isNode && !isBrowser) {
    value = 'node';
  }
  else if (isBrowser) {
  // or we can check for document
  //else if (typeof document !== 'undefined' && document.nodeType) {
    value = 'browser';
  }
  else if (isNashorn) {
    value = 'java-nashorn';
  }
  else if (isRhino) {
    value = 'java-rhino';
  }
  else {
    // standalone is likely SpiderMonkey
    value = 'standalone';
  }
  // Extra lines to debug tests
  // console.log('====== opal_ext.rb - Comment this block of logs, it\'s just for debug');
  // console.log('====== JAVASCRIPT_PLATFORM ========== ', value);
  // console.log('====== Value of isBrowser ', !!isBrowser);
  // console.log('====== Value of isNode ', !!isNode);
)
JAVASCRIPT_PLATFORM = %x(value)
require 'strscan'
require 'asciidoctor/opal_ext/file'
require 'asciidoctor/opal_ext/match_data'
require 'asciidoctor/opal_ext/kernel'

case JAVASCRIPT_PLATFORM
  when 'java-nashorn'
    require 'asciidoctor/opal_ext/nashorn/io'
  else
end
