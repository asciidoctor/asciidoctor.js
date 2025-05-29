# backtick_javascript: true

class Dir
  class << self
    def pwd
      `IncludeResolver.pwd()`
    end
    alias getwd pwd
  end
end
