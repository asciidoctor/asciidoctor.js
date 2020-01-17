module Asciidoctor
class PathResolver
  def root? path
    (absolute_path? path) || (path.start_with? 'file://', 'http://', 'https://', 'chrome://')
  end
end
end
