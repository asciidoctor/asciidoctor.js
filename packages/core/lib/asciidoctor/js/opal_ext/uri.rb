module URI
  def self.parse str
    # REMIND: Cannot create property '$$meta' on string in strict mode!
    #str.extend URI
    str
  end

  def path
    self
  end
end
