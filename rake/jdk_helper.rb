require 'open-uri'
require 'progressbar'
require_relative 'tar'

include Util::Tar

class JdkHelper

  def self.extract_jdk path, extract_folder
    FileUtils.remove_dir extract_folder, :force => true
    io = ungzip File.new(path, "r")
    untar io, extract_folder
    jdk_bin_dir = "#{extract_folder}/bin"
    File.chmod(0755, "#{jdk_bin_dir}/jjs")
    File.chmod(0755, "#{jdk_bin_dir}/javac")
    File.chmod(0755, "#{jdk_bin_dir}/java")
  end

  def self.download_binary_file url, destination_file
    if File.file?(destination_file)
      puts "File #{destination_file} already exists, skipping download"
    else
      puts "Downloading #{url}..."
      pbar = nil
      bindata = open(url, 'rb', :content_length_proc => lambda { |t|
        if t && 0 < t
          pbar = ProgressBar.new("...", t)
          pbar.file_transfer_mode
        end
      }, :progress_proc => lambda {|s|
        pbar.set s if pbar
      }) {|file| file.read }
      IO.binwrite(destination_file, bindata)
    end
  end

  def self.get_jdk9_download_url
    jdk_id = OS.windows? ? 'winOffline64JDK' : 'lin64JDKrpm'
	get_jdk_download_url jdk_id, 'https://jdk9.java.net/download/'
  end

  def self.get_jdk8_download_url
    jdk_id = OS.windows? ? 'winOffline64JDK' : 'lin64JDKrpm'
    get_jdk_download_url jdk_id, 'https://jdk8.java.net/download.html'
  end

  def self.get_jdk_download_url jdk_id, url
    html = open(url) {|file| file.read }
    jdk_url_regexp = /document\.getElementById\(\"#{jdk_id}\"\)\.href = \"http:\/\/www.java.net\/download\/(.*)\";/
    # Avoid redirection http -> https
    "http://download.java.net/#{html.match(jdk_url_regexp).captures[0]}"
  end
end

module OS
  def OS.windows?
    (/cygwin|mswin|mingw|bccwin|wince|emx/ =~ RUBY_PLATFORM) != nil
  end

  def OS.mac?
   (/darwin/ =~ RUBY_PLATFORM) != nil
  end

  def OS.unix?
    !OS.windows?
  end

  def OS.linux?
    OS.unix? and not OS.mac?
  end
end
