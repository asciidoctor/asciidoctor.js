module Asciidoctor
class Stylesheets
  def primary_stylesheet_data
    if `__path__.basename(__asciidoctorDistDir__) === 'node' && __path__.basename(__path__.dirname(__asciidoctorDistDir__)) === 'dist'`
      stylesheets_dir = `__path__.join(__path__.dirname(__asciidoctorDistDir__), 'css')`
    else
      stylesheets_dir = `__path__.join(__asciidoctorDistDir__, 'css')`
    end
    @primary_stylesheet_data ||= ::IO.read(::File.join(stylesheets_dir, 'asciidoctor.css')).rstrip
  end
end
end
