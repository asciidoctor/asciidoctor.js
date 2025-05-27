# backtick_javascript: true

class File

  def self.read(path)
    %x(
      var data = '';
      var status = -1;
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, false);
        xhr.addEventListener('load', function() {
          status = this.status;
          // status is 0 for local file mode (i.e., file://)
          if (status === 0 || status === 200) {
            data = this.responseText;
          }
        });
        xhr.overrideMimeType('text/plain');
        xhr.send();
      }
      catch (e) {
        throw #{IOError.new `'Error reading file or directory: ' + path + '; reason: ' + e.message`};
      }
      // assume that no data in local file mode means it doesn't exist
      if (status === 404 || (status === 0 && !data)) {
        throw #{IOError.new `'No such file or directory: ' + path`};
      }
      return data;
    )
  end

end
