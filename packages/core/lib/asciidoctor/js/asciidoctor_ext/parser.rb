# backtick_javascript: true

module Asciidoctor
class Parser
  if `String.prototype.repeat`
    def self.uniform? str, chr, len
      `chr.repeat(len) === str`
    end
  else
    def self.uniform? str, chr, len
      `Array.apply(null, { length: len }).map(function () { return chr }).join('') === str`
    end
  end
end
end
