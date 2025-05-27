# backtick_javascript: true

module Kernel
  # basic implementation of open, enough to work with reading files over XMLHttpRequest
  def open(path, *rest)
    file = File.new(path, *rest)
    if block_given?
      yield file
    else
      file
    end
  end
  def __dir__
    # fake implementation
    ''
  end
end
