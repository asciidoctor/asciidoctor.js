# backtick_javascript: true

class File

  def self.read(path)
    %x(return read(path))
  end

end
