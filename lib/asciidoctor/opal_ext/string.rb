class String
  # Safely truncate the string to the specified number of bytes.
  def limit size
    return self.to_s unless size < bytes.length
    result = byteslice 0, size
    result.to_s
  end unless method_defined? :limit
end
