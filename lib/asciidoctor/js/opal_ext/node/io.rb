%x{
  function executeIOAction(action) {
    try {
      return action();
    } catch (error) {
      if (error.code === 'EACCES' ||
          error.code === 'EISDIR' ||
          error.code === 'EMFILE' ||
          error.code === 'ENOENT' ||
          error.code === 'EPERM') {
        throw Opal.IOError.$new(error.message)
      }
      throw error;
    }
  }
}

class IO
  def self.binread(path)
    `return executeIOAction(function(){return require('fs').readFileSync(#{path}).toString('binary')})`
  end
end
