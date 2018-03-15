require 'asciidoctor/js/opal_ext/file'
require 'asciidoctor/js/opal_ext/match_data'
require 'asciidoctor/js/opal_ext/kernel'
require 'asciidoctor/js/opal_ext/thread_safe'
require 'asciidoctor/js/opal_ext/string'
require 'asciidoctor/js/opal_ext/uri'

%x(
// Load common modules
Opal.load("pathname");
Opal.load("base64");

// Load specific implementation
//{{asciidoctorRuntimeEnvironment}}
)
