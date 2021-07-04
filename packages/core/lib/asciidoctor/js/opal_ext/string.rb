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
      `#{self}.charCodeAt() === 65279` ? [239, 187, 191] : self[0, 3].bytes.select.with_index {|_, i| i.even? }
    else
      _original_unpack format
    end
  end
end
