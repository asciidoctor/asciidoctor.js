class File

  def self.readable? path
    return false unless exist? path
    %{
      var fs = require('fs');
      try {
        fs.accessSync(path, fs.R_OK);
        return true;
      } catch (error) {
        return false;
      }
    }
  end

end
