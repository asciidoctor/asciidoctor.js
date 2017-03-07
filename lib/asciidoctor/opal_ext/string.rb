class String
  # Safely truncate the string to the specified number of bytes.
  def limit_bytesize size
    return self.to_s unless size < bytes.length
    result = byteslice 0, size
    result.to_s
  end unless method_defined? :limit_bytesize
  alias :limit :limit_bytesize unless method_defined? :limit

  def unpack format
    if format == 'C3'
      self[0, 3].bytes.select.with_index {|_, i| i.even? }
    else
      raise %(undefined method `unpack' for #{inspect}#{self.class})
    end
  end unless method_defined? :unpack
end
