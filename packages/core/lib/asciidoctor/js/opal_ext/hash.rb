class Hash
  alias __merge__ merge

  # Make it possible to pass zero or more hashes (Ruby >= 2.6).
  def merge *others, &block
    return dup if others.empty?
    others.reduce(self) {|accum, other| accum.__merge__ other, &block }
  end
end
