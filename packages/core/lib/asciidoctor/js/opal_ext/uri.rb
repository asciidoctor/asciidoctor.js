module URI
  def self.parse str
    str.extend URI
  end

  def path
    self
  end
end
