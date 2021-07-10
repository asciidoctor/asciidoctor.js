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
    if index == 3 && length >= index
      firstCharCode = `#{self}.charCodeAt()`
      if firstCharCode == 65279
        `#{self}.substr(1, #{length} - 1)`
      elsif firstCharCode === 239 && `#{self}.charCodeAt(1)` == 187 && `#{self}.charCodeAt(2)` == 191
        `#{self}.substr(3, #{length} - 3)`
      else
        _original_byteslice index, length
      end
    else
      _original_byteslice index, length
    end
  end

  alias :_original_unpack :unpack

  def unpack format
    if format == 'C3'
      firstCharCode = `#{self}.charCodeAt()`
      if firstCharCode == 65279
        [239, 187, 191]
      else
        [firstCharCode, `#{self}.charCodeAt(1)`, `#{self}.charCodeAt(2)`]
      end
    else
      _original_unpack format
    end
  end
end
