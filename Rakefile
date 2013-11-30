require 'opal'
require 'opal-sprockets'

# make Opal recognize .html.erb as valid ERB templates
# is there a better way?
Tilt.register 'erb', Opal::ERB::Processor
Sprockets.register_engine '.erb', Opal::ERB::Processor
Sprockets.register_mime_type 'application/javascript', '.html'

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

  # Replace sub! and gsub! because String are immutable in Javascript
  Dir.glob("asciidoctor/lib/**/*.rb") do |source_file|
    original = File.read source_file
    replacement = original.gsub(/([a-z]+).(sub|gsub)!/, '\1 = \1.\2')
    if replacement.length > original.length
      File.open(source_file, 'w') {|file| file.puts replacement}
    end
  end

  env = Opal::Environment.new
  env.js_compressor = Sprockets::ClosureCompressor if minify
  env['opal'].write_to "build/opal.js#{compress ? '.gz' : nil}"

  env.append_path 'asciidoctor/lib'
  env.append_path 'templates'
  env['asciidoctor'].write_to "build/asciidoctor.js#{compress ? '.gz' : nil}"
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
  File.copy_stream 'examples/asciidoctor.css', 'build/asciidoctor.css'

  Dir.mkdir 'build/images' unless File.directory? 'build/images'
  Dir.mkdir 'build/images/icons' unless File.directory? 'build/images/icons'

  File.copy_stream 'examples/images/sunset.jpg', 'build/images/sunset.jpg'
  File.copy_stream 'examples/images/icons/pause.png', 'build/images/icons/pause.png'
  File.copy_stream 'examples/images/icons/play.png', 'build/images/icons/play.png'
end
