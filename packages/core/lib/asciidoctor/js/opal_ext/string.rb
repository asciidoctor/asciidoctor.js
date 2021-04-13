class String
  # Safely truncate the string to the specified number of bytes.
  def limit_bytesize size
    return self.to_s unless size < bytes.length
    result = byteslice 0, size
    result.to_s
  end unless method_defined? :limit_bytesize
  alias :limit :limit_bytesize unless method_defined? :limit

  alias :_original_unpack :unpack

  def unpack format
    if format == 'C3'
      # this implementation is good enough to check byte-order mark (BOM) at the beginning of an AsciiDoc file.
      # please note that this method will return wrong results on multi-bytes characters but since byte-order mark are single byte it's fine!
      # BOM_BYTES_UTF_8    = [ 239, 187, 191 ]
      # BOM_BYTES_UTF_16LE = [ 255, 254 ]
      # BOM_BYTES_UTF_16BE = [ 254, 255 ]
      %x{
        var bytes = []
        for (var i=0; i < 3; i++) {
          if (i < self.length) {
            bytes.push(self.charCodeAt(i))
          } else {
            bytes.push(nil)
          }
        }
        return bytes
      }
    else
      _original_unpack format
    end
  end
end
