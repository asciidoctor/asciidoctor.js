class String
  # Safely truncate the string to the specified number of bytes.
  def limit_bytesize size
    return self.to_s unless size < bytes.length
    result = byteslice 0, size
    result.to_s
  end unless method_defined? :limit_bytesize
  alias :limit :limit_bytesize unless method_defined? :limit

  alias :_original_byteslice :byteslice

  def byteslice index, length = 1
    if index == 3 && length >= index && `#{self}.charCodeAt() === 65279`
      `#{self}.substr(1)`.byteslice 0, length - 3
    else
      _original_byteslice index, length
    end
  end

  alias :_original_unpack :unpack

  def unpack format
    if format == 'C3'
      if `#{self}.charCodeAt() === 65279`
        [239, 187, 191]
      else
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
      end
    else
      _original_unpack format
    end
  end
end
