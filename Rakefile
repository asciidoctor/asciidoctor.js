require 'opal'
require_relative 'rake/jdk_helper'
require_relative 'rake/tar'

# NOTE we're no longer using ERB templates in Asciidoctor.js by default
# make Opal recognize .html.erb as valid ERB templates
#Tilt.register 'erb', Opal::ERB::Processor
#Sprockets.register_engine '.erb', Opal::ERB::Processor
#Sprockets.register_mime_type 'application/javascript', '.html'

minify   = ENV['MINIFY'] == '1'
compress = ENV['COMPRESS'] == '1'

task :default => :dist

desc 'Build opal.js, asciidoctor.js and endorsed extensions to build/'
task :dist do
  Opal::Processor.method_missing_enabled = false
  Opal::Processor.const_missing_enabled = false
  Opal::Processor.source_map_enabled = false
  Opal::Processor.dynamic_require_severity = :ignore

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

  # Extensions lab
  if File.directory? 'extensions-lab/lib'
    env.append_path 'extensions-lab/lib'
    endorsed_extensions = ['chrome-inline-macro', 'man-inline-macro', 'emoji-inline-macro']
    endorsed_extensions.each { |extension| env[extension].write_to "build/asciidoctor-#{extension}.js#{compress ? '.gz' : nil}" }
  else
    puts "Unable to cross-compile extensions because git submodule 'extensions-lab' is not initialized."
    puts "To initialize the submodule use the following command `git submodule init` and `git submodule update`."
  end

  # Core extensions
  env.append_path 'lib'
  env['asciidoctor/core_ext/slide'].write_to "build/asciidoctor-slide.js#{compress ? '.gz' : nil}"
  env['asciidoctor/core_ext/deckjs'].write_to "build/asciidoctor-deckjs.js#{compress ? '.gz' : nil}"
  env['asciidoctor/core_ext/revealjs'].write_to "build/asciidoctor-revealjs.js#{compress ? '.gz' : nil}"
  env['asciidoctor/core_ext/factory'].write_to "build/asciidoctor-factory.js#{compress ? '.gz' : nil}"

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

  File.copy_stream 'examples/slide.html', 'build/slide.html'

  FileUtils.cp_r 'reveal.js', 'build/'
  FileUtils.cp_r 'slide-templates', 'build/'

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

  unless File.exists? 'build/jade.js'
    require 'open-uri'
    jadejs_uri = 'https://raw.githubusercontent.com/jadejs/jade/1.11.0/jade.js'
    jadejs_content = open(jadejs_uri) {|fd2| fd2.read }
    File.open('build/jade.js', 'w') {|fd1| fd1.write jadejs_content }
  end
end

desc 'Run smoke tests on AppVeyor'
task :test_on_appveyor do
  STDOUT.sync = true
  if ENV['APPVEYOR_SCHEDULED_BUILD']
    puts 'Smoke test on JDK 8'
    Rake::Task["jdk8_ea"].invoke
	puts ''
    puts 'Smoke test on JDK 9'
    Rake::Task["jdk9_ea"].invoke
  else
    Rake::Task["default"].invoke
  end
end

desc 'Run a smoke test against JDK 8 Early Access Release'
task :jdk8_ea => :dist do
  extract_folder = "#{File.expand_path File.dirname(__FILE__)}/build/jdk1.8.0_40-ea"
  jdk_bin_dir = File.join(extract_folder, 'bin')
  jjs_bin = File.join(jdk_bin_dir, 'jjs')
  javac_bin = File.join(jdk_bin_dir, 'javac')
  java_bin = File.join(jdk_bin_dir, 'java')
  basic_jjs = File.join('spec', 'share', 'basic.js')
  basic_nashorn_java = File.join('spec', 'nashorn', 'BasicJavascriptWithNashorn.java')
  asciidoctor_jjs = File.join('spec', 'share', 'asciidoctor-convert.js')
  asciidoctor_nashorn_java = File.join('spec', 'nashorn', 'AsciidoctorConvertWithNashorn.java')
  if File.directory?(extract_folder)
    puts "JDK 8 directory #{extract_folder} already exists, skipping install"
  else
    if OS.windows?
      ENV['SSL_CERT_FILE'] = "#{File.expand_path File.dirname(__FILE__)}\\rake\\cacert.pem"
      jdk_url = JdkHelper.get_jdk8_download_url
      destination_file = "#{Dir.tmpdir}/jdk-8-ea.exe"
      JdkHelper.download_binary_file jdk_url, destination_file
	  puts "Install silently #{destination_file} in %CD%\\build\\jdk1.8.0_40-ea"
      install_output = `#{destination_file} /s INSTALLDIR="%CD%\\build\\jdk1.8.0_40-ea"`
	  puts "Install output '#{install_output}'"
      until File.exist?("#{jjs_bin}.exe") && File.exist?("#{javac_bin}.exe") && File.exist?("#{java_bin}.exe")
        puts "#{jjs_bin}.exe file exists? #{File.exist?("#{jjs_bin}.exe")}"
        puts "#{javac_bin}.exe file exists? #{File.exist?("#{javac_bin}.exe")}"
        puts "#{java_bin}.exe file exists? #{File.exist?("#{java_bin}.exe")}"
        sleep 1
      end
    else
      jdk_url = JdkHelper.get_jdk8_download_url
      destination_file = "#{Dir.tmpdir}/jdk-8-ea.tar.gz"
      JdkHelper.download_binary_file jdk_url, destination_file
      JdkHelper.extract_jdk destination_file, extract_folder
    end
  end
  JdkHelper.run_jjs_nashorn jjs_bin, basic_jjs
  output = JdkHelper.run_jjs_nashorn jjs_bin, asciidoctor_jjs
  Assertion.check_convert output, "Running Asciidoctor with Nashorn JDK 8 jjs"
  JdkHelper.compile_run_java_nashorn javac_bin, java_bin, basic_nashorn_java, 'BasicJavascriptWithNashorn'
  output = JdkHelper.compile_run_java_nashorn javac_bin, java_bin, asciidoctor_nashorn_java, 'AsciidoctorConvertWithNashorn'
  Assertion.check_convert output, "Running Asciidoctor with Nashorn JDK 8 java"
