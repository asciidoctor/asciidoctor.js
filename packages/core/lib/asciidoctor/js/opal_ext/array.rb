class Array
  alias :_original_pack :pack

  def pack format
    if format == 'm0'
      ::Base64.strict_encode64 self
    else
      _original_pack self
    end
  end
end
