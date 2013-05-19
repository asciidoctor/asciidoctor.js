require 'opal'

task :default => :dist

desc "Build asciidoctor.js to build/"
task :dist do
  # disabling method missing results in a "no block given" error
  Opal::Processor.method_missing_enabled = true
  Opal::Processor.const_missing_enabled = false
  Opal::Processor.dynamic_require_severity = :warning

  Dir.mkdir 'build' unless File.directory? 'build'

  env = Opal::Environment.new
  compiled = env['opal'].to_s
  File.open('build/opal.js', 'w') { |f| f << compiled }

  env.append_path 'asciidoctor/lib'
  compiled = env['asciidoctor'].to_s
  File.open('build/asciidoctor.js', 'w') { |f| f << compiled }
end

task :examples => :dist do
  # disabling method missing results in a "no block given" error
  Opal::Processor.method_missing_enabled = true
  Opal::Processor.const_missing_enabled = false
  Opal::Processor.dynamic_require_severity = :warning

  env = Opal::Environment.new
  env.append_path 'examples'
  compiled = env['asciidoctor_example'].to_s
  File.open('build/asciidoctor_example.js', 'w') { |f| f << compiled }

  File.copy_stream('examples/asciidoctor_example.html', 'build/asciidoctor_example.html')
  File.copy_stream('examples/asciidoctor.css', 'build/asciidoctor.css')

  Dir.mkdir 'build/images' unless File.directory? 'build/images'

  File.copy_stream('examples/images/sunset.jpg', 'build/images/sunset.jpg')
  File.copy_stream('examples/images/pause.png', 'build/images/pause.png')
  File.copy_stream('examples/images/play.png', 'build/images/play.png')
end