end

desc 'Run a smoke test against JDK 9 Early Access Release'
task :jdk9_ea => :dist do
  extract_folder = "#{File.expand_path File.dirname(__FILE__)}/build/jdk1.9.0-ea"
  jdk_bin_dir = File.join(extract_folder, 'bin')
  jjs_bin = File.join(jdk_bin_dir, 'jjs')
  javac_bin = File.join(jdk_bin_dir, 'javac')
  java_bin = File.join(jdk_bin_dir, 'java')
  basic_jjs = File.join('spec', 'share', 'basic.js')
  basic_nashorn_java = File.join('spec', 'nashorn', 'BasicJavascriptWithNashorn.java')
  asciidoctor_jjs = File.join('spec', 'share', 'asciidoctor-convert.js')
  asciidoctor_nashorn_java = File.join('spec', 'nashorn', 'AsciidoctorConvertWithNashorn.java')
  if File.directory?(extract_folder)
    puts "JDK 9 directory #{extract_folder} already exists, skipping install"
  else
    if OS.windows?
      ENV['SSL_CERT_FILE'] = "#{File.expand_path File.dirname(__FILE__)}\\rake\\cacert.pem"
      jdk_url = JdkHelper.get_jdk9_download_url
      destination_file = "#{Dir.tmpdir}/jdk-9-ea.exe"
      JdkHelper.download_binary_file jdk_url, destination_file
	  puts "Install silently #{destination_file} in %CD%\\build\\jdk1.9.0-ea"
      install_output = `#{destination_file} /s INSTALLDIR="%CD%\\build\\jdk1.9.0-ea"`
	  puts "Install output '#{install_output}'"
      until File.exist?("#{jjs_bin}.exe") && File.exist?("#{javac_bin}.exe") && File.exist?("#{java_bin}.exe")
        puts "#{jjs_bin}.exe file exists? #{File.exist?("#{jjs_bin}.exe")}"
        puts "#{javac_bin}.exe file exists? #{File.exist?("#{javac_bin}.exe")}"
        puts "#{java_bin}.exe file exists? #{File.exist?("#{java_bin}.exe")}"
        sleep 1
      end
    else
      jdk_url = JdkHelper.get_jdk9_download_url
      destination_file = "#{Dir.tmpdir}/jdk-9-ea.tar.gz"
      JdkHelper.download_binary_file jdk_url, destination_file
      JdkHelper.extract_jdk destination_file, extract_folder
    end
  end
  JdkHelper.run_jjs_nashorn jjs_bin, basic_jjs
  output = JdkHelper.run_jjs_nashorn jjs_bin, asciidoctor_jjs
  Assertion.check_convert output, "Running Asciidoctor with Nashorn JDK 9 jjs"
  JdkHelper.compile_run_java_nashorn javac_bin, java_bin, basic_nashorn_java, 'BasicJavascriptWithNashorn'
  output = JdkHelper.compile_run_java_nashorn javac_bin, java_bin, asciidoctor_nashorn_java, 'AsciidoctorConvertWithNashorn'
  Assertion.check_convert output, "Running Asciidoctor with Nashorn JDK 9 java"
end
