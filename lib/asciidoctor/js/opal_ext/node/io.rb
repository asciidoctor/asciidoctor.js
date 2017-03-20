class IO
  def self.binread(path)
    `return require('fs').readFileSync(#{path}).toString('binary')`
  end
end
