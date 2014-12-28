require 'rubygems'
require 'rubygems/package'
require 'zlib'
require 'fileutils'

module Util
  module Tar
    # un-gzips the given IO, returning the
    # decompressed version as a StringIO
    def ungzip(tarfile)
      z = Zlib::GzipReader.new(tarfile)
      unzipped = StringIO.new(z.read)
      z.close
      unzipped
    end

    # untars the given IO into the specified
    # directory
    def untar(io, destination)
      Gem::Package::TarReader.new io do |tar|
        tar.each do |tarfile|
          # NOTE skip the root directory of the tarfile
          destination_file = File.join destination, tarfile.full_name.split('/', 2).last

          if tarfile.directory?
            FileUtils.mkdir_p destination_file
          else
            destination_directory = File.dirname(destination_file)
            FileUtils.mkdir_p destination_directory unless File.directory?(destination_directory)
            File.open destination_file, "wb" do |f|
              f.print tarfile.read
            end
          end
        end
      end
    end
  end
end
