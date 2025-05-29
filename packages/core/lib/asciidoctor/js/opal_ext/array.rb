# backtick_javascript: true

class Array
  %x{
    var encode;
    encode = Opal.global.btoa || function (input) {
      var buffer;
      if (input instanceof Buffer) {
        buffer = input;
      } else {
        buffer = Buffer.from(input.toString(), 'binary');
      }
      return buffer.toString('base64');
    };
  }

  alias :_original_pack :pack

  def pack format
    if format == 'm0'
      `encode(#{self}.join(''))`
    else
      _original_pack format
    end
  end
end
