module OpenURI
  def OpenURI.open_uri(name, *rest)
    file = File.new(path, *rest)
    if block_given?
      yield file
    else
      file
    end
  end
end
