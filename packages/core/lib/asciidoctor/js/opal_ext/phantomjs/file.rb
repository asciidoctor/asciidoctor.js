# backtick_javascript: true

class File

  def self.read(path)
    %x(return require('fs').read(path))
  end

end
