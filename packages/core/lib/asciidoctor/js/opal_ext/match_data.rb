class MatchData
  # Make it possible to modify the matches.
  # This is needed to fix blank matches that should be nil.
  def []= idx, val
    @matches[idx] = val
  end

  # NOTE remove once implemented in Opal; see https://github.com/opal/opal/issues/1964
  def names
    []
  end unless method_defined? :names
end
