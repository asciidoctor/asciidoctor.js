require_relative 'rake/jdk_helper'
require_relative 'rake/tar'

desc 'Run a smoke test against JDK 8 Early Access Release'
task :jdk8_ea do
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
task :jdk9_ea do
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
