require 'open-uri'

class JdkHelper
  def self.download_binary_file url, destination_file
    bindata = open(url, 'rb') {|file| file.read }
    IO.binwrite(destination_file, bindata)
  end

  def self.get_jdk9_linux64_download_url
    get_jdk_download_url 'lin64JDKrpm', 'https://jdk9.java.net/download/'
  end

  def self.get_jdk8_linux64_download_url
    get_jdk_download_url 'lin64JDKrpm', 'https://jdk8.java.net/download.html'
  end

  def self.get_jdk_download_url jdk_id, url
    html = open(url) {|file| file.read }
    jdk_url_regexp = /document\.getElementById\(\"#{jdk_id}\"\)\.href = \"http:\/\/www.java.net\/download\/(.*)\";/
    # Avoid redirection http -> https
    "http://download.java.net/#{html.match(jdk_url_regexp).captures[0]}"
  end
end
