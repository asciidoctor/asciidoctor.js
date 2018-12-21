require 'asciidoctor/converter/composite'
require 'asciidoctor/converter/html5'
require 'asciidoctor/extensions'

if JAVASCRIPT_IO_MODULE == 'xmlhttprequest'
  require 'asciidoctor/js/asciidoctor_ext/browser/reader'
  require 'asciidoctor/js/asciidoctor_ext/browser/abstract_node'
  require 'asciidoctor/js/asciidoctor_ext/browser/open_uri'
end
require 'asciidoctor/js/asciidoctor_ext/stylesheet'
