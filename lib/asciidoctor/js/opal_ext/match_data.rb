class MatchData
  # Make it possible to modify the matches.
  # This is needed to fix blank matches that should be nil.
  def []= idx, val
    @matches[idx] = val
  end
end
