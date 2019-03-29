module Asciidoctor
  module SyntaxHighlighter
    module Factory
      def for name
        if registry.key? name
          registry[name]
        else
          include Logging unless include? Logging
          if registry.empty?
            logger.debug "no syntax highlighter available, functionality disabled."
          else
            logger.debug "syntax highlighter named '#{name}' is not available, must be one of: '#{registry.keys.join('\', \'')}'."
          end
          nil
        end
      end
    end
  end
end
