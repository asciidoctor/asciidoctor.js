require 'opal'
require 'opal/sprockets/environment'
require_relative 'rake/jdk_helper'
require_relative 'rake/tar'

task :default => :dist

desc 'Build opal.js, asciidoctor.js and endorsed extensions to build/'
task :dist do
  Opal::Processor.method_missing_enabled = false
  Opal::Processor.const_missing_enabled = false
  Opal::Processor.source_map_enabled = false
  Opal::Processor.dynamic_require_severity = :ignore

  Dir.mkdir 'build' unless File.directory? 'build'

  env = Opal::Environment.new

  env.append_path 'lib'

  # Use use_gem if you want to build against a release
  env.use_gem 'asciidoctor'
  # If the Gemfile points to a git repo or local directory, be sure to use `bundle exec rake ...`
  # Use append_path if you want to build against a local clone
  #env.append_path 'asciidoctor/lib'

  asciidoctor = env['asciidoctor']
  asciidoctor_extensions = env['asciidoctor/extensions']
  asciidoctor_docbook45 = env['asciidoctor/converter/docbook45']
  asciidoctor_docbook5 = env['asciidoctor/converter/docbook5']
  asciidoctor_src = asciidoctor.source
  asciidoctor_docbook5_src = asciidoctor_docbook5.source
  
  # NOTE hack to make version compliant with semver
  asciidoctor_src = asciidoctor_src.sub(/'VERSION', "(\d+\.\d+.\d+)\.(.*)"/, '\'VERSION\', "\1-\2"')
  # NOTE hack to remove backreference substitution for Opal
  # Keep this hack until Asciidoctor 1.5.4 is released (fix in core https://github.com/asciidoctor/asciidoctor/commit/df49f227bab51f2b1197862e7ac95f2a0b844f2b)
  asciidoctor_src = asciidoctor_src.sub(/capture_1\ =\ \(function\(\).*/, 'capture_1 = (function() {if (false) {')
  asciidoctor.instance_variable_set :@source, asciidoctor_src
  
  # NOTE hack to manually resolve the constant in the scope (workaround an issue in Opal)
  asciidoctor_docbook5_src = asciidoctor_docbook5_src.sub(/\$scope\.get\('DLIST_TAGS'\)\['\$\[\]'\]\("labeled"\)/, '$hash2(["list", "entry", "term", "item"], {"list": "variablelist", "entry": "varlistentry", "term": "term", "item": "listitem"})')
  asciidoctor_docbook5.instance_variable_set :@source, asciidoctor_docbook5_src
 
  asciidoctor.write_to 'build/asciidoctor-core.js'
  asciidoctor_extensions.write_to 'build/asciidoctor-extensions.js'
  asciidoctor_docbook45.write_to 'build/asciidoctor-docbook45.js'
  asciidoctor_docbook5.write_to 'build/asciidoctor-docbook5.js'

  if File.directory? 'extensions-lab/lib'
    env.append_path 'extensions-lab/lib'
    endorsed_extensions = ['chrome-inline-macro', 'man-inline-macro', 'emoji-inline-macro', 'chart-block-macro']
    endorsed_extensions.each { |extension| env[extension].write_to "build/asciidoctor-#{extension}.js" }
  else
    puts "Unable to cross-compile extensions because git submodule 'extensions-lab' is not initialized."
    puts "To initialize the submodule use the following command `git submodule init` and `git submodule update`."
  end

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
  env['asciidoctor_example.rb'].write_to 'build/asciidoctor_example.js'
  File.copy_stream 'examples/asciidoctor_example.html', 'build/asciidoctor_example.html'

  env['userguide_test.rb'].write_to 'build/userguide_test.js'
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
      ctx = OpenSSL::SSL::SSLContext.new
      ctx.ssl_version = :SSLv23
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
      ctx = OpenSSL::SSL::SSLContext.new
      ctx.ssl_version = :SSLv23
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
