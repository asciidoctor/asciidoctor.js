class File

  def self.file? path
    %x(
      var Files = Java.type('java.nio.file.Files');
      return Files.exists(path) && Files.isRegularFile(path);
    )
  end

  def self.readable? path
    %x(
      var Files = Java.type('java.nio.file.Files');
      return Files.exists(path) && Files.isReadable(path);
    )
  end

end
