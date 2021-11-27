require 'stringio'

module OpenURI
  def OpenURI.open_uri(uri, *rest)
    # Asciidoctor only uses "open_uri" to read utf-8 encoded file
    io = ::StringIO.new
    data = ''
    %x{
      var contentType = ''
      var status = -1

      try {
        var xhr = new __XMLHttpRequest__()
        xhr.open('GET', uri, false)
        xhr.responseType = 'text'
        xhr.addEventListener('load', function() {
          status = this.status
          if (status === 200) {
            data = this.responseText
            contentType = this.getResponseHeader('content-type')
          }
        })
        xhr.send(null)
      }
      catch (e) {
        // something bad happened!
        status = 0
      }
      if (status === 404 || (status === 0 && !data)) {
        throw #{IOError.new `'No such file or directory: ' + uri`}
      }
    }
    io << data
    io.rewind
    if block_given?
      yield io
    else
      io
    end
  end
end
