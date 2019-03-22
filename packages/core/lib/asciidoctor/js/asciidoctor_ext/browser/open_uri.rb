module OpenURI
  def OpenURI.open_uri(name, *rest)
    # Asciidoctor only uses open_uri to read utf-8 encoded file
    file = File.new(path, *rest)
    if block_given?
      yield file
    else
      file
    end
  end
end
