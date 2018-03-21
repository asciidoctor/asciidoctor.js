module Kernel
  # basic implementation of open, enough to work
  # with reading files over XmlHttpRequest
  def open(path, *rest)
    file = File.new(path, *rest)
    if block_given?
      yield file
    else
      file
    end
  end
end

class File

  attr_reader :eof
  attr_reader :lineno
  attr_reader :path

  def initialize(path, flags = 'r')
    @path = path
    @contents = nil
    @eof = false
    @lineno = 0
    # binary flag is unsupported
    flags = flags.delete 'b'
    # encoding flag is unsupported
    encoding_flag_regexp = /:(.*)/
    flags = flags.gsub(encoding_flag_regexp, '')
    @flags = flags
  end

  def read
    if @eof
      ''
    else
      res = File.read(@path)
      @eof = true
      @lineno = res.size
      res
    end
  end

  def each_line(separator = $/, &block)
    if @eof
      return block_given? ? self : [].to_enum
    end

    if block_given?
      lines = File.read(@path)
      %x(
        self.eof = false;
        self.lineno = 0;
        var chomped  = #{lines.chomp},
            trailing = lines.length != chomped.length,
            splitted = chomped.split(separator);
        for (var i = 0, length = splitted.length; i < length; i++) {
          self.lineno += 1;
          if (i < length - 1 || trailing) {
            #{yield `splitted[i] + separator`};
          }
          else {
            #{yield `splitted[i]`};
          }
        }
        self.eof = true;
      )
      self
    else
      read.each_line
    end
  end

  def readlines
    File.readlines(@path)
  end

  class << self

    def readlines(path, separator = $/)
      content = File.read(path)
      content.split(separator)
    end

    # TODO use XMLHttpRequest HEAD request unless in local file mode
    def file?(path)
      true
    end

    def readable?(path)
      true
    end

    def read(path)
      # REMIND will be overriden by a specific implementation
      ''
    end
  end
end

class IO

  def self.read(path)
    File.read(path)
  end

end
