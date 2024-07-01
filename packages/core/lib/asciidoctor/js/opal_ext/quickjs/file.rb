class File

  def self.read(path)
    %x{
      const body = std.loadFile(path);
      if (body === null) {
        console.log(`unable to loadFile:"${path}" from:"${os.getcwd()[0]}" realpath:"${os.realpath(path)[0]}"`);
      }
      return body || '';
    }
  end

end
