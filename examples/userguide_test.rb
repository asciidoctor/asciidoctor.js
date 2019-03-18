data = <<EOS
include::userguide.adoc[]
EOS

require 'native'
$global.addEventListener 'DOMContentLoaded', proc {
  base_dir = File.dirname $global.window.location.href
  ENV['HOME'] = base_dir
  html = Asciidoctor.convert data, :safe => :safe, :attributes => %w(showtitle icons! toc! sectanchors imagesdir=images)
  $global.document.getElementById('content').innerHTML = html
}, false
