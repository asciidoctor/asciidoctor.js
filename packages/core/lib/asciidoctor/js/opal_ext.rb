require 'asciidoctor/js/opal_ext/kernel'
require 'asciidoctor/js/opal_ext/file'
require 'asciidoctor/js/opal_ext/match_data'
require 'asciidoctor/js/opal_ext/string'
require 'asciidoctor/js/opal_ext/uri'
require 'asciidoctor/js/opal_ext/base64'
require 'asciidoctor/js/opal_ext/number'

%x(
// suppress "not supported" warning messages from Opal
Opal.config.unsupported_features_severity = 'ignore'

// Load specific runtime
//{{requireOpalRuntimeExt}}
)
