class Dir
  class << self
    def pwd
      `Java.type("java.nio.file.Paths").get("").toAbsolutePath().toString()`
    end
    alias getwd pwd
  end
end
