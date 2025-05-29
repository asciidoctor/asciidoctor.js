# backtick_javascript: true

module Asciidoctor
module Substitutors
  # Avoid using Kernel#sprintf for performance and bundle size reasons
  def sub_placeholder format_string, replacement
    `format_string.replace('%s', replacement)`
  end
end
end
