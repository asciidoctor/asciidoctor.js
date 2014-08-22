require 'opal'

# NOTE we're no longer using ERB templates in Asciidoctor.js by default
# make Opal recognize .html.erb as valid ERB templates
#Tilt.register 'erb', Opal::ERB::Processor
#Sprockets.register_engine '.erb', Opal::ERB::Processor
#Sprockets.register_mime_type 'application/javascript', '.html'

minify   = ENV['MINIFY'] == '1'
compress = ENV['COMPRESS'] == '1'

task :default => :dist

desc 'Build opal.js and asciidoctor.js to build/'
task :dist do
  Opal::Processor.method_missing_enabled = false
  Opal::Processor.const_missing_enabled = false
  Opal::Processor.source_map_enabled = false
  Opal::Processor.dynamic_require_severity = :warning

  Dir.mkdir 'build' unless File.directory? 'build'

  env = Opal::Environment.new
  env.js_compressor = Sprockets::ClosureCompressor if minify
  #env['opal'].write_to "build/opal.js#{compress ? '.gz' : nil}"

  # Use use_gem if you want to build against a release
  env.use_gem 'asciidoctor'
  # If the Gemfile points to a git repo or local directory, be sure to use `bundle exec rake ...`
  # Use append_path if you want to build against a local clone
  #env.append_path 'asciidoctor/lib'

  #env['asciidoctor'].write_to "build/asciidoctor.js#{compress ? '.gz' : nil}"
  asciidoctor = env['asciidoctor']
  # NOTE hack to make version compliant with semver
  asciidoctor.instance_variable_set :@source, (asciidoctor.instance_variable_get :@source)
      .sub(/'VERSION', "(\d+\.\d+.\d+)\.(.*)"/, '\'VERSION\', "\1-\2"')
  asciidoctor.write_to "build/asciidoctor-core.js#{compress ? '.gz' : nil}"
  env['asciidoctor/extensions'].write_to "build/asciidoctor-extensions.js#{compress ? '.gz' : nil}"
  env['asciidoctor/converter/docbook45'].write_to "build/asciidoctor-docbook45.js#{compress ? '.gz' : nil}"
  env['asciidoctor/converter/docbook5'].write_to "build/asciidoctor-docbook5.js#{compress ? '.gz' : nil}"
  asciidoctor_spec = Gem::Specification.find_by_name 'asciidoctor'
  css_file = File.join asciidoctor_spec.full_gem_path, 'data/stylesheets/asciidoctor-default.css'
  File.copy_stream css_file, 'build/asciidoctor.css'
  File.copy_stream css_file, 'examples/asciidoctor.css'

end

desc 'Build asciidoctor_example.js to build/'
task :examples => :dist do
  Opal::Processor.method_missing_enabled = true
  Opal::Processor.const_missing_enabled = false
  Opal::Processor.source_map_enabled = false
  Opal::Processor.dynamic_require_severity = :warning

  env = Opal::Environment.new
  env.append_path 'examples'
  env['asciidoctor_example'].write_to 'build/asciidoctor_example.js'
  File.copy_stream 'examples/asciidoctor_example.html', 'build/asciidoctor_example.html'

  env['userguide_test'].write_to 'build/userguide_test.js'
  File.copy_stream 'examples/userguide_test.html', 'build/userguide_test.html'
  File.copy_stream 'README.adoc', 'build/README.adoc'

  File.copy_stream 'examples/asciidoctor.css', 'build/asciidoctor.css'

  Dir.mkdir 'build/images' unless File.directory? 'build/images'

  File.copy_stream 'error-in-chrome-console.png', 'build/images/error-in-chrome-console.png'
  File.copy_stream 'error-in-javascript-debugger.png', 'build/images/error-in-javascript-debugger.png'

  unless File.exist? 'build/userguide.adoc'
    require 'open-uri'
    userguide_uri = 'https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625/doc/asciidoc.txt'
    customers_uri = 'https://raw.githubusercontent.com/asciidoc/asciidoc/d43faae38c4a8bf366dcba545971da99f2b2d625/doc/customers.csv'
    userguide_content = open(userguide_uri) {|fd2| fd2.read }
    customers_content = open(customers_uri) {|fd2| fd2.read }
    File.open('build/userguide.adoc', 'w') {|fd1| fd1.write userguide_content }
    File.open('build/customers.csv', 'w') {|fd1| fd1.write customers_content }
  end
end
