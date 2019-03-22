module Asciidoctor
class Stylesheets
  def primary_stylesheet_data
    __path__ = `require('path')`
    if `__path__.basename(__dirname) === 'node' && __path__.basename(__path__.dirname(__dirname)) === 'dist'`
      stylesheets_dir = `__path__.join(__path__.dirname(__dirname), 'css')`
    else
      stylesheets_dir = `__path__.join(__dirname, 'css')`
    end
    @primary_stylesheet_data ||= ::IO.read(::File.join(stylesheets_dir, 'asciidoctor.css')).rstrip
  end
end
end
