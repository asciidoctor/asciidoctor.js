class Number < Numeric
  def round(ndigits = undefined)
    ndigits = Opal.coerce_to!(ndigits, Integer, :to_int)
    if ndigits > 0
      `Number(self.toFixed(ndigits))`
    else
      `Math.round(self)`
    end
  end
end
