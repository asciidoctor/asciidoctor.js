require 'asciidoctor/converter/composite'
require 'asciidoctor/converter/html5'
require 'asciidoctor/extensions'

require 'asciidoctor/js/asciidoctor_ext'
require 'asciidoctor/js/opal_ext/logger' # override the built-in Logger

Asciidoctor::InlineLinkRx = %r((^|link:|#{Asciidoctor::CG_BLANK}|\\?&lt;(?=\\?(?:https?|file|ftp|irc)(:))|[>\(\)\[\];"'])(\\?(?:https?|file|ftp|irc)://)(?:([^\s\[\]]+)\[(|#{Asciidoctor::CC_ALL}*?[^\\])\]|(?!\2)([^\s]*?)&gt;|([^\s\[\]<]*([^\s,.?!\[\]<\)]))))
