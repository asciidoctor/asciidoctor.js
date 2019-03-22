module Asciidoctor
class Stylesheets
  def primary_stylesheet_data
    @primary_stylesheet_data ||= ::IO.read(::File.join('css', 'asciidoctor.css')).rstrip
  end
end
end
