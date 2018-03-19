require 'asciidoctor/converter/composite'
require 'asciidoctor/converter/html5'
require 'asciidoctor/extensions'

if JAVASCRIPT_IO_MODULE == 'xmlhttprequest'
  require 'asciidoctor/js/opal_ext/browser/reader'
end
